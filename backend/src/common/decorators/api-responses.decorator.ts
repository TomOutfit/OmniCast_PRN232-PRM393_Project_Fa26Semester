// ============================================================
// OmniCast - Standard Swagger API Response Decorators
// ============================================================

import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiResponseDto, ApiErrorResponseDto } from '../dto/api-response.dto';

interface StandardResponseOptions {
  status?: number;
  description?: string;
  type?: Type<any> | [Type<any>] | string;
  isArray?: boolean;
}

/**
 * Standard Success Response Decorator
 * Wraps Swagger schema into the OmniCast standard envelope: { success, statusCode, data, meta, timestamp }
 */
export function ApiStandardResponse(options: StandardResponseOptions = {}) {
  const { status = 200, description = 'Operation completed successfully', type, isArray = false } = options;

  let dataSchema: any = { type: 'object' };
  if (type) {
    if (typeof type === 'string') {
      dataSchema = { type };
    } else if (Array.isArray(type)) {
      dataSchema = {
        type: 'array',
        items: { $ref: getSchemaPath(type[0]) },
      };
    } else {
      dataSchema = isArray
        ? { type: 'array', items: { $ref: getSchemaPath(type) } }
        : { $ref: getSchemaPath(type) };
    }
  }

  return applyDecorators(
    ApiResponse({
      status,
      description,
      schema: {
        allOf: [
          { $ref: getSchemaPath(ApiResponseDto) },
          {
            properties: {
              statusCode: { type: 'number', example: status },
              data: dataSchema,
            },
          },
        ],
      },
    }),
  );
}

/**
 * Comprehensive Standard Error Response Decorator
 * Automatically documents 400, 401, 403, 404, 409, 429, 500 status codes.
 */
export function ApiStandardErrorResponses(options: {
  include401?: boolean;
  include403?: boolean;
  include404?: boolean;
  include409?: boolean;
} = {}) {
  const {
    include401 = true,
    include403 = true,
    include404 = true,
    include409 = false,
  } = options;

  const decorators = [
    ApiResponse({
      status: 400,
      description: '400 Bad Request — Malformed request body, parameter format, or validation failure.',
      type: ApiErrorResponseDto,
    }),
    ApiResponse({
      status: 429,
      description: '429 Too Many Requests — Throttled by OmniCast Rate Limiting policy (100 req/min).',
      type: ApiErrorResponseDto,
    }),
    ApiResponse({
      status: 500,
      description: '500 Internal Server Error — Unhandled server error captured in clean JSON envelope.',
      type: ApiErrorResponseDto,
    }),
  ];

  if (include401) {
    decorators.push(
      ApiResponse({
        status: 401,
        description: '401 Unauthorized — Missing, expired, or invalid JWT Bearer token.',
        type: ApiErrorResponseDto,
      }),
    );
  }

  if (include403) {
    decorators.push(
      ApiResponse({
        status: 403,
        description: '403 Forbidden — Authenticated user lacks required role (STAFF / ADMIN) or ownership privileges.',
        type: ApiErrorResponseDto,
      }),
    );
  }

  if (include404) {
    decorators.push(
      ApiResponse({
        status: 404,
        description: '404 Not Found — The target resource (Channel, Event, Recording, Comment, User) was not found.',
        type: ApiErrorResponseDto,
      }),
    );
  }

  if (include409) {
    decorators.push(
      ApiResponse({
        status: 409,
        description: '409 Conflict — Unique constraint duplicate key violation or broadcasting schedule overlap.',
        type: ApiErrorResponseDto,
      }),
    );
  }

  return applyDecorators(...decorators);
}
