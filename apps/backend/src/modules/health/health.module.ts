import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { PostgresHealthIndicator } from './indicators/postgres.health-indicator';
import { RedisHealthIndicator } from './indicators/redis.health-indicator';

/**
 * HealthModule provides GET /health.
 *
 * DatabaseModule is @Global() so PrismaService is available without
 * a local import. ConfigService is available because ConfigModule is
 * also registered as global in AppModule.
 *
 * Nothing is exported -- other modules have no reason to depend on
 * health indicators.
 */
@Module({
  controllers: [HealthController],
  providers: [HealthService, PostgresHealthIndicator, RedisHealthIndicator],
})
export class HealthModule {}
