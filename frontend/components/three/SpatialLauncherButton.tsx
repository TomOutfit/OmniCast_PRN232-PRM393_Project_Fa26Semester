'use client';

import React from 'react';
import { Compass, Sparkles } from 'lucide-react';
import { useSpatial3D } from '@/lib/three/spatial-context';

export function SpatialLauncherButton() {
  const { open, isOpen } = useSpatial3D();

  if (isOpen) return null;

  return (
    <div className="fixed bottom-6 left-6 z-40 print:hidden select-none">
      <button
        type="button"
        onClick={open}
        aria-label="Kích hoạt Không gian 3D OmniCast"
        className="group relative flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-slate-950/85 hover:bg-slate-900 border border-cyan-500/30 hover:border-cyan-400 text-white shadow-2xl shadow-cyan-950/60 backdrop-blur-xl transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
      >
        {/* Pulsing indicator */}
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500 shadow-[0_0_8px_#00f2fe]" />
        </span>

        <Compass className="w-4 h-4 text-cyan-400 group-hover:rotate-45 transition-transform duration-300" />

        <div className="flex flex-col text-left">
          <span className="text-[11px] font-black uppercase tracking-wider bg-gradient-to-r from-cyan-400 via-sky-200 to-white bg-clip-text text-transparent">
            3D SPATIAL
          </span>
          <span className="text-[9px] text-slate-400 font-mono hidden sm:inline">
            Vũ trụ 360°
          </span>
        </div>
      </button>
    </div>
  );
}
