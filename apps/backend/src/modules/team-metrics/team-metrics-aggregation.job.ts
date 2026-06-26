/**
 * Job name and payload/result types for the team metrics aggregation job.
 *
 * Imported by:
 *   - TeamMetricsAggregationQueue     (producer)
 *   - TeamMetricsAggregationProcessor (consumer)
 */

/** Stable job name used in queue.add() and processor matching. */
export const TEAM_METRICS_AGGREGATION_JOB = 'metrics.generateTeamSnapshot' as const;

// =============================================================================
// Job input
// =============================================================================

export interface TeamMetricsAggregationJobPayload {
  /** Prisma-side TeamLead ID (cuid). Scope for the aggregation. */
  teamLeadId: string;

  /**
   * ISO-8601 period start (inclusive).
   * Should match the periodStart used for the underlying MetricSnapshots
   * so the exact-match fetch in the repository finds records.
   */
  periodStart: string;

  /**
   * ISO-8601 period end (exclusive).
   */
  periodEnd: string;
}

// =============================================================================
// Job output
// =============================================================================

export interface TeamMetricsAggregationJobResult {
  teamLeadId: string;
  periodStart: string;
  periodEnd: string;

  /** Prisma ID of the upserted TeamMetricSnapshot row. */
  snapshotId: string;

  /** Number of developer snapshots included in the aggregation. */
  developerCount: number;
}
