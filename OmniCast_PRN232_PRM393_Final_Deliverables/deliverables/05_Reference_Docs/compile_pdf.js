const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const htmlPath = path.resolve(__dirname, 'OmniCast_Comprehensive_Project_Report.html');
const pdfPath = path.resolve(__dirname, 'OmniCast_Comprehensive_Project_Report.pdf');
const htmlUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

console.log('Compiling HTML to PDF...');
const cmd = `"${edgePath}" --headless --disable-gpu --run-all-compositor-stages-before-draw --print-to-pdf-no-header --print-to-pdf="${pdfPath}" "${htmlUrl}"`;
console.log('Running:', cmd);

try {
  execSync(cmd, { stdio: 'inherit' });
  if (fs.existsSync(pdfPath)) {
    const stats = fs.statSync(pdfPath);
    console.log(`SUCCESS: Generated PDF (${stats.size} bytes) at: ${pdfPath}`);
  } else {
    console.error('FAILED: Output PDF not found.');
    process.exit(1);
  }
} catch (err) {
  console.error('Error executing Edge command:', err);
  process.exit(1);
}
