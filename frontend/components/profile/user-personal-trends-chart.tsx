'use client';

import React, { useState, useMemo } from 'react';
import {
  Clock,
  ThumbsUp,
  Tv,
  Zap,
  TrendingUp,
  Sparkles,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PersonalDayData {
  day: string;
  dateStr: string;
  hours: number;
  dataGb: number;
  reactions: number;
}

const PERSONAL_7D_DATA: PersonalDayData[] = [
  { day: 'T2', dateStr: '19/10', hours: 2.4, dataGb: 5.8, reactions: 14 },
  { day: 'T3', dateStr: '20/10', hours: 1.8, dataGb: 4.2, reactions: 8 },
  { day: 'T4', dateStr: '21/10', hours: 3.2, dataGb: 7.9, reactions: 26 },
  { day: 'T5', dateStr: '22/10', hours: 2.1, dataGb: 5.1, reactions: 12 },
  { day: 'T6', dateStr: '23/10', hours: 4.6, dataGb: 11.4, reactions: 38 },
  { day: 'T7', dateStr: '24/10', hours: 5.8, dataGb: 14.2, reactions: 52 },
  { day: 'CN', dateStr: '25/10', hours: 4.9, dataGb: 12.1, reactions: 44 },
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

interface UserPersonalTrendsChartProps {
  totalHours?: number;
  totalReactions?: number;
}

const CHART_DIM = { width: 560, height: 160, padL: 38, padR: 32, padT: 20, padB: 24 };

export function UserPersonalTrendsChart({ totalHours, totalReactions }: UserPersonalTrendsChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const [visible, setVisible] = useState({
    hours: true,
    data: true,
    reactions: true,
  });


  const svgData = useMemo(() => {
    const plotW = CHART_DIM.width - CHART_DIM.padL - CHART_DIM.padR;
    const plotH = CHART_DIM.height - CHART_DIM.padT - CHART_DIM.padB;

    const maxHours = 7.0; // max 7 hours
    const maxData = 16.0; // max 16 GB
    const maxReacts = 60; // max 60 reactions

    const points = PERSONAL_7D_DATA.map((pt, i) => {
      const x = CHART_DIM.padL + (i / (PERSONAL_7D_DATA.length - 1)) * plotW;

      const normH = Math.min(1, Math.max(0, pt.hours / maxHours));
      const yH = CHART_DIM.height - CHART_DIM.padB - normH * plotH;

      const normD = Math.min(1, Math.max(0, pt.dataGb / maxData));
      const yD = CHART_DIM.height - CHART_DIM.padB - normD * plotH;

      const normR = Math.min(1, Math.max(0, pt.reactions / maxReacts));
      const yR = CHART_DIM.height - CHART_DIM.padB - normR * plotH;

      return { x, yH, yD, yR, raw: pt, index: i };
    });

    const hCoords = points.map((p) => ({ x: p.x, y: p.yH }));
    const dCoords = points.map((p) => ({ x: p.x, y: p.yD }));
    const rCoords = points.map((p) => ({ x: p.x, y: p.yR }));

    const hoursSpline = generateBezierSpline(hCoords);
    const hoursArea = `${hoursSpline} L ${points[points.length - 1].x.toFixed(1)},${(CHART_DIM.height - CHART_DIM.padB).toFixed(1)} L ${points[0].x.toFixed(1)},${(CHART_DIM.height - CHART_DIM.padB).toFixed(1)} Z`;

    const dataSpline = generateBezierSpline(dCoords);
    const dataArea = `${dataSpline} L ${points[points.length - 1].x.toFixed(1)},${(CHART_DIM.height - CHART_DIM.padB).toFixed(1)} L ${points[0].x.toFixed(1)},${(CHART_DIM.height - CHART_DIM.padB).toFixed(1)} Z`;

    const reactionsSpline = generateBezierSpline(rCoords);

    return {
      points,
      hoursSpline,
      hoursArea,
      dataSpline,
      dataArea,
      reactionsSpline,
    };
  }, []);

  const activePoint = hoverIndex !== null && svgData.points[hoverIndex] ? svgData.points[hoverIndex] : null;

  return (
    <Card className="p-5 glass-card mb-6 border border-primary-500/25 bg-[#090f1c]/90 shadow-xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-display">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              Biểu Đồ Thời Lượng Xem &amp; Tương Tác 7 Ngày Qua
            </h3>
          </div>
          <p className="text-xs text-dark-300">
            Theo dõi xu hướng thời gian xem truyền hình trực tuyến, lưu lượng dữ liệu và lượt tương tác cá nhân.
          </p>
        </div>

        {/* Legend buttons */}
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={() => setVisible((s) => ({ ...s, hours: !s.hours }))}
            className={cn(
              'px-2 py-0.5 rounded-full border text-[10px] cursor-pointer transition-all flex items-center gap-1',
              visible.hours ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300' : 'bg-dark-900 border-dark-700 text-dark-500 line-through'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            Thời Gian (Giờ)
          </button>

          <button
            type="button"
            onClick={() => setVisible((s) => ({ ...s, data: !s.data }))}
            className={cn(
              'px-2 py-0.5 rounded-full border text-[10px] cursor-pointer transition-all flex items-center gap-1',
              visible.data ? 'bg-purple-950/80 border-purple-400 text-purple-300' : 'bg-dark-900 border-dark-700 text-dark-500 line-through'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            Dữ Liệu (GB)
          </button>

          <button
            type="button"
            onClick={() => setVisible((s) => ({ ...s, reactions: !s.reactions }))}
            className={cn(
              'px-2 py-0.5 rounded-full border text-[10px] cursor-pointer transition-all flex items-center gap-1',
              visible.reactions ? 'bg-amber-950/80 border-amber-400 text-amber-300' : 'bg-dark-900 border-dark-700 text-dark-500 line-through'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Lượt Thích
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative w-full h-[170px] bg-[#050811] rounded-xl border border-dark-700 p-2 overflow-hidden flex flex-col justify-end select-none">
        <svg
          viewBox="0 0 560 160"
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="userHoursAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00f2fe" stopOpacity="0.32" />
              <stop offset="70%" stopColor="#0284c7" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="userDataAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#9333ea" stopOpacity="0.0" />
            </linearGradient>

            <linearGradient id="userHoursLineGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#00f2fe" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>

            <filter id="pGlowCyan" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor="#00f2fe" floodOpacity="0.7"/>
            </filter>
          </defs>

          {/* Grid lines */}
          {[
            { y: 20, lL: '6h', lR: '14G' },
            { y: 56, lL: '4h', lR: '9G' },
            { y: 92, lL: '2h', lR: '5G' },
            { y: 136, lL: '0', lR: '0' },
          ].map((g, idx) => (
            <g key={idx}>
              <line
                x1={CHART_DIM.padL}
                y1={g.y}
                x2={CHART_DIM.width - CHART_DIM.padR}
                y2={g.y}
                stroke={idx === 3 ? '#334155' : '#1e293b'}
                strokeWidth={idx === 3 ? '1.2' : '1'}
                strokeDasharray={idx === 3 ? undefined : '3,3'}
              />
              <text x={CHART_DIM.padL - 6} y={g.y + 3.5} fill="#64748b" fontSize="7.5" fontFamily="'Fira Code', monospace" textAnchor="end">{g.lL}</text>
              <text x={CHART_DIM.width - CHART_DIM.padR + 6} y={g.y + 3.5} fill="#a855f7" fontSize="7.5" fontFamily="'Fira Code', monospace" textAnchor="start">{g.lR}</text>
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

          {/* Series 2: Data Consumption (Purple) */}
          {visible.data && svgData.dataSpline && (
            <>
              <path d={svgData.dataArea} fill="url(#userDataAreaGrad)" />
              <path
                d={svgData.dataSpline}
                fill="none"
                stroke="#c084fc"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Series 3: Reactions (Amber Dotted) */}
          {visible.reactions && svgData.reactionsSpline && (
            <path
              d={svgData.reactionsSpline}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="1.8"
              strokeDasharray="4,3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Series 1: Watch Hours (Cyan Glowing) */}
          {visible.hours && svgData.hoursSpline && (
            <>
              <path d={svgData.hoursArea} fill="url(#userHoursAreaGrad)" />
              <path
                d={svgData.hoursSpline}
                fill="none"
                stroke="url(#userHoursLineGrad)"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#pGlowCyan)"
              />
            </>
          )}

          {/* Point Markers */}
          {visible.hours &&
            svgData.points.map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.yH}
                r={hoverIndex === i ? 4.5 : 2.5}
                fill="#00f2fe"
                stroke="#050811"
                strokeWidth="1.5"
              />
            ))}

          {/* Hover Line */}
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

        {/* Hover Tooltip */}
        {activePoint && (
          <div
            className="absolute top-2 pointer-events-none z-20 px-3 py-1.5 rounded-lg bg-dark-900/95 border border-cyan-500/50 shadow-xl backdrop-blur-md text-xs font-mono"
            style={{
              left: `${Math.min(75, Math.max(15, (activePoint.x / CHART_DIM.width) * 100))}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <div className="text-white font-bold border-b border-dark-700 pb-1 mb-1">
              {activePoint.raw.day} ({activePoint.raw.dateStr})
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-cyan-300 font-bold">{activePoint.raw.hours} Giờ Xem</span>
              <span className="text-purple-300 font-bold">{activePoint.raw.dataGb} GB</span>
              <span className="text-amber-300 font-bold">{activePoint.raw.reactions} Like</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer KPI bar */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-dark-700/80 text-center text-xs font-mono">
        <div>
          <span className="text-dark-400 text-[10px] block">TỔNG XEM TUẦN NÀY:</span>
          <span className="text-cyan-300 font-bold">25.4 Giờ</span>
        </div>
        <div>
          <span className="text-dark-400 text-[10px] block">LƯU LƯỢNG 4K/HD:</span>
          <span className="text-purple-300 font-bold">62.7 GB</span>
        </div>
        <div>
          <span className="text-dark-400 text-[10px] block">ĐỘ TRỄ TRUNG BÌNH:</span>
          <span className="text-emerald-400 font-bold">1.84s (Buffer-Free)</span>
        </div>
      </div>
    </Card>
  );
}
