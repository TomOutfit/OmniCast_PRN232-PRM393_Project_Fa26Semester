// ============================================================
// OmniCast - Broadcaster Console Component (Staff / Admin)
// ============================================================
// Real-time control surface for the active broadcast:
//   - Realtime viewer count monitor
//   - Pinned announcement broadcast form
//   - Chat feed with one-click comment moderation
//   - Reaction tickers
// ============================================================

'use client';

import React, { useState } from 'react';
import { Users, Send, Trash2, Megaphone, Radio, Sparkles, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';
import { useLiveSession } from '@/lib/hooks/useLiveSession';

export interface LiveBroadcasterConsoleProps {
  eventId: string;
  channelName: string;
  streamTitle: string;
  streamUrl?: string | null;
}

export function LiveBroadcasterConsole({
  eventId,
  channelName,
  streamTitle,
  streamUrl,
}: LiveBroadcasterConsoleProps) {
  const [announcementText, setAnnouncementText] = useState('');
  const [chatInput, setChatInput] = useState('');

  const {
    isConnected,
    viewerCount,
    messages,
    reactions,
    broadcastMessage,
    sendMessage,
    broadcastAnnouncement,
    deleteMessage,
  } = useLiveSession(eventId);

  const handleSendAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    broadcastAnnouncement(announcementText.trim());
    toast.success('Đã gửi thông báo ghim tới toàn bộ khán giả!');
    setAnnouncementText('');
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessage(chatInput.trim());
    setChatInput('');
  };

  const handleDeleteComment = (commentId: string) => {
    deleteMessage(commentId);
    toast.info('Đã xoá bình luận khỏi luồng phát.');
  };

  return (
    <div className="space-y-6">
      {/* Top Status Bar */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Trạng thái phát</span>
            <div className="flex items-center gap-1.5 text-xs font-black text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
              <span>LIVE NOW</span>
            </div>
          </div>
          <p className="mt-2 text-sm font-bold text-white line-clamp-1">{streamTitle}</p>
          <span className="text-xs text-cyan-400">{channelName}</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Khán giả đồng thời</span>
            <Users className="h-4 w-4 text-cyan-400" />
          </div>
          <p className="mt-2 text-2xl font-black text-white">{viewerCount}</p>
          <span className="text-xs text-slate-500">Kết nối realtime WebSocket</span>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Tổng lượt tương tác</span>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-center gap-3 text-sm font-bold text-white">
            <span>❤️ {reactions['HEART'] || 0}</span>
            <span>🔥 {reactions['FIRE'] || 0}</span>
            <span>👏 {reactions['CLAP'] || 0}</span>
            <span>🎉 {reactions['PARTY'] || 0}</span>
          </div>
          <span className="text-xs text-slate-500">Cập nhật tức thì</span>
        </div>
      </div>

      {/* Broadcast Announcement Form */}
      <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Megaphone className="h-4 w-4 text-rose-400" />
          <h4 className="text-xs font-black tracking-wider uppercase text-rose-300">
            Gửi thông điệp ghim tới toàn bộ khán giả
          </h4>
        </div>
        <form onSubmit={handleSendAnnouncement} className="flex gap-2">
          <input
            type="text"
            value={announcementText}
            onChange={(e) => setAnnouncementText(e.target.value)}
            placeholder="Ví dụ: Chương trình đặc biệt bắt đầu lúc 20:00, kính mời quý khán giả theo dõi..."
            className="flex-1 rounded-xl border border-rose-900/60 bg-slate-900/90 px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
          <button
            type="submit"
            disabled={!announcementText.trim()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-rose-500 disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Phát thông báo</span>
          </button>
        </form>
      </div>

      {/* Moderation Live Chat Feed */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-cyan-400" />
            <h4 className="text-sm font-bold text-white">
              Bình luận trực tiếp & Kiểm duyệt
            </h4>
          </div>
          <span className="text-xs text-slate-400">
            {messages.length} bình luận
          </span>
        </div>

        <div className="mt-4 max-h-96 overflow-y-auto space-y-2.5 pr-2">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-500">
              Chưa có bình luận nào từ khán giả.
            </p>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-slate-800/80 bg-slate-800/40 p-2.5 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">
                      {m.user?.fullName || 'Khán giả'}
                    </span>
                    {m.user?.role && (
                      <span className="rounded bg-slate-700 px-1 py-0.2 text-[9px] text-slate-300">
                        {m.user.role}
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500">
                      {new Date(m.createdAt).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-300 break-words">{m.content}</p>
                </div>

                <button
                  onClick={() => handleDeleteComment(m.id)}
                  className="rounded p-1 text-slate-500 hover:bg-rose-500/20 hover:text-rose-400"
                  title="Xoá bình luận vi phạm"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Broadcaster chat input */}
        <form onSubmit={handleSendChat} className="mt-4 flex gap-2 pt-4 border-t border-slate-800">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Trả lời khán giả với tư cách Broadcaster..."
            className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!chatInput.trim()}
            className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-40"
          >
            Gửi
          </button>
        </form>
      </div>
    </div>
  );
}
