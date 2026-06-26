import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';

import { QUEUES } from '../../jobs/queues';
import {
  TEAM_METRICS_AGGREGATION_JOB,
  type TeamMetricsAggregationJobPayload,
  type TeamMetricsAggregationJobResult,
} from './team-metrics-aggregation.job';

/**
 * TeamMetricsAggregationQueue is the BullMQ producer for the
 * team-metrics-aggregation queue.
 *
 * enqueueForTeam() uses a stable job ID to deduplicate:
 *   "team-{teamLeadId}-{periodStart-date}"
 *
 * This prevents duplicate aggregation jobs when multiple triggers fire for
 * the same team in the same period (e.g., multiple developers finishing
 * their metric calculations simultaneously).
 *
 * Note: BullMQ does not allow ":" in custom job IDs -- we use "-" throughout.
 */
@Injectable()
export class TeamMetricsAggregationQueue {
  private readonly logger = new Logger(TeamMetricsAggregationQueue.name);

  constructor(
    @InjectQueue(QUEUES.TEAM_METRICS_AGGREGATION)
    private readonly queue: Queue,
  ) {}

  /**
   * Enqueue a team metrics aggregation job.
   *
   * The job is deduplicated by teamLeadId + periodStart date, so calling this
   * multiple times for the same team and period is safe.
   *
   * Returns the BullMQ job ID.
   */
  async enqueueForTeam(payload: TeamMetricsAggregationJobPayload): Promise<string> {
    const dateKey = payload.periodStart.split('T')[0]; // "2026-05-25"
    const jobId = `team-${payload.teamLeadId}-${dateKey}`;

    const job = await this.queue.add(TEAM_METRICS_AGGREGATION_JOB, payload, { jobId });

    this.logger.log(
      `Enqueued team aggregation job [${job.id}] ` +
        `teamLead=${payload.teamLeadId} period=${dateKey}`,
    );

    return job.id as string;
  }

  async getJob(
    jobId: string,
  ): Promise<Job<TeamMetricsAggregationJobPayload, TeamMetricsAggregationJobResult> | undefined> {
    const job = await this.queue.getJob(jobId);
    return job as
      | Job<TeamMetricsAggregationJobPayload, TeamMetricsAggregationJobResult>
      | undefined;
  }
}
