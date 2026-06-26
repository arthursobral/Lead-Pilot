import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { MetricsRepository } from './metrics.repository';
import { MetricsCalculationProcessor } from './metrics-calculation.processor';
import { MetricsCalculationQueue } from './metrics-calculation.queue';
import { MetricsSnapshotProcessor } from './metrics-snapshot.processor';
import { MetricsSnapshotQueue } from './metrics-snapshot.queue';
import { QUEUES } from '../../jobs/queues';

/**
 * MetricsModule transforms raw GitHub Signals into MetricSnapshots.
 *
 * Two queues:
 *
 *   METRICS_CALCULATION -- triggered by GithubSyncProcessor after every sync.
 *                          Caller supplies explicit periodStart/periodEnd.
 *                          Producer: MetricsCalculationQueue (exported)
 *
 *   METRICS_SNAPSHOT    -- triggered on-demand via POST /api/metrics/generate/:id
 *                          or by scheduled jobs. Period derived internally.
 *                          Producer: MetricsSnapshotQueue (exported)
 *
 * Exports:
 *   MetricsService           -- used by KnowledgeModule for Context Packs
 *   MetricsCalculationQueue  -- used by GithubModule to trigger recalculation
 *                               after a sync completes
 *   MetricsSnapshotQueue     -- used by MetricsController + future scheduled jobs
 */
@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUES.METRICS_CALCULATION }),
    BullModule.registerQueue({ name: QUEUES.METRICS_SNAPSHOT }),
  ],
  controllers: [MetricsController],
  providers: [
    MetricsService,
    MetricsRepository,
    MetricsCalculationProcessor,
    MetricsCalculationQueue,
    MetricsSnapshotProcessor,
    MetricsSnapshotQueue,
  ],
  exports: [MetricsService, MetricsCalculationQueue, MetricsSnapshotQueue],
})
export class MetricsModule {}
