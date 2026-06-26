import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { ObservationType, TimelineEntryType } from '@prisma/client';
import { ObservationsRepository } from './observations.repository';
import { toObservationDto, toPaginatedObservationsResponse } from './mapper/observations.mapper';
import type { CreateObservationDto } from './dto/create-observation.dto';
import type { UpdateObservationDto } from './dto/update-observation.dto';
import type { ListObservationsQueryDto } from './dto/list-observations-query.dto';
import type { ObservationResponseDto, PaginatedObservationsResponseDto } from './dto/observation-response.dto';

/**
 * Human-readable label per ObservationType.
 * Pre-computed into the TimelineEntry.summary at insert time so the timeline
 * can render without joining back to the Observation table.
 *
 * Example output: "Customer feedback: Customer praised communication during the Q2 demo"
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
 * ObservationsService
 *
 * Observations are manually registered human context -- the most important
 * input LeadPilot receives that GitHub cannot provide. They capture mentoring,
 * customer feedback, incidents, and leadership moments that no signal can.
 *
 * Design principles:
 *   - create() is transactional: Observation + TimelineEntry are written atomically.
 *   - delete() is always a soft delete: deletedAt is set, record is never removed.
 *   - The service never returns raw Prisma Observation models -- all responses
 *     are mapped through ObservationResponseDto via observations.mapper.ts.
 *   - teamLeadId is resolved from the request body or via a DB fallback until
 *     Phase 5 authentication provides it from the JWT token.
 *   - buildTimelineSummary() is a pure function -- no DB calls, easily testable.
 */
@Injectable()
export class ObservationsService {
  private readonly logger = new Logger(ObservationsService.name);

  constructor(private readonly observationsRepository: ObservationsRepository) {}

  // ---------------------------------------------------------------------------
  // Create
  // ---------------------------------------------------------------------------

  async create(developerId: string, dto: CreateObservationDto): Promise<ObservationResponseDto> {
    // Phase 5: replace resolveTeamLeadId() with teamLeadId from JWT auth token.
    const teamLeadId = await this.resolveTeamLeadId(dto.teamLeadId);
    const occurredAt = new Date(dto.occurredAt);

    // ACHIEVEMENT observations surface as ACHIEVEMENT in the timeline so they
    // can be visually distinguished from general context notes.
    const timelineType: TimelineEntryType =
      dto.type === 'ACHIEVEMENT' ? 'ACHIEVEMENT' : 'OBSERVATION';

    const timelineSummary = this.buildTimelineSummary(dto.type, dto.summary);

    const observation = await this.observationsRepository.createWithTimelineEntry(
      {
        developerId,
        teamLeadId,
        type: dto.type,
        severity: dto.severity,
        summary: dto.summary,
        detail: dto.detail,
        occurredAt,
      },
      {
        developerId,
        type: timelineType,
        summary: timelineSummary,
        occurredAt,
      },
    );

    this.logger.log(
      `Observation created [${observation.id}] developer=${developerId} ` +
        `type=${dto.type} severity=${dto.severity}`,
    );

    return toObservationDto(observation);
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  /**
   * Get a single non-deleted observation by ID.
   *
   * Optionally validates that the observation belongs to the given developer.
   * Pass developerId when the endpoint is nested under a developer resource
   * (e.g. GET /developers/:developerId/observations/:id) to enforce ownership.
   */
  async getById(id: string, developerId?: string): Promise<ObservationResponseDto> {
    const observation = await this.observationsRepository.findById(id, developerId);
    if (!observation) {
      throw new NotFoundException(`Observation ${id} not found`);
    }
    return toObservationDto(observation);
  }

  async listByDeveloper(
    developerId: string,
    query: ListObservationsQueryDto,
  ): Promise<PaginatedObservationsResponseDto> {
    const raw = await this.observationsRepository.findByDeveloper(developerId, {
      type: query.type,
      severity: query.severity,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    });
    return toPaginatedObservationsResponse(raw);
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  /**
   * Update mutable fields on an observation.
   *
   * Immutable fields (developerId, teamLeadId, occurredAt) cannot be changed:
   * they are historical facts about who the observation is about, who wrote it,
   * and when the event happened. Allowing changes would falsify the record.
   *
   * When type or summary changes, the linked TimelineEntry is updated to keep
   * both summary and type in sync with the observation.
   */
  async update(id: string, dto: UpdateObservationDto, developerId?: string): Promise<ObservationResponseDto> {
    await this.getById(id, developerId); // throws 404 if not found or soft-deleted

    const observation = await this.observationsRepository.update(id, dto);

    // Keep the linked TimelineEntry in sync when type or summary changes.
    // Both fields must be updated together:
    //   - summary: the display text changes (label depends on type)
    //   - type: ACHIEVEMENT entries must remain ACHIEVEMENT in the timeline;
    //           any other type must show as OBSERVATION.
    //     Updating only the summary would leave a stale TimelineEntry.type
    //     after a type change (e.g. ACHIEVEMENT -> CONCERN).
    if (dto.summary !== undefined || dto.type !== undefined) {
      const updatedSummary = this.buildTimelineSummary(
        observation.type,
        observation.summary,
      );
      const timelineType = observation.type === 'ACHIEVEMENT' ? 'ACHIEVEMENT' : 'OBSERVATION';
      await this.observationsRepository.updateTimelineEntry(id, {
        summary: updatedSummary,
        type: timelineType,
      });
    }

    this.logger.log(`Observation updated [${id}]`);
    return toObservationDto(observation);
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  /**
   * Soft-delete an observation and remove its linked TimelineEntry.
   *
   * Hard deletion is never performed: Observations are irreplaceable human
   * context that the Knowledge Engine and future AI layers may depend on.
   * Soft-deleted observations are excluded from all list and get queries.
   */
  async delete(id: string, developerId?: string): Promise<void> {
    await this.getById(id, developerId); // throws 404 if not found or already soft-deleted
    await this.observationsRepository.softDelete(id);
    this.logger.log(`Observation soft-deleted [${id}]`);
  }

  // ---------------------------------------------------------------------------
  // Pure helpers (no side effects)
  // ---------------------------------------------------------------------------

  /**
   * Build a human-readable summary for the TimelineEntry from the observation
   * type and content. Pre-computed at insert time so the timeline renders
   * without joining back to the Observation table.
   *
   * Example: "Customer feedback: Customer praised communication during the Q2 demo"
   */
  buildTimelineSummary(type: ObservationType, summary: string): string {
    const label = OBSERVATION_TYPE_LABEL[type] ?? type;
    return `${label}: ${summary}`;
  }

  /**
   * Resolve the teamLeadId to use for a new observation.
   *
   * If explicitly provided in the request body (e.g. from Postman during
   * development), use it directly.
   *
   * If omitted, fall back to the first available TeamLead in the database.
   * This keeps Day 4 functional without full authentication.
   *
   * Phase 5: replace this entire method with return jwtUser.teamLeadId.
   */
  private async resolveTeamLeadId(teamLeadId?: string): Promise<string> {
    if (teamLeadId) return teamLeadId;

    const fallback = await this.observationsRepository.findAnyTeamLeadId();
    if (!fallback) {
      throw new BadRequestException(
        'No teamLeadId provided and no TeamLead exists in the database. ' +
          'Provide teamLeadId in the request body or ensure a TeamLead record exists.',
      );
    }
    return fallback;
  }
}
