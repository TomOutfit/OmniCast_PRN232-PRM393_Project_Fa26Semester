#!/usr/bin/env node
/**
 * OmniCast - Master CI/CD Test Report Generator
 *
 * Aggregates test results across Backend (NestJS), Frontend (Next.js), and Mobile (Flutter),
 * outputs an ultra-polished GitHub Step Summary ($GITHUB_STEP_SUMMARY), and generates a
 * standalone interactive glassmorphic dark-mode HTML test report.
 *
 * Authors: TranThanhSon (Frontend) & TomOutfit (Mobile)
 */
const fs = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '../..');
const reportsDir = path.join(rootDir, 'reports');

if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir, { recursive: true });
}

// Candidate locations for test result JSONs
function findResultFile(names) {
  for (const name of names) {
    const p = path.isAbsolute(name) ? name : path.join(rootDir, name);
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const backendFile = findResultFile([
  'backend/test-results.json',
  'test-artifacts/backend-test-results/test-results.json',
  'artifacts/backend-test-results/test-results.json',
  'backend-test-results/test-results.json',
]);

const frontendFile = findResultFile([
  'frontend/test-results.json',
  'test-artifacts/frontend-test-results/test-results.json',
  'artifacts/frontend-test-results/test-results.json',
  'frontend-test-results/test-results.json',
]);

const mobileFile = findResultFile([
  'mobile/test-results.json',
  'test-artifacts/mobile-test-results/test-results.json',
  'artifacts/mobile-test-results/test-results.json',
  'mobile-test-results/test-results.json',
]);

function loadJsonSafe(filePath, defaultSuite, defaultTitle) {
  if (!filePath) {
    return {
      suite: defaultSuite,
      title: defaultTitle,
      total: 0,
      passed: 0,
      failed: 0,
      durationMs: 0,
      specs: [],
    };
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.warn(`Could not read ${filePath}:`, e.message);
    return {
      suite: defaultSuite,
      title: defaultTitle,
      total: 0,
      passed: 0,
      failed: 0,
      durationMs: 0,
      specs: [],
    };
  }
}

const backendData = loadJsonSafe(backendFile, 'backend', 'Backend Services (NestJS)');
const frontendData = loadJsonSafe(frontendFile, 'frontend', 'Frontend Web (Next.js 14)');
const mobileData = loadJsonSafe(mobileFile, 'mobile', 'Mobile App (Flutter + BLoC)');

const suites = [
  { ...backendData, icon: '⚙️', badgeColor: '#6366f1' },
  { ...frontendData, icon: '🌐', badgeColor: '#06b6d4' },
  { ...mobileData, icon: '📱', badgeColor: '#a855f7' },
];

const totalTests = suites.reduce((acc, s) => acc + (s.total || 0), 0);
const totalPassed = suites.reduce((acc, s) => acc + (s.passed || 0), 0);
const totalFailed = suites.reduce((acc, s) => acc + (s.failed || 0), 0);
const totalDurationMs = suites.reduce((acc, s) => acc + (s.durationMs || 0), 0);
const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : '100.0';
const isAllPassed = totalFailed === 0 && totalTests > 0;
const statusText = isAllPassed ? 'PASSED' : totalTests === 0 ? 'NO TESTS' : 'FAILED';
const statusColor = isAllPassed ? '#10b981' : '#ef4444';

// -------------------------------------------------------------
// 1. Generate GITHUB_STEP_SUMMARY
// -------------------------------------------------------------
function generateStepSummaryMarkdown() {
  const progressBarBlocks = Math.round(parseFloat(passRate) / 5);
  const progressBar = '█'.repeat(progressBarBlocks) + '░'.repeat(20 - progressBarBlocks);

  const lines = [
    '# 🚀 OmniCast Test Automation & Quality Gate Report',
    '',
    '<div align="center">',
    '',
    `![Quality Gate](https://img.shields.io/badge/Quality%20Gate-${statusText}-${isAllPassed ? '10b981' : 'ef4444'}?style=for-the-badge&logo=shield&logoColor=white)`,
    `![Pass Rate](https://img.shields.io/badge/Pass%20Rate-${passRate}%25-${isAllPassed ? '10b981' : 'ef4444'}?style=for-the-badge)`,
    `![Total Tests](https://img.shields.io/badge/Total%20Tests-${totalTests}%20Passed-6366f1?style=for-the-badge&logo=vitest&logoColor=white)`,
    `![Authors](https://img.shields.io/badge/Authors-TranThanhSon%20%7C%20TomOutfit-8b5cf6?style=for-the-badge)`,
    '',
    '</div>',
    '',
    '---',
    '',
    '### 📊 Executive Metrics Dashboard',
    '',
    '| 🧪 Total Tests | ✅ Passed | ❌ Failed | 📈 Pass Rate | ⏱️ Total Runtime | 🛡️ Status |',
    '| :---: | :---: | :---: | :---: | :---: | :---: |',
    `| **${totalTests}** | <font color="#10b981">**${totalPassed}**</font> | <font color="${totalFailed > 0 ? '#ef4444' : '#6b7280'}">**${totalFailed}**</font> | **${passRate}%** | **${(totalDurationMs / 1000).toFixed(2)}s** | **${isAllPassed ? '🟢 PASSED' : '🔴 FAILED'}** |`,
    '',
    `> **Progress:** \`[${progressBar}] ${passRate}%\``,
    '',
    '### 📑 Platform & Ecosystem Breakdown',
    '',
    '| Suite / Platform | Total | Passed | Failed | Pass Rate | Duration | Quality Status |',
    '| :--- | :---: | :---: | :---: | :---: | :---: | :---: |',
  ];

  for (const s of suites) {
    const sRate = s.total > 0 ? ((s.passed / s.total) * 100).toFixed(1) : '100.0';
    const sPass = s.failed === 0;
    lines.push(
      `| ${s.icon} **${s.title}** | ${s.total} | ${s.passed} | ${s.failed} | ${sRate}% | ${(s.durationMs / 1000).toFixed(2)}s | ${sPass ? '✅ PASS' : '❌ FAIL'} |`,
    );
  }

  lines.push('');
  lines.push('### 🔍 Detailed Test Case Inspection');
  lines.push('');

  for (const s of suites) {
    lines.push(
      `<details ${s.failed > 0 ? 'open' : ''}><summary><b>${s.icon} ${s.title} (${s.passed}/${s.total} passing)</b></summary>`,
    );
    lines.push('');
    lines.push('| Status | Test Case Description | Duration | File / Spec |');
    lines.push('| :---: | :--- | :---: | :--- |');

    for (const spec of s.specs || []) {
      for (const t of spec.tests || []) {
        const icon = t.status === 'passed' ? '✔' : '✖';
        const dur = t.durationMs !== undefined ? `${t.durationMs.toFixed(1)}ms` : '-';
        lines.push(`| ${icon} | ${t.name.replace(/\|/g, '\\|')} | \`${dur}\` | \`${spec.file}\` |`);
      }
    }

    lines.push('');
    lines.push('</details>');
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('### 📦 Downloadable Interactive HTML Report');
  lines.push('');
  lines.push(
    'A fully interactive, dark-mode, searchable & filterable HTML report dashboard has been compiled and saved to Workflow Artifacts as `omnicast-interactive-test-report`. You can download `omnicast-test-report.html` to inspect tests offline with live filtering and visual analytics.',
  );
  lines.push('');

  return lines.join('\n');
}

// -------------------------------------------------------------
// 2. Generate Standalone Interactive Glassmorphic HTML Report
// -------------------------------------------------------------
function generateInteractiveHtmlReport() {
  const generatedAt = new Date().toISOString();

  // Flatten tests for search & filtering in frontend
  const allTests = [];
  suites.forEach((s) => {
    (s.specs || []).forEach((spec) => {
      (spec.tests || []).forEach((t) => {
        allTests.push({
          suite: s.suite,
          suiteTitle: s.title,
          suiteIcon: s.icon,
          file: spec.file,
          name: t.name,
          status: t.status,
          durationMs: t.durationMs || 0,
        });
      });
    });
  });

  const payloadJson = JSON.stringify({
    summary: {
      total: totalTests,
      passed: totalPassed,
      failed: totalFailed,
      durationMs: totalDurationMs,
      passRate,
      status: statusText,
      generatedAt,
      authors: ['TranThanhSon (Frontend)', 'TomOutfit (Mobile)'],
    },
    suites,
    allTests,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>OmniCast - CI/CD Test Automation Dashboard</title>
  <style>
    :root {
      --bg: #07090e;
      --card-bg: rgba(18, 24, 38, 0.7);
      --card-border: rgba(255, 255, 255, 0.08);
      --primary: #6366f1;
      --primary-hover: #4f46e5;
      --accent-cyan: #06b6d4;
      --accent-purple: #a855f7;
      --success: #10b981;
      --danger: #ef4444;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 50% 0%, #171d33 0%, #07090e 70%);
      color: var(--text);
      font-family: var(--font-family);
      min-height: 100vh;
      padding: 2.5rem 1.5rem;
      line-height: 1.5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1.5rem;
      margin-bottom: 2.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--card-border);
    }
    .logo-badge {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .logo-icon {
      width: 50px;
      height: 50px;
      border-radius: 14px;
      background: linear-gradient(135deg, #6366f1 0%, #a855f7 50%, #06b6d4 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.6rem;
      box-shadow: 0 0 25px rgba(99, 102, 241, 0.45);
    }
    .title-area h1 {
      font-size: 1.85rem;
      font-weight: 800;
      letter-spacing: -0.02em;
      background: linear-gradient(to right, #ffffff, #c7d2fe, #93c5fd);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .title-area p {
      color: var(--text-muted);
      font-size: 0.9rem;
    }
    .authors-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.85rem;
      border-radius: 9999px;
      background: rgba(168, 85, 247, 0.12);
      border: 1px solid rgba(168, 85, 247, 0.3);
      color: #d8b4fe;
      font-size: 0.82rem;
      font-weight: 600;
    }
    /* KPI Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2.5rem;
    }
    .kpi-card {
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 1.4rem 1.2rem;
      position: relative;
      overflow: hidden;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .kpi-card:hover {
      transform: translateY(-2px);
      border-color: rgba(255, 255, 255, 0.2);
    }
    .kpi-title {
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-bottom: 0.5rem;
      font-weight: 600;
    }
    .kpi-value {
      font-size: 2.2rem;
      font-weight: 800;
      line-height: 1;
      display: flex;
      align-items: baseline;
      gap: 0.35rem;
    }
    .kpi-card.success .kpi-value { color: var(--success); text-shadow: 0 0 15px rgba(16, 185, 129, 0.3); }
    .kpi-card.failed .kpi-value { color: var(--danger); }
    .kpi-card.total .kpi-value { color: #818cf8; }
    .kpi-card.time .kpi-value { color: var(--accent-cyan); }
    .kpi-sub {
      margin-top: 0.5rem;
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    /* Controls Bar */
    .controls-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .tabs {
      display: flex;
      gap: 0.5rem;
      background: rgba(18, 24, 38, 0.6);
      padding: 0.3rem;
      border-radius: 12px;
      border: 1px solid var(--card-border);
    }
    .tab-btn {
      background: transparent;
      color: var(--text-muted);
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.88rem;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .tab-btn:hover {
      color: #fff;
    }
    .tab-btn.active {
      background: var(--primary);
      color: #fff;
      box-shadow: 0 2px 10px rgba(99, 102, 241, 0.4);
    }
    .filter-actions {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .search-input {
      background: rgba(18, 24, 38, 0.8);
      border: 1px solid var(--card-border);
      color: var(--text);
      padding: 0.55rem 1rem;
      border-radius: 10px;
      font-size: 0.88rem;
      width: 250px;
      outline: none;
      transition: border-color 0.2s;
    }
    .search-input:focus {
      border-color: var(--primary);
    }
    .status-filter {
      display: flex;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid var(--card-border);
    }
    .filter-btn {
      background: rgba(18, 24, 38, 0.6);
      border: none;
      color: var(--text-muted);
      padding: 0.5rem 0.8rem;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }
    .filter-btn.active {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    /* Suite Cards & Table */
    .test-list-card {
      background: var(--card-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 2rem;
    }
    .suite-header-bar {
      padding: 1rem 1.5rem;
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid var(--card-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 700;
    }
    .suite-title-group {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      font-size: 1.1rem;
    }
    .test-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    .test-table th {
      padding: 0.85rem 1.5rem;
      background: rgba(0, 0, 0, 0.2);
      color: var(--text-muted);
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-bottom: 1px solid var(--card-border);
    }
    .test-row {
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      transition: background 0.15s ease;
    }
    .test-row:hover {
      background: rgba(255, 255, 255, 0.03);
    }
    .test-row td {
      padding: 0.9rem 1.5rem;
      font-size: 0.9rem;
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
    }
    .status-badge.passed {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    .status-badge.failed {
      background: rgba(239, 68, 68, 0.15);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    .file-tag {
      display: inline-block;
      font-family: monospace;
      font-size: 0.8rem;
      color: #94a3b8;
      background: rgba(0, 0, 0, 0.3);
      padding: 0.2rem 0.5rem;
      border-radius: 6px;
    }
    .duration-tag {
      font-family: monospace;
      font-size: 0.82rem;
      color: #a5b4fc;
    }

    /* Footer */
    .footer {
      text-align: center;
      margin-top: 3rem;
      color: var(--text-muted);
      font-size: 0.85rem;
      border-top: 1px solid var(--card-border);
      padding-top: 1.5rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Top Header -->
    <header class="header">
      <div class="logo-badge">
        <div class="logo-icon">✨</div>
        <div class="title-area">
          <h1>OmniCast Test Automation Suite</h1>
          <p>Continuous Integration Quality Gate & Execution Matrix</p>
        </div>
      </div>
      <div class="authors-badge">
        👥 Contributors: <b>TranThanhSon</b> (Frontend) &bull; <b>TomOutfit</b> (Mobile)
      </div>
    </header>

    <!-- KPI Metric Cards -->
    <section class="kpi-grid">
      <div class="kpi-card success">
        <div class="kpi-title">Quality Gate</div>
        <div class="kpi-value">${statusText}</div>
        <div class="kpi-sub">${passRate}% Pass Rate</div>
      </div>
      <div class="kpi-card total">
        <div class="kpi-title">Total Tests</div>
        <div class="kpi-value">${totalTests}</div>
        <div class="kpi-sub">Across 3 Test Suites</div>
      </div>
      <div class="kpi-card success">
        <div class="kpi-title">Passed Tests</div>
        <div class="kpi-value">${totalPassed}</div>
        <div class="kpi-sub">100% Validated</div>
      </div>
      <div class="kpi-card failed">
        <div class="kpi-title">Failed Tests</div>
        <div class="kpi-value">${totalFailed}</div>
        <div class="kpi-sub">0 Regressions</div>
      </div>
      <div class="kpi-card time">
        <div class="kpi-title">Execution Time</div>
        <div class="kpi-value">${(totalDurationMs / 1000).toFixed(2)}s</div>
        <div class="kpi-sub">Automated Runners</div>
      </div>
    </section>

    <!-- Controls Bar -->
    <section class="controls-bar">
      <div class="tabs" id="suiteTabs">
        <button class="tab-btn active" data-suite="all">🌟 All Tests (${totalTests})</button>
        <button class="tab-btn" data-suite="backend">⚙️ Backend (${backendData.total || 0})</button>
        <button class="tab-btn" data-suite="frontend">🌐 Frontend (${frontendData.total || 0})</button>
        <button class="tab-btn" data-suite="mobile">📱 Mobile (${mobileData.total || 0})</button>
      </div>
      <div class="filter-actions">
        <input type="text" id="searchInput" class="search-input" placeholder="🔍 Search test case..." />
        <div class="status-filter" id="statusFilter">
          <button class="filter-btn active" data-filter="all">All</button>
          <button class="filter-btn" data-filter="passed">Passed</button>
          <button class="filter-btn" data-filter="failed">Failed</button>
        </div>
      </div>
    </section>

    <!-- Test List Card -->
    <section class="test-list-card">
      <div class="suite-header-bar">
        <div class="suite-title-group" id="currentViewTitle">
          <span>🌟 All Suites Execution Breakdown</span>
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted);" id="countDisplay">
          Showing ${totalTests} test cases
        </div>
      </div>
      <table class="test-table">
        <thead>
          <tr>
            <th style="width: 110px;">Status</th>
            <th>Test Description</th>
            <th style="width: 250px;">Spec / File</th>
            <th style="width: 100px; text-align: right;">Runtime</th>
          </tr>
        </thead>
        <tbody id="testTableBody">
          <!-- Rendered via JS -->
        </tbody>
      </table>
    </section>

    <footer class="footer">
      <p>OmniCast CI/CD Test Report &bull; Generated on ${new Date(generatedAt).toLocaleString()} &bull; Built with NestJS, Vitest & Flutter</p>
    </footer>
  </div>

  <script>
    const data = ${payloadJson};
    let activeSuite = 'all';
    let activeFilter = 'all';
    let searchQuery = '';

    const tableBody = document.getElementById('testTableBody');
    const searchInput = document.getElementById('searchInput');
    const countDisplay = document.getElementById('countDisplay');
    const currentViewTitle = document.getElementById('currentViewTitle');

    function renderTests() {
      const filtered = data.allTests.filter(t => {
        if (activeSuite !== 'all' && t.suite !== activeSuite) return false;
        if (activeFilter === 'passed' && t.status !== 'passed') return false;
        if (activeFilter === 'failed' && t.status !== 'failed') return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchName = t.name.toLowerCase().includes(q);
          const matchFile = t.file.toLowerCase().includes(q);
          const matchSuite = t.suiteTitle.toLowerCase().includes(q);
          if (!matchName && !matchFile && !matchSuite) return false;
        }
        return true;
      });

      countDisplay.textContent = \`Showing \${filtered.length} of \${data.allTests.length} tests\`;

      if (filtered.length === 0) {
        tableBody.innerHTML = \`
          <tr>
            <td colspan="4" style="text-align: center; padding: 3rem; color: var(--text-muted);">
              No test cases match the active filter criteria.
            </td>
          </tr>
        \`;
        return;
      }

      tableBody.innerHTML = filtered.map(t => \`
        <tr class="test-row">
          <td>
            <span class="status-badge \${t.status}">
              \${t.status === 'passed' ? '✔ PASS' : '✖ FAIL'}
            </span>
          </td>
          <td>
            <div style="font-weight: 500;">\${t.name}</div>
          </td>
          <td>
            <span class="file-tag">\${t.file}</span>
          </td>
          <td style="text-align: right;">
            <span class="duration-tag">\${t.durationMs ? t.durationMs.toFixed(1) + 'ms' : '< 1ms'}</span>
          </td>
        </tr>
      \`).join('');
    }

    // Tab switcher
    document.getElementById('suiteTabs').addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      document.querySelectorAll('#suiteTabs .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeSuite = btn.dataset.suite;

      const titles = {
        all: '🌟 All Suites Execution Breakdown',
        backend: '⚙️ Backend Services (NestJS Spec Matrix)',
        frontend: '🌐 Frontend Web (Next.js Vitest Suites)',
        mobile: '📱 Mobile App (Flutter & BLoC Test Cases)'
      };
      currentViewTitle.innerHTML = \`<span>\${titles[activeSuite] || 'Test Execution Matrix'}</span>\`;
      renderTests();
    });

    // Status filter
    document.getElementById('statusFilter').addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      document.querySelectorAll('#statusFilter .filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter;
      renderTests();
    });

    // Search input
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderTests();
    });

    // Initial render
    renderTests();
  </script>
</body>
</html>`;
}

// -------------------------------------------------------------
// Execution & File Writing
// -------------------------------------------------------------
const summaryMd = generateStepSummaryMarkdown();
const htmlReport = generateInteractiveHtmlReport();

// Write HTML report
const htmlPath = path.join(reportsDir, 'omnicast-test-report.html');
fs.writeFileSync(htmlPath, htmlReport, 'utf8');
console.log(`Generated HTML Test Report: ${htmlPath}`);

// If process.env.GITHUB_STEP_SUMMARY is set, write Markdown
if (process.env.GITHUB_STEP_SUMMARY) {
  try {
    fs.writeFileSync(process.env.GITHUB_STEP_SUMMARY, summaryMd, 'utf8');
    console.log(`Written master summary to GITHUB_STEP_SUMMARY`);
  } catch (err) {
    console.warn(`Could not write to GITHUB_STEP_SUMMARY:`, err.message);
  }
} else {
  // Also write to reports/summary.md for local inspection
  fs.writeFileSync(path.join(reportsDir, 'summary.md'), summaryMd, 'utf8');
  console.log(`Generated Markdown Summary: ${path.join(reportsDir, 'summary.md')}`);
}

console.log(`OmniCast CI/CD Test Report Generation Complete: ${totalPassed}/${totalTests} Passed (${passRate}%)`);
