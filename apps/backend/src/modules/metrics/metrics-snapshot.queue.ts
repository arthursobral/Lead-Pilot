import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Job, Queue } from 'bullmq';

import { QUEUES } from '../../jobs/queues';
import {
  METRICS_SNAPSHOT_JOB,
  type MetricsSnapshotJobPayload,
  type MetricsSnapshotJobResult,
} from './metrics-snapshot.job';

/**
 * MetricsSnapshotQueue is the BullMQ producer for the metrics-snapshot queue.
 *
 * enqueueForDeveloper() uses a stable job ID to deduplicate:
 *   "snapshot-{developerId}-{today}"
 *
 * If a job for the same developer already exists in the queue for today,
 * BullMQ keeps the existing job and ignores the new enqueue. This prevents
 * a flood of duplicate snapshot jobs when multiple triggers fire for the
 * same developer on the same day.
 *
 * Note: BullMQ does not allow ":" in custom job IDs -- we use "-" throughout.
 */
@Injectable()
export class MetricsSnapshotQueue {
  private readonly logger = new Logger(MetricsSnapshotQueue.name);

  constructor(
    @InjectQueue(QUEUES.METRICS_SNAPSHOT)
    private readonly queue: Queue,
  ) {}

  /**
   * Enqueue a metrics snapshot job for a single developer.
   *
   * The job is deduplicated by developer + calendar date, so calling this
   * multiple times on the same day for the same developer is safe.
   *
   * Returns the BullMQ job ID.
   */
  async enqueueForDeveloper(developerId: string): Promise<string> {
    const dateKey = new Date().toISOString().split('T')[0]; // "2026-06-25"
    const jobId = `snapshot-${developerId}-${dateKey}`;
    const payload: MetricsSnapshotJobPayload = { developerId };

    const job = await this.queue.add(METRICS_SNAPSHOT_JOB, payload, { jobId });

    this.logger.log(
      `Enqueued snapshot job [${job.id}] developer=${developerId}`,
    );

    return job.id as string;
  }

  /**
   * Retrieve a previously enqueued job by ID.
   * Returns undefined if the job has already been removed from the queue.
   */
  async getJob(
    jobId: string,
  ): Promise<Job<MetricsSnapshotJobPayload, MetricsSnapshotJobResult> | undefined> {
    const job = await this.queue.getJob(jobId);
    return job as
      | Job<MetricsSnapshotJobPayload, MetricsSnapshotJobResult>
      | undefined;
  }
}
