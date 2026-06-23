import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';

/**
 * PostgresHealthIndicator checks that the application can reach PostgreSQL.
 *
 * Uses a lightweight SELECT 1 query through the existing PrismaService
 * connection pool -- no new connections are created per health check.
 */
@Injectable()
export class PostgresHealthIndicator {
  private readonly logger = new Logger(PostgresHealthIndicator.name);

  constructor(private readonly prisma: PrismaService) {}

  async isHealthy(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.warn('PostgreSQL health check failed', { error });
      return false;
    }
  }
}
