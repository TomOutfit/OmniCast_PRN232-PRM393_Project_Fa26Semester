const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const baseDir = path.resolve(__dirname);
const cssPath = path.join(baseDir, 'assets', 'shared', 'document_styles.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

const refDocs = [
  'DATABASE_DESIGN.md',
  'STREAMING_PLAN.md',
  'PRD.md',
  'Testing_Guide.md',
  'Work_Breakdown.md'
];

refDocs.forEach(file => {
  const mdPath = path.join(baseDir, '05_Reference_Docs', file);
  const baseName = path.basename(file, '.md');
  const htmlPath = path.join(baseDir, '05_Reference_Docs', baseName + '.html');
  const pdfPath = path.join(baseDir, '05_Reference_Docs', baseName + '.pdf');
  const docxPath = path.join(baseDir, '05_Reference_Docs', baseName + '.docx');

  console.log(`Processing Ref Doc: ${baseName}`);
  try {
    execSync(`pandoc "${mdPath}" -o "${docxPath}"`, { stdio: 'inherit' });
    console.log(`  [OK] DOCX: ${baseName}.docx`);

    const tempHtml = path.join(baseDir, `temp_${baseName}.html`);
    execSync(`pandoc "${mdPath}" -o "${tempHtml}"`, { stdio: 'inherit' });
    const body = fs.readFileSync(tempHtml, 'utf8');
    fs.unlinkSync(tempHtml);

    const fullHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>OmniCast - ${baseName}</title>
  <style>
${cssContent}
  </style>
</head>
<body>
  <div class="fptu-header">
    <div class="fptu-brand">FPT UNIVERSITY <span>|</span> FPTU QUY NHON AI CAMPUS</div>
    <div class="fptu-tag">FU CAHATA • REFERENCE DOCS</div>
  </div>
  <div class="content">
${body}
  </div>
  <div style="margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 8pt; color: #64748b;">
    <div>OmniCast Reference Documentation</div>
    <div>FPTU Quy Nhon AI Campus - FU Cahata • Mentor: Thầy Huỳnh Vang</div>
  </div>
</body>
</html>`;
    fs.writeFileSync(htmlPath, fullHtml, 'utf8');
    console.log(`  [OK] HTML: ${baseName}.html`);

    const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');
    execSync(`"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf-no-header --print-to-pdf="${pdfPath}" "${fileUrl}"`, { stdio: 'inherit' });
    console.log(`  [OK] PDF: ${baseName}.pdf`);
  } catch (e) {
    console.error(`  [ERR] ${baseName}:`, e.message);
  }
});

