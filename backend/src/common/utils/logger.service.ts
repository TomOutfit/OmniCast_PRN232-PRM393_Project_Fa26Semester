// ============================================================
// OmniCast - Logger Service
// ============================================================

import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';

export class LoggerService implements NestLoggerService {
  log(message: string, context?: string) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${context ? `[${context}] ` : ''}${message}`);
  }

  error(message: string, trace?: string, context?: string) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${context ? `[${context}] ` : ''}${message}`);
    if (trace) {
      console.error(trace);
    }
  }

  warn(message: string, context?: string) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${context ? `[${context}] ` : ''}${message}`);
  }

  debug(message: string, context?: string) {
    const timestamp = new Date().toISOString();
    console.debug(`[${timestamp}] [DEBUG] ${context ? `[${context}] ` : ''}${message}`);
  }

  verbose(message: string, context?: string) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [VERBOSE] ${context ? `[${context}] ` : ''}${message}`);
  }
}
