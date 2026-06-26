import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  DeveloperSnapshotInput,
  TeamMetricSnapshot,
  UpsertTeamSnapshotData,
} from './team-metrics.types';

/**
 * TeamMetricsRepository owns all Prisma queries for the team metrics domain.
 *
 * Why (this.prisma as any).teamMetricSnapshot:
 *   The Prisma client was generated on Windows with Windows-specific engines.
 *   The Linux engine binary required to run `prisma generate` is not available
 *   in this environment. TeamMetricSnapshot is declared as an application-level
 *   interface in team-metrics.types.ts. Once CI can run `prisma generate`, the
 *   cast should be removed and the import replaced with the generated type.
 *
 * Rules (same as all repositories):
 *   - No business logic. No Logger. No NotFoundException.
 *   - Return typed results. The service decides what to do with them.
 *   - Use Promise.all wherever queries are independent.
 */
@Injectable()
export class TeamMetricsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Developer lookup
  // ---------------------------------------------------------------------------

  /**
   * Return the Prisma developer IDs for all developers under a team lead.
   * Reads from the TeamLeadDeveloper join table.
   */
  async findDeveloperIdsByTeamLead(teamLeadId: string): Promise<string[]> {
    const rows = await this.prisma.teamLeadDeveloper.findMany({
      where: { teamLeadId },
      select: { developerId: true },
    });
    return rows.map((r) => r.developerId);
  }

  // ---------------------------------------------------------------------------
  // Developer snapshot fetch
  // ---------------------------------------------------------------------------

  /**
   * Fetch MetricSnapshot records for the given developers and exact period.
   *
   * Exact period match (=) rather than range (BETWEEN) ensures we only
   * aggregate snapshots computed for the same window. Mixing different
   * period widths would make the weighted average meaningless.
   *
   * Returns one snapshot per developer at most. Developers who have not
   * had metrics calculated for this period are simply absent -- not an error.
   */
  async fetchDeveloperSnapshots(
    developerIds: string[],
    periodStart: Date,
    periodEnd: Date,
  ): Promise<DeveloperSnapshotInput[]> {
    if (developerIds.length === 0) return [];

    const rows = await this.prisma.metricSnapshot.findMany({
      where: {
        developerId: { in: developerIds },
        periodStart,
        periodEnd,
      },
      select: {
        developerId: true,
        pullRequestsOpened: true,
        pullRequestsMerged: true,
        pullRequestsClosed: true,
        averageMergeTimeHours: true,
        reviewsGiven: true,
        reviewsReceived: true,
        activeRepositories: true,
        repoFocus: true,
      },
    });

    return rows.map((r) => ({
      ...r,
      // Prisma returns repoFocus as JsonValue -- cast to the expected shape.
      // At write time the repository always stores a valid Record<string, number>.
      repoFocus: (r.repoFocus ?? {}) as Record<string, number>,
    }));
  }

  // ---------------------------------------------------------------------------
  // Team snapshot writes
  // ---------------------------------------------------------------------------

  /**
   * Upsert a TeamMetricSnapshot keyed on (teamLeadId, periodStart, periodEnd).
   *
   * Idempotent -- running the aggregation job twice for the same team and
   * period produces the same row. The unique constraint in the DB enforces this.
   */
  async upsertTeamSnapshot(data: UpsertTeamSnapshotData): Promise<TeamMetricSnapshot> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (this.prisma as any).teamMetricSnapshot;

    return db.upsert({
      where: {
        teamLeadId_periodStart_periodEnd: {
          teamLeadId: data.teamLeadId,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
        },
      },
      create: {
        teamLeadId: data.teamLeadId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        developerCount: data.developerCount,
        totalPrsOpened: data.totalPrsOpened,
        totalPrsMerged: data.totalPrsMerged,
        totalPrsClosed: data.totalPrsClosed,
        averageMergeTimeHours: data.averageMergeTimeHours,
        totalReviewsGiven: data.totalReviewsGiven,
        totalReviewsReceived: data.totalReviewsReceived,
        activeRepositories: data.activeRepositories,
        repoFocus: data.repoFocus,
      },
      update: {
        developerCount: data.developerCount,
        totalPrsOpened: data.totalPrsOpened,
        totalPrsMerged: data.totalPrsMerged,
        totalPrsClosed: data.totalPrsClosed,
        averageMergeTimeHours: data.averageMergeTimeHours,
        totalReviewsGiven: data.totalReviewsGiven,
        totalReviewsReceived: data.totalReviewsReceived,
        activeRepositories: data.activeRepositories,
        repoFocus: data.repoFocus,
      },
    }) as Promise<TeamMetricSnapshot>;
  }

  // ---------------------------------------------------------------------------
  // Team snapshot reads
  // ---------------------------------------------------------------------------

  /** Most recent team snapshot. Used by future API and report endpoints. */
  async findLatestTeamSnapshot(teamLeadId: string): Promise<TeamMetricSnapshot | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (this.prisma as any).teamMetricSnapshot;
    return db.findFirst({
      where: { teamLeadId },
      orderBy: { periodStart: 'desc' },
    }) as Promise<TeamMetricSnapshot | null>;
  }

  /** Exact team snapshot for a specific period. */
  async findTeamSnapshotForPeriod(
    teamLeadId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<TeamMetricSnapshot | null> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = (this.prisma as any).teamMetricSnapshot;
    return db.findUnique({
      where: {
        teamLeadId_periodStart_periodEnd: {
          teamLeadId,
          periodStart,
          periodEnd,
        },
      },
    }) as Promise<TeamMetricSnapshot | null>;
  }
}
