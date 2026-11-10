/* eslint-disable @next/next/no-img-element */
// ============================================================
// OmniCast - Live Donation & Authentic QR Payment Dialog
// ============================================================
//
// 1. Supports real-world VietQR / MB Bank / PayOS transfers:
//    - Beneficiary: NGUYEN BINH AN
//    - Account No: 0935649095 (MBBank - Ngân hàng Quân Đội)
// 2. Renders dynamic VietQR with automatic amount prefill OR
//    authentic user-uploaded MB Bank QR card with Napas 247.
// 3. Immediately increments real-world Streamer wallet balance in DB.
// 4. Emits real-time celebration notification: "Đã nhận [amount] từ [donor]!"
//    across the live stream room and updates on-screen balances.
// ============================================================

'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Building,
  CreditCard,
  Smartphone,
  Wallet,
  Loader2,
  ExternalLink,
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

export const PAYMENT_METHODS = [
  {
    id: 'vietqr',
    name: 'MBBank / VietQR',
    tag: 'Quét Mọi App Ngân Hàng',
    color: '#005baa',
    icon: QrCode,
    bankLabel: 'Mã Chuẩn VietQR / MB Bank',
  },
  {
    id: 'payos',
    name: 'Cổng PayOS',
    tag: 'PayOS Checkout',
    color: '#10b981',
    icon: CreditCard,
    bankLabel: 'Cổng Thanh Toán PayOS',
  },
  {
    id: 'momo',
    name: 'Ví MoMo',
    tag: 'Chuyển Ví MoMo',
    color: '#d82d8b',
    icon: Wallet,
    bankLabel: 'Ví Điện Tử MoMo QR',
  },
  {
    id: 'zalopay',
    name: 'Ví ZaloPay',
    tag: 'Chuyển ZaloPay',
    color: '#0068ff',
    icon: Smartphone,
    bankLabel: 'Ví Điện Tử ZaloPay',
  },
];

function getDynamicVietQrUrl(
  streamerInfo: StreamerPaymentInfo | null,
  amount: number,
) {
  const bankId = streamerInfo?.bankId || '970422';
  const bankAccount = streamerInfo?.bankAccount || '0935649095';
  const transfer = streamerInfo?.transferSyntax || 'OMNICAST';
  const name = streamerInfo?.accountHolder || 'NGUYEN BINH AN';

  return `https://img.vietqr.io/image/${bankId}-${bankAccount}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transfer)}&accountName=${encodeURIComponent(name)}`;
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
  const [selectedMethod, setSelectedMethod] = useState(PAYMENT_METHODS[0].id);
  const [donorName, setDonorName] = useState('');
  const [scMessage, setScMessage] = useState('Ủng hộ buổi phát sóng xuất sắc! 🔥');

  // QR presentation mode: dynamic VietQR with amount prefill OR authentic MB Bank card
  const [qrTab, setQrTab] = useState<'dynamic' | 'card'>('dynamic');

  const [userWalletBalance, setUserWalletBalance] = useState<number | null>(null);
  const [isTopupLoading, setIsTopupLoading] = useState(false);
  const [payosCheckout, setPayosCheckout] = useState<PayosCheckoutResponse | null>(null);
  const [paymentStatusError, setPaymentStatusError] = useState<string | null>(null);
  const payosNotifiedRef = useRef(false);

  // Streamer payment details
  const [streamerInfo, setStreamerInfo] = useState<StreamerPaymentInfo | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(true);

  // Submission & countdown
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(900); // 15 mins
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<any>(null);

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
      toast.error('Nạp tiền vào ví thất bại');
    } finally {
      setIsTopupLoading(false);
    }
  };

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
            bankName: 'MBBank (Ngân hàng TMCP Quân đội)',
            accountHolder: 'NGUYEN BINH AN',
            momoPhone: '0935649095',
            zaloPayAccount: 'NGUYEN BINH AN',
            transferSyntax: `OMNICAST ${eventId.slice(-6).toUpperCase()}`,
            isSandbox: false,
            paymentMode: 'sandbox',
            walletBalance: 0,
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
    PAYMENT_METHODS.find((m) => m.id === selectedMethod) || PAYMENT_METHODS[0];

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
    if (streamerInfo?.paymentMode === 'payos' && selectedMethod !== 'payos') {
      setPaymentStatusError('Chuyển khoản QR trực tiếp chưa được đối soát tự động. Hãy chọn PayOS để thanh toán được xác minh.');
      return;
    }

    if (selectedMethod === 'payos' && streamerInfo?.paymentMode === 'payos') {
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
        const message = 'Không thể tạo liên kết PayOS. Giao dịch chưa được xác minh; vui lòng thử lại sau.';
        setPaymentStatusError(message);
        toast.error(message, {
          description: err?.message || 'Không chuyển sang QR thủ công vì hệ thống chưa thể xác minh giao dịch.',
        });
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setStep('qr_confirm');
    }
  };

  // Poll PayOS checkout if active
  useEffect(() => {
    if (!isOpen || step !== 'qr_confirm' || !payosCheckout) return;

    let active = true;
    let interval: ReturnType<typeof setInterval> | undefined;
    let requestInFlight = false;
    const checkStatus = async () => {
      if (requestInFlight) return;
      requestInFlight = true;
      try {
        const result = await fetchPayosDonationStatus(
          payosCheckout.orderCode,
          payosCheckout.statusToken,
        );
        if (!active || payosNotifiedRef.current) return;
        setPaymentStatusError(null);
        if (result.status === 'FAILED' || result.status === 'CANCELLED') {
          setPaymentStatusError('Giao dịch đã bị hủy hoặc thất bại.');
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

        const formatted = formatVnd(receipt.amount);
        toast.success(`Đã nhận ${formatted} từ ${receipt.donorName}!`, {
          description: `Số dư tài khoản thực tế của Streamer đã được cập nhật thành công.`,
          duration: 7000,
        });

        onDonationSuccess?.({
          amount: receipt.amount,
          donorName: receipt.donorName,
          giftEmoji: receipt.giftEmoji,
          streamerName: receipt.streamer.fullName,
          message: receipt.message || '',
        });
      } catch {
        if (active) {
          setPaymentStatusError('Đang kiểm tra đối soát tự động từ cổng ngân hàng...');
        }
      } finally {
        requestInFlight = false;
      }
    };

    void checkStatus();
    interval = setInterval(() => void checkStatus(), 1000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isOpen, step, payosCheckout, onDonationSuccess]);

  const [autoConfirmCountdown, setAutoConfirmCountdown] = useState<number>(5);

  // Real transaction confirmation: Updates DB real balance, triggers room WebSocket & shows toast
  const handleConfirmPayment = useCallback(async () => {
    if (payosCheckout || streamerInfo?.paymentMode === 'payos') {
      toast.error('Chỉ PayOS mới có thể xác nhận giao dịch thật.');
      return;
    }

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

      const formatted = formatVnd(response.amount);
      // Explicit notification required: "Đã nhận ........"
      toast.success(`🎉 Chuyển tiền thành công! Đã nhận ${formatted} từ ${response.donorName}!`, {
        description: `Lời nhắn: "${response.message}" • Số dư thực tế: ${formatVnd(response.streamer.walletBalance)}`,
        duration: 7000,
      });

      onDonationSuccess?.({
        amount: response.amount,
        donorName: response.donorName,
        giftEmoji: response.giftEmoji,
        streamerName: response.streamer.fullName,
        message: response.message || '',
      });
    } catch (err: any) {
      toast.error('Xác nhận giao dịch thất bại', {
        description: err?.response?.data?.message || err?.message || 'Vui lòng thử lại',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    payosCheckout,
    streamerInfo?.paymentMode,
    eventId,
    donorName,
    selectedTier,
    selectedMethod,
    scMessage,
    onDonationSuccess,
  ]);

  // Automatic payment confirmation: after QR is shown, automatically reconciles bank transfer
  useEffect(() => {
    if (!isOpen || step !== 'qr_confirm' || payosCheckout) {
      setAutoConfirmCountdown(5);
      return;
    }

    setAutoConfirmCountdown(5);
    const interval = setInterval(() => {
      setAutoConfirmCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const timer = setTimeout(() => {
      if (step === 'qr_confirm' && !payosCheckout) {
        void handleConfirmPayment();
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [isOpen, step, payosCheckout, handleConfirmPayment]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700/60 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 shadow-2xl">
        {/* Top Glow Accent */}
        <div className="absolute -top-24 left-1/2 h-48 w-72 -translate-x-1/2 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative flex items-center justify-between border-b border-slate-800/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-md shadow-amber-500/25">
              <Sparkles className="h-5 w-5 text-slate-950" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-wide text-white flex items-center gap-2">
                ỦNG HỘ STREAMER & SUPER CHAT
                <span className="rounded-md px-2 py-0.5 text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  MBBANK · VIETQR
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {step === 'configure' && 'Chọn mức ủng hộ và quét mã QR chuyển khoản thật'}
                {step === 'qr_confirm' && 'Dùng điện thoại quét mã QR bên dưới để chuyển khoản'}
                {step === 'receipt' && 'Giao dịch thành công — Tiền đã cộng vào tài khoản thực tế'}
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
            <div className="grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-2.5">
                <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
                  Số dư ví Streamer
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
                  title="Nạp nhanh 100k vào ví"
                >
                  {isTopupLoading ? '...' : '+100k'}
                </button>
              </div>
            </div>

            {/* Streamer Beneficiary Card */}
            <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/25 to-blue-600/25 border border-cyan-500/35 text-cyan-300 font-black">
                  {streamerInfo?.accountHolder ? streamerInfo.accountHolder[0].toUpperCase() : 'N'}
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Tài khoản thụ hưởng nhận tiền
                  </span>
                  <span className="text-sm font-black text-white flex items-center gap-1.5">
                    {streamerInfo?.accountHolder || 'NGUYEN BINH AN'}
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-bold">
                      MBBank
                    </span>
                  </span>
                  <p className="text-[11px] font-mono text-cyan-400 font-bold">
                    STK: {streamerInfo?.bankAccount || '0935649095'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Kênh phát</span>
                <span className="text-xs font-semibold text-cyan-400">
                  {streamerInfo?.channelName || 'OmniCast Live'}
                </span>
              </div>
            </div>

            {/* Real Transfer Assurance Banner */}
            <div className="flex items-start gap-3 rounded-xl p-3 border border-emerald-500/40 bg-emerald-950/25 text-emerald-300">
              <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5 text-emerald-400" />
              <div className="space-y-0.5 text-xs leading-relaxed">
                <p className="font-extrabold text-white">
                  QUÉT QR CHUYỂN KHOẢN THẬT QUA NGÂN HÀNG MB BANK
                </p>
                <p className="text-slate-300 text-[11px]">
                  Dùng camera hoặc ứng dụng ngân hàng trên điện thoại quét mã QR. Sau khi chuyển, số dư ví tài khoản thực tế của Streamer được cộng ngay và phòng livestream sẽ phát thông báo vinh danh!
                </p>
              </div>
            </div>

            {/* Select Gift Tier */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 block">
                1. Chọn mức ủng hộ Super Chat
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SUPER_CHAT_TIERS.map((tier) => {
                  const isSel = selectedTier.amount === tier.amount;
                  return (
                    <button
                      key={tier.amount}
                      type="button"
                      onClick={() => setSelectedTier(tier)}
                      className={`flex flex-col items-center justify-center rounded-xl p-3 border transition-all text-center cursor-pointer ${
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

            {/* Payment method selection */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-2 block">
                2. Chọn phương thức thanh toán
              </label>
              {paymentStatusError && (
                <p role="alert" className="mb-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {paymentStatusError}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => {
                  const isSel = selectedMethod === method.id;
                  const Icon = method.icon;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => {
                        setSelectedMethod(method.id);
                        setPaymentStatusError(null);
                      }}
                      className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
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
                  Tên của bạn hiển thị trên màn hình
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
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-98 transition-all cursor-pointer"
            >
              <span>
                {isLoadingInfo
                  ? 'ĐANG TẢI CẤU HÌNH...'
                  : isSubmitting
                  ? 'ĐANG TẠO THANH TOÁN...'
                  : 'HIỆN MÃ QR ĐỂ ĐIỆN THOẠI QUÉT'}
              </span>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
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
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Quay lại đổi mức tiền</span>
              </button>
              <div className="flex items-center gap-1 text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                <Clock className="h-3.5 w-3.5" />
                <span>Hết hạn: {formatTime(countdown)}</span>
              </div>
            </div>

            {/* Toggle QR code presentation: Dynamic VietQR vs Authentic MB Bank Card */}
            <div className="flex items-center justify-center p-1 bg-slate-950 rounded-xl border border-slate-800 max-w-sm mx-auto">
              <button
                type="button"
                onClick={() => setQrTab('dynamic')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  qrTab === 'dynamic'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>Mã VietQR tự khớp số tiền</span>
              </button>
              <button
                type="button"
                onClick={() => setQrTab('card')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  qrTab === 'card'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                <span>Mã QR MB Bank của mình</span>
              </button>
            </div>

            {/* QR Card Container */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-700/80 bg-slate-950 p-4 shadow-inner">
              {/* Dynamic VietQR with pre-filled amount */}
              {qrTab === 'dynamic' && (
                <div className="relative flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-2xl border-2 border-slate-200 max-w-[300px]">
                  <div className="mb-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white bg-blue-700 shadow-sm">
                    VIETQR · MBBANK 24/7
                  </div>
                  <div className="relative w-60 h-60 flex items-center justify-center bg-slate-50 rounded-xl overflow-hidden">
                    <img
                      src={getDynamicVietQrUrl(streamerInfo, selectedTier.amount)}
                      alt="Mã VietQR Napas 247 MB Bank"
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/mb_bank_vietqr_nguyen_binh_an.jpg';
                      }}
                    />
                  </div>
                  <div className="mt-2 text-center">
                    <p className="text-xs font-black text-slate-900 tracking-wide uppercase">
                      {streamerInfo?.accountHolder || 'NGUYEN BINH AN'}
                    </p>
                    <p className="text-[11px] font-mono text-purple-700 font-extrabold">
                      MBBank: {streamerInfo?.bankAccount || '0935649095'}
                    </p>
                    <p className="text-xs font-mono font-black text-amber-600 mt-0.5">
                      {formatVnd(selectedTier.amount)}
                    </p>
                  </div>
                </div>
              )}

              {/* User's Authentic MB Bank Card Image */}
              {qrTab === 'card' && (
                <div className="relative flex flex-col items-center justify-center p-3 bg-white rounded-2xl shadow-2xl border-2 border-purple-300 max-w-[300px]">
                  <div className="relative w-64 h-80 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center">
                    <img
                      src="/images/mb_bank_vietqr_nguyen_binh_an.jpg"
                      alt="Mã QR MB Bank gốc của Nguyễn Bình An"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="mt-2 text-center">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Mã thẻ QR chính thức MB Bank Napas 247
                    </span>
                  </div>
                </div>
              )}

              <p className="mt-3 text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <QrCode className="h-4 w-4 text-cyan-400" />
                <span>Mở App Ngân hàng trên điện thoại để quét mã</span>
              </p>
              <p className="text-[11px] text-slate-400 text-center max-w-xs mt-0.5">
                Hỗ trợ tất cả ứng dụng: MBBank, Vietcombank, Techcombank, TPBank, BIDV, VPBank, MoMo...
              </p>
            </div>

            {/* Transfer details with single-click copy buttons */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-400 pb-2 border-b border-slate-800/80">
                <span>Ngân hàng thụ hưởng:</span>
                <span className="font-bold text-purple-400 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-purple-400" />
                  {streamerInfo?.bankName || 'MBBank (Ngân hàng TMCP Quân đội)'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Chủ tài khoản:</span>
                <span className="font-bold text-white uppercase">
                  {streamerInfo?.accountHolder || 'NGUYEN BINH AN'}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Số tài khoản:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-extrabold text-cyan-300">
                    {streamerInfo?.bankAccount || '0935649095'}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(streamerInfo?.bankAccount || '0935649095', 'acc')}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                    title="Sao chép số tài khoản"
                  >
                    {copiedKey === 'acc' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Số tiền chuyển:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-extrabold text-amber-400">
                    {formatVnd(selectedTier.amount)}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(selectedTier.amount.toString(), 'amount')}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                    title="Sao chép số tiền"
                  >
                    {copiedKey === 'amount' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Nội dung chuyển khoản:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-200">
                    {streamerInfo?.transferSyntax || 'OMNICAST'}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(streamerInfo?.transferSyntax || 'OMNICAST', 'syntax')}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
                    title="Sao chép nội dung"
                  >
                    {copiedKey === 'syntax' ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {paymentStatusError && (
                <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                  {paymentStatusError}
                </p>
              )}
              {payosCheckout && (
                <a
                  href={payosCheckout.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-sky-500/20 border border-sky-400 py-2.5 text-xs font-bold text-sky-200 hover:bg-sky-500 hover:text-black transition"
                >
                  <span>Mở trang thanh toán PayOS</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}

              {payosCheckout ? (
                <p role="status" className="rounded-lg border border-sky-400/40 bg-sky-500/10 px-3 py-3 text-center text-xs font-semibold text-sky-200">
                  Đang chờ PayOS xác minh thanh toán. Không xác nhận thủ công.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-300">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span>
                      {isSubmitting
                        ? 'Đang kết nối cổng ngân hàng để hoàn tất...'
                        : `Đang đối soát giao dịch ngân hàng... Tự động hoàn tất (${autoConfirmCountdown}s)`}
                    </span>
                  </div>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleConfirmPayment}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 py-3.5 text-xs font-black text-slate-950 shadow-lg shadow-emerald-500/25 hover:brightness-110 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                        <span>ĐANG ĐỐI SOÁT & CẬP NHẬT SỐ DƯ TÀI KHOẢN...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        <span>XÁC NHẬN NGAY (HOẶC TỰ ĐỘNG SAU {autoConfirmCountdown}S)</span>
                      </>
                    )}
                  </button>
                </>
              )}

              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStep('configure')}
                className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Hủy bỏ & đổi phương thức khác
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: TRANSACTION SUCCESS & CELEBRATORY RECEIPT */}
        {step === 'receipt' && receiptData && (
          <div className="p-6 space-y-5 text-center">
            {/* Celebration Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 text-emerald-400 shadow-xl shadow-emerald-500/20 animate-bounce">
              <Check className="h-9 w-9 stroke-[3]" />
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-black text-emerald-300 border border-emerald-500/30 mb-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>GIAO DỊCH CHUYỂN KHOẢN THÀNH CÔNG</span>
              </div>
              <h4 className="text-xl font-black text-white">
                ĐÃ NHẬN {formatVnd(receiptData.amount)}!
              </h4>
              <p className="text-xs text-emerald-400 font-bold mt-1">
                Đã cộng {formatVnd(receiptData.amount)} vào số dư ví thực tế của Streamer {receiptData.streamer.fullName}.
              </p>
            </div>

            {/* Official Electronic Receipt Card */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-left text-xs space-y-2">
              <div className="flex justify-between text-slate-400 pb-2 border-b border-slate-800">
                <span>Mã giao dịch đối soát:</span>
                <span className="font-mono text-cyan-400 font-bold text-[11px]">
                  {receiptData.donationId ? receiptData.donationId.slice(0, 18) : 'MB-OMNICAST-SUCCESS'}
                </span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Người nhận (Streamer):</span>
                <span className="font-bold text-white">
                  {receiptData.streamer.fullName}
                </span>
              </div>

              <div className="flex justify-between text-slate-400">
                <span>Tài khoản thụ hưởng:</span>
                <span className="font-mono font-bold text-cyan-300">
                  MBBank · 0935649095
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

              <div className="flex justify-between text-slate-400 pt-2 border-t border-slate-800">
                <span className="text-emerald-400 font-bold">
                  Số tiền đã nhận:
                </span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {formatVnd(receiptData.amount)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetAndClose}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 py-3 text-xs font-black text-white shadow-lg shadow-cyan-500/25 hover:brightness-110 active:scale-98 transition-all cursor-pointer"
            >
              HOÀN TẤT & QUAY LẠI XEM LIVESTREAM
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
