// OmniCast - Gemini API Key Configuration Dialog
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../core/constants/app_constants.dart';
import '../../core/di/injection.dart';

class GeminiKeyDialog extends StatefulWidget {
  const GeminiKeyDialog({super.key});

  static Future<void> show(BuildContext context) async {
    return showDialog<void>(
      context: context,
      barrierDismissible: true,
      builder: (ctx) => const GeminiKeyDialog(),
    );
  }

  @override
  State<GeminiKeyDialog> createState() => _GeminiKeyDialogState();
}

class _GeminiKeyDialogState extends State<GeminiKeyDialog> {
  final _controller = TextEditingController();
  bool _obscure = true;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadExistingKey();
  }

  Future<void> _loadExistingKey() async {
    try {
      final storage = getIt<FlutterSecureStorage>();
      final saved =
          await storage.read(key: AppConstants.geminiApiKeyStorageKey);
      final key = saved ?? AppConstants.geminiApiKey;
      if (mounted) {
        setState(() {
          _controller.text = key;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _controller.text = AppConstants.geminiApiKey;
          _isLoading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _saveKey() async {
    final key = _controller.text.trim();
    AppConstants.setGeminiApiKey(key);
    try {
      final storage = getIt<FlutterSecureStorage>();
      if (key.isEmpty) {
        await storage.delete(key: AppConstants.geminiApiKeyStorageKey);
      } else {
        await storage.write(
          key: AppConstants.geminiApiKeyStorageKey,
          value: key,
        );
      }
    } catch (_) {}

    HapticFeedback.selectionClick();
    if (!mounted) return;
    Navigator.of(context).pop();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.check_circle_rounded, color: Colors.black, size: 20),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                key.isEmpty
                    ? 'Đã xóa API Key Gemini. Sẽ dùng Engine dự phòng.'
                    : 'Đã lưu Google Gemini API Key thành công!',
                style: const TextStyle(
                  color: Colors.black,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        backgroundColor: const Color(0xFF00E5FF),
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _copyStudioUrl() {
    HapticFeedback.selectionClick();
    Clipboard.setData(
      const ClipboardData(text: 'https://aistudio.google.com/app/apikey'),
    );
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Đã sao chép link Google AI Studio vào bộ nhớ tạm: https://aistudio.google.com/app/apikey',
          style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Color(0xFF00E5FF),
        duration: Duration(seconds: 3),
      ),
    );
  }

  Future<void> _pasteFromClipboard() async {
    final data = await Clipboard.getData('text/plain');
    if (data?.text != null && data!.text!.isNotEmpty) {
      HapticFeedback.selectionClick();
      setState(() {
        _controller.text = data.text!.trim();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: const Color(0xFF0F1523),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: const BorderSide(color: Color(0x3300E5FF), width: 1),
      ),
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
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
                    color: const Color(0xFF00E5FF).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(
                    Icons.key_rounded,
                    color: Color(0xFF00E5FF),
                    size: 22,
                  ),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'GOOGLE GEMINI PRO API',
                        style: TextStyle(
                          color: Color(0xFF00E5FF),
                          fontSize: 11,
                          fontWeight: FontWeight.w800,
                          fontFamily: 'JetBrainsMono',
                          letterSpacing: 0.8,
                        ),
                      ),
                      Text(
                        'Cài Đặt API Key Trực Tiếp',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded, color: Colors.white60),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 14),
            const Text(
              'Mô hình Google Gemini 1.5 Pro và Flash cung cấp gói sử dụng MIỄN PHÍ 100% tại Google AI Studio. Bạn có thể lấy API Key cá nhân để kết nối trực tiếp với Google Cloud.',
              style: TextStyle(
                color: Color(0xFF94A3B8),
                fontSize: 12,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 12),
            GestureDetector(
              onTap: _copyStudioUrl,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFF131B2E),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0x3300E5FF)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.open_in_new_rounded,
                        size: 14, color: Color(0xFF00E5FF)),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Sao chép link: aistudio.google.com/app/apikey',
                        style: TextStyle(
                          color: Color(0xFF00E5FF),
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                    Icon(Icons.copy_rounded, size: 14, color: Color(0xFF00E5FF)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'NHẬP GEMINI API KEY:',
              style: TextStyle(
                color: Color(0xFF64748B),
                fontSize: 10,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _controller,
              obscureText: _obscure,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 13,
                fontFamily: 'JetBrainsMono',
              ),
              decoration: InputDecoration(
                hintText: 'AIzaSy...',
                hintStyle: const TextStyle(color: Color(0xFF64748B)),
                filled: true,
                fillColor: const Color(0xFF131B2E),
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0x14FFFFFF)),
                ),
                enabledBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0x14FFFFFF)),
                ),
                focusedBorder: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: const BorderSide(color: Color(0xFF00E5FF)),
                ),
                suffixIcon: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    IconButton(
                      icon: Icon(
                        _obscure
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined,
                        size: 18,
                        color: const Color(0xFF94A3B8),
                      ),
                      onPressed: () => setState(() => _obscure = !_obscure),
                    ),
                    IconButton(
                      tooltip: 'Dán từ clipboard',
                      icon: const Icon(
                        Icons.content_paste_rounded,
                        size: 18,
                        color: Color(0xFF00E5FF),
                      ),
                      onPressed: _pasteFromClipboard,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF94A3B8),
                      side: const BorderSide(color: Color(0x14FFFFFF)),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text('ĐÓNG'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isLoading ? null : _saveKey,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF00E5FF),
                      foregroundColor: Colors.black,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                    child: const Text(
                      'LƯU KEY',
                      style: TextStyle(fontWeight: FontWeight.w800),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

