'use client';

// ============================================================
// OmniCast - Inline Search Bar
// ------------------------------------------------------------
// Expandable search input that toggles between icon (closed)
// and a 240-300px input (open). Keyboard shortcut ⌘K / Ctrl-K
// focuses the input from anywhere on the page.
// ============================================================

import { Search, X, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export function SearchBar() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  // ⌘K / Ctrl-K to focus from anywhere
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setOpen(false);
  };

  return (
    <form
      onSubmit={submit}
      role="search"
      className={cn(
        'relative flex items-center',
        'rounded-lg border bg-[#0e1726] border-[#1b2b42]',
        'transition-all duration-200',
        open
          ? 'w-44 sm:w-64 md:w-72 lg:w-80 ring-2 ring-cyan-500/30 border-cyan-500/50'
          : 'w-9 sm:w-9',
        focused && open && 'ring-cyan-400/50',
      )}
    >
      {/* Search button / submit trigger */}
      <button
        type={open ? 'submit' : 'button'}
        onClick={() => {
          if (!open) {
            setOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }
        }}
        aria-label="Tìm kiếm"
        className={cn(
          'flex-shrink-0 w-9 h-9 rounded-md flex items-center justify-center',
          'text-slate-300 hover:text-cyan-400 transition-colors',
          open && 'text-cyan-400',
        )}
      >
        <Search className="w-4 h-4" />
      </button>

      {/* Input field — always rendered so we can animate width */}
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Tìm kênh, chương trình, thể loại…"
        aria-label="Ô tìm kiếm"
        className={cn(
          'flex-1 min-w-0 bg-transparent text-xs text-white placeholder:text-slate-500',
          'focus:outline-none pr-1',
          !open && 'hidden',
        )}
        tabIndex={open ? 0 : -1}
      />

      {/* Right side: kbd hint OR clear button */}
      {open ? (
        query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label="Xóa"
            className="flex-shrink-0 w-7 h-7 mr-1 rounded text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <kbd
            className={cn(
              'hidden md:inline-flex flex-shrink-0 mr-1.5 px-1.5 py-0.5 rounded',
              'bg-[#0a121f] border border-[#1b2b42] text-[9px] font-mono text-slate-500',
            )}
          >
            Esc
          </kbd>
        )
      ) : (
        <kbd
          className={cn(
            'hidden md:inline-flex absolute right-1.5 top-1/2 -translate-y-1/2',
            'px-1 py-0.5 rounded',
            'bg-[#0a121f] border border-[#1b2b42] text-[9px] font-mono text-slate-500',
          )}
        >
          ⌘K
        </kbd>
      )}
    </form>
  );
}
