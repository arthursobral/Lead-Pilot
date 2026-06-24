import { Controller } from '@nestjs/common';
import { ObservationsService } from './observations.service';

/**
 * ObservationsController
 *
 * Routes (Phase 4):
 *   POST /api/observations              - create observation for a developer
 *   GET  /api/developers/:id/observations - list observations for a developer
 *   DELETE /api/observations/:id         - delete an observation
 */
@Controller('observations')
export class ObservationsController {
  constructor(private readonly observationsService: ObservationsService) {}

  // Routes implemented in Phase 4
}
