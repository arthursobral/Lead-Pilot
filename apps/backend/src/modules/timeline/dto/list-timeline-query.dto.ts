import { IsEnum, IsIn, IsInt, IsISO8601, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TimelineEntryType } from '@prisma/client';
import { TIMELINE_SOURCE_VALUES, type TimelineSource } from '../types/timeline.types';

/**
 * Query parameters for GET /api/developers/:developerId/timeline.
 *
 * All fields are optional. Defaults:
 *   page  = 1
 *   limit = 20
 *
 * Ordering is always occurredAt DESC (most recent first) and is not
 * configurable -- the timeline is always chronological.
 *
 * Validation examples -- see bottom of this file.
 */
export class ListTimelineQueryDto {
  /**
   * Filter by TimelineEntryType.
   * Omit to return all types.
   *
   * Valid values: SIGNAL | OBSERVATION | ACHIEVEMENT | INSIGHT | REPORT | MILESTONE
   *
   * Examples:
   *   ?type=SIGNAL      -- GitHub activity only (PRs, reviews)
   *   ?type=OBSERVATION -- Human observations only
   *   ?type=ACHIEVEMENT -- Achievement entries only
   */
  @IsOptional()
  @IsEnum(TimelineEntryType)
  type?: TimelineEntryType;

  /**
   * Filter by source entity origin.
   * Omit to return entries from all sources.
   *
   * Valid values:
   *   pull_request        -- entries created from a merged/opened PR
   *   pull_request_review -- entries created from a PR review
   *   observation         -- entries created from a Team Lead observation
   *   insight             -- entries created from an AI insight (Phase 5)
   *   weekly_report       -- entries created from a weekly report (Phase 7)
   *
   * Examples:
   *   ?source=pull_request         -- GitHub PR signals only
   *   ?source=observation          -- human context only
   *   ?source=pull_request_review  -- review signals only
   *
   * Use case: "Show me only the human observations for this developer"
   *   GET /api/developers/:id/timeline?source=observation
   */
  @IsOptional()
  @IsIn(TIMELINE_SOURCE_VALUES)
  source?: TimelineSource;

  /**
   * Inclusive lower bound on occurredAt (ISO 8601).
   *
   * Example: ?from=2026-01-01T00:00:00.000Z
   * Use case: "Show me the last 30 days"
   *   GET /api/developers/:id/timeline?from=2026-05-25T00:00:00.000Z
   */
  @IsOptional()
  @IsISO8601()
  from?: string;

  /**
   * Inclusive upper bound on occurredAt (ISO 8601).
   *
   * Example: ?to=2026-06-30T23:59:59.999Z
   */
  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

/*
 * ============================================================================
 * Validation examples
 * ============================================================================
 *
 * VALID requests:
 *
 *   GET /api/developers/dev-123/timeline
 *     Returns all entries, page 1, limit 20.
 *
 *   GET /api/developers/dev-123/timeline?type=SIGNAL
 *     Returns only SIGNAL entries (PRs and reviews).
 *
 *   GET /api/developers/dev-123/timeline?source=observation
 *     Returns only entries originating from observations.
 *
 *   GET /api/developers/dev-123/timeline?type=OBSERVATION&source=observation
 *     Both filters applied -- type and source are independent.
 *
 *   GET /api/developers/dev-123/timeline?from=2026-06-01T00:00:00.000Z&to=2026-06-30T23:59:59.999Z
 *     Entries where occurredAt is within June 2026.
 *
 *   GET /api/developers/dev-123/timeline?page=2&limit=50
 *     Page 2 with 50 entries per page.
 *
 *   GET /api/developers/dev-123/timeline?type=SIGNAL&from=2026-06-01T00:00:00.000Z&page=1&limit=10
 *     Combined: SIGNAL entries from June 2026, first 10.
 *
 * INVALID requests (400 Bad Request):
 *
 *   GET /api/developers/dev-123/timeline?type=UNKNOWN_TYPE
 *     400: type must be a valid enum value
 *
 *   GET /api/developers/dev-123/timeline?source=PullRequest
 *     400: source must be one of: pull_request, pull_request_review, observation, insight, weekly_report
 *
 *   GET /api/developers/dev-123/timeline?from=not-a-date
 *     400: from must be a valid ISO 8601 date string
 *
 *   GET /api/developers/dev-123/timeline?limit=200
 *     400: limit must not be greater than 100
 *
 *   GET /api/developers/dev-123/timeline?page=0
 *     400: page must not be less than 1
 *
 * ============================================================================
 */
