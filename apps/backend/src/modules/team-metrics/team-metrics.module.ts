import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TeamMetricsService } from './team-metrics.service';
import { TeamMetricsRepository } from './team-metrics.repository';
import { TeamMetricsAggregationProcessor } from './team-metrics-aggregation.processor';
import { TeamMetricsAggregationQueue } from './team-metrics-aggregation.queue';
import { QUEUES } from '../../jobs/queues';

/**
 * TeamMetricsModule aggregates per-developer MetricSnapshots into team-level
 * TeamMetricSnapshots scoped to a TeamLead.
 *
 * Does not expose an HTTP controller -- team metrics are read by
 * future report and dashboard modules, not directly by API consumers.
 *
 * Exports:
 *   TeamMetricsService           -- for future report/dashboard modules
 *   TeamMetricsAggregationQueue  -- for future scheduled triggers
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.TEAM_METRICS_AGGREGATION }),
  ],
  providers: [
    TeamMetricsService,
    TeamMetricsRepository,
    TeamMetricsAggregationProcessor,
    TeamMetricsAggregationQueue,
  ],
  exports: [TeamMetricsService, TeamMetricsAggregationQueue],
})
export class TeamMetricsModule {}
