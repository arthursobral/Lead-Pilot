import { Module } from '@nestjs/common';
import { DevelopersController } from './developers.controller';
import { DevelopersService } from './developers.service';
import { DevelopersRepository } from './developers.repository';
import { DeveloperMapper } from './mapper/developer.mapper';

/**
 * DevelopersModule owns the Developer domain entity.
 *
 * A Developer is a person tracked by the system — never ranked or scored,
 * only contextualized through signals, observations, and insights.
 *
 * DevelopersService is exported so other modules (timeline, insights, reports)
 * can query developer data without importing the repository directly.
 */
@Module({
  controllers: [DevelopersController],
  providers: [DevelopersService, DevelopersRepository, DeveloperMapper],
  exports: [DevelopersService],
})
export class DevelopersModule {}
