// ============================================================
// OmniCast - Vitest configuration
// ============================================================

import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.{ts,tsx}', 'components/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', '.next', 'coverage'],
    globals: false,
    reporters: process.env.CI ? ['default'] : ['default'],
  },
});
