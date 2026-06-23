import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SharedBullConfigurationFactory } from '@nestjs/bullmq';
import type { QueueOptions } from 'bullmq';

/**
 * Shared BullMQ configuration factory.
 *
 * Used by BullModule.forRootAsync() in AppModule.
 * All queues share a single Redis connection defined here
 * rather than each queue opening its own connection.
 *
 * Connection: parses REDIS_URL to extract host, port, password, username,
 * and TLS (rediss:// protocol). Using new URL() ensures credentials and
 * TLS options are never silently dropped.
 *
 * Retry strategy: exponential backoff, max 3 attempts.
 * Jobs that fail beyond that move to the failed set for inspection.
 */
@Injectable()
export class BullConfigService implements SharedBullConfigurationFactory {
  constructor(private readonly configService: ConfigService) {}

  createSharedConfiguration(): QueueOptions {
    const redisUrl = this.configService.get<string>('redis.url') as string;
    const url = new URL(redisUrl);

    return {
      connection: {
        host: url.hostname,
        port: parseInt(url.port || '6379', 10),
        // Decode percent-encoded characters that may appear in passwords.
        ...(url.password && { password: decodeURIComponent(url.password) }),
        ...(url.username && { username: decodeURIComponent(url.username) }),
        // rediss:// protocol signals TLS -- pass an empty tls object so
        // ioredis enables TLS with default settings (inherits system certs).
        ...(url.protocol === 'rediss:' && { tls: {} }),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      },
    };
  }
}
