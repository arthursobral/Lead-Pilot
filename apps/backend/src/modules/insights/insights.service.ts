import { Injectable, Logger } from '@nestjs/common';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { InsightsRepository } from './insights.repository';

/**
 * InsightsService
 *
 * Responsibilities (Phase 5):
 *   - Request a ContextPack from KnowledgeService
 *   - Build a prompt via PromptBuilder
 *   - Call OpenAI API via AIProvider
 *   - Parse structured response via ResponseParser
 *   - Store Insights and TalkingPoints
 *   - Never call OpenAI from controllers or jobs directly
 */
@Injectable()
export class InsightsService {
  private readonly logger = new Logger(InsightsService.name);

  constructor(
    private readonly knowledgeService: KnowledgeService,
    private readonly insightsRepository: InsightsRepository,
  ) {}

  // Implemented in Phase 5
}
