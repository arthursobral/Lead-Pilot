import { Injectable, Logger } from '@nestjs/common';
import type { MetricSnapshot } from '@prisma/client';
import { MetricsRepository } from './metrics.repository';
import type {
  ComputedMetrics,
  PrDataResult,
  RepoFocus,
  ReviewDataResult,
} from './types/metrics.types';

/**
 * MetricsService
 *
 * Calculates MetricSnapshots from GitHub signal data already in the DB.
 *
 * Design principles:
 *   - Never calls the GitHub API. Reads only from PullRequest and
 *     PullRequestReview tables populated by GithubSyncProcessor.
 *   - Metrics are coaching context, not performance scores.
 *     No ranking, no productivity index, no composite score.
 *   - compute() is a pure function -- no DB calls, fully unit-testable.
 *   - calculateForDeveloper() is the main entrypoint called by the processor.
 *
 * Period convention: periodStart inclusive (>=), periodEnd exclusive (<).
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private readonly metricsRepository: MetricsRepository) {}

  // ---------------------------------------------------------------------------
  // Main entrypoint
  // ---------------------------------------------------------------------------

  /**
   * Calculate and persist metrics for a developer over the given period.
   * Fetches PR and review data in parallel, runs pure computation,
   * then upserts the snapshot. Safe to run multiple times -- idempotent.
   */
  async calculateForDeveloper(
    developerId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<MetricSnapshot> {
    this.logger.log(
      `Calculating metrics for developer ${developerId} ` +
        `[${periodStart.toISOString()} to ${periodEnd.toISOString()}]`,
    );

    const [prData, reviewData] = await Promise.all([
      this.metricsRepository.fetchPrData(developerId, periodStart, periodEnd),
      this.metricsRepository.fetchReviewData(developerId, periodStart, periodEnd),
    ]);

    const computed = this.compute(prData, reviewData);

    const snapshot = await this.metricsRepository.upsertSnapshot({
      developerId,
      periodStart,
      periodEnd,
      ...computed,
    });

    this.logger.log(
      `Snapshot upserted [${snapshot.id}] developer=${developerId} ` +
        `prsOpened=${computed.pullRequestsOpened} ` +
        `prsMerged=${computed.pullRequestsMerged} ` +
        `reviewsGiven=${computed.reviewsGiven} ` +
        `reviewsReceived=${computed.reviewsReceived}`,
    );

    return snapshot;
  }

  // ---------------------------------------------------------------------------
  // Snapshot reads (API + Knowledge Engine)
  // ---------------------------------------------------------------------------

  async getLatestSnapshot(developerId: string): Promise<MetricSnapshot | null> {
    return this.metricsRepository.findLatestSnapshot(developerId);
  }

  async getSnapshotForPeriod(
    developerId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<MetricSnapshot | null> {
    return this.metricsRepository.findSnapshotForPeriod(
      developerId,
      periodStart,
      periodEnd,
    );
  }

  // ---------------------------------------------------------------------------
  // Pure calculation (no side effects -- separated for testability)
  // ---------------------------------------------------------------------------

  /**
   * Derive all metric values from raw DB rows.
   *
   * averagePrSizeLines:
   *   Mean of (additions + deletions) across PRs merged in the period.
   *   null when there are no merged PRs -- 0 would imply very small PRs.
   *
   * averageMergeTimeHours:
   *   Mean of (mergedAt - githubCreatedAt) in hours for PRs merged in the period.
   *   Measures the full lifecycle from open to merge, regardless of when
   *   the PR was originally opened (may span multiple periods).
   *   null when there are no merged PRs.
   *
   * activeRepositories:
   *   Union of repos from opened and merged PRs, deduplicated.
   *   A repo is active if any PR was opened OR merged in the period.
   *
   * repoFocus:
   *   Count of merged PRs per repository, sorted descending by count.
   *   Only merged PRs count -- open/closed PRs are not included.
   *   Empty object ({}) when there are no merged PRs.
   */
  compute(prData: PrDataResult, reviewData: ReviewDataResult): ComputedMetrics {
    const { opened, merged, closedCount } = prData;

    const activeRepoSet = new Set<string>();
    for (const pr of opened) activeRepoSet.add(pr.repositoryFullName);
    for (const pr of merged) activeRepoSet.add(pr.repositoryFullName);

    const averagePrSizeLines =
      merged.length > 0
        ? merged.reduce((sum, pr) => sum + pr.additions + pr.deletions, 0) /
          merged.length
        : null;

    const averageMergeTimeHours =
      merged.length > 0
        ? merged.reduce((sum, pr) => {
            const ms = pr.mergedAt.getTime() - pr.githubCreatedAt.getTime();
            return sum + ms / (1000 * 60 * 60);
          }, 0) / merged.length
        : null;

    const repoFocusUnsorted: RepoFocus = {};
    for (const pr of merged) {
      repoFocusUnsorted[pr.repositoryFullName] =
        (repoFocusUnsorted[pr.repositoryFullName] ?? 0) + 1;
    }
    const repoFocus: RepoFocus = Object.fromEntries(
      Object.entries(repoFocusUnsorted).sort(([, a], [, b]) => b - a),
    );

    return {
      pullRequestsOpened: opened.length,
      pullRequestsMerged: merged.length,
      pullRequestsClosed: closedCount,
      averagePrSizeLines,
      averageMergeTimeHours,
      reviewsGiven: reviewData.given,
      reviewsReceived: reviewData.received,
      activeRepositories: Array.from(activeRepoSet),
      repoFocus,
    };
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /**
   * Standard 30-day rolling period ending now.
   * Used by the processor when no explicit period is in the job payload.
   */
  static defaultPeriod(): { periodStart: Date; periodEnd: Date } {
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodEnd.getDate() - 30);
    return { periodStart, periodEnd };
  }
}
