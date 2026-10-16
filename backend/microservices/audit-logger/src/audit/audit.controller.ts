// ============================================================
// OmniCast - Audit Logger gRPC Microservice: AuditController
// ============================================================

import { Controller } from '@nestjs/common';
import { GrpcMethod, GrpcStreamMethod } from '@nestjs/microservices';
import { Observable } from 'rxjs';
import { AuditService, AuditEntryPayload } from './audit.service';

interface WriteRequest {
  entry?: AuditEntryPayload;
}

interface WriteResponse {
  id: string;
  deduplicated: boolean;
}

interface StreamRequest {
  entityTypes?: string[];
  userId?: string;
}

interface StreamResponse {
  entry: AuditEntryPayload;
}

@Controller()
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @GrpcMethod('AuditLogger', 'Write')
  async write(req: WriteRequest): Promise<WriteResponse> {
    if (!req?.entry) {
      throw new Error('WriteRequest.entry is required');
    }
    const { id, deduplicated } = await this.auditService.write(req.entry);
    return { id, deduplicated };
  }

  @GrpcStreamMethod('AuditLogger', 'Stream')
  stream(req: StreamRequest): Observable<StreamResponse> {
    // Server-side filtering: only emit entries matching the supplied
    // `entityTypes` and/or `userId` filters. Empty filters → no
    // filter applied (every entry passes through).
    const typesSet = new Set(req.entityTypes ?? []);
    const userFilter = req.userId ?? null;

    return new Observable((subscriber) => {
      const sub = this.auditService.stream().subscribe({
        next: (entry) => {
          if (typesSet.size > 0 && !typesSet.has(entry.entityType ?? '')) return;
          if (userFilter && entry.userId !== userFilter) return;
          subscriber.next({ entry });
        },
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete(),
      });
      return () => sub.unsubscribe();
    });
  }
}
