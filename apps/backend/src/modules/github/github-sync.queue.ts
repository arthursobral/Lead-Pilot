import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Job, JobsOptions, Queue } from 'bullmq';

import { QUEUES } from '../../jobs/queues';
import {
  GITHUB_SYNC_JOB,
  type GithubSyncJobPayload,
  type GithubSyncJobResult,
} from './github-sync.job';

/**
 * GithubSyncQueue is the producer for the github-sync BullMQ queue.
 *
 *   enqueue()       -- always adds a new job (for scheduled/cron triggers)
 *   enqueueUnique() -- deduplicates by repo: skips if a job for the same
 *                      owner/repo is already waiting or active.
 *
 * Note: BullMQ does not allow ":" in custom job IDs.
 * Stable unique ID format: "sync-{owner}-{repo}"
 */
@Injectable()
export class GithubSyncQueue {
  private readonly logger = new Logger(GithubSyncQueue.name);

  constructor(
    @InjectQueue(QUEUES.GITHUB_SYNC)
    private readonly queue: Queue,
  ) {}

  async enqueue(
    payload: GithubSyncJobPayload,
    options?: JobsOptions,
  ): Promise<string> {
    const job = await this.queue.add(GITHUB_SYNC_JOB, payload, options);
    this.logger.log(
      `Enqueued sync job [${job.id}] for ${payload.owner}/${payload.repo}`,
    );
    return job.id as string;
  }

  async enqueueUnique(payload: GithubSyncJobPayload): Promise<string> {
    const jobId = `sync-${payload.owner}-${payload.repo}`;
    const job = await this.queue.add(GITHUB_SYNC_JOB, payload, { jobId });
    this.logger.log(
      `Enqueued unique sync job [${job.id}] for ${payload.owner}/${payload.repo}`,
    );
    return job.id as string;
  }

  async getJob(jobId: string): Promise<Job | undefined> {
    const job = await this.queue.getJob(jobId);
    return job ?? undefined;
  }
}
