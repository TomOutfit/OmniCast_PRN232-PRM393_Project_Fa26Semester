// ============================================================
// OmniCast · Live Stream Donation & Super Chat Modal
// ============================================================
//
// Allows viewers to send donations / Super Chat messages to the
// streamer or broadcast channel with real-time highlights.
// Synchronized with Web Frontend aesthetics & multi-tier gifts.
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../../../core/services/billing_service.dart';

class LiveDonationResult {
  final int amount;
  final String donorName;
  final String message;
  final String tier;
  final String giftEmoji;
  final String paymentMethod;

  LiveDonationResult({
    required this.amount,
    required this.donorName,
    required this.message,
    required this.tier,
    this.giftEmoji = '🎉',
    this.paymentMethod = 'MoMo',
  });
}

class LiveDonationModal extends StatefulWidget {
  final String channelName;
  final String? eventTitle;
  final String? eventId;
  final Function(LiveDonationResult result)? onDonated;

  const LiveDonationModal({
    super.key,
    required this.channelName,
    this.eventTitle,
    this.eventId,
    this.onDonated,
  });

  static Future<LiveDonationResult?> show(
    BuildContext context, {
    required String channelName,
    String? eventTitle,
    String? eventId,
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

  int _selectedAmount = 50000;
  String _selectedPaymentMethod = 'momo';
  String _selectedGiftEmoji = '🍕';

  final TextEditingController _donorNameCtrl =
      TextEditingController(text: 'Khán giả OmniCast');
  final TextEditingController _messageCtrl =
      TextEditingController(text: 'Ủng hộ kênh phát sóng xuất sắc! 🔥');

  bool _isSubmitting = false;

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
      'label': 'Trà sữa',
      'color': const Color(0xFF34D399),
    },
    {
      'amount': 50000,
      'emoji': '🍕',
      'label': 'Bữa tối vui vẻ',
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
      'label': 'Vương miện Vàng',
      'color': const Color(0xFFF43F5E),
    },
  ];

  final List<Map<String, dynamic>> _paymentMethods = [
    {
      'id': 'momo',
      'name': 'Ví MoMo',
      'subtitle': 'Sandbox 0đ',
      'icon': Icons.account_balance_wallet_rounded,
      'color': const Color(0xFFA50064),
    },
    {
      'id': 'vnpay',
      'name': 'VNPay QR',
      'subtitle': 'Mô phỏng 0đ',
      'icon': Icons.qr_code_scanner_rounded,
      'color': const Color(0xFF005BAA),
    },
    {
      'id': 'zalopay',
      'name': 'ZaloPay',
      'subtitle': 'Sandbox 0đ',
      'icon': Icons.payments_rounded,
      'color': const Color(0xFF0068FF),
    },
    {
      'id': 'card',
      'name': 'Thẻ ATM/Visa',
      'subtitle': 'Giả lập 0đ',
      'icon': Icons.credit_card_rounded,
      'color': const Color(0xFF10B981),
    },
  ];

  @override
  void dispose() {
    _donorNameCtrl.dispose();
    _messageCtrl.dispose();
    super.dispose();
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

  String get _currentTierName {
    final match = _tiers.firstWhere(
      (t) => t['amount'] == _selectedAmount,
      orElse: () => {'label': 'Ủng hộ đặc biệt'},
    );
    return match['label'] as String;
  }

  Future<void> _handleDonate() async {
    if (_isSubmitting) return;
    setState(() => _isSubmitting = true);

    final name = _donorNameCtrl.text.trim().isEmpty
        ? 'Khán giả bí mật'
        : _donorNameCtrl.text.trim();
    final msg = _messageCtrl.text.trim().isEmpty
        ? 'Gửi tặng ${_formatVnd(_selectedAmount)} $_selectedGiftEmoji'
        : _messageCtrl.text.trim();

    HapticFeedback.mediumImpact();
    // Call backend sandbox donation endpoint to credit streamer's real account
    if (widget.eventId != null && widget.eventId!.isNotEmpty) {
      try {
        await BillingService.instance.sendSandboxDonation(
          eventId: widget.eventId!,
          donorName: name,
          amount: _selectedAmount,
          paymentMethod: _selectedPaymentMethod,
          giftEmoji: _selectedGiftEmoji,
          giftTier: _currentTierName,
          message: msg,
        );
      } catch (_) {
        // Fallback gracefully so UI remains responsive in sandbox mode
      }
    }

    // Simulated verified payment gateway round-trip
    await Future.delayed(const Duration(milliseconds: 600));

    if (!mounted) return;

    final selectedMethod = _paymentMethods.firstWhere(
      (m) => m['id'] == _selectedPaymentMethod,
      orElse: () => {'name': 'Ví điện tử'},
    );

    final result = LiveDonationResult(
      amount: _selectedAmount,
      donorName: name,
      message: msg,
      tier: _currentTierName,
      giftEmoji: _selectedGiftEmoji,
      paymentMethod: selectedMethod['name'] as String,
    );

    widget.onDonated?.call(result);

    Navigator.of(context).pop(result);
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;

    return Container(
      margin: EdgeInsets.only(
        top: 40,
        bottom: bottomInset,
      ),
      decoration: const BoxDecoration(
        color: _bg,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        border: Border(
          top: BorderSide(color: Color(0x44F59E0B), width: 1.4),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black87,
            blurRadius: 30,
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
              // Handle Bar
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
              const SizedBox(height: 16),

              // Header
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
                      size: 22,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'SUPER CHAT & DONATE',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.8,
                            fontFamily: 'Outfit',
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Ủng hộ luồng trực tiếp · ${widget.channelName}',
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

              // Sandbox Reassurance Notice Banner
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF064E3B).withValues(alpha: 0.35),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: const Color(0xFF10B981).withValues(alpha: 0.6),
                    width: 1.2,
                  ),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: const BoxDecoration(
                        color: Color(0xFF10B981),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.verified_user_rounded,
                        color: Colors.black,
                        size: 16,
                      ),
                    ),
                    const SizedBox(width: 10),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Text(
                                'CHẾ ĐỘ MÔ PHỎNG (TEST SANDBOX)',
                                style: TextStyle(
                                  color: Color(0xFF34D399),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.6,
                                ),
                              ),
                              SizedBox(width: 6),
                              Text(
                                '· MIỄN PHÍ 100%',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                          SizedBox(height: 3),
                          Text(
                            'Tính năng demo đồ án học tập (Fa26Semester). Tất cả cổng MoMo, VNPay, ZaloPay, Thẻ đều là giả lập an toàn, KHÔNG trừ tiền thật từ tài khoản ngân hàng của bạn.',
                            style: TextStyle(
                              color: Color(0xFFCBD5E1),
                              fontSize: 11,
                              height: 1.35,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Tier & Gift Grid
              const Text(
                'CHỌN GÓI ỦNG HỘ & QUÀ TẶNG',
                style: TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                ),
              ),
              const SizedBox(height: 10),
              Wrap(
                spacing: 10,
                runSpacing: 10,
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
                      padding: const EdgeInsets.symmetric(
                        horizontal: 14,
                        vertical: 10,
                      ),
                      decoration: BoxDecoration(
                        color: isSel
                            ? color.withValues(alpha: 0.18)
                            : const Color(0xFF0F172A),
                        borderRadius: BorderRadius.circular(14),
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
                          Text(
                            t['emoji'] as String,
                            style: const TextStyle(fontSize: 18),
                          ),
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
              const SizedBox(height: 18),

              // Payment Method Selector
              const Text(
                'PHƯƠNG THỨC THANH TOÁN',
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
                                fontSize: 10,
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
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 18),

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
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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

              // Message Input
              const Text(
                'LỜI NHẮN SUPER CHAT (PIN NỔI BẬT LÊN STREAM)',
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
                  hintText: 'Gửi lời động viên, câu hỏi hoặc lời nhắn...',
                  hintStyle: const TextStyle(color: Color(0xFF475569)),
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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

              // Payment Breakdown & Zero-Cost Guarantee Card
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white12),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Mức ủng hộ hiển thị:',
                          style: TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                        ),
                        Text(
                          '$_selectedGiftEmoji ${_formatVnd(_selectedAmount)}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            fontFamily: 'JetBrainsMono',
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.shield_rounded, color: Color(0xFF34D399), size: 14),
                            SizedBox(width: 4),
                            Text(
                              'Chi phí thực tế bị trừ:',
                              style: TextStyle(
                                color: Color(0xFF34D399),
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF10B981).withValues(alpha: 0.2),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFF10B981)),
                          ),
                          child: const Text(
                            '0 ₫ (Không mất tiền)',
                            style: TextStyle(
                              color: Color(0xFF34D399),
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                              fontFamily: 'JetBrainsMono',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 14),

              // Action button
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: _gold,
                  foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                  elevation: 8,
                ),
                onPressed: _isSubmitting ? null : _handleDonate,
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
                          Icon(Icons.flash_on_rounded, size: 20),
                          SizedBox(width: 8),
                          Text(
                            'XÁC NHẬN GỬI MÔ PHỎNG (0đ THỰC TẾ)',
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
          ),
        ),
      ),
    );
  }
}
