const fs = require('fs');
const path = require('path');
const dir = path.resolve(__dirname, '..', '..', '02_Testing', 'test-results');
const file = path.join(dir, 'mobile-flutter.json');
const raw = fs.readFileSync(file);
let text = raw.toString('utf8');
if (text.indexOf('"type"') === -1) {
  // strip BOM, try utf16le
  text = raw.toString('utf16le');
}
const lines = text.split(/\r?\n/).filter(Boolean);
const objs = [];
for (const l of lines) {
  try { objs.push(JSON.parse(l)); } catch (e) { /* ignore */ }
}
const types = {};
for (const o of objs) types[o.type] = (types[o.type] || 0) + 1;
const td = objs.filter((o) => o.type === 'testDone');
const results = {};
for (const o of td) results[o.result] = (results[o.result] || 0) + 1;
const suites = new Set(objs.filter((o) => o.type === 'suite').map((o) => o.suite.id));
const testNames = objs.filter((o) => o.type === 'testStart').map((o) => o.test.name);
const failures = objs.filter((o) => o.type === 'error' || o.type === 'testDone' && o.result !== 'success');
console.log('types:', types);
console.log('results:', results);
console.log('total testDone:', td.length);
console.log('suites:', suites.size);
console.log('unique test names:', new Set(testNames).size);
// per-suite breakdown
const suiteById = {};
for (const o of objs) if (o.type === 'suite') suiteById[o.suite.id] = o.suite.path;
const bySuite = {};
for (const o of td) {
  const t = objs.find((x) => x.type === 'testStart' && x.test.id === o.testID);
  const p = t ? suiteById[t.test.suiteID] || '?' : '?';
  bySuite[p] = bySuite[p] || { pass: 0, fail: 0 };
  if (o.result === 'success') bySuite[p].pass++; else bySuite[p].fail++;
}
for (const k of Object.keys(bySuite).sort()) {
  console.log(k.replace(/^.*[\\/]mobile[\\/]/, ''), JSON.stringify(bySuite[k]));
}
