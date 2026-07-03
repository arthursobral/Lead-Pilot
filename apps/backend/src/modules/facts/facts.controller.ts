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
import { FactsService } from './facts.service';
import { GenerateFactsBodyDto } from './dto/generate-facts-body.dto';
import { GetFactsQueryDto } from './dto/get-facts-query.dto';
import type { PaginatedFactsResponseDto } from './dto/fact-response.dto';

// ---------------------------------------------------------------------------
// DEV bypass -- same pattern as DevelopersController. Remove in Phase 5.
// ---------------------------------------------------------------------------
if (process.env.NODE_ENV === 'production' && process.env.DEV_TEAM_LEAD_ID) {
  throw new Error(
    '[FactsController] DEV_TEAM_LEAD_ID is set in a production environment. ' +
      'Remove the Day 5 auth bypass before deploying.',
  );
}

const TEAM_LEAD_ID = process.env.DEV_TEAM_LEAD_ID ?? '';

/**
 * FactsController
 *
 * Exposes the Facts domain over HTTP.
 * All routes are developer-scoped: /developers/:developerId/...
 *
 * Routes:
 *   POST /api/developers/:developerId/facts/generate  -- extract + persist Facts
 *   GET  /api/developers/:developerId/facts           -- list stored Facts
 *
 * Thin controller: validate inputs, call service, return.
 * No business logic here.
 */
@Controller()
export class FactsController {
  constructor(private readonly factsService: FactsService) {}

  /**
   * POST /api/developers/:developerId/facts/generate
   *
   * Extract structured Facts from MetricSnapshots, Observations, and
   * TimelineEntries for the given period. Idempotent via dedupKey -- safe
   * to call multiple times without duplicating data.
   *
   * Body: { "periodStart": "2026-06-01", "periodEnd": "2026-07-01" }
   */
  @Post('developers/:developerId/facts/generate')
  @HttpCode(HttpStatus.OK)
  async generateFacts(
    @Param('developerId') developerId: string,
    @Body() body: GenerateFactsBodyDto,
  ) {
    return this.factsService.generate(
      developerId,
      TEAM_LEAD_ID,
      new Date(body.periodStart),
      new Date(body.periodEnd),
    );
  }

  /**
   * GET /api/developers/:developerId/facts
   *
   * Paginated list of stored Facts for a developer.
   * Optionally filter by type.
   */
  @Get('developers/:developerId/facts')
  async listFacts(
    @Param('developerId') developerId: string,
    @Query() query: GetFactsQueryDto,
  ): Promise<PaginatedFactsResponseDto> {
    return this.factsService.list(developerId, TEAM_LEAD_ID, {
      type: query.type,
      page: query.page,
      limit: query.limit,
    });
  }
}
