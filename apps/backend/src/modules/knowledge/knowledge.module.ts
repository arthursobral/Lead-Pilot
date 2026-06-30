import { Module } from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { KnowledgeController } from './knowledge.controller';
import { ContextBuilderService } from './context-builder.service';
import { DevelopersModule } from '../developers/developers.module';
import { MetricsModule } from '../metrics/metrics.module';
import { ObservationsModule } from '../observations/observations.module';
import { TimelineModule } from '../timeline/timeline.module';
import { FactsModule } from '../facts/facts.module';

/**
 * KnowledgeModule -- the AI firewall (context-pack assembly layer).
 *
 * Orchestrates data collection across domain modules and assembles ContextPacks
 * for the AI layer (Day 6). No LLM calls happen here.
 *
 * Architecture (ADR-004):
 *   - KnowledgeService fetches all domain data for a period.
 *   - ContextBuilderService assembles the structured ContextPack (pure, no Prisma).
 *   - Fact generation lives in FactsModule; facts are read via FactsService.
 *   - Timeline entries are read via TimelineRepository (exported from TimelineModule).
 *
 * Exports:
 *   KnowledgeService -- used by InsightsModule and ReportsModule (Day 6+)
 */
@Module({
  imports: [DevelopersModule, MetricsModule, ObservationsModule, TimelineModule, FactsModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService, ContextBuilderService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
