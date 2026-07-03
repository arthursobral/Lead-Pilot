import { Injectable } from '@nestjs/common';
import type { Observation } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type {
  CreateObservationData,
  CreateTimelineEntryForObservation,
  ListObservationsOptions,
  PaginatedResult,
  UpdateObservationData,
} from './types/observations.types';

/**
 * ObservationsRepository owns all Prisma queries for the Observation domain.
 *
 * Rules:
 *   - No business logic. No Logger. No HTTP exceptions.
 *   - createWithTimelineEntry runs a Prisma transaction to guarantee
 *     that every Observation has a corresponding TimelineEntry.
 *   - Soft delete: deletedAt is set; hard deletion never happens.
 */
@Injectable()
export class ObservationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  /**
   * Create an Observation and its corresponding TimelineEntry atomically.
   *
   * The transaction is owned here rather than in the service because it
   * involves two sequential Prisma writes with no business logic between them.
   * The observationId for the TimelineEntry is set inside the transaction
   * after the Observation row is inserted (not passed by the caller).
   */
  async createWithTimelineEntry(
    observationData: CreateObservationData,
    timelineData: CreateTimelineEntryForObservation,
  ): Promise<Observation> {
    return this.prisma.$transaction(async (tx) => {
      const observation = await tx.observation.create({
        data: {
          developerId: observationData.developerId,
          teamLeadId: observationData.teamLeadId,
          type: observationData.type,
          severity: observationData.severity,
          summary: observationData.summary,
          detail: observationData.detail ?? null,
          occurredAt: observationData.occurredAt,
        },
      });

      await tx.timelineEntry.create({
        data: {
          developerId: timelineData.developerId,
          observationId: observation.id,
          type: timelineData.type,
          summary: timelineData.summary,
          occurredAt: timelineData.occurredAt,
        },
      });

      return observation;
    });
  }

  async update(id: string, data: UpdateObservationData): Promise<Observation> {
    return this.prisma.observation.update({
      where: { id },
      data: {
        ...(data.type !== undefined && { type: data.type }),
        ...(data.severity !== undefined && { severity: data.severity }),
        ...(data.summary !== undefined && { summary: data.summary }),
        ...(data.detail !== undefined && { detail: data.detail }),
      },
    });
  }

  /**
   * Soft delete -- sets deletedAt on the Observation and removes the
   * corresponding TimelineEntry in a single transaction.
   *
   * Hard deletion is never performed: Observations are irreplaceable human
   * context that the Knowledge Engine and future AI layers may depend on.
   * Soft-deleted observations are excluded from all list queries via
   * WHERE deletedAt IS NULL.
   */
  async softDelete(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.observation.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      await tx.timelineEntry.deleteMany({
        where: { observationId: id },
      });
    });
  }

  /**
   * Update the TimelineEntry linked to this observation when mutable fields change.
   *
   * Both summary and type must be kept in sync:
   *   - summary: the pre-computed display text (label + observation summary)
   *   - type: ACHIEVEMENT for ACHIEVEMENT observations, OBSERVATION for all others
   *
   * Updating only the summary and ignoring the type would leave a stale
   * TimelineEntry.type after a type change (e.g. ACHIEVEMENT -> CONCERN),
   * causing the timeline to incorrectly classify the entry.
   */
  async updateTimelineEntry(
    observationId: string,
    data: { summary: string; type: string },
  ): Promise<void> {
    await this.prisma.timelineEntry.updateMany({
      where: { observationId },
      data: { summary: data.summary, type: data.type as any },
    });
  }

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  /**
   * Find a non-deleted observation by ID.
   * Returns null if not found or soft-deleted.
   *
   * Pass developerId to additionally verify the observation belongs to that
   * developer (used by nested routes like GET /developers/:id/observations/:id).
   */
  async findById(id: string, developerId?: string): Promise<Observation | null> {
    return this.prisma.observation.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(developerId !== undefined && { developerId }),
      },
    });
  }

  /**
   * Return a paginated, chronological list of non-deleted observations for
   * a developer. Ordered by occurredAt DESC (most recent first).
   *
   * Period convention: periodStart inclusive (>=), periodEnd exclusive (<).
   */
  async findByDeveloper(
    developerId: string,
    options: ListObservationsOptions,
  ): Promise<PaginatedResult<Observation>> {
    const { type, severity, from, to, page, limit } = options;
    const skip = (page - 1) * limit;

    const where = {
      developerId,
      deletedAt: null,
      ...(type !== undefined && { type }),
      ...(severity !== undefined && { severity }),
      ...((from !== undefined || to !== undefined) && {
        occurredAt: {
          ...(from !== undefined && { gte: from }),
          ...(to !== undefined && { lt: to }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.observation.findMany({
        where,
        orderBy: { occurredAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.observation.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  /**
   * Return all non-deleted observations for a developer within a period.
   * Used internally by KnowledgeService -- no pagination, returns everything.
   *
   * Period convention: from inclusive (>=), to exclusive (<).
   */
  async findAllByDeveloperAndPeriod(
    developerId: string,
    from: Date,
    to: Date,
  ): Promise<import('@prisma/client').Observation[]> {
    return this.prisma.observation.findMany({
      where: {
        developerId,
        deletedAt: null,
        occurredAt: { gte: from, lt: to },
      },
      orderBy: { occurredAt: 'asc' },
    });
  }

  /**
   * Returns the ID of any TeamLead in the database.
   * Used as a no-auth fallback when teamLeadId is not provided in the request.
   *
   * Phase 5: remove this method once JWT auth supplies teamLeadId from the token.
   */
  async findAnyTeamLeadId(): Promise<string | null> {
    const teamLead = await this.prisma.teamLead.findFirst({
      select: { id: true },
    });
    return teamLead?.id ?? null;
  }
}
