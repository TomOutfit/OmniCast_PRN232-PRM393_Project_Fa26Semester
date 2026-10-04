'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  Activity,
  Wifi,
  Zap,
  Radio,
  Eye,
  BarChart2,
  Tv,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChannelCategories, useChannels } from '@/lib/hooks/useChannels';
import { useLiveNow } from '@/lib/hooks/usePrograms';
import type { LiveEvent } from '@/types';

interface RealtimeSample {
  time: string;
  viewers: number;
  bitrate: number;
}

// Category color palette helper
const CATEGORY_COLORS: Record<string, { bar: string; text: string }> = {
  SPORTS: { bar: 'bg-red-500', text: 'text-red-400' },
  SHOW: { bar: 'bg-purple-500', text: 'text-purple-400' },
  ENTERTAINMENT: { bar: 'bg-pink-500', text: 'text-pink-400' },
  CINE: { bar: 'bg-amber-500', text: 'text-amber-400' },
  DRAMA: { bar: 'bg-rose-500', text: 'text-rose-400' },
  NEWS: { bar: 'bg-blue-500', text: 'text-blue-400' },
  MUSIC: { bar: 'bg-fuchsia-500', text: 'text-fuchsia-400' },
  KIDS: { bar: 'bg-lime-500', text: 'text-lime-400' },
  TECH: { bar: 'bg-cyan-400', text: 'text-cyan-400' },
  FOOD: { bar: 'bg-orange-500', text: 'text-orange-400' },
  DOCUMENTARY: { bar: 'bg-teal-400', text: 'text-teal-400' },
  GAMING: { bar: 'bg-red-600', text: 'text-red-500' },
  PODCAST: { bar: 'bg-yellow-500', text: 'text-yellow-400' },
  EDUCATION: { bar: 'bg-violet-400', text: 'text-violet-400' },
  LIFESTYLE: { bar: 'bg-pink-400', text: 'text-pink-300' },
  TRAVEL: { bar: 'bg-emerald-500', text: 'text-emerald-400' },
  ART: { bar: 'bg-rose-600', text: 'text-rose-500' },
  BUSINESS: { bar: 'bg-indigo-500', text: 'text-indigo-400' },
  HEALTH: { bar: 'bg-emerald-400', text: 'text-emerald-300' },
};

export function AdminRealtimeCharts() {
  // 1. Fetch real dynamic data from Backend API
  const { data: categoriesData, isLoading: loadingCategories } = useChannelCategories();
  const { data: channelsData } = useChannels({ limit: 100, isActive: true });
  const { data: liveEventsData } = useLiveNow();

  const liveEvents: LiveEvent[] = useMemo(() => {
    if (!liveEventsData) return [];
    return Array.isArray(liveEventsData)
      ? liveEventsData
      : (liveEventsData as any)?.data ?? [];
  }, [liveEventsData]);

  // Real aggregate viewer count from all currently broadcasting programs
  const actualLiveViewers = useMemo(() => {
    return liveEvents.reduce((acc, curr) => acc + (curr.viewerCount || 0), 0);
  }, [liveEvents]);

  // Real aggregate peak viewer count from currently broadcasting programs
  const actualPeakViewers = useMemo(() => {
    return liveEvents.reduce(
      (acc, curr) => acc + (curr.peakViewers || curr.viewerCount || 0),
      0
    );
  }, [liveEvents]);

  // Real aggregate interaction count (likes + comments + shares)
  const totalInteractions = useMemo(() => {
    return liveEvents.reduce(
      (acc, curr) =>
        acc +
        (curr.likeCount || 0) +
        (curr.commentCount || 0) +
        (curr.shareCount || 0),
      0
    );
  }, [liveEvents]);

  const activeChannelsCount = useMemo(() => {
    if (!channelsData) return 0;
    return channelsData.meta?.total ?? (Array.isArray(channelsData.data) ? channelsData.data.length : 0);
  }, [channelsData]);

  // Real dynamic latency measurement via network ping
  const [realLatency, setRealLatency] = useState<number | null>(null);
  const [history, setHistory] = useState<RealtimeSample[]>([]);
  const isMounted = useRef(true);

  // Ping backend API to measure real network round-trip time
  useEffect(() => {
    const measurePing = async () => {
      try {
        const start = performance.now();
        await fetch('/api/health/ping', { method: 'GET', cache: 'no-store' }).catch(() => null);
        const end = performance.now();
        const rtt = Math.round(end - start);
        if (isMounted.current && rtt > 0 && rtt < 2000) {
          setRealLatency(rtt);
        }
      } catch {
        // Ignore network measure errors
      }
    };

    measurePing();
    const pingInterval = setInterval(measurePing, 5000);
    return () => {
      isMounted.current = false;
      clearInterval(pingInterval);
    };
  }, []);

  // Sample real data continuously every 2.5s for the live waveform
  useEffect(() => {
    const sampleTicker = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setHistory((prev) => {
        const point: RealtimeSample = {
          time: timeStr,
          viewers: actualLiveViewers,
          bitrate: liveEvents.length,
        };
        const updated = [...prev, point];
        return updated.length > 20 ? updated.slice(updated.length - 20) : updated;
      });
    }, 2500);

    return () => clearInterval(sampleTicker);
  }, [actualLiveViewers, liveEvents.length]);

  // Compute SVG coordinates dynamically from the real history samples
  const svgMetrics = useMemo(() => {
    if (history.length < 2) {
      return { linePath: '', areaPath: '', lastPoint: null, minVal: 0, maxVal: 0 };
    }

    const viewersValues = history.map((h) => h.viewers);
    const minVal = Math.min(...viewersValues);
    const maxVal = Math.max(...viewersValues);
    const width = 600;
    const height = 140;

    const range = maxVal === minVal ? Math.max(1, maxVal) : (maxVal - minVal);

    const points = history.map((pt, index) => {
      const x = (index / (history.length - 1)) * width;
      const normalizedY = maxVal === minVal ? 0.5 : (pt.viewers - minVal) / range;
      const y = height - normalizedY * (height - 24) - 12;
      return { x, y, raw: pt };
    });

    const pathStrings = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    const linePath = `M ${pathStrings.join(' L ')}`;
    const areaPath = `${linePath} L ${width},${height} L 0,${height} Z`;

    return {
      linePath,
      areaPath,
      lastPoint: points[points.length - 1],
      minVal,
      maxVal,
    };
  }, [history]);

  // Compute category distribution directly from real backend database
  const dynamicCategories = useMemo(() => {
    if (!categoriesData || categoriesData.length === 0) return [];
    const totalCount = categoriesData.reduce((sum, item) => sum + (item.count || 0), 0);

    return categoriesData.map((item) => {
      const catCount = item.count || 0;
      const pct = totalCount > 0 ? Math.round((catCount / totalCount) * 100) : 0;
      const style = CATEGORY_COLORS[item.category] || { bar: 'bg-cyan-500', text: 'text-cyan-400' };

      return {
        category: item.category,
        count: catCount,
        pct,
        bar: style.bar,
        text: style.text,
      };
    });
  }, [categoriesData]);

  return (
    <div className="space-y-6">
      
      {/* ── 1. REALTIME METRIC PULSE BAR (100% Dynamic API Values) ─────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-[#0a121e] border border-emerald-500/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Khán Giả Đồng Thời (Live)
            </span>
            <span className="text-xl font-black font-mono text-emerald-300">
              {actualLiveViewers.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">Viewers</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-950/70 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Eye className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0a121e] border border-cyan-500/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Đỉnh Điểm Khán Giả (Peak)
            </span>
            <span className="text-xl font-black font-mono text-cyan-300">
              {actualPeakViewers.toLocaleString()}{' '}
              <span className="text-xs font-normal text-slate-400">Peak</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-cyan-950/70 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0a121e] border border-purple-500/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Độ Trễ Mạng Thực (RTT)
            </span>
            <span className="text-xl font-black font-mono text-purple-300">
              {realLatency !== null ? `${realLatency} ms` : 'Đang đo...'}
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-purple-950/70 border border-purple-500/40 flex items-center justify-center text-purple-400">
            <Wifi className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#0a121e] border border-amber-500/20 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Kênh Hoạt Động (DB)
            </span>
            <span className="text-xl font-black font-mono text-amber-300">
              {activeChannelsCount} <span className="text-xs font-normal text-slate-400">Kênh</span>
            </span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-950/70 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Tv className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* ── 2. DUAL INTERACTIVE CHARTS CARD ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left (2 cols): Realtime Waveform Line Chart */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#090f1a] border border-[#16253c] shadow-xl relative overflow-hidden flex flex-col justify-between">
          
          <div>
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                  Biểu Đồ Sóng Khán Giả Trực Tiếp Thời Gian Thực
                </h3>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 font-bold">
                  DỮ LIỆU THỰC: {actualLiveViewers.toLocaleString()} VIEWERS
                </span>
              </div>
            </div>

            {/* SVG Waveform Graphic */}
            <div className="relative w-full h-[180px] bg-[#060b13] rounded-xl border border-slate-800/80 p-2 overflow-hidden flex flex-col justify-end">
              
              {/* Dynamic Grid lines */}
              <div className="absolute inset-0 grid grid-rows-3 pointer-events-none opacity-20">
                <div className="border-b border-cyan-500/30" />
                <div className="border-b border-cyan-500/30" />
              </div>

              {history.length < 2 ? (
                <div className="h-full flex items-center justify-center text-xs font-mono text-slate-500">
                  <Activity className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
                  Đang ghi nhận mẫu dữ liệu thực từ API phát sóng…
                </div>
              ) : (
                <svg
                  viewBox="0 0 600 140"
                  preserveAspectRatio="none"
                  className="w-full h-full overflow-visible"
                >
                  <defs>
                    <linearGradient id="realtimeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#00f2fe" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="realtimeLineGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="50%" stopColor="#00f2fe" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>

                  {/* Area under curve */}
                  <path d={svgMetrics.areaPath} fill="url(#realtimeAreaGrad)" />

                  {/* Glowing Line */}
                  <path
                    d={svgMetrics.linePath}
                    fill="none"
                    stroke="url(#realtimeLineGrad)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    className="filter drop-shadow-[0_0_8px_rgba(0,242,254,0.8)]"
                  />

                  {/* Pulsing beacon on the latest point */}
                  {svgMetrics.lastPoint && (
                    <circle
                      cx={svgMetrics.lastPoint.x}
                      cy={svgMetrics.lastPoint.y}
                      r="4.5"
                      fill="#fff"
                      stroke="#00f2fe"
                      strokeWidth="2"
                      className="animate-pulse"
                    />
                  )}
                </svg>
              )}

              {/* Time labels footer */}
              {history.length >= 2 && (
                <div className="flex justify-between text-[9px] font-mono text-slate-500 px-1 pt-1 border-t border-slate-800">
                  <span>{history[0]?.time}</span>
                  <span>{history[Math.floor(history.length / 2)]?.time}</span>
                  <span className="text-cyan-400 font-bold">{history[history.length - 1]?.time} (Hiện tại)</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom telemetry indicators calculated dynamically */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-800/80 text-center text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px] block">SỰ KIỆN LIVE:</span>
              <span className="text-white font-bold">{liveEvents.length} Sự Kiện</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">ĐỘ TRỄ MẠNG:</span>
              <span className="text-cyan-400 font-bold">
                {realLatency !== null ? `${realLatency} ms` : 'Đang đo...'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">TƯƠNG TÁC (REACT):</span>
              <span className="text-emerald-400 font-bold">{totalInteractions.toLocaleString()}</span>
            </div>
          </div>

        </div>

        {/* Right (1 col): Live Category Viewership Breakdown (100% from API) */}
        <div className="p-5 rounded-2xl bg-[#090f1a] border border-[#16253c] shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                <BarChart2 className="w-4 h-4 text-purple-400" />
                Phân Bố Kênh Theo Thể Loại
              </h3>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">API LIVE</span>
            </div>

            {loadingCategories ? (
              <div className="py-12 text-center text-xs font-mono text-slate-500">
                Đang tải dữ liệu phân bổ từ database…
              </div>
            ) : dynamicCategories.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Chưa có dữ liệu thể loại.
              </div>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {dynamicCategories.map((c) => (
                  <div key={c.category} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-300 truncate max-w-[170px]">{c.category}</span>
                      <span className="font-mono text-slate-400">
                        <strong className="text-white">{c.pct}%</strong> ({c.count} kênh)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all duration-500', c.bar)}
                        style={{ width: `${c.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Infrastructure Health Status */}
          <div className="mt-5 pt-4 border-t border-slate-800 space-y-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
              Trạng Thái Kết Nối API Server
            </span>
            <div className="p-2 rounded-lg bg-[#060b13] border border-cyan-500/30 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-300">Ping RTT máy chủ:</span>
              <span className="text-cyan-400 font-bold">
                {realLatency !== null ? `${realLatency} ms (Ổn Định)` : 'Đang kiểm tra kết nối...'}
              </span>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
