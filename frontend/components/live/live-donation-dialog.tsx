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

import React, { useState, useEffect, useRef } from 'react';
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
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import {
  fetchStreamerPaymentInfo,
  createPayosDonation,
  fetchPayosDonationStatus,
  sendSandboxDonation,
  fetchUserWallet,
  topupUserWallet,
  type StreamerPaymentInfo,
  type PayosCheckoutResponse,
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
    id: 'vnpay',
    name: 'VietQR / Napas 247',
    tag: 'Quét Mọi Ngân Hàng',
    color: '#005baa',
    icon: QrCode,
    bankLabel: 'Mã Chuẩn VietQR / Napas 247',
  },
  {
    id: 'momo',
    name: 'Ví MoMo',
    tag: 'Mã QR MoMo',
    color: '#d82d8b',
    icon: Wallet,
    bankLabel: 'Ví Điện Tử MoMo QR',
  },
  {
    id: 'zalopay',
    name: 'Ví ZaloPay',
    tag: 'Mã QR ZaloPay',
    color: '#0068ff',
    icon: Smartphone,
    bankLabel: 'Ví Điện Tử ZaloPay QR',
  },
  {
    id: 'card',
    name: 'PayOS Checkout',
    tag: 'Cổng PayOS',
    color: '#10b981',
    icon: CreditCard,
    bankLabel: 'Cổng Thanh Toán PayOS',
  },
];

function getLiveQrImageUrl(
  method: string,
  streamerInfo: StreamerPaymentInfo | null,
  amount: number,
) {
  const bankId = streamerInfo?.bankId || 'MB';
  const bankAccount = streamerInfo?.bankAccount || '0935649095';
  const transfer = streamerInfo?.transferSyntax || 'OMNICAST';
  const name = streamerInfo?.accountHolder || 'NGUYEN BINH AN';
  const momoPhone = streamerInfo?.momoPhone || '0935649095';

  if (method === 'vnpay' || method === 'card' || method === 'payos') {
    return `https://img.vietqr.io/image/${bankId}-${bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transfer)}&accountName=${encodeURIComponent(name)}`;
  } else if (method === 'momo') {
    const momoData = `2|99|${momoPhone}|${name}|${amount}|0|0|${transfer}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=8&data=${encodeURIComponent(momoData)}`;
  } else {
    return `https://img.vietqr.io/image/${bankId}-${bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transfer)}&accountName=${encodeURIComponent(name)}`;
  }
}

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

  const [userWalletBalance, setUserWalletBalance] = useState<number | null>(null);
  const [isTopupLoading, setIsTopupLoading] = useState(false);
  const [payosCheckout, setPayosCheckout] = useState<PayosCheckoutResponse | null>(null);
  const [paymentStatusError, setPaymentStatusError] = useState<string | null>(null);
  const payosNotifiedRef = useRef(false);

  useEffect(() => {
    if (isOpen && user) {
      fetchUserWallet()
        .then((w) => setUserWalletBalance(w.walletBalance))
        .catch(() => {});
    }
  }, [isOpen, user]);

  const handleQuickTopup = async () => {
    if (isTopupLoading) return;
    setIsTopupLoading(true);
    try {
      const res = await topupUserWallet(100000);
      setUserWalletBalance(res.walletBalance);
      toast.success(res.message);
    } catch {
      toast.error('Nạp tiền thử nghiệm thất bại');
    } finally {
      setIsTopupLoading(false);
    }
  };

  // Streamer payment details
  const [streamerInfo, setStreamerInfo] = useState<StreamerPaymentInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);

  // Submission & countdown
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(900); // 15 mins
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);
  const isPayosMode = streamerInfo?.paymentMode === 'payos';

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
    setStreamerInfo(null);
    setIsLoadingInfo(true);
    fetchStreamerPaymentInfo(eventId)
      .then((data) => {
        if (mounted) setStreamerInfo(data);
      })
      .catch(() => {
        if (mounted) {
          toast.error('Không thể tải cấu hình thanh toán', {
            description: 'Đã khóa thanh toán PayOS; chỉ chế độ mô phỏng 0đ khả dụng.',
          });
          setStreamerInfo({
            eventId,
            eventTitle: 'Phát trực tiếp',
            channelId: '',
            channelName: 'OmniCast Channel',
            channelSlug: 'live',
            streamerId: '',
            streamerName: 'NGUYEN BINH AN',
            bankId: 'MB',
            bankAccount: '0935649095',
            bankName: 'MBBank (Ngân hàng Quân đội)',
            accountHolder: 'NGUYEN BINH AN',
            momoPhone: '0935649095',
            zaloPayAccount: 'NGUYEN BINH AN',
            transferSyntax: `OMNICAST ${eventId.slice(-6).toUpperCase()}`,
            isSandbox: true,
            paymentMode: 'sandbox',
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

  const handleProceedToQr = async () => {
    if (!isPayosMode) {
      setStep('qr_confirm');
      return;
    }

    setIsSubmitting(true);
    setPaymentStatusError(null);
    try {
      const checkout = await createPayosDonation({
        eventId,
        donorName: donorName.trim() || 'Khán giả OmniCast',
        amount: selectedTier.amount,
        paymentMethod: 'payos',
        giftEmoji: selectedTier.emoji,
        giftTier: selectedTier.label,
        message: scMessage.trim(),
      });
      setPayosCheckout(checkout);
      setStep('qr_confirm');
    } catch (err: any) {
      toast.error('Không thể tạo thanh toán PayOS', {
        description: err?.response?.data?.message || err?.message || 'Vui lòng thử lại',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (!isOpen || step !== 'qr_confirm' || !payosCheckout) return;

    let active = true;
    let interval: ReturnType<typeof setInterval> | undefined;
    const checkStatus = async () => {
      try {
        const result = await fetchPayosDonationStatus(
          payosCheckout.orderCode,
          payosCheckout.statusToken,
        );
        if (!active || payosNotifiedRef.current) return;
        if (result.status === 'FAILED' || result.status === 'CANCELLED') {
          setPaymentStatusError('Giao dịch đã bị hủy hoặc thất bại. Bạn có thể tạo đơn mới.');
          if (interval) clearInterval(interval);
          return;
        }
        if (result.status !== 'COMPLETED') return;

        payosNotifiedRef.current = true;
        const receipt = {
          ...payosCheckout,
          paymentMethod: 'payos',
          isSandbox: false,
        };
        setReceiptData(receipt);
        setStep('receipt');
        toast.success('PayOS đã xác nhận thanh toán thành công');
        onDonationSuccess?.({
          amount: receipt.amount,
          donorName: receipt.donorName,
          giftEmoji: receipt.giftEmoji,
          streamerName: receipt.streamer.fullName,
          message: receipt.message || '',
        });
      } catch {
        if (active) {
          setPaymentStatusError('Chưa thể kiểm tra trạng thái; hệ thống sẽ thử lại.');
        }
      }
    };

    void checkStatus();
    interval = setInterval(() => void checkStatus(), 4000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isOpen, step, payosCheckout, onDonationSuccess]);

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
      if (response.donor?.walletBalance != null) {
        setUserWalletBalance(response.donor.walletBalance);
      }
      if (response.streamer?.walletBalance != null) {
        setStreamerInfo((prev) =>
          prev ? { ...prev, walletBalance: response.streamer.walletBalance } : null,
        );
      }
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
    setPayosCheckout(null);
    setPaymentStatusError(null);
    payosNotifiedRef.current = false;
    onClose();
  };

  if (!isOpen) return null;

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
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold font-mono ${
                    isLoadingInfo
                      ? 'bg-slate-500/20 text-slate-300'
                      : isPayosMode ? 'bg-sky-500/20 text-sky-300' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {isLoadingInfo ? 'ĐANG TẢI' : isPayosMode ? 'PAYOS' : 'SANDBOX 0đ'}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {step === 'configure' && (isPayosMode
                  ? 'Tạo liên kết thanh toán PayOS bảo mật'
                  : 'Chọn gói quà và cổng thanh toán mô phỏng')}
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
            {/* Real-time Balances Hero Bar */}
            {!isPayosMode && (
              <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-2.5">
                <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
                  Quỹ Streamer nhận
                </span>
                <span className="text-sm font-black text-white font-mono">
                  {formatVnd(streamerInfo?.walletBalance ?? 0)}
                </span>
              </div>
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-2.5 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-cyan-400 block tracking-wider">
                    Số dư ví của bạn
                  </span>
                  <span className="text-sm font-black text-white font-mono">
                    {formatVnd(userWalletBalance ?? 0)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleQuickTopup}
                  disabled={isTopupLoading}
                  className="rounded-lg bg-cyan-500/20 border border-cyan-500/30 px-2 py-1 text-[10px] font-bold text-cyan-300 hover:bg-cyan-500 hover:text-black transition cursor-pointer"
                  title="Nạp thử nghiệm 100k vào ví"
                >
                  {isTopupLoading ? '...' : '+100k'}
                </button>
              </div>
              </div>
            )}

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
            <div className={`flex items-start gap-3 rounded-xl p-3 ${
              isPayosMode
                ? 'border border-amber-500/40 bg-amber-950/25 text-amber-200'
                : 'border border-emerald-500/40 bg-emerald-950/25 text-emerald-300'
            }`}>
              <ShieldCheck className={`h-5 w-5 shrink-0 mt-0.5 ${
                isPayosMode ? 'text-amber-400' : 'text-emerald-400'
              }`} />
              <div className="space-y-0.5 text-xs leading-relaxed">
                <p className="font-extrabold">
                  {isLoadingInfo
                    ? 'ĐANG TẢI CẤU HÌNH THANH TOÁN'
                    : isPayosMode ? 'THANH TOÁN THẬT QUA PAYOS' : 'SANDBOX HỌC TẬP · CHI PHÍ THỰC TẾ = 0 ₫'}
                </p>
                <p className="text-slate-300 text-[11px]">
                  {isLoadingInfo
                    ? 'Vui lòng đợi hệ thống xác định phương thức thanh toán.'
                    : isPayosMode
                    ? 'Chỉ thanh toán trên trang PayOS chính thức. Ví Streamer chỉ được cộng sau khi webhook được xác thực.'
                    : 'Các phương thức thanh toán chỉ mô phỏng; hệ thống không trừ tiền thật từ tài khoản ngân hàng.'}
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

            {/* Payment method selection is only relevant for the sandbox simulator. */}
            {!isPayosMode ? (
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
            ) : (
              <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-3 text-xs text-sky-100">
                <span className="font-bold">Cổng thanh toán:</span> PayOS · Mã QR được tạo
                trong trang thanh toán chính thức.
              </div>
            )}

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
              disabled={isSubmitting || isLoadingInfo}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-98 transition-all"
            >
              <span>{isLoadingInfo ? 'ĐANG TẢI CẤU HÌNH...' : isSubmitting ? 'ĐANG TẠO THANH TOÁN...' : isPayosMode
                ? 'TẠO LIÊN KẾT THANH TOÁN PAYOS'
                : 'TIẾP TỤC ĐẾN MÀN HÌNH QUÉT QR'}</span>
              {isSubmitting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <ArrowRight className="h-4 w-4" />}
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
              {!isPayosMode && <div className="flex items-center gap-1 text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                <Clock className="h-3.5 w-3.5" />
                <span>Hết hạn: {formatTime(countdown)}</span>
              </div>}
            </div>

            {/* Payment QR comes from PayOS only in live mode; sandbox keeps its simulator. */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-inner">
              {isPayosMode && payosCheckout ? (
                <div className="flex max-w-sm flex-col items-center gap-4 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-300">
                    <QrCode className="h-9 w-9" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Thanh toán an toàn qua PayOS</h4>
                    <p className="mt-1 text-xs text-slate-300">
                      PayOS sẽ hiển thị QR ngân hàng cho giao dịch {formatVnd(payosCheckout.amount)}.
                    </p>
                  </div>
                  <a
                    href={payosCheckout.checkoutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-xs font-black text-slate-950 hover:bg-sky-400"
                  >
                    MỞ TRANG THANH TOÁN PAYOS <ArrowRight className="h-4 w-4" />
                  </a>
                  <p className="text-[11px] text-slate-400">
                    Đơn hàng #{payosCheckout.orderCode} · Ví chỉ được cộng sau khi PayOS xác nhận.
                  </p>
                  {paymentStatusError && (
                    <p role="status" className="text-xs text-amber-300">{paymentStatusError}</p>
                  )}
                  <p role="status" className="text-[11px] text-slate-400">
                    Đang chờ PayOS xác nhận thanh toán...
                  </p>
                </div>
              ) : (
                <>
                  <div className="relative flex flex-col items-center justify-center p-3.5 bg-white rounded-2xl shadow-2xl border border-slate-300 max-w-[280px]">
                    <div
                      className="mb-2 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white"
                      style={{ backgroundColor: currentMethodObj.color }}
                    >
                      {currentMethodObj.bankLabel}
                    </div>
                    <div className="relative w-56 h-56 flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden shadow-inner">
                      <img
                        src={getLiveQrImageUrl(selectedMethod, streamerInfo, selectedTier.amount)}
                        alt="Mã QR mô phỏng"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(streamerInfo?.transferSyntax || 'OMNICAST')}`;
                        }}
                      />
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-[11px] font-extrabold text-slate-800">
                        {streamerInfo?.accountHolder || 'NGUYEN BINH AN'}
                      </p>
                      <p className="text-[10px] font-mono text-purple-700 font-bold">
                        {selectedMethod === 'momo'
                          ? `MoMo: ${streamerInfo?.momoPhone || '0935649095'}`
                          : `MBBank: ${streamerInfo?.bankAccount || '0935649095'}`}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <QrCode className="h-4 w-4 text-cyan-400" />
                    <span>Mã VietQR NAPAS 24/7 Chuẩn Quốc Gia</span>
                  </p>
                  <p className="text-[11px] text-slate-400 text-center max-w-xs">
                    Mở bất kỳ App Ngân Hàng (MBBank, Vietcombank, Techcombank, TPBank...) hoặc Ví MoMo để quét mã thanh toán thật.
                  </p>
                </>
              )}
            </div>

            {/* Transfer details with single-click copy buttons */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-800/80">
                <span>Ngân hàng thụ hưởng:</span>
                <span className="font-bold text-purple-400 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-purple-400" />
                  {streamerInfo?.bankName || 'MBBank (Ngân hàng Quân đội)'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Chủ tài khoản:</span>
                <span className="font-bold text-white uppercase">{streamerInfo?.accountHolder || 'NGUYEN BINH AN'}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Số tài khoản:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-extrabold text-cyan-300">{streamerInfo?.bankAccount || '0935649095'}</span>
                  <button
                    type="button"
                    onClick={() => copyText(streamerInfo?.bankAccount || '0935649095', 'acc')}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Sao chép số tài khoản"
                  >
                    {copiedKey === 'acc' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Số tiền chuyển:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-extrabold text-amber-400">{formatVnd(selectedTier.amount)}</span>
                  <button
                    type="button"
                    onClick={() => copyText(selectedTier.amount.toString(), 'amount')}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Sao chép số tiền"
                  >
                    {copiedKey === 'amount' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Nội dung chuyển khoản:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-200">{streamerInfo?.transferSyntax || 'OMNICAST'}</span>
                  <button
                    type="button"
                    onClick={() => copyText(streamerInfo?.transferSyntax || 'OMNICAST', 'syntax')}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Sao chép nội dung"
                  >
                    {copiedKey === 'syntax' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center text-slate-400 pt-2 border-t border-slate-800">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  Xác nhận giao dịch:
                </span>
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-300 font-mono">
                  Hỗ trợ quét thật & Demo
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {isPayosMode && (
                <p className="text-center text-[11px] text-slate-400">
                  Sau khi thanh toán trên PayOS, hệ thống sẽ tự kiểm tra webhook xác thực.
                </p>
              )}
              {!isPayosMode && <button
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
              </button>}

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
                {receiptData.isSandbox
                  ? 'GIAO DỊCH MÔ PHỎNG THÀNH CÔNG!'
                  : 'PAYOS ĐÃ XÁC NHẬN THANH TOÁN!'}
              </h4>
              <p className="text-xs text-emerald-400 font-bold mt-1">
                {receiptData.isSandbox
                  ? 'Số dư mô phỏng đã được ghi có vào ví Streamer.'
                  : 'Giao dịch đã được PayOS xác thực và ghi có vào ví Streamer.'}
              </p>
            </div>

            {/* Official Electronic Receipt Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left text-xs space-y-2">
              <div className="flex justify-between text-slate-400 pb-2 border-b border-slate-800">
                <span>{receiptData.isSandbox ? 'Mã giao dịch (Sandbox):' : 'Mã giao dịch PayOS:'}</span>
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

              {receiptData.isSandbox && <div className="flex justify-between text-slate-400">
                <span>Số dư mới của Streamer:</span>
                <span className="font-mono font-extrabold text-amber-400">
                  {formatVnd(receiptData.streamer.walletBalance)}
                </span>
              </div>}

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
                <span className={`${receiptData.isSandbox ? 'text-emerald-400' : 'text-slate-300'} font-bold`}>
                  {receiptData.isSandbox ? 'Chi phí người xem bị trừ:' : 'Đã thanh toán:'}
                </span>
                <span className={`font-mono font-black ${receiptData.isSandbox ? 'text-emerald-400' : 'text-white'}`}>
                  {receiptData.isSandbox ? '0 ₫ (Không mất tiền)' : formatVnd(receiptData.amount)}
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
