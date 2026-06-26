/**
 * Job name and payload/result types for the metrics calculation background job.
 *
 * Imported by:
 *   - MetricsCalculationQueue    (producer)
 *   - MetricsCalculationProcessor (consumer)
 *   - GithubSyncProcessor        (triggers jobs after sync)
 */

export const METRICS_CALCULATION_JOB = 'metrics.calculateDeveloper' as const;

export interface MetricsCalculationJobPayload {
  /** Prisma cuid of the developer to recalculate metrics for. */
  developerId: string;
  /** ISO-8601 start of the period (inclusive). */
  periodStart: string;
  /** ISO-8601 end of the period (exclusive). */
  periodEnd: string;
}

export interface MetricsCalculationJobResult {
  developerId: string;
  periodStart: string;
  periodEnd: string;
  /** Prisma cuid of the upserted MetricSnapshot row. */
  snapshotId: string;
}
