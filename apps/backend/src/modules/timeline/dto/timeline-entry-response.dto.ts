import type { TimelineSource } from '../types/timeline.types';

/**
 * Pull request sub-DTO embedded in TimelineEntryResponseDto.
 *
 * Only the fields a timeline consumer needs -- not the full PullRequest model.
 * This keeps the API surface stable when irrelevant PR fields are added to the schema.
 */
export class TimelinePullRequestDto {
  id: string;
  number: number;
  title: string;
  /** 'OPEN' | 'CLOSED' | 'MERGED' */
  state: string;
  url: string;
  repositoryFullName: string;
  additions: number;
  deletions: number;
  mergedAt: string | null;      // ISO 8601 string
  githubCreatedAt: string;      // ISO 8601 string
}

/**
 * Pull request review sub-DTO embedded in TimelineEntryResponseDto.
 */
export class TimelinePullRequestReviewDto {
  id: string;
  /** 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' */
  state: string;
  body: string | null;
  submittedAt: string;          // ISO 8601 string
  pullRequest: {
    number: number;
    title: string;
    repositoryFullName: string;
  } | null;
}

/**
 * Observation sub-DTO embedded in TimelineEntryResponseDto.
 *
 * Includes type, severity, and detail so consumers can render the full
 * observation context without a secondary request to /observations/:id.
 */
export class TimelineObservationDto {
  id: string;
  /** ObservationType value: 'ACHIEVEMENT' | 'CUSTOMER_FEEDBACK' | etc. */
  type: string;
  /** ObservationSeverity value: 'LOW' | 'MEDIUM' | 'HIGH' */
  severity: string;
  /** Extended notes. Null when not provided at observation creation time. */
  detail: string | null;
  occurredAt: string;           // ISO 8601 string
}

/**
 * TimelineEntryResponseDto
 *
 * The canonical API representation of a TimelineEntry.
 * This is what GET /api/developers/:id/timeline returns per entry.
 *
 * Design decisions vs the raw TimelineEntry DB row:
 *
 *   1. source field (derived)
 *      The DB stores which entity produced an entry via nullable FK columns
 *      (pullRequestId, observationId, ...). Exposing raw FK columns forces
 *      clients to check seven nullable fields to determine origin.
 *      `source` is a single derived string that encodes origin cleanly.
 *
 *   2. No FK columns exposed
 *      pullRequestId, observationId, etc. are internal DB concerns.
 *      Clients use the nested sub-DTOs (pullRequest, observation) instead.
 *
 *   3. Dates as ISO 8601 strings
 *      NestJS serializes Date objects to ISO strings automatically, but
 *      declaring them as strings in the DTO makes the contract explicit.
 *
 *   4. Nullable sub-DTOs
 *      At most one of pullRequest/pullRequestReview/observation is non-null.
 *      Clients check source to know which one is populated, or null-check
 *      each field.
 *
 * Knowledge Engine note:
 *   The KE should prefer the raw TimelineEntryWithSource type (from the
 *   repository) or BuiltTimelineEntry (from TimelineBuilderService) rather
 *   than deserializing this DTO. The DTO is optimized for HTTP transport;
 *   the internal types are optimized for programmatic consumption.
 */
export class TimelineEntryResponseDto {
  id: string;
  developerId: string;

  /**
   * TimelineEntryType value.
   * 'SIGNAL' | 'OBSERVATION' | 'ACHIEVEMENT' | 'INSIGHT' | 'REPORT' | 'MILESTONE'
   */
  type: string;

  /**
   * Derived origin of this entry.
   * 'pull_request' | 'pull_request_review' | 'observation' |
   * 'insight' | 'weekly_report' | null (no source FK set)
   *
   * Use this field to determine which sub-DTO is populated, and to apply
   * source-specific rendering logic in the UI.
   */
  source: TimelineSource | null;

  /** Pre-computed human-readable display text. Always present. */
  summary: string;

  /** When the event actually occurred (ISO 8601). */
  occurredAt: string;

  /** When this entry was created in the DB (ISO 8601). */
  createdAt: string;

  // ---- Nullable sub-DTOs -- at most one is non-null per entry ----

  /** Present when source === 'pull_request'. */
  pullRequest: TimelinePullRequestDto | null;

  /** Present when source === 'pull_request_review'. */
  pullRequestReview: TimelinePullRequestReviewDto | null;

  /** Present when source === 'observation'. */
  observation: TimelineObservationDto | null;
}

/**
 * Paginated timeline response -- the top-level object returned by
 * GET /api/developers/:developerId/timeline.
 */
export class PaginatedTimelineResponseDto {
  data: TimelineEntryResponseDto[];
  total: number;
  page: number;
  limit: number;
}
