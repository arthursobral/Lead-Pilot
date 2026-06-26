/**
 * Job name and payload/result types for the metrics snapshot background job.
 *
 * This job is the on-demand/scheduled counterpart to metrics-calculation.job.ts.
 *
 *   metrics.calculateDeveloper     -- used by GithubSyncProcessor post-sync;
 *                                     caller supplies explicit periodStart/periodEnd
 *
 *   metrics.generateDeveloperSnapshot -- used for on-demand and scheduled triggers;
 *                                        period is derived internally from defaultPeriod()
 *
 * Imported by:
 *   - MetricsSnapshotQueue     (producer)
 *   - MetricsSnapshotProcessor (consumer)
 */

/** Stable job name used in queue.add() and processor matching. */
export const METRICS_SNAPSHOT_JOB = 'metrics.generateDeveloperSnapshot' as const;

// =============================================================================
// Job input
// =============================================================================

export interface MetricsSnapshotJobPayload {
  /**
   * Prisma-side developer ID (cuid).
   * The processor uses this to fetch PR/review data from the DB.
   */
  developerId: string;
}

// =============================================================================
// Job output
// =============================================================================

export interface MetricsSnapshotJobResult {
  developerId: string;

  /**
   * The ISO-8601 period start that was used for this snapshot.
   * Derived from MetricsService.defaultPeriod() at process time.
   */
  periodStart: string;

  /**
   * The ISO-8601 period end that was used for this snapshot.
   */
  periodEnd: string;

  /**
   * The Prisma ID of the upserted MetricSnapshot row.
   * Empty string when the job was skipped (unknown job name guard).
   */
  snapshotId: string;
}
