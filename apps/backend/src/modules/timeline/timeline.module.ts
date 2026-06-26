import { Module } from '@nestjs/common';
import { TimelineController } from './timeline.controller';
import { TimelineService } from './timeline.service';
import { TimelineRepository } from './timeline.repository';
import { TimelineBuilderService } from './timeline-builder.service';

/**
 * TimelineModule assembles the chronological history of a Developer.
 *
 * The Timeline merges Signals (GitHub activity) and Observations (human context)
 * into a single ordered view. It is the living record of a developer's story
 * and the primary input to the Knowledge Engine.
 *
 * Exports:
 *   TimelineService        -- read/write API; KnowledgeModule calls createEntry()
 *                             to add INSIGHT / REPORT entries programmatically.
 *   TimelineBuilderService -- pure normalizer; KnowledgeModule injects it to
 *                             build context packs from raw domain entities without
 *                             additional DB reads.
 */
@Module({
  controllers: [TimelineController],
  providers: [TimelineService, TimelineRepository, TimelineBuilderService],
  exports: [TimelineService, TimelineBuilderService],
})
export class TimelineModule {}
