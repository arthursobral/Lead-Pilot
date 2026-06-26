import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { ListTimelineQueryDto } from './dto/list-timeline-query.dto';

/**
 * TimelineController
 *
 * Routes:
 *   GET  /api/developers/:developerId/timeline         -- paginated timeline
 *   POST /api/developers/:developerId/timeline/rebuild -- admin: rebuild from source
 *
 * Controllers are thin: no business logic, no Prisma access.
 * All logic lives in TimelineService.
 *
 * Auth: not yet implemented. Phase 5: add JwtAuthGuard.
 * Rebuild endpoint: Phase 5: restrict to admin/team-lead role.
 */
@Controller()
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  // --------------------------------------------------------------------------
  // GET /api/developers/:developerId/timeline
  // --------------------------------------------------------------------------

  /**
   * Return a paginated, chronological timeline for a developer.
   *
   * Query params:
   *   type  -- filter by TimelineEntryType (SIGNAL, OBSERVATION, ACHIEVEMENT, ...)
   *   from  -- ISO 8601 lower bound on occurredAt (inclusive)
   *   source -- originating entity: pull_request | pull_request_review | observation | insight | weekly_report
   *   to     -- ISO 8601 upper bound on occurredAt (inclusive)
   *   page   -- page number (default 1)
   *   limit  -- page size (default 20, max 100)
   *
   * Returns an empty result when the developer has no timeline entries yet.
   * This is not a 404 -- the developer may simply have no activity.
   */
  @Get('developers/:developerId/timeline')
  async getTimeline(
    @Param('developerId') developerId: string,
    @Query() query: ListTimelineQueryDto,
  ) {
    return this.timelineService.getTimeline(developerId, query);
  }

  // --------------------------------------------------------------------------
  // POST /api/developers/:developerId/timeline/rebuild
  // --------------------------------------------------------------------------

  /**
   * Rebuild the timeline for a developer from all source tables.
   *
   * Hard-deletes all existing timeline_entries for the developer, then
   * re-inserts from pullRequest, pullRequestReview, and observation.
   *
   * Use cases:
   *   - Recovery from corruption or accidental deletion
   *   - Data migration after new timeline types are introduced
   *   - Development/testing resets
   *
   * This is a synchronous, potentially slow operation for developers with
   * large histories. Phase 5: move to a background job.
   *
   * Returns: { developerId, entriesDeleted, entriesCreated }
   */
  @Post('developers/:developerId/timeline/rebuild')
  @HttpCode(HttpStatus.OK)
  async rebuild(@Param('developerId') developerId: string) {
    return this.timelineService.rebuild(developerId);
  }
}
