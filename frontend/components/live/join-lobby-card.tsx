/* eslint-disable @next/next/no-img-element */
// ============================================================
// OmniCast - Join Lobby Card
// ============================================================
// Confirmation & lobby card presented to viewers before entering
// the live broadcast stream.
// ============================================================

'use client';

import React from 'react';
import Image from 'next/image';
import { Radio, Users, Play, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export interface JoinLobbyCardProps {
  eventId: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  channel?: {
    id: string;
    slug: string;
    name: string;
    logoUrl?: string | null;
  } | null;
  viewerCount: number;
  onJoin: () => void;
}

export function JoinLobbyCard({
  title,
  description,
  thumbnailUrl,
  channel,
  viewerCount,
  onJoin,
}: JoinLobbyCardProps) {
  const router = useRouter();

  return (
    <div className="relative mx-auto my-12 w-full max-w-xl overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-900/80 p-8 shadow-2xl shadow-cyan-500/10 backdrop-blur-xl">
      {/* Decorative ambient gradient */}
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-rose-500/20 blur-3xl" />

      {/* Header status badge */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-xs font-black tracking-wider text-rose-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
          </span>
          <Radio className="h-3.5 w-3.5" />
          <span>PHÁT SÓNG TRỰC TIẾP</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <Users className="h-4 w-4 text-cyan-400" />
          <span className="text-slate-200 font-bold">{viewerCount}</span>
          <span>người đang xem</span>
        </div>
      </div>

      {/* Program & Channel info */}
      <div className="mt-6 flex flex-col items-center text-center">
        {thumbnailUrl ? (
          <div className="relative mb-6 aspect-video w-full overflow-hidden rounded-xl border border-slate-700/60 shadow-lg">
            <img
              src={thumbnailUrl}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
          </div>
        ) : null}

        {channel && (
          <div className="mb-3 flex items-center gap-2.5 rounded-full border border-cyan-500/20 bg-slate-800/60 px-4 py-1.5">
            {channel.logoUrl ? (
              <img
                src={channel.logoUrl}
                alt={channel.name}
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <div className="h-5 w-5 rounded-full bg-cyan-500/20 text-[10px] font-bold text-cyan-400 flex items-center justify-center">
                {channel.name.slice(0, 1)}
              </div>
            )}
            <span className="text-xs font-bold text-cyan-300">
              {channel.name}
            </span>
          </div>
        )}

        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          {title}
        </h1>

        {description && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-400">
            {description}
          </p>
        )}

        <p className="mt-4 text-xs text-slate-500">
          Chương trình phát sóng tương tác 2 chiều. Bạn có thể bình luận và thả cảm xúc cùng tất cả khán giả ngay trong luồng phát.
        </p>

        {/* Primary CTA */}
        <div className="mt-8 flex w-full flex-col gap-3">
          <button
            onClick={onJoin}
            className="group relative inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 font-bold text-slate-950 shadow-lg shadow-cyan-500/25 transition-all duration-300 hover:from-cyan-400 hover:to-blue-500 hover:shadow-cyan-500/40 active:scale-[0.99]"
          >
            <Play className="h-5 w-5 fill-slate-950" />
            <span className="text-base tracking-wide">THAM GIA LIVE NGAY</span>
          </button>

          <button
            onClick={() => router.back()}
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-700/60 bg-transparent text-sm font-semibold text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Để sau</span>
          </button>
        </div>
      </div>
    </div>
  );
}
