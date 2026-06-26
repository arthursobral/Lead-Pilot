import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { QUEUES } from '../../jobs/queues';
import { MetricsService } from './metrics.service';
import {
  METRICS_CALCULATION_JOB,
  type MetricsCalculationJobPayload,
  type MetricsCalculationJobResult,
} from './metrics-calculation.job';

/**
 * MetricsCalculationProcessor
 *
 * BullMQ worker that handles metrics.calculateDeveloper jobs.
 *
 * Each job recalculates and upserts one MetricSnapshot for a specific
 * developer and period. Idempotent -- safe to retry.
 *
 * Triggered by:
 *   - GithubSyncProcessor after every sync (one job per touched developer)
 *   - Future scheduled jobs for periodic recalculation
 */
@Processor(QUEUES.METRICS_CALCULATION)
export class MetricsCalculationProcessor extends WorkerHost {
  private readonly logger = new Logger(MetricsCalculationProcessor.name);

  constructor(private readonly metricsService: MetricsService) {
    super();
  }

  async process(
    job: Job<MetricsCalculationJobPayload, MetricsCalculationJobResult>,
  ): Promise<MetricsCalculationJobResult> {
    if (job.name !== METRICS_CALCULATION_JOB) {
      this.logger.warn(`Unknown job name "${job.name}" -- skipping`);
      return this.emptyResult(job.data);
    }

    const { developerId, periodStart, periodEnd } = job.data;

    this.logger.log(
      `[job:${job.id}] Calculating metrics developer=${developerId} ` +
        `period=${periodStart} to ${periodEnd}`,
    );

    await job.updateProgress(10);

    try {
      const snapshot = await this.metricsService.calculateForDeveloper(
        developerId,
        new Date(periodStart),
        new Date(periodEnd),
      );

      await job.updateProgress(100);

      this.logger.log(
        `[job:${job.id}] Done -- snapshot=${snapshot.id} developer=${developerId}`,
      );

      return { developerId, periodStart, periodEnd, snapshotId: snapshot.id };
    } catch (error) {
      this.logger.error(
        `[job:${job.id}] Failed calculating metrics for developer=${developerId}`,
        error,
      );
      throw error;
    }
  }

  private emptyResult(
    data: MetricsCalculationJobPayload,
  ): MetricsCalculationJobResult {
    return {
      developerId: data.developerId,
      periodStart: data.periodStart,
      periodEnd: data.periodEnd,
      snapshotId: '',
    };
  }
}
