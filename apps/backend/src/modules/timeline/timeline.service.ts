import { Injectable, Logger } from '@nestjs/common';
import type { TimelineEntry } from '@prisma/client';
import { TimelineRepository } from './timeline.repository';
import type { ListTimelineQueryDto } from './dto/list-timeline-query.dto';
import type { PaginatedTimelineResponseDto } from './dto/timeline-entry-response.dto';
import { toPaginatedTimelineResponse } from './timeline.mapper';
import type {
  CreateTimelineEntryData,
  RebuildResult,
} from './types/timeline.types';

/**
 * TimelineService
 *
 * The Timeline is the chronological history of a developer -- the single source
 * of truth that combines engineering signals (GitHub activity) with human
 * observations. It is the primary input to the Knowledge Engine and AI layer.
 *
 * Responsibilities:
 *   - Read: paginated, filtered timeline for a developer (returns clean DTOs)
 *   - Create: programmatic entry creation hook for external modules
 *   - Rebuild: recovery operation to regenerate entries from source tables
 *
 * Design decisions:
 *   - getTimeline reads from timeline_entries directly (not from source tables).
 *     All writes to timeline_entries are atomic in their originating module
 *     (GithubRepository, ObservationsRepository), so the table is always
 *     consistent during normal operation.
 *   - createEntry is a public method exported so the Knowledge Engine and
 *     AI Insights modules can add entries without coupling to the repository.
 *   - rebuild is a recovery / admin operation and is not called in the hot path.
 *     It runs synchronously (no BullMQ) for Day 4; Phase 5 can make it async.
 *   - getTimeline returns PaginatedTimelineResponseDto (not the raw
 *     PaginatedTimeline) because the mapper converts internal types (Date,
 *     nullable FKs, derived source field) to a stable API contract.
 */
@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(private readonly timelineRepository: TimelineRepository) {}

  // --------------------------------------------------------------------------
  // Read
  // --------------------------------------------------------------------------

  /**
   * Return a paginated, enriched timeline for a developer as a clean DTO.
   *
   * Filtering:
   *   type   -- TimelineEntryType (SIGNAL, OBSERVATION, ACHIEVEMENT, ...)
   *   source -- originating entity (pull_request, observation, ...)
   *   from   -- inclusive lower bound on occurredAt
   *   to     -- inclusive upper bound on occurredAt
   *
   * An empty timeline (new developer with no activity) returns a valid
   * paginated result with data=[] and total=0 -- not a 404.
   *
   * The response DTO shape:
   *   {
   *     data: TimelineEntryResponseDto[],
   *     total: number,
   *     page: number,
   *     limit: number,
   *   }
   */
  async getTimeline(
    developerId: string,
    query: ListTimelineQueryDto,
  ): Promise<PaginatedTimelineResponseDto> {
    const paginated = await this.timelineRepository.findByDeveloper(developerId, {
      type: query.type,
      source: query.source,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });

    return toPaginatedTimelineResponse(paginated);
  }

  // --------------------------------------------------------------------------
  // Write (extensibility hook for external modules)
  // --------------------------------------------------------------------------

  /**
   * Create a single TimelineEntry programmatically.
   *
   * This is the canonical way for other modules to add entries:
   *   - Knowledge Engine (Phase 5): INSIGHT entries from AI output
   *   - Reports module (Phase 7): REPORT entries on weekly generation
   *   - Future milestone tracking: MILESTONE entries
   *
   * For entries that must be created atomically with their source record
   * (e.g. Observations), callers should use their own $transaction and
   * call tx.timelineEntry.create directly rather than calling this method.
   */
  async createEntry(data: CreateTimelineEntryData): Promise<TimelineEntry> {
    const entry = await this.timelineRepository.createEntry(data);
    this.logger.log(
      `Timeline entry created [${entry.id}] developer=${data.developerId} type=${data.type}`,
    );
    return entry;
  }

  // --------------------------------------------------------------------------
  // Rebuild
  // --------------------------------------------------------------------------

  /**
   * Rebuild the complete timeline for a developer from source tables.
   *
   * This is an admin/recovery endpoint. Normal writes to timeline_entries are
   * atomic in their originating module, so the timeline should never be out of
   * sync during normal operation. This endpoint handles:
   *   - Corruption recovery
   *   - Data migrations when new timeline entry types are introduced
   *   - Development/testing resets
   *
   * Phase 4: synchronous. Phase 5: consider making this a BullMQ job for
   * developers with very large histories.
   */
  async rebuild(developerId: string): Promise<RebuildResult> {
    this.logger.log(`Timeline rebuild started for developer=${developerId}`);

    const result = await this.timelineRepository.rebuild(developerId);

    this.logger.log(
      `Timeline rebuild complete for developer=${developerId}: ` +
        `deleted=${result.entriesDeleted} created=${result.entriesCreated}`,
    );

    return result;
  }
}
