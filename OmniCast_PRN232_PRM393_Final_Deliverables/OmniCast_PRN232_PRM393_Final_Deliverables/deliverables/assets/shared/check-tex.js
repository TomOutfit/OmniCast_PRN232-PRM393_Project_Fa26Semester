// Validate LaTeX sources for the OmniCast reports.
//
//  1. Checks that every \bi{...}{...} call is well formed: the first
//     argument must be a single balanced group and the second argument
//     must follow immediately.
//  2. Reports the running brace depth so unbalanced files are obvious.
//
// Usage: node check-tex.js file.tex [...]
const fs = require('fs');

/** Remove LaTeX comments (% to end of line), keeping newlines for offsets. */
function stripComments(src) {
  let out = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '\\') { out += c + (src[i + 1] || ''); i++; continue; }
    if (c === '%') {
      while (i < src.length && src[i] !== '\n') i++;
      out += '\n';
      continue;
    }
    out += c;
  }
  return out;
}

/** Parse a balanced group starting at index i (src[i] === '{'). */
function groupEnd(src, i) {
  let d = 0;
  for (let k = i; k < src.length; k++) {
    const c = src[k];
    if (c === '\\') { k++; continue; }
    if (c === '{') d++;
    else if (c === '}') { d--; if (d === 0) return k; }
  }
  return -1;
}

const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;

let failures = 0;
for (const file of process.argv.slice(2)) {
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  const problems = [];

  // ---- check \bi usage -------------------------------------------------
  let idx = 0;
  while (true) {
    const at = src.indexOf('\\bi', idx);
    if (at === -1) break;
    // Skip the macro definition itself: \newcommand{\bi}[2]{...}
    if (src.slice(Math.max(0, at - 20), at).includes('newcommand{')) {
      idx = at + 3;
      continue;
    }
    const after = src[at + 3];
    if (after && /[a-zA-Z]/.test(after)) { idx = at + 3; continue; }
    let p = at + 3;
    while (p < src.length && /\s/.test(src[p])) p++;
    if (src[p] !== '{') {
      problems.push(`L${lineOf(src, at)}: \\bi not followed by '{'`);
      idx = at + 3;
      continue;
    }
    const e1 = groupEnd(src, p);
    if (e1 === -1) {
      problems.push(`L${lineOf(src, at)}: \\bi first argument never closed`);
      break;
    }
    let q = e1 + 1;
    while (q < src.length && /\s/.test(src[q])) q++;
    if (src[q] !== '{') {
      problems.push(
        `L${lineOf(src, at)}: \\bi second argument missing (first arg = "${src.slice(p, e1 + 1).replace(/\s+/g, ' ').slice(0, 70)}")`,
      );
    }
    idx = e1 + 1;
  }

  // ---- running brace depth --------------------------------------------
  let depth = 0;
  let firstBad = null;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === '\\') { i++; continue; }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth < 0 && !firstBad) firstBad = lineOf(src, i);
    }
  }
  if (depth !== 0) problems.push(`final brace depth = ${depth} (expected 0)`);
  if (firstBad) problems.push(`brace depth went negative at L${firstBad}`);

  if (problems.length) {
    failures++;
    console.log(`\n### ${file}`);
    for (const p of problems) console.log('   ', p);
  }
}
console.log(failures === 0 ? '\nAll LaTeX sources OK.' : `\n${failures} file(s) with problems.`);
process.exit(failures === 0 ? 0 : 1);
