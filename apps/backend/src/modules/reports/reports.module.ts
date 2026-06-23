import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './reports.repository';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { QUEUES } from '../../jobs/queues';

/**
 * ReportsModule generates weekly and monthly summaries.
 *
 * Reports combine Signals, Observations, Achievements, Risks, and TalkingPoints
 * into a structured document for the Team Lead.
 *
 * Like InsightsModule, it depends on KnowledgeModule rather than
 * querying the database directly.
 */
@Module({
  imports: [
    KnowledgeModule,
    BullModule.registerQueue({ name: QUEUES.WEEKLY_REPORT }),
  ],
  controllers: [ReportsController],
  providers: [ReportsService, ReportsRepository],
  exports: [ReportsService],
})
export class ReportsModule {}
