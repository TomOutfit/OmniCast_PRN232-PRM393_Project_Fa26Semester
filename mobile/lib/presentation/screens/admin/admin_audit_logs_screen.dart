// OmniCast - Admin Audit Logs Screen (Role = 3: System Administrator)
// Compliance and security inspection interface for gRPC Audit Logs.

import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/di/injection.dart';
import '../../../data/models/admin_model.dart';
import '../../../data/repositories/admin_repository.dart';

class AdminAuditLogsScreen extends StatefulWidget {
  const AdminAuditLogsScreen({super.key});

  @override
  State<AdminAuditLogsScreen> createState() => _AdminAuditLogsScreenState();
}

class _AdminAuditLogsScreenState extends State<AdminAuditLogsScreen> {
  final AdminRepository _adminRepo = getIt<AdminRepository>();

  List<AdminAuditLogModel> _logs = [];
  bool _isLoading = true;
  String _selectedAction = 'ALL';

  final List<Map<String, String>> _actionFilters = [
    {'value': 'ALL', 'label': 'Tất cả'},
    {'value': 'USER_LOGIN', 'label': 'Đăng nhập'},
    {'value': 'CHANNEL_UPDATE', 'label': 'Kênh'},
    {'value': 'UPDATE_LIVE_EVENT', 'label': 'Lịch chiếu'},
    {'value': 'AI_CURATION', 'label': 'AI Curate'},
    {'value': 'PERMISSION_CHANGE', 'label': 'Phân quyền'},
  ];

  @override
  void initState() {
    super.initState();
    _fetchLogs();
  }

  Future<void> _fetchLogs() async {
    setState(() => _isLoading = true);
    try {
      final list = await _adminRepo.getAuditLogs(
        page: 1,
        limit: 100,
        action: _selectedAction,
      );
      if (mounted) {
        setState(() {
          _logs = list;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi tải nhật ký kiểm toán: $e'),
            backgroundColor: const Color(0xFFEF4444),
          ),
        );
      }
    }
  }

  void _showLogDetail(AdminAuditLogModel log) {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        side: BorderSide(color: Color(0xFF1E2D44)),
      ),
      builder: (ctx) {
        return DraggableScrollableSheet(
          initialChildSize: 0.65,
          minChildSize: 0.4,
          maxChildSize: 0.9,
          expand: false,
          builder: (_, scrollController) {
            return SafeArea(
              child: SingleChildScrollView(
                controller: scrollController,
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 40,
                        height: 4,
                        decoration: BoxDecoration(
                          color: const Color(0xFF334155),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        const Icon(Icons.shield_outlined, color: Color(0xFF00F2FE), size: 20),
                        const SizedBox(width: 8),
                        Text(
                          log.action,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            fontFamily: 'monospace',
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _buildDetailRow('Thời gian', log.createdAt?.toLocal().toString() ?? 'N/A'),
                    _buildDetailRow('Người thực hiện', log.userEmail ?? log.userId ?? 'SYSTEM'),
                    _buildDetailRow('Thực thể mục tiêu', '${log.entityType ?? 'N/A'} (ID: ${log.entityId ?? 'N/A'})'),
                    _buildDetailRow('Địa chỉ IP', log.ipAddress ?? '127.0.0.1 (Local)'),
                    const SizedBox(height: 16),
                    if (log.newValues != null) ...[
                      const Text(
                        'DỮ LIỆU MỚI (NEW VALUES JSON)',
                        style: TextStyle(
                          color: Color(0xFF10B981),
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.1,
                          fontFamily: 'monospace',
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF060B12),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFF1E2D44)),
                        ),
                        child: Text(
                          const JsonEncoder.withIndent('  ').convert(log.newValues),
                          style: const TextStyle(
                            color: Color(0xFFCBD5E1),
                            fontFamily: 'monospace',
                            fontSize: 11,
                          ),
                        ),
                      ),
                      const SizedBox(height: 14),
                    ],
                    if (log.oldValues != null) ...[
                      const Text(
                        'DỮ LIỆU CŨ (OLD VALUES JSON)',
                        style: TextStyle(
                          color: Color(0xFFF59E0B),
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 1.1,
                          fontFamily: 'monospace',
                        ),
                      ),
                      const SizedBox(height: 8),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFF060B12),
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: const Color(0xFF1E2D44)),
                        ),
                        child: Text(
                          const JsonEncoder.withIndent('  ').convert(log.oldValues),
                          style: const TextStyle(
                            color: Color(0xFF94A3B8),
                            fontFamily: 'monospace',
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 130,
            child: Text(
              label,
              style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(color: Colors.white, fontSize: 12),
            ),
          ),
        ],
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
            Icon(Icons.receipt_long_rounded, color: Color(0xFF00F2FE), size: 20),
            SizedBox(width: 8),
            Text(
              'Nhật Ký Kiểm Toán (Audit)',
              style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w800),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: Color(0xFF00F2FE)),
            onPressed: _fetchLogs,
          ),
        ],
      ),
      body: Column(
        children: [
          // ── FILTER CHIPS ────────────────────────────────────────
          Container(
            height: 48,
            color: const Color(0xFF0C1421),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _actionFilters.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (context, index) {
                final f = _actionFilters[index];
                final isSelected = _selectedAction == f['value'];
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
                      setState(() => _selectedAction = f['value']!);
                      _fetchLogs();
                    }
                  },
                );
              },
            ),
          ),

          // ── SUB-HEADER ──────────────────────────────────────────
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            color: const Color(0xFF070B12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  '${_logs.length} BẢN GHI KIỂM TOÁN',
                  style: const TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 1.1,
                    fontFamily: 'monospace',
                  ),
                ),
                const Text(
                  'gRPC MICROSERVICE FEED',
                  style: TextStyle(
                    color: Color(0xFF10B981),
                    fontSize: 9,
                    fontWeight: FontWeight.w900,
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ),
          ),

          // ── LOGS LIST ───────────────────────────────────────────
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF00F2FE)))
                : _logs.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.inventory_2_outlined, size: 48, color: Colors.white.withValues(alpha: 0.2)),
                            const SizedBox(height: 10),
                            const Text(
                              'Không có nhật ký kiểm toán phù hợp',
                              style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        color: const Color(0xFF00F2FE),
                        onRefresh: _fetchLogs,
                        child: ListView.separated(
                          padding: const EdgeInsets.all(16),
                          itemCount: _logs.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (context, index) {
                            final log = _logs[index];
                            return _buildAuditLogCard(log);
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildAuditLogCard(AdminAuditLogModel log) {
    Color badgeColor = const Color(0xFF38BDF8);
    if (log.action.contains('CREATE') || log.action.contains('LOGIN')) {
      badgeColor = const Color(0xFF10B981);
    } else if (log.action.contains('DELETE') || log.action.contains('DEACTIVATE')) {
      badgeColor = const Color(0xFFEF4444);
    } else if (log.action.contains('AI_')) {
      badgeColor = const Color(0xFFA855F7);
    } else if (log.action.contains('PERMISSION')) {
      badgeColor = const Color(0xFFF59E0B);
    }

    return InkWell(
      borderRadius: BorderRadius.circular(14),
      onTap: () => _showLogDetail(log),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF0C1421),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF1E2D44)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                // Action Badge
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: badgeColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: badgeColor.withValues(alpha: 0.4)),
                  ),
                  child: Text(
                    log.action,
                    style: TextStyle(
                      color: badgeColor,
                      fontSize: 10,
                      fontWeight: FontWeight.w900,
                      fontFamily: 'monospace',
                    ),
                  ),
                ),
                Text(
                  _formatDate(log.createdAt),
                  style: const TextStyle(
                    color: Color(0xFF64748B),
                    fontSize: 10,
                    fontFamily: 'monospace',
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.person_outline_rounded, color: Color(0xFF94A3B8), size: 14),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    log.userEmail ?? log.userId ?? 'Hệ thống tự động',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            if (log.entityType != null) ...[
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.category_outlined, color: Color(0xFF64748B), size: 14),
                  const SizedBox(width: 4),
                  Text(
                    '${log.entityType}: ${log.entityId ?? 'N/A'}',
                    style: const TextStyle(
                      color: Color(0xFF94A3B8),
                      fontSize: 11,
                      fontFamily: 'monospace',
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime? dt) {
    if (dt == null) return '';
    final local = dt.toLocal();
    final h = local.hour.toString().padLeft(2, '0');
    final m = local.minute.toString().padLeft(2, '0');
    final d = local.day.toString().padLeft(2, '0');
    final mo = local.month.toString().padLeft(2, '0');
    return '$h:$m $d/$mo';
  }
}
