// ============================================================
// OmniCast - Channel Target Selector Dropdown (Live Studio)
// ============================================================
//
// Dropdown chọn Kênh Phát Sóng Target đa năng cho Live Studio:
//   - Hỗ trợ chọn bất kỳ kênh nào trong toàn bộ hệ thống (25-50+ kênh)
//   - Thanh tìm kiếm nhanh theo tên kênh, slug hoặc thể loại
//   - Lọc nhanh theo danh mục (Category filter pills)
//   - Chỉ báo trạng thái kênh Active và kênh đang LIVE trực tiếp
//   - Quick chips cho các kênh phổ biến/đang live thao tác 1 chạm
// ============================================================

'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import {
  Tv,
  Search,
  ChevronDown,
  Check,
  Radio,
  X,
  SlidersHorizontal,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { ChannelLogo, getCategoryColor } from '@/components/ui/channel-logo';
import type { Channel } from '@/types';
import { cn } from '@/lib/utils';

interface ChannelTargetSelectorProps {
  channels: Channel[];
  selectedChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  isLoading?: boolean;
  liveChannelIds?: string[];
}

export function ChannelTargetSelector({
  channels,
  selectedChannel,
  onSelectChannel,
  isLoading = false,
  liveChannelIds = [],
}: ChannelTargetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Đóng khi click ngoài dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus vào input tìm kiếm khi mở
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Danh sách các Category có trong channels
  const categories = useMemo(() => {
    const set = new Set<string>();
    channels.forEach((ch) => {
      if (ch.category) set.add(ch.category.toUpperCase());
    });
    return Array.from(set).sort();
  }, [channels]);

  // Lọc danh sách channels theo từ khóa và danh mục
  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        ch.name.toLowerCase().includes(q) ||
        ch.slug.toLowerCase().includes(q) ||
        (ch.category && ch.category.toLowerCase().includes(q));

      const matchCategory =
        selectedCategory === 'ALL' ||
        ch.category?.toUpperCase() === selectedCategory;

      return matchQuery && matchCategory;
    });
  }, [channels, searchQuery, selectedCategory]);

  // Kênh chọn nhanh (top 4 kênh đầu tiên hoặc đang live)
  const quickChannels = useMemo(() => {
    return channels.slice(0, 5);
  }, [channels]);

  const isCurrentChannelLive = useMemo(() => {
    if (!selectedChannel) return false;
    return (
      liveChannelIds.includes(selectedChannel.id) ||
      liveChannelIds.includes(selectedChannel.slug)
    );
  }, [selectedChannel, liveChannelIds]);

  return (
    <div
      ref={dropdownRef}
      className="glass-card p-3 sm:p-4 rounded-2xl border border-[#1e2d44] bg-[#0c1421]/80 relative"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Nhãn tiêu đề + Trạng thái */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <Tv className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                Chọn Kênh Phát Sóng Target
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/40">
                {channels.length} Kênh
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Chọn kênh đích từ danh sách hoặc tìm kiếm theo danh mục
            </p>
          </div>
        </div>

        {/* Cụm điều khiển: Dropdown Button & Quick Chips */}
        <div className="flex flex-wrap items-center gap-2.5">
          {isLoading ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#101928] border border-[#1e2d44] text-xs text-slate-400">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Đang tải danh sách kênh...</span>
            </div>
          ) : (
            <>
              {/* Nút kích hoạt Dropdown Kênh */}
              <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shadow-sm select-none',
                  isOpen
                    ? 'bg-cyan-950/90 text-cyan-200 border-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.25)]'
                    : 'bg-[#101928] text-white border-[#1e2d44] hover:border-cyan-500/50 hover:bg-[#152238]',
                )}
              >
                {selectedChannel ? (
                  <>
                    <ChannelLogo
                      slug={selectedChannel.slug}
                      logoUrl={selectedChannel.logoUrl}
                      name={selectedChannel.name}
                      category={selectedChannel.category}
                      size="sm"
                      className="w-5 h-5"
                    />
                    <div className="text-left flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-100 max-w-[130px] sm:max-w-[180px] truncate">
                          {selectedChannel.name}
                        </span>
                        {isCurrentChannelLive && (
                          <span className="flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-black bg-red-600/90 text-white animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            LIVE
                          </span>
                        )}
                      </div>
                      <span
                        className="text-[10px] font-mono tracking-tight font-medium"
                        style={{
                          color: getCategoryColor(selectedChannel.category),
                        }}
                      >
                        {selectedChannel.category || 'GENERAL'}
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="text-slate-400">Chọn kênh phát sóng...</span>
                )}
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-slate-400 transition-transform duration-200 ml-1',
                    isOpen && 'rotate-180 text-cyan-400',
                  )}
                />
              </button>

              {/* Quick Pills (Kênh chọn nhanh) */}
              <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
                {quickChannels.map((ch) => {
                  const isSelected = selectedChannel?.id === ch.id;
                  const isLive =
                    liveChannelIds.includes(ch.id) ||
                    liveChannelIds.includes(ch.slug);

                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => onSelectChannel(ch)}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border',
                        isSelected
                          ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500 shadow-[0_0_8px_rgba(0,242,254,0.15)]'
                          : 'bg-[#101928]/60 text-slate-400 border-[#1a273c] hover:text-slate-200 hover:bg-[#162338]',
                      )}
                    >
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          isLive
                            ? 'bg-red-500 animate-pulse'
                            : ch.isActive
                            ? 'bg-cyan-400'
                            : 'bg-slate-600',
                        )}
                      />
                      <span>{ch.name}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─── DROPDOWN POPOVER PANEL ─────────────────────────────────── */}
      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] left-0 right-0 sm:left-auto sm:right-0 sm:w-[460px] z-50 p-3.5 rounded-2xl bg-[#0c1421]/95 backdrop-blur-xl border border-cyan-500/30 shadow-[0_12px_40px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-150">
          {/* Header Popover & Ô Tìm kiếm */}
          <div className="space-y-2.5 pb-2.5 border-b border-[#1e2d44]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-200 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                Toàn bộ kênh phát sóng ({channels.length})
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-dark-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Input Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập tên kênh, thể loại (e.g. VTV, Thể thao, Cine)..."
                className="w-full pl-8 pr-8 py-2 rounded-xl bg-[#101928] border border-[#1e2d44] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('ALL')}
                className={cn(
                  'px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap transition-colors border',
                  selectedCategory === 'ALL'
                    ? 'bg-cyan-500 text-black border-cyan-400'
                    : 'bg-[#101928] text-slate-400 border-[#1e2d44] hover:text-white',
                )}
              >
                Tất cả ({channels.length})
              </button>
              {categories.map((cat) => {
                const count = channels.filter(
                  (c) => c.category?.toUpperCase() === cat,
                ).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      'px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap transition-colors border',
                      selectedCategory === cat
                        ? 'bg-cyan-950 text-cyan-300 border-cyan-500 font-bold'
                        : 'bg-[#101928] text-slate-400 border-[#1e2d44] hover:text-white',
                    )}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Danh sách Kênh có thanh cuộn mượt mà */}
          <div className="max-h-[300px] overflow-y-auto space-y-1.5 pt-2.5 pr-1 scrollbar-thin scrollbar-thumb-dark-700">
            {filteredChannels.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 space-y-1">
                <Tv className="w-6 h-6 mx-auto text-slate-600" />
                <p>Không tìm thấy kênh phù hợp với từ khóa</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('ALL');
                  }}
                  className="text-cyan-400 hover:underline text-[11px] font-medium"
                >
                  Xóa bộ lọc
                </button>
              </div>
            ) : (
              filteredChannels.map((ch) => {
                const isSelected = selectedChannel?.id === ch.id;
                const isLive =
                  liveChannelIds.includes(ch.id) ||
                  liveChannelIds.includes(ch.slug);

                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      onSelectChannel(ch);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full p-2 rounded-xl text-left transition-all flex items-center justify-between group border',
                      isSelected
                        ? 'bg-cyan-950/80 border-cyan-500/70 shadow-[0_0_12px_rgba(0,242,254,0.15)]'
                        : 'bg-[#101928]/50 border-transparent hover:bg-[#152238] hover:border-[#1e2d44]',
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="relative shrink-0">
                        <ChannelLogo
                          slug={ch.slug}
                          logoUrl={ch.logoUrl}
                          name={ch.name}
                          category={ch.category}
                          size="sm"
                          className="w-7 h-7"
                        />
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full absolute -bottom-0.5 -right-0.5 border border-[#0c1421]',
                            isLive
                              ? 'bg-red-500 animate-pulse'
                              : ch.isActive
                              ? 'bg-cyan-400'
                              : 'bg-slate-600',
                          )}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'text-xs font-bold truncate',
                              isSelected
                                ? 'text-cyan-300'
                                : 'text-slate-100 group-hover:text-white',
                            )}
                          >
                            {ch.name}
                          </span>
                          {isLive && (
                            <span className="px-1 py-0.2 rounded text-[8px] font-black bg-red-600 text-white shrink-0">
                              LIVE
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span
                            className="font-medium"
                            style={{
                              color: getCategoryColor(ch.category),
                            }}
                          >
                            {ch.category || 'General'}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-slate-500">
                            /{ch.slug}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center text-black">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          Chọn →
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
