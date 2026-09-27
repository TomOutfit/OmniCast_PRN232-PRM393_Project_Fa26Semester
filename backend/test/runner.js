#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * OmniCast - Native Node test runner for backend unit tests.
 *
 * Uses Node's built-in `node:test` module (Node 18+). Run with:
 *
 *   npm run test
 *
 * Each `*.spec.ts` file in this directory is executed. We deliberately avoid
 * Jest so the backend does not pull in a heavyweight test framework as a
 * devDependency.
 */
const path = require('node:path');
const { readdirSync } = require('node:fs');
const { run } = require('node:test');
const process = require('node:process');

const here = __dirname;
const specFiles = readdirSync(here)
  .filter((f) => f.endsWith('.spec.ts'))
  .map((f) => path.join(here, f));

if (specFiles.length === 0) {
  console.log('No *.spec.ts files found in', here);
  process.exit(0);
}

console.log(`Running ${specFiles.length} spec file(s)…`);
for (const file of specFiles) {
  console.log('  •', path.relative(process.cwd(), file));
}

// Pre-load each spec via ts-node so the runner can execute TypeScript
// directly without a separate compile step.
require('ts-node').register({
  transpileOnly: true,
  project: path.join(here, '..', 'tsconfig.test.json'),
  compilerOptions: { module: 'commonjs' },
});

// Spawn a child Node process per spec file with `--test`. This avoids the
// subtleties of the in-process `run({files})` API (whose TAP event stream is
// a pain to consume directly). Each child writes TAP to stdout, which we
// surface and summarise.
const { spawnSync } = require('node:child_process');

let totalFailed = 0;
const summary = [];

for (const specFile of specFiles) {
  const result = spawnSync(
    process.execPath,
    [
      '--no-warnings',
      '--require',
      require.resolve('ts-node/register'),
      '--test',
      specFile,
    ],
    {
      cwd: path.join(here, '..'),
      env: {
        ...process.env,
        TS_NODE_PROJECT: path.join(here, '..', 'tsconfig.test.json'),
        TS_NODE_TRANSPILE_ONLY: 'true',
      },
      encoding: 'utf8',
    },
  );

  process.stdout.write(result.stdout || '');
  if (result.stderr) process.stderr.write(result.stderr);

  // Node 24's `--test` writes summary lines like:
  //   `ℹ tests 7`
  //   `ℹ pass 7`
  //   `ℹ fail 0`
  // Older versions write TAP-style `# pass <N>`. We handle both.
  let pass = 0;
  let fail = 0;
  for (const line of (result.stdout || '').split('\n')) {
    const tapPass = line.match(/^# pass (\d+)/);
    if (tapPass) pass = Number(tapPass[1]);
    const tapFail = line.match(/^# fail (\d+)/);
    if (tapFail) fail = Number(tapFail[1]);
    const infoPass = line.match(/^\s*[\u2139\u2713]\s*pass (\d+)/);
    if (infoPass) pass = Number(infoPass[1]);
    const infoFail = line.match(/^\s*[\u2139\u2717]\s*fail (\d+)/);
    if (infoFail) fail = Number(infoFail[1]);
  }
  totalFailed += fail;
  summary.push({ file: path.relative(process.cwd(), specFile), pass, fail });
}

console.log('');
console.log('Summary:');
for (const s of summary) {
  console.log(`  ${s.file}: ${s.pass} passed, ${s.fail} failed`);
}

process.exit(totalFailed > 0 ? 1 : 0);