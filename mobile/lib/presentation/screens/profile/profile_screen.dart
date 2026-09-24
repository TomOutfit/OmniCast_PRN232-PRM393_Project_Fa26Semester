// OmniCast - Profile Screen

import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../../logic/auth/auth_bloc.dart';
import '../../../core/theme/app_theme.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.dark950,
      appBar: AppBar(
        title: const Text('Hồ sơ'),
        backgroundColor: AppColors.dark950,
        actions: [
          IconButton(
            icon: const Icon(Icons.settings_outlined),
            onPressed: () {},
          ),
        ],
      ),
      body: BlocBuilder<AuthBloc, AuthState>(
        builder: (context, state) {
          if (state is Authenticated) {
            final user = state.user;
            return SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  // Avatar
                  Container(
                    width: 100,
                    height: 100,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppColors.primary, AppColors.accentCyan],
                      ),
                      shape: BoxShape.circle,
                    ),
                    child: Center(
                      child: Text(
                        user.fullName.isNotEmpty
                            ? user.fullName[0].toUpperCase()
                            : 'U',
                        style: const TextStyle(
                          fontSize: 40,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    user.fullName,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user.email,
                    style: const TextStyle(
                      color: AppColors.dark400,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: _getRoleColor(user.role).withOpacity(0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      _getRoleDisplayName(user.role),
                      style: TextStyle(
                        color: _getRoleColor(user.role),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),

                  // Menu Items
                  _MenuItem(
                    icon: Icons.person_outline,
                    label: 'Chỉnh sửa hồ sơ',
                    onTap: () {},
                  ),
                  _MenuItem(
                    icon: Icons.history,
                    label: 'Lịch sử xem',
                    onTap: () {},
                  ),
                  _MenuItem(
                    icon: Icons.bookmark_outline,
                    label: 'Danh sách yêu thích',
                    onTap: () => context.go('/watchlist'),
                  ),
                  _MenuItem(
                    icon: Icons.notifications_outlined,
                    label: 'Thông báo',
                    onTap: () {},
                  ),
                  // Staff/Admin only - AI Curator
                  if (user.isStaff || user.isAdmin)
                    _MenuItem(
                      icon: Icons.auto_awesome,
                      label: 'AI Curator',
                      onTap: () => context.push('/ai-curator'),
                      highlight: true,
                    ),
                  _MenuItem(
                    icon: Icons.lock_outline,
                    label: 'Đổi mật khẩu',
                    onTap: () {},
                  ),
                  _MenuItem(
                    icon: Icons.help_outline,
                    label: 'Trợ giúp & Hỗ trợ',
                    onTap: () {},
                  ),

                  const SizedBox(height: 24),

                  // Logout Button
                  SizedBox(
                    width: double.infinity,
                    child: OutlinedButton.icon(
                      onPressed: () {
                        showDialog(
                          context: context,
                          builder: (context) => AlertDialog(
                            backgroundColor: AppColors.dark800,
                            title: const Text('Đăng xuất'),
                            content: const Text(
                              'Bạn có chắc chắn muốn đăng xuất?',
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.pop(context),
                                child: const Text('Hủy'),
                              ),
                              ElevatedButton(
                                onPressed: () {
                                  Navigator.pop(context);
                                  context.read<AuthBloc>().add(LogoutRequested());
                                  context.go('/login');
                                },
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.error,
                                ),
                                child: const Text('Đăng xuất'),
                              ),
                            ],
                          ),
                        );
                      },
                      icon: const Icon(Icons.logout, color: AppColors.error),
                      label: const Text(
                        'Đăng xuất',
                        style: TextStyle(color: AppColors.error),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: AppColors.error),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                    ),
                  ),

                  const SizedBox(height: 32),

                  // Version
                  const Text(
                    'OmniCast v1.0.0',
                    style: TextStyle(
                      color: AppColors.dark600,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            );
          }

          return const Center(child: CircularProgressIndicator());
        },
      ),
    );
  }

  Color _getRoleColor(String role) {
    switch (role) {
      case 'ADMIN':
        return AppColors.error;
      case 'STAFF':
        return AppColors.accentGold;
      default:
        return AppColors.primary;
    }
  }

  String _getRoleDisplayName(String role) {
    switch (role) {
      case 'ADMIN':
        return 'Quản trị viên';
      case 'STAFF':
        return 'Biên tập viên';
      case 'VIEWER':
        return 'Khán giả';
      default:
        return role;
    }
  }
}

class _MenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool highlight;

  const _MenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.highlight = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: highlight ? AppColors.primary.withOpacity(0.1) : AppColors.dark800,
        borderRadius: BorderRadius.circular(12),
        border: highlight
            ? Border.all(color: AppColors.primary.withOpacity(0.3))
            : null,
      ),
      child: ListTile(
        leading: Icon(
          icon,
          color: highlight ? AppColors.primary : AppColors.dark300,
        ),
        title: Text(
          label,
          style: TextStyle(
            color: highlight ? AppColors.primary : Colors.white,
            fontWeight: highlight ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
        trailing: Icon(
          Icons.chevron_right,
          color: highlight ? AppColors.primary : AppColors.dark500,
        ),
        onTap: onTap,
      ),
    );
  }
}
