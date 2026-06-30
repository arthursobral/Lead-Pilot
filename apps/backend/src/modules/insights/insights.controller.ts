import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { InsightsService } from './insights.service';
import { GenerateInsightBodyDto } from './dto/generate-insight-body.dto';
import { GetInsightsQueryDto } from './dto/get-insights-query.dto';
import type { InsightResponseDto, PaginatedInsightsResponseDto } from './dto/insight-response.dto';

// ---------------------------------------------------------------------------
// DEV bypass -- same pattern as FactsController. Remove in Phase 5.
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === 'production' && process.env.DEV_TEAM_LEAD_ID) {
  throw new Error(
    '[InsightsController] DEV_TEAM_LEAD_ID is set in a production environment. ' +
      'Remove the Day 6 auth bypass before deploying.',
  );
}

const TEAM_LEAD_ID = process.env.DEV_TEAM_LEAD_ID ?? '';

/**
 * InsightsController
 *
 * Exposes the Insights domain over HTTP.
 * All routes are developer-scoped: /developers/:developerId/...
 *
 * Routes:
 *   POST /api/developers/:developerId/insights/generate -- generate + persist insights
 *   GET  /api/developers/:developerId/insights          -- list stored insights
 *
 * Recommended workflow:
 *   1. POST /facts/generate             -- ensure facts are current
 *   2. POST /insights/generate          -- generate insights from context pack
 *   3. GET  /knowledge/context          -- verify the full context pack
 *   4. GET  /insights                   -- retrieve stored insights
 */
@Controller()
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  /**
   * POST /api/developers/:developerId/insights/generate
   *
   * Triggers a full insight generation cycle:
   *   1. Refreshes facts for the period.
   *   2. Builds the ContextPack.
   *   3. Calls Ollama (qwen2.5-coder:7b).
   *   4. Validates and persists insights with talking points.
   *
   * Synchronous -- waits for Ollama to respond (up to OLLAMA_TIMEOUT_MS).
   * Phase 5: move to BullMQ background job for production use.
   *
   * Body: { "periodStart": "2026-06-01", "periodEnd": "2026-07-01" }
   */
  @Post('developers/:developerId/insights/generate')
  @HttpCode(HttpStatus.OK)
  async generateInsights(
    @Param('developerId') developerId: string,
    @Body() body: GenerateInsightBodyDto,
  ): Promise<InsightResponseDto[]> {
    return this.insightsService.generate(
      developerId,
      TEAM_LEAD_ID,
      new Date(body.periodStart),
      new Date(body.periodEnd),
    );
  }

  /**
   * GET /api/developers/:developerId/insights
   *
   * Paginated list of stored insights for a developer.
   * Optionally filter by type, periodStart, periodEnd.
   */
  @Get('developers/:developerId/insights')
  async listInsights(
    @Param('developerId') developerId: string,
    @Query() query: GetInsightsQueryDto,
  ): Promise<PaginatedInsightsResponseDto> {
    return this.insightsService.list(developerId, TEAM_LEAD_ID, {
      type:        query.type,
      periodStart: query.periodStart ? new Date(query.periodStart) : undefined,
      periodEnd:   query.periodEnd   ? new Date(query.periodEnd)   : undefined,
      page:        query.page,
      limit:       query.limit,
    });
  }
}
