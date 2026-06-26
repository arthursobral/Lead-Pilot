/**
 * Internal types for the Metrics Engine.
 * Not exposed via the API -- the API returns Prisma MetricSnapshot objects.
 */

// Minimal PR data needed to count PRs opened in a period and track active repos.
export interface PrOpenedRow {
  repositoryFullName: string;
}

// PR data needed to compute size and merge time for PRs merged in a period.
export interface PrMergedRow {
  additions: number;
  deletions: number;
  githubCreatedAt: Date;
  mergedAt: Date;
  repositoryFullName: string;
}

// Aggregated PR data returned by MetricsRepository.fetchPrData().
export interface PrDataResult {
  opened: PrOpenedRow[];
  merged: PrMergedRow[];
  closedCount: number;
}

// Review counts returned by MetricsRepository.fetchReviewData().
export interface ReviewDataResult {
  given: number;
  received: number;
}

/**
 * Merged PR count per repository for the period.
 * Example: { "payments-service": 4, "api-gateway": 1 }
 *
 * Keys are repositoryFullName values (e.g. "org/repo").
 * Values are counts of PRs whose mergedAt falls in the period.
 * Empty object ({}) when there are no merged PRs -- never null.
 * Entries are sorted descending by count before being stored.
 */
export type RepoFocus = Record<string, number>;

/**
 * All computed metric values before the DB write.
 *
 * averagePrSizeLines and averageMergeTimeHours are null when there are no
 * merged PRs in the period. null is more accurate than 0 -- 0 would imply
 * very fast or very small PRs rather than the absence of data.
 *
 * repoFocus is always an object (never null) -- empty when no merged PRs.
 */
export interface ComputedMetrics {
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
