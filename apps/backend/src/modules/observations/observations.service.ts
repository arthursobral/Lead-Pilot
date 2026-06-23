import { Injectable } from '@nestjs/common';
import { ObservationsRepository } from './observations.repository';

/**
 * ObservationsService
 *
 * Responsibilities (Phase 4):
 *   - Create, list, delete observations
 *   - Validate observation types and severity (ACHIEVEMENT, CONCERN, etc.)
 *   - Trigger timeline update after new observation is saved
 */
@Injectable()
export class ObservationsService {
  constructor(private readonly observationsRepository: ObservationsRepository) {}

  // Implemented in Phase 4
}
