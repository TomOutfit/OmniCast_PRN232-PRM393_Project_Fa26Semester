// ============================================================
// OmniCast - Markdown Renderer
// ============================================================
//
// Tiny, dependency-free markdown renderer for help/docs pages.
// Supports the subset used in `Document/*.md`:
//   - `# / ## / ###` headings
//   - Paragraphs separated by blank lines
//   - Bullet (`-`, `*`) and ordered (`1.`) lists
//   - `inline code` and fenced code blocks
//   - Bold (`**x**`), italic (`*x*` / `_x_`)
//   - Markdown links `[text](url)` and autolinks `<url>`
//   - GFM tables (`| a | b | ... |`)
//
// It is intentionally NOT a full CommonMark parser — the help docs
// don't need it, and shipping a small inline renderer keeps the bundle
// leaner than pulling in `react-markdown` + `remark-gfm` (~50KB gzip).
// ============================================================

import * as React from 'react';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let key = 0;

  // Escape HTML, then process inline markdown patterns.
  let remaining = escapeHtml(text);

  // Regex matches one of: code, bold, italic, link, autolink. Uses
  // string concat to walk through and avoid ReDoS blowups.
  while (remaining.length > 0) {
    const patterns: {
      regex: RegExp;
      render: (match: RegExpMatchArray) => React.ReactNode;
    }[] = [
      {
        regex: /`([^`]+)`/,
        render: (m) => (
          <code
            key={`c-${key++}`}
            className="rounded bg-slate-800/80 border border-slate-700 px-1.5 py-0.5 font-mono text-[0.85em] text-cyan-300"
          >
            {m[1]}
          </code>
        ),
      },
      {
        regex: /\*\*([^*]+)\*\*/,
        render: (m) => (
          <strong key={`b-${key++}`} className="font-bold text-white">
            {m[1]}
          </strong>
        ),
      },
      {
        regex: /\*([^*]+)\*/,
        render: (m) => (
          <em key={`i-${key++}`} className="italic text-slate-200">
            {m[1]}
          </em>
        ),
      },
      {
        regex: /\[([^\]]+)\]\(([^)]+)\)/,
        render: (m) => (
          <a
            key={`l-${key++}`}
            href={m[2]}
            className="text-cyan-300 hover:text-cyan-200 underline decoration-cyan-500/30 hover:decoration-cyan-300 transition-colors"
            target={m[2].startsWith('http') ? '_blank' : undefined}
            rel={m[2].startsWith('http') ? 'noopener noreferrer' : undefined}
          >
            {m[1]}
          </a>
        ),
      },
      {
        regex: /<(https?:\/\/[^>]+)>/,
        render: (m) => (
          <a
            key={`a-${key++}`}
            href={m[1]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-300 hover:text-cyan-200 underline"
          >
            {m[1]}
          </a>
        ),
      },
    ];

    let firstMatch: { index: number; length: number; node: React.ReactNode } | null =
      null;

    for (const p of patterns) {
      const m = remaining.match(p.regex);
      if (m && (firstMatch === null || m.index! < firstMatch.index)) {
        firstMatch = { index: m.index!, length: m[0].length, node: p.render(m) };
      }
    }

    if (firstMatch === null) {
      parts.push(remaining);
      break;
    }

    if (firstMatch.index > 0) {
      parts.push(remaining.slice(0, firstMatch.index));
    }
    parts.push(firstMatch.node);
    remaining = remaining.slice(firstMatch.index + firstMatch.length);
  }

  return <>{parts}</>;
}

interface Block {
  type: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'ul' | 'ol' | 'code' | 'table' | 'hr';
  text?: string;
  items?: string[];
  rows?: string[][];
  lang?: string;
}

function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];

    // Skip blank lines
    if (!raw.trim()) {
      i++;
      continue;
    }

    // Code fence
    if (raw.startsWith('```')) {
      const lang = raw.replace(/^```/, '').trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing fence
      blocks.push({ type: 'code', text: codeLines.join('\n'), lang });
      continue;
    }

    // Heading
    const hMatch = raw.match(/^(#{1,4})\s+(.+)$/);
    if (hMatch) {
      const level = hMatch[1].length;
      blocks.push({
        type: `h${level}` as Block['type'],
        text: hMatch[2].trim(),
      });
      i++;
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(raw)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // Table (GFM)
    if (
      raw.includes('|') &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:-]+\|[\s:-]+\|?\s*$/.test(lines[i + 1])
    ) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes('|')) {
        const cells = lines[i]
          .replace(/^\||\|$/g, '')
          .split('|')
          .map((c) => c.trim());
        rows.push(cells);
        i++;
      }
      // Drop the alignment row (typically the second row of dashes)
      blocks.push({ type: 'table', rows: rows.filter((_, idx) => idx !== 1) });
      continue;
    }

    // Bullet list
    if (/^\s*[-*]\s+/.test(raw)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(raw)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Paragraph (collect until blank line / block transition)
    const paraLines: string[] = [raw];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,4}\s/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ type: 'p', text: paraLines.join(' ') });
  }

  return blocks;
}

export interface MarkdownProps {
  source: string;
  className?: string;
}

export function Markdown({ source, className }: MarkdownProps) {
  const blocks = React.useMemo(() => parseMarkdown(source), [source]);

  return (
    <div className={className}>
      {blocks.map((b, idx) => {
        switch (b.type) {
          case 'h1':
            return (
              <h1
                key={idx}
                id={slugify(b.text ?? '')}
                className="mt-8 mb-4 text-3xl font-bold text-white scroll-mt-24"
              >
                {renderInline(b.text ?? '')}
              </h1>
            );
          case 'h2':
            return (
              <h2
                key={idx}
                id={slugify(b.text ?? '')}
                className="mt-7 mb-3 text-2xl font-bold text-cyan-300 scroll-mt-24"
              >
                {renderInline(b.text ?? '')}
              </h2>
            );
          case 'h3':
            return (
              <h3
                key={idx}
                id={slugify(b.text ?? '')}
                className="mt-5 mb-2 text-xl font-semibold text-white scroll-mt-24"
              >
                {renderInline(b.text ?? '')}
              </h3>
            );
          case 'h4':
            return (
              <h4
                key={idx}
                id={slugify(b.text ?? '')}
                className="mt-4 mb-2 text-lg font-semibold text-slate-200 scroll-mt-24"
              >
                {renderInline(b.text ?? '')}
              </h4>
            );
          case 'p':
            return (
              <p key={idx} className="my-3 leading-7 text-slate-300">
                {renderInline(b.text ?? '')}
              </p>
            );
          case 'ul':
            return (
              <ul
                key={idx}
                className="my-3 ml-5 list-disc space-y-1.5 text-slate-300"
              >
                {(b.items ?? []).map((it, j) => (
                  <li key={j} className="leading-7">
                    {renderInline(it)}
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol
                key={idx}
                className="my-3 ml-5 list-decimal space-y-1.5 text-slate-300"
              >
                {(b.items ?? []).map((it, j) => (
                  <li key={j} className="leading-7">
                    {renderInline(it)}
                  </li>
                ))}
              </ol>
            );
          case 'code':
            return (
              <pre
                key={idx}
                className="my-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80 p-4 font-mono text-[0.85rem] leading-5 text-cyan-200"
              >
                <code>{b.text}</code>
              </pre>
            );
          case 'hr':
            return (
              <hr
                key={idx}
                className="my-6 border-t border-slate-800/80"
              />
            );
          case 'table': {
            if (!b.rows || b.rows.length === 0) return null;
            const [header, ...body] = b.rows;
            return (
              <div
                key={idx}
                className="my-5 overflow-x-auto rounded-xl border border-slate-800"
              >
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wider text-cyan-300">
                    <tr>
                      {(header ?? []).map((c, j) => (
                        <th
                          key={j}
                          className="border-b border-slate-800 px-4 py-2 font-semibold"
                        >
                          {renderInline(c)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {body.map((row, ri) => (
                      <tr
                        key={ri}
                        className="odd:bg-slate-950/40 even:bg-slate-950/60"
                      >
                        {row.map((c, ci) => (
                          <td key={ci} className="px-4 py-2 align-top">
                            {renderInline(c)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}

/** Slugify a heading text for use as an anchor id. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
