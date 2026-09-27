#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Cross-platform helper that wipes the Next.js `.next` cache and runs a
 * production build. Use this whenever the previous build was interrupted or
 * the `.next` directory has gone stale.
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const cacheDir = path.join(repoRoot, '.next');

function removeCache() {
  if (fs.existsSync(cacheDir)) {
    fs.rmSync(cacheDir, { recursive: true, force: true });
    console.log(`[build-clean] removed ${path.relative(repoRoot, cacheDir)}`);
  } else {
    console.log('[build-clean] .next cache already absent');
  }
}

function startNextBuild() {
  const isWindows = process.platform === 'win32';
  const cmd = isWindows ? 'npx.cmd' : 'npx';
  const args = ['next', 'build'];
  console.log(`[build-clean] starting: ${cmd} ${args.join(' ')}`);
  const child = spawn(cmd, args, {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
    env: process.env,
  });
  child.on('exit', (code) => process.exit(code ?? 0));
}

removeCache();
startNextBuild();