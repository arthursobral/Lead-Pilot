import { Module } from '@nestjs/common';
import { FactsController } from './facts.controller';
import { FactsService } from './facts.service';
import { FactsRepository } from './facts.repository';
import { DevelopersModule } from '../developers/developers.module';
import { MetricsModule } from '../metrics/metrics.module';
import { ObservationsModule } from '../observations/observations.module';
import { TimelineModule } from '../timeline/timeline.module';

/**
 * FactsModule -- the Facts domain.
 *
 * Facts are structured, evidence-backed statements extracted from
 * MetricSnapshots, Observations, and TimelineEntries. They are the
 * primary input to the Knowledge Engine (ADR-004, ADR-006).
 *
 * Architecture constraints (ADR-005):
 *   - Facts never judge performance.
 *   - Facts never rank developers.
 *   - Facts are not AI insights -- they are grounded in evidence.
 *
 * Exports:
 *   FactsService -- used by KnowledgeModule to retrieve facts for ContextPacks.
 *   FactsRepository -- exported so KnowledgeModule can call findByDeveloperAndPeriod
 *                      directly if needed (avoids a round-trip through the service).
 */
@Module({
  imports: [DevelopersModule, MetricsModule, ObservationsModule, TimelineModule],
  controllers: [FactsController],
  providers: [FactsService, FactsRepository],
  exports: [FactsService, FactsRepository],
})
export class FactsModule {}
