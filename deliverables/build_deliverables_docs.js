const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const baseDir = path.resolve(__dirname);

// CSS styling for all polished documents
const cssContent = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&family=Fira+Code:wght@400;500;600&display=swap');

:root {
  --primary: #0284c7;
  --primary-dark: #0369a1;
  --primary-light: #f0f9ff;
  --secondary: #0f172a;
  --fptu-orange: #f26f21;
  --fptu-blue: #004b91;
  --accent-cyan: #06b6d4;
  --accent-emerald: #059669;
  --accent-rose: #e11d48;
  --accent-amber: #d97706;
  --bg-slate: #f8fafc;
  --border-color: #cbd5e1;
  --text-main: #0f172a;
  --text-muted: #475569;
  --text-sub: #64748b;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

@page {
  size: A4 portrait;
  margin: 14mm 14mm 16mm 14mm;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: var(--text-main);
  background: #ffffff;
  line-height: 1.55;
  font-size: 9.5pt;
  padding: 24px;
}

/* Header & Banner */
.fptu-header {
  border-bottom: 2px solid var(--border-color);
  padding-bottom: 12px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.fptu-brand {
  font-family: 'Outfit', sans-serif;
  font-size: 11pt;
  font-weight: 800;
  color: var(--fptu-blue);
  letter-spacing: -0.2px;
}

.fptu-brand span {
  color: var(--fptu-orange);
}

.fptu-tag {
  font-size: 8pt;
  font-weight: 700;
  text-transform: uppercase;
  color: #ffffff;
  background: linear-gradient(135deg, var(--fptu-orange), #ea580c);
  padding: 4px 10px;
  border-radius: 999px;
  letter-spacing: 0.5px;
}

/* Headings */
h1 {
  font-family: 'Outfit', sans-serif;
  font-size: 20pt;
  font-weight: 900;
  color: var(--secondary);
  line-height: 1.25;
  margin-top: 10px;
  margin-bottom: 6px;
  letter-spacing: -0.5px;
}

h2 {
  font-family: 'Outfit', sans-serif;
  font-size: 13pt;
  font-weight: 700;
  color: var(--primary-dark);
  margin-top: 16px;
  margin-bottom: 10px;
  border-bottom: 1.5px solid #e2e8f0;
  padding-bottom: 4px;
}

h3 {
  font-family: 'Outfit', sans-serif;
  font-size: 11pt;
  font-weight: 700;
  color: var(--secondary);
  margin-top: 14px;
  margin-bottom: 6px;
}

h4 {
  font-family: 'Outfit', sans-serif;
  font-size: 10pt;
  font-weight: 600;
  color: var(--text-muted);
  margin-top: 10px;
  margin-bottom: 4px;
}

p {
  margin-bottom: 8px;
  color: #334155;
}

hr {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 16px 0;
}

/* Metadata Card */
.meta-box {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-left: 4px solid var(--primary);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 18px;
  font-size: 9pt;
}

.meta-box ul, .meta-box ol {
  margin-left: 20px;
  margin-top: 4px;
}

.meta-box li {
  margin-bottom: 3px;
}

/* Tables */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 14px 0 20px 0;
  font-size: 8.5pt;
  background: #ffffff;
  border-radius: 6px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  border: 1px solid #cbd5e1;
  page-break-inside: auto;
}

tr {
  page-break-inside: avoid;
  page-break-after: auto;
}

thead {
  display: table-header-group;
}

th {
  background: #0f172a;
  color: #f8fafc;
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  text-align: left;
  padding: 8px 10px;
  font-size: 8.5pt;
  letter-spacing: 0.2px;
  border-right: 1px solid #334155;
}

th:last-child {
  border-right: none;
}

td {
  padding: 7px 10px;
  border-bottom: 1px solid #e2e8f0;
  border-right: 1px solid #f1f5f9;
  vertical-align: top;
  color: #1e293b;
}

td:last-child {
  border-right: none;
}

tbody tr:nth-child(even) {
  background: #f8fafc;
}

tbody tr:hover {
  background: #f1f5f9;
}

/* Badges */
strong {
  font-weight: 700;
  color: var(--secondary);
}

/* Highlight status cells */
td:has(strong:contains("PASS")),
td:has(strong:contains("ĐẠT")),
td:has(strong:contains("ĐÃ SỬA")),
td:has(strong:contains("Thành công")),
td:has(strong:contains("Hoạt động")) {
  background: #ecfdf5;
}

/* Code blocks */
pre {
  background: #0f172a;
  color: #e2e8f0;
  padding: 10px 14px;
  border-radius: 6px;
  font-family: 'Fira Code', Consolas, monospace;
  font-size: 8pt;
  line-height: 1.45;
  overflow-x: auto;
  margin: 10px 0;
  border: 1px solid #334155;
  page-break-inside: avoid;
}

code {
  font-family: 'Fira Code', Consolas, monospace;
  font-size: 8pt;
  background: #f1f5f9;
  color: #0369a1;
  padding: 1px 5px;
  border-radius: 4px;
  border: 1px solid #e2e8f0;
}

pre code {
  background: transparent;
  color: inherit;
  padding: 0;
  border: none;
}

/* Lists */
ul, ol {
  margin-left: 22px;
  margin-bottom: 10px;
}

li {
  margin-bottom: 4px;
  color: #334155;
}

/* Links */
a {
  color: var(--primary);
  text-decoration: none;
  font-weight: 500;
}

a:hover {
  text-decoration: underline;
}

/* Print optimizations */
@media print {
  body {
    padding: 0;
  }
  .fptu-header {
    margin-top: 0;
  }
  h1, h2, h3 {
    page-break-after: avoid;
  }
  table {
    page-break-inside: auto;
  }
  tr {
    page-break-inside: avoid;
  }
}
`;

const cssPath = path.join(baseDir, 'assets', 'shared', 'document_styles.css');
fs.writeFileSync(cssPath, cssContent, 'utf8');
console.log('Saved document styles to:', cssPath);

const documents = [
  {
    src: '02_Testing/TEST_EXECUTION_REPORT.md',
    title: 'OmniCast - Báo Cáo Thực Thi Kiểm Thử Toàn Diện (Test Execution Report)',
    sub: 'PRN232 & PRM393 - Fall 2026',
    htmlOut: '02_Testing/TEST_EXECUTION_REPORT.html',
    pdfOut: '02_Testing/TEST_EXECUTION_REPORT.pdf',
    docxOut: '02_Testing/TEST_EXECUTION_REPORT.docx'
  },
  {
    src: '02_Testing/TEST_CASES_PRN232.md',
    title: 'OmniCast - Danh Mục Test Cases Môn PRN232',
    sub: 'Back-End NestJS & Web Portal Next.js 15',
    htmlOut: '02_Testing/TEST_CASES_PRN232.html',
    pdfOut: '02_Testing/TEST_CASES_PRN232.pdf',
    docxOut: '02_Testing/TEST_CASES_PRN232.docx'
  },
  {
    src: '02_Testing/TEST_CASES_PRM393.md',
    title: 'OmniCast - Danh Mục Test Cases Môn PRM393',
    sub: 'Ứng Dụng Di Động Flutter (Clean Architecture & BLoC)',
    htmlOut: '02_Testing/TEST_CASES_PRM393.html',
    pdfOut: '02_Testing/TEST_CASES_PRM393.pdf',
    docxOut: '02_Testing/TEST_CASES_PRM393.docx'
  },
  {
    src: '03_Deployment/DEPLOYMENT.md',
    title: 'OmniCast - Hướng Dẫn Triển Khai Hệ Thống (Deployment Guide)',
    sub: 'Kiến Trúc Triển Khai Thực Tế Nền Tảng Đa Dịch Vụ',
    htmlOut: '03_Deployment/DEPLOYMENT.html',
    pdfOut: '03_Deployment/DEPLOYMENT.pdf',
    docxOut: '03_Deployment/DEPLOYMENT.docx'
  },
  {
    src: '04_Repository/REPOSITORY.md',
    title: 'OmniCast - Cấu Trúc Kho Mã Nguồn & Hướng Dẫn Phát Triển',
    sub: 'Tổ Chức Monorepo, Quy Ước Mã Nguồn & Quy Trình Đóng Góp',
    htmlOut: '04_Repository/REPOSITORY.html',
    pdfOut: '04_Repository/REPOSITORY.pdf',
    docxOut: '04_Repository/REPOSITORY.docx'
  }
];

function processDocument(doc) {
  const mdFile = path.join(baseDir, doc.src);
  const htmlFile = path.join(baseDir, doc.htmlOut);
  const pdfFile = path.join(baseDir, doc.pdfOut);
  const docxFile = path.join(baseDir, doc.docxOut);

  console.log(`\n========================================`);
  console.log(`Processing: ${doc.title}`);
  console.log(`========================================`);

  // 1. Generate DOCX via Pandoc
  console.log(`==> Compiling DOCX via Pandoc: ${doc.docxOut}`);
  try {
    execSync(`pandoc "${mdFile}" -o "${docxFile}"`, { stdio: 'inherit' });
    console.log(`[OK] DOCX generated: ${doc.docxOut}`);
  } catch (e) {
    console.error(`[WARN] Failed DOCX generation: ${e.message}`);
  }

  // 2. Generate HTML via Pandoc
  const tempHtml = path.join(baseDir, 'temp_body.html');
  try {
    execSync(`pandoc "${mdFile}" -o "${tempHtml}"`, { stdio: 'inherit' });
    const bodyHtml = fs.readFileSync(tempHtml, 'utf8');
    fs.unlinkSync(tempHtml);

    // Build standalone HTML with brand banner and styling
    const fullHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${doc.title} - OmniCast</title>
  <style>
${cssContent}
  </style>
</head>
<body>
  <div class="fptu-header">
    <div class="fptu-brand">
      FPT UNIVERSITY <span>|</span> FPTU QUY NHON AI CAMPUS
    </div>
    <div class="fptu-tag">FU CAHATA • PRN232 &amp; PRM393</div>
  </div>

  <div class="content">
${bodyHtml}
  </div>

  <div style="margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 8pt; color: #64748b;">
    <div>OmniCast Enterprise Broadcast Intelligence Ecosystem</div>
    <div>FPTU Quy Nhon AI Campus - FU Cahata • Mentor: Thầy Huỳnh Vang</div>
  </div>
</body>
</html>`;

    fs.writeFileSync(htmlFile, fullHtml, 'utf8');
    console.log(`[OK] HTML generated: ${doc.htmlOut}`);

    // 3. Generate PDF via Headless Edge
    console.log(`==> Printing PDF via Headless Edge: ${doc.pdfOut}`);
    const fileUrl = 'file:///' + htmlFile.replace(/\\/g, '/');
    const edgeCmd = `"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf-no-header --print-to-pdf="${pdfFile}" "${fileUrl}"`;
    execSync(edgeCmd, { stdio: 'inherit' });
    if (fs.existsSync(pdfFile)) {
      const stats = fs.statSync(pdfFile);
      console.log(`[OK] PDF generated: ${doc.pdfOut} (${stats.size} bytes)`);
    }
  } catch (e) {
    console.error(`[ERR] Failed HTML/PDF generation for ${doc.title}:`, e.message);
  }
}

// Process each individual document
documents.forEach(processDocument);

// Build Master Unified Testing Report
console.log(`\n========================================`);
console.log(`Building Master Testing Dossier...`);
console.log(`========================================`);

const masterHtmlFile = path.join(baseDir, '02_Testing', 'OmniCast_Comprehensive_Testing_Report.html');
const masterPdfFile = path.join(baseDir, '02_Testing', 'OmniCast_Comprehensive_Testing_Report.pdf');
const masterDocxFile = path.join(baseDir, '02_Testing', 'OmniCast_Comprehensive_Testing_Report.docx');

const execReportMd = fs.readFileSync(path.join(baseDir, '02_Testing', 'TEST_EXECUTION_REPORT.md'), 'utf8');
const prnTestMd = fs.readFileSync(path.join(baseDir, '02_Testing', 'TEST_CASES_PRN232.md'), 'utf8');
const prmTestMd = fs.readFileSync(path.join(baseDir, '02_Testing', 'TEST_CASES_PRM393.md'), 'utf8');

const combinedMd = `${execReportMd}

\\newpage

---

# 📚 PHỤ LỤC A: MA TRẬN TEST CASES CHI TIẾT PRN232
${prnTestMd.replace(/# 📋 OmniCast — Danh Mục Test Cases Môn PRN232[\s\S]*?### Danh Mục Test Cases Chi Tiết/, '')}

\\newpage

---

# 📚 PHỤ LỤC B: MA TRẬN TEST CASES CHI TIẾT PRM393
${prmTestMd.replace(/# 📱 OmniCast — Danh Mục Test Cases Môn PRM393[\s\S]*?### Danh Mục Test Cases Chi Tiết/, '')}
`;

const tempMasterMd = path.join(baseDir, 'temp_master.md');
fs.writeFileSync(tempMasterMd, combinedMd, 'utf8');

try {
  console.log(`==> Generating Master DOCX via Pandoc...`);
  execSync(`pandoc "${tempMasterMd}" -o "${masterDocxFile}"`, { stdio: 'inherit' });
  console.log(`[OK] Master DOCX generated: ${masterDocxFile}`);

  const tempMasterBody = path.join(baseDir, 'temp_master_body.html');
  execSync(`pandoc "${tempMasterMd}" -o "${tempMasterBody}"`, { stdio: 'inherit' });
  const masterBody = fs.readFileSync(tempMasterBody, 'utf8');
  fs.unlinkSync(tempMasterBody);
  fs.unlinkSync(tempMasterMd);

  const fullMasterHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>OmniCast - Báo Cáo Kiểm Định Chất Lượng & Thực Thi Kiểm Thử Toàn Diện (Master QA & Testing Report)</title>
  <style>
${cssContent}
  </style>
</head>
<body>
  <div class="fptu-header">
    <div class="fptu-brand">
      FPT UNIVERSITY <span>|</span> FPTU QUY NHON AI CAMPUS
    </div>
    <div class="fptu-tag">FU CAHATA • PRN232 &amp; PRM393 MASTER DOSSIER</div>
  </div>

  <div class="content">
${masterBody}
  </div>

  <div style="margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 8pt; color: #64748b;">
    <div>OmniCast Enterprise Broadcast Intelligence Ecosystem - Quality Assurance Division</div>
    <div>FPTU Quy Nhon AI Campus - FU Cahata • Mentor: Thầy Huỳnh Vang</div>
  </div>
</body>
</html>`;

  fs.writeFileSync(masterHtmlFile, fullMasterHtml, 'utf8');
  console.log(`[OK] Master HTML generated: ${masterHtmlFile}`);

  console.log(`==> Printing Master PDF via Headless Edge...`);
  const masterUrl = 'file:///' + masterHtmlFile.replace(/\\/g, '/');
  const edgeCmd = `"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf-no-header --print-to-pdf="${masterPdfFile}" "${masterUrl}"`;
  execSync(edgeCmd, { stdio: 'inherit' });
  if (fs.existsSync(masterPdfFile)) {
    const stats = fs.statSync(masterPdfFile);
    console.log(`[OK] Master PDF generated: ${masterPdfFile} (${stats.size} bytes)`);
  }
} catch (e) {
  console.error(`[ERR] Master generation failed:`, e.message);
}

console.log(`\nAll document operations completed!`);

