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
  final Function(LiveDonationResult result)? onDonated;

  const LiveDonationModal({
    super.key,
    required this.channelName,
    this.eventTitle,
    this.onDonated,
  });

  static Future<LiveDonationResult?> show(
    BuildContext context, {
    required String channelName,
    String? eventTitle,
    Function(LiveDonationResult result)? onDonated,
  }) {
    return showModalBottomSheet<LiveDonationResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => LiveDonationModal(
        channelName: channelName,
        eventTitle: eventTitle,
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
      'subtitle': 'Thanh toán tức thì',
      'icon': Icons.account_balance_wallet_rounded,
      'color': const Color(0xFFA50064),
    },
    {
      'id': 'vnpay',
      'name': 'VNPay QR',
      'subtitle': 'Quét mã liên ngân hàng',
      'icon': Icons.qr_code_scanner_rounded,
      'color': const Color(0xFF005BAA),
    },
    {
      'id': 'zalopay',
      'name': 'ZaloPay',
      'subtitle': 'Ví điện tử Zalo',
      'icon': Icons.payments_rounded,
      'color': const Color(0xFF0068FF),
    },
    {
      'id': 'card',
      'name': 'Thẻ ATM / Visa',
      'subtitle': 'Nội địa & Quốc tế',
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
    final name = _donorNameCtrl.text.trim().isEmpty
        ? 'Khán giả bí mật'
        : _donorNameCtrl.text.trim();
    final msg = _messageCtrl.text.trim().isEmpty
        ? 'Gửi tặng ${_formatVnd(_selectedAmount)} $_selectedGiftEmoji'
        : _messageCtrl.text.trim();

    HapticFeedback.mediumImpact();
    setState(() => _isSubmitting = true);

    // Simulated verified payment gateway round-trip
    await Future.delayed(const Duration(milliseconds: 900));

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
                    : Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.flash_on_rounded, size: 20),
                          const SizedBox(width: 8),
                          Text(
                            'GỬI SUPER CHAT ($_selectedGiftEmoji ${_formatVnd(_selectedAmount)})',
                            style: const TextStyle(
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
