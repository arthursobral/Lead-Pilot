import { Module } from '@nestjs/common';
import { DevelopersController } from './developers.controller';
import { DevelopersService } from './developers.service';
import { DevelopersRepository } from './developers.repository';
import { DeveloperMapper } from './mapper/developer.mapper';

/**
 * DevelopersModule owns the Developer domain entity.
 *
 * A Developer is a person tracked by the system -- never ranked or scored,
 * only contextualized through signals, observations, and insights.
 *
 * Exports:
 *   DevelopersService    -- consumed by timeline, insights, reports modules
 *   DevelopersRepository -- consumed by GithubModule for sync-time upserts
 *     that have no teamLead context (PR authors, reviewers)
 */
@Module({
  controllers: [DevelopersController],
  providers: [DevelopersService, DevelopersRepository, DeveloperMapper],
  exports: [DevelopersService, DevelopersRepository],
})
export class DevelopersModule {}
