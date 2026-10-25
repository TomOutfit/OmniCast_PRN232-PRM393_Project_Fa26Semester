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

export interface LiveChatPanelProps {
  eventId: string;
  messages: LiveComment[];
  reactions: Record<string, number>;
  latestReaction?: string | null;
  broadcastMessage?: BroadcasterAnnouncement | null;
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

const SUPER_CHAT_TIERS = [
  { amount: 10000, emoji: '☕', label: 'Cà phê sáng', color: '#38bdf8' },
  { amount: 20000, emoji: '🧋', label: 'Trà sữa', color: '#34d399' },
  { amount: 50000, emoji: '🍕', label: 'Pizza tiệc tùng', color: '#fbbf24' },
  { amount: 100000, emoji: '🎆', label: 'Pháo hoa VIP', color: '#fb923c' },
  { amount: 200000, emoji: '🚀', label: 'Tên lửa siêu cấp', color: '#e879f9' },
  { amount: 500000, emoji: '💎', label: 'Kim cương', color: '#f43f5e' },
];

const MOCK_PAYMENT_METHODS = [
  { id: 'momo', name: 'Ví MoMo', tag: 'Sandbox 0đ' },
  { id: 'vnpay', name: 'VNPay QR', tag: 'Mô phỏng 0đ' },
  { id: 'zalopay', name: 'ZaloPay', tag: 'Sandbox 0đ' },
  { id: 'card', name: 'Thẻ ATM/Visa', tag: 'Giả lập 0đ' },
];

export function LiveChatPanel({
  messages,
  reactions,
  latestReaction,
  broadcastMessage,
  onSendMessage,
  onSendReaction,
  onDeleteMessage,
  onDismissAnnouncement,
}: LiveChatPanelProps) {
  const [input, setInput] = useState('');
  const [isSuperChatOpen, setIsSuperChatOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState(SUPER_CHAT_TIERS[2]);
  const [selectedMethod, setSelectedMethod] = useState(MOCK_PAYMENT_METHODS[0].id);
  const [scMessage, setScMessage] = useState('Ủng hộ phiên phát sóng xuất sắc! 🔥');
  const [isSubmittingSc, setIsSubmittingSc] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const { user } = useAuth();
  const isStaffOrAdmin = user?.role === 'STAFF' || user?.role === 'ADMIN';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const handleSendSuperChat = () => {
    setIsSubmittingSc(true);
    setTimeout(() => {
      const donorName = user?.fullName || 'Khán giả OmniCast';
      const pm = MOCK_PAYMENT_METHODS.find((m) => m.id === selectedMethod)?.name || 'Ví điện tử';
      const finalMsg = `🎉 [SUPER CHAT MÔ PHỎNG ${selectedTier.amount.toLocaleString('vi-VN')}đ qua ${pm}] ${selectedTier.emoji} ${donorName}: ${scMessage.trim() || 'Ủng hộ luồng trực tiếp!'}`;
      onSendMessage(finalMsg);
      setIsSubmittingSc(false);
      setIsSuperChatOpen(false);
    }, 700);
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
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Thời gian thực</span>
        </div>
      </div>

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

      {/* Super Chat Sandbox Modal Overlay */}
      {isSuperChatOpen && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end bg-slate-950/85 backdrop-blur-md rounded-xl p-3 animate-in fade-in duration-200">
          <div className="relative rounded-2xl border border-amber-500/40 bg-slate-900 p-4 shadow-2xl shadow-black space-y-3 max-h-[95%] overflow-y-auto scrollbar-thin">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-amber-500/20 p-1.5 text-amber-400 border border-amber-500/30">
                  <Gift className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-white">
                    Super Chat & Quà Tặng Ảo
                  </h4>
                  <p className="text-[10px] text-slate-400">Ghim thông điệp nổi bật lên khung chat</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSuperChatOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Reassurance Banner */}
            <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-2.5 text-xs text-emerald-300">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <div className="space-y-0.5 text-[11px] leading-relaxed">
                <p className="font-bold text-emerald-200">
                  CHẾ ĐỘ MÔ PHỎNG (SANDBOX) · MIỄN PHÍ 100%
                </p>
                <p className="text-slate-300">
                  Giao dịch giả lập an toàn đồ án (Fa26Semester). Tất cả cổng MoMo, VNPay, ZaloPay, Thẻ đều là Mock Sandbox, KHÔNG trừ tiền thật từ tài khoản ngân hàng của bạn.
                </p>
              </div>
            </div>

            {/* Gifts grid */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Chọn gói quà tặng
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                {SUPER_CHAT_TIERS.map((tier) => {
                  const isSel = selectedTier.amount === tier.amount;
                  return (
                    <button
                      key={tier.amount}
                      type="button"
                      onClick={() => setSelectedTier(tier)}
                      className={`flex flex-col items-center justify-center rounded-xl p-2 border text-center transition-all ${
                        isSel
                          ? 'border-amber-400 bg-amber-500/15 shadow-sm shadow-amber-500/20'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-xl">{tier.emoji}</span>
                      <span className="text-[11px] font-extrabold text-white mt-1">
                        {tier.amount.toLocaleString('vi-VN')} ₫
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium">{tier.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payment methods */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Cổng thanh toán giả lập
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {MOCK_PAYMENT_METHODS.map((pm) => {
                  const isSel = selectedMethod === pm.id;
                  return (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setSelectedMethod(pm.id)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                        isSel
                          ? 'border-cyan-400 bg-cyan-950/30 text-white font-bold'
                          : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span>{pm.name}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                        {pm.tag}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message input */}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Lời nhắn Super Chat
              </p>
              <input
                type="text"
                value={scMessage}
                maxLength={120}
                onChange={(e) => setScMessage(e.target.value)}
                placeholder="Nhập lời chúc..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            {/* Breakdown card */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Mức ủng hộ hiển thị:</span>
                <span className="font-bold text-white font-mono">
                  {selectedTier.emoji} {selectedTier.amount.toLocaleString('vi-VN')} ₫
                </span>
              </div>
              <div className="flex justify-between items-center text-emerald-400 font-bold">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Chi phí thực tế bị trừ:
                </span>
                <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-300 font-mono">
                  0 ₫ (Không mất tiền)
                </span>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="button"
              disabled={isSubmittingSc}
              onClick={handleSendSuperChat}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-2.5 text-xs font-black text-slate-950 transition-all hover:brightness-110 active:scale-98 disabled:opacity-50"
            >
              {isSubmittingSc ? (
                <span>Đang xử lý mô phỏng...</span>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  <span>XÁC NHẬN GỬI MÔ PHỎNG (0đ THỰC TẾ)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
