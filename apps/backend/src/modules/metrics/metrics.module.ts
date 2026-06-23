import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { MetricsRepository } from './metrics.repository';
import { QUEUES } from '../../jobs/queues';

/**
 * MetricsModule transforms raw GitHub Signals into MetricSnapshots.
 *
 * A MetricSnapshot is an aggregated view of a developer's activity
 * for a specific period (e.g. last 30 days).
 *
 * MetricsService is exported so KnowledgeModule can include
 * metric context when building Context Packs for the AI layer.
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.METRICS_CALCULATION }),
  ],
  controllers: [MetricsController],
  providers: [MetricsService, MetricsRepository],
  exports: [MetricsService],
})
export class MetricsModule {}
