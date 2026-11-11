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
      expect(greetingReply, contains('OmniBot'));
      expect(greetingReply, contains('Bé Bot Studio'));
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

      final channelReply = await service.chatWithAssistant(
        history: const [],
        userQuery: 'Khám phá các kênh truyền hình nổi bật trên OmniCast',
      );

      expect(channelReply, isNotEmpty);
      expect(channelReply, contains('CÁC KÊNH TRUYỀN HÌNH NỔI BẬT'));
      expect(channelReply, contains('VTV3 HD'));
      expect(channelReply, contains('Kênh TV'));
      expect(channelReply.contains('GÓI THÀNH VIÊN VIP'), isFalse);
    });

    test('chatWithAssistant returns playful and warm replies for casual conversation', () async {
      final careReply = await service.chatWithAssistant(
        history: const [],
        userQuery: 'Ăn cơm chưa nè bé bot ơi?',
      );
      expect(careReply, isNotEmpty);
      expect(careReply, contains('robot chạy bằng điện'));
      expect(careReply, contains('Pin'));

      final loveReply = await service.chatWithAssistant(
        history: const [],
        userQuery: 'Bot có người yêu chưa á?',
      );
      expect(loveReply, isNotEmpty);
      expect(loveReply, contains('tai nghe kiểm âm'));

      final humorReply = await service.chatWithAssistant(
        history: const [],
        userQuery: 'Kể chuyện cười cho mình nghe đi bot',
      );
      expect(humorReply, isNotEmpty);
      expect(humorReply, contains('WebRTC'));

      final sarcasmReply = await service.chatWithAssistant(
        history: const [],
        userQuery: 'Một câu chuyện giải trí thật vui, mang tính cà khịa cao cấp thì thế nào',
      );
      expect(sarcasmReply, isNotEmpty);
      expect(sarcasmReply, contains('cà khịa cao cấp'));
      expect(sarcasmReply, contains('End Meeting'));
      expect(sarcasmReply.contains('Chuẩn bị kỹ lưỡng trước giờ phát sóng'), isFalse);
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

    test('chatWithAssistant grounds recommendations in real availablePrograms list', () async {
      final realPrograms = [
        ProgramRecommendationContext(
          id: 'prog-sport-1',
          title: 'Chung Kết Ngoại Hạng Anh: Man City vs Arsenal',
          description: 'Trận cầu siêu kinh điển quyết định chức vô địch mùa giải.',
          channelName: 'K+ Sport 1 HD',
          status: 'LIVE',
          scheduledAt: DateTime(2026, 11, 11, 20, 0),
          tags: const ['thể thao', 'bóng đá', 'ngoại hạng'],
        ),
        ProgramRecommendationContext(
          id: 'prog-music-1',
          title: 'Đêm Nhạc Acoustic Hoàng Hôn',
          description: 'Không gian âm nhạc mộc mạc và sâu lắng.',
          channelName: 'Omni Music 4K',
          status: 'SCHEDULED',
          scheduledAt: DateTime(2026, 11, 11, 21, 30),
          tags: const ['âm nhạc', 'acoustic'],
        ),
      ];

      final sportReply = await service.chatWithAssistant(
        history: const [],
        userQuery: 'Gợi ý cho mình chương trình thể thao tối nay với bạn ơi',
        availablePrograms: realPrograms,
      );

      expect(sportReply, isNotEmpty);
      expect(sportReply, contains('GỢI Ý CHƯƠNG TRÌNH PHÙ HỢP TRÊN OMNICAST'));
      expect(sportReply, contains('Chung Kết Ngoại Hạng Anh'));
      expect(sportReply, contains('K+ Sport 1 HD'));

      final generalReply = await service.chatWithAssistant(
        history: const [],
        userQuery: 'Hôm nay xem gì hay ho nè?',
      );

      expect(generalReply, isNotEmpty);
      expect(generalReply, contains('GỢI Ý CHƯƠNG TRÌNH PHÙ HỢP TRÊN OMNICAST'));
      expect(generalReply, contains('V-League 2026'));
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

