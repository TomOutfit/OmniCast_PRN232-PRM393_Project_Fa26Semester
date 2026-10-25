'use client';

// ============================================================
// OmniCast · Developer Documentation & Architecture Portal
// ============================================================

import * as React from 'react';
import Link from 'next/link';
import { Page3DHero } from '@/components/three';
import {
  BookOpen,
  Terminal,
  Cpu,
  Layers,
  Database,
  Radio,
  Shield,
  Check,
  Copy,
  ChevronLeft,
  Search,
  ExternalLink,
  Code2,
  Server,
  Zap,
  TestTube2,
  FileCode2,
  Sparkles,
} from 'lucide-react';

interface CodeSnippetProps {
  code: string;
  language?: string;
  title?: string;
}

function CodeSnippet({ code, language = 'bash', title }: CodeSnippetProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/80 overflow-hidden my-3">
      {title && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.08] bg-white/[0.02]">
          <span className="font-mono text-[11px] text-cyan-300 font-semibold">{title}</span>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-white transition"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Đã chép</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Sao chép</span>
              </>
            )}
          </button>
        </div>
      )}
      <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed text-slate-300">
        <code>{code}</code>
      </pre>
    </div>
  );
}

const DOC_SECTIONS = [
  { id: 'quickstart', label: '1. Khởi Động Nhanh (Quick Start)', icon: Terminal },
  { id: 'architecture', label: '2. Kiến Trúc Hệ Thống (Architecture)', icon: Layers },
  { id: 'ai-curator', label: '3. Động Cơ AI Curator (Dual-Mode)', icon: Cpu },
  { id: 'grpc', label: '4. Microservice gRPC Audit Logger', icon: Server },
  { id: 'cloudinary', label: '5. Live Studio & Cloud Direct-Upload', icon: Radio },
  { id: 'testing', label: '6. Chiến Lược Kiểm Thử (Testing Guide)', icon: TestTube2 },
  { id: 'apis', label: '7. Danh Mục API Endpoints RESTful', icon: FileCode2 },
];

export default function DocsPage() {
  const [activeTab, setActiveTab] = React.useState('quickstart');
  const [searchFilter, setSearchFilter] = React.useState('');

  const filteredSections = DOC_SECTIONS.filter((s) =>
    s.label.toLowerCase().includes(searchFilter.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-[#050810]/60 backdrop-blur-[1px] text-slate-200 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* ── 3D Cyber Monolith Hero ────────────────────────────────── */}
      <Page3DHero
        variant="cyber"
        headline="OMNICAST DEV HUB"
        subline="Kiến trúc Microservices & Động cơ AI Intelligence"
        height={320}
      />

      {/* ── Top Navigation Bar ───────────────────────────────────── */}
      <div className="border-b border-white/[0.08] bg-[#070b14]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Về trang chủ</span>
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-xs font-mono font-medium text-cyan-400">
              Developer Documentation
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/help"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition"
            >
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span>Trung tâm trợ giúp (/help)</span>
            </Link>
            <Link
              href="/standards"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition"
            >
              <Radio className="h-3.5 w-3.5 text-emerald-400" />
              <span>Tiêu chuẩn phát sóng</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-10">
        {/* ── Hero Banner ─────────────────────────────────────────── */}
        <header className="rounded-3xl card-3d-surface border border-primary-500/20 p-6 sm:p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 px-3 py-0.5 text-[11px] font-mono font-bold tracking-wider uppercase text-cyan-300 shadow-[0_0_10px_rgba(0,242,254,0.2)]">
                <Code2 className="h-3 w-3" />
                OmniCast Engineering Portal · PRN232 + PRM393
              </span>
              <span className="inline-flex items-center rounded-full bg-white/[0.06] border border-white/10 px-2.5 py-0.5 text-[11px] font-mono text-slate-300">
                Release v2.4 (Oct 2026)
              </span>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-[11px] font-mono text-emerald-400">
                NestJS 10 + Next.js 14 + Flutter 3
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-3">
              Tài Liệu Kỹ Thuật & Kiến Trúc Hệ Thống
            </h1>
            <p className="text-sm sm:text-base text-slate-300 max-w-3xl leading-relaxed">
              Tổng hợp kiến trúc phân tán, đặc tả microservice gRPC, quy chuẩn động cơ AI Curator,
              pipeline CDN truyền tải video và tài liệu API RESTful dành cho kỹ sư phát triển.
            </p>
          </div>
        </header>

        {/* ── Main Two-Column Layout (Sidebar + Content) ──────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sidebar Nav */}
          <aside className="lg:col-span-3 space-y-4 sticky top-20">
            <div className="rounded-2xl border border-primary-500/20 card-3d-surface p-3.5 backdrop-blur-xl">
              <div className="relative mb-3">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-primary-400" />
                <input
                  type="text"
                  placeholder="Lọc tài liệu..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-dark-900/90 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60 shadow-inner"
                />
              </div>

              <nav className="space-y-1">
                {filteredSections.map((sec) => {
                  const Icon = sec.icon;
                  const isActive = activeTab === sec.id;
                  return (
                    <button
                      key={sec.id}
                      onClick={() => setActiveTab(sec.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium text-left transition cursor-pointer ${
                        isActive
                          ? 'btn-3d-cyan text-white font-bold shadow-md'
                          : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{sec.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Quick Tech Specs Card */}
            <div className="rounded-2xl border border-white/10 card-3d-surface p-4 text-xs space-y-2">
              <h4 className="font-bold text-cyan-400 uppercase tracking-wider font-mono text-[10px]">
                Công nghệ cốt lõi
              </h4>
              <ul className="space-y-1 text-slate-300 text-[11px] font-mono">
                <li>• Backend: NestJS 10, TypeScript</li>
                <li>• Frontend: Next.js 14, Tailwind</li>
                <li>• Mobile: Flutter 3.x, BLoC</li>
                <li>• Database: Supabase PostgreSQL</li>
                <li>• Microservice: Standalone gRPC</li>
                <li>• CDN Media: Bunny Stream & Cloudinary</li>
              </ul>
            </div>
          </aside>

          {/* Main Docs Content Panel */}
          <main className="lg:col-span-9 min-w-0 space-y-8">
            {/* ── Section 1: Quick Start ─────────────────────────── */}
            {activeTab === 'quickstart' && (
              <section className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-2.5 text-cyan-400">
                  <Terminal className="h-6 w-6" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    1. Khởi Động Nhanh (Quick Start) Trong 5 Phút
                  </h2>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Dự án OmniCast gồm ba phân hệ độc lập: <code>backend</code> (NestJS API),{' '}
                  <code>frontend</code> (Next.js Web Client), và <code>mobile</code> (Flutter App).
                  Dưới đây là các lệnh khởi động đồng thời cả 3 môi trường:
                </p>

                <div className="space-y-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs flex items-center justify-center">
                      1
                    </span>
                    Khởi động Backend NestJS API
                  </h3>
                  <CodeSnippet
                    title="Terminal 1 — Backend (Port 3000 / 3001)"
                    code={`cd backend
npm install
cp .env.example .env
npx prisma generate
npm run start:dev`}
                  />

                  <h3 className="text-base font-bold text-white flex items-center gap-2 pt-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs flex items-center justify-center">
                      2
                    </span>
                    Khởi động Frontend Next.js Client
                  </h3>
                  <CodeSnippet
                    title="Terminal 2 — Frontend (Port 3001)"
                    code={`cd frontend
npm install
npm run dev`}
                  />

                  <h3 className="text-base font-bold text-white flex items-center gap-2 pt-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 font-mono text-xs flex items-center justify-center">
                      3
                    </span>
                    Khởi động Mobile Flutter App
                  </h3>
                  <CodeSnippet
                    title="Terminal 3 — Mobile (Flutter)"
                    code={`cd mobile
flutter pub get
flutter run`}
                  />
                </div>
              </section>
            )}

            {/* ── Section 2: Architecture ────────────────────────── */}
            {activeTab === 'architecture' && (
              <section className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-2.5 text-purple-400">
                  <Layers className="h-6 w-6" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    2. Kiến Trúc Hệ Thống Phân Tán (System Architecture)
                  </h2>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  OmniCast được thiết kế theo mô hình Microservice kết hợp API Gateway chịu tải cao,
                  phân tách độc lập giữa luồng điều phối nghiệp vụ và luồng truyền tải video streaming
                  siêu tốc:
                </p>

                {/* Architecture Visual Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 space-y-2">
                    <div className="font-bold text-cyan-300 text-sm">CLIENT TIER</div>
                    <p className="text-slate-400 font-sans">
                      Next.js 14 Web (Desktop & Mobile Browser) + Flutter Mobile (iOS & Android).
                    </p>
                    <div className="text-[10px] text-cyan-400">ABR Video Player · BLoC State</div>
                  </div>

                  <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-2">
                    <div className="font-bold text-purple-300 text-sm">GATEWAY & CORE</div>
                    <p className="text-slate-400 font-sans">
                      NestJS Core API Gateway (RBAC Guards, Auth JWT, EPG Scheduler, AI Curator).
                    </p>
                    <div className="text-[10px] text-purple-400">HTTP REST · gRPC Client</div>
                  </div>

                  <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
                    <div className="font-bold text-emerald-300 text-sm">DATA & MEDIA CDN</div>
                    <p className="text-slate-400 font-sans">
                      Supabase PostgreSQL, gRPC Audit-Logger, Bunny Stream CDN & Cloudinary Direct.
                    </p>
                    <div className="text-[10px] text-emerald-400">SOC2 Certified · HLS 4K</div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-white/10 bg-slate-950/80 space-y-2 text-xs text-slate-300">
                  <h4 className="font-bold text-white text-sm">Cơ chế bảo vệ luồng & Giới hạn tải:</h4>
                  <ul className="space-y-1 list-disc pl-4 text-slate-400">
                    <li>
                      <strong>CORS Hardening:</strong> Kiểm soát nghiêm ngặt tên miền truy cập qua
                      biến <code>FRONTEND_URL</code>, tự động chặn Origin lạ trong môi trường
                      Production.
                    </li>
                    <li>
                      <strong>Rate Limiting:</strong> Bảo vệ API đăng nhập và quên mật khẩu bằng
                      ThrottlerGuard (tối đa 5 yêu cầu/phút trên mỗi IP).
                    </li>
                    <li>
                      <strong>Fail-Open gRPC:</strong> Khi microservice audit logger tạm thời không
                      khả dụng, hệ thống core backend ghi log fallback cục bộ mà không làm gián đoạn
                      trải nghiệm khán giả.
                    </li>
                  </ul>
                </div>
              </section>
            )}

            {/* ── Section 3: AI Curator ──────────────────────────── */}
            {activeTab === 'ai-curator' && (
              <section className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-2.5 text-cyan-400">
                  <Cpu className="h-6 w-6" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    3. Động Cơ AI Curator (Dual-Mode Intelligence)
                  </h2>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Động cơ <strong>AI Curator</strong> là giải pháp trí tuệ nhân tạo chuyên biệt được
                  tích hợp trong OmniCast nhằm giải quyết bài toán kiểm duyệt tự động hàng nghìn giờ
                  phát sóng:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/40 space-y-2">
                    <span className="font-mono font-bold text-cyan-300 text-xs">
                      CHẾ ĐỘ 1 · FAST HEURISTICS
                    </span>
                    <p className="text-slate-400 leading-relaxed">
                      Phản hồi cực nhanh trong &lt;40ms. Quét từ khóa vi phạm, kiểm tra mã hash bản
                      quyền âm thanh, nhận diện logo kênh và đối chiếu metadata EPG.
                    </p>
                  </div>
                  <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/40 space-y-2">
                    <span className="font-mono font-bold text-purple-300 text-xs">
                      CHẾ ĐỘ 2 · DEEP MULTI-MODEL LLM
                    </span>
                    <p className="text-slate-400 leading-relaxed">
                      Phân tích ngữ cảnh sâu, cảm xúc người dẫn chương trình, phân loại độ tuổi P, K,
                      T13, T16, T18 và tự động xuất bản báo cáo khuyến nghị cho ban biên tập.
                    </p>
                  </div>
                </div>

                <CodeSnippet
                  title="Prisma Schema · AI Curator Telemetry Table"
                  language="prisma"
                  code={`model AiCuratorReport {
  id              String       @id @default(uuid())
  liveEventId     String?      @map("live_event_id")
  confidenceScore Float        @map("confidence_score")
  riskLevel       String       @map("risk_level") // LOW, MEDIUM, HIGH
  ratingRecommend String       @map("rating_recommend") // P, K, T13, T16, T18
  cached          Boolean      @default(false)
  cachedAt        DateTime?    @map("cached_at")
  createdAt       DateTime     @default(now()) @map("created_at")
}`}
                />
              </section>
            )}

            {/* ── Section 4: gRPC Microservice ───────────────────── */}
            {activeTab === 'grpc' && (
              <section className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-2.5 text-amber-400">
                  <Server className="h-6 w-6" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    4. Microservice gRPC Audit Logger
                  </h2>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Nhật ký kiểm toán an ninh được tách biệt thành một standalone microservice độc lập tại{' '}
                  <code>backend/microservices/audit-logger/</code>, giao tiếp với Core API qua giao
                  thức nhị phân siêu tốc HTTP/2 gRPC Protocol Buffers:
                </p>

                <CodeSnippet
                  title="audit_logger.proto"
                  language="protobuf"
                  code={`syntax = "proto3";
package audit;

service AuditLogger {
  rpc Write(AuditEntry) returns (WriteResponse);
  rpc Stream(StreamFilter) returns (stream AuditEntry);
}

message AuditEntry {
  string id = 1;
  string action = 2; // LOGIN, LOGOUT, CREATE_PROGRAM, AI_CURATE
  string userId = 3;
  string userRole = 4;
  string entityId = 5;
  string timestamp = 6;
  string metadataJson = 7;
}`}
                />

                <p className="text-xs text-slate-400 leading-relaxed">
                  Microservice được đóng gói bằng <strong>Dockerfile Distroless</strong> siêu nhẹ,
                  giảm thiểu bề mặt tấn công bảo mật và tối ưu hóa tài nguyên RAM khi chạy trên nền tảng
                  Render hoặc Docker Compose.
                </p>
              </section>
            )}

            {/* ── Section 5: Cloudinary Direct Upload ─────────────── */}
            {activeTab === 'cloudinary' && (
              <section className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-2.5 text-emerald-400">
                  <Radio className="h-6 w-6" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    5. Live Studio & Cloud Direct-Upload Architecture
                  </h2>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Vercel Serverless Functions áp dụng giới hạn kích thước gói tin gửi lên (Payload
                  Limit) tối đa <strong>4.5MB</strong>. Để cho phép Đạo diễn tải lên các bản ghi
                  Full HD có dung lượng hàng trăm Megabyte, OmniCast áp dụng mô hình{' '}
                  <strong>Signed Direct-Upload</strong>:
                </p>

                <div className="p-4 rounded-xl border border-white/10 bg-slate-950/80 space-y-3 text-xs text-slate-300">
                  <h4 className="font-bold text-cyan-300 text-sm">Quy trình 3 bước tải trực tiếp:</h4>
                  <ol className="space-y-1.5 list-decimal pl-4 text-slate-400">
                    <li>
                      <strong>Bước 1 (Client):</strong> Client gửi yêu cầu cấp chữ ký tạm thời đến{' '}
                      <code>GET /api/studio/upload-signature</code>.
                    </li>
                    <li>
                      <strong>Bước 2 (Direct Post):</strong> Client tải trực tiếp file video từ trình
                      duyệt lên máy chủ CDN Cloudinary kèm chữ ký SHA-256 (bỏ qua hoàn toàn máy chủ
                      Vercel).
                    </li>
                    <li>
                      <strong>Bước 3 (Complete):</strong> Cloudinary trả về mã video public URL; Client
                      chỉ việc gửi URL siêu nhẹ này về backend để lưu vào bản ghi Cloud VOD.
                    </li>
                  </ol>
                </div>
              </section>
            )}

            {/* ── Section 6: Testing Strategy ────────────────────── */}
            {activeTab === 'testing' && (
              <section className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-2.5 text-rose-400">
                  <TestTube2 className="h-6 w-6" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    6. Chiến Lược Kiểm Thử Toàn Diện (Testing Strategy)
                  </h2>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  OmniCast duy trì hệ thống kiểm thử tự động đa tầng với tỷ lệ bao phủ cao xuyên suốt
                  ba tầng ứng dụng:
                </p>

                <div className="space-y-3">
                  <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/40">
                    <h4 className="font-bold text-white text-xs mb-1">
                      Frontend Tests (159+ Unit & Smoke Tests)
                    </h4>
                    <p className="text-xs text-slate-400 mb-2">
                      Sử dụng Vitest kiểm tra logic Query Builder, bộ lọc AI Curator, mã hóa token và
                      giao diện các trang pháp lý.
                    </p>
                    <CodeSnippet code="cd frontend && npm test" />
                  </div>

                  <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/40">
                    <h4 className="font-bold text-white text-xs mb-1">
                      Backend Tests (Unit & E2E Suites)
                    </h4>
                    <p className="text-xs text-slate-400 mb-2">
                      Kiểm thử gRPC Audit-Logger client, dịch vụ thẩm định biên lai Google Play
                      Billing, thuật toán chống xung đột lịch EPG.
                    </p>
                    <CodeSnippet code="cd backend && npm test" />
                  </div>

                  <div className="p-4 rounded-xl border border-slate-700 bg-slate-800/40">
                    <h4 className="font-bold text-white text-xs mb-1">
                      Mobile Tests (Widget & BLoC Verification)
                    </h4>
                    <p className="text-xs text-slate-400 mb-2">
                      Kiểm tra màn hình Onboarding vuốt 3 trang, repository AI Curator và quản lý
                      trạng thái tìm kiếm Debounce 300ms.
                    </p>
                    <CodeSnippet code="cd mobile && flutter test" />
                  </div>
                </div>
              </section>
            )}

            {/* ── Section 7: RESTful APIs ────────────────────────── */}
            {activeTab === 'apis' && (
              <section className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-2.5 text-cyan-400">
                  <FileCode2 className="h-6 w-6" />
                  <h2 className="text-xl sm:text-2xl font-bold text-white">
                    7. Danh Mục API Endpoints RESTful
                  </h2>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  Bảng tổng hợp các endpoint API chính được cung cấp bởi OmniCast NestJS Core Gateway:
                </p>

                <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-800/40">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="border-b border-slate-700 bg-slate-800/80 font-mono uppercase text-slate-400 text-[11px]">
                      <tr>
                        <th className="px-4 py-3">Phương thức</th>
                        <th className="px-4 py-3">Đường dẫn Endpoint</th>
                        <th className="px-4 py-3">Quyền tối thiểu</th>
                        <th className="px-4 py-3">Chức năng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50 font-mono text-[11px]">
                      <tr>
                        <td className="px-4 py-2.5 text-cyan-400 font-bold">POST</td>
                        <td className="px-4 py-2.5 text-white">/api/auth/login</td>
                        <td className="px-4 py-2.5 text-slate-400 font-sans">GUEST</td>
                        <td className="px-4 py-2.5 text-slate-400 font-sans">
                          Đăng nhập và cấp cặp mã JWT + Refresh Token
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-cyan-400 font-bold">POST</td>
                        <td className="px-4 py-2.5 text-white">/api/auth/forgot-password</td>
                        <td className="px-4 py-2.5 text-slate-400 font-sans">GUEST</td>
                        <td className="px-4 py-2.5 text-slate-400 font-sans">
                          Tạo mã reset token gửi qua email
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-emerald-400 font-bold">GET</td>
                        <td className="px-4 py-2.5 text-white">/api/channels</td>
                        <td className="px-4 py-2.5 text-slate-400 font-sans">GUEST</td>
                        <td className="px-4 py-2.5 text-slate-400 font-sans">
                          Lấy danh sách 25 kênh sóng truyền hình
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-emerald-400 font-bold">GET</td>
                        <td className="px-4 py-2.5 text-white">/api/programs/epg</td>
                        <td className="px-4 py-2.5 text-slate-400 font-sans">GUEST</td>
                        <td className="px-4 py-2.5 text-slate-400 font-sans">
                          Lấy lịch phát sóng EPG 24 giờ theo ngày
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-purple-400 font-bold">POST</td>
                        <td className="px-4 py-2.5 text-white">/api/ai-curator/analyze</td>
                        <td className="px-4 py-2.5 text-purple-300 font-sans">STAFF</td>
                        <td className="px-4 py-2.5 text-slate-400 font-sans">
                          Gửi video kiểm duyệt tự động với AI
                        </td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2.5 text-amber-400 font-bold">POST</td>
                        <td className="px-4 py-2.5 text-white">/api/billing/verify-receipt</td>
                        <td className="px-4 py-2.5 text-cyan-300 font-sans">VIEWER</td>
                        <td className="px-4 py-2.5 text-slate-400 font-sans">
                          Xác thực biên lai thanh toán Google Play
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
