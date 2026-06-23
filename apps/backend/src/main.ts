import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  /**
   * Global prefix — all routes are under /api.
   * Keeps the API namespace clean and predictable when fronted by a proxy.
   */
  app.setGlobalPrefix('api');

  /**
   * Helmet — sets secure HTTP headers.
   * Applied before any other middleware.
   */
  app.use(helmet());

  /**
   * CORS — only the frontend origin is allowed.
   * Tightened further in production via environment config.
   */
  app.enableCors({
    // WEB_URL is validated by Joi at startup (default: http://localhost:3000).
    // Reading from process.env here is intentional — ConfigService is not
    // available before the Nest app is created, and Joi has already ensured
    // the value is a valid URI.
    origin: process.env.WEB_URL ?? 'http://localhost:3000',
    credentials: true,
  });

  /**
   * Global ValidationPipe.
   *
   * whitelist: strips unknown properties from DTOs — protects against
   *   clients sending unexpected fields that bypass validation.
   * forbidNonWhitelisted: rejects requests with unknown fields outright
   *   rather than silently stripping them.
   * transform: auto-converts primitives (e.g. string → number for @Type).
   */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  /**
   * Global exception filter — consistent error response shape.
   * Internal errors are logged but never exposed to the client.
   */
  app.useGlobalFilters(new HttpExceptionFilter());

  /**
   * Global logging interceptor — logs METHOD /path — Xms for every request.
   */
  app.useGlobalInterceptors(new LoggingInterceptor());

  /**
   * Graceful shutdown — listens for SIGTERM/SIGINT so BullMQ workers
   * and Prisma connections are closed cleanly before the process exits.
   */
  app.enableShutdownHooks();

  const port = process.env.API_PORT ?? 3001;
  await app.listen(port);

  logger.log(`LeadPilot API running on http://localhost:${port}/api`);
}

bootstrap();
