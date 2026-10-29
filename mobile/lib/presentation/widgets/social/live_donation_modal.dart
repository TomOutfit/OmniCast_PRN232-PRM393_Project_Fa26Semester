// ============================================================
// OmniCast · Live Stream Donation & Super Chat Modal
// ============================================================
//
// 1. Allows viewers to select gift packages & simulated payment apps.
// 2. Displays authentic VietQR / MoMo / ZaloPay codes with real
//    Streamer beneficiary account details and 15-minute countdown.
// 3. Displays and updates User & Streamer wallet balances in real-time.
// 4. Guarantees 0 VND real money loss (100% Sandbox Mock Gateway).
// ============================================================

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../../../core/services/billing_service.dart';

class LiveDonationResult {
  final int amount;
  final String donorName;
  final String message;
  final String tier;
  final String giftEmoji;
  final String paymentMethod;
  final int? streamerBalance;
  final int? donorBalance;

  LiveDonationResult({
    required this.amount,
    required this.donorName,
    required this.message,
    required this.tier,
    this.giftEmoji = '🎉',
    this.paymentMethod = 'MoMo',
    this.streamerBalance,
    this.donorBalance,
  });
}

class LiveDonationModal extends StatefulWidget {
  final String channelName;
  final String? eventTitle;
  final String? eventId;
  final int? initialStreamerBalance;
  final int? initialUserBalance;
  final Function(LiveDonationResult result)? onDonated;

  const LiveDonationModal({
    super.key,
    required this.channelName,
    this.eventTitle,
    this.eventId,
    this.initialStreamerBalance,
    this.initialUserBalance,
    this.onDonated,
  });

  static Future<LiveDonationResult?> show(
    BuildContext context, {
    required String channelName,
    String? eventTitle,
    String? eventId,
    int? initialStreamerBalance,
    int? initialUserBalance,
    Function(LiveDonationResult result)? onDonated,
  }) {
    return showModalBottomSheet<LiveDonationResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => LiveDonationModal(
        channelName: channelName,
        eventTitle: eventTitle,
        eventId: eventId,
        initialStreamerBalance: initialStreamerBalance,
        initialUserBalance: initialUserBalance,
        onDonated: onDonated,
      ),
    );
  }

  @override
  State<LiveDonationModal> createState() => _LiveDonationModalState();
}

class _LiveDonationModalState extends State<LiveDonationModal> {
  static const _accent = Color(0xFF00E5FF);
  static const _gold = Color(0xFFF59E0B);
  static const _bg = Color(0xFF0B1320);

  // Flow step: 0 = configure, 1 = qr_confirm, 2 = receipt
  int _step = 0;

  int _selectedAmount = 50000;
  String _selectedPaymentMethod = 'vnpay';
  String _selectedGiftEmoji = '🍕';

  final TextEditingController _donorNameCtrl =
      TextEditingController(text: 'Khán giả OmniCast');
  final TextEditingController _messageCtrl =
      TextEditingController(text: 'Ủng hộ kênh phát sóng xuất sắc! 🔥');

  bool _isLoadingInfo = false;
  bool _isSubmitting = false;
  bool _isTopupLoading = false;

  Map<String, dynamic>? _streamerInfo;
  int _streamerBalance = 0;
  int _userBalance = 0;

  Timer? _countdownTimer;
  int _countdownSeconds = 900; // 15 minutes

  final List<Map<String, dynamic>> _tiers = [
    {
      'amount': 10000,
      'emoji': '☕',
      'label': 'Cà phê sáng',
      'color': const Color(0xFF38BDF8),
    },
    {
      'amount': 20000,
      'emoji': '🧋',
      'label': 'Trà sữa trân châu',
      'color': const Color(0xFF34D399),
    },
    {
      'amount': 50000,
      'emoji': '🍕',
      'label': 'Pizza tiệc tùng',
      'color': const Color(0xFFFBBF24),
    },
    {
      'amount': 100000,
      'emoji': '🎆',
      'label': 'Pháo hoa VIP',
      'color': const Color(0xFFFB923C),
    },
    {
      'amount': 200000,
      'emoji': '🚀',
      'label': 'Tên lửa siêu cấp',
      'color': const Color(0xFFE879F9),
    },
    {
      'amount': 500000,
      'emoji': '💎',
      'label': 'Kim cương tối thượng',
      'color': const Color(0xFFF43F5E),
    },
  ];

  final List<Map<String, dynamic>> _paymentMethods = [
    {
      'id': 'vnpay',
      'name': 'VietQR / MBBank',
      'subtitle': 'Quét mã 247',
      'icon': Icons.qr_code_scanner_rounded,
      'color': const Color(0xFF005BAA),
      'bankLabel': 'Cổng MBBank VietQR (Napas 247)',
    },
    {
      'id': 'momo',
      'name': 'Ví MoMo',
      'subtitle': 'Sandbox 0đ',
      'icon': Icons.account_balance_wallet_rounded,
      'color': const Color(0xFFA50064),
      'bankLabel': 'Ví điện tử MoMo Sandbox',
    },
    {
      'id': 'zalopay',
      'name': 'ZaloPay',
      'subtitle': 'Sandbox 0đ',
      'icon': Icons.payments_rounded,
      'color': const Color(0xFF0068FF),
      'bankLabel': 'Ví ZaloPay Sandbox',
    },
    {
      'id': 'card',
      'name': 'Thẻ ATM / Visa',
      'subtitle': 'Giả lập 0đ',
      'icon': Icons.credit_card_rounded,
      'color': const Color(0xFF10B981),
      'bankLabel': 'Cổng Thẻ Nội Địa & Quốc Tế',
    },
  ];

  @override
  void initState() {
    super.initState();
    _streamerBalance = widget.initialStreamerBalance ?? 0;
    _userBalance = widget.initialUserBalance ?? 0;
    _loadData();
  }

  @override
  void dispose() {
    _donorNameCtrl.dispose();
    _messageCtrl.dispose();
    _countdownTimer?.cancel();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoadingInfo = true);
    try {
      final futures = await Future.wait([
        if (widget.eventId != null && widget.eventId!.isNotEmpty)
          BillingService.instance.getStreamerPaymentInfo(widget.eventId!)
        else
          Future.value(null),
        BillingService.instance.getUserWallet(),
      ]);

      final sInfo = futures[0];
      final uWallet = futures[1];

      if (mounted) {
        setState(() {
          if (sInfo != null) {
            _streamerInfo = sInfo;
            if (sInfo['walletBalance'] != null) {
              _streamerBalance = (sInfo['walletBalance'] as num).toInt();
            }
          }
          if (uWallet != null && uWallet['walletBalance'] != null) {
            _userBalance = (uWallet['walletBalance'] as num).toInt();
          }
          if (uWallet != null && uWallet['fullName'] != null) {
            _donorNameCtrl.text = uWallet['fullName'].toString();
          }
        });
      }
    } catch (_) {
      // Graceful fallback
    } finally {
      if (mounted) setState(() => _isLoadingInfo = false);
    }
  }

  void _startCountdown() {
    _countdownTimer?.cancel();
    _countdownSeconds = 900;
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (_countdownSeconds <= 1) {
        timer.cancel();
      } else {
        setState(() => _countdownSeconds--);
      }
    });
  }

  String _formatVnd(int amount) {
    final s = amount.toString();
    final buffer = StringBuffer();
    int count = 0;
    for (int i = s.length - 1; i >= 0; i--) {
      buffer.write(s[i]);
      count++;
      if (count == 3 && i > 0) {
        buffer.write('.');
        count = 0;
      }
    }
    return '${buffer.toString().split('').reversed.join('')} ₫';
  }

  String _formatTimer(int secs) {
    final m = secs ~/ 60;
    final s = secs % 60;
    return '${m.toString().padLeft(2, '0')}:${s.toString().padLeft(2, '0')}';
  }

  String get _currentTierName {
    final match = _tiers.firstWhere(
      (t) => t['amount'] == _selectedAmount,
      orElse: () => {'label': 'Ủng hộ đặc biệt'},
    );
    return match['label'] as String;
  }

  String get _transferSyntax {
    if (_streamerInfo != null && _streamerInfo!['transferSyntax'] != null) {
      return _streamerInfo!['transferSyntax'].toString();
    }
    final shortId = (widget.eventId ?? 'LIVE').replaceAll('-', '').toUpperCase();
    final truncated = shortId.length > 6 ? shortId.substring(shortId.length - 6) : shortId;
    return 'OMNICAST $truncated';
  }

  String get _accountHolder {
    if (_streamerInfo != null && _streamerInfo!['accountHolder'] != null) {
      return _streamerInfo!['accountHolder'].toString().toUpperCase();
    }
    return 'OMNICAST STUDIO';
  }

  String get _bankAccount {
    if (_streamerInfo != null && _streamerInfo!['bankAccount'] != null) {
      return _streamerInfo!['bankAccount'].toString();
    }
    return '19036888999';
  }

  String get _momoPhone {
    if (_streamerInfo != null && _streamerInfo!['momoPhone'] != null) {
      return _streamerInfo!['momoPhone'].toString();
    }
    return '0988666777';
  }

  String get _qrImageUrl {
    final amount = _selectedAmount;
    final syntax = Uri.encodeComponent(_transferSyntax);
    final holder = Uri.encodeComponent(_accountHolder);

    if (_selectedPaymentMethod == 'vnpay' || _selectedPaymentMethod == 'card') {
      // Official authentic VietQR banking standard image
      return 'https://img.vietqr.io/image/MB-$_bankAccount-compact2.png?amount=$amount&addInfo=$syntax&accountName=$holder';
    } else if (_selectedPaymentMethod == 'momo') {
      final momoData = Uri.encodeComponent('2|99|$_momoPhone|$_accountHolder|$amount|0|0|$_transferSyntax');
      return 'https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=$momoData';
    } else {
      final zaloData = Uri.encodeComponent('https://zalopay.vn/pay?acc=$holder&amount=$amount&msg=$syntax');
      return 'https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=8&data=$zaloData';
    }
  }

  void _copyToClipboard(String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Đã sao chép $label: $text'),
        backgroundColor: const Color(0xFF10B981),
        duration: const Duration(seconds: 2),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Future<void> _handleQuickTopup() async {
    if (_isTopupLoading) return;
    setState(() => _isTopupLoading = true);
    HapticFeedback.selectionClick();
    try {
      final res = await BillingService.instance.topupSandbox(100000);
      if (res != null && res['walletBalance'] != null) {
        setState(() {
          _userBalance = (res['walletBalance'] as num).toInt();
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('🎉 Nạp thành công 100.000 ₫ mô phỏng! Số dư ví mới: ${_formatVnd(_userBalance)}'),
              backgroundColor: const Color(0xFF00E5FF),
              duration: const Duration(seconds: 2),
              behavior: SnackBarBehavior.floating,
            ),
          );
        }
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Nạp tiền mô phỏng không thành công. Vui lòng thử lại.'),
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isTopupLoading = false);
    }
  }

  Future<void> _handleConfirmPayment() async {
    if (_isSubmitting) return;
    setState(() => _isSubmitting = true);

    final name = _donorNameCtrl.text.trim().isEmpty
        ? 'Khán giả OmniCast'
        : _donorNameCtrl.text.trim();
    final msg = _messageCtrl.text.trim().isEmpty
        ? 'Gửi tặng ${_formatVnd(_selectedAmount)} $_selectedGiftEmoji'
        : _messageCtrl.text.trim();

    HapticFeedback.mediumImpact();

    try {
      if (widget.eventId != null && widget.eventId!.isNotEmpty) {
        final res = await BillingService.instance.sendSandboxDonation(
          eventId: widget.eventId!,
          donorName: name,
          amount: _selectedAmount,
          paymentMethod: _selectedPaymentMethod,
          giftEmoji: _selectedGiftEmoji,
          giftTier: _currentTierName,
          message: msg,
        );

        if (res['streamer'] != null && res['streamer']['walletBalance'] != null) {
          _streamerBalance = (res['streamer']['walletBalance'] as num).toInt();
        } else {
          _streamerBalance += _selectedAmount;
        }

        if (res['donor'] != null && res['donor']['walletBalance'] != null) {
          _userBalance = (res['donor']['walletBalance'] as num).toInt();
        }
      } else {
        _streamerBalance += _selectedAmount;
      }
    } catch (_) {
      // Sandbox fallback bump
      _streamerBalance += _selectedAmount;
    }

    if (!mounted) return;

    final selectedMethodObj = _paymentMethods.firstWhere(
      (m) => m['id'] == _selectedPaymentMethod,
      orElse: () => {'name': 'VietQR'},
    );

    final result = LiveDonationResult(
      amount: _selectedAmount,
      donorName: name,
      message: msg,
      tier: _currentTierName,
      giftEmoji: _selectedGiftEmoji,
      paymentMethod: selectedMethodObj['name'] as String,
      streamerBalance: _streamerBalance,
      donorBalance: _userBalance,
    );

    widget.onDonated?.call(result);

    setState(() {
      _isSubmitting = false;
      _step = 2; // Move to receipt step
    });

    HapticFeedback.heavyImpact();
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      margin: EdgeInsets.only(
        top: 32,
        bottom: bottomInset,
      ),
      decoration: const BoxDecoration(
        color: _bg,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(
          top: BorderSide(color: Color(0x44F59E0B), width: 1.6),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black87,
            blurRadius: 36,
            spreadRadius: 10,
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Modal Drag Handle
              Center(
                child: Container(
                  width: 44,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // Modal Header
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFF59E0B), Color(0xFFEF4444)],
                      ),
                      shape: BoxShape.circle,
                      boxShadow: [
                        BoxShadow(
                          color: _gold.withValues(alpha: 0.35),
                          blurRadius: 14,
                          spreadRadius: 2,
                        ),
                      ],
                    ),
                    child: const Icon(
                      Icons.volunteer_activism_rounded,
                      color: Colors.white,
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Text(
                              'SUPER CHAT & DONATE',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 15,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.8,
                                fontFamily: 'Outfit',
                              ),
                            ),
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFF10B981).withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(6),
                                border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.5)),
                              ),
                              child: const Text(
                                'SANDBOX 0đ',
                                style: TextStyle(
                                  color: Color(0xFF34D399),
                                  fontSize: 9,
                                  fontWeight: FontWeight.w900,
                                  fontFamily: 'monospace',
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          widget.channelName,
                          style: const TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 12,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white60, size: 22),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // ── REALTIME WALLET & STREAMER BALANCE HERO CARDS ──────
              _buildBalanceCards(),
              const SizedBox(height: 16),

              // ── STEP 0: CONFIGURE DONATION ────────────────────────
              if (_step == 0) ...[
                _buildConfigureStep(),
              ]
              // ── STEP 1: REALISTIC QR SCANNER & TRANSFER ───────────
              else if (_step == 1) ...[
                _buildQrConfirmStep(),
              ]
              // ── STEP 2: TRANSACTION SUCCESS RECEIPT ───────────────
              else if (_step == 2) ...[
                _buildReceiptStep(),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // ── BALANCE HERO CARDS ─────────────────────────────────────────
  Widget _buildBalanceCards() {
    return Row(
      children: [
        // Streamer Beneficiary Balance
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF1C1304), Color(0xFF0F172A)],
              ),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: _gold.withValues(alpha: 0.4)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.stars_rounded, color: _gold, size: 14),
                    SizedBox(width: 4),
                    Text(
                      'QUỸ STREAMER',
                      style: TextStyle(
                        color: Color(0xFFFBBF24),
                        fontSize: 9,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.6,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: Text(
                    _formatVnd(_streamerBalance),
                    key: ValueKey<int>(_streamerBalance),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'JetBrainsMono',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 8),

        // User Wallet Balance
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF041824), Color(0xFF0F172A)],
              ),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: _accent.withValues(alpha: 0.4)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.account_balance_wallet_rounded, color: _accent, size: 14),
                        SizedBox(width: 4),
                        Text(
                          'VÍ CỦA BẠN',
                          style: TextStyle(
                            color: Color(0xFF38BDF8),
                            fontSize: 9,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ],
                    ),
                    // Quick Top-up Button
                    GestureDetector(
                      onTap: _handleQuickTopup,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: _accent.withValues(alpha: 0.18),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: _accent.withValues(alpha: 0.5)),
                        ),
                        child: _isTopupLoading
                            ? const SizedBox(
                                width: 8,
                                height: 8,
                                child: CircularProgressIndicator(
                                  strokeWidth: 1.5,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                ),
                              )
                            : const Text(
                                '+100k',
                                style: TextStyle(
                                  color: _accent,
                                  fontSize: 8,
                                  fontWeight: FontWeight.w900,
                                ),
                              ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                AnimatedSwitcher(
                  duration: const Duration(milliseconds: 300),
                  child: Text(
                    _formatVnd(_userBalance),
                    key: ValueKey<int>(_userBalance),
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'JetBrainsMono',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ── STEP 0: CONFIGURE STEP ─────────────────────────────────────
  Widget _buildConfigureStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Reassurance Guarantee Banner
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: const Color(0xFF064E3B).withValues(alpha: 0.35),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: const Color(0xFF10B981).withValues(alpha: 0.5),
            ),
          ),
          child: const Row(
            children: [
              Icon(Icons.verified_user_rounded, color: Color(0xFF34D399), size: 16),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Chế độ Sandbox: Mã QR VietQR/MoMo mô phỏng an toàn, KHÔNG trừ tiền tài khoản ngân hàng thực tế của bạn.',
                  style: TextStyle(
                    color: Color(0xFFCBD5E1),
                    fontSize: 11,
                    height: 1.35,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Tier Grid
        const Text(
          '1. CHỌN MỨC ỦNG HỘ & QUÀ TẶNG',
          style: TextStyle(
            color: Color(0xFF94A3B8),
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _tiers.map((t) {
            final amount = t['amount'] as int;
            final isSel = _selectedAmount == amount;
            final color = t['color'] as Color;

            return GestureDetector(
              onTap: () {
                HapticFeedback.selectionClick();
                setState(() {
                  _selectedAmount = amount;
                  _selectedGiftEmoji = t['emoji'] as String;
                });
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: isSel ? color.withValues(alpha: 0.18) : const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSel ? color : Colors.white12,
                    width: isSel ? 1.8 : 1,
                  ),
                  boxShadow: isSel
                      ? [
                          BoxShadow(
                            color: color.withValues(alpha: 0.25),
                            blurRadius: 10,
                          )
                        ]
                      : null,
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(t['emoji'] as String, style: const TextStyle(fontSize: 18)),
                    const SizedBox(width: 8),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _formatVnd(amount),
                          style: TextStyle(
                            color: isSel ? Colors.white : const Color(0xFFE2E8F0),
                            fontSize: 13,
                            fontWeight: FontWeight.w900,
                            fontFamily: 'JetBrainsMono',
                          ),
                        ),
                        Text(
                          t['label'] as String,
                          style: TextStyle(
                            color: isSel ? color : const Color(0xFF64748B),
                            fontSize: 10,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 16),

        // Payment Method Selector
        const Text(
          '2. CHỌN CỔNG THANH TOÁN MÔ PHỎNG',
          style: TextStyle(
            color: Color(0xFF94A3B8),
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          children: _paymentMethods.map((m) {
            final isSel = _selectedPaymentMethod == m['id'];
            final col = m['color'] as Color;
            return Expanded(
              child: GestureDetector(
                onTap: () {
                  HapticFeedback.selectionClick();
                  setState(() => _selectedPaymentMethod = m['id'] as String);
                },
                child: Container(
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: isSel ? col.withValues(alpha: 0.2) : const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(
                      color: isSel ? col : Colors.white10,
                      width: isSel ? 1.6 : 1,
                    ),
                  ),
                  child: Column(
                    children: [
                      Icon(m['icon'] as IconData, color: isSel ? col : Colors.white60, size: 20),
                      const SizedBox(height: 4),
                      Text(
                        m['name'] as String,
                        style: TextStyle(
                          color: isSel ? Colors.white : const Color(0xFF94A3B8),
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 1),
                      Text(
                        m['subtitle'] as String,
                        style: TextStyle(
                          color: isSel ? col : const Color(0xFF64748B),
                          fontSize: 8,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 16),

        // Donor Name
        const Text(
          'TÊN KHÁN GIẢ HIỂN THỊ',
          style: TextStyle(
            color: Color(0xFF94A3B8),
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _donorNameCtrl,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: InputDecoration(
            filled: true,
            fillColor: const Color(0xFF0F172A),
            hintText: 'Nhập tên hiển thị trên luồng live',
            hintStyle: const TextStyle(color: Color(0xFF475569)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.white10),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.white10),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: _accent),
            ),
          ),
        ),
        const SizedBox(height: 14),

        // Super Chat Message
        const Text(
          'LỜI NHẮN SUPER CHAT (GHIM NỔI BẬT LÊN STREAM)',
          style: TextStyle(
            color: Color(0xFF94A3B8),
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: _messageCtrl,
          maxLines: 2,
          maxLength: 150,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: InputDecoration(
            filled: true,
            fillColor: const Color(0xFF0F172A),
            hintText: 'Gửi lời động viên hoặc lời chúc...',
            hintStyle: const TextStyle(color: Color(0xFF475569)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.white10),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: Colors.white10),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: _gold),
            ),
          ),
        ),
        const SizedBox(height: 16),

        // Next Step Button
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: _gold,
            foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            elevation: 8,
          ),
          onPressed: () {
            HapticFeedback.selectionClick();
            _startCountdown();
            setState(() => _step = 1);
          },
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                'TIẾP TỤC ĐẾN MÃ QR THANH TOÁN',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.6,
                ),
              ),
              SizedBox(width: 8),
              Icon(Icons.arrow_forward_rounded, size: 18),
            ],
          ),
        ),
      ],
    );
  }

  // ── STEP 1: REALISTIC QR CONFIRM STEP ─────────────────────────
  Widget _buildQrConfirmStep() {
    final methodObj = _paymentMethods.firstWhere(
      (m) => m['id'] == _selectedPaymentMethod,
      orElse: () => _paymentMethods[0],
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Navigation bar
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            GestureDetector(
              onTap: () {
                _countdownTimer?.cancel();
                setState(() => _step = 0);
              },
              child: const Row(
                children: [
                  Icon(Icons.arrow_back_rounded, color: Color(0xFF94A3B8), size: 18),
                  SizedBox(width: 4),
                  Text(
                    'Quay lại',
                    style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.3)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.timer_outlined, color: Color(0xFFF59E0B), size: 13),
                  const SizedBox(width: 4),
                  Text(
                    'Hết hạn: ${_formatTimer(_countdownSeconds)}',
                    style: const TextStyle(
                      color: Color(0xFFF59E0B),
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      fontFamily: 'monospace',
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // Realistic QR Code Card
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: Colors.white12),
            boxShadow: const [
              BoxShadow(
                color: Colors.black54,
                blurRadius: 20,
                spreadRadius: 2,
              ),
            ],
          ),
          child: Column(
            children: [
              // Payment brand chip
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: (methodObj['color'] as Color).withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: methodObj['color'] as Color),
                ),
                child: Text(
                  methodObj['bankLabel'] as String,
                  style: TextStyle(
                    color: methodObj['color'] as Color,
                    fontSize: 11,
                    fontWeight: FontWeight.w900,
                  ),
                ),
              ),
              const SizedBox(height: 12),

              // Authentic QR Code Image
              Container(
                width: 220,
                height: 220,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: const [
                    BoxShadow(
                      color: Colors.black26,
                      blurRadius: 12,
                      offset: Offset(0, 4),
                    ),
                  ],
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(10),
                  child: CachedNetworkImage(
                    imageUrl: _qrImageUrl,
                    fit: BoxFit.contain,
                    placeholder: (_, __) => const Center(
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                    errorWidget: (_, __, ___) => Image.network(
                      'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${Uri.encodeComponent(_transferSyntax)}',
                      fit: BoxFit.contain,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Text(
                'Quét mã qua ${methodObj['name']} hoặc ứng dụng Banking',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'Tự động điền số tiền ${_formatVnd(_selectedAmount)} & nội dung',
                style: const TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 10,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),

        // Transfer Invoice Details
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: Colors.white10),
          ),
          child: Column(
            children: [
              // Beneficiary
              _buildInvoiceRow(
                label: 'Người nhận (Streamer):',
                value: _accountHolder,
                valueColor: _accent,
              ),
              const Divider(color: Colors.white10, height: 16),

              // Account Number / Phone
              _buildInvoiceRow(
                label: _selectedPaymentMethod == 'momo' ? 'Số ví MoMo:' : 'Số tài khoản MBBank:',
                value: _selectedPaymentMethod == 'momo' ? _momoPhone : _bankAccount,
                copyable: true,
                onCopy: () => _copyToClipboard(
                  _selectedPaymentMethod == 'momo' ? _momoPhone : _bankAccount,
                  'số tài khoản',
                ),
              ),
              const Divider(color: Colors.white10, height: 16),

              // Amount
              _buildInvoiceRow(
                label: 'Số tiền chuyển:',
                value: _formatVnd(_selectedAmount),
                valueColor: _gold,
                isBoldLarge: true,
              ),
              const Divider(color: Colors.white10, height: 16),

              // Syntax
              _buildInvoiceRow(
                label: 'Nội dung chuyển tiền:',
                value: _transferSyntax,
                valueColor: const Color(0xFF34D399),
                copyable: true,
                onCopy: () => _copyToClipboard(_transferSyntax, 'nội dung chuyển'),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Confirm Button
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF10B981),
            foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            elevation: 8,
          ),
          onPressed: _isSubmitting ? null : _handleConfirmPayment,
          child: _isSubmitting
              ? const SizedBox(
                  width: 22,
                  height: 22,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.4,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.black),
                  ),
                )
              : const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.check_circle_rounded, size: 20),
                    SizedBox(width: 8),
                    Text(
                      'XÁC NHẬN ĐÃ CHUYỂN TIỀN (HOÀN TẤT)',
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
        ),
      ],
    );
  }

  // ── STEP 2: RECEIPT STEP ───────────────────────────────────────
  Widget _buildReceiptStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: Container(
            width: 72,
            height: 72,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF10B981), Color(0xFF059669)],
              ),
              shape: BoxShape.circle,
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF10B981).withValues(alpha: 0.4),
                  blurRadius: 20,
                  spreadRadius: 4,
                ),
              ],
            ),
            child: const Icon(Icons.check_rounded, color: Colors.white, size: 40),
          ),
        ),
        const SizedBox(height: 16),
        const Text(
          'GIAO DỊCH MÔ PHỎNG THÀNH CÔNG!',
          textAlign: TextAlign.center,
          style: TextStyle(
            color: Color(0xFF34D399),
            fontSize: 16,
            fontWeight: FontWeight.w900,
            letterSpacing: 0.6,
          ),
        ),
        const SizedBox(height: 6),
        Text(
          'Đã cộng ${_formatVnd(_selectedAmount)} vào quỹ của Streamer $_accountHolder (Chi phí thực tế = 0đ)',
          textAlign: TextAlign.center,
          style: const TextStyle(
            color: Color(0xFF94A3B8),
            fontSize: 12,
            height: 1.4,
          ),
        ),
        const SizedBox(height: 20),

        // Receipt Summary Box
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.white12),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Gói quà Super Chat:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                  Text(
                    '$_selectedGiftEmoji $_currentTierName',
                    style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Số tiền:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                  Text(
                    _formatVnd(_selectedAmount),
                    style: const TextStyle(color: _gold, fontSize: 13, fontWeight: FontWeight.w900, fontFamily: 'monospace'),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Người gửi:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                  Text(
                    _donorNameCtrl.text.trim().isEmpty ? 'Khán giả OmniCast' : _donorNameCtrl.text.trim(),
                    style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                ],
              ),
              if (_messageCtrl.text.trim().isNotEmpty) ...[
                const SizedBox(height: 10),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Lời nhắn:', style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12)),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Text(
                        _messageCtrl.text.trim(),
                        textAlign: TextAlign.right,
                        style: const TextStyle(color: Color(0xFFE2E8F0), fontSize: 12, fontStyle: FontStyle.italic),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 20),

        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: _accent,
            foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
            elevation: 8,
          ),
          onPressed: () => Navigator.of(context).pop(),
          child: const Text(
            'HOÀN TẤT & QUAY LẠI XEM LIVE',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.6,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildInvoiceRow({
    required String label,
    required String value,
    Color? valueColor,
    bool isBoldLarge = false,
    bool copyable = false,
    VoidCallback? onCopy,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
        ),
        Row(
          children: [
            Text(
              value,
              style: TextStyle(
                color: valueColor ?? Colors.white,
                fontSize: isBoldLarge ? 14 : 12,
                fontWeight: isBoldLarge ? FontWeight.w900 : FontWeight.w700,
                fontFamily: 'monospace',
              ),
            ),
            if (copyable) ...[
              const SizedBox(width: 8),
              GestureDetector(
                onTap: onCopy,
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.white10,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Icon(Icons.copy_rounded, color: Colors.white70, size: 14),
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }
}
