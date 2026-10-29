// Check brace balance of a .tex file, ignoring escaped braces.
// A '%' always starts a LaTeX comment to end of line.
const fs = require('fs');
const files = process.argv.slice(2);
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/);
  let depth = 0;
  const bad = [];
  lines.forEach((line, i) => {
    let d = depth;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '\\') { j++; continue; }
      if (c === '%') break;
      if (c === '{') d++;
      else if (c === '}') d--;
    }
    if (d < 0) { bad.push([i + 1, 'NEGATIVE', line.trim().slice(0, 90)]); d = 0; }
    depth = d;
  });
  const status = depth === 0 && bad.length === 0 ? 'OK' : 'PROBLEM';
  console.log(`${status.padEnd(8)} depth=${depth} ${f}`);
  for (const b of bad) console.log('         ', b.join(' | '));
}
