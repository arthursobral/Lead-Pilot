import { Injectable } from '@nestjs/common';
import { PostgresHealthIndicator } from './indicators/postgres.health-indicator';
import { RedisHealthIndicator } from './indicators/redis.health-indicator';

export interface HealthResult {
  status: 'ok' | 'error';
  postgres: boolean;
  redis: boolean;
}

/**
 * HealthService orchestrates all health indicators and assembles
 * the response shape expected by GET /health.
 *
 * Checks run in parallel -- a slow database does not delay the Redis check.
 * Each indicator catches its own errors internally and returns a boolean,
 * so a single failure never prevents the others from reporting.
 *
 * status is 'ok' only when every indicator is healthy.
 */
@Injectable()
export class HealthService {
  constructor(
    private readonly postgresIndicator: PostgresHealthIndicator,
    private readonly redisIndicator: RedisHealthIndicator,
  ) {}

  async check(): Promise<HealthResult> {
    const [postgres, redis] = await Promise.all([
      this.postgresIndicator.isHealthy(),
      this.redisIndicator.isHealthy(),
    ]);

    return {
      status: postgres && redis ? 'ok' : 'error',
      postgres,
      redis,
    };
  }
}
