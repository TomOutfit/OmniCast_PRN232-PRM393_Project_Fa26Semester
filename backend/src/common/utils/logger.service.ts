// ============================================================
// OmniCast - Logger Service
// ============================================================
//
// Plain `console.*` wrapper that also redacts known secrets from
// any string it logs. WHY: when an exception bubbles up with a
// message that interpolates a config value (e.g.
// `throw new Error(\`Cloudinary misconfigured: ${cloudName}/${apiKey}\`)`),
// the stack trace printed by the global HttpExceptionFilter would
// otherwise land in the Vercel/Railway log stream with the raw
// secret attached. We scrub the message and trace at the
// logger-level so the contract is "what comes out of this logger
// is safe to ship to a third-party log sink".
//
// The redactor itself lives in `./redact.ts` so it can be
// imported by the test harness without pulling in NestJS DI.

import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { redactSecrets } from './redact';

@Injectable()
export class LoggerService implements NestLoggerService {
  log(message: string, context?: string) {
    this.write('INFO', redactSecrets(message), undefined, context);
  }

  error(message: string, trace?: string, context?: string) {
    this.write(
      'ERROR',
      redactSecrets(message),
      trace ? redactSecrets(trace) : undefined,
      context,
    );
  }

  warn(message: string, context?: string) {
    this.write('WARN', redactSecrets(message), undefined, context);
  }

  debug(message: string, context?: string) {
    this.write('DEBUG', redactSecrets(message), undefined, context);
  }

  verbose(message: string, context?: string) {
    this.write('VERBOSE', redactSecrets(message), undefined, context);
  }

  // ============================================================
  // Internals
  // ============================================================

  private write(
    level: string,
    message: string,
    trace: string | undefined,
    context: string | undefined,
  ) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] ${context ? `[${context}] ` : ''}`;
    if (level === 'ERROR') {
      console.error(prefix + message);
      if (trace) console.error(trace);
      return;
    }
    if (level === 'WARN') {
      console.warn(prefix + message);
      return;
    }
    if (level === 'DEBUG') {
      console.debug(prefix + message);
      return;
    }
    console.log(prefix + message);
  }

  /**
   * Re-exported for callers that already hold a `LoggerService`
   * instance (e.g. the global HttpExceptionFilter). Same behaviour
   * as the standalone `redactSecrets` helper.
   */
  static redactSecrets(input: string | undefined | null): string {
    return redactSecrets(input);
  }
}
