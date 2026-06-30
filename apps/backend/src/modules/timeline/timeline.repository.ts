import { Injectable } from '@nestjs/common';
import type { TimelineEntry, TimelineEntryType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type {
  CreateTimelineEntryData,
  ListTimelineOptions,
  PaginatedTimeline,
  RebuildResult,
  TimelineEntryWithSource,
} from './types/timeline.types';

/**
 * Prisma include shape for enriched timeline entries.
 *
 * Always included so consumers (Knowledge Engine, AI, UI) get full context
 * without secondary lookups. Only one source FK is populated per row.
 */
const TIMELINE_INCLUDE = {
  pullRequest: {
    select: {
      id: true,
      number: true,
      title: true,
      state: true,
      url: true,
      repositoryFullName: true,
      additions: true,
      deletions: true,
      mergedAt: true,
      githubCreatedAt: true,
    },
  },
  pullRequestReview: {
    select: {
      id: true,
      state: true,
      body: true,
      submittedAt: true,
      pullRequest: {
        select: {
          number: true,
          title: true,
          repositoryFullName: true,
        },
      },
    },
  },
  observation: {
    select: {
      id: true,
      type: true,
      severity: true,
      detail: true,
      occurredAt: true,
    },
  },
} as const;

// ----------------------------------------------------------------------------
// Summary builders for timeline rebuild
//
// These replicate the format used by GithubService and ObservationsService
// so that rebuilding the timeline produces identical display text.
// ----------------------------------------------------------------------------

/** Labels for ObservationType -- mirrors ObservationsService.OBSERVATION_TYPE_LABEL. */
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
 * Build a PR timeline summary matching GithubService format:
 * "Merged PR #42: Fix authentication bug" / "Opened PR #7: Add new feature"
 */
function buildPrSummary(pr: {
  state: string;
  number: number;
  title: string;
}): string {
  const rawTitle = pr.title.length > 80 ? pr.title.slice(0, 80) + '...' : pr.title;
  let verb = 'Opened';
  if (pr.state === 'MERGED') verb = 'Merged';
  else if (pr.state === 'CLOSED') verb = 'Closed';
  return `${verb} PR #${pr.number}: ${rawTitle}`;
}

/**
 * Build a review timeline summary matching GithubService format:
 * "alice approved a PR" / "bob requested changes on a PR"
 */
function buildReviewSummary(review: {
  state: string;
  developer: { githubLogin: string } | null;
}): string {
  const login = review.developer?.githubLogin ?? 'Unknown';
  let action = 'commented on';
  if (review.state === 'APPROVED') action = 'approved';
  else if (review.state === 'CHANGES_REQUESTED') action = 'requested changes on';
  return `${login} ${action} a PR`;
}

/**
 * Build an observation timeline summary matching ObservationsService format:
 * "Customer feedback: Customer praised communication"
 */
function buildObservationSummary(obs: { type: string; summary: string }): string {
  const label = OBSERVATION_TYPE_LABEL[obs.type] ?? obs.type;
  return `${label}: ${obs.summary}`;
}

/**
 * TimelineRepository
 *
 * All Prisma access for the TimelineEntry domain.
 *
 * Design decisions:
 *   - findByDeveloper always includes source entities (pullRequest, observation, etc.)
 *     so consumers never need secondary lookups.
 *   - createEntry is a public method used by external modules (Knowledge Engine,
 *     AI Insights) to add entries programmatically without coupling to this repository.
 *   - rebuild crosses table boundaries (reading PRs, reviews, observations) because
 *     the timeline is the aggregation layer. This is acceptable for a recovery operation.
 */
@Injectable()
export class TimelineRepository {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Read
  // --------------------------------------------------------------------------

  /**
   * Return a paginated, enriched timeline for a developer.
   *
   * Ordering: occurredAt DESC (most recent first) -- not configurable.
   * The compound index @@index([developerId, occurredAt(sort: Desc)]) makes
   * this query efficient without scanning the full table.
   */
  async findByDeveloper(
    developerId: string,
    options: ListTimelineOptions,
  ): Promise<PaginatedTimeline> {
    const { type, source, from, to, page, limit } = options;
    const skip = (page - 1) * limit;

    const SOURCE_FILTER: Record<string, object> = {
      pull_request: { pullRequestId: { not: null } },
      pull_request_review: { pullRequestReviewId: { not: null } },
      observation: { observationId: { not: null } },
      insight: { insightId: { not: null } },
      weekly_report: { weeklyReportId: { not: null } },
    };

    const where = {
      developerId,
      ...(type !== undefined && { type: type as TimelineEntryType }),
      ...(source !== undefined ? SOURCE_FILTER[source] : {}),
      ...(from !== undefined || to !== undefined
        ? {
            occurredAt: {
              ...(from !== undefined && { gte: from }),
              ...(to !== undefined && { lte: to }),
            },
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.timelineEntry.findMany({
        where,
        include: TIMELINE_INCLUDE,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.timelineEntry.count({ where }),
    ]);

    return {
      data: data as unknown as TimelineEntryWithSource[],
      total,
      page,
      limit,
    };
  }

  // --------------------------------------------------------------------------
  // Period read (Knowledge Engine)
  // --------------------------------------------------------------------------

  /**
   * Return all timeline entries for a developer within a specific period.
   * Not paginated -- intended for the Knowledge Engine context builder.
   *
   * Ordered by occurredAt ASC (chronological) so the AI layer receives
   * the developer's story in forward order.
   */
  async findByDeveloperAndPeriod(
    developerId: string,
    from: Date,
    to: Date,
  ): Promise<TimelineEntryWithSource[]> {
    const data = await this.prisma.timelineEntry.findMany({
      where: {
        developerId,
        occurredAt: { gte: from, lte: to },
      },
      include: TIMELINE_INCLUDE,
      orderBy: { occurredAt: 'asc' },
    });
    return data as unknown as TimelineEntryWithSource[];
  }

  // --------------------------------------------------------------------------
  // Write (public hook for external modules)
  // --------------------------------------------------------------------------

  /**
   * Create a single TimelineEntry.
   *
   * This method is the canonical way for external modules (Knowledge Engine,
   * AI Insights, Reports) to add entries to the timeline without bypassing
   * the repository layer. Callers supply the pre-computed summary and the
   * FK for their source entity.
   *
   * Phase 4 callers: ObservationsRepository (via $transaction -- does NOT call
   * this method; it uses tx.timelineEntry.create directly for atomicity).
   * Phase 5+: AI insight generation, weekly report jobs.
   */
  async createEntry(data: CreateTimelineEntryData): Promise<TimelineEntry> {
    return this.prisma.timelineEntry.create({
      data: {
        developerId: data.developerId,
        type: data.type,
        summary: data.summary,
        occurredAt: data.occurredAt,
        pullRequestId: data.pullRequestId ?? null,
        pullRequestReviewId: data.pullRequestReviewId ?? null,
        observationId: data.observationId ?? null,
        insightId: data.insightId ?? null,
        weeklyReportId: data.weeklyReportId ?? null,
      },
    });
  }

  // --------------------------------------------------------------------------
  // Rebuild (recovery / admin operation)
  // --------------------------------------------------------------------------

  /**
   * Rebuild the complete timeline for a developer from source tables.
   *
   * Use cases:
   *   - Recovery when timeline_entries are corrupted or accidentally deleted
   *   - Data migrations when new timeline entry types are introduced
   *   - Developer tooling / admin endpoint
   *
   * Strategy:
   *   1. Hard-delete all existing entries for the developer.
   *   2. Re-insert SIGNAL entries from pullRequest and pullRequestReview.
   *   3. Re-insert OBSERVATION / ACHIEVEMENT entries from non-deleted observations.
   *
   * The summary format mirrors exactly what GithubService and ObservationsService
   * produce during normal writes. Both modules own the canonical summary format;
   * this method replicates it to avoid a circular module dependency.
   *
   * This operation runs in a single transaction to prevent partial state.
   * For large developer histories it may be slow -- acceptable for an admin
   * endpoint that is not called in the hot path.
   */
  async rebuild(developerId: string): Promise<RebuildResult> {
    return this.prisma.$transaction(async (tx) => {
      // Step 1: Delete all existing timeline entries for this developer.
      const { count: entriesDeleted } = await tx.timelineEntry.deleteMany({
        where: { developerId },
      });

      let entriesCreated = 0;

      // Step 2: Re-insert PR SIGNAL entries.
      const pullRequests = await tx.pullRequest.findMany({
        where: { developerId },
        select: {
          id: true,
          number: true,
          title: true,
          state: true,
          mergedAt: true,
          githubCreatedAt: true,
        },
        orderBy: { githubCreatedAt: 'asc' },
      });

      for (const pr of pullRequests) {
        const summary = buildPrSummary(pr);
        const occurredAt = pr.mergedAt ?? pr.githubCreatedAt;
        await tx.timelineEntry.create({
          data: {
            developerId,
            type: 'SIGNAL',
            summary,
            occurredAt,
            pullRequestId: pr.id,
          },
        });
        entriesCreated++;
      }

      // Step 3: Re-insert PR review SIGNAL entries.
      const reviews = await tx.pullRequestReview.findMany({
        where: { developerId },
        select: {
          id: true,
          state: true,
          submittedAt: true,
          developer: {
            select: { githubLogin: true },
          },
        },
        orderBy: { submittedAt: 'asc' },
      });

      for (const review of reviews) {
        const summary = buildReviewSummary(review);
        await tx.timelineEntry.create({
          data: {
            developerId,
            type: 'SIGNAL',
            summary,
            occurredAt: review.submittedAt,
            pullRequestReviewId: review.id,
          },
        });
        entriesCreated++;
      }
      // Step 4: Re-insert OBSERVATION / ACHIEVEMENT entries.
      const observations = await tx.observation.findMany({
        where: { developerId, deletedAt: null },
        select: {
          id: true,
          type: true,
          summary: true,
          occurredAt: true,
        },
        orderBy: { occurredAt: 'asc' },
      });

      for (const obs of observations) {
        const timelineType: TimelineEntryType =
          obs.type === 'ACHIEVEMENT' ? 'ACHIEVEMENT' : 'OBSERVATION';
        const summary = buildObservationSummary(obs);
        await tx.timelineEntry.create({
          data: {
            developerId,
            type: timelineType,
            summary,
            occurredAt: obs.occurredAt,
            observationId: obs.id,
          },
        });
        entriesCreated++;
      }

      return { developerId, entriesDeleted, entriesCreated };
    });
  }
}
