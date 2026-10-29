import 'package:flutter/services.dart';
import '../../../../core/services/billing_service.dart';
// OmniCast - Profile Screen
// Cyber-Dark Executive Hub: High-tier User Profile Card, Streaming Telemetry,
// Feature Groups, Staff/Admin AI Curator shortcut, and Modern Logout.

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../widgets/brand_logo.dart';
import '../../../logic/auth/auth_bloc.dart';
import '../../navigation/app_router.dart';
import '../../widgets/payment/subscription_payment_sheet.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B12),
      appBar: AppBar(
        backgroundColor: const Color(0xFF090F1A),
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        title: const Text(
          'Tài Khoản & Hồ Sơ',
          style: TextStyle(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.w900,
            letterSpacing: -0.3,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(
              Icons.settings_outlined,
              color: Color(0xFF00E5FF),
            ),
            tooltip: 'Cài đặt',
            onPressed: () => context.push('/settings'),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, state) {
          if (state is Authenticated) {
            final user = state.user;
            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  // ── USER PROFILE HERO CARD ──────────────────────────
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: const Color(0xFF090F1A),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFF162338)),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x66000000),
                          blurRadius: 16,
                          offset: Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        // Avatar with glowing gradient ring
                        Container(
                          width: 86,
                          height: 86,
                          padding: const EdgeInsets.all(3),
                          decoration: const BoxDecoration(
                            gradient: LinearGradient(
                              colors: [Color(0xFF00E5FF), Color(0xFF8B5CF6)],
                            ),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: Color(0x4D00E5FF),
                                blurRadius: 14,
                              ),
                            ],
                          ),
                          child: Container(
                            decoration: const BoxDecoration(
                              color: Color(0xFF070B12),
                              shape: BoxShape.circle,
                            ),
                            child: Center(
                              child: Text(
                                user.fullName.isNotEmpty
                                    ? user.fullName[0].toUpperCase()
                                    : 'U',
                                style: const TextStyle(
                                  fontSize: 34,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF00E5FF),
                                ),
                              ),
                            ),
                          ),
                        ),

                        const SizedBox(height: 14),

                        Text(
                          user.fullName,
                          style: const TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            letterSpacing: -0.4,
                          ),
                        ),

                        const SizedBox(height: 4),

                        Text(
                          user.email,
                          style: const TextStyle(
                            color: Color(0xFF94A3B8),
                            fontSize: 12,
                          ),
                        ),

                        const SizedBox(height: 12),

                        // Role & Subscription Pills
                        Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: _getRoleBgColor(user.role),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: _getRoleColor(user.role),
                                ),
                              ),
                              child: Text(
                                _getRoleDisplayName(user.role).toUpperCase(),
                                style: TextStyle(
                                  color: _getRoleColor(user.role),
                                  fontSize: 10,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(0xFF070E1A),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: const Color(0xFF142236),
                                ),
                              ),
                              child: const Row(
                                children: [
                                  Icon(
                                    Icons.verified_rounded,
                                    size: 13,
                                    color: Color(0xFF00E5FF),
                                  ),
                                  SizedBox(width: 4),
                                  Text(
                                    'VIP 4K HEVC PASS',
                                    style: TextStyle(
                                      color: Color(0xFF00E5FF),
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900,
                                      fontFamily: 'monospace',
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

                  // ── STREAMING METRICS GRID ──────────────────────────
                  Row(
                    children: [
                      _buildMetricCard('25 KÊNH', 'Full Access', Icons.tv_rounded),
                      const SizedBox(width: 8),
                      _buildMetricCard(
                        'DOLBY 5.1',
                        'Spatial Audio',
                        Icons.surround_sound_rounded,
                      ),
                      const SizedBox(width: 8),
                      _buildMetricCard(
                        'CATCH-UP',
                        'Tua lại 7 ngày',
                        Icons.history_rounded,
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // ── VIP & WALLET PAYMENT CARD ───────────────────────
                  _buildVipSubscriptionCard(context),

                  const SizedBox(height: 20),

                  // ── MENU SECTIONS ───────────────────────────────────
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFF0B1320),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFF16253C)),
                    ),
                    child: Column(
                      children: [
                        // Admin Control Hub (Role 3: System Administrator)
                        if (user.isAdmin) ...[
                          _buildModernMenuItem(
                            icon: Icons.admin_panel_settings_rounded,
                            iconColor: const Color(0xFFF59E0B),
                            title: 'Admin Control Hub',
                            subtitle: 'Quản trị hệ thống, kiểm toán gRPC & tài khoản',
                            highlight: true,
                            onTap: () => context.push('/admin'),
                          ),
                          const Divider(color: Color(0xFF162338), height: 1),
                        ],

                        // Staff/Admin AI Curator Studio (Role 1 & 3)
                        if (user.isStaff || user.isAdmin) ...[
                          _buildModernMenuItem(
                            icon: Icons.auto_awesome_rounded,
                            iconColor: const Color(0xFFA855F7),
                            title: 'AI Curator Studio',
                            subtitle: 'Biên tập & thẩm định chương trình bằng AI',
                            highlight: !user.isAdmin,
                            onTap: () => context.push('/ai-curator'),
                          ),
                          const Divider(color: Color(0xFF162338), height: 1),
                        ],

                        // Staff/Admin Live Studio (Role 1 & 3) — go
                        // live / stop live / self-record / browse
                        // public catalog in one place.
                        if (user.isStaff || user.isAdmin) ...[
                          _buildModernMenuItem(
                            icon: Icons.podcasts_rounded,
                            iconColor: const Color(0xFFFF2A55),
                            title: 'Live Studio',
                            subtitle:
                                'Phát sóng trực tiếp • Tự ghi hình • Danh mục nguồn',
                            highlight: true,
                            onTap: () => context.push('/studio/live'),
                          ),
                          const Divider(color: Color(0xFF162338), height: 1),
                        ],

                        _buildModernMenuItem(
                          icon: Icons.notifications_active_outlined,
                          iconColor: const Color(0xFF00E5FF),
                          title: 'Thông báo',
                          subtitle: 'Tin nhắn, theo dõi và nhắc nhở phát sóng',
                          onTap: () => context.push('/notifications'),
                        ),
                        const Divider(color: Color(0xFF162338), height: 1),

                        _buildModernMenuItem(
                          icon: Icons.bookmark_outline_rounded,
                          iconColor: const Color(0xFFFBBF24),
                          title: 'Danh sách theo dõi',
                          subtitle: 'Các chương trình & sự kiện đã lưu',
                          onTap: () => context.go('/watchlist'),
                        ),
                        const Divider(color: Color(0xFF162338), height: 1),

                        _buildModernMenuItem(
                          icon: Icons.video_library_outlined,
                          iconColor: const Color(0xFF38BDF8),
                          title: 'Kho bản ghi VOD',
                          subtitle: 'Xem lại các chương trình độc quyền',
                          onTap: () => context.go('/recordings'),
                        ),
                        const Divider(color: Color(0xFF162338), height: 1),

                        _buildModernMenuItem(
                          icon: Icons.settings_outlined,
                          iconColor: const Color(0xFFA78BFA),
                          title: 'Cài đặt ứng dụng',
                          subtitle: 'Chất lượng truyền phát & thông báo',
                          onTap: () => context.push('/settings'),
                        ),
                        const Divider(color: Color(0xFF162338), height: 1),

                        _buildModernMenuItem(
                          icon: Icons.help_outline_rounded,
                          iconColor: const Color(0xFF34D399),
                          title: 'Trợ giúp & Hỗ trợ',
                          subtitle: 'Báo lỗi & thông tin bản quyền',
                          onTap: () {},
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 20),

                  // ── LOGOUT BUTTON ───────────────────────────────────
                  Container(
                    width: double.infinity,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1C0A0A),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFF7F1D1D)),
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        borderRadius: BorderRadius.circular(14),
                        onTap: () => _showLogoutDialog(context),
                        child: const Padding(
                          padding: EdgeInsets.symmetric(vertical: 14),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.logout_rounded,
                                color: Color(0xFFF87171),
                                size: 20,
                              ),
                              SizedBox(width: 8),
                              Text(
                                'Đăng Xuất Tài Khoản',
                                style: TextStyle(
                                  color: Color(0xFFF87171),
                                  fontSize: 13,
                                  fontWeight: FontWeight.w900,
                                  letterSpacing: 0.3,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 28),

                  // Footer Logo
                  const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      OmniCastBrandLogo(size: 20),
                      SizedBox(width: 8),
                      Text(
                        'OmniCast v1.0.0 — NextGen Broadcast',
                        style: TextStyle(
                          color: Color(0xFF475569),
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 30),
                ],
              ),
            );
          }

          return const Center(
            child: CircularProgressIndicator(color: Color(0xFF00E5FF)),
          );
        },
      ),
    );
  }

  Widget _buildMetricCard(String title, String subtitle, IconData icon) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 10),
        decoration: BoxDecoration(
          color: const Color(0xFF090F1A),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF162338)),
        ),
        child: Column(
          children: [
            Icon(icon, size: 20, color: const Color(0xFF00E5FF)),
            const SizedBox(height: 6),
            Text(
              title,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 11,
                fontWeight: FontWeight.w900,
                fontFamily: 'monospace',
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: const TextStyle(
                color: Color(0xFF64748B),
                fontSize: 9,
                fontWeight: FontWeight.w600,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildModernMenuItem({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String subtitle,
    bool highlight = false,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Row(
            children: [
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        color: highlight
                            ? const Color(0xFF00E5FF)
                            : Colors.white,
                        fontSize: 13,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: const TextStyle(
                        color: Color(0xFF64748B),
                        fontSize: 11,
                      ),
                    ),
                  ],
                ),
              ),
              const Icon(
                Icons.chevron_right_rounded,
                color: Color(0xFF475569),
                size: 20,
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showLogoutDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF090F1A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(18),
          side: const BorderSide(color: Color(0xFF162338)),
        ),
        title: const Row(
          children: [
            Icon(Icons.logout_rounded, color: Color(0xFF00E5FF), size: 20),
            SizedBox(width: 8),
            Text(
              'Tùy Chọn Đăng Xuất',
              style: TextStyle(
                color: Colors.white,
                fontSize: 16,
                fontWeight: FontWeight.w900,
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Chọn phạm vi đăng xuất tài khoản OmniCast của bạn:',
              style: TextStyle(
                color: Color(0xFF94A3B8),
                fontSize: 13,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 16),
            InkWell(
              onTap: () {
                Navigator.pop(ctx);
                context.read<AuthBloc>().add(LogoutRequested());
                AppRouter.router.go('/login');
              },
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.4),
                  ),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.devices_rounded, color: Color(0xFFF59E0B), size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Chỉ thiết bị này',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Text(
                            'Các thiết bị khác vẫn duy trì đăng nhập',
                            style: TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 10),
            InkWell(
              onTap: () {
                Navigator.pop(ctx);
                context.read<AuthBloc>().add(LogoutAllDevicesRequested());
                AppRouter.router.go('/login');
              },
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: const Color(0xFFEF4444).withValues(alpha: 0.4),
                  ),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.shield_rounded, color: Color(0xFFEF4444), size: 20),
                    SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Mọi thiết bị (Đăng xuất tất cả)',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          Text(
                            'Thu hồi toàn bộ token trên tablet, web, điện thoại khác',
                            style: TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 11,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text(
              'Hủy',
              style: TextStyle(
                color: Color(0xFF94A3B8),
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getRoleColor(String role) {
    switch (role.toUpperCase()) {
      case 'ADMIN':
      case '3':
        return const Color(0xFFF59E0B);
      case 'STAFF':
      case '1':
        return const Color(0xFFA855F7);
      case 'VIEWER':
      case '2':
        return const Color(0xFF00E5FF);
      default:
        return const Color(0xFF94A3B8);
    }
  }

  Color _getRoleBgColor(String role) {
    switch (role.toUpperCase()) {
      case 'ADMIN':
      case '3':
        return const Color(0xFF78350F).withValues(alpha: 0.35);
      case 'STAFF':
      case '1':
        return const Color(0xFF581C87).withValues(alpha: 0.35);
      case 'VIEWER':
      case '2':
        return const Color(0xFF083344).withValues(alpha: 0.35);
      default:
        return const Color(0xFF1E293B).withValues(alpha: 0.35);
    }
  }

  String _getRoleDisplayName(String role) {
    switch (role.toUpperCase()) {
      case 'ADMIN':
      case '3':
        return 'Quản Trị Viên (Role 3)';
      case 'STAFF':
      case '1':
        return 'Biên Tập Viên (Role 1)';
      case 'VIEWER':
      case '2':
        return 'Khán Giả (Role 2)';
      default:
        return 'Khách Vãng Lai (Role 0)';
    }
  }

  Widget _buildVipSubscriptionCard(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1F1604), Color(0xFF0F172A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: const Color(0xFFF59E0B).withValues(alpha: 0.5),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFFF59E0B).withValues(alpha: 0.12),
            blurRadius: 14,
            spreadRadius: 1,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B).withValues(alpha: 0.2),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.workspace_premium_rounded,
                      color: Color(0xFFF59E0B),
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Text(
                    'GÓI VIP 4K & NẠP TIỀN VÍ',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.6,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: const Text(
                  '35.000 ₫/THÁNG',
                  style: TextStyle(
                    color: Colors.black,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'JetBrainsMono',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Text(
            'Thanh toán qua VietQR (MBBank), Ví MoMo hoặc Google Play để mở khóa toàn bộ kênh bản quyền 4K HEVC & hỗ trợ các streamer trực tiếp.',
            style: TextStyle(
              color: Color(0xFF94A3B8),
              fontSize: 12,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF59E0B),
                    foregroundColor: Colors.black,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    elevation: 6,
                  ),
                  onPressed: () {
                    SubscriptionPaymentSheet.show(
                      context,
                      type: PaymentType.vipSubscription,
                    );
                  },
                  icon: const Icon(Icons.flash_on_rounded, size: 16),
                  label: const Text(
                    'NÂNG CẤP VIP',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF00E5FF),
                    side: const BorderSide(color: Color(0xFF00E5FF)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () {
                    SubscriptionPaymentSheet.show(
                      context,
                      type: PaymentType.walletDeposit,
                    );
                  },
                  icon: const Icon(Icons.account_balance_wallet_rounded, size: 16),
                  label: const Text(
                    'NẠP TIỀN VÍ',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ── REALTIME VIRTUAL WALLET SECTION WIDGET ──────────────────────
class _VirtualWalletCard extends StatefulWidget {
  final int initialBalance;
  const _VirtualWalletCard({this.initialBalance = 0});

  @override
  State<_VirtualWalletCard> createState() => _VirtualWalletCardState();
}

class _VirtualWalletCardState extends State<_VirtualWalletCard> {
  int _balance = 0;
  int _totalReceived = 0;
  int _totalSent = 0;
  bool _isLoading = false;
  bool _isTopupLoading = false;

  @override
  void initState() {
    super.initState();
    _balance = widget.initialBalance;
    _loadWallet();
  }

  Future<void> _loadWallet() async {
    setState(() => _isLoading = true);
    try {
      final data = await BillingService.instance.getUserWallet();
      if (mounted && data != null) {
        setState(() {
          if (data['walletBalance'] != null) {
            _balance = (data['walletBalance'] as num).toInt();
          }
          if (data['stats'] != null) {
            _totalReceived = (data['stats']['totalReceivedVnd'] as num?)?.toInt() ?? 0;
            _totalSent = (data['stats']['totalSentVnd'] as num?)?.toInt() ?? 0;
          }
        });
      }
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _topup(int amount) async {
    if (_isTopupLoading) return;
    setState(() => _isTopupLoading = true);
    HapticFeedback.selectionClick();
    try {
      final res = await BillingService.instance.topupSandbox(amount);
      if (mounted && res != null && res['walletBalance'] != null) {
        setState(() {
          _balance = (res['walletBalance'] as num).toInt();
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('🎉 Nạp thành công ${_formatVnd(amount)} mô phỏng vào ví của bạn!'),
            backgroundColor: const Color(0xFF00E5FF),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Nạp tiền không thành công, vui lòng thử lại.'),
            backgroundColor: Colors.redAccent,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isTopupLoading = false);
    }
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

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0B1728), Color(0xFF090F1A)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: const Color(0xFF00E5FF).withValues(alpha: 0.4),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF00E5FF).withValues(alpha: 0.1),
            blurRadius: 18,
            spreadRadius: 1,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFF00E5FF).withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      Icons.account_balance_wallet_rounded,
                      color: Color(0xFF00E5FF),
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'VÍ NHÀ SÁNG TẠO & KHÁN GIẢ',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          letterSpacing: 0.6,
                        ),
                      ),
                      Text(
                        'Hỗ trợ Super Chat & Live Stream',
                        style: TextStyle(
                          color: Color(0xFF94A3B8),
                          fontSize: 10,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              IconButton(
                icon: _isLoading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF00E5FF)),
                        ),
                      )
                    : const Icon(Icons.refresh_rounded, color: Color(0xFF00E5FF), size: 20),
                tooltip: 'Làm mới số dư',
                onPressed: _isLoading ? null : _loadWallet,
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Balance Display
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFF070B12),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: Colors.white10),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'SỐ DƯ KHẢ DỤNG (SANDBOX)',
                      style: TextStyle(
                        color: Color(0xFF94A3B8),
                        fontSize: 9,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.8,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _formatVnd(_balance),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                        fontFamily: 'JetBrainsMono',
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: const Color(0xFF10B981).withValues(alpha: 0.5)),
                  ),
                  child: const Text(
                    'HOẠT ĐỘNG',
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
          ),
          const SizedBox(height: 12),

          // Total Stats
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF070B12),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white10),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Tổng nhận Super Chat',
                        style: TextStyle(color: Color(0xFF64748B), fontSize: 9),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _formatVnd(_totalReceived),
                        style: const TextStyle(
                          color: Color(0xFFFBBF24),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFF070B12),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white10),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Tổng đã gửi tặng',
                        style: TextStyle(color: Color(0xFF64748B), fontSize: 9),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        _formatVnd(_totalSent),
                        style: const TextStyle(
                          color: Color(0xFF38BDF8),
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Quick Top-up Action Buttons
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00E5FF).withValues(alpha: 0.15),
                    foregroundColor: const Color(0xFF00E5FF),
                    side: const BorderSide(color: Color(0xFF00E5FF)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: _isTopupLoading ? null : () => _topup(100000),
                  icon: const Icon(Icons.add_circle_outline_rounded, size: 16),
                  label: const Text(
                    '+100.000 ₫',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                    foregroundColor: const Color(0xFFF59E0B),
                    side: const BorderSide(color: Color(0xFFF59E0B)),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: _isTopupLoading ? null : () => _topup(500000),
                  icon: const Icon(Icons.add_circle_outline_rounded, size: 16),
                  label: const Text(
                    '+500.000 ₫',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
