import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';

import { DevelopersModule } from '../developers/developers.module';
import { MetricsModule } from '../metrics/metrics.module';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { GithubRepository } from './github.repository';
import { GithubApiClient } from './github-api.client';
import { GithubMapper } from './github.mapper';
import { GithubSyncProcessor } from './github-sync.processor';
import { GithubSyncQueue } from './github-sync.queue';
import { QUEUES } from '../../jobs/queues';

/**
 * GithubModule owns the GitHub integration.
 *
 * Responsibilities:
 *   - GitHub REST API client (GithubApiClient via HttpModule/axios)
 *   - Response normalization (GithubMapper)
 *   - Fetch + persist orchestration (GithubService)
 *   - PR + review persistence (GithubRepository)
 *   - Background job queue + processor (BullMQ GITHUB_SYNC)
 *
 * DevelopersModule is imported so GithubService can inject DevelopersRepository
 * to upsert PR authors and reviewers without a teamLead context.
 *
 * MetricsModule is imported so GithubSyncProcessor can enqueue metrics
 * recalculation jobs for all developers touched during a sync.
 *
 * GithubSyncQueue is exported so other modules can enqueue sync jobs
 * without depending on GithubService directly.
 */
@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({ name: QUEUES.GITHUB_SYNC }),
    DevelopersModule,
    MetricsModule,
  ],
  controllers: [GithubController],
  providers: [
    GithubApiClient,
    GithubMapper,
    GithubService,
    GithubRepository,
    GithubSyncProcessor,
    GithubSyncQueue,
  ],
  exports: [GithubService, GithubSyncQueue],
})
export class GithubModule {}
