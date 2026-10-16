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
  esbuild: {
    // Match Next.js's automatic JSX runtime so test files don't
    // need a manual `import React from 'react'` in every spec.
    jsx: 'automatic',
    jsxImportSource: 'react',
  },
  test: {
    environment: 'node',
    include: [
      'lib/**/*.test.{ts,tsx}',
      'components/**/*.test.{ts,tsx}',
      'app/**/*.test.{ts,tsx}',
    ],
    exclude: ['node_modules', '.next', 'coverage'],
    globals: false,
    reporters: process.env.CI ? ['default'] : ['default'],
  },
});
