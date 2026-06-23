import { Module } from '@nestjs/common';
import { TimelineController } from './timeline.controller';
import { TimelineService } from './timeline.service';
import { TimelineRepository } from './timeline.repository';

/**
 * TimelineModule assembles the chronological history of a Developer.
 *
 * The Timeline merges Signals (GitHub activity) and Observations (human context)
 * into a single ordered view. It is the living record of a developer's story.
 *
 * TimelineService is exported so KnowledgeModule can use the timeline
 * as input when building Context Packs.
 */
@Module({
  controllers: [TimelineController],
  providers: [TimelineService, TimelineRepository],
  exports: [TimelineService],
})
export class TimelineModule {}
