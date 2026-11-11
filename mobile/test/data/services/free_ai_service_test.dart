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
      expect(FreeAiModel.values.length, 6);
      expect(FreeAiModel.geminiPro.id, 'gemini-1.5-pro');
      expect(FreeAiModel.geminiPro.displayName, contains('Gemini 1.5 Pro'));
      expect(FreeAiModel.geminiPro.isGemini, isTrue);
      expect(FreeAiModel.geminiFlash.id, 'gemini-1.5-flash');
      expect(FreeAiModel.geminiFlash.isGemini, isTrue);
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

    test('chatWithAssistant returns contextual greeting and OmniCast features', () async {
      final greetingReply = await service.chatWithAssistant(
        history: const [],
        userQuery: 'Xin chào, bạn có thể giúp gì cho tôi?',
      );

      expect(greetingReply, isNotEmpty);
      expect(greetingReply, contains('XIN CHÀO BẠN! TÔI LÀ TRỢ LÝ AI OMNICAST'));
      expect(greetingReply, contains('Biên tập & Kịch bản'));

      final vipReply = await service.chatWithAssistant(
        history: const [],
        userQuery: 'Làm thế nào để nâng cấp gói thành viên VIP qua PayOS?',
      );

      expect(vipReply, isNotEmpty);
      expect(vipReply, contains('GÓI THÀNH VIÊN VIP'));
      expect(vipReply, contains('VietQR PayOS'));

      final techReply = await service.chatWithAssistant(
        history: const [],
        userQuery: 'Công nghệ WebRTC WHEP và độ trễ phát sóng là gì?',
      );

      expect(techReply, isNotEmpty);
      expect(techReply, contains('WebRTC WHEP'));
      expect(techReply, contains('< 350ms'));

      final streamReply = await service.chatWithAssistant(
        history: const [],
        userQuery: 'Làm sao để điều chỉnh thông số bitrate khi phát livestream?',
      );

      expect(streamReply, isNotEmpty);
      expect(streamReply, contains('Bitrate'));
    });

    test('chatWithAssistant returns context-matching answer for arbitrary questions', () async {
      final reply = await service.chatWithAssistant(
        history: const [],
        userQuery: 'Làm sao để chuẩn bị đạo cụ âm thanh cho buổi quay?',
        currentProgramTitle: 'Chương trình Thực địa',
      );

      expect(reply, isNotEmpty);
      expect(reply, contains('Chương trình Thực địa'));
      expect(reply, contains('đạo cụ âm thanh'));
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

