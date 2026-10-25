/**
 * OmniCast - Live Stream Broadcast Control & Telemetry Center
 * ─────────────────────────────────────────────────────────────────────
 * 3D Holographic Ingestion Monitor & Push-to-Live Verification Hub
 */

'use client';

import { useState } from 'react';
import LiveStreamViewer from '@/components/programs/live-stream-viewer';
import { cn } from '@/lib/utils';
import { Radio, Eye, Wifi, WifiOff, Sparkles, Smartphone, Cpu, ShieldCheck, Activity, Terminal } from 'lucide-react';
import { Card } from '@/components/ui/card';

// Demo channels for testing
const DEMO_CHANNELS = [
  {
    slug: 'sport-1',
    name: 'Omni Sport 1 (4K)',
    description: 'Bóng đá Ngoại Hạng Anh & Thể thao đỉnh cao',
    fallback: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    slug: 'sport-2',
    name: 'Omni Sport 2 (Esports)',
    description: 'Bóng rổ NBA & Esports Championship',
    fallback: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    slug: 'news-1',
    name: 'Omni News 24/7',
    description: 'Bản tin tài chính & thời sự quốc tế',
    fallback: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
];

export default function LiveDemoPage() {
  const [selectedChannel, setSelectedChannel] = useState(DEMO_CHANNELS[0]);
  const [isConnected, setIsConnected] = useState(true);

  return (
    <div className="min-h-screen bg-[#070b12]/60 backdrop-blur-[1px] text-slate-100 py-8 px-4 lg:px-8 selection:bg-cyan-500/30 selection:text-cyan-200">
      <div className="max-w-[1600px] mx-auto space-y-8">
        
        {/* ── 3D Control Room Hero Header ──────────────────────────── */}
        <div className="p-6 md:p-8 rounded-3xl card-3d-surface flex flex-wrap items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-48 bg-gradient-to-l from-cyan-500/15 via-blue-500/10 to-transparent blur-3xl pointer-events-none" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_10px_#00f2fe]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400 font-mono">
                TELEMETRY & INGESTION CONTROL ROOM // BROADCAST 4K
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight font-display text-glow-cyan">
              Trung Tâm Kiểm Thử Phát Sóng Trực Tiếp
            </h1>
            <p className="text-xs text-slate-300/80 mt-1 max-w-xl leading-relaxed">
              Giám sát luồng phát trực tiếp thời gian thực từ Mobile Studio Recorder, đo kiểm độ trễ WebRTC/HLS và xác thực chuyển mạch tự động.
            </p>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            {isConnected ? (
              <span className="flex items-center gap-2 px-4 py-2 bg-emerald-950/80 border border-emerald-400/50 rounded-2xl text-xs font-mono font-bold text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)] backdrop-blur-xl">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
                <Wifi className="w-4 h-4 text-emerald-400" />
                SIGNAL ONLINE // LATENCY &lt;1.2S
              </span>
            ) : (
              <span className="flex items-center gap-2 px-4 py-2 bg-rose-950/80 border border-rose-500/50 rounded-2xl text-xs font-mono font-bold text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)] backdrop-blur-xl">
                <WifiOff className="w-4 h-4 text-rose-400" />
                SIGNAL OFFLINE
              </span>
            )}
          </div>
        </div>

        {/* ── Operational Instructions (3D Glass Box) ─────────────── */}
        <div className="p-6 rounded-3xl card-3d-surface relative overflow-hidden">
          <div className="flex items-center gap-2.5 text-cyan-400 font-display font-black text-base mb-4">
            <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span>Quy Trình Phát Sóng PUSH-TO-LIVE (Mobile Camera → Web Monitor)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 text-xs">
            <div className="p-3.5 rounded-2xl bg-[#090f1d]/80 border border-white/[0.06] space-y-1 backdrop-blur-md">
              <span className="text-[10px] font-mono font-black text-cyan-400">BƯỚC 01</span>
              <p className="font-bold text-white">Mở Ứng Dụng</p>
              <p className="text-slate-400 text-[11px]">Khởi động app OmniCast trên thiết bị Flutter di động.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#090f1d]/80 border border-white/[0.06] space-y-1 backdrop-blur-md">
              <span className="text-[10px] font-mono font-black text-cyan-400">BƯỚC 02</span>
              <p className="font-bold text-white">Studio Recorder</p>
              <p className="text-slate-400 text-[11px]">Vào tab Tự Ghi Hình &amp; chọn kênh mục tiêu.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#090f1d]/80 border border-white/[0.06] space-y-1 backdrop-blur-md">
              <span className="text-[10px] font-mono font-black text-cyan-400">BƯỚC 03</span>
              <p className="font-bold text-white">PUSH-TO-LIVE</p>
              <p className="text-slate-400 text-[11px]">Bật chế độ phát sóng trực tiếp từ Camera 4K.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#090f1d]/80 border border-white/[0.06] space-y-1 backdrop-blur-md">
              <span className="text-[10px] font-mono font-black text-cyan-400">BƯỚC 04</span>
              <p className="font-bold text-white">Bắt Đầu Ghi Hình</p>
              <p className="text-slate-400 text-[11px]">Bấm nút đỏ ghi hình để bắt đầu đẩy tín hiệu RTMP/WebRTC.</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 space-y-1 backdrop-blur-md">
              <span className="text-[10px] font-mono font-black text-emerald-400">BƯỚC 05</span>
              <p className="font-bold text-white">Giám Sát Tức Thì</p>
              <p className="text-slate-300 text-[11px]">Màn hình bên dưới tự động chuyển luồng Live ngay lập tức!</p>
            </div>
          </div>
        </div>

        {/* ── Channel Selector (3D Tactile Buttons) ────────────────── */}
        <div className="space-y-3">
          <label className="block text-xs font-mono font-extrabold text-slate-300 uppercase tracking-wider">
            Chọn kênh truyền hình giám sát luồng:
          </label>
          <div className="flex gap-4 flex-wrap">
            {DEMO_CHANNELS.map((channel) => {
              const isSelected = selectedChannel.slug === channel.slug;
              return (
                <button
                  key={channel.slug}
                  onClick={() => setSelectedChannel(channel)}
                  className={cn(
                    'px-5 py-3 rounded-2xl border text-left transition-all cursor-pointer backdrop-blur-xl',
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-500/20 via-blue-600/20 to-cyan-500/10 border-cyan-400 text-white shadow-[0_0_20px_rgba(0,242,254,0.3)] scale-102'
                      : 'bg-[#0b1320]/80 border-white/[0.08] text-slate-400 hover:text-white hover:border-cyan-500/30'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn('w-2 h-2 rounded-full', isSelected ? 'bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f2fe]' : 'bg-slate-600')} />
                    <span className="font-black text-xs font-display">{channel.name}</span>
                  </div>
                  <span className="block text-[11px] text-slate-400 mt-1 font-mono">{channel.description}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 3D Live Stream Monitor Viewer ────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2 font-display">
              <Eye className="w-5 h-5 text-cyan-400" />
              <span>Màn Hình Kiểm Đo: {selectedChannel.name}</span>
            </h2>
            <span className="text-[11px] font-mono text-cyan-300 px-3 py-1 rounded-xl bg-cyan-950/70 border border-cyan-500/40">
              ABR ACTIVE // 4K 60FPS
            </span>
          </div>

          <div className="rounded-3xl overflow-hidden bg-black border border-cyan-500/40 shadow-[0_30px_70px_-15px_rgba(0,0,0,0.95),0_0_45px_rgba(0,242,254,0.18)] relative">
            <LiveStreamViewer
              channelSlug={selectedChannel.slug}
              fallbackStreamUrl={selectedChannel.fallback}
              title={selectedChannel.name}
              showViewerCount={true}
              showLiveBadge={true}
              autoPlay={true}
              onStreamChange={(isLive, streamUrl) => {
                console.log(`Stream changed: isLive=${isLive}, url=${streamUrl}`);
              }}
            />
          </div>
        </div>

        {/* ── Telemetry & Technical Pipeline (3D Cyber Matrix) ───── */}
        <div className="p-8 rounded-3xl card-3d-surface space-y-6">
          <div className="flex items-center gap-2.5 text-white font-display font-black text-lg">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <span>Kiến Trúc Đường Truyền &amp; Thông Số Kỹ Thuật Đa Tầng</span>
          </div>
          <div className="grid md:grid-cols-2 gap-8 text-xs font-mono">
            <div className="p-5 rounded-2xl bg-[#090f1d]/80 border border-white/[0.06] space-y-3">
              <h4 className="font-black text-cyan-400 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" />
                Đường Dẫn Tín Hiệu (Ingestion Pipeline)
              </h4>
              <ul className="text-slate-300 space-y-2 leading-relaxed">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Mobile → Media Server: WebRTC Live Ingestion (MediaMTX)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Backend → Web Clients: WebSocket Broadcast Push</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Viewer Stream: HLS.js Adaptive Bitrate (480p → 4K)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span>Edge CDN: Bunny Stream Global CDN Cache</span>
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-[#090f1d]/80 border border-white/[0.06] space-y-3">
              <h4 className="font-black text-cyan-400 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                Tính Năng Tự Động &amp; Dự Phòng (High Availability)
              </h4>
              <ul className="text-slate-300 space-y-2 leading-relaxed">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Tự động nhận diện &amp; hoán chuyển ngay khi mobile phát</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Đếm số người xem trực tiếp Real-Time không delay</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Độ trễ thấp siêu tốc (&lt;1.2s) hỗ trợ tương tác tức thì</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Tự động chuyển tiếp Fallback VOD 4K khi kết thúc</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
