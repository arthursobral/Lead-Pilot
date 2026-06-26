import { Injectable } from '@nestjs/common';
import type { MetricSnapshot } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import type {
  PrDataResult,
  PrMergedRow,
  PrOpenedRow,
  RepoFocus,
  ReviewDataResult,
} from './types/metrics.types';

export interface UpsertSnapshotData {
  developerId: string;
  periodStart: Date;
  periodEnd: Date;
  pullRequestsOpened: number;
  pullRequestsMerged: number;
  pullRequestsClosed: number;
  averagePrSizeLines: number | null;
  averageMergeTimeHours: number | null;
  reviewsGiven: number;
  reviewsReceived: number;
  activeRepositories: string[];
  repoFocus: RepoFocus;
}

/**
 * MetricsRepository owns all Prisma queries for the metrics domain.
 *
 * Rules:
 *   - No business logic. No Logger. No NotFoundException.
 *   - All queries use select to return only needed fields (no over-fetching).
 *   - fetchPrData and fetchReviewData use Promise.all to parallelise queries.
 *
 * Period convention: periodStart inclusive (>=), periodEnd exclusive (<).
 */
@Injectable()
export class MetricsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // PR data
  // ---------------------------------------------------------------------------

  /**
   * Fetch PR data needed to compute all PR-related metrics.
   *
   * Three parallel queries:
   *   opened  -- PRs where githubCreatedAt is in the period (opened count, active repos)
   *   merged  -- PRs where mergedAt is in the period (merged count, size, merge time)
   *   closed  -- count of PRs where closedAt is in the period and state = CLOSED
   *
   * A PR can appear in both opened and merged when it was opened and merged
   * in the same period -- the counters are independent by design.
   */
  async fetchPrData(
    developerId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<PrDataResult> {
    const [opened, merged, closedCount] = await Promise.all([
      this.prisma.pullRequest.findMany({
        where: {
          developerId,
          githubCreatedAt: { gte: periodStart, lt: periodEnd },
        },
        select: { repositoryFullName: true },
      }),

      this.prisma.pullRequest.findMany({
        where: {
          developerId,
          state: 'MERGED',
          mergedAt: { gte: periodStart, lt: periodEnd },
        },
        select: {
          additions: true,
          deletions: true,
          githubCreatedAt: true,
          mergedAt: true,
          repositoryFullName: true,
        },
      }),

      this.prisma.pullRequest.count({
        where: {
          developerId,
          state: 'CLOSED',
          closedAt: { gte: periodStart, lt: periodEnd },
        },
      }),
    ]);

    return {
      opened: opened as PrOpenedRow[],
      merged: merged as PrMergedRow[],
      closedCount,
    };
  }

  // ---------------------------------------------------------------------------
  // Review data
  // ---------------------------------------------------------------------------

  /**
   * Count reviews given and received by a developer in the period.
   *
   * given:    developer is the reviewer
   * received: developer is the PR author, reviewer is someone else
   *
   * The NOT { developerId } guard is defensive -- GitHub prevents self-reviews,
   * but we exclude them explicitly to stay consistent across future data sources.
   */
  async fetchReviewData(
    developerId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<ReviewDataResult> {
    const [given, received] = await Promise.all([
      this.prisma.pullRequestReview.count({
        where: {
          developerId,
          submittedAt: { gte: periodStart, lt: periodEnd },
        },
      }),

      this.prisma.pullRequestReview.count({
        where: {
          pullRequest: { developerId },
          submittedAt: { gte: periodStart, lt: periodEnd },
          NOT: { developerId },
        },
      }),
    ]);

    return { given, received };
  }

  // ---------------------------------------------------------------------------
  // Snapshot writes
  // ---------------------------------------------------------------------------

  /**
   * Upsert a MetricSnapshot keyed on (developerId, periodStart, periodEnd).
   *
   * The unique constraint on those three fields makes this idempotent:
   * running the same calculation twice produces the same row.
   */
  async upsertSnapshot(data: UpsertSnapshotData): Promise<MetricSnapshot> {
    return this.prisma.metricSnapshot.upsert({
      where: {
        developerId_periodStart_periodEnd: {
          developerId: data.developerId,
          periodStart: data.periodStart,
          periodEnd: data.periodEnd,
        },
      },
      create: {
        developerId: data.developerId,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        pullRequestsOpened: data.pullRequestsOpened,
        pullRequestsMerged: data.pullRequestsMerged,
        pullRequestsClosed: data.pullRequestsClosed,
        averagePrSizeLines: data.averagePrSizeLines,
        averageMergeTimeHours: data.averageMergeTimeHours,
        reviewsGiven: data.reviewsGiven,
        reviewsReceived: data.reviewsReceived,
        activeRepositories: data.activeRepositories,
        repoFocus: data.repoFocus,
      },
      update: {
        pullRequestsOpened: data.pullRequestsOpened,
        pullRequestsMerged: data.pullRequestsMerged,
        pullRequestsClosed: data.pullRequestsClosed,
        averagePrSizeLines: data.averagePrSizeLines,
        averageMergeTimeHours: data.averageMergeTimeHours,
        reviewsGiven: data.reviewsGiven,
        reviewsReceived: data.reviewsReceived,
        activeRepositories: data.activeRepositories,
        repoFocus: data.repoFocus,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Snapshot reads
  // ---------------------------------------------------------------------------

  /** Most recent snapshot for a developer. Used by the API when no period is specified. */
  async findLatestSnapshot(developerId: string): Promise<MetricSnapshot | null> {
    return this.prisma.metricSnapshot.findFirst({
      where: { developerId },
      orderBy: { periodStart: 'desc' },
    });
  }

  /** Exact snapshot for a specific period. Used by the Knowledge Engine. */
  async findSnapshotForPeriod(
    developerId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<MetricSnapshot | null> {
    return this.prisma.metricSnapshot.findUnique({
      where: {
        developerId_periodStart_periodEnd: {
          developerId,
          periodStart,
          periodEnd,
        },
      },
    });
  }
}
