#!/usr/bin/env node
/**
 * OmniCast - Mobile Flutter Test Output Parser
 *
 * Converts `flutter test --machine` NDJSON output into a standardized JSON report
 * and appends a summary table to $GITHUB_STEP_SUMMARY when run in GitHub Actions.
 */
const fs = require('node:fs');
const path = require('node:path');

const inputFile = process.argv[2] || path.join(__dirname, '../../mobile/test-results-raw.json');
const outputFile = process.argv[3] || path.join(__dirname, '../../mobile/test-results.json');

if (!fs.existsSync(inputFile)) {
  console.warn(`Input file not found: ${inputFile}`);
  process.exit(0);
}

const content = fs.readFileSync(inputFile, 'utf8');
const lines = content.split('\n').filter((l) => l.trim().startsWith('{'));

const suites = new Map(); // id -> { id, path }
const tests = new Map();  // id -> { id, name, suiteID, startTime }
const completedTests = [];

for (const line of lines) {
  try {
    const event = JSON.parse(line.trim());
    if (event.type === 'suite' && event.suite) {
      const cleanPath = (event.suite.path || '')
        .replace(/\\/g, '/')
        .replace(/.*\/mobile\//, '')
        .replace(/.*\/test\//, 'test/');
      suites.set(event.suite.id, { id: event.suite.id, path: cleanPath });
    } else if (event.type === 'testStart' && event.test) {
      tests.set(event.test.id, {
        id: event.test.id,
        name: event.test.name,
        suiteID: event.test.suiteID,
        startTime: event.time || 0,
      });
    } else if (event.type === 'testDone') {
      // Ignore hidden/internal flutter tests (e.g. loading or tearDownAll)
      if (event.hidden) continue;

      const testInfo = tests.get(event.testID);
      if (!testInfo) continue;

      // Skip internal framework names like "loading ..." or "(tearDownAll)"
      if (
        testInfo.name.startsWith('loading ') ||
        testInfo.name.includes('(setUpAll)') ||
        testInfo.name.includes('(tearDownAll)')
      ) {
        continue;
      }

      const suite = suites.get(testInfo.suiteID) || { path: 'test/unknown' };
      const durationMs = Math.max(0, (event.time || 0) - (testInfo.startTime || 0));
      const passed = event.result === 'success';

      completedTests.push({
        file: suite.path,
        name: testInfo.name,
        status: passed ? 'passed' : 'failed',
        durationMs,
      });
    }
  } catch {
    // Ignore invalid JSON lines
  }
}

// Group by spec/file
const specsMap = new Map();
for (const t of completedTests) {
  if (!specsMap.has(t.file)) {
    specsMap.set(t.file, {
      file: t.file,
      total: 0,
      passed: 0,
      failed: 0,
      durationMs: 0,
      tests: [],
    });
  }
  const spec = specsMap.get(t.file);
  spec.total++;
  if (t.status === 'passed') spec.passed++;
  else spec.failed++;
  spec.durationMs += t.durationMs;
  spec.tests.push({
    name: t.name,
    status: t.status,
    durationMs: t.durationMs,
  });
}

const specs = Array.from(specsMap.values());
const total = completedTests.length;
const passed = completedTests.filter((t) => t.status === 'passed').length;
const failed = completedTests.filter((t) => t.status === 'failed').length;
const totalDuration = specs.reduce((acc, s) => acc + s.durationMs, 0);

const jsonReport = {
  suite: 'mobile',
  title: 'Mobile App (Flutter + BLoC)',
  total,
  passed,
  failed,
  durationMs: totalDuration,
  specs,
};

fs.writeFileSync(outputFile, JSON.stringify(jsonReport, null, 2), 'utf8');
console.log(`Parsed ${total} mobile tests (${passed} passed, ${failed} failed) -> ${outputFile}`);

// Output to GITHUB_STEP_SUMMARY if present
if (process.env.GITHUB_STEP_SUMMARY) {
  const md = [
    '### 📱 Mobile Test Report (Flutter)',
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
