import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { KnowledgeService } from './knowledge.service';
import { ContextPackQueryDto } from './dto/context-pack-query.dto';
import type { ContextPackResponseDto } from './dto/context-pack-response.dto';

// ---------------------------------------------------------------------------
// DEV bypass -- same pattern as DevelopersController. Remove in Phase 5.
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === 'production' && process.env.DEV_TEAM_LEAD_ID) {
  throw new Error(
    '[KnowledgeController] DEV_TEAM_LEAD_ID is set in a production environment. ' +
      'Remove the Day 5 auth bypass before deploying.',
  );
}

const TEAM_LEAD_ID = process.env.DEV_TEAM_LEAD_ID ?? '';

/**
 * KnowledgeController
 *
 * Exposes the ContextPack endpoint over HTTP.
 *
 * Routes:
 *   GET /api/developers/:developerId/knowledge/context -- primary path
 *   GET /api/developers/:developerId/context-pack      -- legacy alias (kept for compat)
 *
 * Facts generation and listing are handled by FactsController (FactsModule).
 */
@Controller()
export class KnowledgeController {
  constructor(private readonly knowledgeService: KnowledgeService) {}

  /**
   * GET /api/developers/:developerId/knowledge/context
   *
   * Build and return a dynamic ContextPack for the given developer and period.
   * The pack is assembled fresh on every call and never persisted.
   *
   * Recommended workflow:
   *   1. POST /facts/generate   -- ensure facts for the period are current
   *   2. GET  /knowledge/context -- retrieve the assembled context pack
   *
   * Query: ?periodStart=2026-06-01&periodEnd=2026-07-01
   */
  @Get('developers/:developerId/knowledge/context')
  async getKnowledgeContext(
    @Param('developerId') developerId: string,
    @Query() query: ContextPackQueryDto,
  ): Promise<ContextPackResponseDto> {
    return this.knowledgeService.buildContextPack(
      developerId,
      TEAM_LEAD_ID,
      new Date(query.periodStart),
      new Date(query.periodEnd),
    );
  }

  /**
   * GET /api/developers/:developerId/context-pack
   *
   * Legacy path -- kept for backward compatibility.
   * Prefer /knowledge/context for new integrations.
   */
  @Get('developers/:developerId/context-pack')
  async getContextPack(
    @Param('developerId') developerId: string,
    @Query() query: ContextPackQueryDto,
  ): Promise<ContextPackResponseDto> {
    return this.knowledgeService.buildContextPack(
      developerId,
      TEAM_LEAD_ID,
      new Date(query.periodStart),
      new Date(query.periodEnd),
    );
  }
}
