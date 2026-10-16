// ============================================================
// OmniCast · Help Page (server-rendered)
// ============================================================
//
// Renders `Document/HELP.md` and `Document/FAQ.md` with the dark-cinema
// styling used across the marketing surface. Anchors are auto-generated
// from H1/H2/H3 headings and surfaced in a sticky TOC.
//
// Server-side rendering avoids shipping the entire help corpus to the
// client — and keeps the help text in the SEO index because the markup
// is fully rendered before hydration.
// ============================================================

import * as fs from 'node:fs';
import * as path from 'node:path';
import Link from 'next/link';
import { ChevronLeft, LifeBuoy, MessageCircle } from 'lucide-react';
import { Markdown, slugify } from '@/components/markdown-viewer';

export const dynamic = 'force-static';
export const revalidate = 3600;

interface ParsedDoc {
  html: string;
  toc: { id: string; text: string; level: number }[];
}

function loadDoc(rel: string): ParsedDoc {
  // Try absolute repo path first (works in dev), then process.cwd() and
  // a few relative fallbacks so Vercel builds resolve correctly.
  const candidates = [
    path.join(process.cwd(), '..', rel),
    path.join(process.cwd(), rel),
    path.join('/var/task', rel),
  ];

  for (const p of candidates) {
    try {
      const raw = fs.readFileSync(p, 'utf-8');
      return extractToc(raw);
    } catch (_) {
      /* try next */
    }
  }

  // Last-resort: empty doc (page still renders with a notice).
  return {
    html: '_(Nội dung đang được cập nhật.)_',
    toc: [],
  };
}

function extractToc(md: string): ParsedDoc {
  const toc: { id: string; text: string; level: number }[] = [];
  const lines = md.split('\n');
  for (const line of lines) {
    const m = line.match(/^(#{1,3})\s+(.+)$/);
    if (m) {
      const level = m[1].length;
      const text = m[2].trim();
      toc.push({ id: slugify(text), text, level });
    }
  }
  return { html: md, toc };
}

export default function HelpPage() {
  const help = loadDoc('Document/HELP.md');
  const faq = loadDoc('Document/FAQ.md');

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050810] via-[#0a0f1c] to-[#050810] text-slate-200">
      <div className="mx-auto max-w-6xl px-4 py-10 lg:py-14">
        {/* Top bar */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-cyan-300 transition"
          >
            <ChevronLeft className="h-4 w-4" />
            Về trang chủ
          </Link>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-cyan-500/10 px-3 py-1 border border-cyan-500/30">
            <LifeBuoy className="h-3.5 w-3.5 text-cyan-300" />
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-300">
              Hỗ trợ · Help Center
            </span>
          </div>
        </div>

        <header className="mb-10 text-center">
          <h1 className="bg-gradient-to-r from-cyan-200 via-cyan-400 to-violet-300 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl">
            Trung tâm hỗ trợ
          </h1>
          <p className="mt-3 text-sm text-slate-400 max-w-2xl mx-auto">
            Tài liệu hướng dẫn sử dụng, câu hỏi thường gặp và mẹo nhanh để
            bạn khai thác tối đa OmniCast.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          {/* Sticky TOC */}
          <aside className="lg:sticky lg:top-10 lg:self-start">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 shadow-xl shadow-black/40 backdrop-blur">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-widest">
                <LifeBuoy className="h-3.5 w-3.5" />
                Mục lục
              </div>
              <nav className="space-y-1.5 text-sm">
                {help.toc.map((entry, idx) => (
                  <a
                    key={`help-${idx}`}
                    href={`#${entry.id}`}
                    className={
                      entry.level === 1
                        ? 'block font-semibold text-slate-200 hover:text-cyan-300'
                        : entry.level === 2
                          ? 'block pl-3 text-slate-400 hover:text-cyan-300'
                          : 'block pl-6 text-xs text-slate-500 hover:text-cyan-300'
                    }
                  >
                    {entry.text}
                  </a>
                ))}
                {faq.toc.map((entry, idx) => (
                  <a
                    key={`faq-${idx}`}
                    href={`#${entry.id}`}
                    className={
                      entry.level === 1
                        ? 'block font-semibold text-slate-200 hover:text-cyan-300'
                        : 'block pl-3 text-slate-400 hover:text-cyan-300'
                    }
                  >
                    {entry.text}
                  </a>
                ))}
              </nav>

              <div className="mt-5 border-t border-slate-800/80 pt-4">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold text-violet-300 uppercase tracking-widest">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Cần trợ giúp thêm?
                </div>
                <p className="mb-3 text-xs text-slate-400">
                  Bạn không tìm thấy câu trả lời? Gửi yêu cầu trực tiếp tới
                  đội ngũ OmniCast.
                </p>
                <Link
                  href="/contact"
                  className="inline-flex w-full items-center justify-center rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-400 transition"
                >
                  Liên hệ hỗ trợ
                </Link>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-6 sm:p-10 shadow-xl shadow-black/40 backdrop-blur">
            <Markdown source={help.html} />
            <hr className="my-10 border-slate-800/80" />
            <h2 className="mb-2 text-2xl font-bold text-violet-300">
              FAQ · Câu hỏi thường gặp
            </h2>
            <p className="mb-6 text-sm text-slate-400">
              Tổng hợp các câu hỏi phổ biến từ cộng đồng người dùng.
            </p>
            <Markdown source={faq.html} />
          </main>
        </div>
      </div>
    </div>
  );
}
