// ============================================================
// OmniCast - Standardized API Response & Error DTOs
// ============================================================

import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 1, description: 'Current page number' })
  page: number;

  @ApiProperty({ example: 20, description: 'Items per page limit' })
  limit: number;

  @ApiProperty({ example: 150, description: 'Total available records' })
  total: number;

  @ApiProperty({ example: 8, description: 'Total calculated pages' })
  totalPages: number;
}

export class ApiResponseDto<T = any> {
  @ApiProperty({ example: true, description: 'Operation success status flag' })
  success: boolean;

  @ApiProperty({ example: 200, description: 'HTTP Response status code' })
  statusCode: number;

  @ApiProperty({ example: 'Request completed successfully', description: 'Human-readable outcome message' })
  message?: string;

  @ApiProperty({ description: 'Payload data body' })
  data: T;

  @ApiProperty({ required: false, type: () => PaginationMetaDto, description: 'Pagination metadata for list endpoints' })
  meta?: PaginationMetaDto;

  @ApiProperty({ example: '2026-10-01T12:00:00.000Z', description: 'ISO 8601 server timestamp' })
  timestamp: string;
}

export class ApiErrorResponseDto {
  @ApiProperty({ example: false, description: 'Always false on errors' })
  success: boolean;

  @ApiProperty({ example: 400, description: 'HTTP Error status code (400, 401, 403, 404, 409, 422, 429, 500)' })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request', description: 'HTTP Error type title' })
  error: string;

  @ApiProperty({
    example: 'Validation failed for field "email": must be a valid email',
    description: 'Human-readable detailed error message or validation error array',
  })
  message: string | string[];

  @ApiProperty({
    required: false,
    example: { conflicts: [{ id: 'evt-123', scheduledAt: '2026-10-01T20:00:00Z' }] },
    description: 'Structured conflict or validation details when applicable',
  })
  details?: any;

  @ApiProperty({ example: '/api/v1/channels/vtv1', description: 'Originating request path' })
  path: string;

  @ApiProperty({ example: 'GET', description: 'HTTP request method' })
  method: string;

  @ApiProperty({ example: '2026-10-01T12:00:00.000Z', description: 'ISO 8601 error occurrence timestamp' })
  timestamp: string;
}
