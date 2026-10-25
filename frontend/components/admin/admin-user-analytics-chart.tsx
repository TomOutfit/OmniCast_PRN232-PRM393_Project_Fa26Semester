'use client';

import React, { useState, useMemo } from 'react';
import {
  Users,
  TrendingUp,
  UserCheck,
  ShieldAlert,
  Calendar,
  Sparkles,
  ArrowUpRight,
  Eye,
  Zap,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface UserTelemetrySample {
  day: string;
  dateStr: string;
  dau: number; // Daily active users
  newSignups: number; // New registrations
  retentionRate: number; // 7-day retention %
  vipConversions: number; // VIP passes activated
}

const USER_TELEMETRY_7D: UserTelemetrySample[] = [
  { day: 'Thứ 2', dateStr: '19/10', dau: 28400, newSignups: 420, retentionRate: 64.2, vipConversions: 84 },
  { day: 'Thứ 3', dateStr: '20/10', dau: 29850, newSignups: 490, retentionRate: 65.1, vipConversions: 92 },
  { day: 'Thứ 4', dateStr: '21/10', dau: 31200, newSignups: 540, retentionRate: 66.4, vipConversions: 108 },
  { day: 'Thứ 5', dateStr: '22/10', dau: 32900, newSignups: 610, retentionRate: 67.2, vipConversions: 115 },
  { day: 'Thứ 6', dateStr: '23/10', dau: 35400, newSignups: 780, retentionRate: 68.0, vipConversions: 146 },
  { day: 'Thứ 7', dateStr: '24/10', dau: 38450, newSignups: 920, retentionRate: 69.4, vipConversions: 182 },
  { day: 'Chủ Nhật', dateStr: '25/10', dau: 37900, newSignups: 860, retentionRate: 68.8, vipConversions: 165 },
];

const USER_TELEMETRY_30D: UserTelemetrySample[] = [
  { day: 'Tuần 1', dateStr: '01 - 07/10', dau: 24200, newSignups: 2850, retentionRate: 61.5, vipConversions: 480 },
  { day: 'Tuần 2', dateStr: '08 - 14/10', dau: 27800, newSignups: 3240, retentionRate: 63.8, vipConversions: 590 },
  { day: 'Tuần 3', dateStr: '15 - 21/10', dau: 32400, newSignups: 3980, retentionRate: 66.2, vipConversions: 710 },
  { day: 'Tuần 4', dateStr: '22 - 25/10', dau: 38450, newSignups: 4620, retentionRate: 68.4, vipConversions: 890 },
];

function generateBezierSpline(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  if (points.length === 2) {
    return `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)} L ${points[1].x.toFixed(1)},${points[1].y.toFixed(1)}`;
  }

  let d = `M ${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)},${cp1y.toFixed(1)} ${cp2x.toFixed(1)},${cp2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

interface AdminUserAnalyticsChartProps {
  totalUsersCount?: number;
}

const CHART_DIM = { width: 680, height: 180, padL: 42, padR: 38, padT: 24, padB: 24 };

export function AdminUserAnalyticsChart({ totalUsersCount }: AdminUserAnalyticsChartProps) {
  const [horizon, setHorizon] = useState<'7d' | '30d'>('7d');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const [visibleSeries, setVisibleSeries] = useState({
    dau: true,
    signups: true,
    retention: true,
  });

  const dataset = horizon === '7d' ? USER_TELEMETRY_7D : USER_TELEMETRY_30D;


  const svgData = useMemo(() => {
    const plotW = CHART_DIM.width - CHART_DIM.padL - CHART_DIM.padR;
    const plotH = CHART_DIM.height - CHART_DIM.padT - CHART_DIM.padB;

    const maxDau = 42000;
    const maxSignups = horizon === '7d' ? 1200 : 5500;
    const maxRetention = 100;

    const points = dataset.map((pt, i) => {
      const x = CHART_DIM.padL + (i / (dataset.length - 1)) * plotW;

      const normDau = Math.min(1, Math.max(0, pt.dau / maxDau));
      const yDau = CHART_DIM.height - CHART_DIM.padB - normDau * plotH;

      const normSignups = Math.min(1, Math.max(0, pt.newSignups / maxSignups));
      const ySignups = CHART_DIM.height - CHART_DIM.padB - normSignups * plotH;

      const normRet = Math.min(1, Math.max(0, pt.retentionRate / maxRetention));
      const yRet = CHART_DIM.height - CHART_DIM.padB - normRet * plotH;

      return { x, yDau, ySignups, yRet, raw: pt, index: i };
    });

    const dauCoords = points.map((p) => ({ x: p.x, y: p.yDau }));
    const signupsCoords = points.map((p) => ({ x: p.x, y: p.ySignups }));
    const retCoords = points.map((p) => ({ x: p.x, y: p.yRet }));

    const dauSpline = generateBezierSpline(dauCoords);
    const dauArea = `${dauSpline} L ${points[points.length - 1].x.toFixed(1)},${(CHART_DIM.height - CHART_DIM.padB).toFixed(1)} L ${points[0].x.toFixed(1)},${(CHART_DIM.height - CHART_DIM.padB).toFixed(1)} Z`;

    const signupsSpline = generateBezierSpline(signupsCoords);
    const signupsArea = `${signupsSpline} L ${points[points.length - 1].x.toFixed(1)},${(CHART_DIM.height - CHART_DIM.padB).toFixed(1)} L ${points[0].x.toFixed(1)},${(CHART_DIM.height - CHART_DIM.padB).toFixed(1)} Z`;

    const retentionSpline = generateBezierSpline(retCoords);

    const peak = points.reduce((prev, curr) => (curr.raw.dau > prev.raw.dau ? curr : prev), points[0]);

    return {
      points,
      dauSpline,
      dauArea,
      signupsSpline,
      signupsArea,
      retentionSpline,
      peak,
      maxDau,
    };
  }, [dataset, horizon]);

  const activePoint = hoverIndex !== null && svgData.points[hoverIndex] ? svgData.points[hoverIndex] : null;

  return (
    <Card className="p-5 card-3d-surface mb-6 border border-cyan-500/25 bg-[#080e18]/95 shadow-2xl relative overflow-hidden">
      {/* Background Cyber Ambient */}
      <div className="absolute top-0 right-0 w-80 h-32 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f2fe]" />
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display">
              <Users className="w-4 h-4 text-cyan-400" />
              Biểu Đồ Tăng Trưởng &amp; Hoạt Động Khán Giả (User Telemetry &amp; DAU)
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Dữ liệu tổng hợp người dùng hoạt động hàng ngày, tài khoản đăng ký mới và tỷ lệ giữ chân 7 ngày qua.
          </p>
        </div>

        {/* Time Horizon Tabs */}
        <div className="flex items-center bg-[#050912] border border-slate-800 rounded-lg p-1 text-xs font-mono">
          <button
            type="button"
            onClick={() => setHorizon('7d')}
            className={cn(
              'px-3 py-1 rounded-md transition-all cursor-pointer',
              horizon === '7d'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            )}
          >
            7 Ngày Qua
          </button>
          <button
            type="button"
            onClick={() => setHorizon('30d')}
            className={cn(
              'px-3 py-1 rounded-md transition-all cursor-pointer',
              horizon === '30d'
                ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            )}
          >
            30 Ngày Qua
          </button>
        </div>
      </div>

      {/* Interactive Legend Switches */}
      <div className="flex flex-wrap items-center gap-3 mb-3 text-xs font-mono relative z-10">
        <button
          type="button"
          onClick={() => setVisibleSeries((s) => ({ ...s, dau: !s.dau }))}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all cursor-pointer select-none text-[11px]',
            visibleSeries.dau
              ? 'bg-cyan-950/70 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
              : 'bg-slate-900/60 border-slate-700 text-slate-500 line-through opacity-60'
          )}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          Người Dùng Hoạt Động (DAU)
        </button>

        <button
          type="button"
          onClick={() => setVisibleSeries((s) => ({ ...s, signups: !s.signups }))}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all cursor-pointer select-none text-[11px]',
            visibleSeries.signups
              ? 'bg-purple-950/70 border-purple-400 text-purple-300 shadow-[0_0_8px_rgba(168,85,247,0.3)]'
              : 'bg-slate-900/60 border-slate-700 text-slate-500 line-through opacity-60'
          )}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
          Đăng Ký Mới (Signups)
        </button>

        <button
          type="button"
          onClick={() => setVisibleSeries((s) => ({ ...s, retention: !s.retention }))}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all cursor-pointer select-none text-[11px]',
            visibleSeries.retention
              ? 'bg-emerald-950/70 border-emerald-400 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
              : 'bg-slate-900/60 border-slate-700 text-slate-500 line-through opacity-60'
          )}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          Tỷ Lệ Giữ Chân (Retention %)
        </button>
      </div>

      {/* SVG Multi-Line Chart Canvas */}
      <div className="relative w-full h-[190px] bg-[#050912] rounded-xl border border-slate-800 p-2 overflow-hidden flex flex-col justify-end select-none">
        <svg
          viewBox="0 0 680 180"
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="userDauAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.30" />
              <stop offset="70%" stopColor="#0284c7" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="userSignupsAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#9333ea" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="userDauLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#00f2fe" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>

            <filter id="userGlowCyan" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#00f2fe" floodOpacity="0.7"/>
            </filter>
            <filter id="userGlowPurple" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#c084fc" floodOpacity="0.6"/>
            </filter>
          </defs>

          {/* Grid Lines */}
          {[
            { y: 24, lL: '40k', lR: '1.2k' },
            { y: 60, lL: '30k', lR: '900' },
            { y: 96, lL: '20k', lR: '600' },
            { y: 132, lL: '10k', lR: '300' },
            { y: 156, lL: '0', lR: '0' },
          ].map((g, idx) => (
            <g key={idx}>
              <line
                x1={CHART_DIM.padL}
                y1={g.y}
                x2={CHART_DIM.width - CHART_DIM.padR}
                y2={g.y}
                stroke={idx === 4 ? '#334155' : '#1e293b'}
                strokeWidth={idx === 4 ? '1.2' : '1'}
                strokeDasharray={idx === 4 ? undefined : '3,3'}
              />
              <text
                x={CHART_DIM.padL - 6}
                y={g.y + 3.5}
                fill="#64748b"
                fontSize="7.5"
                fontFamily="'Fira Code', monospace"
                textAnchor="end"
              >
                {g.lL}
              </text>
              <text
                x={CHART_DIM.width - CHART_DIM.padR + 6}
                y={g.y + 3.5}
                fill="#a855f7"
                fontSize="7.5"
                fontFamily="'Fira Code', monospace"
                textAnchor="start"
              >
                {g.lR}
              </text>
            </g>
          ))}

          {/* Vertical Step Markers */}
          {svgData.points.map((pt, i) => (
            <g key={i}>
              <line
                x1={pt.x}
                y1={CHART_DIM.padT}
                x2={pt.x}
                y2={CHART_DIM.height - CHART_DIM.padB}
                stroke="#162235"
                strokeWidth="1"
                strokeDasharray="2,4"
              />
              <text
                x={pt.x}
                y={CHART_DIM.height - CHART_DIM.padB + 13}
                fill={hoverIndex === i ? '#38bdf8' : '#64748b'}
                fontSize="7.5"
                fontWeight={hoverIndex === i ? '700' : '400'}
                fontFamily="'Fira Code', monospace"
                textAnchor="middle"
              >
                {pt.raw.day}
              </text>
            </g>
          ))}

          {/* Series 2: New Signups (Purple) */}
          {visibleSeries.signups && svgData.signupsSpline && (
            <>
              <path d={svgData.signupsArea} fill="url(#userSignupsAreaGrad)" />
              <path
                d={svgData.signupsSpline}
                fill="none"
                stroke="#c084fc"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#userGlowPurple)"
              />
            </>
          )}

          {/* Series 3: Retention Rate (Emerald Dotted) */}
          {visibleSeries.retention && svgData.retentionSpline && (
            <path
              d={svgData.retentionSpline}
              fill="none"
              stroke="#34d399"
              strokeWidth="1.8"
              strokeDasharray="4,3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Series 1: DAU Line (Cyan Glowing) */}
          {visibleSeries.dau && svgData.dauSpline && (
            <>
              <path d={svgData.dauArea} fill="url(#userDauAreaGrad)" />
              <path
                d={svgData.dauSpline}
                fill="none"
                stroke="url(#userDauLineGrad)"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#userGlowCyan)"
              />
            </>
          )}

          {/* Data Points on DAU Line */}
          {visibleSeries.dau &&
            svgData.points.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.yDau}
                r={hoverIndex === i ? 4.5 : 2.5}
                fill="#00f2fe"
                stroke="#050912"
                strokeWidth="1.5"
              />
            ))}

          {/* Peak Marker */}
          {visibleSeries.dau && svgData.peak && (
            <g>
              <circle
                cx={svgData.peak.x}
                cy={svgData.peak.yDau}
                r="8"
                fill="none"
                stroke="#00f2fe"
                strokeWidth="1"
                className="animate-ping"
                opacity="0.4"
              />
              <circle cx={svgData.peak.x} cy={svgData.peak.yDau} r="4" fill="#ffffff" stroke="#00f2fe" strokeWidth="2" />
            </g>
          )}

          {/* Active Hover Crosshair Line */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={CHART_DIM.padT}
                x2={activePoint.x}
                y2={CHART_DIM.height - CHART_DIM.padB}
                stroke="#38bdf8"
                strokeWidth="1.2"
                strokeDasharray="2,2"
              />
            </g>
          )}

          {/* Invisible Trigger Columns */}
          {svgData.points.map((pt, i) => {
            const colW = (CHART_DIM.width - CHART_DIM.padL - CHART_DIM.padR) / (svgData.points.length - 1);
            return (
              <rect
                key={i}
                x={pt.x - colW / 2}
                y={CHART_DIM.padT}
                width={colW}
                height={CHART_DIM.height - CHART_DIM.padT - CHART_DIM.padB}
                fill="transparent"
                className="cursor-crosshair"
                onMouseEnter={() => setHoverIndex(i)}
              />
            );
          })}
        </svg>

        {/* Hover Tooltip Popup Card */}
        {activePoint && (
          <div
            className="absolute top-2 pointer-events-none z-20 px-3 py-2 rounded-lg bg-slate-950/95 border border-cyan-500/50 shadow-2xl backdrop-blur-md text-xs font-mono"
            style={{
              left: `${Math.min(75, Math.max(15, (activePoint.x / CHART_DIM.width) * 100))}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-1 mb-1">
              <span className="text-white font-bold">{activePoint.raw.day} ({activePoint.raw.dateStr})</span>
              <span className="text-[10px] text-emerald-400 font-bold">Giữ chân: {activePoint.raw.retentionRate}%</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-[11px]">
              <div>
                <span className="text-slate-400 text-[9px] block">HOẠT ĐỘNG:</span>
                <span className="text-cyan-300 font-bold">{activePoint.raw.dau.toLocaleString()} DAU</span>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] block">ĐĂNG KÝ:</span>
                <span className="text-purple-300 font-bold">+{activePoint.raw.newSignups} users</span>
              </div>
              <div>
                <span className="text-slate-400 text-[9px] block">VIP CONVERT:</span>
                <span className="text-amber-300 font-bold">{activePoint.raw.vipConversions} passes</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-3 border-t border-slate-800">
        <div className="p-2.5 rounded-lg bg-[#050a14] border border-slate-800 text-center">
          <span className="text-slate-400 text-[10px] font-mono uppercase block">Tổng Khán Giả Hệ Thống</span>
          <span className="text-sm sm:text-base font-black font-mono text-white">
            {totalUsersCount ? totalUsersCount.toLocaleString() : '38,450'}{' '}
            <span className="text-[10px] text-emerald-400 font-normal">(+42.8%)</span>
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[#050a14] border border-cyan-500/25 text-center">
          <span className="text-slate-400 text-[10px] font-mono uppercase block">Đỉnh Trực Tuyến (Peak CCU)</span>
          <span className="text-sm sm:text-base font-black font-mono text-cyan-300">
            14,820 <span className="text-[10px] text-slate-400 font-normal">users</span>
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[#050a14] border border-purple-500/25 text-center">
          <span className="text-slate-400 text-[10px] font-mono uppercase block">Tỷ Lệ Hoạt Động (DAU/MAU)</span>
          <span className="text-sm sm:text-base font-black font-mono text-purple-300">
            84.6% <span className="text-[10px] text-slate-400 font-normal">Active</span>
          </span>
        </div>

        <div className="p-2.5 rounded-lg bg-[#050a14] border border-emerald-500/25 text-center">
          <span className="text-slate-400 text-[10px] font-mono uppercase block">Tỷ Lệ Giữ Chân 7 Ngày</span>
          <span className="text-sm sm:text-base font-black font-mono text-emerald-300">
            68.4% <span className="text-[10px] text-slate-400 font-normal">Retention</span>
          </span>
        </div>
      </div>
    </Card>
  );
}
