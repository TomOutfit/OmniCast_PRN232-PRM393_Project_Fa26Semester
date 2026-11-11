// OmniCast - AI Curator Chatbot Sheet
// ============================================================
// Interactive broadcast assistant powered by free AI models
// (Llama 3.3, Mistral, Qwen) for real-time script brainstorming,
// optimal scheduling advice, and broadcast compliance guidance.
// ============================================================

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:go_router/go_router.dart';

import '../../../core/constants/app_constants.dart';
import '../../../core/di/injection.dart';
import '../../widgets/gemini_key_dialog.dart';
import '../../widgets/studio_bot_avatar.dart';
import '../../../data/services/free_ai_service.dart';

class AICuratorChatbotSheet extends StatefulWidget {
  final String? currentTitle;
  final String? currentDescription;
  final String? currentChannel;
  final void Function(String title, String description)? onApplyToCurator;

  const AICuratorChatbotSheet({
    super.key,
    this.currentTitle,
    this.currentDescription,
    this.currentChannel,
    this.onApplyToCurator,
  });

  static Future<void> show(
    BuildContext context, {
    String? currentTitle,
    String? currentDescription,
    String? currentChannel,
    void Function(String title, String description)? onApplyToCurator,
  }) {
    HapticFeedback.selectionClick();
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => AICuratorChatbotSheet(
        currentTitle: currentTitle,
        currentDescription: currentDescription,
        currentChannel: currentChannel,
        onApplyToCurator: onApplyToCurator,
      ),
    );
  }

  @override
  State<AICuratorChatbotSheet> createState() => _AICuratorChatbotSheetState();
}

class _AICuratorChatbotSheetState extends State<AICuratorChatbotSheet> {
  final _aiService = FreeAiService();
  final _textCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  FreeAiModel _selectedModel = FreeAiModel.geminiPro;

  bool _isTyping = false;
  final List<CuratorChatMessage> _messages = [];

  @override
  void initState() {
    super.initState();
    _loadGeminiKey();
    // Welcome message from OmniBot Studio Assistant
    _messages.add(
      CuratorChatMessage(
        id: 'welcome',
        text:
            'Hé lô bạn! Mình là **OmniBot** 🤖 - bé robot phòng thu của OmniCast đây!\n\nHôm nay bạn muốn tụi mình cùng lên sóng, tìm ý tưởng kịch bản hay chỉ đơn giản là muốn tìm kênh xem giải trí nè? Cứ trò chuyện tự nhiên với mình như một người bạn thân nha, đừng ngại!',
        isUser: false,
        timestamp: DateTime.now(),
      ),
    );
  }

  Future<void> _loadGeminiKey() async {
    try {
      final storage = getIt<FlutterSecureStorage>();
      final saved =
          await storage.read(key: AppConstants.geminiApiKeyStorageKey);
      if (saved != null && saved.isNotEmpty) {
        AppConstants.setGeminiApiKey(saved);
        if (mounted) setState(() {});
      }
    } catch (_) {}
  }

  @override
  void dispose() {
    _textCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent + 80,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage([String? quickText]) async {
    final query = (quickText ?? _textCtrl.text).trim();
    if (query.isEmpty || _isTyping) return;

    HapticFeedback.selectionClick();
    if (quickText == null) _textCtrl.clear();

    final userMsg = CuratorChatMessage(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      text: query,
      isUser: true,
      timestamp: DateTime.now(),
    );

    final historyBefore = List<CuratorChatMessage>.from(_messages);

    setState(() {
      _messages.add(userMsg);
      _isTyping = true;
    });
    _scrollToBottom();

    final reply = await _aiService.chatWithAssistant(
      history: historyBefore,
      userQuery: query,
      currentProgramTitle: widget.currentTitle,
      model: _selectedModel,
    );

    if (!mounted) return;

    final botMsg = CuratorChatMessage(
      id: (DateTime.now().millisecondsSinceEpoch + 1).toString(),
      text: reply,
      isUser: false,
      timestamp: DateTime.now(),
    );

    setState(() {
      _messages.add(botMsg);
      _isTyping = false;
    });
    _scrollToBottom();
  }

  void _applyMessageToCurator(String messageText) {
    HapticFeedback.heavyImpact();
    // Extract title and description intelligently
    var title = widget.currentTitle ?? '';
    var desc = messageText;

    final lines = messageText.split('\n');
    for (final line in lines) {
      if (line.toLowerCase().contains('tiêu đề') || line.startsWith('• **')) {
        final clean = line.replaceAll(RegExp(r'[*•#]'), '').replaceAll('Tiêu đề:', '').trim();
        if (clean.length > 5 && clean.length < 120) {
          title = clean;
          break;
        }
      }
    }

    if (widget.onApplyToCurator != null) {
      widget.onApplyToCurator!(title, desc);
      Navigator.pop(context);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Row(
            children: [
              Icon(Icons.check_circle_rounded, color: Colors.black, size: 20),
              SizedBox(width: 8),
              Expanded(
                child: Text(
                  'Đã nạp gợi ý từ AI Chatbot vào kịch bản AI Curator thành công!',
                  style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          backgroundColor: Color(0xFF00E5FF),
          duration: Duration(seconds: 3),
        ),
      );
    } else {
      Navigator.pop(context);
      try {
        context.push('/ai-curator');
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Row(
              children: [
                Icon(Icons.auto_awesome, color: Colors.black, size: 20),
                SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Đang chuyển sang AI Curator Studio để thẩm định kịch bản!',
                    style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
            backgroundColor: Color(0xFF00E5FF),
            duration: Duration(seconds: 3),
          ),
        );
      } catch (_) {}
    }
  }

  @override
  Widget build(BuildContext context) {
    final bottomInset = MediaQuery.of(context).viewInsets.bottom;
    final height = MediaQuery.of(context).size.height * 0.88;

    return Container(
      height: height,
      margin: EdgeInsets.only(bottom: bottomInset),
      decoration: const BoxDecoration(
        color: Color(0xFF080B11),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
        border: Border(
          top: BorderSide(color: Color(0xFF00E5FF), width: 1.2),
          left: BorderSide(color: Color(0x14FFFFFF)),
          right: BorderSide(color: Color(0x14FFFFFF)),
        ),
      ),
      child: Column(
        children: [
          // Drag handle
          const SizedBox(height: 10),
          Container(
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: const Color(0x33FFFFFF),
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          const SizedBox(height: 8),

          // Header
          _buildHeader(),
          const Divider(height: 1, thickness: 1, color: Color(0x14FFFFFF)),

          // Model Selector Bar
          _buildModelBar(),

          // Messages list
          Expanded(
            child: ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              itemCount: _messages.length,
              itemBuilder: (context, index) {
                final msg = _messages[index];
                return _buildMessageBubble(msg);
              },
            ),
          ),

          // Typing Indicator
          if (_isTyping)
            const Padding(
              padding: EdgeInsets.only(left: 16, bottom: 8),
              child: Row(
                children: [
                  SizedBox(
                    width: 14,
                    height: 14,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Color(0xFF00E5FF),
                    ),
                  ),
                  SizedBox(width: 8),
                  Text(
                    'AI Curator đang suy luận...',
                    style: TextStyle(color: Color(0xFF00E5FF), fontSize: 11),
                  ),
                ],
              ),
            ),

          // Quick Prompt Suggestions
          _buildQuickPrompts(),

          // Input Bar
          _buildInputBar(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          const StudioBotAvatar(size: 38, showOnlineDot: true),
          const SizedBox(width: 12),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      'OmniBot Studio',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.2,
                      ),
                    ),
                    SizedBox(width: 6),
                    Text(
                      '✨ Bạn đồng hành',
                      style: TextStyle(
                        color: Color(0xFF00E5FF),
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ],
                ),
                SizedBox(height: 2),
                Text(
                  'Đang trực tuyến • Sẵn sàng hỗ trợ bạn nè!',
                  style: TextStyle(
                    color: Color(0xFF94A3B8),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            tooltip: 'Cấu hình Gemini API Key',
            icon: Icon(
              Icons.key_rounded,
              color: AppConstants.geminiApiKey.isNotEmpty
                  ? const Color(0xFF10B981)
                  : const Color(0xFF00E5FF),
              size: 20,
            ),
            onPressed: () async {
              await GeminiKeyDialog.show(context);
              if (mounted) setState(() {});
            },
          ),
          IconButton(
            icon: const Icon(Icons.close_rounded, color: Colors.white70),
            onPressed: () => Navigator.pop(context),
          ),
        ],
      ),
    );
  }

  Widget _buildModelBar() {
    return Container(
      color: const Color(0xFF0F1523),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          const Icon(Icons.tune_rounded, size: 14, color: Color(0xFF00E5FF)),
          const SizedBox(width: 6),
          const Text(
            'MODEL AI:',
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.w800,
              color: Color(0xFF00E5FF),
              letterSpacing: 0.6,
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: FreeAiModel.values.map((m) {
                  final isSelected = m == _selectedModel;
                  return Padding(
                    padding: const EdgeInsets.only(right: 6),
                    child: ChoiceChip(
                      label: Text(
                        m.label,
                        style: TextStyle(
                          color: isSelected ? Colors.black : Colors.white70,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      selected: isSelected,
                      selectedColor: const Color(0xFF00E5FF),
                      backgroundColor: const Color(0xFF131B2E),
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: BorderSide(
                          color: isSelected ? const Color(0xFF00E5FF) : const Color(0x14FFFFFF),
                        ),
                      ),
                      onSelected: (val) {
                        if (val) {
                          HapticFeedback.selectionClick();
                          setState(() => _selectedModel = m);
                        }
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMessageBubble(CuratorChatMessage msg) {
    if (msg.isUser) {
      return Align(
        alignment: Alignment.centerRight,
        child: Container(
          margin: const EdgeInsets.only(bottom: 10, left: 40),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: const Color(0xFF0F2C38),
            borderRadius: const BorderRadius.only(
              topLeft: Radius.circular(16),
              topRight: Radius.circular(4),
              bottomLeft: Radius.circular(16),
              bottomRight: Radius.circular(16),
            ),
            border: Border.all(color: const Color(0x3300E5FF)),
          ),
          child: Text(
            msg.text,
            style: const TextStyle(color: Colors.white, fontSize: 13),
          ),
        ),
      );
    }

    // Bot Message
    return Align(
      alignment: Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.only(bottom: 12, right: 30),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF0F1523),
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(4),
            topRight: Radius.circular(16),
            bottomLeft: Radius.circular(16),
            bottomRight: Radius.circular(16),
          ),
          border: Border.all(color: const Color(0x14FFFFFF)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const StudioBotAvatar(size: 20),
                    const SizedBox(width: 6),
                    const Text(
                      'OmniBot',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF00E5FF),
                        letterSpacing: 0.3,
                      ),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: const Color(0xFF00E5FF).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'Studio Buddy 🤖',
                        style: TextStyle(
                          color: Color(0xFF00E5FF),
                          fontSize: 8.5,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ),
                  ],
                ),
                Text(
                  _selectedModel.label.split(' ')[0],
                  style: const TextStyle(color: Color(0xFF64748B), fontSize: 9),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              msg.text,
              style: const TextStyle(
                color: Color(0xFFF1F5F9),
                fontSize: 13,
                height: 1.45,
              ),
            ),
            if (msg.id != 'welcome') ...[
              const SizedBox(height: 10),
              Align(
                alignment: Alignment.centerRight,
                child: TextButton.icon(
                  onPressed: () => _applyMessageToCurator(msg.text),
                  icon: const Icon(Icons.input_rounded, size: 14, color: Color(0xFF00E5FF)),
                  label: const Text(
                    'NẠP VÀO KỊCH BẢN',
                    style: TextStyle(
                      color: Color(0xFF00E5FF),
                      fontSize: 11,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                    ),
                  ),
                  style: TextButton.styleFrom(
                    backgroundColor: const Color(0xFF00E5FF).withValues(alpha: 0.12),
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                      side: const BorderSide(color: Color(0x3300E5FF)),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildQuickPrompts() {
    final prompts = [
      '🎬 Gợi ý 3 câu mở đầu (Hook 30s) giữ chân người xem',
      '⏰ Khung giờ vàng phát sóng (Prime-Time EPG) tối nay',
      '⚡ Mẹo giữ chân người xem & tăng tương tác phòng Live',
      '🛡️ Kiểm duyệt từ ngữ & an toàn bản quyền phát sóng',
      '💎 Gợi ý kích thích tặng quà Super Chat & VietQR PayOS',
      '📺 Khám phá các kênh truyền hình nổi bật trên OmniCast',
    ];

    return Container(
      height: 38,
      margin: const EdgeInsets.only(bottom: 8),
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        itemCount: prompts.length,
        itemBuilder: (context, index) {
          final p = prompts[index];
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ActionChip(
              label: Text(
                p,
                style: const TextStyle(color: Colors.white70, fontSize: 11),
              ),
              backgroundColor: const Color(0xFF0F1523),
              side: const BorderSide(color: Color(0x14FFFFFF)),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              onPressed: () => _sendMessage(p.replaceFirst(RegExp(r'^[^\s]+\s'), '')),
            ),
          );
        },
      ),
    );
  }

  Widget _buildInputBar() {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: const BoxDecoration(
        color: Color(0xFF0F1523),
        border: Border(top: BorderSide(color: Color(0x14FFFFFF))),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: const Color(0xFF131B2E),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0x14FFFFFF)),
                ),
                child: TextField(
                  controller: _textCtrl,
                  maxLines: 3,
                  minLines: 1,
                  style: const TextStyle(color: Colors.white, fontSize: 13),
                  decoration: const InputDecoration(
                    hintText: 'Tâm sự hoặc hỏi OmniBot điều gì nè...',
                    hintStyle: TextStyle(color: Color(0xFF64748B), fontSize: 12),
                    border: InputBorder.none,
                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  ),
                  onSubmitted: (_) => _sendMessage(),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Container(
              decoration: const BoxDecoration(
                color: Color(0xFF00E5FF),
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: const Icon(Icons.send_rounded, color: Colors.black, size: 18),
                onPressed: _sendMessage,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
