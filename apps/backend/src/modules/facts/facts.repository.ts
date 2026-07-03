import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  FactRecord,
  ListFactsOptions,
  PaginatedResult,
  UpsertFactData,
} from './types/facts.types';

/**
 * FactsRepository owns all Prisma queries for the Fact domain entity.
 *
 * Rules:
 *   - No business logic. No Logger. No HTTP exceptions.
 *   - upsertFact uses dedupKey for idempotency. See ADR-006.
 *
 * Note: (this.prisma.fact as any) casts are required until Arthur runs
 * `npx prisma generate` from apps/backend/ to regenerate the client
 * with the Day-5 migration schema (FactType enum, dedupKey, updatedAt).
 */
@Injectable()
export class FactsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  /**
   * Upsert a Fact by its dedupKey.
   *
   * On conflict: updates statement, confidence, and evidence.
   * Re-running generate-facts reflects updated source data without duplicates.
   *
   * dedupKey format: "<developerId>:<type>:<primarySourceId>:<periodStart(date)>"
   */
  async upsertFact(data: UpsertFactData): Promise<FactRecord> {
    const result = await (this.prisma.fact as any).upsert({
      where: { dedupKey: data.dedupKey },
      create: {
        developerId: data.developerId,
        type: data.type,
        statement: data.statement,
        confidence: data.confidence,
        evidence: data.evidence,
        dedupKey: data.dedupKey,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
      },
      update: {
        statement: data.statement,
        confidence: data.confidence,
        evidence: data.evidence,
      },
    });
    return result as FactRecord;
  }

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  /**
   * Return a paginated list of facts for a developer.
   * Ordered by periodStart DESC (most recent period first).
   */
  async findByDeveloper(
    developerId: string,
    options: ListFactsOptions,
  ): Promise<PaginatedResult<FactRecord>> {
    const { type, page, limit } = options;
    const skip = (page - 1) * limit;

    const where = {
      developerId,
      ...(type !== undefined && { type }),
    };

    const [data, total] = await Promise.all([
      (this.prisma.fact as any).findMany({
        where,
        orderBy: { periodStart: 'desc' },
        skip,
        take: limit,
      }),
      (this.prisma.fact as any).count({ where }),
    ]);

    return { data: data as FactRecord[], total, page, limit };
  }

  /**
   * Return all facts for a developer within a specific period.
   * Used by KnowledgeService when assembling a ContextPack.
   */
  async findByDeveloperAndPeriod(
    developerId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<FactRecord[]> {
    const results = await (this.prisma.fact as any).findMany({
      where: {
        developerId,
        periodStart: { gte: periodStart },
        periodEnd: { lte: periodEnd },
      },
      orderBy: { periodStart: 'asc' },
    });
    return results as FactRecord[];
  }
}
