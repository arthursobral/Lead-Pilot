import type { TimelineEntryType } from '@prisma/client';

/**
 * Discriminator for the entity that produced a TimelineEntry.
 *
 * Derived at read time from which FK column is non-null.
 * Used as a query filter (?source=pull_request) and as a field in the
 * response DTO so consumers never need to inspect FK columns directly.
 *
 * Values follow snake_case REST convention (not the PascalCase Prisma enum).
 *
 * Knowledge Engine note: sourceType on BuiltTimelineEntry (in timeline-builder.types.ts)
 * uses SCREAMING_SNAKE_CASE for the Builder's internal discrimination. This
 * TimelineSource uses snake_case because it is part of the HTTP API contract.
 */
export type TimelineSource =
  | 'pull_request'
  | 'pull_request_review'
  | 'observation'
  | 'insight'
  | 'weekly_report';

/** All valid TimelineSource values -- used for query validation. */
export const TIMELINE_SOURCE_VALUES: TimelineSource[] = [
  'pull_request',
  'pull_request_review',
  'observation',
  'insight',
  'weekly_report',
];

/**
 * A TimelineEntry enriched with its polymorphic source entity.
 *
 * The TimelineEntry schema is polymorphic: exactly one of the optional FKs
 * (pullRequestId, pullRequestReviewId, observationId, insightId, weeklyReportId)
 * is populated per row. This type includes the joined source so consumers
 * never need to perform secondary lookups.
 *
 * Design note: summary is always pre-computed at insert time, so the timeline
 * renders correctly even without the source entity. The source is included for
 * consumers that need richer context (Knowledge Engine, AI, detail views).
 *
 * This is the internal repository return type.
 * The API response uses TimelineEntryResponseDto (via timeline.mapper.ts).
 */
export interface TimelineEntryWithSource {
  id: string;
  developerId: string;
  type: TimelineEntryType;
  /** Pre-computed display text. Built at insert time by the originating module. */
  summary: string;
  occurredAt: Date;
  createdAt: Date;

  // FK columns -- at most one is non-null per row
  pullRequestId: string | null;
  pullRequestReviewId: string | null;
  observationId: string | null;
  insightId: string | null;
  weeklyReportId: string | null;

  // Joined source entity -- at most one is non-null per row
  pullRequest: TimelinePullRequestSource | null;
  pullRequestReview: TimelineReviewSource | null;
  observation: TimelineObservationSource | null;
}

/** PR fields relevant to the timeline and Knowledge Engine. */
export interface TimelinePullRequestSource {
  id: string;
  number: number;
  title: string;
  state: string;
  url: string;
  repositoryFullName: string;
  additions: number;
  deletions: number;
  mergedAt: Date | null;
  githubCreatedAt: Date;
}

/** PR review fields relevant to the timeline and Knowledge Engine. */
export interface TimelineReviewSource {
  id: string;
  state: string;
  body: string | null;
  submittedAt: Date;
  pullRequest: {
    number: number;
    title: string;
    repositoryFullName: string;
  } | null;
}

/** Observation fields relevant to the timeline and Knowledge Engine. */
export interface TimelineObservationSource {
  id: string;
  type: string;
  severity: string;
  /** Extended notes -- null when not provided at creation time. */
  detail: string | null;
  occurredAt: Date;
}

// ----------------------------------------------------------------------------
// Query options (internal -- passed from service to repository)
// ----------------------------------------------------------------------------

export interface ListTimelineOptions {
  /** Filter by TimelineEntryType string value. Undefined = all types. */
  type?: string;
  /**
   * Filter by source entity origin.
   * Translated to a Prisma FK IS NOT NULL condition in the repository.
   * Undefined = all sources.
   */
  source?: TimelineSource;
  /** Inclusive lower bound on occurredAt. */
  from?: Date;
  /** Inclusive upper bound on occurredAt. */
  to?: Date;
  page: number;
  limit: number;
}

export interface PaginatedTimeline {
  data: TimelineEntryWithSource[];
  total: number;
  page: number;
  limit: number;
}

// ----------------------------------------------------------------------------
// Programmatic entry creation (used by Knowledge Engine, AI Insights, etc.)
// ----------------------------------------------------------------------------

/**
 * Data required to create a TimelineEntry programmatically.
 *
 * Callers supply the pre-computed summary and exactly one optional FK.
 * The Timeline module does not validate which FK to set -- callers are
 * responsible for providing the correct FK for their source entity.
 *
 * Phase 5+: insightId and weeklyReportId will be populated by AI/Report modules.
 */
export interface CreateTimelineEntryData {
  developerId: string;
  type: TimelineEntryType;
  /** Pre-computed human-readable display text. */
  summary: string;
  occurredAt: Date;
  // Optional FK -- at most one should be set
  pullRequestId?: string;
  pullRequestReviewId?: string;
  observationId?: string;
  insightId?: string;
  weeklyReportId?: string;
}

// ----------------------------------------------------------------------------
// Rebuild result
// ----------------------------------------------------------------------------

export interface RebuildResult {
  developerId: string;
  entriesDeleted: number;
  entriesCreated: number;
}
