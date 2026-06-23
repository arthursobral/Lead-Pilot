import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * PrismaService wraps PrismaClient and integrates with the NestJS lifecycle.
 *
 * - onModuleInit: opens the connection when the module loads.
 * - onModuleDestroy: gracefully closes the connection on shutdown.
 *
 * Registered as @Global() via DatabaseModule so it can be injected
 * into any repository without re-importing DatabaseModule everywhere.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to database...');
    await this.$connect();
    this.logger.log('Database connected.');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from database...');
    await this.$disconnect();
  }
}
