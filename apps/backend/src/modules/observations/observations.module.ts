import { Module } from '@nestjs/common';
import { ObservationsController } from './observations.controller';
import { ObservationsService } from './observations.service';
import { ObservationsRepository } from './observations.repository';

/**
 * ObservationsModule owns the Observation domain entity.
 *
 * Observations are manually registered human context — the most important
 * input the platform receives that GitHub cannot provide.
 *
 * ObservationsService is exported so KnowledgeModule can include
 * observations when building Context Packs.
 */
@Module({
  controllers: [ObservationsController],
  providers: [ObservationsService, ObservationsRepository],
  exports: [ObservationsService],
})
export class ObservationsModule {}
