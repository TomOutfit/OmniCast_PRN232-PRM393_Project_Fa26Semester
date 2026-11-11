// OmniCast - FreeAiService Unit Tests
// ============================================================

import 'package:flutter_test/flutter_test.dart';
import 'package:omnicast/data/services/free_ai_service.dart';

void main() {
  group('FreeAiService & Chatbot Tests', () {
    late FreeAiService service;

    setUp(() {
      service = FreeAiService();
    });

    test('FreeAiModel definitions and displayNames', () {
      expect(FreeAiModel.values.length, 4);
      expect(FreeAiModel.llama.id, 'llama');
      expect(FreeAiModel.llama.displayName, contains('Llama 3.3'));
      expect(FreeAiModel.mistral.displayName, contains('Mistral'));
      expect(FreeAiModel.qwen.displayName, contains('Qwen 2.5'));
      expect(FreeAiModel.openai.displayName, contains('GPT-4o-mini'));
    });

    test('chatWithAssistant returns robust advice on Hook / Opening prompt', () async {
      final reply = await service.chatWithAssistant(
        history: const [],
        userQuery: 'Gợi ý kịch bản mở đầu 3 phút thu hút',
        currentProgramTitle: 'Chung kết Cúp C1',
      );

      expect(reply, isNotEmpty);
      expect(reply, contains('GOLDEN HOOK'));
      expect(reply, contains('Tiêu đề gợi ý'));
      expect(reply, contains('Chung kết Cúp C1'));
      expect(reply.contains('Free limit reached'), isFalse);
    });

    test('chatWithAssistant returns prime-time EPG advice on Timing prompt', () async {
      final reply = await service.chatWithAssistant(
        history: const [],
        userQuery: 'Đề xuất khung giờ phát sóng tối ưu',
        currentProgramTitle: 'Thời sự 19h',
      );

      expect(reply, isNotEmpty);
      expect(reply, contains('PRIME-TIME'));
      expect(reply, contains('20:00 - 22:30'));
      expect(reply.contains('Free limit reached'), isFalse);
    });

    test('chatWithAssistant returns audience retention advice', () async {
      final reply = await service.chatWithAssistant(
        history: const [],
        userQuery: 'Cách giữ chân khán giả thế hệ trẻ',
        currentProgramTitle: 'VCS Mùa Xuân',
      );

      expect(reply, isNotEmpty);
      expect(reply, contains('RETENTION'));
      expect(reply, contains('WebRTC WHEP'));
      expect(reply.contains('Free limit reached'), isFalse);
    });

    test('chatWithAssistant returns compliance & safety advice', () async {
      final reply = await service.chatWithAssistant(
        history: const [],
        userQuery: 'Kiểm duyệt từ ngữ nhạy cảm và bản quyền',
      );

      expect(reply, isNotEmpty);
      expect(reply, contains('COMPLIANCE'));
      expect(reply, contains('T13'));
      expect(reply.contains('Free limit reached'), isFalse);
    });

    test('analyzeCuratorWithFreeAi generates complete report offline or online', () async {
      final report = await service.analyzeCuratorWithFreeAi(
        title: 'Hùng Vĩ Rừng Quốc Gia Cát Tiên 4K',
        description: 'Chuyến thám hiểm chuyên sâu về thảm thực vật nhiệt đới.',
        channelName: 'VTV Special HD',
        durationMinutes: 50,
      );

      expect(report.broadcastSuitability, isNotEmpty);
      expect(report.suggestedTimeSlot, isNotEmpty);
      expect(report.scoringBreakdown, isNotNull);
      expect(report.scoringBreakdown!.overallScore, greaterThanOrEqualTo(50));
      expect(report.contentAssessment, isNotNull);
      expect(report.formatAssessment, isNotNull);
      expect(report.grounding, isNotNull);
      expect(report.grounding!.isWellGrounded, isTrue);
    });
  });
}

