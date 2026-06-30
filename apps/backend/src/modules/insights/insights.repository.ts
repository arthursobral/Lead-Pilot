import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type { ValidatedInsight } from '../ai/types/ai.types';
import type {
  InsightRecord,
  ListInsightsOptions,
  PaginatedResult,
} from './types/insights.types';

/**
 * InsightsRepository -- Prisma access for the Insights domain.
 *
 * Rules:
 *   - No business logic. No Logger. No HTTP exceptions.
 *   - createInsightsWithTalkingPoints uses a $transaction so all Insight,
 *     TalkingPoint, and FactInsight rows are written atomically.
 *     If any write fails, no partial data is committed.
 */
@Injectable()
export class InsightsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------------

  /**
   * Persist a set of validated insights with their talking points and fact links.
   *
   * Each ValidatedInsight produces:
   *   - 1 Insight row
   *   - N TalkingPoint rows (one per talkingPoint string, ordered by index)
   *   - M FactInsight rows (one per validFactId)
   *
   * The entire batch is written in a single Prisma $transaction.
   */
  async createInsightsWithTalkingPoints(
    developerId: string,
    periodStart: Date,
    periodEnd: Date,
    model: string,
    insights: ValidatedInsight[],
  ): Promise<InsightRecord[]> {
    const records: InsightRecord[] = [];

    await this.prisma.$transaction(async (tx) => {
      for (const insight of insights) {
        const created = await tx.insight.create({
          data: {
            developerId,
            type:        insight.type,
            summary:     insight.summary,
            model,
            periodStart,
            periodEnd,
            talkingPoints: {
              create: insight.talkingPoints.map((text, order) => ({ text, order })),
            },
            factInsights: {
              create: insight.validFactIds.map((factId) => ({ factId })),
            },
          },
          include: {
            talkingPoints: {
              orderBy: { order: 'asc' },
            },
          },
        });
        records.push(created as unknown as InsightRecord);
      }
    });

    return records;
  }

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------

  /**
   * Return a paginated list of insights for a developer.
   * Ordered by periodStart DESC (most recent period first), then createdAt DESC.
   */
  async findByDeveloper(
    developerId: string,
    options: ListInsightsOptions,
  ): Promise<PaginatedResult<InsightRecord>> {
    const { type, periodStart, periodEnd, page, limit } = options;
    const skip = (page - 1) * limit;

    const where = {
      developerId,
      ...(type !== undefined && { type }),
      ...(periodStart !== undefined && { periodStart: { gte: periodStart } }),
      ...(periodEnd !== undefined && { periodEnd: { lte: periodEnd } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.insight.findMany({
        where,
        orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
        include: {
          talkingPoints: { orderBy: { order: 'asc' } },
        },
      }),
      this.prisma.insight.count({ where }),
    ]);

    return { data: data as unknown as InsightRecord[], total, page, limit };
  }
}
