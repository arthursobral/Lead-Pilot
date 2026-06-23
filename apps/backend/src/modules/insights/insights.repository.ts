import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * InsightsRepository
 *
 * Prisma queries for Insight and TalkingPoint models.
 */
@Injectable()
export class InsightsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Implemented in Phase 5
}
