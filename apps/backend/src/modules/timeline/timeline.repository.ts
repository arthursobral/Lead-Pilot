import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * TimelineRepository
 *
 * Prisma queries for the TimelineEntry model.
 */
@Injectable()
export class TimelineRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Implemented in Phase 4
}
