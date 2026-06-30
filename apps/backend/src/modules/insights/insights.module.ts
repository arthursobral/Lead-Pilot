import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { InsightsRepository } from './insights.repository';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { FactsModule } from '../facts/facts.module';
import { AiModule } from '../ai/ai.module';
import { QUEUES } from '../../jobs/queues';

/**
 * InsightsModule -- AI-powered coaching insight generation.
 *
 * Dependency graph:
 *   InsightsService
 *     <- KnowledgeModule  (buildContextPack)
 *     <- FactsModule      (generate facts before building pack)
 *     <- AiModule         (OllamaProvider, PromptBuilderService, InsightParserService)
 *     <- InsightsRepository
 *
 * The AI_INSIGHTS BullMQ queue is pre-registered for Phase 5 background jobs.
 * Day 6 uses synchronous HTTP generation for local validation.
 */
@Module({
  imports: [
    KnowledgeModule,
    FactsModule,
    AiModule,
    BullModule.registerQueue({ name: QUEUES.AI_INSIGHTS }),
  ],
  controllers: [InsightsController],
  providers:   [InsightsService, InsightsRepository],
  exports:     [InsightsService],
})
export class InsightsModule {}
