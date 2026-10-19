/**
 * OmniCast - AI Curator streaming endpoint unit tests
 *
 * Verifies the SSE wire-format parser and the async generator that
 * consumes the streaming preview endpoint:
 *
 *   - `parseSseFrame` correctly handles single-line and multi-line
 *     frames, heartbeats, blank frames, malformed JSON, and
 *     unknown event names.
 *   - `analyzeContentStream` POSTs to the streaming endpoint with
 *     the right headers, splits the byte stream on `\n\n`
 *     boundaries, and surfaces 4xx/5xx as typed `error` events.
 *   - Aborting the request via `AbortSignal` produces a clean
 *     `error` event (not an unhandled rejection).
 *
 * The hook layer (`useAnalyzeContentStream`) is a thin state
 * machine on top of the generator — the generator is where the
 * non-trivial logic lives, so we test that exhaustively and trust
 * the hook to wire up `useState` correctly.
 *
 * We don't hit the real `/analyze-stream` endpoint — we install
 * a `fetch` mock that returns a `ReadableStream` of synthetic SSE
 * bytes. This keeps the test fast and deterministic.
 *
 * Run with: `npx vitest run lib/hooks/useAiCurator.stream.test.ts`
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseSseFrame } from '@/lib/api/ai-curator';

// ─── In-memory localStorage stub ─────────────────────────────────────
//
// The project's vitest config sets `environment: 'node'`, so the
// real `localStorage` global is missing. We polyfill it with a tiny
// in-memory map; the production code path reads from it on the
// server-side, so we don't lose coverage.
const _localStore = new Map<string, string>();
const _localStoragePolyfill = {
  getItem: (k: string) => (_localStore.has(k) ? _localStore.get(k)! : null),
  setItem: (k: string, v: string) => {
    _localStore.set(k, v);
  },
  removeItem: (k: string) => {
    _localStore.delete(k);
  },
  clear: () => _localStore.clear(),
  key: (i: number) => Array.from(_localStore.keys())[i] ?? null,
  get length() {
    return _localStore.size;
  },
};
(globalThis as any).localStorage = _localStoragePolyfill;

// ─── parseSseFrame: low-level SSE parser ─────────────────────────────

describe('parseSseFrame', () => {
  it('parses a single-line meta event', () => {
    const frame = `event: meta\ndata: {"type":"started","promptVersion":"v4.0.0","model":"gpt-4o","startedAt":"2026-10-19T00:00:00.000Z"}`;
    const result = parseSseFrame(frame);
    expect(result).toEqual({
      event: 'meta',
      data: {
        type: 'started',
        promptVersion: 'v4.0.0',
        model: 'gpt-4o',
        startedAt: '2026-10-19T00:00:00.000Z',
      },
    });
  });

  it('parses a delta event', () => {
    const frame = `event: delta\ndata: {"text":"{\\"sentiment\\":"}`;
    expect(parseSseFrame(frame)).toEqual({
      event: 'delta',
      data: { text: '{"sentiment":' },
    });
  });

  it('parses a complete event with full report payload', () => {
    const frame = [
      'event: complete',
      'data: {"type":"complete","report":{"broadcastSuitability":"PRIME_TIME","suggestedTimeSlot":"21:00 - 23:00"},"processingTimeMs":1340,"confidence":87,"openaiRetries":1}',
    ].join('\n');
    const result = parseSseFrame(frame);
    expect(result?.event).toBe('complete');
    if (result?.event !== 'complete') throw new Error('type guard');
    expect(result.data.processingTimeMs).toBe(1340);
    expect(result.data.confidence).toBe(87);
    expect(result.data.openaiRetries).toBe(1);
  });

  it('parses an error event', () => {
    const frame = `event: error\ndata: {"type":"openai-connection-failed","message":"network blip","retryable":true}`;
    const result = parseSseFrame(frame);
    expect(result).toEqual({
      event: 'error',
      data: {
        type: 'openai-connection-failed',
        message: 'network blip',
        retryable: true,
      },
    });
  });

  it('returns null for an empty frame', () => {
    expect(parseSseFrame('')).toBeNull();
  });

  it('returns null for a heartbeat / comment-only frame', () => {
    expect(parseSseFrame(': heartbeat 2026-10-19T00:00:00.000Z')).toBeNull();
  });

  it('returns null when the data line is not valid JSON', () => {
    const frame = `event: delta\ndata: {not json}`;
    expect(parseSseFrame(frame)).toBeNull();
  });

  it('returns null for unknown event names', () => {
    const frame = `event: pingpong\ndata: {"foo":"bar"}`;
    expect(parseSseFrame(frame)).toBeNull();
  });

  it('strips a leading space after the colon (per the SSE spec)', () => {
    const frame = `event: meta\ndata:    {"type":"started"}`;
    const result = parseSseFrame(frame);
    expect(result?.event).toBe('meta');
  });

  it('handles multi-line data values by joining with \\n (only when JSON parses)', () => {
    // Multi-line data is legal per the SSE spec but our pipeline
    // always serialises one JSON object per event, so a multi-line
    // frame never matches a real event. The parser returns null
    // because the joined payload fails JSON.parse.
    const frame = `event: meta\ndata: line1\ndata: line2`;
    expect(parseSseFrame(frame)).toBeNull();
  });

  it('tolerates \\r\\n line endings (some proxies add them)', () => {
    const frame = 'event: delta\r\ndata: {"text":"x"}\r\n';
    const result = parseSseFrame(frame);
    expect(result).toEqual({ event: 'delta', data: { text: 'x' } });
  });
});

// ─── Test helper: a fake SSE ReadableStream ──────────────────────────

class FakeSseStream {
  private chunks: Uint8Array[] = [];
  private readers: Array<{
    resolve: (r: IteratorResult<Uint8Array>) => void;
    reject: (err: unknown) => void;
  }> = [];
  public closed = false;

  enqueue(text: string) {
    if (this.closed) throw new Error('stream already closed');
    const bytes = new TextEncoder().encode(text);
    if (this.readers.length > 0) {
      const r = this.readers.shift()!;
      r.resolve({ value: bytes, done: false });
    } else {
      this.chunks.push(bytes);
    }
  }

  close() {
    this.closed = true;
    while (this.readers.length > 0) {
      const r = this.readers.shift()!;
      r.resolve({ value: undefined, done: true });
    }
  }

  rejectAll(err: unknown) {
    while (this.readers.length > 0) {
      const r = this.readers.shift()!;
      r.reject(err);
    }
  }

  getReader(): ReadableStreamDefaultReader<Uint8Array> {
    const stream = this;
    return {
      read(): Promise<IteratorResult<Uint8Array>> {
        return new Promise((resolve, reject) => {
          if (stream.chunks.length > 0) {
            resolve({ value: stream.chunks.shift()!, done: false });
          } else if (stream.closed) {
            resolve({ value: undefined, done: true });
          } else {
            stream.readers.push({ resolve, reject });
          }
        });
      },
      releaseLock() {
        /* no-op */
      },
      cancel() {
        return Promise.resolve();
      },
      closed: Promise.resolve(undefined),
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;
  }
}

function makeFakeResponse(stream: FakeSseStream, ok = true) {
  return {
    ok,
    status: ok ? 200 : 502,
    statusText: ok ? 'OK' : 'Bad Gateway',
    body: {
      getReader: () => stream.getReader(),
    },
    text: async () => (ok ? '' : 'upstream failure'),
  };
}

// ─── analyzeContentStream: async generator over SSE bytes ────────────

const originalFetch = globalThis.fetch;

let lastFetchInit: RequestInit | undefined;
let fetchResponse: any = makeFakeResponse(new FakeSseStream());
let fetchImpl: any;

function installFetch() {
  const mock = vi.fn(async (_url: string, init?: RequestInit) => {
    lastFetchInit = init;
    return fetchResponse;
  });
  fetchImpl = mock as unknown as typeof fetch;
  Object.defineProperty(globalThis, 'fetch', {
    value: mock,
    writable: true,
    configurable: true,
  });
}

beforeEach(() => {
  lastFetchInit = undefined;
  installFetch();
});

afterEach(() => {
  (globalThis as { fetch: typeof fetch }).fetch = originalFetch;
  vi.restoreAllMocks();
});

async function collectEvents(
  iter: AsyncGenerator<any, void, void>,
): Promise<any[]> {
  const out: any[] = [];
  for await (const evt of iter) {
    out.push(evt);
  }
  return out;
}

describe('analyzeContentStream', () => {
  it('POSTs to /ai-curator/analyze-stream with JSON body + bearer token', async () => {
    // The implementation falls back to `localStorage.getItem` only
    // when `typeof window !== 'undefined'`. In a node test env we
    // therefore pass the token explicitly via `options.token`.
    const stream = new FakeSseStream();
    fetchResponse = makeFakeResponse(stream);

    const { analyzeContentStream } = await import('@/lib/api/ai-curator');
    const iter = analyzeContentStream(
      {
        title: 'Chung kết World Cup 2026',
        description: 'Trận đấu đỉnh cao',
        channelName: 'VTV3',
        category: 'SPORTS',
      },
      { token: 'jwt-abc-123' },
    );
    stream.close();
    await collectEvents(iter);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchImpl as any).mock.calls[0];
    expect(url).toContain('/ai-curator/analyze-stream');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers['Authorization']).toBe('Bearer jwt-abc-123');
    expect(init.body).toBe(
      JSON.stringify({
        title: 'Chung kết World Cup 2026',
        description: 'Trận đấu đỉnh cao',
        channelName: 'VTV3',
        category: 'SPORTS',
      }),
    );
    expect(init.headers['Accept']).toBe('text/event-stream');
  });

  it('omits Authorization header when no token is present', async () => {
    localStorage.removeItem('accessToken');
    const stream = new FakeSseStream();
    fetchResponse = makeFakeResponse(stream);

    const { analyzeContentStream } = await import('@/lib/api/ai-curator');
    const iter = analyzeContentStream({ title: 'Test' });
    stream.close();
    await collectEvents(iter);

    const init = (fetchImpl as any).mock.calls[0][1];
    expect(init.headers['Authorization']).toBeUndefined();
  });

  it('parses a complete happy-path stream: meta → deltas → complete', async () => {
    const stream = new FakeSseStream();
    fetchResponse = makeFakeResponse(stream);

    const { analyzeContentStream } = await import('@/lib/api/ai-curator');
    // Pre-enqueue data so the generator yields it as soon as we
    // start iterating. The first `for await` call kicks off the
    // generator (which calls fetch) and then drains the stream.
    stream.enqueue(
      `event: meta\ndata: {"type":"started","promptVersion":"v4.0.0","model":"gpt-4o","startedAt":"2026-10-19T00:00:00Z"}\n\n`,
    );
    stream.enqueue(`event: delta\ndata: {"text":"{\\"sentiment\\":"}\n\n`);
    stream.enqueue(
      `event: delta\ndata: {"text":"{\\"overallSentiment\\":\\"positive\\"}"}\n\n`,
    );
    stream.enqueue(
      `event: complete\ndata: {"type":"complete","report":{"broadcastSuitability":"PRIME_TIME","suggestedTimeSlot":"21:00 - 23:00","targetAudienceVibe":"general","riskWarnings":"ok","sentimentAnalysis":{"overallSentiment":"positive","hypeLevel":"high","audienceEngagement":80},"complianceAssessment":{"isAgeRestricted":false,"ageRating":"PG","flaggedContent":[],"recommendedBroadcastWindow":"EVENING"},"aiModelVersion":"gpt-4o","processingTimeMs":1340},"processingTimeMs":1340,"confidence":87,"openaiRetries":1}\n\n`,
    );
    stream.close();

    const events = await collectEvents(
      analyzeContentStream({ title: 'Test' }),
    );
    expect(events.map((e) => e.event)).toEqual([
      'meta',
      'delta',
      'delta',
      'complete',
    ]);

    const meta = events[0].data;
    expect(meta.promptVersion).toBe('v4.0.0');

    const accumulated = events
      .filter((e) => e.event === 'delta')
      .map((e) => e.data.text)
      .join('');
    expect(accumulated).toBe('{"sentiment":{"overallSentiment":"positive"}');

    const complete = events[3].data;
    expect(complete.report.broadcastSuitability).toBe('PRIME_TIME');
    expect(complete.confidence).toBe(87);
    expect(complete.openaiRetries).toBe(1);
  });

  it('captures the terminal error event', async () => {
    const stream = new FakeSseStream();
    fetchResponse = makeFakeResponse(stream);

    const { analyzeContentStream } = await import('@/lib/api/ai-curator');
    stream.enqueue(
      `event: error\ndata: {"type":"schema-validation-failed","message":"bad shape","retryable":true}\n\n`,
    );
    stream.close();
    const events = await collectEvents(
      analyzeContentStream({ title: 'Test' }),
    );
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('error');
    expect(events[0].data.type).toBe('schema-validation-failed');
    expect(events[0].data.retryable).toBe(true);
  });

  it('surfaces an error event when the response is not OK', async () => {
    fetchResponse = makeFakeResponse(new FakeSseStream(), false);
    fetchResponse.text = async () => 'upstream unavailable';

    const { analyzeContentStream } = await import('@/lib/api/ai-curator');
    const events = await collectEvents(analyzeContentStream({ title: 'Test' }));

    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('error');
    expect(events[0].data.type).toBe('openai-connection-failed');
    expect(events[0].data.retryable).toBe(true);
  });

  it('surfaces an error event when the response has no body', async () => {
    fetchResponse = {
      ok: true,
      status: 200,
      body: null,
      text: async () => '',
    };

    const { analyzeContentStream } = await import('@/lib/api/ai-curator');
    const events = await collectEvents(analyzeContentStream({ title: 'Test' }));

    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('error');
    expect(events[0].data.retryable).toBe(false);
  });

  it('handles a trailing frame that does not end with \\n\\n', async () => {
    const stream = new FakeSseStream();
    fetchResponse = makeFakeResponse(stream);

    const { analyzeContentStream } = await import('@/lib/api/ai-curator');
    // No trailing blank line — this is what happens when the server
    // closes the connection right after the last frame.
    stream.enqueue(
      `event: complete\ndata: {"type":"complete","report":{"broadcastSuitability":"STANDARD","suggestedTimeSlot":"20:00 - 22:00","targetAudienceVibe":"family","riskWarnings":"none","sentimentAnalysis":{"overallSentiment":"neutral","hypeLevel":"medium","audienceEngagement":50},"complianceAssessment":{"isAgeRestricted":false,"ageRating":"PG","flaggedContent":[],"recommendedBroadcastWindow":"EVENING"},"aiModelVersion":"gpt-4o","processingTimeMs":100},"processingTimeMs":100,"confidence":75}`,
    );
    stream.close();
    const events = await collectEvents(
      analyzeContentStream({ title: 'Test' }),
    );
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('complete');
    expect(events[0].data.confidence).toBe(75);
  });

  it('skips partial / unparseable frames silently', async () => {
    const stream = new FakeSseStream();
    fetchResponse = makeFakeResponse(stream);

    const { analyzeContentStream } = await import('@/lib/api/ai-curator');
    // Garbage frame + valid frame interleaved
    stream.enqueue(`: heartbeat\n\n`);
    stream.enqueue(`event: unknown\ndata: {"foo":"bar"}\n\n`);
    stream.enqueue(`event: delta\ndata: {"text":"hello"}\n\n`);
    stream.close();
    const events = await collectEvents(
      analyzeContentStream({ title: 'Test' }),
    );
    expect(events.map((e) => e.event)).toEqual(['delta']);
    expect(events[0].data.text).toBe('hello');
  });

  it('yields an error event when the AbortSignal is triggered mid-stream', async () => {
    // A minimal read-only stream whose reader never resolves on
    // its own. We simulate the abort by rejecting the pending
    // read with an AbortError-flavored DOMException.
    const stream = new (class {
      private readers: Array<{
        resolve: (r: IteratorResult<Uint8Array>) => void;
        reject: (err: unknown) => void;
      }> = [];
      public closed = false;
      getReader() {
        const self = this;
        return {
          read(): Promise<IteratorResult<Uint8Array>> {
            return new Promise((resolve, reject) => {
              self.readers.push({ resolve, reject });
            });
          },
          releaseLock() {},
          cancel() {
            return Promise.resolve();
          },
          closed: Promise.resolve(undefined),
        } as unknown as ReadableStreamDefaultReader<Uint8Array>;
      }
      rejectAll(err: unknown) {
        while (this.readers.length > 0) {
          const r = this.readers.shift()!;
          r.reject(err);
        }
      }
    })();
    fetchResponse = {
      ok: true,
      status: 200,
      body: { getReader: () => stream.getReader() },
      text: async () => '',
    };

    const { analyzeContentStream } = await import('@/lib/api/ai-curator');
    const controller = new AbortController();
    const iter = analyzeContentStream(
      { title: 'Test' },
      { signal: controller.signal },
    );

    // Start the generator; let fetch() be called; then abort.
    const pending = collectEvents(iter);
    await new Promise((r) => setTimeout(r, 0));
    controller.abort();
    (stream as any).rejectAll(new DOMException('aborted', 'AbortError'));

    const events = await pending;
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('error');
    expect(events[0].data.type).toBe('openai-stream-failed');
    expect(events[0].data.retryable).toBe(false);
  });
});
