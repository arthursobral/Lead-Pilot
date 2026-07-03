import type {
  PaginatedTimeline,
  TimelineEntryWithSource,
  TimelineSource,
} from './types/timeline.types';
import type {
  PaginatedTimelineResponseDto,
  TimelineEntryResponseDto,
  TimelineObservationDto,
  TimelinePullRequestDto,
  TimelinePullRequestReviewDto,
} from './dto/timeline-entry-response.dto';

/**
 * timeline.mapper.ts
 *
 * Pure functions that convert internal repository types to API response DTOs.
 *
 * Design decisions:
 *
 *   1. Pure functions, not a class
 *      Mappers have no state and no dependencies. A static class adds noise.
 *      Pure functions are easier to test, import, and compose.
 *
 *   2. Owned by the Timeline module
 *      The mapper is domain-specific -- it knows the FK structure of
 *      TimelineEntry. It does not belong in a shared utility module.
 *
 *   3. Source derivation from FK presence
 *      The DB has no explicit "source" column. Source is derived here from
 *      which FK is non-null. This derivation lives in one place only --
 *      any future source types (e.g. jiraIssueId) require a single addition
 *      to deriveSource() and the TimelineSource type.
 *
 *   4. Dates serialized to ISO strings
 *      The API contract declares dates as strings. The mapper is responsible
 *      for this conversion so controllers and services stay clean.
 *
 *   5. Sub-entity mapping is selective
 *      Only the fields needed by timeline consumers are mapped. Full entity
 *      detail is available via the source-specific endpoints
 *      (/observations/:id, /pulls/:id).
 */

// ---------------------------------------------------------------------------
// Source derivation
// ---------------------------------------------------------------------------

/**
 * Derive the TimelineSource from the FK columns of a raw TimelineEntry.
 *
 * The order of checks defines precedence in the (unlikely) event that
 * multiple FKs are somehow populated. In practice, the schema enforces
 * that at most one is non-null via application-level invariants.
 */
function deriveSource(entry: TimelineEntryWithSource): TimelineSource | null {
  if (entry.pullRequestId !== null) return 'pull_request';
  if (entry.pullRequestReviewId !== null) return 'pull_request_review';
  if (entry.observationId !== null) return 'observation';
  if (entry.insightId !== null) return 'insight';
  if (entry.weeklyReportId !== null) return 'weekly_report';
  return null;
}

// ---------------------------------------------------------------------------
// Sub-entity mappers
// ---------------------------------------------------------------------------

function mapPullRequest(
  pr: TimelineEntryWithSource['pullRequest'],
): TimelinePullRequestDto | null {
  if (!pr) return null;
  return {
    id: pr.id,
    number: pr.number,
    title: pr.title,
    state: pr.state,
    url: pr.url,
    repositoryFullName: pr.repositoryFullName,
    additions: pr.additions,
    deletions: pr.deletions,
    mergedAt: pr.mergedAt ? pr.mergedAt.toISOString() : null,
    githubCreatedAt: pr.githubCreatedAt.toISOString(),
  };
}

function mapPullRequestReview(
  review: TimelineEntryWithSource['pullRequestReview'],
): TimelinePullRequestReviewDto | null {
  if (!review) return null;
  return {
    id: review.id,
    state: review.state,
    body: review.body,
    submittedAt: review.submittedAt.toISOString(),
    pullRequest: review.pullRequest
      ? {
          number: review.pullRequest.number,
          title: review.pullRequest.title,
          repositoryFullName: review.pullRequest.repositoryFullName,
        }
      : null,
  };
}

function mapObservation(
  obs: TimelineEntryWithSource['observation'],
): TimelineObservationDto | null {
  if (!obs) return null;
  return {
    id: obs.id,
    type: obs.type,
    severity: obs.severity,
    detail: obs.detail,
    occurredAt: obs.occurredAt.toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Primary mappers (exported)
// ---------------------------------------------------------------------------

/**
 * Map a single TimelineEntryWithSource (internal repository type) to the
 * clean TimelineEntryResponseDto that the API returns.
 *
 * This is the only place that knows about:
 *   - How to derive `source` from FK columns
 *   - How to serialize Date fields to ISO strings
 *   - Which sub-entity fields are included in the response
 */
export function toTimelineEntryDto(
  entry: TimelineEntryWithSource,
): TimelineEntryResponseDto {
  return {
    id: entry.id,
    developerId: entry.developerId,
    type: entry.type as string,
    source: deriveSource(entry),
    summary: entry.summary,
    occurredAt: entry.occurredAt.toISOString(),
    createdAt: entry.createdAt.toISOString(),
    pullRequest: mapPullRequest(entry.pullRequest),
    pullRequestReview: mapPullRequestReview(entry.pullRequestReview),
    observation: mapObservation(entry.observation),
  };
}

/**
 * Map a PaginatedTimeline (internal) to PaginatedTimelineResponseDto (API).
 */
export function toPaginatedTimelineResponse(
  paginated: PaginatedTimeline,
): PaginatedTimelineResponseDto {
  return {
    data: paginated.data.map(toTimelineEntryDto),
    total: paginated.total,
    page: paginated.page,
    limit: paginated.limit,
  };
}
