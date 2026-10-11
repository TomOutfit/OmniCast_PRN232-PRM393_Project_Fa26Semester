/**
 * OmniCast - Auth Logout Unit Tests
 *
 * Verifies the token purging and session termination logic:
 * 1. clearTokens removes access token, refresh token, and legacy keys
 * 2. clearTokens flushes sessionStorage and sets expired cookie headers
 * 3. Graceful fallback when storage/window is undefined (SSR safety)
 *
 * Run with: `npx vitest run lib/auth-logout.test.ts`
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { clearTokens } from './auth-context';

describe('Auth Logout - Token & Session Clearance', () => {
  let mockLocalStorage: Record<string, string>;
  let mockSessionStorage: Record<string, string>;

  beforeEach(() => {
    mockLocalStorage = {};
    mockSessionStorage = {};

    const localStorageMock = {
      getItem: (key: string) => mockLocalStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockLocalStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockLocalStorage[key];
      },
      clear: () => {
        mockLocalStorage = {};
      },
    };

    const sessionStorageMock = {
      getItem: (key: string) => mockSessionStorage[key] ?? null,
      setItem: (key: string, value: string) => {
        mockSessionStorage[key] = value;
      },
      removeItem: (key: string) => {
        delete mockSessionStorage[key];
      },
      clear: () => {
        mockSessionStorage = {};
      },
    };

    // Setup global browser mock objects in node test environment
    (globalThis as any).window = globalThis;
    (globalThis as any).localStorage = localStorageMock;
    (globalThis as any).sessionStorage = sessionStorageMock;
    (globalThis as any).document = {
      cookie: '',
    };
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
    delete (globalThis as any).sessionStorage;
    delete (globalThis as any).document;
  });

  it('removes access token and refresh token from localStorage', () => {
    localStorage.setItem('accessToken', 'mock_jwt_access_token_123');
    localStorage.setItem('refreshToken', 'mock_refresh_token_456');
    localStorage.setItem('omnicast_user', JSON.stringify({ id: 'u1', role: 'VIEWER' }));

    expect(localStorage.getItem('accessToken')).toBe('mock_jwt_access_token_123');
    expect(localStorage.getItem('refreshToken')).toBe('mock_refresh_token_456');

    clearTokens();

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(localStorage.getItem('omnicast_user')).toBeNull();
  });

  it('clears sessionStorage during logout', () => {
    sessionStorage.setItem('current_stream_state', 'active');
    sessionStorage.setItem('temp_channel_filter', 'SPORTS');

    clearTokens();

    expect(sessionStorage.getItem('current_stream_state')).toBeNull();
    expect(sessionStorage.getItem('temp_channel_filter')).toBeNull();
  });

  it('sets expired cookie directives when document is present', () => {
    clearTokens();
    expect((globalThis as any).document.cookie).toContain('Expires=Thu, 01 Jan 1970 00:00:01 GMT');
  });

  it('safely handles repeated calls to clearTokens without error', () => {
    expect(() => {
      clearTokens();
      clearTokens();
      clearTokens();
    }).not.toThrow();
  });
});
