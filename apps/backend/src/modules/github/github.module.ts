import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { HttpModule } from '@nestjs/axios';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';
import { GithubRepository } from './github.repository';
import { QUEUES } from '../../jobs/queues';

/**
 * GithubModule owns the GitHub integration.
 *
 * Responsibilities:
 *   - GitHub REST API client (via HttpModule/axios)
 *   - Sync pull requests and reviews into the database (Signals)
 *   - Enqueue github-sync jobs via BullMQ
 *
 * HttpModule is scoped here, not globally, to keep the GitHub client
 * configuration (base URL, auth header) isolated to this module.
 */
@Module({
  imports: [
    HttpModule,
    BullModule.registerQueue({ name: QUEUES.GITHUB_SYNC }),
  ],
  controllers: [GithubController],
  providers: [GithubService, GithubRepository],
  exports: [GithubService],
})
export class GithubModule {}
