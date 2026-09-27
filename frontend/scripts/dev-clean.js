#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Cross-platform helper that wipes the Next.js `.next` cache and starts the
 * dev server. Use this whenever you hit one of these warnings:
 *
 *   ⚠ Port 3000 is in use, trying 3001 instead.
 *   Error: Cannot find module './vendor-chunks/next.js'
 *
 * Both errors are almost always the result of a stale `.next/` cache (often
 * left behind by a previously killed `next dev`). Removing the cache forces
 * Next.js to recompile cleanly.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const cacheDir = path.join(repoRoot, '.next');
const traceFile = path.join(cacheDir, 'trace');

function removeCache() {
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log(`[dev-clean] removed ${path.relative(repoRoot, cacheDir)}`);
  } else {
    console.log('[dev-clean] .next cache already absent');
  }
}

function startNextDev() {
  const isWindows = process.platform === 'win32';
  const cmd = isWindows ? 'npx.cmd' : 'npx';
  const args = ['next', 'dev'];
  console.log(`[dev-clean] starting: ${cmd} ${args.join(' ')}`);
  const child = spawn(cmd, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}

removeCache();
startNextDev();