// ============================================================
// OmniCast · Subscription & Wallet Deposit Sheet
// ============================================================
//
// Supports:
//   1. VietQR / Bank Transfer & MoMo (Mô phỏng QR Code thanh toán)
//   2. Google Play In-App Billing (tích hợp BillingService)
//   3. Nạp tiền số dư hoặc kích hoạt gói VIP OmniPass 4K
// ============================================================

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/services/billing_service.dart';

enum PaymentType {
  vipSubscription,
  walletDeposit,
}

enum PaymentProvider {
  vietQr,
  momo,
  googlePlay,
}

class SubscriptionPaymentSheet extends StatefulWidget {
  final PaymentType initialType;
  final VipProductId initialProduct;
  final VoidCallback? onSuccess;

  const SubscriptionPaymentSheet({
    super.key,
    this.initialType = PaymentType.vipSubscription,
    this.initialProduct = VipProductId.monthly,
    this.onSuccess,
  });

  static Future<bool?> show(
    BuildContext context, {
    PaymentType type = PaymentType.vipSubscription,
    VipProductId product = VipProductId.monthly,
    VoidCallback? onSuccess,
  }) {
    return showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => SubscriptionPaymentSheet(
        initialType: type,
        initialProduct: product,
        onSuccess: onSuccess,
      ),
    );
  }

  @override
  State<SubscriptionPaymentSheet> createState() =>
      _SubscriptionPaymentSheetState();
}

class _SubscriptionPaymentSheetState extends State<SubscriptionPaymentSheet> {
  static const _accent = Color(0xFF00E5FF);
  static const _gold = Color(0xFFF59E0B);
  static const _green = Color(0xFF22C55E);
  static const _bg = Color(0xFF0B1320);

  late PaymentType _type;
  late VipProductId _selectedProduct;
  int _depositAmount = 100000;
  PaymentProvider _provider = PaymentProvider.vietQr;

  bool _isProcessing = false;
  bool _isCompleted = false;
  int _countdownSeconds = 900; // 15 minutes
  Timer? _countdownTimer;

  final TextEditingController _customDepositCtrl = TextEditingController();

  final List<int> _depositPresets = [
    50000,
    100000,
    200000,
    500000,
  ];

  @override
  void initState() {
    super.initState();
    _type = widget.initialType;
    _selectedProduct = widget.initialProduct;
    _startCountdown();
  }

  void _startCountdown() {
    _countdownTimer?.cancel();
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) return;
      if (_countdownSeconds > 0) {
        setState(() => _countdownSeconds--);
      } else {
        timer.cancel();
      }
    });
  }

  @override
  void dispose() {
    _countdownTimer?.cancel();
    _customDepositCtrl.dispose();
    super.dispose();
  }

  int get _currentAmount {
    if (_type == PaymentType.vipSubscription) {
      return _selectedProduct == VipProductId.monthly ? 35000 : 350000;
    }
    return _depositAmount;
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

  String get _transferSyntax {
    final code = (_type == PaymentType.vipSubscription) ? 'VIP' : 'NAP';
    final ts = DateTime.now().millisecondsSinceEpoch.toString().substring(7);
    return 'OMNICAST $code $ts';
  }

  void _copyToClipboard(String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    HapticFeedback.lightImpact();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Đã sao chép $label: $text'),
        backgroundColor: const Color(0xFF1E293B),
        behavior: SnackBarBehavior.floating,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _handleConfirmPayment() async {
    HapticFeedback.mediumImpact();
    setState(() => _isProcessing = true);

    try {
      if (_provider == PaymentProvider.googlePlay) {
        // In-App purchase flow via BillingService
        final result = await BillingService.instance.purchase(_selectedProduct);
        if (!mounted) return;
        if (result.success) {
          _onPaymentSuccess();
        } else {
          setState(() => _isProcessing = false);
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(result.error ?? 'Thanh toán Google Play không thành công'),
              backgroundColor: const Color(0xFFEF4444),
            ),
          );
        }
        return;
      }

      // Simulated QR Code / MoMo verification delay
      await Future.delayed(const Duration(milliseconds: 1400));
      if (!mounted) return;

      // Simulate stamping VIP entitlement on client
      if (_type == PaymentType.vipSubscription) {
        await BillingService.instance.purchase(_selectedProduct);
      }

      _onPaymentSuccess();
    } catch (e) {
      if (mounted) {
        setState(() => _isProcessing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi giao dịch: $e'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  void _onPaymentSuccess() {
    setState(() {
      _isProcessing = false;
      _isCompleted = true;
    });
    HapticFeedback.heavyImpact();
    widget.onSuccess?.call();

    Future.delayed(const Duration(milliseconds: 1800), () {
      if (mounted) {
        Navigator.of(context).pop(true);
      }
    });
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
          top: BorderSide(color: Color(0x3300E5FF), width: 1.2),
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
              // Sheet Drag Handle
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

              if (_isCompleted) ...[
                _buildSuccessView(),
              ] else ...[
                _buildHeader(),
                const SizedBox(height: 16),
                _buildTypeTabs(),
                const SizedBox(height: 18),
                if (_type == PaymentType.vipSubscription)
                  _buildVipProductSelector()
                else
                  _buildDepositAmountSelector(),
                const SizedBox(height: 20),
                _buildProviderSelector(),
                const SizedBox(height: 20),
                if (_provider != PaymentProvider.googlePlay)
                  _buildQrTransferCard()
                else
                  _buildGooglePlayCard(),
                const SizedBox(height: 24),
                _buildActionButton(),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // ─── Header ──────────────────────────────────────────────────
  Widget _buildHeader() {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: _gold.withValues(alpha: 0.15),
            shape: BoxShape.circle,
            border: Border.all(color: _gold.withValues(alpha: 0.4)),
          ),
          child: const Icon(Icons.stars_rounded, color: _gold, size: 24),
        ),
        const SizedBox(width: 14),
        const Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'THANH TOÁN & NẠP TIỀN',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.8,
                  fontFamily: 'Outfit',
                ),
              ),
              SizedBox(height: 2),
              Text(
                'Mở khóa VIP 4K HEVC & Ủng hộ kênh trực tiếp',
                style: TextStyle(
                  color: Color(0xFF94A3B8),
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
        IconButton(
          icon: const Icon(Icons.close, color: Colors.white60, size: 22),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ],
    );
  }

  // ─── Type Tabs (VIP vs Deposit) ───────────────────────────────
  Widget _buildTypeTabs() {
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFF070D17),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white10),
      ),
      child: Row(
        children: [
          Expanded(
            child: _tabButton(
              title: 'GÓI VIP 4K PASS',
              icon: Icons.workspace_premium_rounded,
              isSelected: _type == PaymentType.vipSubscription,
              onTap: () => setState(() => _type = PaymentType.vipSubscription),
            ),
          ),
          Expanded(
            child: _tabButton(
              title: 'NẠP SỐ DƯ VÍ',
              icon: Icons.account_balance_wallet_rounded,
              isSelected: _type == PaymentType.walletDeposit,
              onTap: () => setState(() => _type = PaymentType.walletDeposit),
            ),
          ),
        ],
      ),
    );
  }

  Widget _tabButton({
    required String title,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 10),
        decoration: BoxDecoration(
          color: isSelected ? _accent.withValues(alpha: 0.18) : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: isSelected ? _accent : Colors.transparent,
            width: 1.2,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 16,
              color: isSelected ? _accent : const Color(0xFF64748B),
            ),
            const SizedBox(width: 8),
            Text(
              title,
              style: TextStyle(
                color: isSelected ? Colors.white : const Color(0xFF64748B),
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── VIP Product Selector ─────────────────────────────────────
  Widget _buildVipProductSelector() {
    return Row(
      children: [
        Expanded(
          child: _productCard(
            product: VipProductId.monthly,
            title: '1 Tháng',
            price: '35.000 ₫',
            badge: 'PHỔ BIẾN',
            isSelected: _selectedProduct == VipProductId.monthly,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _productCard(
            product: VipProductId.yearly,
            title: '1 Năm',
            price: '350.000 ₫',
            badge: 'TIẾT KIỆM 20%',
            isSelected: _selectedProduct == VipProductId.yearly,
          ),
        ),
      ],
    );
  }

  Widget _productCard({
    required VipProductId product,
    required String title,
    required String price,
    required String badge,
    required bool isSelected,
  }) {
    return GestureDetector(
      onTap: () => setState(() => _selectedProduct = product),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isSelected
              ? _gold.withValues(alpha: 0.12)
              : const Color(0xFF0F172A).withValues(alpha: 0.6),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? _gold : Colors.white12,
            width: isSelected ? 1.6 : 1,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 15,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: isSelected ? _gold : const Color(0xFF334155),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    badge,
                    style: TextStyle(
                      color: isSelected ? Colors.black : Colors.white70,
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              price,
              style: TextStyle(
                color: isSelected ? _gold : const Color(0xFFCBD5E1),
                fontSize: 18,
                fontWeight: FontWeight.w900,
                fontFamily: 'JetBrainsMono',
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Xem không quảng cáo, mở khóa kênh 4K',
              style: TextStyle(
                color: Color(0xFF64748B),
                fontSize: 10,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── Deposit Amount Selector ──────────────────────────────────
  Widget _buildDepositAmountSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'CHỌN SỐ TIỀN NẠP',
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
          children: _depositPresets.map((amount) {
            final isSel = _depositAmount == amount;
            return GestureDetector(
              onTap: () => setState(() => _depositAmount = amount),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                decoration: BoxDecoration(
                  color: isSel ? _accent.withValues(alpha: 0.15) : const Color(0xFF0F172A),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSel ? _accent : Colors.white12,
                    width: isSel ? 1.4 : 1,
                  ),
                ),
                child: Text(
                  _formatVnd(amount),
                  style: TextStyle(
                    color: isSel ? _accent : Colors.white,
                    fontSize: 13,
                    fontWeight: isSel ? FontWeight.w800 : FontWeight.w600,
                    fontFamily: 'JetBrainsMono',
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  // ─── Payment Provider Selector ────────────────────────────────
  Widget _buildProviderSelector() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'PHƯƠNG THỨC THANH TOÁN',
          style: TextStyle(
            color: Color(0xFF94A3B8),
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _providerTile(
                provider: PaymentProvider.vietQr,
                label: 'VietQR / Ngân hàng',
                icon: Icons.qr_code_2_rounded,
                color: const Color(0xFF2563EB),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _providerTile(
                provider: PaymentProvider.momo,
                label: 'Ví MoMo',
                icon: Icons.account_balance_wallet,
                color: const Color(0xFFD82D8B),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _providerTile(
                provider: PaymentProvider.googlePlay,
                label: 'Google Play',
                icon: Icons.play_arrow_rounded,
                color: const Color(0xFF059669),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _providerTile({
    required PaymentProvider provider,
    required String label,
    required IconData icon,
    required Color color,
  }) {
    final isSelected = _provider == provider;
    return GestureDetector(
      onTap: () => setState(() => _provider = provider),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: isSelected ? color.withValues(alpha: 0.18) : const Color(0xFF0F172A),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? color : Colors.white10,
            width: isSelected ? 1.6 : 1,
          ),
        ),
        child: Column(
          children: [
            Icon(icon, color: isSelected ? color : Colors.white60, size: 24),
            const SizedBox(height: 6),
            Text(
              label,
              textAlign: TextAlign.center,
              style: TextStyle(
                color: isSelected ? Colors.white : const Color(0xFF94A3B8),
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ─── VietQR / MoMo Transfer Card ───────────────────────────────
  Widget _buildQrTransferCard() {
    final isMomo = _provider == PaymentProvider.momo;
    final bankName = isMomo ? 'Ví Điện Tử MoMo' : 'Ngân hàng Quân Đội (MBBank)';
    final accountNo = isMomo ? '0988899988' : '888899996666';
    const accountName = 'OMNICAST MEDIA DIGITAL CORP';
    final syntax = _transferSyntax;
    final mins = (_countdownSeconds ~/ 60).toString().padLeft(2, '0');
    final secs = (_countdownSeconds % 60).toString().padLeft(2, '0');

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF060B13),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: (isMomo ? const Color(0xFFD82D8B) : _accent).withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        children: [
          // Expiration countdown
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 8,
                    height: 8,
                    decoration: const BoxDecoration(
                      color: _green,
                      shape: BoxShape.circle,
                    ),
                  ),
                  const SizedBox(width: 6),
                  const Text(
                    'MÃ THANH TOÁN TỰ ĐỘNG',
                    style: TextStyle(
                      color: _green,
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.6,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.white10,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  'Hết hạn: $mins:$secs',
                  style: const TextStyle(
                    color: Color(0xFFF59E0B),
                    fontSize: 11,
                    fontFamily: 'JetBrainsMono',
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Simulated QR graphic
          Center(
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: (isMomo ? const Color(0xFFD82D8B) : _accent).withValues(alpha: 0.2),
                    blurRadius: 18,
                    spreadRadius: 2,
                  ),
                ],
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Stylized QR matrix representation
                  CustomPaint(
                    size: const Size(150, 150),
                    painter: _QrMatrixPainter(
                      color: Colors.black87,
                      seed: _currentAmount,
                    ),
                  ),
                  // Center branding icon
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: const [
                        BoxShadow(
                          color: Colors.black26,
                          blurRadius: 6,
                        ),
                      ],
                    ),
                    child: Icon(
                      isMomo ? Icons.account_balance_wallet : Icons.tv_rounded,
                      color: isMomo ? const Color(0xFFD82D8B) : const Color(0xFF2563EB),
                      size: 24,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Transfer detail rows
          _transferDetailRow(
            label: 'Ngân hàng / Cổng:',
            value: bankName,
          ),
          const Divider(color: Colors.white10, height: 16),
          _transferDetailRow(
            label: 'Số tài khoản:',
            value: accountNo,
            onCopy: () => _copyToClipboard(accountNo, 'Số tài khoản'),
          ),
          const Divider(color: Colors.white10, height: 16),
          _transferDetailRow(
            label: 'Chủ tài khoản:',
            value: accountName,
          ),
          const Divider(color: Colors.white10, height: 16),
          _transferDetailRow(
            label: 'Số tiền:',
            value: _formatVnd(_currentAmount),
            valueColor: _gold,
            onCopy: () => _copyToClipboard(_currentAmount.toString(), 'Số tiền'),
          ),
          const Divider(color: Colors.white10, height: 16),
          _transferDetailRow(
            label: 'Nội dung CK:',
            value: syntax,
            valueColor: _accent,
            onCopy: () => _copyToClipboard(syntax, 'Nội dung chuyển khoản'),
          ),
        ],
      ),
    );
  }

  Widget _transferDetailRow({
    required String label,
    required String value,
    Color? valueColor,
    VoidCallback? onCopy,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Color(0xFF94A3B8),
            fontSize: 12,
          ),
        ),
        Row(
          children: [
            Text(
              value,
              style: TextStyle(
                color: valueColor ?? Colors.white,
                fontSize: 12,
                fontWeight: FontWeight.w700,
                fontFamily: valueColor != null ? 'JetBrainsMono' : null,
              ),
            ),
            if (onCopy != null) ...[
              const SizedBox(width: 6),
              GestureDetector(
                onTap: onCopy,
                child: const Icon(
                  Icons.copy_rounded,
                  color: _accent,
                  size: 15,
                ),
              ),
            ],
          ],
        ),
      ],
    );
  }

  // ─── Google Play Card ─────────────────────────────────────────
  Widget _buildGooglePlayCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFF059669).withValues(alpha: 0.4)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.verified_user_rounded, color: Color(0xFF059669), size: 20),
              SizedBox(width: 8),
              Text(
                'Google Play In-App Purchase',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 13,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            'Thanh toán trực tiếp bằng phương thức đã lưu trên Google Play (Thẻ tín dụng, ví điện tử, cước điện thoại). Kích hoạt tự động ngay sau khi xác nhận biên lai.',
            style: TextStyle(
              color: Color(0xFF94A3B8),
              fontSize: 11,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.black38,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  _selectedProduct.labelVi,
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700),
                ),
                Text(
                  _selectedProduct.priceVi,
                  style: const TextStyle(
                    color: Color(0xFF059669),
                    fontSize: 14,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'JetBrainsMono',
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ─── Action Button ────────────────────────────────────────────
  Widget _buildActionButton() {
    final isGooglePlay = _provider == PaymentProvider.googlePlay;
    final btnText = isGooglePlay
        ? 'THANH TOÁN QUA GOOGLE PLAY (${_formatVnd(_currentAmount)})'
        : 'XÁC NHẬN ĐÃ CHUYỂN KHOẢN (${_formatVnd(_currentAmount)})';

    return ElevatedButton(
      style: ElevatedButton.styleFrom(
        backgroundColor: isGooglePlay ? const Color(0xFF059669) : _accent,
        foregroundColor: Colors.black,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(14),
        ),
        elevation: 8,
      ),
      onPressed: _isProcessing ? null : _handleConfirmPayment,
      child: _isProcessing
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
                Icon(
                  isGooglePlay ? Icons.play_arrow_rounded : Icons.check_circle_rounded,
                  size: 20,
                  color: Colors.black,
                ),
                const SizedBox(width: 8),
                Text(
                  btnText,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
    );
  }

  // ─── Success View ─────────────────────────────────────────────
  Widget _buildSuccessView() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 36),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: _green.withValues(alpha: 0.18),
              shape: BoxShape.circle,
              border: Border.all(color: _green, width: 2),
            ),
            child: const Icon(Icons.check, color: _green, size: 48),
          ),
          const SizedBox(height: 20),
          const Text(
            'GIAO DỊCH THÀNH CÔNG!',
            style: TextStyle(
              color: Colors.white,
              fontSize: 18,
              fontWeight: FontWeight.w900,
              letterSpacing: 1,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _type == PaymentType.vipSubscription
                ? 'Đã kích hoạt OmniPass VIP 4K! Tận hưởng toàn bộ đặc quyền không giới hạn.'
                : 'Đã cộng ${_formatVnd(_depositAmount)} vào số dư ví của bạn!',
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: Color(0xFF94A3B8),
              fontSize: 13,
              height: 1.4,
            ),
          ),
          const SizedBox(height: 24),
          const CircularProgressIndicator(color: _accent, strokeWidth: 2),
        ],
      ),
    );
  }
}

// ─── Custom QR Matrix Simulation Painter ────────────────────────
class _QrMatrixPainter extends CustomPainter {
  final Color color;
  final int seed;

  _QrMatrixPainter({required this.color, required this.seed});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..color = color;
    const cols = 21;
    final cellW = size.width / cols;
    final cellH = size.height / cols;

    // Corner Finder Patterns
    _drawFinder(canvas, paint, 0, 0, cellW, cellH);
    _drawFinder(canvas, paint, (cols - 7) * cellW, 0, cellW, cellH);
    _drawFinder(canvas, paint, 0, (cols - 7) * cellH, cellW, cellH);

    // Random pseudo matrix
    for (int r = 0; r < cols; r++) {
      for (int c = 0; c < cols; c++) {
        // Skip finder areas
        if ((r < 7 && c < 7) ||
            (r < 7 && c >= cols - 7) ||
            (r >= cols - 7 && c < 7) ||
            (r >= 8 && r <= 12 && c >= 8 && c <= 12)) {
          continue;
        }
        // Pseudo noise based on row, col, and seed
        final val = ((r * 17) ^ (c * 31) ^ (seed % 1000)) % 10;
        if (val < 5) {
          canvas.drawRect(
            Rect.fromLTWH(c * cellW + 0.5, r * cellH + 0.5, cellW - 1, cellH - 1),
            paint,
          );
        }
      }
    }
  }

  void _drawFinder(
    Canvas canvas,
    Paint paint,
    double x,
    double y,
    double w,
    double h,
  ) {
    // Outer 7x7
    canvas.drawRect(Rect.fromLTWH(x, y, w * 7, h * 7), paint);
    // Inner white 5x5
    final whitePaint = Paint()..color = Colors.white;
    canvas.drawRect(Rect.fromLTWH(x + w, y + h, w * 5, h * 5), whitePaint);
    // Center black 3x3
    canvas.drawRect(Rect.fromLTWH(x + w * 2, y + h * 2, w * 3, h * 3), paint);
  }

  @override
  bool shouldRepaint(covariant _QrMatrixPainter oldDelegate) =>
      oldDelegate.seed != seed;
}
