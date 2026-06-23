import { Injectable } from '@nestjs/common';
import { TimelineRepository } from './timeline.repository';

/**
 * TimelineService
 *
 * Responsibilities (Phase 4):
 *   - Create timeline entries from Signals and Observations
 *   - Return paginated, chronological developer history
 *   - Support entry types: SIGNAL, OBSERVATION, ACHIEVEMENT, INSIGHT, REPORT
 */
@Injectable()
export class TimelineService {
  constructor(private readonly timelineRepository: TimelineRepository) {}

  // Implemented in Phase 4
}
