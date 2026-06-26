import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { QUEUES } from '../../jobs/queues';
import { MetricsService } from './metrics.service';
import {
  METRICS_SNAPSHOT_JOB,
  type MetricsSnapshotJobPayload,
  type MetricsSnapshotJobResult,
} from './metrics-snapshot.job';

/**
 * MetricsSnapshotProcessor
 *
 * BullMQ worker that handles metrics.generateDeveloperSnapshot jobs.
 *
 * Responsibilities:
 *   1. Derive the calculation period from MetricsService.defaultPeriod()
 *      (30-day rolling window ending now).
 *   2. Call MetricsService.calculateForDeveloper() which fetches PR and
 *      review data from the DB and upserts a MetricSnapshot.
 *
 * Idempotency:
 *   - The upsert in MetricsRepository is keyed on
 *     (developerId, periodStart, periodEnd), so running this job
 *     multiple times for the same developer on the same day produces
 *     the same snapshot row (values are refreshed, not duplicated).
 *   - Job IDs follow the format "snapshot-{developerId}-{dateKey}"
 *     which BullMQ uses to deduplicate waiting/active jobs.
 *
 * Retryability:
 *   - Errors are re-thrown so BullMQ retries according to the queue's
 *     backoff settings. The upsert guarantees partial runs can be safely
 *     retried from scratch.
 *
 * Triggered by:
 *   - MetricsSnapshotQueue.enqueueForDeveloper() (on-demand API requests)
 *   - Future scheduled jobs for nightly metric refresh
 */
@Processor(QUEUES.METRICS_SNAPSHOT)
export class MetricsSnapshotProcessor extends WorkerHost {
  private readonly logger = new Logger(MetricsSnapshotProcessor.name);

  constructor(private readonly metricsService: MetricsService) {
    super();
  }

  async process(
    job: Job<MetricsSnapshotJobPayload, MetricsSnapshotJobResult>,
  ): Promise<MetricsSnapshotJobResult> {
    if (job.name !== METRICS_SNAPSHOT_JOB) {
      this.logger.warn(`Unknown job name "${job.name}" -- skipping`);
      return this.emptyResult(job.data);
    }

    const { developerId } = job.data;

    this.logger.log(`[job:${job.id}] Generating snapshot for developer=${developerId}`);

    await job.updateProgress(10);

    try {
      // Derive the period at process time so the snapshot always reflects
      // the rolling window from when the job actually ran, not when it was enqueued.
      const { periodStart, periodEnd } = MetricsService.defaultPeriod();

      await job.updateProgress(30);

      const snapshot = await this.metricsService.calculateForDeveloper(
        developerId,
        periodStart,
        periodEnd,
      );

      await job.updateProgress(100);

      this.logger.log(
        `[job:${job.id}] Done -- snapshot=${snapshot.id} developer=${developerId} ` +
          `period=${periodStart.toISOString()} to ${periodEnd.toISOString()}`,
      );

      return {
        developerId,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        snapshotId: snapshot.id,
      };
    } catch (error) {
      this.logger.error(
        `[job:${job.id}] Failed generating snapshot for developer=${developerId}`,
        error,
      );
      throw error;
    }
  }

  private emptyResult(data: MetricsSnapshotJobPayload): MetricsSnapshotJobResult {
    return {
      developerId: data.developerId,
      periodStart: '',
      periodEnd: '',
      snapshotId: '',
    };
  }
}
