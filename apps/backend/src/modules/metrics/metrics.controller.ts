import { Controller } from '@nestjs/common';
import { MetricsService } from './metrics.service';

/**
 * MetricsController
 *
 * Routes (Phase 3):
 *   GET /api/developers/:id/metrics  — get MetricSnapshot for a developer
 */
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  // Routes implemented in Phase 3
}
