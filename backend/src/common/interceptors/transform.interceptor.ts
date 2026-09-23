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
        // If data already has our wrapper format, return as-is
        if (data && 'success' in data) {
          return data;
        }

        // Check if data has pagination meta
        const hasMeta =
          data && typeof data === 'object' && 'meta' in data;

        return {
          success: true,
          data: hasMeta ? data.data : data,
          ...(hasMeta && { meta: data.meta }),
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
