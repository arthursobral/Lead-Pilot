import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';

import { QUEUES } from '../../jobs/queues';
import {
  METRICS_CALCULATION_JOB,
  type MetricsCalculationJobPayload,
  type MetricsCalculationJobResult,
} from './metrics-calculation.job';

/**
 * MetricsCalculationQueue is the BullMQ producer for the metrics-calculation queue.
 *
 * enqueueForDeveloper() uses a stable job ID to deduplicate: if a job for the
 * same developer and period is already waiting or active, BullMQ keeps the
 * existing job and ignores the duplicate.
 *
 * Job ID format: "metrics-{developerId}-{periodStart-date}"
 * Example:       "metrics-clxyz123-2026-05-25"
 *
 * Note: BullMQ does not allow ":" in custom job IDs.
 */
@Injectable()
export class MetricsCalculationQueue {
  private readonly logger = new Logger(MetricsCalculationQueue.name);

  constructor(
    @InjectQueue(QUEUES.METRICS_CALCULATION)
    private readonly queue: Queue,
  ) {}

  async enqueueForDeveloper(
    payload: MetricsCalculationJobPayload,
  ): Promise<string> {
    const dateKey = payload.periodStart.split('T')[0]; // "2026-05-25"
    const jobId = `metrics-${payload.developerId}-${dateKey}`;

    const job = await this.queue.add(METRICS_CALCULATION_JOB, payload, { jobId });

    this.logger.log(
      `Enqueued metrics job [${job.id}] developer=${payload.developerId} period=${dateKey}`,
    );

    return job.id as string;
  }

  async getJob(
    jobId: string,
  ): Promise<Job<MetricsCalculationJobPayload, MetricsCalculationJobResult> | undefined> {
    const job = await this.queue.getJob(jobId);
    return job as
      | Job<MetricsCalculationJobPayload, MetricsCalculationJobResult>
      | undefined;
  }
}
