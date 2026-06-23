import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * RedisHealthIndicator checks that the application can reach Redis.
 *
 * Maintains a single persistent ioredis connection separate from the BullMQ
 * connection pool -- health checks should not compete with job queue I/O.
 *
 * lazyConnect: true means the TCP handshake is deferred until the first
 * ping(), so a Redis outage at startup does not crash the process. The app
 * boots, serves traffic, and reports Redis as unhealthy until it recovers.
 */
@Injectable()
export class RedisHealthIndicator implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisHealthIndicator.name);
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const redisUrl = this.configService.get<string>('redis.url');
    if (!redisUrl) throw new Error('REDIS_URL is not configured');
    this.client = new Redis(redisUrl, {
      lazyConnect: true,
      // Suppress ioredis's default reconnect noise in health-check context.
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    });

    this.client.on('error', (err: Error) => {
      // Log at debug level -- health endpoint will surface this to callers.
      this.logger.debug(`Redis health client error: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => {
      // Ignore quit errors during shutdown.
    });
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      this.logger.warn('Redis health check failed', { error });
      return false;
    }
  }
}
