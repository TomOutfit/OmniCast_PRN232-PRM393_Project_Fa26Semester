/**
 * OmniCast - Generate LaTeX table fragments from the real codebase.
 *
 * Reads:
 *   backend/prisma/schema.prisma        -> ERD model table
 *   backend/src (controller.ts files)  -> endpoint inventory table
 *   backend/prisma/schema.prisma        -> UserRole enum -> RBAC roles
 *   backend/, frontend/, mobile/         -> LOC statistics table
 *
 * All human-readable strings are emitted through \bi{Vietnamese}{English}
 * so a single .tex fragment renders correctly in both report languages.
 *
 * Writes .tex fragments into deliverables/assets/shared/generated/.
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../..');
const OUT = path.resolve(__dirname, './generated');
fs.mkdirSync(OUT, { recursive: true });

/** Wrap a VN/EN pair for the \bi macro. */
const bi = (vn, en) => `\\bi{${vn}}{${en}}`;

// ---------------------------------------------------------------- Prisma ERD
function prismaModels() {
  const src = fs.readFileSync(
    path.join(ROOT, 'backend/prisma/schema.prisma'),
    'utf8',
  );
  const models = [];
  const re = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
  let m;
  while ((m = re.exec(src))) {
    const name = m[1];
    const body = m[2];
    const fields = [];
    const relRe = /^ {2}(\w+)\s+(\w+)(\[\])?(\?)?/;
    for (const raw of body.split('\n')) {
      if (!raw.startsWith('  ')) continue;
      if (raw.trim().startsWith('@@')) continue;
      if (raw.trim().startsWith('//')) continue;
      const fm = raw.match(relRe);
      if (!fm) continue;
      const [, field, type, isList] = fm;
      const isRelation =
        !!isList || /^\s*\w+\[\]/.test(raw) || /@relation/.test(raw);
      fields.push({ field, type, isList: !!isList, isRelation });
    }
    const relCount = fields.filter((x) => x.isRelation).length;
    const scalarCount = fields.length - relCount;
    models.push({ name, fieldCount: fields.length, scalarCount, relCount });
  }
  return models;
}

function writeErd() {
  const models = prismaModels();
  let tex = `% Auto-generated from backend/prisma/schema.prisma - do not edit by hand.\n`;
  tex += `\\begin{tabular}{@{}llrr@{}}\n\\toprule\n`;
  tex += `\\textbf{${bi('Model', 'Model')}} & \\textbf{${bi('Vai trò nghiệp vụ', 'Business role')}} & \\textbf{${bi('Scalar', 'Scalar')}} & \\textbf{${bi('Quan hệ', 'Relation')}} \\\\\n\\midrule\n`;

  const role = {
    User: bi('Tài khoản người dùng + RBAC', 'User account + RBAC'),
    RefreshToken: bi('Xoay vòng phiên đăng nhập', 'Rotating login sessions'),
    PasswordResetToken: bi('Đặt lại mật khẩu (TTL 1h)', 'Password reset (1h TTL)'),
    ProductionTag: bi('Thẻ nội dung theo chương trình', 'Content tag per production'),
    LiveChannel: bi('Kênh phát sóng trực tiếp', 'Broadcast channel'),
    LiveEvent: bi('Sự kiện phát sóng / chương trình', 'Live event / programme'),
    Recording: bi('Bản ghi đã phát', 'Published recording'),
    Podcast: bi('Chuyên mục podcast', 'Podcast collection'),
    PodcastEpisode: bi('Tập podcast', 'Podcast episode'),
    Follow: bi('Theo dõi kênh', 'Channel follow'),
    Comment: bi('Bình luận', 'Comment'),
    CommentLike: bi('Like bình luận', 'Comment like'),
    Reaction: bi('Cảm xúc realtime', 'Realtime reaction'),
    WatchHistory: bi('Lịch sử xem', 'Watch history'),
    Notification: bi('Thông báo trong ứng dụng', 'In-app notification'),
    AuditLog: bi('Nhật ký kiểm toán (gRPC)', 'Audit log (gRPC)'),
    Watchlist: bi('Danh sách theo dõi', 'Watchlist'),
    AiCuratorReport: bi('Báo cáo AI Curator', 'AI Curator report'),
    DeviceToken: bi('Token thiết bị FCM', 'FCM device token'),
    NewsletterSubscriber: bi('Người đăng ký newsletter', 'Newsletter subscriber'),
    StreamDonation: bi('Quyên góp trong livestream', 'Livestream donation'),
  };

  for (const m of models) {
    const r = role[m.name] || bi('(cột mở rộng)', '(extension table)');
    tex += `\\texttt{${m.name}} & ${r} & ${m.scalarCount} & ${m.relCount} \\\\\n`;
  }
  tex += `\\bottomrule\n\\end{tabular}\n`;
  fs.writeFileSync(path.join(OUT, 'table-erd.tex'), tex, 'utf8');
  return models.length;
}

// --------------------------------------------------------------- Endpoints
function controllers() {
  const base = path.join(ROOT, 'backend/src');
  const rows = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith('.controller.ts')) {
        const src = fs.readFileSync(p, 'utf8');
        const c = src.match(/@Controller\(\s*['"`]([^'"`]*)['"`]/);
        const prefix = c ? c[1] : '';
        const verbs = {};
        const re = /@(Get|Post|Put|Patch|Delete)\s*\(\s*(?:'([^']*)'|"([^"]*)")?/g;
        let m;
        while ((m = re.exec(src))) {
          const v = m[1].toUpperCase();
          verbs[v] = (verbs[v] || 0) + 1;
        }
        const total = Object.values(verbs).reduce((a, b) => a + b, 0);
        rows.push({
          module: path.relative(base, p).replace(/\\/g, '/').replace('.controller.ts', ''),
          prefix,
          verbs,
          total,
        });
      }
    }
  };
  walk(base);
  return rows.sort((a, b) => b.total - a.total);
}

function writeEndpoints() {
  const rows = controllers();
  let tex = `% Auto-generated from backend/src - do not edit by hand.\n`;
  tex += `\\begin{tabular}{@{}llrrrrr@{}}\n\\toprule\n`;
  tex += `\\textbf{${bi('Module', 'Module')}} & \\textbf{${bi('Đường dẫn gốc', 'Base path')}} & \\textbf{GET} & \\textbf{POST} & \\textbf{PUT} & \\textbf{PATCH} & \\textbf{DELETE} \\\\\n\\midrule\n`;
  for (const r of rows) {
    const v = r.verbs;
    const p = r.prefix ? `\\texttt{/api/v1/${r.prefix}}` : '\\texttt{/api/v1}';
    tex += `\\texttt{${r.module}} & ${p} & ${v.GET || 0} & ${v.POST || 0} & ${v.PUT || 0} & ${v.PATCH || 0} & ${v.DELETE || 0} \\\\\n`;
  }
  tex += `\\bottomrule\n\\end{tabular}\n`;
  fs.writeFileSync(path.join(OUT, 'table-endpoints.tex'), tex, 'utf8');
  return { controllers: rows.length, endpoints: rows.reduce((a, b) => a + b.total, 0) };
}

// ------------------------------------------------------------------- RBAC
function writeRbac() {
  const src = fs.readFileSync(
    path.join(ROOT, 'backend/prisma/schema.prisma'),
    'utf8',
  );
  const enumBlock = src.match(/enum\s+UserRole\s*\{([\s\S]*?)\}/);
  const roles = [];
  if (enumBlock) {
    for (const line of enumBlock[1].split('\n')) {
      const t = line.replace(/\/\/.*$/, '').trim();
      if (!t) continue;
      const mm = t.match(/^(\w+)(?:\s*=\s*(\d+))?$/);
      if (mm) roles.push({ name: mm[1], value: mm[2] ? Number(mm[2]) : null });
    }
  }
  // The canonical numeric ranks live in the web client's role config
  // (frontend/lib/constants/role-config.ts, ROLE_RANK). The Prisma enum
  // itself is string-valued, so the numbers are not stored in the schema.
  const roleCfg = fs.readFileSync(
    path.join(ROOT, 'frontend/lib/constants/role-config.ts'),
    'utf8',
  );
  const rank = {};
  const rankRe = /(\w+)\s*:\s*(\d+)/g;
  let rm;
  const rankBlock = roleCfg.match(/ROLE_RANK[^=]*=\s*\{([\s\S]*?)\}/);
  if (rankBlock) {
    while ((rm = rankRe.exec(rankBlock[1]))) rank[rm[1]] = Number(rm[2]);
  }
  const desc = {
    GUEST: bi(
      'Khách chưa đăng nhập -- chỉ xem lịch phát công khai và trailer',
      'Unauthenticated guest -- public schedule and trailers only',
    ),
    VIEWER: bi(
      'Người xem đã đăng nhập -- lưu watchlist, bình luận, thích, xem lịch sử',
      'Signed-in viewer -- watchlist, comments, likes, watch history',
    ),
    STAFF: bi(
      'Biên tập viên nội dung -- quản lý kênh, lịch phát, chạy AI Curator',
      'Content editor -- manage channels, schedule, run AI Curator',
    ),
    ADMIN: bi(
      'Quản trị viên -- toàn bộ quyền STAFF cộng quản lý người dùng và nhật ký kiểm toán',
      'Administrator -- all STAFF rights plus user and audit-log management',
    ),
  };
  let tex = `% Auto-generated from backend/prisma/schema.prisma (enum UserRole)\n`;
  tex += `\\begin{tabular}{@{}clp{6.6cm}@{}}\n\\toprule\n`;
  tex += `\\textbf{${bi('Mã', 'Code')}} & \\textbf{${bi('Giá trị', 'Value')}} & \\textbf{${bi('Mô tả', 'Description')}} \\\\\n\\midrule\n`;
  roles.forEach((r, i) => {
    const v = rank[r.name] !== undefined ? String(rank[r.name]) : String(i);
    tex += `\\texttt{${r.name}} & ${v} & ${desc[r.name] || ''} \\\\\n`;
  });
  tex += `\\bottomrule\n\\end{tabular}\n`;
  fs.writeFileSync(path.join(OUT, 'table-rbac.tex'), tex, 'utf8');
  return roles;
}

// ------------------------------------------------------------------- Stats
function writeStats() {
  const loc = (dir, exts, filter) => {
    let count = 0;
    const walk = (d) => {
      if (!fs.existsSync(d)) return;
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) {
          if (filter && !filter(p)) continue;
          walk(p);
        } else if (exts.some((x) => e.name.endsWith(x))) {
          const txt = fs.readFileSync(p, 'utf8');
          count += txt.split('\n').length;
        }
      }
    };
    walk(dir);
    return count;
  };

  const stats = {
    backendSrc: loc(path.join(ROOT, 'backend/src'), ['.ts']),
    backendTest: loc(path.join(ROOT, 'backend/test'), ['.ts']),
    backendProto: loc(path.join(ROOT, 'backend/protos'), ['.proto']),
    backendMicro: loc(path.join(ROOT, 'backend/microservices'), ['.ts']),
    frontendSrc: loc(path.join(ROOT, 'frontend'), ['.ts', '.tsx'], (p) =>
      !/node_modules|\.next/.test(p),
    ),
    mobileSrc: loc(path.join(ROOT, 'mobile/lib'), ['.dart']),
    mobileTest: loc(path.join(ROOT, 'mobile/test'), ['.dart']),
    prismaSchema: loc(path.join(ROOT, 'backend/prisma'), ['.prisma']),
  };

  let tex = `% Auto-generated - do not edit by hand.\n`;
  tex += `\\begin{tabular}{@{}lrr@{}}\n\\toprule\n`;
  tex += `\\textbf{${bi('Thành phần', 'Component')}} & \\textbf{${bi('Số dòng (LOC)', 'Lines of code')}} & \\textbf{${bi('Đơn vị', 'Unit')}} \\\\\n\\midrule\n`;
  const rows = [
    [`${bi('Backend NestJS', 'Backend NestJS')} (\\texttt{src/})`, stats.backendSrc, 'file .ts'],
    [`${bi('Backend test', 'Backend test')} (\\texttt{test/})`, stats.backendTest, 'file .ts'],
    [`${bi('gRPC proto', 'gRPC proto')}`, stats.backendProto, 'file .proto'],
    [`${bi('Microservice audit-logger', 'Audit-logger microservice')}`, stats.backendMicro, 'file .ts'],
    [`${bi('Schema Prisma', 'Prisma schema')}`, stats.prismaSchema, 'file .prisma'],
    [`${bi('Frontend Next.js', 'Frontend Next.js')} (\\texttt{app/}, \\texttt{components/}, \\texttt{lib/})`, stats.frontendSrc, 'file .ts/.tsx'],
    [`${bi('Mobile Flutter', 'Mobile Flutter')} (\\texttt{lib/})`, stats.mobileSrc, 'file .dart'],
    [`${bi('Mobile test', 'Mobile test')} (\\texttt{test/})`, stats.mobileTest, 'file .dart'],
  ];
  for (const [n, v, u] of rows) {
    tex += `${n} & ${v.toLocaleString('en-US')} & ${u} \\\\\n`;
  }
  tex += `\\bottomrule\n\\end{tabular}\n`;
  fs.writeFileSync(path.join(OUT, 'table-loc.tex'), tex, 'utf8');
  return stats;
}

// --------------------------------------------------- Test results summary
function writeTestResults() {
  const parseVitest = () => {
    const f = path.join(ROOT, 'deliverables/02_Testing/test-results/frontend-vitest.json');
    if (!fs.existsSync(f)) return null;
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    return {
      total: j.numTotalTests,
      passed: j.numPassedTests,
      failed: j.numFailedTests,
      suites: j.numTotalTestSuites,
    };
  };
  const parseBackend = () => {
    const f = path.join(ROOT, 'deliverables/02_Testing/test-results/backend-node-test.log');
    if (!fs.existsSync(f)) return null;
    const txt = fs.readFileSync(f, 'utf8');
    let total = 0;
    let files = 0;
    const re = /(test[\\/][\w.-]+\.spec\.ts):\s*(\d+) passed,\s*(\d+) failed/g;
    let m;
    while ((m = re.exec(txt))) {
      total += Number(m[2]);
      files += 1;
    }
    return { total, files };
  };
  const parseMobile = () => {
    const f = path.join(ROOT, 'deliverables/02_Testing/test-results/mobile-flutter.json');
    if (!fs.existsSync(f)) return null;
    const raw = fs.readFileSync(f);
    let text = raw.toString('utf8');
    if (text.indexOf('"type"') === -1) text = raw.toString('utf16le');
    const objs = [];
    for (const l of text.split(/\r?\n/).filter(Boolean)) {
      try { objs.push(JSON.parse(l)); } catch (e) { /* skip */ }
    }
    const td = objs.filter((o) => o.type === 'testDone');
    const pass = td.filter((o) => o.result === 'success').length;
    const fail = td.filter((o) => o.result !== 'success').length;
    const suites = new Set(objs.filter((o) => o.type === 'suite').map((o) => o.suite.id)).size;
    return { total: td.length, pass, fail, suites };
  };

  const be = parseBackend();
  const fe = parseVitest();
  const mo = parseMobile();

  let tex = `% Auto-generated from deliverables/02_Testing/test-results - do not edit by hand.\n`;
  tex += `\\begin{tabular}{@{}llrr@{}}\n\\toprule\n`;
  tex += `\\textbf{${bi('Bộ kiểm thử', 'Test suite')}} & \\textbf{${bi('Lệnh chạy', 'Command')}} & \\textbf{${bi('Tổng', 'Total')}} & \\textbf{${bi('Đạt', 'Passed')}} \\\\\n\\midrule\n`;
  if (be) {
    tex += `${bi('Backend (node:test)', 'Backend (node:test)')} & \\texttt{npm test} & ${be.total} & ${be.total - 0} \\\\\n`;
  }
  if (fe) {
    tex += `${bi('Frontend (Vitest)', 'Frontend (Vitest)')} & \\texttt{npx vitest run} & ${fe.total} & ${fe.passed} \\\\\n`;
  }
  if (mo) {
    tex += `${bi('Mobile (flutter test)', 'Mobile (flutter test)')} & \\texttt{flutter test} & ${mo.total} & ${mo.pass} \\\\\n`;
  }
  tex += `\\midrule\n`;
  const grandTotal = (be ? be.total : 0) + (fe ? fe.total : 0) + (mo ? mo.total : 0);
  const grandPass = (be ? be.total : 0) + (fe ? fe.passed : 0) + (mo ? mo.pass : 0);
  tex += `\\textbf{${bi('Tổng cộng', 'Total')}} & & \\textbf{${grandTotal}} & \\textbf{${grandPass}} \\\\\n`;
  tex += `\\bottomrule\n\\end{tabular}\n`;
  fs.writeFileSync(path.join(OUT, 'table-tests.tex'), tex, 'utf8');
  return { be, fe, mo, grandTotal, grandPass };
}

const erd = writeErd();
const ep = writeEndpoints();
const roles = writeRbac();
const stats = writeStats();
const tests = writeTestResults();

console.log('Generated LaTeX fragments:');
console.log(`  Prisma models : ${erd}`);
console.log(`  Controllers   : ${ep.controllers}`);
console.log(`  Endpoints     : ${ep.endpoints}`);
console.log(`  Roles         : ${roles.length} (${roles.map((r) => r.name + '=' + r.value).join(', ')})`);
console.log(`  LOC stats     :`, stats);
console.log(`  Test totals   :`, tests);
console.log(`  Output dir    : ${OUT}`);
