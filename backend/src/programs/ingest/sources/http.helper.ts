// ============================================================
// OmniCast - External HTTP Helper
// Tiny wrapper around axios with retries, exponential backoff,
// and graceful error handling for upstream APIs that occasionally
// time out (TMDB, NewsAPI, etc. all have bursty behavior).
// ============================================================

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface HttpHelperOptions {
  baseURL?: string;
  defaultHeaders?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
  backoffMs?: number;
}

export class HttpHelper {
  private readonly http: AxiosInstance;
  private readonly retries: number;
  private readonly backoffMs: number;

  constructor(opts: HttpHelperOptions = {}) {
    this.http = axios.create({
      baseURL: opts.baseURL,
      timeout: opts.timeoutMs ?? 12_000,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'OmniCast-Ingest/1.0 (+https://omnicast.tv)',
        ...opts.defaultHeaders,
      },
    });
    this.retries = opts.retries ?? 2;
    this.backoffMs = opts.backoffMs ?? 500;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.withRetry(() => this.http.get<T>(url, config).then((r) => r.data));
  }

  async getText(url: string, config?: AxiosRequestConfig): Promise<string> {
    return this.withRetry(() =>
      this.http.get<string>(url, { ...config, responseType: 'text' }).then((r) => r.data),
    );
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= this.retries; attempt += 1) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (attempt < this.retries) {
          const wait = this.backoffMs * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, wait));
        }
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }
}
