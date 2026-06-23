import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * MetricsRepository
 *
 * Prisma queries for MetricSnapshot model.
 */
@Injectable()
export class MetricsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // Implemented in Phase 3
}
