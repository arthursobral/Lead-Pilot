/**
 * Metric types.
 *
 * MetricSnapshot captures a developer's GitHub activity for a given period.
 * These are context signals, not performance indicators.
 * They inform conversation -- they never rank or score the developer.
 */

export interface RepositoryFocus {
  repo: string;
  percentage: number;
}

export interface MetricSnapshot {
  id: string;
  developerId: string;
  /** Number of pull requests merged in the period */
  mergedPRs: number;
  /** Number of pull requests opened in the period */
  openedPRs: number;
  /** Average lines changed per PR */
  avgPRSize: number;
  /** Average hours from PR open to merge */
  avgMergeTime: number;
  /** Number of reviews given to teammates */
  reviewsGiven: number;
  /** Number of reviews received */
  reviewsReceived: number;
  /** Repositories where time was spent, ranked by contribution share */
  repositoryFocus: RepositoryFocus[];
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}
