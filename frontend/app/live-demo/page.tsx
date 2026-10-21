/**
 * OmniCast - Live Stream Demo Page
 * 
 * This page demonstrates the live streaming functionality:
 * - Shows a live stream viewer that auto-switches to live when available
 * - Displays viewer count in real-time
 * - Shows live/stopped indicators
 * 
 * To test:
 * 1. Start mobile app and go to Studio Recorder
 * 2. Select "Push-to-Live" mode
 * 3. Start streaming
 * 4. Open this page - you should see the live stream appear
 */

'use client';

import { useState } from 'react';
import LiveStreamViewer from '@/components/programs/live-stream-viewer';
import { cn } from '@/lib/utils';
import { Radio, Eye, Wifi, WifiOff } from 'lucide-react';

// Demo channels for testing
const DEMO_CHANNELS = [
  {
    slug: 'sport-1',
    name: 'Omni Sport 1',
    description: 'Bóng đá quốc tế & Thể thao',
    fallback: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    slug: 'sport-2',
    name: 'Omni Sport 2',
    description: 'Bóng rổ & Esports',
    fallback: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
  {
    slug: 'news-1',
    name: 'Omni News',
    description: 'Tin tức 24/7',
    fallback: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
  },
];

export default function LiveDemoPage() {
  const [selectedChannel, setSelectedChannel] = useState(DEMO_CHANNELS[0]);
  const [isConnected, setIsConnected] = useState(false);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-cyan-400">OmniCast Live Demo</h1>
              <p className="text-gray-400 text-sm">
                Xem video trực tiếp từ mobile camera
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 border border-green-600/50 rounded-full text-sm text-green-400">
                  <Wifi className="w-4 h-4" />
                  Đã kết nối
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/20 border border-red-600/50 rounded-full text-sm text-red-400">
                  <WifiOff className="w-4 h-4" />
                  Chưa kết nối
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Instructions */}
        <div className="mb-8 p-4 bg-cyan-950/30 border border-cyan-800/50 rounded-lg">
          <h2 className="text-lg font-semibold text-cyan-400 mb-2 flex items-center gap-2">
            <Radio className="w-5 h-5" />
            Cách thức hoạt động
          </h2>
          <ol className="text-gray-300 space-y-1 text-sm">
            <li>1. Mở ứng dụng OmniCast trên mobile</li>
            <li>2. Vào <strong className="text-white">Studio Recorder</strong> (Tab Tự Ghi Hình)</li>
            <li>3. Chọn chế độ <strong className="text-white">PUSH-TO-LIVE</strong></li>
            <li>4. Nhấn nút đỏ để bắt đầu phát sóng trực tiếp</li>
            <li>5. Quay lại trang này để xem video trực tiếp!</li>
          </ol>
        </div>

        {/* Channel Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Chọn kênh để xem:
          </label>
          <div className="flex gap-3 flex-wrap">
            {DEMO_CHANNELS.map((channel) => (
              <button
                key={channel.slug}
                onClick={() => setSelectedChannel(channel)}
                className={cn(
                  'px-4 py-2 rounded-lg border transition-all',
                  selectedChannel.slug === channel.slug
                    ? 'bg-cyan-600 border-cyan-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600',
                )}
              >
                <span className="font-medium">{channel.name}</span>
                <span className="block text-xs opacity-70">{channel.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live Stream Viewer */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Eye className="w-5 h-5 text-cyan-400" />
              {selectedChannel.name}
            </h2>
          </div>

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

        {/* Technical Info */}
        <div className="mt-12 p-6 bg-gray-900 rounded-lg border border-gray-800">
          <h3 className="text-lg font-semibold text-white mb-4">Thông tin kỹ thuật</h3>
          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-cyan-400 mb-2">Luồng dữ liệu</h4>
              <ul className="text-gray-400 space-y-1">
                <li>• Mobile → Backend: WebRTC (RTMP qua MediaMTX)</li>
                <li>• Backend → Viewer: WebSocket (real-time)</li>
                <li>• Viewer → Stream: HLS (adaptive bitrate)</li>
                <li>• CDN: Bunny Stream / Cloudflare Stream</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-cyan-400 mb-2">Tính năng</h4>
              <ul className="text-gray-400 space-y-1">
                <li>• Tự động chuyển sang live khi Admin phát sóng</li>
                <li>• Số người xem real-time</li>
                <li>• Low-latency HLS cho live stream</li>
                <li>• Fallback VOD khi không có live</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12 py-6 text-center text-gray-500 text-sm">
        <p>OmniCast - Hệ thống Phát thanh Truyền hình Số thế hệ mới</p>
        <p className="mt-1">PRN232 + PRM393 Project</p>
      </footer>
    </div>
  );
}
