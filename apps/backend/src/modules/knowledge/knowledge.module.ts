import { Module } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { DevelopersModule } from '../developers/developers.module';
import { MetricsModule } from '../metrics/metrics.module';
import { ObservationsModule } from '../observations/observations.module';
import { TimelineModule } from '../timeline/timeline.module';

/**
 * KnowledgeModule is the AI firewall.
 *
 * It aggregates data from multiple domain modules and builds a
 * structured Context Pack before anything is sent to the AI layer.
 *
 * Architectural rule: InsightsModule never queries the database directly.
 * It calls KnowledgeService.buildContextPack() instead.
 *
 * This module has NO controller and NO repository - it is a pure
 * internal orchestration layer. Giving it an HTTP endpoint would
 * break the boundary and expose raw internal context.
 *
 * KnowledgeService is exported so InsightsModule and ReportsModule
 * can use it when generating AI output.
 */
@Module({
  imports: [DevelopersModule, MetricsModule, ObservationsModule, TimelineModule],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
