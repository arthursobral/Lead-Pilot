import { Injectable } from '@nestjs/common';
import type {
  BuildSourcesInput,
  BuiltTimelineEntry,
  MetricSnapshotInput,
  MetricSnapshotPayload,
  ObservationInput,
  PrInput,
  PrPayload,
  PrReviewInput,
  PrReviewPayload,
} from './types/timeline-builder.types';

/**
 * Human-readable labels per ObservationType.
 * Must match ObservationsService.OBSERVATION_TYPE_LABEL exactly so that
 * Builder-generated summaries are identical to DB-persisted summaries.
 *
 * Future: extract to a shared constant (e.g. src/common/observation-labels.ts)
 * so the single source of truth is not duplicated across this service and
 * ObservationsService.
 */
const OBSERVATION_TYPE_LABEL: Record<string, string> = {
  ACHIEVEMENT: 'Achievement',
  CUSTOMER_FEEDBACK: 'Customer feedback',
  COACHING_OPPORTUNITY: 'Coaching opportunity',
  CONCERN: 'Concern',
  LEADERSHIP: 'Leadership',
  MENTORING: 'Mentoring',
  COMMUNICATION: 'Communication',
  INCIDENT: 'Incident',
  OWNERSHIP: 'Ownership',
  CONTEXT: 'Context',
};

/**
 * TimelineBuilderService
 *
 * A pure composition service that normalizes heterogeneous domain objects into
 * a canonical BuiltTimelineEntry format.
 *
 * --- Responsibilities ---
 * Normalize:   domain entities (PR, Snapshot, Observation) -> BuiltTimelineEntry
 * Compose:     multiple sources -> sorted BuiltTimelineEntry[]
 * No DB:       repositories provide all input data; the Builder has no Prisma access
 * Deterministic: identical input always produces identical output
 *
 * --- Why this service exists ---
 * The Knowledge Engine needs a single, unified view of a developer's history
 * regardless of the data source. Without a Builder, each consumer (KE, Reports,
 * AI prompts) would write its own normalization logic, diverging over time.
 *
 * The Builder is the canonical answer to: "Given these raw entities, what does
 * the developer's story look like in a format the AI can reason about?"
 *
 * --- Knowledge Engine design implications ---
 *
 * 1. PAYLOAD over SUMMARY for AI consumption
 *    The `summary` field is for human display. The `payload` field carries typed,
 *    structured data. The KE MUST use `payload` for quantitative reasoning
 *    (e.g. averageMergeTimeHours) and treat `summary` as a fallback for
 *    unstructured text contexts.
 *
 * 2. sourceType as a reasoning discriminator
 *    The KE should weight entries differently by sourceType:
 *      OBSERVATION      -- highest signal (human-curated)
 *      METRIC_SNAPSHOT  -- quantitative context (auto-collected aggregate)
 *      PULL_REQUEST     -- qualitative signal (auto-collected individual event)
 *      PULL_REQUEST_REVIEW -- collaboration signal
 *
 * 3. MetricSnapshot is NOT an event
 *    A MetricSnapshot covers a PERIOD. The KE should not treat it as a discrete
 *    event that "happened" at periodEnd. Instead, use it as a contextual lens
 *    over the period. occurredAt = periodEnd is a sorting convention only.
 *
 * 4. Null metric values mean "no data", not "zero"
 *    averagePrSizeLines and averageMergeTimeHours are null when the developer
 *    had no merged PRs in the period. The KE MUST NOT infer "instant merges" or
 *    "empty PRs" from null -- it must say "no merged PR data available."
 *
 * 5. ACHIEVEMENT vs OBSERVATION
 *    Observations with type === 'ACHIEVEMENT' map to TimelineEntryType 'ACHIEVEMENT'
 *    (higher visual prominence). All other observation types map to 'OBSERVATION'.
 *    The KE should treat 'ACHIEVEMENT' entries as strong positive signals regardless
 *    of observation severity.
 *
 * 6. build() order and Knowledge Engine context windows
 *    build() returns entries sorted by occurredAt DESC (most recent first).
 *    When the KE has a token budget, it should take the first N entries from the
 *    result -- this naturally prioritizes recent context over older history.
 *
 * 7. Extensibility
 *    Adding a new source (Jira, Slack, deployment events) requires:
 *      a. A new input type in timeline-builder.types.ts
 *      b. A new fromX() method here
 *      c. A new payload type in timeline-builder.types.ts
 *      d. Adding the new input array to BuildSourcesInput and build()
 *    No changes to TimelineRepository, TimelineService, or the KE schema.
 */
@Injectable()
export class TimelineBuilderService {
  // --------------------------------------------------------------------------
  // Individual normalizers
  // --------------------------------------------------------------------------

  /**
   * Normalize a PullRequest into a BuiltTimelineEntry.
   *
   * occurredAt: mergedAt when the PR was merged (most meaningful date for
   * reviewing developer output); githubCreatedAt otherwise (PR was opened
   * or closed without merge).
   *
   * type: always 'SIGNAL' -- PRs are automatically collected GitHub activity.
   *
   * prSize: additions + deletions. Useful for KE large-PR pattern detection.
   * mergeTimeHours: derived here (not stored on the PR) from githubCreatedAt
   * to mergedAt. Null when not merged.
   */
  fromPullRequest(pr: PrInput): BuiltTimelineEntry {
    const occurredAt = pr.mergedAt ?? pr.githubCreatedAt;

    const rawTitle =
      pr.title.length > 80 ? pr.title.slice(0, 80) + '...' : pr.title;
    let verb = 'Opened';
    if (pr.state === 'MERGED') verb = 'Merged';
    else if (pr.state === 'CLOSED') verb = 'Closed';
    const summary = `${verb} PR #${pr.number}: ${rawTitle}`;

    const mergeTimeHours =
      pr.mergedAt !== null
        ? (pr.mergedAt.getTime() - pr.githubCreatedAt.getTime()) / (1000 * 60 * 60)
        : null;

    const payload: PrPayload = {
      number: pr.number,
      title: pr.title,
      state: pr.state,
      url: pr.url,
      repositoryFullName: pr.repositoryFullName,
      prSize: pr.additions + pr.deletions,
      mergeTimeHours,
    };

    return {
      sourceId: pr.id,
      developerId: pr.developerId,
      type: 'SIGNAL',
      sourceType: 'PULL_REQUEST',
      summary,
      occurredAt,
      payload,
    };
  }

  /**
   * Normalize a PullRequestReview into a BuiltTimelineEntry.
   *
   * occurredAt: submittedAt -- when the review was submitted.
   *
   * type: always 'SIGNAL' -- reviews are automatically collected activity.
   *
   * KE note: Tracking review state over time (approved vs changes-requested)
   * helps detect collaboration quality and review bottleneck patterns.
   */
  fromPullRequestReview(review: PrReviewInput): BuiltTimelineEntry {
    let action = 'commented on';
    if (review.state === 'APPROVED') action = 'approved';
    else if (review.state === 'CHANGES_REQUESTED') action = 'requested changes on';
    const summary = `${review.reviewerLogin} ${action} a PR`;

    const payload: PrReviewPayload = {
      reviewerLogin: review.reviewerLogin,
      state: review.state,
      pullRequestNumber: review.pullRequest?.number ?? null,
      pullRequestTitle: review.pullRequest?.title ?? null,
      repositoryFullName: review.pullRequest?.repositoryFullName ?? null,
    };

    return {
      sourceId: review.id,
      developerId: review.developerId,
      type: 'SIGNAL',
      sourceType: 'PULL_REQUEST_REVIEW',
      summary,
      occurredAt: review.submittedAt,
      payload,
    };
  }

  /**
   * Normalize a MetricSnapshot into a BuiltTimelineEntry.
   *
   * occurredAt: periodEnd -- the snapshot represents the state of the developer
   * at the close of the period. This is a SORTING CONVENTION, not an event date.
   * The KE should use periodStart + periodEnd from the payload to understand
   * the actual coverage window.
   *
   * type: 'SIGNAL' -- metrics are automatically collected aggregates.
   *
   * Summary format: "Metrics [periodStart date]-[periodEnd date]: X PRs merged,
   * avg merge Xh, X reviews given". Compact enough for display; payload contains
   * the full structured data for KE prompt construction.
   *
   * averageMergeTimeHours and averagePrSizeLines null-handling:
   *   The summary omits these fields when null rather than displaying "0h" or
   *   "0 lines" -- absence of data is meaningfully different from zero.
   */
  fromMetricSnapshot(snapshot: MetricSnapshotInput): BuiltTimelineEntry {
    const start = this.formatDate(snapshot.periodStart);
    const end = this.formatDate(snapshot.periodEnd);

    const parts: string[] = [`${snapshot.pullRequestsMerged} PRs merged`];

    if (snapshot.averageMergeTimeHours !== null) {
      parts.push(`avg merge ${snapshot.averageMergeTimeHours.toFixed(1)}h`);
    }

    parts.push(`${snapshot.reviewsGiven} reviews given`);

    const summary = `Metrics ${start}-${end}: ${parts.join(', ')}`;

    const payload: MetricSnapshotPayload = {
      periodStart: snapshot.periodStart,
      periodEnd: snapshot.periodEnd,
      pullRequestsOpened: snapshot.pullRequestsOpened,
      pullRequestsMerged: snapshot.pullRequestsMerged,
      pullRequestsClosed: snapshot.pullRequestsClosed,
      averagePrSizeLines: snapshot.averagePrSizeLines,
      averageMergeTimeHours: snapshot.averageMergeTimeHours,
      reviewsGiven: snapshot.reviewsGiven,
      reviewsReceived: snapshot.reviewsReceived,
      activeRepositories: snapshot.activeRepositories,
      repoFocus: snapshot.repoFocus,
    };

    return {
      sourceId: snapshot.id,
      developerId: snapshot.developerId,
      type: 'SIGNAL',
      sourceType: 'METRIC_SNAPSHOT',
      summary,
      occurredAt: snapshot.periodEnd,
      payload,
    };
  }

  /**
   * Normalize an Observation into a BuiltTimelineEntry.
   *
   * occurredAt: observation.occurredAt -- when the event happened, NOT when
   * the observation was recorded. Team Leads may record observations days or
   * weeks after the fact; the timeline must sort by the real event date.
   *
   * type: 'ACHIEVEMENT' when ObservationType is ACHIEVEMENT (visually distinct
   * in the timeline); 'OBSERVATION' for all other types.
   *
   * Summary format matches ObservationsService.buildTimelineSummary exactly:
   * "Customer feedback: Customer praised communication"
   * This ensures Builder-generated summaries are identical to DB-persisted ones.
   */
  fromObservation(obs: ObservationInput): BuiltTimelineEntry {
    const label = OBSERVATION_TYPE_LABEL[obs.type] ?? obs.type;
    const summary = `${label}: ${obs.summary}`;
    const type = obs.type === 'ACHIEVEMENT' ? 'ACHIEVEMENT' : 'OBSERVATION';

    return {
      sourceId: obs.id,
      developerId: obs.developerId,
      type,
      sourceType: 'OBSERVATION',
      summary,
      occurredAt: obs.occurredAt,
      payload: {
        type: obs.type,
        severity: obs.severity,
        summary: obs.summary,
        detail: obs.detail,
      },
    };
  }

  // --------------------------------------------------------------------------
  // Compositor
  // --------------------------------------------------------------------------

  /**
   * Build a unified, sorted timeline from multiple source arrays.
   *
   * Order: occurredAt DESC (most recent first). When two entries share the
   * same occurredAt, OBSERVATION entries sort before SIGNAL entries so that
   * human context is surfaced above automated signals at the same timestamp.
   *
   * This is the primary entry point for Knowledge Engine context-pack construction:
   *
   *   const entries = builder.build({
   *     pullRequests: recentPrs,
   *     metricSnapshots: [latestSnapshot],
   *     observations: teamLeadObservations,
   *   });
   *   // entries is ready for context-pack assembly or prompt serialization
   *
   * Empty/undefined source arrays are handled gracefully -- they contribute
   * zero entries to the result.
   */
  build(sources: BuildSourcesInput): BuiltTimelineEntry[] {
    const entries: BuiltTimelineEntry[] = [
      ...(sources.pullRequests ?? []).map((pr) => this.fromPullRequest(pr)),
      ...(sources.pullRequestReviews ?? []).map((r) => this.fromPullRequestReview(r)),
      ...(sources.metricSnapshots ?? []).map((s) => this.fromMetricSnapshot(s)),
      ...(sources.observations ?? []).map((o) => this.fromObservation(o)),
    ];

    return entries.sort((a, b) => {
      const timeDiff = b.occurredAt.getTime() - a.occurredAt.getTime();
      if (timeDiff !== 0) return timeDiff;
      // Tie-break: OBSERVATION before SIGNAL at the same timestamp
      if (a.sourceType === 'OBSERVATION' && b.sourceType !== 'OBSERVATION') return -1;
      if (b.sourceType === 'OBSERVATION' && a.sourceType !== 'OBSERVATION') return 1;
      return 0;
    });
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  /**
   * Format a date as "Mon D" for summary strings (e.g. "Jun 1", "Dec 31").
   * Intentionally short -- the full date range is available in the payload.
   */
  private formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }
}
