import { Injectable, Logger } from '@nestjs/common';
import { MetricsRepository } from './metrics.repository';

/**
 * MetricsService
 *
 * Responsibilities (Phase 3):
 *   - Calculate PR size, merge time, review participation
 *   - Detect activity trends across periods
 *   - Store MetricSnapshots
 *   - Enqueue recalculation jobs after GitHub sync completes
 *
 * Important: metrics describe patterns, never performance scores.
 */
@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(private readonly metricsRepository: MetricsRepository) {}

  // Implemented in Phase 3
}
