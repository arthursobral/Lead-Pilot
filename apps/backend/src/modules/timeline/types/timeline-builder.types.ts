/**
 * timeline-builder.types.ts
 *
 * Type contracts for TimelineBuilderService.
 *
 * Design rationale:
 *   The Builder defines its own input interfaces rather than importing Prisma
 *   models directly. This is intentional:
 *
 *   1. Testability -- tests pass plain objects; no Prisma mock required.
 *   2. Source independence -- future sources (Jira issues, Slack messages,
 *      deployment events) define their own input shape without touching the
 *      Prisma schema. The Builder normalizes any source that satisfies the
 *      interface.
 *   3. Explicit contracts -- the input types document exactly which fields
 *      the Builder needs from each source, making schema changes safer.
 *   4. Knowledge Engine compatibility -- BuiltTimelineEntry is the type the
 *      Knowledge Engine will consume. Decoupling it from Prisma means the KE
 *      can be built and tested independently of the database.
 *
 * Prisma models satisfy these interfaces structurally (duck typing), so
 * callers can pass Prisma entities directly without adapters.
 */

// =============================================================================
// Source input types
// =============================================================================

/**
 * Fields the Builder requires from a PullRequest.
 * Matches a subset of the Prisma PullRequest model.
 */
export interface PrInput {
  id: string;
  developerId: string;
  number: number;
  title: string;
  /** 'OPEN' | 'CLOSED' | 'MERGED' */
  state: string;
  url: string;
  repositoryFullName: string;
  additions: number;
  deletions: number;
  mergedAt: Date | null;
  githubCreatedAt: Date;
}

/**
 * Fields the Builder requires from a PullRequestReview.
 * Matches a subset of the Prisma PullRequestReview model.
 */
export interface PrReviewInput {
  id: string;
  developerId: string;
  /** 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' */
  state: string;
  submittedAt: Date;
  /** The reviewer's GitHub login -- resolved by the caller from Developer.githubLogin. */
  reviewerLogin: string;
  pullRequest: {
    number: number;
    title: string;
    repositoryFullName: string;
  } | null;
}

/**
 * Fields the Builder requires from a MetricSnapshot.
 * Matches a subset of the Prisma MetricSnapshot model.
 *
 * Knowledge Engine note:
 *   MetricSnapshots cover a PERIOD rather than a point in time. The Builder
 *   uses periodEnd as the canonical occurredAt so the snapshot sorts into the
 *   timeline at the moment the period closed. The Knowledge Engine can use
 *   periodStart + periodEnd to scope metric context when building prompts.
 */
export interface MetricSnapshotInput {
  id: string;
  developerId: string;
  periodStart: Date;
  periodEnd: Date;
  pullRequestsOpened: number;
  pullRequestsMerged: number;
  pullRequestsClosed: number;
  averagePrSizeLines: number | null;
  averageMergeTimeHours: number | null;
  reviewsGiven: number;
  reviewsReceived: number;
  activeRepositories: string[];
  /** Prisma Json field -- cast to Record<string, number> before passing. */
  repoFocus: Record<string, number>;
}

/**
 * Fields the Builder requires from an Observation.
 * Matches a subset of the Prisma Observation model.
 */
export interface ObservationInput {
  id: string;
  developerId: string;
  /** ObservationType value as string (e.g. 'ACHIEVEMENT', 'CUSTOMER_FEEDBACK'). */
  type: string;
  /** ObservationSeverity value as string (e.g. 'LOW', 'MEDIUM', 'HIGH'). */
  severity: string;
  summary: string;
  detail: string | null;
  occurredAt: Date;
}

// =============================================================================
// Payload types (carried by BuiltTimelineEntry for Knowledge Engine consumption)
// =============================================================================

/**
 * Normalized PR data for Knowledge Engine consumption.
 *
 * KE note: The KE can use `prSize` to detect large-PR patterns,
 * `mergeTimeHours` to detect review bottlenecks, and `repositoryFullName`
 * to build repo-focus signals from the timeline rather than metric snapshots.
 */
export interface PrPayload {
  number: number;
  title: string;
  state: string;
  url: string;
  repositoryFullName: string;
  /** Total lines changed (additions + deletions). */
  prSize: number;
  /** Hours from PR open to merge. Null when not merged. */
  mergeTimeHours: number | null;
}

/**
 * Normalized PR review data.
 *
 * KE note: Tracking review patterns over time (approved vs changes-requested)
 * helps detect collaboration signals and review quality trends.
 */
export interface PrReviewPayload {
  reviewerLogin: string;
  state: string;
  pullRequestNumber: number | null;
  pullRequestTitle: string | null;
  repositoryFullName: string | null;
}

/**
 * Normalized metric snapshot data.
 *
 * KE note: This is the richest payload -- it covers an entire period.
 * The KE should prefer MetricSnapshot payloads for quantitative context
 * (e.g. "merged 12 PRs in 30 days") and PrPayload entries for qualitative
 * context (e.g. "merged a large PR touching auth service").
 *
 * averageMergeTimeHours and averagePrSizeLines are null when the developer
 * had no merged PRs in the period -- the KE must handle null explicitly and
 * NOT infer "zero merge time" or "zero PR size" from a null value.
 */
export interface MetricSnapshotPayload {
  periodStart: Date;
  periodEnd: Date;
  pullRequestsOpened: number;
  pullRequestsMerged: number;
  pullRequestsClosed: number;
  averagePrSizeLines: number | null;
  averageMergeTimeHours: number | null;
  reviewsGiven: number;
  reviewsReceived: number;
  activeRepositories: string[];
  repoFocus: Record<string, number>;
}

/**
 * Normalized observation data.
 *
 * KE note: Observations are the highest-signal input the platform receives.
 * The KE should weight ACHIEVEMENT and LEADERSHIP observations more heavily
 * than CONTEXT observations when generating coaching insights. The `detail`
 * field, when present, contains extended notes that provide richer context
 * for prompt construction.
 */
export interface ObservationPayload {
  type: string;
  severity: string;
  summary: string;
  detail: string | null;
}

/** Discriminated union of all payload types. */
export type TimelineEntryPayload =
  | PrPayload
  | PrReviewPayload
  | MetricSnapshotPayload
  | ObservationPayload;

/** Source origin tag -- allows consumers to narrow the payload type. */
export type TimelineSourceType =
  | 'PULL_REQUEST'
  | 'PULL_REQUEST_REVIEW'
  | 'METRIC_SNAPSHOT'
  | 'OBSERVATION';

// =============================================================================
// Builder output
// =============================================================================

/**
 * A normalized, pre-persistence timeline entry produced by TimelineBuilderService.
 *
 * This is NOT a Prisma TimelineEntry (no DB id, no FK columns). It is a
 * canonical domain object that:
 *   - The Knowledge Engine consumes directly to build context packs.
 *   - TimelineRepository can use to write to timeline_entries (via createEntry).
 *   - Tests can verify without any database or Prisma mock.
 *
 * The sourceType field enables Knowledge Engine consumers to narrow the
 * payload type:
 *   if (entry.sourceType === 'METRIC_SNAPSHOT') {
 *     const metrics = entry.payload as MetricSnapshotPayload;
 *     // use metrics.averageMergeTimeHours, etc.
 *   }
 */
export interface BuiltTimelineEntry {
  /** ID of the originating source entity (PR id, snapshot id, observation id). */
  sourceId: string;
  developerId: string;
  /**
   * TimelineEntryType as a string literal.
   * Using string instead of the Prisma enum keeps this type Prisma-free.
   * Valid values: 'SIGNAL' | 'OBSERVATION' | 'ACHIEVEMENT' | 'INSIGHT' |
   *               'REPORT' | 'MILESTONE'
   */
  type: string;
  /** Discriminator for narrowing the payload type. */
  sourceType: TimelineSourceType;
  /** Human-readable display text. Matches what timeline_entries.summary contains. */
  summary: string;
  /**
   * Canonical date for chronological ordering.
   *
   * Per source:
   *   PULL_REQUEST      -- mergedAt when merged, githubCreatedAt otherwise
   *   PULL_REQUEST_REVIEW -- submittedAt
   *   METRIC_SNAPSHOT   -- periodEnd (snapshot represents state at period close)
   *   OBSERVATION       -- occurredAt (when the event happened, not when recorded)
   */
  occurredAt: Date;
  /** Structured source data for Knowledge Engine consumption. */
  payload: TimelineEntryPayload;
}

// =============================================================================
// Composite build input
// =============================================================================

/**
 * Input for TimelineBuilderService.build().
 *
 * All fields are optional -- the builder handles any combination of sources
 * gracefully (empty arrays and undefined produce empty results for that source).
 *
 * KE usage pattern:
 *   const context = builder.build({
 *     pullRequests: recentPrs,
 *     metricSnapshots: [latestSnapshot],
 *     observations: developerObservations,
 *   });
 *   // context is sorted by occurredAt DESC, ready for prompt construction
 */
export interface BuildSourcesInput {
  pullRequests?: PrInput[];
  pullRequestReviews?: PrReviewInput[];
  metricSnapshots?: MetricSnapshotInput[];
  observations?: ObservationInput[];
}
