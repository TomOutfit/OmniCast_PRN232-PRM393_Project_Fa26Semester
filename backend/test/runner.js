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

  // Parse pass/fail counts and individual test assertions
  let pass = 0;
  let fail = 0;
  let durationMs = 0;
  const tests = [];

  for (const rawLine of (result.stdout || '').split('\n')) {
    const line = rawLine.trim();
    const tapPass = line.match(/^# pass (\d+)/);
    if (tapPass) pass = Number(tapPass[1]);
    const tapFail = line.match(/^# fail (\d+)/);
    if (tapFail) fail = Number(tapFail[1]);
    const infoPass = line.match(/^[\u2139\u2713]\s*pass (\d+)/);
    if (infoPass) pass = Number(infoPass[1]);
    const infoFail = line.match(/^[\u2139\u2717]\s*fail (\d+)/);
    if (infoFail) fail = Number(infoFail[1]);

    const durMatch = line.match(/duration_ms\s+([0-9.]+)/);
    if (durMatch) durationMs = parseFloat(durMatch[1]);

    // Match individual test execution lines like:
    // ✔ register creates a new user with hashed password (220.6784ms)
    // ✖ register fails with invalid credentials (5.12ms)
    const testMatch = line.match(/^([✔✖√×]|ok|not ok)\s+(.+?)(?:\s+\(([0-9.]+)ms\))?$/);
    if (
      testMatch &&
      !line.includes('ℹ tests') &&
      !line.includes('ℹ pass') &&
      !line.includes('ℹ fail') &&
      !line.includes('ℹ duration')
    ) {
      const isPassed = testMatch[1] === '✔' || testMatch[1] === '√' || testMatch[1] === 'ok';
      tests.push({
        name: testMatch[2].trim(),
        status: isPassed ? 'passed' : 'failed',
        durationMs: testMatch[3] ? parseFloat(testMatch[3]) : 0,
      });
    }
  }

  totalFailed += fail;
  summary.push({
    file: path.relative(process.cwd(), specFile).replace(/\\/g, '/'),
    total: pass + fail,
    pass,
    fail,
    durationMs,
    tests,
  });
}

console.log('');
console.log('Summary:');
let totalTests = 0;
let totalPassed = 0;
for (const s of summary) {
  totalTests += s.total;
  totalPassed += s.pass;
  console.log(`  ${s.file}: ${s.pass} passed, ${s.fail} failed`);
}

// Write structured JSON report for CI/CD visualization
const jsonReport = {
  suite: 'backend',
  title: 'Backend Services (NestJS)',
  total: totalTests,
  passed: totalPassed,
  failed: totalFailed,
  durationMs: summary.reduce((acc, s) => acc + s.durationMs, 0),
  specs: summary.map((s) => ({
    file: s.file,
    total: s.total,
    passed: s.pass,
    failed: s.fail,
    durationMs: s.durationMs,
    tests: s.tests,
  })),
};

try {
  const { writeFileSync, appendFileSync } = require('node:fs');
  const outputPath = path.join(here, '..', 'test-results.json');
  writeFileSync(outputPath, JSON.stringify(jsonReport, null, 2), 'utf8');

  // If running in GitHub Actions, populate step summary for the backend job
  if (process.env.GITHUB_STEP_SUMMARY) {
    const md = [
      '### ⚙️ Backend Test Report (NestJS)',
      '',
      `**Status:** ${totalFailed === 0 ? '🟢 All Passed' : '🔴 Failed'} | **Passed:** ${totalPassed}/${totalTests} | **Duration:** ${(jsonReport.durationMs / 1000).toFixed(2)}s`,
      '',
      '| Spec File | Passed | Failed | Duration | Status |',
      '| :--- | :---: | :---: | :---: | :---: |',
      ...summary.map(
        (s) =>
          `| \`${s.file}\` | ${s.pass} | ${s.fail} | ${s.durationMs.toFixed(1)}ms | ${s.fail === 0 ? '✅ PASS' : '❌ FAIL'} |`,
      ),
      '',
    ].join('\n');
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, md, 'utf8');
  }
} catch (err) {
  console.warn('Could not write test-results.json or step summary:', err.message);
}

process.exit(totalFailed > 0 ? 1 : 0);