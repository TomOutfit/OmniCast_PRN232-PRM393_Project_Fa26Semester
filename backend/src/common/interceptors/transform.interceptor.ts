// ============================================================
// OmniCast - Transform Response Interceptor
// ============================================================

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Global BigInt JSON serialization support
if (typeof (BigInt.prototype as any).toJSON !== 'function') {
  (BigInt.prototype as any).toJSON = function () {
    const int = Number.parseInt(this.toString(), 10);
    return Number.isSafeInteger(int) ? int : this.toString();
  };
}

function sanitizeBigInt(data: any): any {
  if (data === null || data === undefined) return data;
  if (typeof data === 'bigint') {
    const int = Number.parseInt(data.toString(), 10);
    return Number.isSafeInteger(int) ? int : data.toString();
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeBigInt);
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeBigInt(value);
    }
    return sanitized;
  }
  return data;
}

export interface Response<T> {
  success: boolean;
  data: T;
  meta?: any;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    return next.handle().pipe(
      map((data) => {
        const cleanedData = sanitizeBigInt(data);

        // If data already has our wrapper format, return as-is
        if (cleanedData && 'success' in cleanedData) {
          return cleanedData;
        }

        // Check if data has pagination meta
        const hasMeta =
          cleanedData && typeof cleanedData === 'object' && 'meta' in cleanedData;

        return {
          success: true,
          data: hasMeta ? cleanedData.data : cleanedData,
          ...(hasMeta && { meta: cleanedData.meta }),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
