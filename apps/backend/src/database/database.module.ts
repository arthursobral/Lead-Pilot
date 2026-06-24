import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * DatabaseModule is marked @Global() so PrismaService is available
 * for injection in every module without needing to import DatabaseModule explicitly.
 *
 * This is appropriate because every repository depends on Prisma -
 * requiring each module to re-import it would be boilerplate with no benefit.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
