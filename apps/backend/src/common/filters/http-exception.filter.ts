import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

interface ErrorResponse {
  statusCode: number;
  message: string;
  path: string;
  timestamp: string;
}

/**
 * Global HTTP exception filter.
 *
 * Catches every HttpException thrown in the application and returns
 * a consistent error shape. Internal errors (5xx) are logged but
 * their details are never exposed to the client.
 *
 * Registered globally in main.ts via app.useGlobalFilters().
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode = exception.getStatus();

    const isServerError = statusCode >= HttpStatus.INTERNAL_SERVER_ERROR;

    if (isServerError) {
      this.logger.error(
        `${request.method} ${request.url} — ${statusCode}`,
        exception.stack,
      );
    }

    const body: ErrorResponse = {
      statusCode,
      message: exception.message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(body);
  }
}
