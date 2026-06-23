import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';
import { InsightsRepository } from './insights.repository';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { QUEUES } from '../../jobs/queues';

/**
 * InsightsModule generates AI coaching insights.
 *
 * It receives a Context Pack from KnowledgeModule, calls the OpenAI API,
 * parses the structured response, and stores Insights and TalkingPoints.
 *
 * The AI integration stack (Phase 5):
 *   KnowledgeService → ContextPack
 *   InsightsService  → OpenAI call
 *   PromptBuilder    → builds the prompt
 *   ResponseParser   → validates and parses structured output
 */
@Module({
  imports: [
    KnowledgeModule,
    BullModule.registerQueue({ name: QUEUES.AI_INSIGHTS }),
  ],
  controllers: [InsightsController],
  providers: [InsightsService, InsightsRepository],
  exports: [InsightsService],
})
export class InsightsModule {}
