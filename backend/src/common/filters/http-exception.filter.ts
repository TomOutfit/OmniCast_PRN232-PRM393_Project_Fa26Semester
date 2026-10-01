// ============================================================
// OmniCast - HTTP Exception Filter
// ============================================================

import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  success: boolean;
  statusCode: number;
  error: string;
  message: string | string[];
  details?: any;
  path: string;
  method: string;
  timestamp: string;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'An internal server error occurred';
    let error = 'Internal Server Error';
    let details: any = undefined;

    // 1. NestJS Standard HTTP Exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as any;
        message = resp.message || exception.message;
        error = resp.error || this.getHttpStatusText(status);
        details = resp.details || resp.conflicts || resp.errors;
      } else {
        message = exceptionResponse as string;
        error = this.getHttpStatusText(status);
      }
    }
    // 2. Prisma Database Known Request Errors (P2002, P2025, P2003, etc.)
    else if (
      exception &&
      typeof exception === 'object' &&
      'code' in exception &&
      typeof (exception as any).code === 'string' &&
      (exception as any).code.startsWith('P')
    ) {
      const prismaError = exception as any;
      switch (prismaError.code) {
        case 'P2002': {
          status = HttpStatus.CONFLICT;
          error = 'Conflict';
          const fields = Array.isArray(prismaError.meta?.target)
            ? prismaError.meta.target.join(', ')
            : prismaError.meta?.target || 'field';
          message = `Unique constraint violation: duplicate value on (${fields})`;
          details = { target: prismaError.meta?.target };
          break;
        }
        case 'P2025': {
          status = HttpStatus.NOT_FOUND;
          error = 'Not Found';
          message = prismaError.meta?.cause || 'The requested resource was not found';
          break;
        }
        case 'P2003': {
          status = HttpStatus.BAD_REQUEST;
          error = 'Bad Request';
          message = `Foreign key constraint failed on field: ${prismaError.meta?.field_name || 'relation'}`;
          details = prismaError.meta;
          break;
        }
        case 'P2014': {
          status = HttpStatus.BAD_REQUEST;
          error = 'Bad Request';
          message = 'The relation change violates required database constraints';
          break;
        }
        default: {
          status = HttpStatus.BAD_REQUEST;
          error = 'Database Request Error';
          message = prismaError.message?.split('\n').pop() || 'Invalid database operation';
          break;
        }
      }
    }
    // 3. Prisma Schema / Query Validation Error
    else if (
      exception &&
      typeof exception === 'object' &&
      (exception as any).name === 'PrismaClientValidationError'
    ) {
      status = HttpStatus.BAD_REQUEST;
      error = 'Bad Request';
      message = 'Invalid database query parameters or payload structure';
    }
    // 4. Generic JavaScript Errors
    else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name || 'Error';
    }

    const errorResponse: ErrorResponse = {
      success: false,
      statusCode: status,
      error,
      message,
      ...(details !== undefined && { details }),
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    };

    // Logging
    if (status >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${status} (${error})`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${status} (${error}): ${Array.isArray(message) ? message.join('; ') : message}`,
      );
    }

    response.status(status).json(errorResponse);
  }

  private getHttpStatusText(status: number): string {
    switch (status) {
      case 400: return 'Bad Request';
      case 401: return 'Unauthorized';
      case 403: return 'Forbidden';
      case 404: return 'Not Found';
      case 409: return 'Conflict';
      case 422: return 'Unprocessable Entity';
      case 429: return 'Too Many Requests';
      case 500: return 'Internal Server Error';
      case 502: return 'Bad Gateway';
      case 503: return 'Service Unavailable';
      case 504: return 'Gateway Timeout';
      default: return 'HTTP Error';
    }
  }
}
