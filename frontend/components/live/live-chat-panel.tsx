/* eslint-disable @next/next/no-img-element */
// ============================================================
// OmniCast - Live Chat Panel Component
// ============================================================

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2, Heart, Flame, ThumbsUp, Sparkles, MessageSquare, ShieldAlert, Gift, ShieldCheck, CheckCircle2, X } from 'lucide-react';
import { LiveComment } from '@/lib/api/live';
import { BroadcasterAnnouncement } from '@/lib/hooks/useLiveSession';
import { useAuth } from '@/lib/auth-context';
import { LiveDonationDialog } from './live-donation-dialog';

export interface LiveChatPanelProps {
  eventId: string;
  messages: LiveComment[];
  reactions: Record<string, number>;
  latestReaction?: string | null;
  broadcastMessage?: BroadcasterAnnouncement | null;
  latestDonation?: any | null;
  streamerWalletBalance?: number | null;
  onSendMessage: (content: string) => void;
  onSendReaction: (type: string) => void;
  onDeleteMessage?: (commentId: string) => void;
  onDismissAnnouncement?: () => void;
}

const REACTION_BUTTONS = [
  { type: 'HEART', label: '❤️', icon: Heart, color: 'text-rose-500' },
  { type: 'FIRE', label: '🔥', icon: Flame, color: 'text-amber-500' },
  { type: 'CLAP', label: '👏', icon: ThumbsUp, color: 'text-blue-400' },
  { type: 'PARTY', label: '🎉', icon: Sparkles, color: 'text-purple-400' },
];

export function LiveChatPanel({
  eventId,
  messages,
  reactions,
  latestReaction,
  broadcastMessage,
  latestDonation,
  streamerWalletBalance,
  onSendMessage,
  onSendReaction,
  onDeleteMessage,
  onDismissAnnouncement,
}: LiveChatPanelProps) {
  const [input, setInput] = useState('');
  const [isSuperChatOpen, setIsSuperChatOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const isStaffOrAdmin = user?.role === 'STAFF' || user?.role === 'ADMIN';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="relative flex h-full w-full flex-col rounded-xl border border-slate-800 bg-slate-900/90 shadow-xl backdrop-blur-md overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-bold tracking-wide text-white">
            TRÒ CHUYỆN TRỰC TIẾP
          </h3>
        </div>
        <div className="flex items-center gap-2">
          {streamerWalletBalance != null && (
            <div className="flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300 font-mono">
              <span className="text-amber-400">Quỹ Streamer:</span>
              <span>{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(streamerWalletBalance)}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Trực tiếp</span>
          </div>
        </div>
      </div>

      {/* Real-time Super Chat Donation Highlight Banner */}
      {latestDonation && (
        <div className="mx-3 mt-2 rounded-xl border border-amber-400/50 bg-gradient-to-r from-amber-950/80 via-orange-950/70 to-slate-900 p-2.5 shadow-lg shadow-amber-500/20 animate-in slide-in-from-top-2 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl animate-bounce">{latestDonation.giftEmoji || '🎉'}</span>
              <div>
                <p className="text-xs font-black text-amber-300">
                  {latestDonation.donorName}
                  <span className="ml-1 text-[10px] text-white/80 font-normal">vừa ủng hộ</span>
                </p>
                <p className="text-xs font-mono font-extrabold text-white">
                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(latestDonation.amount)}
                  <span className="ml-1 text-[10px] font-sans font-bold text-emerald-400">({latestDonation.giftTier || 'Super Chat'})</span>
                </p>
              </div>
            </div>
            <span className="rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-black text-slate-950 uppercase">
              SUPER CHAT
            </span>
          </div>
          {latestDonation.message && (
            <p className="mt-1 text-xs text-slate-200 italic pl-7 border-l-2 border-amber-400/40 ml-1">
              &ldquo;{latestDonation.message}&rdquo;
            </p>
          )}
        </div>
      )}
      {/* Broadcaster Announcement Banner */}
      {broadcastMessage && (
        <div className="relative border-b border-rose-500/30 bg-rose-950/60 p-3 text-xs text-rose-200">
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-black text-rose-300">
                📢 {broadcastMessage.senderName.toUpperCase()}:
              </span>{' '}
              <span className="font-medium text-white">
                {broadcastMessage.message}
              </span>
            </div>
            {onDismissAnnouncement && (
              <button
                onClick={onDismissAnnouncement}
                className="text-rose-400 hover:text-white"
                title="Đóng thông báo"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
            <MessageSquare className="h-8 w-8 opacity-40 mb-2" />
            <p className="text-xs">Chưa có bình luận nào.</p>
            <p className="text-[11px] text-slate-600">Hãy là người đầu tiên trò chuyện!</p>
          </div>
        ) : (
          messages.map((msg) => {
            const authorRole = msg.user?.role;
            const isBroadcaster = authorRole === 'STAFF' || authorRole === 'ADMIN';

            return (
              <div
                key={msg.id}
                className={`group flex items-start justify-between gap-2.5 rounded-lg p-2 transition-colors ${
                  isBroadcaster ? 'bg-cyan-950/30 border border-cyan-800/40' : 'hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  {msg.user?.avatarUrl ? (
                    <img
                      src={msg.user.avatarUrl}
                      alt={msg.user.fullName || 'User'}
                      className="h-7 w-7 shrink-0 rounded-full object-cover border border-slate-700"
                    />
                  ) : (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-slate-300">
                      {msg.user?.fullName?.slice(0, 1) || 'U'}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-200 truncate">
                        {msg.user?.fullName || 'Khán giả'}
                      </span>
                      {isBroadcaster && (
                        <span className="rounded bg-cyan-500/20 px-1 py-0.5 text-[9px] font-extrabold tracking-wider text-cyan-300 border border-cyan-500/30">
                          {authorRole}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 break-words text-xs text-slate-300 leading-relaxed">
                      {msg.content}
                    </p>
                  </div>
                </div>

                {isStaffOrAdmin && onDeleteMessage && (
                  <button
                    onClick={() => onDeleteMessage(msg.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-500 hover:text-rose-400"
                    title="Xoá bình luận"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating Reaction Bar & Super Chat Button */}
      <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-950/60 px-3 py-2">
        <div className="flex items-center gap-1.5">
          {REACTION_BUTTONS.map((btn) => {
            const count = reactions[btn.type] || 0;
            const isLatest = latestReaction === btn.type;
            return (
              <button
                key={btn.type}
                onClick={() => onSendReaction(btn.type)}
                className={`group flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold transition-all hover:scale-110 active:scale-95 ${
                  isLatest ? 'bg-cyan-500/20 scale-110 ring-1 ring-cyan-400' : 'hover:bg-slate-800'
                }`}
              >
                <span className="text-sm">{btn.label}</span>
                {count > 0 && (
                  <span className="text-[10px] text-slate-400 font-mono">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Super Chat button */}
        <button
          type="button"
          onClick={() => setIsSuperChatOpen(true)}
          className="group flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 px-2.5 py-1 text-xs font-bold text-amber-300 transition-all hover:scale-105 active:scale-95 shadow-sm shadow-amber-500/10"
          title="Super Chat & Ủng hộ kênh (Mô phỏng 0đ)"
        >
          <Gift className="h-3.5 w-3.5 text-amber-400" />
          <span>Super Chat</span>
          <span className="rounded bg-emerald-500/20 px-1 py-0.2 text-[9px] font-extrabold text-emerald-400 border border-emerald-500/30">
            0đ Test
          </span>
        </button>
      </div>

      {/* Message Input Form */}
      <form onSubmit={handleSubmit} className="border-t border-slate-800 p-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={user ? "Bình luận trực tiếp..." : "Đăng nhập để trò chuyện..."}
            disabled={!user}
            className="flex-1 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!user || !input.trim()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500 text-slate-950 transition-transform hover:bg-cyan-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* Realistic Super Chat & Sandbox QR Payment Dialog */}
      <LiveDonationDialog
        isOpen={isSuperChatOpen}
        onClose={() => setIsSuperChatOpen(false)}
        eventId={eventId}
        onDonationSuccess={(res) => {
          const finalMsg = `🎉 [SUPER CHAT MÔ PHỎNG ${res.amount.toLocaleString('vi-VN')}đ] ${res.giftEmoji} ${res.donorName}: ${res.message || 'Ủng hộ luồng trực tiếp!'}`;
          onSendMessage(finalMsg);
          onSendReaction('PARTY');
        }}
      />
    </div>
  );
}
