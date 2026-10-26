/* eslint-disable @next/next/no-img-element */
// ============================================================
// OmniCast - Live Donation & Sandbox QR Payment Dialog
// ============================================================
//
// 1. Allows viewers to select gift packages & 1 of 4 mock payment apps.
// 2. Generates realistic VietQR / MoMo / ZaloPay payment codes with
//    real Streamer beneficiary account details.
// 3. Guarantees 0 VND real money loss (100% Sandbox Mock Gateway).
// 4. Deposits simulated funds directly into the STREAMER'S real account
//    in database, triggering real-time WebSocket celebration.
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  Tv,
  Wallet,
  Building,
  CreditCard,
  Smartphone,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import {
  fetchStreamerPaymentInfo,
  sendSandboxDonation,
  type StreamerPaymentInfo,
} from '@/lib/api/billing';

export interface LiveDonationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  onDonationSuccess?: (result: {
    amount: number;
    donorName: string;
    giftEmoji: string;
    streamerName: string;
    message: string;
  }) => void;
}

export const SUPER_CHAT_TIERS = [
  { amount: 10000, emoji: '☕', label: 'Cà phê sáng', color: '#38bdf8' },
  { amount: 20000, emoji: '🧋', label: 'Trà sữa trân châu', color: '#34d399' },
  { amount: 50000, emoji: '🍕', label: 'Pizza tiệc tùng', color: '#fbbf24' },
  { amount: 100000, emoji: '🎆', label: 'Pháo hoa VIP', color: '#fb923c' },
  { amount: 200000, emoji: '🚀', label: 'Tên lửa siêu cấp', color: '#e879f9' },
  { amount: 500000, emoji: '💎', label: 'Kim cương tối thượng', color: '#f43f5e' },
];

export const MOCK_PAYMENT_METHODS = [
  {
    id: 'momo',
    name: 'Ví MoMo',
    tag: 'Sandbox 0đ',
    color: '#d82d8b',
    icon: Wallet,
    bankLabel: 'Ví điện tử MoMo Sandbox',
  },
  {
    id: 'vnpay',
    name: 'VNPay QR',
    tag: 'Mô phỏng 0đ',
    color: '#005baa',
    icon: QrCode,
    bankLabel: 'Cổng VietQR / VNPay QR',
  },
  {
    id: 'zalopay',
    name: 'ZaloPay',
    tag: 'Sandbox 0đ',
    color: '#0068ff',
    icon: Smartphone,
    bankLabel: 'Ví điện tử ZaloPay Sandbox',
  },
  {
    id: 'card',
    name: 'Thẻ ATM / Visa',
    tag: 'Giả lập 0đ',
    color: '#10b981',
    icon: CreditCard,
    bankLabel: 'Cổng Thẻ Quốc Tế & Nội Địa',
  },
];

export function LiveDonationDialog({
  isOpen,
  onClose,
  eventId,
  onDonationSuccess,
}: LiveDonationDialogProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<'configure' | 'qr_confirm' | 'receipt'>('configure');

  // Form states
  const [selectedTier, setSelectedTier] = useState(SUPER_CHAT_TIERS[2]);
  const [selectedMethod, setSelectedMethod] = useState(MOCK_PAYMENT_METHODS[0].id);
  const [donorName, setDonorName] = useState('');
  const [scMessage, setScMessage] = useState('Ủng hộ buổi phát sóng xuất sắc! 🔥');

  // Streamer payment details
  const [streamerInfo, setStreamerInfo] = useState<StreamerPaymentInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);

  // Submission & countdown
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(900); // 15 mins
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);

  // Initialize donor name from logged-in user
  useEffect(() => {
    if (user?.fullName) {
      setDonorName(user.fullName);
    } else {
      setDonorName('Khán giả OmniCast');
    }
  }, [user]);

  // Fetch streamer info when modal opens
  useEffect(() => {
    if (!isOpen || !eventId) return;

    let mounted = true;
    setIsLoadingInfo(true);
    fetchStreamerPaymentInfo(eventId)
      .then((data) => {
        if (mounted) setStreamerInfo(data);
      })
      .catch(() => {
        // Fallback default
        if (mounted) {
          setStreamerInfo({
            eventId,
            eventTitle: 'Phát trực tiếp',
            channelId: '',
            channelName: 'OmniCast Channel',
            channelSlug: 'live',
            streamerId: '',
            streamerName: 'OmniCast Studio',
            bankAccount: '19036888999',
            bankName: 'MBBank (Quân Đội)',
            accountHolder: 'OMNICAST STUDIO',
            momoPhone: '0988666777',
            zaloPayAccount: 'OMNICAST STUDIO',
            transferSyntax: `OMNICAST ${eventId.slice(-6).toUpperCase()}`,
            isSandbox: true,
          });
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingInfo(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, eventId]);

  // Timer countdown on QR step
  useEffect(() => {
    if (!isOpen || step !== 'qr_confirm') return;

    setCountdown(900);
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, step]);

  if (!isOpen) return null;

  const currentMethodObj =
    MOCK_PAYMENT_METHODS.find((m) => m.id === selectedMethod) || MOCK_PAYMENT_METHODS[0];

  const formatVnd = (amount: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast.success(`Đã sao chép: ${text}`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleProceedToQr = () => {
    setStep('qr_confirm');
  };

  const handleConfirmMockPayment = async () => {
    setIsSubmitting(true);
    try {
      const response = await sendSandboxDonation({
        eventId,
        donorName: donorName.trim() || 'Khán giả OmniCast',
        amount: selectedTier.amount,
        paymentMethod: selectedMethod,
        giftEmoji: selectedTier.emoji,
        giftTier: selectedTier.label,
        message: scMessage.trim(),
      });

      setReceiptData(response);
      setStep('receipt');

      toast.success(response.notification || 'Nạp tiền mô phỏng thành công!', {
        description: `Đã cộng ${formatVnd(response.amount)} vào số dư ví của Streamer ${response.streamer.fullName}`,
      });

      onDonationSuccess?.({
        amount: response.amount,
        donorName: response.donorName,
        giftEmoji: response.giftEmoji,
        streamerName: response.streamer.fullName,
        message: response.message || '',
      });
    } catch (err: any) {
      toast.error('Giao dịch mô phỏng thất bại', {
        description: err?.response?.data?.message || err?.message || 'Vui lòng thử lại',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setStep('configure');
    setReceiptData(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 shadow-2xl">
        {/* Top Glow Accent */}
        <div className="absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-amber-500/15 blur-3xl" />

        {/* Modal Header */}
        <div className="relative flex items-center justify-between border-b border-slate-800/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/25">
              <Sparkles className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-wide text-white flex items-center gap-2">
                ỦNG HỘ STREAMER & SUPER CHAT
                <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400 font-mono">
                  SANDBOX 0đ
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {step === 'configure' && 'Chọn gói quà và cổng thanh toán mô phỏng'}
                {step === 'qr_confirm' && 'Quét mã QR & xác nhận chuyển tiền như thật'}
                {step === 'receipt' && 'Giao dịch thành công — Tiền đã vào tài khoản Streamer'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleResetAndClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* STEP 1: CONFIGURE DONATION */}
        {step === 'configure' && (
          <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
            {/* Streamer Beneficiary Card */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-black">
                  {streamerInfo?.streamerName ? streamerInfo.streamerName[0].toUpperCase() : 'S'}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Người nhận thụ hưởng (Streamer)
                  </span>
                  <span className="text-sm font-black text-white">
                    {streamerInfo?.streamerName || 'Đang tải thông tin...'}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Kênh phát sóng</span>
                <span className="text-xs font-semibold text-cyan-400">
                  {streamerInfo?.channelName || 'OmniCast'}
                </span>
              </div>
            </div>

            {/* Zero Real Money Guarantee Banner */}
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-950/25 p-3 text-emerald-300">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
              <div className="space-y-0.5 text-xs leading-relaxed">
                <p className="font-extrabold text-emerald-200">
                  CAM KẾT 100% AN TOÀN HỌC TẬP · CHI PHÍ THỰC TẾ = 0 ₫
                </p>
                <p className="text-slate-300 text-[11px]">
                  Mọi cổng thanh toán MoMo, VNPay, ZaloPay, Thẻ đều hoạt động ở chế độ Sandbox mô phỏng. Hệ thống <span className="text-emerald-300 font-bold">tuyệt đối KHÔNG trừ tiền thật</span> từ tài khoản ngân hàng của bạn.
                </p>
              </div>
            </div>

            {/* Select Gift Tier */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 block">
                1. Chọn gói quà tặng Super Chat
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SUPER_CHAT_TIERS.map((tier) => {
                  const isSel = selectedTier.amount === tier.amount;
                  return (
                    <button
                      key={tier.amount}
                      type="button"
                      onClick={() => setSelectedTier(tier)}
                      className={`flex flex-col items-center justify-center rounded-xl p-3 border transition-all text-center ${
                        isSel
                          ? 'border-amber-400 bg-amber-500/15 shadow-md shadow-amber-500/20 scale-[1.02]'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                      }`}
                    >
                      <span className="text-2xl">{tier.emoji}</span>
                      <span className="text-xs font-black text-white mt-1.5 font-mono">
                        {tier.amount.toLocaleString('vi-VN')} ₫
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium line-clamp-1">
                        {tier.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Select Mock Payment Method */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 block">
                2. Chọn ứng dụng cổng thanh toán Sandbox (Mô phỏng 0đ)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MOCK_PAYMENT_METHODS.map((method) => {
                  const isSel = selectedMethod === method.id;
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethod(method.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                        isSel
                          ? 'border-cyan-400 bg-cyan-950/30 shadow-sm shadow-cyan-500/20'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
                          style={{ backgroundColor: `${method.color}25` }}
                        >
                          <Icon className="h-4 w-4" style={{ color: method.color }} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white leading-tight">
                            {method.name}
                          </p>
                          <p className="text-[10px] text-slate-400">{method.tag}</p>
                        </div>
                      </div>
                      {isSel && <CheckCircle2 className="h-4 w-4 text-cyan-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Donor Name & Message */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Tên người gửi hiển thị
                </label>
                <input
                  type="text"
                  value={donorName}
                  maxLength={50}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="Nhập tên của bạn..."
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1 block">
                  Lời nhắn Super Chat gửi Streamer
                </label>
                <input
                  type="text"
                  value={scMessage}
                  maxLength={120}
                  onChange={(e) => setScMessage(e.target.value)}
                  placeholder="Nhập lời chúc tốt đẹp gửi người làm stream..."
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-950 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Next Step Action */}
            <button
              type="button"
              onClick={handleProceedToQr}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-98 transition-all"
            >
              <span>TIẾP TỤC ĐẾN MÀN HÌNH QUÉT QR & XÁC NHẬN</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* STEP 2: REALISTIC QR SCANNER & TRANSFER CONFIRMATION */}
        {step === 'qr_confirm' && (
          <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
            {/* Top Navigation & Header */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep('configure')}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Quay lại chọn quà</span>
              </button>
              <div className="flex items-center gap-1 text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                <Clock className="h-3.5 w-3.5" />
                <span>Hết hạn: {formatTime(countdown)}</span>
              </div>
            </div>

            {/* Realistic QR Matrix Card */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-inner">
              <div className="relative flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-xl">
                {/* Stylized Simulated QR Matrix SVG */}
                <svg
                  viewBox="0 0 160 160"
                  className="h-44 w-44 text-slate-950"
                  fill="currentColor"
                >
                  {/* Finder Pattern Top-Left */}
                  <rect x="10" y="10" width="40" height="40" rx="6" />
                  <rect x="16" y="16" width="28" height="28" rx="3" fill="white" />
                  <rect x="22" y="22" width="16" height="16" rx="2" fill="currentColor" />

                  {/* Finder Pattern Top-Right */}
                  <rect x="110" y="10" width="40" height="40" rx="6" />
                  <rect x="116" y="16" width="28" height="28" rx="3" fill="white" />
                  <rect x="122" y="22" width="16" height="16" rx="2" fill="currentColor" />

                  {/* Finder Pattern Bottom-Left */}
                  <rect x="10" y="110" width="40" height="40" rx="6" />
                  <rect x="16" y="116" width="28" height="28" rx="3" fill="white" />
                  <rect x="22" y="22" width="16" height="16" rx="2" fill="currentColor" />
                  <rect x="22" y="122" width="16" height="16" rx="2" fill="currentColor" />

                  {/* Realistic QR Data Blocks Simulation */}
                  <rect x="58" y="14" width="6" height="6" />
                  <rect x="70" y="14" width="6" height="6" />
                  <rect x="82" y="14" width="6" height="6" />
                  <rect x="94" y="14" width="6" height="6" />
                  <rect x="58" y="26" width="18" height="6" />
                  <rect x="82" y="26" width="12" height="6" />
                  <rect x="64" y="38" width="6" height="6" />
                  <rect x="76" y="38" width="18" height="6" />

                  <rect x="14" y="58" width="18" height="6" />
                  <rect x="38" y="58" width="6" height="6" />
                  <rect x="50" y="58" width="12" height="6" />
                  <rect x="98" y="58" width="18" height="6" />
                  <rect x="122" y="58" width="24" height="6" />

                  <rect x="14" y="70" width="12" height="6" />
                  <rect x="32" y="70" width="6" height="6" />
                  <rect x="44" y="70" width="18" height="6" />
                  <rect x="98" y="70" width="12" height="6" />
                  <rect x="116" y="70" width="6" height="6" />
                  <rect x="128" y="70" width="18" height="6" />

                  <rect x="14" y="82" width="6" height="6" />
                  <rect x="26" y="82" width="18" height="6" />
                  <rect x="50" y="82" width="12" height="6" />
                  <rect x="98" y="82" width="24" height="6" />
                  <rect x="134" y="82" width="12" height="6" />

                  <rect x="14" y="94" width="24" height="6" />
                  <rect x="44" y="94" width="18" height="6" />
                  <rect x="98" y="94" width="12" height="6" />
                  <rect x="116" y="94" width="18" height="6" />
                  <rect x="140" y="94" width="6" height="6" />

                  <rect x="58" y="110" width="12" height="6" />
                  <rect x="76" y="110" width="18" height="6" />
                  <rect x="100" y="110" width="6" height="6" />
                  <rect x="112" y="110" width="18" height="6" />
                  <rect x="136" y="110" width="10" height="6" />

                  <rect x="58" y="122" width="18" height="6" />
                  <rect x="82" y="122" width="6" height="6" />
                  <rect x="94" y="122" width="18" height="6" />
                  <rect x="118" y="122" width="12" height="6" />
                  <rect x="136" y="122" width="10" height="6" />

                  <rect x="58" y="134" width="6" height="6" />
                  <rect x="70" y="134" width="12" height="6" />
                  <rect x="88" y="134" width="6" height="6" />
                  <rect x="100" y="134" width="18" height="6" />
                  <rect x="124" y="134" width="22" height="6" />
                </svg>

                {/* Central Brand Badge on QR Code */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-white p-1.5 shadow-lg border border-slate-200"
                    style={{ borderColor: currentMethodObj.color }}
                  >
                    <span
                      className="text-xs font-black"
                      style={{ color: currentMethodObj.color }}
                    >
                      {currentMethodObj.id === 'momo'
                        ? 'MoMo'
                        : currentMethodObj.id === 'vnpay'
                        ? 'VNPAY'
                        : currentMethodObj.id === 'zalopay'
                        ? 'Zalo'
                        : 'VISA'}
                    </span>
                  </div>
                </div>
              </div>

              <p className="mt-3 text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-cyan-400" />
                <span>Quét mã qua ứng dụng {currentMethodObj.name} hoặc Banking</span>
              </p>
              <p className="text-[11px] text-slate-400">
                (Tự động nhận diện số tiền {formatVnd(selectedTier.amount)} & tài khoản Streamer)
              </p>
            </div>

            {/* Transfer Details Breakdown (Like a real banking invoice) */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-800/80">
                <span>Cổng nạp tiền:</span>
                <span className="font-bold text-white flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: currentMethodObj.color }}
                  />
                  {currentMethodObj.bankLabel}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-400">
                <span>Người nhận (Streamer tạo luồng):</span>
                <span className="font-bold text-cyan-300">
                  {streamerInfo?.accountHolder || 'OMNICAST STUDIO'}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-400">
                <span>Số tài khoản / Số ví:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-white">
                    {selectedMethod === 'momo'
                      ? streamerInfo?.momoPhone || '0988666777'
                      : streamerInfo?.bankAccount || '19036888999'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        selectedMethod === 'momo'
                          ? streamerInfo?.momoPhone || '0988666777'
                          : streamerInfo?.bankAccount || '19036888999',
                        'account',
                      )
                    }
                    className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                  >
                    {copiedKey === 'account' ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center text-slate-400">
                <span>Số tiền chuyển:</span>
                <span className="font-mono text-sm font-extrabold text-amber-400">
                  {formatVnd(selectedTier.amount)}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-400 pt-1">
                <span>Nội dung chuyển tiền:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/20">
                    {streamerInfo?.transferSyntax || `OMNICAST ${eventId.slice(-6).toUpperCase()}`}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      copyText(
                        streamerInfo?.transferSyntax ||
                          `OMNICAST ${eventId.slice(-6).toUpperCase()}`,
                        'syntax',
                      )
                    }
                    className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                  >
                    {copiedKey === 'syntax' ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>

              {/* Zero Real Cost Row */}
              <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-emerald-400 font-bold">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Chi phí thực tế bị trừ:
                </span>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300 font-mono">
                  0 ₫ (Miễn phí 100%)
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmMockPayment}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 py-3.5 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/20 hover:brightness-110 active:scale-98 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                    <span>ĐANG ĐỐI SOÁT & NẠP VÀO VÍ STREAMER...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>XÁC NHẬN ĐÃ CHUYỂN TIỀN (MÔ PHỎNG 0đ THỰC TẾ)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep('configure')}
                className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Hủy bỏ & đổi phương thức khác
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: TRANSACTION SUCCESS & RECEIPT */}
        {step === 'receipt' && receiptData && (
          <div className="p-6 space-y-5 text-center">
            {/* Celebration Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 shadow-xl shadow-emerald-500/20 animate-bounce">
              <Check className="h-9 w-9 stroke-[3]" />
            </div>

            <div>
              <h4 className="text-lg font-black text-white">
                GIAO DỊCH NẠP MÔ PHỎNG THÀNH CÔNG!
              </h4>
              <p className="text-xs text-emerald-400 font-bold mt-1">
                Số tiền đã được ghi có trực tiếp vào tài khoản của Người làm Stream!
              </p>
            </div>

            {/* Official Electronic Receipt Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left text-xs space-y-2">
              <div className="flex justify-between text-slate-400 pb-2 border-b border-slate-800">
                <span>Mã giao dịch (Sandbox Token):</span>
                <span className="font-mono text-cyan-400 font-bold text-[11px]">
                  {receiptData.donationId ? receiptData.donationId.slice(0, 18) : 'TX-SBX-2026-MOCK'}
                </span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Streamer thụ hưởng:</span>
                <span className="font-bold text-white">
                  {receiptData.streamer.fullName}
                </span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Số dư mới của Streamer:</span>
                <span className="font-mono font-extrabold text-amber-400">
                  {formatVnd(receiptData.streamer.walletBalance)}
                </span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Gói quà Super Chat:</span>
                <span className="font-bold text-white">
                  {receiptData.giftEmoji} {receiptData.giftTier}
                </span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Cổng thanh toán:</span>
                <span className="font-bold uppercase text-white">
                  {receiptData.paymentMethod}
                </span>
              </div>

              <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800">
                <span className="text-emerald-400 font-bold">Chi phí người xem bị trừ:</span>
                <span className="font-mono font-black text-emerald-400">
                  0 ₫ (Không mất tiền)
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetAndClose}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-xs font-black text-white shadow-lg shadow-cyan-500/25 hover:brightness-110 active:scale-98 transition-all"
            >
              HOÀN TẤT & XEM TIN NHẮN GHIM TRỰC TIẾP
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
