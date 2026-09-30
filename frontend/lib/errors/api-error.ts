// ============================================================
// OmniCast - Centralized API Error Handling
// Every page that calls `apiClient` should use `parseApiError`
// instead of hand-rolling `error?.response?.data?.message`.
// ============================================================

import type { AxiosError } from 'axios';
import { ApiResponse } from '@/types';

/** Common error codes we want to detect from the backend. */
export type ApiErrorCode =
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'VALIDATION'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'UNKNOWN';

export class ApiError extends Error {
  readonly status: number | null;
  readonly code: ApiErrorCode;
  readonly fieldErrors: Record<string, string[]>;
  readonly rawMessage: string | null;
  readonly timestamp: string;

  constructor(args: {
    message: string;
    status: number | null;
    code: ApiErrorCode;
    fieldErrors?: Record<string, string[]>;
    rawMessage?: string | null;
  }) {
    super(args.message);
    this.name = 'ApiError';
    this.status = args.status;
    this.code = args.code;
    this.fieldErrors = args.fieldErrors ?? {};
    this.rawMessage = args.rawMessage ?? null;
    this.timestamp = new Date().toISOString();
  }

  /** Returns the field-level error for the given form field, if any. */
  fieldError(field: string): string | undefined {
    return this.fieldErrors[field]?.[0];
  }

  /** Pretty display message (single line, friendly). */
  displayMessage(): string {
    return this.message;
  }
}

/**
 * Map an HTTP status code to a coarse error code.
 */
function mapStatusToCode(status: number | undefined): ApiErrorCode {
  if (status === undefined || status === null) return 'UNKNOWN';
  if (status === 0) return 'NETWORK_ERROR';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 422) return 'VALIDATION';
  if (status === 429) return 'RATE_LIMITED';
  if (status >= 500) return 'SERVER_ERROR';
  if (status >= 400) return 'VALIDATION';
  return 'UNKNOWN';
}

/**
 * Translate a NestJS / class-validator errors payload into a
 * `{ fieldName: string[] }` map that React Hook Form can consume.
 *
 * NestJS format:
 *   { message: ['email must be an email'], error: 'Bad Request', statusCode: 400 }
 *
 * class-validator format:
 *   { message: { email: ['email is required'] }, error: 'Bad Request', statusCode: 400 }
 */
function extractFieldErrors(payload: unknown): Record<string, string[]> {
  if (!payload || typeof payload !== 'object') return {};
  const out: Record<string, string[]> = {};

  const root = payload as Record<string, unknown>;
  const msg = root.message;

  // class-validator object form: { email: ['msg1', 'msg2'], password: ['msg'] }
  if (msg && typeof msg === 'object' && !Array.isArray(msg)) {
    for (const [key, value] of Object.entries(msg as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        out[key] = value.map(String);
      } else if (typeof value === 'string') {
        out[key] = [value];
      }
    }
    return out;
  }

  // Array form: ['msg1', 'msg2'] → attach to `_form`
  if (Array.isArray(msg)) {
    out._form = msg.map(String);
    return out;
  }

  if (typeof msg === 'string' && msg.length > 0) {
    out._form = [msg];
  }

  return out;
}

/**
 * Convert a single user-facing message, handling arrays and undefined.
 */
function singleMessage(messages: string[] | undefined, fallback: string): string {
  if (!messages || messages.length === 0) return fallback;
  return messages.join(', ');
}

/**
 * The friendly default fallback per code.
 */
const FRIENDLY_FALLBACK: Record<ApiErrorCode, string> = {
  NETWORK_ERROR: 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.',
  TIMEOUT: 'Yêu cầu quá thời gian. Vui lòng thử lại.',
  UNAUTHORIZED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  FORBIDDEN: 'Bạn không có quyền thực hiện hành động này.',
  NOT_FOUND: 'Không tìm thấy tài nguyên yêu cầu.',
  CONFLICT: 'Xung đột dữ liệu. Vui lòng tải lại trang.',
  VALIDATION: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra các trường.',
  RATE_LIMITED: 'Bạn đang gửi quá nhiều yêu cầu. Vui lòng thử lại sau.',
  SERVER_ERROR: 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.',
  UNKNOWN: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
};

/**
 * Parse any thrown value into an `ApiError`.
 * - AxiosError with a backend response → status + field errors
 * - AxiosError with no response (network / timeout) → NETWORK_ERROR / TIMEOUT
 * - Zod errors and plain Errors → passed through with message
 * - Anything else → UNKNOWN with a generic message
 */
export function parseApiError(err: unknown): ApiError {
  // Already wrapped
  if (err instanceof ApiError) return err;

  // Axios-style error with response (covers NestJS & class-validator)
  if (err && typeof err === 'object' && 'isAxiosError' in err) {
    const ax = err as AxiosError<ApiResponse<unknown> & Record<string, unknown>>;
    const status = ax.response?.status;
    const code = mapStatusToCode(status);

    // No response at all → network failure or timeout
    if (!ax.response) {
      if (ax.code === 'ECONNABORTED') {
        return new ApiError({
          message: FRIENDLY_FALLBACK.TIMEOUT,
          status: null,
          code: 'TIMEOUT',
        });
      }
      return new ApiError({
        message: FRIENDLY_FALLBACK.NETWORK_ERROR,
        status: null,
        code: 'NETWORK_ERROR',
      });
    }

    const payload = ax.response.data;
    const fieldErrors = extractFieldErrors(payload);

    // Prefer a field-level error if available, otherwise use the top-level
    // `_form` list, otherwise fall back to the friendly message.
    const topLevel =
      fieldErrors._form ?? (typeof payload?.message === 'string' ? [payload.message] : []);
    const message = singleMessage(topLevel, FRIENDLY_FALLBACK[code]);

    return new ApiError({
      message,
      status: status ?? null,
      code,
      fieldErrors,
      rawMessage: topLevel.join(' | ') || null,
    });
  }

  // Plain Error / anything else
  if (err instanceof Error) {
    return new ApiError({
      message: err.message || FRIENDLY_FALLBACK.UNKNOWN,
      status: null,
      code: 'UNKNOWN',
    });
  }

  return new ApiError({
    message: FRIENDLY_FALLBACK.UNKNOWN,
    status: null,
    code: 'UNKNOWN',
  });
}

/**
 * Convenience: extract a user-friendly message from an unknown thrown value.
 * Equivalent to `parseApiError(err).displayMessage()`.
 */
export function errorMessage(err: unknown, fallback?: string): string {
  const api = parseApiError(err);
  return fallback && api.code === 'UNKNOWN' ? fallback : api.message;
}