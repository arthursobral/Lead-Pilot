import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { QUEUES } from '../../jobs/queues';
import { TeamMetricsService } from './team-metrics.service';
import {
  TEAM_METRICS_AGGREGATION_JOB,
  type TeamMetricsAggregationJobPayload,
  type TeamMetricsAggregationJobResult,
} from './team-metrics-aggregation.job';

/**
 * TeamMetricsAggregationProcessor
 *
 * BullMQ worker that handles metrics.generateTeamSnapshot jobs.
 *
 * Flow:
 *   1. Resolve developer IDs from TeamLeadDeveloper join table (in service).
 *   2. Fetch each developer's MetricSnapshot for the exact period.
 *   3. Run aggregate() -- pure function, no DB side effects.
 *   4. Upsert the TeamMetricSnapshot.
 *
 * Idempotency:
 *   Backed by @@unique([teamLeadId, periodStart, periodEnd]) -- running this
 *   job multiple times for the same team and period upserts the same row.
 *   Job IDs follow "team-{teamLeadId}-{dateKey}" for BullMQ-level deduplication.
 *
 * Retryability:
 *   Errors are re-thrown so BullMQ retries with the queue's backoff config.
 *   All writes are upserts -- partial retries are safe.
 *
 * Triggered by:
 *   - TeamMetricsAggregationQueue.enqueueForTeam() (on-demand or scheduled)
 *   - Future: after MetricsSnapshotProcessor completes for all team members
 */
@Processor(QUEUES.TEAM_METRICS_AGGREGATION)
export class TeamMetricsAggregationProcessor extends WorkerHost {
  private readonly logger = new Logger(TeamMetricsAggregationProcessor.name);

  constructor(private readonly teamMetricsService: TeamMetricsService) {
    super();
  }

  async process(
    job: Job<TeamMetricsAggregationJobPayload, TeamMetricsAggregationJobResult>,
  ): Promise<TeamMetricsAggregationJobResult> {
    if (job.name !== TEAM_METRICS_AGGREGATION_JOB) {
      this.logger.warn(`Unknown job name "${job.name}" -- skipping`);
      return this.emptyResult(job.data);
    }

    const { teamLeadId, periodStart, periodEnd } = job.data;

    this.logger.log(
      `[job:${job.id}] Aggregating team metrics teamLead=${teamLeadId} ` +
        `period=${periodStart} to ${periodEnd}`,
    );

    await job.updateProgress(10);

    try {
      const snapshot = await this.teamMetricsService.calculateForTeam(
        teamLeadId,
        new Date(periodStart),
        new Date(periodEnd),
      );

      await job.updateProgress(100);

      this.logger.log(
        `[job:${job.id}] Done -- snapshot=${snapshot.id} ` +
          `teamLead=${teamLeadId} developers=${snapshot.developerCount}`,
      );

      return {
        teamLeadId,
        periodStart,
        periodEnd,
        snapshotId: snapshot.id,
        developerCount: snapshot.developerCount,
      };
    } catch (error) {
      this.logger.error(
        `[job:${job.id}] Failed aggregating team metrics teamLead=${teamLeadId}`,
        error,
      );
      throw error;
    }
  }

  private emptyResult(
    data: TeamMetricsAggregationJobPayload,
  ): TeamMetricsAggregationJobResult {
    return {
      teamLeadId: data.teamLeadId,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      snapshotId: '',
      developerCount: 0,
    };
  }
}
