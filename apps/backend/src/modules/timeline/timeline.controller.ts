import { Controller } from '@nestjs/common';
import { TimelineService } from './timeline.service';

/**
 * TimelineController
 *
 * Routes (Phase 4):
 *   GET /api/developers/:id/timeline  - paginated timeline for a developer
 */
@Controller('timeline')
export class TimelineController {
  constructor(private readonly timelineService: TimelineService) {}

  // Routes implemented in Phase 4
}
