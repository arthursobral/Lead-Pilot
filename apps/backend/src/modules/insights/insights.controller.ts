import { Controller } from '@nestjs/common';
import { InsightsService } from './insights.service';

/**
 * InsightsController
 *
 * Routes (Phase 5):
 *   GET  /api/developers/:id/insights  - get latest insights for a developer
 *   POST /api/developers/:id/insights  - trigger insight generation
 */
@Controller('insights')
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  // Routes implemented in Phase 5
}
