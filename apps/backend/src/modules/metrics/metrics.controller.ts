import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { MetricsSnapshotQueue } from './metrics-snapshot.queue';
import { GetMetricsQueryDto } from './dto/get-metrics-query.dto';

/**
 * MetricsController
 *
 * Day 3 temporary endpoints for triggering and reading developer metrics.
 * These exist so the metrics engine can be exercised without a full sync.
 * Mark for review before production hardening (auth, rate limiting, etc.).
 *
 * Routes:
 *   POST /api/metrics/generate/:developerId
 *     Enqueues a metrics.generateDeveloperSnapshot job for the developer.
 *     Uses MetricsSnapshotQueue so the period is derived internally
 *     (defaultPeriod -- 30-day rolling window). Idempotent: one job per
 *     developer per calendar day (BullMQ deduplication by job ID).
 *     Returns { jobId } so callers can poll status if needed.
 *
 *   GET /api/metrics/:developerId
 *     Returns the most recent MetricSnapshot for a developer.
 *     Optional ?periodStart=ISO8601&periodEnd=ISO8601 for a specific window.
 *
 *   GET /api/developers/:developerId/metrics  (pre-existing)
 *     Same as above -- kept for backwards compatibility.
 */
@Controller()
export class MetricsController {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly metricsSnapshotQueue: MetricsSnapshotQueue,
  ) {}

  // ---------------------------------------------------------------------------
  // POST /api/metrics/generate/:developerId
  // ---------------------------------------------------------------------------

  /**
   * Enqueue a metrics snapshot job for a developer.
   *
   * The job calculates and upserts a MetricSnapshot for the default 30-day
   * rolling period. Multiple calls on the same day are deduplicated by BullMQ.
   *
   * Example:
   *   curl -X POST http://localhost:3000/api/metrics/generate/clxyz123
   *
   * Response:
   *   { "jobId": "snapshot-clxyz123-2026-06-25" }
   */
  @Post('metrics/generate/:developerId')
  @HttpCode(HttpStatus.ACCEPTED)
  async generateMetrics(@Param('developerId') developerId: string) {
    const jobId = await this.metricsSnapshotQueue.enqueueForDeveloper(developerId);
    return { jobId };
  }

  // ---------------------------------------------------------------------------
  // GET /api/metrics/:developerId
  // ---------------------------------------------------------------------------

  /**
   * Return the most recent MetricSnapshot for a developer.
   * Pass ?periodStart=&periodEnd= to fetch a specific window.
   *
   * Examples:
   *   curl http://localhost:3000/api/metrics/clxyz123
   *   curl "http://localhost:3000/api/metrics/clxyz123?periodStart=2026-05-25T00:00:00Z&periodEnd=2026-06-24T00:00:00Z"
   */
  @Get('metrics/:developerId')
  async getMetrics(
    @Param('developerId') developerId: string,
    @Query() query: GetMetricsQueryDto,
  ) {
    return this.resolveSnapshot(developerId, query);
  }

  // ---------------------------------------------------------------------------
  // GET /api/developers/:developerId/metrics  (pre-existing, kept for compat)
  // ---------------------------------------------------------------------------

  @Get('developers/:developerId/metrics')
  async getDeveloperMetrics(
    @Param('developerId') developerId: string,
    @Query() query: GetMetricsQueryDto,
  ) {
    return this.resolveSnapshot(developerId, query);
  }

  // ---------------------------------------------------------------------------
  // Shared resolution logic
  // ---------------------------------------------------------------------------

  private async resolveSnapshot(developerId: string, query: GetMetricsQueryDto) {
    if (query.periodStart && query.periodEnd) {
      const snapshot = await this.metricsService.getSnapshotForPeriod(
        developerId,
        new Date(query.periodStart),
        new Date(query.periodEnd),
      );

      if (!snapshot) {
        throw new NotFoundException(
          `No metric snapshot found for developer ${developerId} ` +
            `in period ${query.periodStart} to ${query.periodEnd}`,
        );
      }

      return snapshot;
    }

    const snapshot = await this.metricsService.getLatestSnapshot(developerId);

    if (!snapshot) {
      throw new NotFoundException(
        `No metric snapshot found for developer ${developerId}. ` +
          `Run POST /api/metrics/generate/${developerId} first.`,
      );
    }

    return snapshot;
  }
}
