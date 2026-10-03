#!/usr/bin/env node
/**
 * OmniCast - Frontend Vitest Test Output Parser
 *
 * Normalizes Vitest JSON report output into the standardized OmniCast test schema
 * and appends a summary table to $GITHUB_STEP_SUMMARY when run in GitHub Actions.
 */
const fs = require('node:fs');
const path = require('node:path');

const inputFile = process.argv[2] || path.join(__dirname, '../../frontend/test-results-raw.json');
const outputFile = process.argv[3] || path.join(__dirname, '../../frontend/test-results.json');

if (!fs.existsSync(inputFile)) {
  console.warn(`Input file not found: ${inputFile}`);
  process.exit(0);
}

const raw = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

const specs = (raw.testResults || []).map((fileResult) => {
  const cleanPath = (fileResult.name || '')
    .replace(/\\/g, '/')
    .replace(/.*\/frontend\//, '')
    .replace(/.*\/lib\//, 'lib/')
    .replace(/.*\/components\//, 'components/');

  const tests = (fileResult.assertionResults || []).map((a) => ({
    name: a.fullName || a.title,
    status: a.status === 'passed' ? 'passed' : 'failed',
    durationMs: Math.round((a.duration || 0) * 100) / 100,
  }));

  const passed = tests.filter((t) => t.status === 'passed').length;
  const failed = tests.filter((t) => t.status === 'failed').length;
  const durationMs =
    fileResult.endTime && fileResult.startTime
      ? Math.round(fileResult.endTime - fileResult.startTime)
      : tests.reduce((acc, t) => acc + t.durationMs, 0);

  return {
    file: cleanPath,
    total: tests.length,
    passed,
    failed,
    durationMs,
    tests,
  };
});

const total = raw.numTotalTests || specs.reduce((acc, s) => acc + s.total, 0);
const passed = raw.numPassedTests || specs.reduce((acc, s) => acc + s.passed, 0);
const failed = raw.numFailedTests || specs.reduce((acc, s) => acc + s.failed, 0);
const totalDuration = specs.reduce((acc, s) => acc + s.durationMs, 0);

const jsonReport = {
  suite: 'frontend',
  title: 'Frontend Web (Next.js 14 + Vitest)',
  total,
  passed,
  failed,
  durationMs: totalDuration,
  specs,
};

fs.writeFileSync(outputFile, JSON.stringify(jsonReport, null, 2), 'utf8');
console.log(`Parsed ${total} frontend tests (${passed} passed, ${failed} failed) -> ${outputFile}`);

// Output to GITHUB_STEP_SUMMARY if present
if (process.env.GITHUB_STEP_SUMMARY) {
  const md = [
    '### 🌐 Frontend Test Report (Next.js)',
    '',
    `**Status:** ${failed === 0 ? '🟢 All Passed' : '🔴 Failed'} | **Passed:** ${passed}/${total} | **Duration:** ${(totalDuration / 1000).toFixed(2)}s`,
    '',
    '| Test File | Passed | Failed | Duration | Status |',
    '| :--- | :---: | :---: | :---: | :---: |',
    ...specs.map(
      (s) =>
        `| \`${s.file}\` | ${s.passed} | ${s.failed} | ${s.durationMs.toFixed(1)}ms | ${s.failed === 0 ? '✅ PASS' : '❌ FAIL'} |`,
    ),
    '',
  ].join('\n');
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md, 'utf8');
}
