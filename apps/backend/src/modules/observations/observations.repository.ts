import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * ObservationsRepository
 *
 * Prisma queries for the Observation model.
 */
@Injectable()
export class ObservationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Implemented in Phase 4
}
