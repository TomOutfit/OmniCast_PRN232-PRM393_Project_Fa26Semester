// ============================================================
// OmniCast · Docs Page (server-rendered)
// ============================================================
//
// Aggregates the engineering docs (`docs/AI-CURATOR.md`,
// `docs/CLOUDINARY_STUDIO_UPLOAD.md`, `Document/QUICK_START.md`,
// `Document/Testing_Guide.md`, `Document/CATALOG_V2_1_CHANGELOG.md`,
// `Document/AUTOMATED_CONTENT_INGESTION.md`) into a single searchable
// docs portal with sticky section navigation.
// ============================================================

import * as fs from 'node:fs';
import * as path from 'node:path';
import Link from 'next/link';
import { ChevronLeft, BookOpen, Library } from 'lucide-react';
import { Markdown, slugify } from '@/components/markdown-viewer';

export const dynamic = 'force-static';
export const revalidate = 3600;

interface DocEntry {
  slug: string;
  title: string;
  description?: string;
  relPath: string;
  content: string;
  toc: { id: string; text: string; level: number }[];
}

const DOC_REGISTRY: { slug: string; title: string; description: string; relPath: string }[] =
  [
    {
      slug: 'quick-start',
      title: 'Quick Start',
      description: 'Khởi động backend / frontend / mobile trong 5 phút.',
      relPath: 'Document/QUICK_START.md',
    },
    {
      slug: 'testing',
      title: 'Testing Guide',
      description:
        'Hướng dẫn viết + chạy unit test, e2e test cho cả ba codebase.',
      relPath: 'Document/Testing_Guide.md',
    },
    {
      slug: 'catalog-v2-1',
      title: 'Catalog v2.1 Changelog',
      description: 'Mọi thay đổi của catalog schema từ v1.0 lên v2.1.',
      relPath: 'Document/CATALOG_V2_1_CHANGELOG.md',
    },
    {
      slug: 'ai-curator',
      title: 'AI Curator',
      description:
        'Cách curator gợi ý lịch phát, sentiment analysis, và live ops.',
      relPath: 'docs/AI-CURATOR.md',
    },
    {
      slug: 'cloudinary-studio',
      title: 'Cloudinary Studio Upload',
      description:
        'Tích hợp Cloudinary direct-upload cho studio / self-record.',
      relPath: 'docs/CLOUDINARY_STUDIO_UPLOAD.md',
    },
    {
      slug: 'automated-ingest',
      title: 'Automated Content Ingestion',
      description:
        'Pipeline thu thập catalog từ YouTube, Twitch, TMDB và RSS.',
      relPath: 'Document/AUTOMATED_CONTENT_INGESTION.md',
    },
  ];

function loadDoc(rel: string): string {
  const candidates = [
    path.join(process.cwd(), '..', rel),
    path.join(process.cwd(), rel),
    path.join('/var/task', rel),
  ];
  for (const p of candidates) {
    try {
      return fs.readFileSync(p, 'utf-8');
    } catch (_) {
      /* try next */
    }
  }
  return '_(Tài liệu chưa có sẵn trong build này.)_';
}

function extractToc(md: string): { id: string; text: string; level: number }[] {
  const toc: { id: string; text: string; level: number }[] = [];
  for (const line of md.split('\n')) {
    const m = line.match(/^(#{1,3})\s+(.+)$/);
    if (m) {
      toc.push({
        id: slugify(m[2].trim()),
        text: m[2].trim(),
        level: m[1].length,
      });
    }
  }
  return toc;
}

export default function DocsPage() {
  const docs: DocEntry[] = DOC_REGISTRY.map((entry) => {
    const content = loadDoc(entry.relPath);
    return {
      ...entry,
      content,
      toc: extractToc(content),
    };
  });

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
          <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 border border-violet-500/30">
            <BookOpen className="h-3.5 w-3.5 text-violet-300" />
            <span className="text-[10px] font-black uppercase tracking-widest text-violet-300">
              Documentation Portal
            </span>
          </div>
        </div>

        <header className="mb-10 text-center">
          <h1 className="bg-gradient-to-r from-violet-200 via-fuchsia-300 to-cyan-300 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:text-5xl">
            Tài liệu OmniCast
          </h1>
          <p className="mt-3 text-sm text-slate-400 max-w-2xl mx-auto">
            Tổng hợp các tài liệu kỹ thuật cốt lõi của dự án — từ hướng dẫn
            nhanh đến chi tiết pipeline ingest, AI curator & testing.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-10 lg:self-start">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-5 shadow-xl shadow-black/40 backdrop-blur">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold text-violet-300 uppercase tracking-widest">
                <Library className="h-3.5 w-3.5" />
                Sections
              </div>
              <nav className="space-y-4">
                {docs.map((d) => (
                  <div key={d.slug}>
                    <a
                      href={`#${d.slug}`}
                      className="block text-sm font-semibold text-slate-200 hover:text-violet-300"
                    >
                      {d.title}
                    </a>
                    <div className="mt-1 space-y-1">
                      {d.toc
                        .filter((t) => t.level >= 2)
                        .map((t, idx) => (
                          <a
                            key={`${d.slug}-${idx}`}
                            href={`#${t.id}`}
                            className={
                              t.level === 2
                                ? 'block pl-3 text-xs text-slate-400 hover:text-violet-300'
                                : 'block pl-6 text-[11px] text-slate-500 hover:text-violet-300'
                            }
                          >
                            {t.text}
                          </a>
                        ))}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </aside>

          <main className="space-y-10">
            {docs.map((d) => (
              <article
                key={d.slug}
                id={d.slug}
                className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-6 sm:p-10 shadow-xl shadow-black/40 backdrop-blur scroll-mt-24"
              >
                <h2 className="mb-1 text-2xl font-bold text-white">
                  {d.title}
                </h2>
                <p className="mb-6 text-sm text-slate-400">
                  {d.description}
                </p>
                <Markdown source={d.content} />
              </article>
            ))}
          </main>
        </div>
      </div>
    </div>
  );
}
