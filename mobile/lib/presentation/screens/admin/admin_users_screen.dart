// OmniCast - Admin Users Management Screen (Role = 3: System Administrator)
// Allows System Admin to search users, manage roles (Staff <-> Viewer), and toggle account active status.

import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/injection.dart';
import '../../../data/models/admin_model.dart';
import '../../../data/repositories/admin_repository.dart';

class AdminUsersScreen extends StatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  State<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends State<AdminUsersScreen> {
  final AdminRepository _adminRepo = getIt<AdminRepository>();
  final TextEditingController _searchController = TextEditingController();

  List<AdminUserModel> _users = [];
  bool _isLoading = true;
  String _selectedRole = 'ALL';
  String _searchQuery = '';
  Timer? _debounceTimer;

  final List<Map<String, String>> _roleFilters = [
    {'value': 'ALL', 'label': 'Tất cả'},
    {'value': 'VIEWER', 'label': 'Khán giả (2)'},
    {'value': 'STAFF', 'label': 'Biên tập (1)'},
    {'value': 'ADMIN', 'label': 'Quản trị (3)'},
  ];

  @override
  void initState() {
    super.initState();
    _fetchUsers();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  Future<void> _fetchUsers() async {
    setState(() => _isLoading = true);
    try {
      final list = await _adminRepo.getUsers(
        page: 1,
        limit: 100,
        role: _selectedRole,
        search: _searchQuery,
      );
      if (mounted) {
        setState(() {
          _users = list;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi tải danh sách người dùng: $e'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  void _onSearchChanged(String val) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 350), () {
      setState(() => _searchQuery = val.trim());
      _fetchUsers();
    });
  }

  Future<void> _toggleUserActive(AdminUserModel user) async {
    final willActivate = !user.isActive;
    final actionText = willActivate ? 'Kích hoạt' : 'Khóa';

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: const BorderSide(color: Color(0xFF1E2D44)),
        ),
        title: Row(
          children: [
            Icon(
              willActivate ? Icons.check_circle_rounded : Icons.block_rounded,
              color: willActivate ? const Color(0xFF10B981) : const Color(0xFFEF4444),
              size: 22,
            ),
            const SizedBox(width: 8),
            Text(
              '$actionText tài khoản',
              style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        content: Text(
          willActivate
              ? 'Bạn có chắc chắn muốn mở khóa tài khoản cho ${user.fullName} (${user.email})?'
              : 'Tài khoản của ${user.fullName} (${user.email}) sẽ không thể đăng nhập vào hệ thống OmniCast sau khi bị khóa.',
          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 13),
        ),
        actions: [
          TextButton(
            onPressed: () => ctx.pop(false),
            child: const Text('Hủy', style: TextStyle(color: Color(0xFF64748B))),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: willActivate ? const Color(0xFF10B981) : const Color(0xFFEF4444),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () => ctx.pop(true),
            child: Text(actionText),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    try {
      await _adminRepo.toggleUserStatus(user.id, willActivate);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Đã $actionText tài khoản thành công!'),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
        _fetchUsers();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi thực hiện: $e'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  void _showChangeRoleSheet(AdminUserModel user) {
    if (user.isAdmin) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Chính sách an toàn: Không thể thay đổi vai trò của Quản Trị Viên (Admin)'),
          backgroundColor: Color(0xFFF59E0B),
        ),
      );
      return;
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        side: BorderSide(color: Color(0xFF1E2D44)),
      ),
      builder: (ctx) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFF00F2FE).withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(Icons.manage_accounts_rounded, color: Color(0xFF00F2FE), size: 20),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Cấp Quyền / Đổi Vai Trò RBAC',
                            style: TextStyle(color: Colors.white, fontSize: 15, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            user.fullName,
                            style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Text(
                  'Chọn vai trò mục tiêu:',
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 10),
                _buildRoleOption(
                  ctx,
                  title: 'Staff — Biên Tập Viên Phát Sóng (Role = 1)',
                  desc: 'Quyền CRUD Kênh, lập lịch EPG, kích hoạt AI Curator thẩm định',
                  roleValue: 'STAFF',
                  currentRole: user.role,
                  user: user,
                  color: const Color(0xFF10B981),
                ),
                const SizedBox(height: 8),
                _buildRoleOption(
                  ctx,
                  title: 'Viewer — Khán Giả Tiêu Chuẩn (Role = 2)',
                  desc: 'Quyền xem EPG LIVE, tương tác bình luận, lưu Watchlist cá nhân',
                  roleValue: 'VIEWER',
                  currentRole: user.role,
                  user: user,
                  color: const Color(0xFF38BDF8),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildRoleOption(
    BuildContext ctx, {
    required String title,
    required String desc,
    required String roleValue,
    required String currentRole,
    required AdminUserModel user,
    required Color color,
  }) {
    final isSelected = currentRole == roleValue;
    return InkWell(
      borderRadius: BorderRadius.circular(12),
      onTap: isSelected
          ? null
          : () async {
              ctx.pop();
              try {
                await _adminRepo.updateUserRole(user.id, roleValue);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Đã cập nhật vai trò sang $roleValue thành công!'),
                      backgroundColor: const Color(0xFF10B981),
                    ),
                  );
                  _fetchUsers();
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Lỗi cập nhật vai trò: $e'),
                      backgroundColor: const Color(0xFFEF4444),
                    ),
                  );
                }
              }
            },
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: isSelected ? color.withValues(alpha: 0.1) : const Color(0xFF090E17),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? color : const Color(0xFF1E2D44),
            width: isSelected ? 1.5 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(
              isSelected ? Icons.radio_button_checked_rounded : Icons.radio_button_off_rounded,
              color: isSelected ? color : const Color(0xFF64748B),
              size: 18,
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      color: isSelected ? Colors.white : const Color(0xFFCBD5E1),
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    desc,
                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 10),
                  ),
                ],
              ),
            ),
            if (isSelected)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'HIỆN TẠI',
                  style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.bold),
                ),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF070B12),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0C1421),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
          onPressed: () => context.pop(),
        ),
        title: const Row(
          children: [
            Icon(Icons.manage_accounts_rounded, color: Color(0xFF00F2FE), size: 20),
            SizedBox(width: 8),
            Text(
              'Quản Lý Tài Khoản',
              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF00F2FE)),
            onPressed: _fetchUsers,
          ),
        ],
      ),
      body: Column(
        children: [
          // ── SEARCH BAR ──────────────────────────────────────────
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            color: const Color(0xFF0C1421),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              style: const TextStyle(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(
                hintText: 'Tìm theo họ tên hoặc email...',
                hintStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 12),
                prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF00F2FE), size: 18),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.close_rounded, color: Color(0xFF64748B), size: 16),
                        onPressed: () {
                          _searchController.clear();
                          _onSearchChanged('');
                        },
                      )
                    : null,
                filled: true,
                fillColor: const Color(0xFF090E17),
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF1E2D44)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF1E2D44)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(12),
                  borderSide: const BorderSide(color: Color(0xFF00F2FE)),
                ),
              ),
            ),
          ),

          // ── ROLE FILTER CHIPS ───────────────────────────────────
          Container(
            height: 44,
            color: const Color(0xFF0C1421),
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _roleFilters.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final f = _roleFilters[index];
                final isSelected = _selectedRole == f['value'];
                return ChoiceChip(
                  label: Text(
                    f['label']!,
                    style: TextStyle(
                      color: isSelected ? const Color(0xFF070B12) : const Color(0xFF94A3B8),
                      fontSize: 11,
                      fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                    ),
                  ),
                  selected: isSelected,
                  selectedColor: const Color(0xFF00F2FE),
                  backgroundColor: const Color(0xFF090E17),
                  side: BorderSide(
                    color: isSelected ? const Color(0xFF00F2FE) : const Color(0xFF1E2D44),
                  ),
                  onSelected: (val) {
                    if (val) {
                      setState(() => _selectedRole = f['value']!);
                      _fetchUsers();
                    }
                  },
                );
              },
            ),
          ),

          // ── RESULTS COUNT HEADER ────────────────────────────────
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: const Color(0xFF070B12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${_users.length} NGƯỜI DÙNG PHÙ HỢP',
                  style: const TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.1,
                    fontFamily: 'monospace',
                  ),
                ),
                const Text(
                  'ROLE 3 CONTROL',
                  style: TextStyle(
                    color: Color(0xFFFBBF24),
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ),
          ),

          // ── USERS LIST ──────────────────────────────────────────
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF00F2FE)))
                : _users.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.person_off_rounded, size: 48, color: Colors.white.withValues(alpha: 0.2)),
                            const SizedBox(height: 10),
                            const Text(
                              'Không tìm thấy người dùng phù hợp',
                              style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        color: const Color(0xFF00F2FE),
                        onRefresh: _fetchUsers,
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _users.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final user = _users[index];
                            return _buildUserCard(user);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildUserCard(AdminUserModel user) {
    final roleColor = user.isAdmin
        ? const Color(0xFFFBBF24)
        : user.isStaff
            ? const Color(0xFF10B981)
            : const Color(0xFF38BDF8);

    final roleLabel = user.isAdmin
        ? 'ADMIN (3)'
        : user.isStaff
            ? 'STAFF (1)'
            : 'VIEWER (2)';

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF0C1421),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: user.isActive ? const Color(0xFF1E2D44) : const Color(0xFFEF4444).withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Avatar initials
              CircleAvatar(
                radius: 20,
                backgroundColor: roleColor.withValues(alpha: 0.15),
                child: Text(
                  user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : 'U',
                  style: TextStyle(color: roleColor, fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            user.fullName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        // Role badge
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                          decoration: BoxDecoration(
                            color: roleColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(4),
                            border: Border.all(color: roleColor.withValues(alpha: 0.5)),
                          ),
                          child: Text(
                            roleLabel,
                            style: TextStyle(
                              color: roleColor,
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
                      user.email,
                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              // Status Badge
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: user.isActive
                      ? const Color(0xFF10B981).withValues(alpha: 0.1)
                      : const Color(0xFFEF4444).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: user.isActive
                        ? const Color(0xFF10B981).withValues(alpha: 0.4)
                        : const Color(0xFFEF4444).withValues(alpha: 0.4),
                  ),
                ),
                child: Text(
                  user.isActive ? 'Hoạt động' : 'Đã khóa',
                  style: TextStyle(
                    color: user.isActive ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: Color(0xFF1E2D44)),
          const SizedBox(height: 10),
          // Action Buttons
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              if (!user.isAdmin) ...[
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF00F2FE),
                    side: const BorderSide(color: Color(0xFF00F2FE), width: 0.8),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: const Icon(Icons.swap_horiz_rounded, size: 14),
                  label: const Text('Đổi vai trò', style: TextStyle(fontSize: 11)),
                  onPressed: () => _showChangeRoleSheet(user),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: user.isActive ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                    side: BorderSide(
                      color: user.isActive ? const Color(0xFFEF4444) : const Color(0xFF10B981),
                      width: 0.8,
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  icon: Icon(user.isActive ? Icons.lock_outline_rounded : Icons.lock_open_rounded, size: 14),
                  label: Text(user.isActive ? 'Khóa' : 'Mở khóa', style: const TextStyle(fontSize: 11)),
                  onPressed: () => _toggleUserActive(user),
                ),
              ] else
                const Text(
                  'Quản trị viên tối cao (Không thể khóa)',
                  style: TextStyle(color: Color(0xFF64748B), fontSize: 10, fontStyle: FontStyle.italic),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
