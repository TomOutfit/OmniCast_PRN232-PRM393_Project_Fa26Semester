#!/usr/bin/env node
// ============================================================
// `proto:sync` — keep this microservice's protos/ in sync with the
// canonical copy at `backend/protos/audit_logger.proto`.
// ============================================================

const fs = require('node:fs');
const path = require('node:path');

const target = path.join(__dirname, '..', 'protos', 'audit_logger.proto');

const candidates = [
  path.join(__dirname, '..', '..', '..', 'protos', 'audit_logger.proto'),
  path.join(process.cwd(), '..', '..', '..', 'protos', 'audit_logger.proto'),
  path.join(process.cwd(), 'protos', 'audit_logger.proto'),
];

const source = candidates.find((p) => {
  try {
    return fs.statSync(p).isFile();
  } catch (_) {
    return false;
  }
});

if (!source) {
  console.warn(
    '[proto:sync] Source file not found, skipping (proto definitions already in place).',
  );
  process.exit(0);
}

const content = fs.readFileSync(source, 'utf-8');
fs.writeFileSync(target, content, 'utf-8');
console.log(`[proto:sync] Synced ${source} → ${target}`);
