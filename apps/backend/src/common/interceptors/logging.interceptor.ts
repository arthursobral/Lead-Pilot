import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, tap } from 'rxjs';

/**
 * Logging interceptor.
 *
 * Logs every incoming request and its response time.
 * Registered globally in main.ts via app.useGlobalInterceptors().
 *
 * Format: METHOD /path — Xms
 *
 * Kept intentionally minimal — we log method, path, and duration.
 * Never log request bodies (may contain sensitive data).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        this.logger.log(`${method} ${url} — ${duration}ms`);
      }),
    );
  }
}
