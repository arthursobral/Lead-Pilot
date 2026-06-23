import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * ReportsRepository
 *
 * Prisma queries for the WeeklyReport model.
 */
@Injectable()
export class ReportsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Implemented in Phase 7
}
