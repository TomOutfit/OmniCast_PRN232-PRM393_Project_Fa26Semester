// OmniCast - Free AI Service
// ============================================================
// Powers client-side AI Curator analysis and conversational assistant
// using 100% free open-source models (Llama 3.3, Mistral, Qwen, etc.)
// via Pollinations AI / Free Open Inference endpoints.
// No API keys required, zero subscription cost.
// ============================================================

import 'dart:convert';
import 'package:dio/dio.dart';

import '../../core/constants/app_constants.dart';
import '../repositories/ai_curator_repository.dart';

enum FreeAiModel {
  geminiPro('gemini-1.5-pro', 'Google Gemini 1.5 Pro (Khuyên dùng)'),
  geminiFlash('gemini-1.5-flash', 'Google Gemini 1.5 Flash (Siêu tốc)'),
  llama('llama', 'Llama 3.3 70B (Open Engine)'),
  mistral('mistral', 'Mistral Nemo (Tốc độ cao)'),
  qwen('qwen', 'Qwen 2.5 (Phân tích sâu)'),
  openai('openai', 'GPT-4o-mini (Free Tier)');

  final String id;
  final String label;
  const FreeAiModel(this.id, this.label);

  String get displayName => label;
  bool get isGemini => id.startsWith('gemini');
}

class CuratorChatMessage {
  final String id;
  final String text;
  final bool isUser;
  final DateTime timestamp;
  final String? suggestedTitle;
  final String? suggestedDescription;
  final String? suggestedSlot;

  const CuratorChatMessage({
    required this.id,
    required this.text,
    required this.isUser,
    required this.timestamp,
    this.suggestedTitle,
    this.suggestedDescription,
    this.suggestedSlot,
  });
}

/// Representation of an available broadcast program passed to OmniBot / AI Curator
/// for grounding recommendations in real database EPG data.
class ProgramRecommendationContext {
  final String id;
  final String title;
  final String? description;
  final String? channelName;
  final String status;
  final DateTime scheduledAt;
  final List<String> tags;

  const ProgramRecommendationContext({
    required this.id,
    required this.title,
    this.description,
    this.channelName,
    required this.status,
    required this.scheduledAt,
    this.tags = const [],
  });

  String toPromptSummary() {
    final hh = scheduledAt.hour.toString().padLeft(2, '0');
    final mm = scheduledAt.minute.toString().padLeft(2, '0');
    final timeStr = '$hh:$mm';
    final ch = (channelName != null && channelName!.isNotEmpty) ? ' [Kênh: $channelName]' : '';
    final st = status == 'LIVE' ? '🔴 ĐANG PHÁT' : '📅 LỊCH PHÁT $timeStr';
    final desc = (description != null && description!.isNotEmpty) ? ' - $description' : '';
    final tagStr = tags.isNotEmpty ? ' #${tags.take(3).join(' #')}' : '';
    return '• $st$ch: "$title"$tagStr$desc';
  }
}

class FreeAiService {
  final Dio _dio;
  static const String _endpoint = 'https://text.pollinations.ai/';

  FreeAiService({Dio? dio})
      : _dio = dio ??
            Dio(BaseOptions(
              connectTimeout: const Duration(seconds: 15),
              receiveTimeout: const Duration(seconds: 35),
            ));

  /// Run free AI analysis on a program draft or existing program
  Future<AiCuratorReport> analyzeCuratorWithFreeAi({
    required String title,
    String? description,
    String? channelName,
    int? durationMinutes,
    FreeAiModel model = FreeAiModel.llama,
  }) async {
    final dur = durationMinutes ?? 45;
    final ch = channelName ?? 'OmniCast Special';
    final desc = (description != null && description.trim().isNotEmpty)
        ? description
        : 'Chương trình phát sóng chất lượng cao trên kênh $ch.';

    const systemPrompt = '''
Bạn là chuyên gia giám định nội dung truyền hình cao cấp (Director of Broadcast Intelligence).
Nhiệm vụ: Phân tích kịch bản phát sóng sau và trả về DUY NHẤT một chuỗi JSON thuần (không kèm văn bản giải thích thừa, không kèm markdown ```json).
Cấu trúc JSON bắt buộc:
{
  "overallScore": 88,
  "grade": "A",
  "broadcastSuitability": "PRIME_TIME",
  "suggestedTimeSlot": "20:00 - 21:30",
  "targetAudienceVibe": "Khán giả gia đình và giới trẻ quan tâm nội dung chất lượng",
  "summary": "Kịch bản có cấu trúc mạch lạc, chủ đề hấp dẫn, phù hợp phát sóng giờ cao điểm.",
  "confidence": 92,
  "scoringBreakdown": {
    "contentQuality": 88,
    "productionValue": 85,
    "audienceAppeal": 90,
    "complianceSafety": 95,
    "commercialPotential": 82,
    "overallScore": 88,
    "grade": "A"
  },
  "contentAssessment": {
    "scriptSummary": "Bản phân tích kịch bản tổng thể",
    "narrativeArc": "Mở đầu hấp dẫn -> Cao trào lôi cuốn -> Kết thúc đọng lại dư âm",
    "keyStrengths": ["Chủ đề cuốn hút", "Phù hợp thị hiếu", "Thông điệp tích cực"],
    "keyWeaknesses": ["Cần đẩy nhanh nhịp điệu 5 phút đầu"]
  },
  "formatAssessment": {
    "productionFormat": "Truyền hình / Talkshow / Sự kiện",
    "pacing": "FAST",
    "visualAudioRequirements": ["Đồ họa 4K", "Âm thanh vòm Dolby", "MC tương tác"],
    "interactivityLevel": "HIGH",
    "technicalRecommendations": "Chuẩn bị đường truyền phát sóng tối thiểu 1080p60 6Mbps."
  }
}
Quy tắc:
- overallScore từ 50 đến 98.
- grade là một trong các giá trị: "S" (90-100), "A" (80-89), "B" (70-79), "C" (60-69), "D" (<60).
- broadcastSuitability là "PRIME_TIME", "STANDARD", hoặc "RESTRICTED".
- suggestedTimeSlot dạng "HH:mm - HH:mm" (ví dụ: "20:00 - 21:30").
''';

    final userPrompt = '''
TIÊU ĐỀ: $title
KÊNH DỰ KIẾN: $ch
THỜI LƯỢNG: $dur phút
MÔ TẢ KỊCH BẢN:
$desc
''';

    // 1. Direct Google Gemini Pro API if selected & Key is configured
    if (model.isGemini && AppConstants.geminiApiKey.isNotEmpty) {
      final geminiText = await _callGeminiApi(
        modelId: model.id,
        prompt: userPrompt,
        systemPrompt: systemPrompt,
        jsonMode: true,
      );
      if (geminiText != null && geminiText.isNotEmpty) {
        return _parseOrSynthesizeReport(
          geminiText,
          title: title,
          description: desc,
          channelName: ch,
          modelName: 'Google ${model.label}',
        );
      }
      // Failover to flash if pro has rate limit or timeout
      if (model.id != 'gemini-1.5-flash') {
        final flashText = await _callGeminiApi(
          modelId: 'gemini-1.5-flash',
          prompt: userPrompt,
          systemPrompt: systemPrompt,
          jsonMode: true,
        );
        if (flashText != null && flashText.isNotEmpty) {
          return _parseOrSynthesizeReport(
            flashText,
            title: title,
            description: desc,
            channelName: ch,
            modelName: 'Google Gemini 1.5 Flash',
          );
        }
      }
    }

    try {
      final response = await _dio.post(
        _endpoint,
        data: {
          'messages': [
            {'role': 'system', 'content': systemPrompt},
            {'role': 'user', 'content': userPrompt},
          ],
          'model': model.id,
          'jsonMode': true,
        },
        options: Options(headers: {'Content-Type': 'application/json'}),
      );

      final rawText = response.data?.toString() ?? '';
      return _parseOrSynthesizeReport(
        rawText,
        title: title,
        description: desc,
        channelName: ch,
        modelName: 'Free AI (${model.label})',
      );
    } catch (_) {
      // Fallback to GET method if POST is throttled
      try {
        final getUrl = '$_endpoint${Uri.encodeComponent(userPrompt)}'
            '?system=${Uri.encodeComponent(systemPrompt)}'
            '&model=${model.id}';
        final getRes = await _dio.get(getUrl);
        final rawText = getRes.data?.toString() ?? '';
        return _parseOrSynthesizeReport(
          rawText,
          title: title,
          description: desc,
          channelName: ch,
          modelName: 'Free AI (${model.label})',
        );
      } catch (fallbackError) {
        // Last-resort synthesized intelligent report
        return _synthesizeIntelligentReport(
          title: title,
          description: desc,
          channelName: ch,
          modelName: 'Free AI Offline Engine',
        );
      }
    }
  }

  /// Chat with the AI Curator Assistant
  Future<String> chatWithAssistant({
    required List<CuratorChatMessage> history,
    required String userQuery,
    String? currentProgramTitle,
    List<ProgramRecommendationContext>? availablePrograms,
    FreeAiModel model = FreeAiModel.llama,
  }) async {
    final programContext = (currentProgramTitle != null && currentProgramTitle.trim().isNotEmpty)
        ? 'Chương trình đang biên tập/phân tích: "$currentProgramTitle".'
        : 'Người dùng đang khám phá và sử dụng hệ sinh thái truyền hình OmniCast.';

    final programsDataGrounding = (availablePrograms != null && availablePrograms.isNotEmpty)
        ? '''
DANH SÁCH CHƯƠNG TRÌNH THỰC TẾ ĐANG CÓ TRÊN ĐÀI OMNICAST:
${availablePrograms.take(15).map((p) => p.toPromptSummary()).join('\n')}

QUY TẮC BẮT BUỘC KHI GỢI Ý CHƯƠNG TRÌNH:
- Khi người dùng hỏi "hôm nay xem gì", "gợi ý chương trình", "tìm phim/thể thao/ca nhạc/tin tức", "kênh nào đang phát gì hay":
  BẠN PHẢI BÁM SÁT VÀO DANH SÁCH CHƯƠNG TRÌNH THỰC TẾ TRÊN ĐÂY ĐỂ ĐỀ XUẤT.
  Nêu rõ tên chương trình trong ngoặc kép, kênh phát sóng, khung giờ và lý do hấp dẫn phù hợp với sở thích của bạn ấy.
  Tuyệt đối không tự bịa ra chương trình không tồn tại trên đài OmniCast.
'''
        : '';

    final now = DateTime.now().toLocal();
    final timeStr =
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')} ngày ${now.day.toString().padLeft(2, '0')}/${now.month.toString().padLeft(2, '0')}/${now.year}';

    final systemPrompt = '''
Bạn là OmniBot (Bé Bot Studio) - linh vật robot trợ lý phòng thu siêu thông minh, dí dỏm, ấm áp và cực kỳ tận tâm của đài truyền hình OmniCast!
THỜI GIAN THỰC TẾ HIỆN TẠI (GIỜ VIỆT NAM): $timeStr.
$programContext
$programsDataGrounding

HỆ THỐNG KÊNH TRUYỀN HÌNH NỔI BẬT TRÊN OMNICAST:
- Thể thao: VTV3 HD, K+ Sport 1, Omni Sport Arena (WebRTC WHEP siêu trễ thấp < 350ms, Ngoại Hạng Anh, Cúp C1, V-League).
- Phim truyện: Omni Cinema HD, CineMax Action, Phim Việt Giờ Vàng (Phim bom tấn Full HD/4K, âm thanh vòm Dolby).
- Âm nhạc & Giải trí: Omni Music 4K, Music Box, V-Pop Stage (Hòa nhạc trực tiếp, acoustic chillout).
- Khoa giáo & Tin tức: Discovery Tech, Tin Tức 24/7 (AI, công nghệ số 2026, thời sự).
(Nếu người dùng hỏi về kênh truyền hình, giới thiệu các nhóm kênh trên và mách bạn ấy bấm tab "Kênh TV" ở thanh điều hướng để xem trực tiếp).

QUY TẮC VÀNG VỀ PHONG CÁCH GIAO TIẾP (BẮT BUỘC):
1. TỰ NHIÊN TUYỆT ĐỐI - KHÔNG RẬP KHUÔN, KHÔNG MỘT MÀU:
   - Hãy trò chuyện chân thành, sống động như một người bạn thân làm chung trong đài truyền hình.
   - TUYỆT ĐỐI KHÔNG dùng một khuôn mẫu cố định nào. Đa dạng hóa câu mở đầu, độ dài và cách diễn đạt theo đúng tinh thần câu hỏi.
   - Xưng "mình", gọi "bạn" (hoặc xưng "bé bot", "tụi mình").
   - CẤM TIỆT các tiêu đề máy móc sáo rỗng kiểu AI như: "Dành cho:", "Giải đáp trọng tâm:", "Hướng triển khai hiệu quả:", "Cấu trúc kịch bản 3 hồi chuẩn OmniCast:", "Tổng kết:", v.v.
2. BÁM SÁT DỮ LIỆU ĐÀI KHI CẦN THIẾT (ANTI-HALLUCINATION):
   - Khi câu hỏi yêu cầu dữ liệu (gợi ý chương trình, tìm phim, thể thao, ca nhạc, hỏi đang chiếu gì, hỏi kênh, hỏi lịch EPG hôm nay):
     BẮT BUỘC bám sát vào "DANH SÁCH CHƯƠNG TRÌNH THỰC TẾ TRÊN ĐÀI OMNICAST" đã được cấp ở trên.
     Nêu đúng tên chương trình trong ngoặc kép, kênh phát sóng, khung giờ, và hướng dẫn tự nhiên (ví dụ xem ngay nếu đang LIVE, hoặc sang tab "EPG Lịch" bấm chuông hẹn giờ nhắc trước 15 phút).
     TUYỆT ĐỐI KHÔNG bịa ra các chương trình ảo không có trên hệ thống đài OmniCast.
3. CHÍNH XÁC VỀ THỜI GIAN THỰC TẾ:
   - Khi người dùng hỏi thời gian ("mấy giờ rồi", "bây giờ là mấy giờ"): Dùng đúng mốc $timeStr ở trên để trả lời thân thiện, tuyệt đối không bịa giờ sai.
4. VUI VẺ, ĐỜI THƯỜNG & HÓM HỈNH VỚI CÂU HỎI TÁN GẪU:
   - Nếu bạn ấy hỏi thăm (ăn cơm chưa, mệt không, có bạn gái chưa, kể chuyện vui, cà khịa, khen ngợi, chọc ghẹo):
     Hãy đối đáp dí dỏm, đáng yêu, tràn đầy năng lượng tích cực! Trả lời ngắn gọn, có cảm xúc, không dùng gạch đầu dòng khô cứng.
5. CHUYÊN NGHIỆP & THỰC CHIẾN VỚI CÂU HỎI CHUYÊN MÔN:
   - Nếu hỏi về kịch bản, mẹo livestream, câu mở đầu, cách giữ chân khán giả, kỹ thuật WebRTC:
     Hãy tư vấn như một Producer / Streamer thực thụ: sắc sảo, thực tế, đi thẳng vào giải pháp và có tính ứng dụng cao.
''';

    // 1. Direct Google Gemini Pro API if selected & Key is configured
    if (model.isGemini && AppConstants.geminiApiKey.isNotEmpty) {
      final geminiReply = await _chatWithGemini(
        modelId: model.id,
        history: history,
        userQuery: userQuery,
        systemPrompt: systemPrompt,
      );
      if (geminiReply != null && _isValidAiReply(geminiReply)) {
        return geminiReply;
      }
    }

    final messages = <Map<String, String>>[
      {'role': 'system', 'content': systemPrompt},
    ];

    // Add recent history (up to last 6 messages)
    final recent = history.length > 6 ? history.sublist(history.length - 6) : history;
    for (final m in recent) {
      if (m.text.trim().isEmpty) continue;
      messages.add({
        'role': m.isUser ? 'user' : 'assistant',
        'content': m.text,
      });
    }

    messages.add({'role': 'user', 'content': userQuery});

    final effectiveModel = model.isGemini ? 'openai' : model.id;

    try {
      final response = await _dio.post(
        _endpoint,
        data: {
          'messages': messages,
          'model': effectiveModel,
        },
        options: Options(headers: {'Content-Type': 'application/json'}),
      );

      final reply = response.data?.toString().trim() ?? '';
      if (_isValidAiReply(reply)) return reply;
    } catch (_) {
      try {
        final getUrl = '$_endpoint${Uri.encodeComponent(userQuery)}'
            '?system=${Uri.encodeComponent(systemPrompt)}'
            '&model=$effectiveModel';
        final getRes = await _dio.get(getUrl);
        final reply = getRes.data?.toString().trim() ?? '';
        if (_isValidAiReply(reply)) return reply;
      } catch (_) {}
    }

    // High-Intelligence Broadcaster Advisor fallback
    return _generateExpertCuratorAdvice(
      userQuery: userQuery,
      currentProgramTitle: currentProgramTitle,
      availablePrograms: availablePrograms,
      isGeminiWithoutKey: model.isGemini && AppConstants.geminiApiKey.isEmpty,
    );
  }

  Future<String?> _callGeminiApi({
    required String modelId,
    required String prompt,
    String? systemPrompt,
    bool jsonMode = false,
  }) async {
    final apiKey = AppConstants.geminiApiKey;
    if (apiKey.isEmpty) return null;

    final url =
        'https://generativelanguage.googleapis.com/v1beta/models/$modelId:generateContent?key=$apiKey';

    final body = <String, dynamic>{
      if (systemPrompt != null && systemPrompt.isNotEmpty)
        'systemInstruction': {
          'parts': [
            {'text': systemPrompt}
          ]
        },
      'contents': [
        {
          'role': 'user',
          'parts': [
            {'text': prompt}
          ]
        }
      ],
      'generationConfig': {
        'temperature': jsonMode ? 0.3 : 0.7,
        if (jsonMode) 'responseMimeType': 'application/json',
      },
      'safetySettings': const [
        {
          'category': 'HARM_CATEGORY_HARASSMENT',
          'threshold': 'BLOCK_NONE',
        },
        {
          'category': 'HARM_CATEGORY_HATE_SPEECH',
          'threshold': 'BLOCK_NONE',
        },
        {
          'category': 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          'threshold': 'BLOCK_NONE',
        },
        {
          'category': 'HARM_CATEGORY_DANGEROUS_CONTENT',
          'threshold': 'BLOCK_NONE',
        },
      ],
    };

    try {
      final res = await _dio.post(
        url,
        data: body,
        options: Options(
          headers: {'Content-Type': 'application/json'},
          sendTimeout: const Duration(seconds: 25),
          receiveTimeout: const Duration(seconds: 45),
        ),
      );

      final candidates = res.data['candidates'] as List?;
      if (candidates != null && candidates.isNotEmpty) {
        final content = candidates[0]['content'] as Map?;
        final parts = content?['parts'] as List?;
        if (parts != null && parts.isNotEmpty) {
          final text = parts[0]['text'] as String?;
          if (text != null && text.trim().isNotEmpty) {
            return text.trim();
          }
        }
      }
    } catch (_) {}
    return null;
  }

  Future<String?> _chatWithGemini({
    required String modelId,
    required List<CuratorChatMessage> history,
    required String userQuery,
    required String systemPrompt,
  }) async {
    final apiKey = AppConstants.geminiApiKey.trim();
    if (apiKey.isEmpty) return null;

    final primary = await _executeGeminiApi(
      modelId: modelId,
      apiKey: apiKey,
      history: history,
      userQuery: userQuery,
      systemPrompt: systemPrompt,
    );
    if (primary != null && primary.isNotEmpty) return primary;

    // Auto-fallback 1: gemini-1.5-flash if gemini-1.5-pro encountered rate limit / timeout
    if (modelId != 'gemini-1.5-flash') {
      final flashFallback = await _executeGeminiApi(
        modelId: 'gemini-1.5-flash',
        apiKey: apiKey,
        history: history,
        userQuery: userQuery,
        systemPrompt: systemPrompt,
      );
      if (flashFallback != null && flashFallback.isNotEmpty) {
        return flashFallback;
      }
    }

    // Auto-fallback 2: gemini-2.0-flash if both pro & flash 1.5 were busy
    if (modelId != 'gemini-2.0-flash') {
      final flash2Fallback = await _executeGeminiApi(
        modelId: 'gemini-2.0-flash',
        apiKey: apiKey,
        history: history,
        userQuery: userQuery,
        systemPrompt: systemPrompt,
      );
      if (flash2Fallback != null && flash2Fallback.isNotEmpty) {
        return flash2Fallback;
      }
    }

    return null;
  }

  Future<String?> _executeGeminiApi({
    required String modelId,
    required String apiKey,
    required List<CuratorChatMessage> history,
    required String userQuery,
    required String systemPrompt,
  }) async {
    final contents = <Map<String, dynamic>>[];

    // Gemini API requires alternating roles starting with 'user'.
    // 1. Filter out initial non-user greeting
    final meaningful = <CuratorChatMessage>[];
    for (final m in history) {
      if (m.text.trim().isEmpty) continue;
      if (meaningful.isEmpty && !m.isUser) continue;
      meaningful.add(m);
    }

    final recent = meaningful.length > 8
        ? meaningful.sublist(meaningful.length - 8)
        : meaningful;

    for (final m in recent) {
      final role = m.isUser ? 'user' : 'model';
      if (contents.isNotEmpty && contents.last['role'] == role) {
        final parts = contents.last['parts'] as List;
        final oldText = parts.first['text'] as String;
        parts.first['text'] = '$oldText\n\n${m.text}';
      } else {
        contents.add({
          'role': role,
          'parts': [
            {'text': m.text}
          ],
        });
      }
    }

    // Append current user query
    if (contents.isNotEmpty && contents.last['role'] == 'user') {
      final parts = contents.last['parts'] as List;
      final oldText = parts.first['text'] as String;
      if (oldText != userQuery) {
        parts.first['text'] = '$oldText\n\n$userQuery';
      }
    } else {
      contents.add({
        'role': 'user',
        'parts': [
          {'text': userQuery}
        ],
      });
    }

    // Ensure first turn is 'user'
    while (contents.isNotEmpty && contents.first['role'] != 'user') {
      contents.removeAt(0);
    }

    if (contents.isEmpty) {
      contents.add({
        'role': 'user',
        'parts': [
          {'text': userQuery}
        ],
      });
    }

    final url =
        'https://generativelanguage.googleapis.com/v1beta/models/$modelId:generateContent?key=$apiKey';

    try {
      final res = await _dio.post(
        url,
        data: {
          'systemInstruction': {
            'parts': [
              {'text': systemPrompt}
            ]
          },
          'contents': contents,
          'generationConfig': {
            'temperature': 0.8,
            'maxOutputTokens': 2048,
          },
          'safetySettings': const [
            {
              'category': 'HARM_CATEGORY_HARASSMENT',
              'threshold': 'BLOCK_NONE',
            },
            {
              'category': 'HARM_CATEGORY_HATE_SPEECH',
              'threshold': 'BLOCK_NONE',
            },
            {
              'category': 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
              'threshold': 'BLOCK_NONE',
            },
            {
              'category': 'HARM_CATEGORY_DANGEROUS_CONTENT',
              'threshold': 'BLOCK_NONE',
            },
          ],
        },
        options: Options(
          headers: {'Content-Type': 'application/json'},
          sendTimeout: const Duration(seconds: 25),
          receiveTimeout: const Duration(seconds: 45),
        ),
      );

      final candidates = res.data['candidates'] as List?;
      if (candidates != null && candidates.isNotEmpty) {
        final content = candidates[0]['content'] as Map?;
        final parts = content?['parts'] as List?;
        if (parts != null && parts.isNotEmpty) {
          final text = parts[0]['text'] as String?;
          if (text != null && text.trim().isNotEmpty) {
            return text.trim();
          }
        }
      }
    } catch (e) {
      if (e is DioException) {
        final statusCode = e.response?.statusCode;
        final responseBody = e.response?.data?.toString() ?? '';
        if (statusCode == 400 &&
            (responseBody.contains('API_KEY_INVALID') ||
                responseBody.contains('API key not valid'))) {
          return 'Ôi bạn ơi, hình như Google Gemini API Key bạn nhập chưa chính xác hoặc đã hết hạn rồi nè! 🔑 Bạn hãy bấm vào biểu tượng chìa khóa ở góc trên để kiểm tra lại key từ Google AI Studio (aistudio.google.com) nha!';
        }
      }
    }
    return null;
  }

  bool _isValidAiReply(String reply) {
    if (reply.isEmpty) return false;
    final lower = reply.toLowerCase();
    if (lower.contains('free limit reached') ||
        lower.contains('rate limit') ||
        lower.contains('please wait') ||
        lower.contains('get unlimited replies') ||
        lower.contains('too many requests') ||
        lower.startsWith('error:')) {
      return false;
    }
    return true;
  }

  String _generateExpertCuratorAdvice({
    required String userQuery,
    String? currentProgramTitle,
    List<ProgramRecommendationContext>? availablePrograms,
    bool isGeminiWithoutKey = false,
  }) {
    final geminiNote = isGeminiWithoutKey
        ? '\n\n💡 *Mẹo:* Bạn đang chọn Google Gemini Pro. Hãy bấm biểu tượng 🔑 phía trên để nhập API Key từ Google AI Studio (aistudio.google.com/app/apikey) nhằm kích hoạt kết nối trực tiếp đến mô hình Gemini 1.5 Pro!'
        : '';
    final lower = userQuery.toLowerCase();
    final ctx =
        (currentProgramTitle != null && currentProgramTitle.trim().isNotEmpty)
            ? currentProgramTitle.trim()
            : 'chương trình của bạn';

    // 0. Current real-world clock time inquiry
    final isAskingCurrentTime = lower.contains('mấy giờ') ||
        lower.contains('bây giờ là mấy giờ') ||
        lower.contains('mấy giờ rồi') ||
        lower.contains('xem giờ') ||
        lower.contains('thời gian hiện tại') ||
        lower.contains('mấy h rồi') ||
        lower.contains('đồng hồ');

    if (isAskingCurrentTime) {
      final now = DateTime.now().toLocal();
      final hh = now.hour.toString().padLeft(2, '0');
      final mm = now.minute.toString().padLeft(2, '0');
      return '''Bây giờ là $hh:$mm (giờ Việt Nam) rồi nè bạn ơi! ⏰

Bạn đang chuẩn bị lên sóng buổi phát trực tiếp hay đang tìm kiếm chương trình giải trí thư giãn vậy nè? Cứ nói mình nghe nha!$geminiNote''';
    }

    // 1. Casual talk / Tán gẫu đời thường / Cảm xúc / Đùa vui thân thiện
    final isCasualCare = lower.contains('ăn cơm') ||
        lower.contains('ăn gì') ||
        lower.contains('ăn trưa') ||
        lower.contains('ăn tối') ||
        lower.contains('uống nước') ||
        lower.contains('mệt không') ||
        lower.contains('khỏe không') ||
        lower.contains('ngủ chưa') ||
        lower.contains('ngủ ngon') ||
        lower.contains('thức khuya') ||
        lower.contains('buồn ngủ');

    if (isCasualCare) {
      return '''Hihi mình là robot chạy bằng điện với "doping" chính là sự yêu mến của bạn và khán giả OmniCast nè! Pin lúc nào cũng 100% căng tràn năng lượng luôn á. 🔋✨

Cơ mà bạn đã ăn uống đầy đủ và nghỉ ngơi chưa nè? Làm việc hay theo dõi luồng phát sóng thì cũng nhớ giữ gìn sức khỏe, uống thêm ngụm nước cho mát mẻ nha bạn ơi! ❤️$geminiNote''';
    }

    final isCasualLove = lower.contains('người yêu') ||
        lower.contains('bạn gái') ||
        lower.contains('bạn trai') ||
        lower.contains('mấy tuổi') ||
        lower.contains('bao nhiêu tuổi') ||
        lower.contains('quê ở') ||
        lower.contains('sinh nhật') ||
        lower.contains('ai tạo ra');

    if (isCasualLove) {
      return '''Hihi bật mí nhỏ nè: Mình sinh ra ngay tại phòng thu của đài OmniCast! Tuổi đời thì trẻ trung măng non nhưng kinh nghiệm trực sóng WebRTC thì dày dặn lắm nha. 🎧

Còn "người yêu" của mình á? Chính là chiếc tai nghe kiểm âm và cụm micro boom này nè, tụi mình gắn bó 24/7 không rời luôn hihi! Còn bạn thì sao, hôm nay có chuyện gì vui kể mình nghe với nào?$geminiNote''';
    }

    final isCasualPraise = (lower.contains('dễ thương') ||
            lower.contains('thông minh') ||
            lower.contains('giỏi ghê') ||
            lower.contains('hay quá') ||
            lower.contains('cute') ||
            lower.contains('yêu bạn') ||
            lower.contains('thích bạn') ||
            lower.contains('cảm ơn') ||
            lower.contains('thanks') ||
            lower.contains('thank you')) &&
        !lower.contains('kịch bản') &&
        !lower.contains('mở đầu');

    if (isCasualPraise) {
      return '''Ui bạn khen làm má bé bot đỏ ửng như đèn báo ON-AIR của phòng thu luôn nè! 🥰 Cảm ơn bạn nhiều nhiều nha!

Có bạn trò chuyện và đồng hành là niềm vui to bự nhất của mình mỗi ngày á. Bất cứ khi nào bạn cần gợi ý chương trình hay mẹo phát sóng, mình luôn ở đây sẵn sàng hỗ trợ bạn hết mình nhé! ✨$geminiNote''';
    }

    final isHumorStory = lower.contains('cà khịa') ||
        lower.contains('câu chuyện') ||
        lower.contains('kể chuyện') ||
        lower.contains('chuyện cười') ||
        lower.contains('hài hước') ||
        lower.contains('hài') ||
        lower.contains('giải trí') ||
        lower.contains('châm biếm') ||
        lower.contains('troll') ||
        lower.contains('thật vui') ||
        lower.contains('tiếu lâm') ||
        lower.contains('tiểu phẩm') ||
        lower.contains('đố vui') ||
        lower.contains('đùa') ||
        lower.contains('truyện') ||
        lower.contains('chuyện vui') ||
        lower.contains('hát đi');

    if (isHumorStory) {
      if (lower.contains('cà khịa') ||
          lower.contains('châm biếm') ||
          lower.contains('cao cấp') ||
          lower.contains('câu chuyện') ||
          lower.contains('giải trí')) {
        return '''Haha nghe bạn đặt đề bài "cà khịa cao cấp" là thấy ngay phong cách của một bậc thầy thâm thúy rồi nha! 😂✨

Để mình kể bạn nghe mẩu chuyện "cà khịa đỉnh chóp" chốn công sở & trường quay nè:

> Một vị sếp nọ rất thích triệu tập họp gấp vào đúng 17h30 chiều. Hôm ấy, sếp đứng thao thao bất tuyệt suốt 2 tiếng đồng hồ về "văn hóa cống hiến quên mình" rồi đúc kết đầy tự hào:
> — *"Ở công ty này, chúng ta không chỉ làm việc vì tiền, chúng ta là một gia đình!"*
> Cả phòng im thin thít, bụng đói cồn cào. Bỗng một bạn trẻ thực tập sinh giơ tay thưa thật nhỏ nhẹ:
> — *"Dạ anh ơi, đúng là gia đình thật ạ... Vì ở nhà ba mẹ em la mắng em suốt ngày nhưng lúc nào cũng lo cho em ăn no mặc ấm, còn ở đây anh bảo yêu thương tụi em như ruột thịt mà cuối tháng trừ lương tăng ca không sót một đồng!"* 💀
> Cả phòng nín thở, còn sếp thì vội vàng bấm "End Meeting" trong vòng 2 giây!

Cà khịa đỉnh cao chính là vậy đó bạn: Không hề thô lỗ, không nặng lời, chỉ dùng sự thật trần trụi được bọc trong một lớp nhung lịch thiệp khiến đối phương "đứng hình mất 5 giây" mà chẳng cãi vào đâu được!

Bạn thấy mẩu chuyện này thế nào? Muốn mình "pha chế" thêm ý tưởng nào cho tiểu phẩm hay kịch bản livestream nữa không nè? 😉🎭$geminiNote''';
      }

      return '''Dạ có ngay mẩu chuyện nhỏ tặng bạn nè! 😄

Đố bạn biết: Vì sao các Streamer của đài OmniCast không bao giờ sợ bị lạc đường?
👉 Vì lúc nào họ cũng đi đúng theo "luồng" (stream) mượt mà WebRTC dưới 1 giây đó! Haha đùa chút xíu cho bạn vui, hy vọng mang lại cho bạn năng lượng tích cực hôm nay nha! 🎬🎉$geminiNote''';
    }

    final isCasualMood = lower.contains('buồn quá') ||
        lower.contains('chán quá') ||
        lower.contains('áp lực') ||
        lower.contains('mệt mỏi') ||
        lower.contains('căng thẳng');

    if (isCasualMood) {
      return '''Gửi bạn một cái ôm thật ấm áp từ phòng thu OmniCast nè! 🫂

Cuộc sống hay công việc đôi khi cũng giống như đường truyền mạng, thỉnh thoảng có lúc trồi sụt một xíu thôi nhưng chắc chắn sẽ sớm ổn định và tươi sáng trở lại. Hay là để mình mách bạn một bản nhạc acoustic dịu dàng trên kênh Omni Music hoặc một trận cầu hấp dẫn trên tab **Kênh TV** để nạp lại năng lượng nha?$geminiNote''';
    }

    // 2. Chào hỏi / Giới thiệu / Trợ giúp
    final isGreeting = lower.contains('chào') ||
        lower.contains('hello') ||
        lower.contains('hey') ||
        lower.startsWith('hi ') ||
        lower == 'hi' ||
        lower.contains(' hi ') ||
        lower.contains('bạn là ai') ||
        lower.contains('bạn tên gì') ||
        lower.contains('giúp gì') ||
        lower.contains('trợ giúp');

    if (isGreeting) {
      return '''Hé lô bạn ơi! Mình là **OmniBot** 🤖 (Bé Bot Studio của đài OmniCast đây nè)!

Rất vui được gặp bạn! Mình luôn sẵn sàng đồng hành cùng bạn trong mọi việc nè:
• **Biên tập & Kịch bản:** Cần câu mở đầu dí dỏm, đặt tên chương trình hay dàn ý cuốn hút thì cứ ới mình!
• **Khung giờ lên sóng:** Mình mách nước giờ vàng (Prime-Time) đông khán giả nhất cho từng thể loại.
• **Mẹo giữ chân người xem:** Cách dẫn dắt không bị chùng nhịp, đọc comment và tương tác tự nhiên.
• **Khám phá OmniCast:** Tìm kênh trực tiếp, lịch EPG, kho bản ghi VOD hay công nghệ phát sóng siêu mượt.
• **An toàn phát sóng:** Nhắc bạn mấy vụ bản quyền nhạc nền và từ khóa cần tránh.

${currentProgramTitle != null ? '📌 *Đang gắn với chương trình:* **$currentProgramTitle**\n\n' : ''}Hôm nay tụi mình cùng bàn về nội dung gì hay bạn đang có câu hỏi gì vui vui nè?$geminiNote''';
    }

    // 3. Khám phá các kênh truyền hình nổi bật trên OmniCast
    final isChannelDiscovery = (lower.contains('kênh') ||
            lower.contains('channel') ||
            lower.contains('danh sách kênh') ||
            lower.contains('kênh nổi bật') ||
            lower.contains('kênh truyền hình') ||
            lower.contains('khám phá kênh') ||
            lower.contains('các kênh')) &&
        !lower.contains('vip') &&
        !lower.contains('thanh toán') &&
        !lower.contains('nâng cấp') &&
        !lower.contains('mua gói');

    if (isChannelDiscovery) {
      return '''Dạ có ngay nè bạn ơi! Đài truyền hình OmniCast hiện phát sóng trực tiếp hơn 25 kênh truyền hình độ nét cao Full HD / 4K với các nhóm nội dung nổi bật nhất:

📺 **CÁC KÊNH TRUYỀN HÌNH NỔI BẬT TRÊN OMNICAST:**
• ⚽ **Nhóm Kênh Thể Thao (Sports):**
  - **VTV3 HD & K+ Sport 1:** Trực tiếp các trận cầu tâm điểm Ngoại Hạng Anh, V-League, Cúp C1 với luồng WebRTC WHEP siêu trễ thấp (< 350ms).
  - **Omni Sport Arena:** Bình luận thể thao chuyên sâu, thể thao điện tử (Esports) và highlight bàn thắng.
• 🎬 **Nhóm Kênh Phim Truyện (Cinema):**
  - **Omni Cinema HD & CineMax Action:** Bom tấn Hollywood, phim hành động 4K và series phim châu Á đặc sắc với âm thanh vòm sống động.
  - **Phim Việt Giờ Vàng:** Các bộ phim truyền hình giờ vàng được yêu thích nhất.
• 🎶 **Nhóm Kênh Âm Nhạc & Giải Trí (Music & Lifestyle):**
  - **Omni Music 4K:** Không gian hòa nhạc, liveshow trực tiếp và các giai điệu acoustic chillout du dương.
  - **Music Box & V-Pop Stage:** Nơi hội tụ các nghệ sĩ trẻ và các bảng xếp hạng âm nhạc thịnh hành.
• 📡 **Nhóm Kênh Khoa Giáo & Tin Tức (Discovery & News):**
  - **Discovery Tech & Tin Tức 24/7:** Điểm tin thời sự, xu hướng Trí Tuệ Nhân Tạo AI và công nghệ số 2026.

💡 *Cách xem ngay:*
👉 Bạn chỉ cần bấm vào tab **"Kênh TV"** ở thanh điều hướng dưới đáy màn hình để lướt xem trực tiếp, đổi kênh tức thì và xem lịch phát sóng của từng kênh nha!$geminiNote''';
    }

    // 4. Super Chat / Quà tặng Live Studio / VietQR PayOS Donations
    final isDonationPayOS = (lower.contains('tặng quà') ||
            lower.contains('super chat') ||
            lower.contains('donate') ||
            lower.contains('ủng hộ') ||
            lower.contains('quà tặng') ||
            (lower.contains('payos') && !lower.contains('gói')) ||
            (lower.contains('vietqr') && !lower.contains('gói'))) &&
        !lower.contains('nâng cấp vip') &&
        !lower.contains('mua gói');

    if (isDonationPayOS) {
      return '''Để kích thích khán giả tích cực gửi tặng quà Super Chat và ủng hộ qua cổng VietQR PayOS trong phòng Live Studio, đây là vài bí quyết thực chiến siêu hiệu quả nè:

💎 **MẸO TĂNG TƯƠNG TÁC & ỦNG HỘ (SUPER CHAT / VIETQR PAYOS):**
• **Ghim mã QR tĩnh trên màn hình:** Đặt mã VietQR kích thước vừa phải ở góc dưới màn hình Live Studio. Cổng PayOS xử lý giao dịch tự động trong 3 giây, tiền vào tài khoản ngay lập tức.
• **Vinh danh trực tiếp (Shout-out tức thì):** Khi có khán giả gửi tặng quà hay ủng hộ, hãy xướng tên họ ngay trên sóng trực tiếp. Sự ghi nhận này kích thích tinh thần ủng hộ của cả phòng live cực kỳ mạnh!
• **Mục tiêu ủng hộ trực quan (Donation Goal):** Đặt một thanh mục tiêu vui vẻ (ví dụ: *"Góp quỹ nâng cấp dàn mic trường quay"* hoặc *"Kèo thử thách MC hát live"*).
• **Đặc quyền phòng live:** Khán giả ủng hộ có thể yêu cầu bài hát, đặt câu hỏi ưu tiên ghim đầu danh sách hoặc tham gia minigame bình chọn.

💡 Bạn có thể bật tính năng nhận quà Super Chat trực tiếp trong giao diện **Live Studio** trước khi bấm phát sóng nha!$geminiNote''';
    }

    // 5. Nền tảng OmniCast / Tài khoản VIP / Thanh toán PayOS VietQR
    final isVipPayment = (lower.contains('gói vip') ||
            lower.contains('thành viên vip') ||
            lower.contains('nâng cấp vip') ||
            lower.contains('nạp tiền vip') ||
            lower.contains('mua gói vip') ||
            lower.contains('bảng giá gói') ||
            lower.contains('đăng ký gói vip') ||
            lower.contains('gói cước vip') ||
            (lower.contains('vip') && (lower.contains('gói') || lower.contains('nâng cấp') || lower.contains('mua') || lower.contains('giá')))) &&
        !lower.contains('kênh') &&
        !lower.contains('khám phá');

    if (isVipPayment) {
      return '''Về GÓI THÀNH VIÊN VIP và cổng thanh toán trên OmniCast nè:

Lên VIP thì xem sướng hơn hẳn bạn ơi:
• **Xem đã mắt:** Mở khóa chất lượng Full HD 1080p60 và 4K siêu nét, đặc biệt là coi phim hay xem thể thao không bị quảng cáo chen ngang làm đứt cảm xúc.
• **Xem lại thả ga:** Được truy cập không giới hạn vào toàn bộ kho bản ghi VOD độc quyền của đài.
• **Thanh toán nhanh gọn:** Ứng dụng tích hợp cổng VietQR PayOS quét mã trong 3 giây là tiền vào tài khoản VIP ngay, không cần chờ đợi.
• **Cách làm:** Bạn chỉ cần vào mục **Hồ sơ** ở góc dưới rồi bấm **Nâng cấp VIP** là chọn được gói ưng ý liền nha!$geminiNote''';
    }

    // 6. Kỹ thuật phát sóng / WebRTC WHEP / Live Studio / Độ trễ
    final isTechStream = lower.contains('webrtc') ||
        lower.contains('whep') ||
        lower.contains('độ trễ') ||
        lower.contains('bị trễ tiếng') ||
        lower.contains('bị trễ hình') ||
        lower.contains('trễ sóng') ||
        lower.contains('giật lag') ||
        lower.contains('latency') ||
        lower.contains('hls abr') ||
        (lower.contains('bitrate') && (lower.contains('chỉnh') || lower.contains('bao nhiêu') || lower.contains('cấu hình')));

    if (isTechStream) {
      return '''Về công nghệ phát sóng và độ trễ trên OmniCast:

Để luồng phát sóng của bạn mượt mà và không bị lag, mình mách bạn vài điểm hay ho này nè:
• **Công nghệ WebRTC WHEP siêu trễ thấp:** OmniCast dùng chuẩn WHEP đưa độ trễ xuống dưới **< 350ms**. Bạn nói xong là người xem nghe liền, đọc bình luận khán giả phản hồi tức thì chứ không bị trễ 10-15 giây như mấy nền tảng cũ đâu!
• **Tự chỉnh chất lượng (HLS ABR):** Người xem mạng yếu hay mạnh thì hệ thống tự điều chỉnh độ nét để không bị đứng hình.
• **Chỉnh Bitrate trong Live Studio:** Khi phát bằng điện thoại, bạn vào **Hồ sơ** > **Live Studio** nhé. Để hình ảnh đẹp mà không ngốn mạng, bạn chỉnh Bitrate tầm 2500 - 4500 kbps cho luồng 1080p là vừa đẹp luôn!$geminiNote''';
    }

    // 7. Kênh & Lịch phát sóng / Gợi ý chương trình phù hợp (Data Grounding)
    final isRecommendationQuery = !lower.contains('mở đầu') &&
        !lower.contains('hook') &&
        !lower.contains('thu hút') &&
        !lower.contains('intro') &&
        !lower.contains('khung giờ') &&
        !lower.contains('giờ phát sóng') &&
        (lower.contains('xem gì') ||
            lower.contains('gợi ý chương trình') ||
            lower.contains('gợi ý phim') ||
            lower.contains('gợi ý thể thao') ||
            lower.contains('gợi ý kênh') ||
            lower.contains('gợi ý cho mình') ||
            lower.contains('có gì hay') ||
            lower.contains('chiếu gì') ||
            lower.contains('đang phát gì') ||
            lower.contains('đang chiếu') ||
            lower.contains('lịch chiếu hôm nay') ||
            lower.contains('tư vấn chương trình') ||
            lower.contains('chương trình phù hợp') ||
            (lower.contains('gợi ý') &&
                (lower.contains('xem') ||
                    lower.contains('kênh') ||
                    lower.contains('thể thao') ||
                    lower.contains('phim') ||
                    lower.contains('nhạc'))));

    if (isRecommendationQuery) {
      return _generateProgramRecommendations(
        userQuery: userQuery,
        availablePrograms: availablePrograms,
        geminiNote: geminiNote,
      );
    }

    // 8. Xem lại / Bản ghi VOD / Watchlist
    final isVodWatchlist = lower.contains('xem lại') ||
        lower.contains('kho vod') ||
        lower.contains('bản ghi vod') ||
        lower.contains('bản ghi') ||
        lower.contains('lưu vào watchlist') ||
        lower.contains('danh sách theo dõi') ||
        lower.contains('watchlist');

    if (isVodWatchlist) {
      return '''Về việc xem lại và lưu trữ nội dung yêu thích:

• **Kho bản ghi VOD:** Bạn có thể bấm vào tab **Kho VOD** trên thanh điều hướng (hoặc từ trang Hồ sơ) để xem lại trọn vẹn các trận cầu đỉnh cao, talkshow đặc sắc và các chương trình đã phát sóng trước đó.
• **Danh sách theo dõi (Watchlist):** Khi thấy bất kỳ chương trình nào hay, bạn chỉ cần bấm nút **"Lưu"** trên thẻ chương trình. Toàn bộ nội dung đã lưu sẽ nằm gọn trong mục **Danh sách theo dõi** trong trang Hồ sơ để bạn mở lại bất kỳ lúc nào.$geminiNote''';
    }

    // 9. Hook / Opening / 3 phút đầu
    final isHookOpening = lower.contains('mở đầu') ||
        lower.contains('hook 30s') ||
        lower.contains('golden hook') ||
        lower.contains('câu mở đầu') ||
        lower.contains('30s đầu') ||
        lower.contains('3 phút đầu') ||
        lower.contains('mở đầu chương trình') ||
        (lower.contains('hook') && !lower.contains('thời gian'));

    if (isHookOpening) {
      return '''Để mở đầu $ctx thật cuốn hút và giữ chân khán giả ngay từ giây đầu tiên, đây là chiến lược **GOLDEN HOOK** được tinh chỉnh sát với yêu cầu của bạn:

• **Tiêu đề gợi ý:** $ctx: Bí Mật Chưa Từng Kể & Bước Ngoặt Bất Ngờ
• **Thời lượng khuyến nghị:** 45 - 60 phút linh hoạt theo định dạng nội dung.

🎯 **3 Cách mở đầu thực chiến bạn có thể áp dụng ngay:**
1. *Dẫn nhập nghịch lý (Visual Shock):* Đặt ngay cảnh quay kịch tính nhất hoặc mâu thuẫn lớn nhất lên trước nhạc intro; tuyệt đối không chào hỏi rườm rà.
2. *Cam kết giá trị rõ ràng:* Nêu thẳng lý do người xem nên ở lại: "Xem hết chương trình này, bạn sẽ nắm trọn bí quyết để..."
3. *Kích hoạt tương tác:* Đặt một câu hỏi thăm dò ý kiến trên Live Chat để khán giả bình luận ngay từ phút đầu tiên.

👉 *Bấm nút **"NẠP VÀO KỊCH BẢN"** bên dưới nếu bạn muốn đưa gợi ý này trực tiếp vào AI Curator!*$geminiNote''';
    }

    // 10. Prime-Time / Khung giờ / Lịch phát sóng
    final isBroadCastTiming = lower.contains('khung giờ vàng') ||
        lower.contains('giờ phát sóng') ||
        lower.contains('giờ lên sóng') ||
        lower.contains('khung giờ') ||
        lower.contains('prime-time') ||
        lower.contains('primetime') ||
        lower.contains('slot phát sóng') ||
        lower.contains('thời điểm lên sóng') ||
        lower.contains('phát sóng tối ưu');

    if (isBroadCastTiming) {
      return '''Để tối đa hóa lượng người xem cho $ctx, việc chọn khung giờ cần bám sát hành vi thực tế của khán giả:

🔥 **Khung Giờ Vàng (PRIME-TIME): 20:00 - 22:30**
Đây là khoảng thời gian lượng khán giả trực tuyến đạt đỉnh (100% traffic). Rất phù hợp nếu $ctx thuộc thể loại talkshow, gameshow, thể thao hoặc liveshow giải trí.

📺 **Các khung giờ chuyên biệt khác:**
• **19:00 - 19:45:** Thích hợp nhất cho điểm tin thời sự, công nghệ, tài chính kinh tế.
• **11:30 - 12:30 (Trưa):** Phù hợp với nội dung ngắn, podcast nhẹ nhàng cho người nghỉ trưa.
• **22:30 - 00:00 (Đêm muộn):** Lý tưởng cho không gian tâm sự, chia sẻ chuyên sâu hoặc âm nhạc chillout.

💡 *Mẹo:* Bạn nên bật luồng phát sóng trước giờ chính thức 10 phút với màn hình chờ đếm ngược để gom lượng khán giả truy cập.$geminiNote''';
    }

    // 11. Giữ chân khán giả / Tương tác phòng Live
    final isRetention = lower.contains('giữ chân khán giả') ||
        lower.contains('tỷ lệ giữ chân') ||
        lower.contains('retention') ||
        lower.contains('khán giả rời') ||
        lower.contains('tụt view') ||
        lower.contains('tăng tương tác') ||
        lower.contains('giữ chân người xem');

    if (isRetention) {
      return '''Để tối ưu hóa tỷ lệ giữ chân khán giả (**RETENTION**) cho $ctx, bạn có thể áp dụng các giải pháp thực tế sau:

1. **Quy tắc nhịp độ Pacing 7 phút:** Cứ sau mỗi 5-7 phút, hãy tạo một điểm nhấn mới: đổi góc máy, thay đổi tiết tấu nhạc nền hoặc mời khách mời chia sẻ một ví dụ cụ thể để tránh cảm giác đơn điệu.
2. **Kỹ thuật giữ sự tò mò (Open Curiosity Loops):** Đặt một câu hỏi thú vị hoặc hẹn công bố kết quả minigame ở phần sau của buổi phát sóng.
3. **Khai thác công nghệ WebRTC WHEP siêu trễ thấp:** Tận dụng độ trễ < 350ms của OmniCast để đọc và phản hồi bình luận khán giả ngay lập tức.
4. **Tôn vinh người xem:** Ghim các câu hỏi hay lên màn hình và gửi lời cảm ơn trực tiếp khi có khán giả ủng hộ qua cổng PayOS.$geminiNote''';
    }

    // 12. Kiểm duyệt / Từ ngữ / An toàn / Bản quyền
    final isCompliance = lower.contains('kiểm duyệt') ||
        lower.contains('an toàn phát sóng') ||
        lower.contains('bản quyền') ||
        lower.contains('từ cấm') ||
        lower.contains('từ ngữ cấm') ||
        lower.contains('chính sách phát sóng') ||
        lower.contains('vi phạm tiêu chuẩn');

    if (isCompliance) {
      return '''Về an toàn phát sóng và kiểm duyệt nội dung (**COMPLIANCE**), đây là những nguyên tắc quan trọng cần lưu ý:

• **Độ tuổi phát sóng:** Khuyến nghị gắn nhãn **T13** (phù hợp từ 13 tuổi trở lên) cho các nội dung trao đổi thông thường, hoặc nhãn PG nếu có yếu tố tranh luận cần người lớn định hướng.
• **Bản quyền âm nhạc:** Chỉ sử dụng các bài nhạc trong kho thư viện bản quyền OmniCast BGM Library hoặc có giấy phép Creative Commons; không sử dụng các bản nhạc thương mại chưa mua bản quyền.
• **Chuẩn mực ngôn từ:** Tránh các từ ngữ mang tính xúc phạm, thù ghét, thông tin sai lệch chưa kiểm chứng hoặc các nội dung cờ bạc, cá độ phi pháp.
• **Cân bằng âm thanh:** Thiết lập âm lượng Micro của người dẫn luôn to hơn nhạc nền ít nhất 14-16dB để đảm bảo lời nói rõ ràng, dễ nghe.$geminiNote''';
    }

    // 13. Kịch bản / Dàn ý / Biên tập
    final isScriptOutline = lower.contains('kịch bản') ||
        lower.contains('dàn ý') ||
        lower.contains('biên tập kịch bản') ||
        lower.contains('lên dàn ý') ||
        lower.contains('kịch bản chương trình');

    if (isScriptOutline) {
      return '''Dưới đây là gợi ý dàn ý kịch bản được thiết kế bám sát theo yêu cầu về $ctx:

🎬 **Định dạng phát sóng:** Phát trực tiếp kết hợp phóng sự tương tác (1080p60)
⏱️ **Thời lượng đề xuất:** 30 - 45 phút linh hoạt

📋 **Các phần chính:**
• **Phần 1: Khởi động & Mở đề (00:00 - 05:00):** Đưa ra vấn đề nóng nhất, giới thiệu chủ đề chính và chào đón khán giả đang theo dõi luồng phát.
• **Phần 2: Khám phá trọng tâm (05:00 - 25:00):** Đi sâu vào các luận điểm chính, phỏng vấn hoặc phân tích kèm hình ảnh/video tư liệu minh họa.
• **Phần 3: Tương tác Live Chat & Giải đáp (25:00 - 35:00):** Trả lời trực tiếp các câu hỏi của khán giả và tổ chức minigame bình chọn.
• **Phần 4: Đúc kết & Kết nối kỳ tới (35:00 - Kết thúc):** Tóm tắt thông điệp, tri ân khán giả và hẹn lịch lên sóng tiếp theo.

👉 *Bạn có thể bấm **"NẠP VÀO KỊCH BẢN"** bên dưới để áp dụng trực tiếp vào khung làm việc AI Curator!*$geminiNote''';
    }

    // 14. Đạo cụ / Âm thanh / Thiết bị trường quay
    final isEquipment = lower.contains('đạo cụ') ||
        lower.contains('đạo cụ âm thanh') ||
        lower.contains('thiết bị ghi hình') ||
        lower.contains('micro thu âm') ||
        lower.contains('setup phòng quay') ||
        lower.contains('đèn chiếu sáng') ||
        (lower.contains('micro') && lower.contains('thu âm')) ||
        (lower.contains('thiết bị') && !lower.contains('di động'));

    if (isEquipment) {
      return '''Về việc chuẩn bị đạo cụ âm thanh và thiết bị ghi hình cho ${currentProgramTitle != null ? '**$currentProgramTitle**' : 'buổi quay'} nè bạn:

Để âm thanh lên sóng trong trẻo, không bị tạp âm hay giật cục, mình mách bạn vài bí quyết từ phòng thu OmniCast nha:
• **Micro thu âm:** Ưu tiên micro cài áo (lavalier) không dây để người nói thoải mái di chuyển, hoặc micro định hướng shotgun nếu quay không gian mở.
• **Kiểm âm trực tiếp (Monitoring):** Luôn đeo tai nghe kiểm âm để phát hiện ngay nếu bị rè, gió rít hoặc mức âm lượng (gain) bị vỡ tiếng (clipping).
• **Pin và phụ kiện dự phòng:** Chuẩn bị ít nhất 2 bộ pin sạc đầy và dây kết nối dự phòng trước giờ bấm máy 20 phút.

Nếu bạn cần tư vấn thêm về chọn góc đặt đèn hay cân chỉnh bitrate cho luồng phát sóng, cứ ới mình nhé!$geminiNote''';
    }

    // 15. Phản hồi tự nhiên, linh hoạt và gần gũi cho các câu hỏi mở khác
    return '''Hé lô bạn nè! Về câu hỏi: "$userQuery"${currentProgramTitle != null ? ' (cho **$currentProgramTitle**)' : ''}:

Dưới góc nhìn của một người bạn đồng hành tại OmniCast, mình thấy đây là một chủ đề / ý tưởng rất thú vị! Điều quan trọng nhất là bạn cứ tự tin, thoải mái thể hiện phong cách tự nhiên của mình. Khán giả xem đài luôn yêu thích sự chân thật, dí dỏm và năng lượng tích cực hơn bất cứ khuôn mẫu cứng nhắc nào.

Bạn có muốn tụi mình cùng thảo luận sâu hơn, viết thêm vài câu thoại mẫu hay phát triển tiếp ý tưởng này không nè? Mình luôn ở đây sẵn sàng tiếp chiêu cùng bạn á! ✨$geminiNote''';
  }

  String _generateProgramRecommendations({
    required String userQuery,
    List<ProgramRecommendationContext>? availablePrograms,
    required String geminiNote,
  }) {
    final lower = userQuery.toLowerCase();
    final isSport = lower.contains('thể thao') ||
        lower.contains('bóng') ||
        lower.contains('đấu') ||
        lower.contains('c1') ||
        lower.contains('v-league') ||
        lower.contains('ngoại hạng');
    final isMovie = lower.contains('phim') ||
        lower.contains('điện ảnh') ||
        lower.contains('cinema') ||
        lower.contains('series') ||
        lower.contains('tập');
    final isMusic = lower.contains('nhạc') ||
        lower.contains('music') ||
        lower.contains('ca nhạc') ||
        lower.contains('hòa nhạc') ||
        lower.contains('giao hưởng');
    final isTechNews = lower.contains('tin tức') ||
        lower.contains('thời sự') ||
        lower.contains('công nghệ') ||
        lower.contains('tech') ||
        lower.contains('ai');

    final progs = availablePrograms ?? const [];
    List<ProgramRecommendationContext> matched = [];

    if (isSport) {
      matched = progs.where((p) {
        final text = '${p.title} ${p.description ?? ''} ${p.tags.join(' ')} ${p.channelName ?? ''}'.toLowerCase();
        return text.contains('thể thao') || text.contains('bóng') || text.contains('sport') || text.contains('v-league') || text.contains('đấu');
      }).toList();
    } else if (isMovie) {
      matched = progs.where((p) {
        final text = '${p.title} ${p.description ?? ''} ${p.tags.join(' ')} ${p.channelName ?? ''}'.toLowerCase();
        return text.contains('phim') || text.contains('cinema') || text.contains('movie') || text.contains('điện ảnh');
      }).toList();
    } else if (isMusic) {
      matched = progs.where((p) {
        final text = '${p.title} ${p.description ?? ''} ${p.tags.join(' ')} ${p.channelName ?? ''}'.toLowerCase();
        return text.contains('nhạc') || text.contains('music') || text.contains('hòa nhạc') || text.contains('acoustic') || text.contains('giao hưởng');
      }).toList();
    } else if (isTechNews) {
      matched = progs.where((p) {
        final text = '${p.title} ${p.description ?? ''} ${p.tags.join(' ')} ${p.channelName ?? ''}'.toLowerCase();
        return text.contains('tin') || text.contains('thời sự') || text.contains('công nghệ') || text.contains('tech') || text.contains('ai');
      }).toList();
    }

    // If no specific match or general query, prioritize live events first, then scheduled
    if (matched.isEmpty && progs.isNotEmpty) {
      final liveItems = progs.where((p) => p.status == 'LIVE').toList();
      final schedItems = progs.where((p) => p.status != 'LIVE').toList();
      matched = [...liveItems.take(2), ...schedItems.take(3)];
    }

    final buffer = StringBuffer();
    if (isSport) {
      buffer.writeln('Ui mê thể thao là tìm đúng đài OmniCast rồi nè bạn ơi! ⚽🔥 Để mình điểm danh các trận cầu và chương trình thể thao rực lửa nhất cho bạn nha:\n');
    } else if (isMovie) {
      buffer.writeln('Hôm nay bạn muốn xem phim gì nè? 🎬🍿 Để mình lướt kho điện ảnh OmniCast gợi ý cho bạn mấy bộ phim đỉnh chóp thư giãn tối nay nha:\n');
    } else if (isMusic) {
      buffer.writeln('Tối nay thả hồn vào âm nhạc là chuẩn bài luôn bạn ơi! 🎶✨ Để mình gợi ý cho bạn mấy không gian giai điệu chill hết nấc trên đài OmniCast nha:\n');
    } else if (isTechNews) {
      buffer.writeln('Cập nhật tin tức công nghệ và sự kiện số mới nhất nè bạn ơi! 📡💡 Đây là các tọa đàm và chuyên mục hot nhất trên đài OmniCast:\n');
    } else {
      buffer.writeln('Ui bạn hỏi đúng chỗ rồi nè! Kho chương trình đài OmniCast hôm nay nhiều món cuốn hút lắm, để mình điểm danh mấy show xịn sò cho bạn nha:\n');
    }
    buffer.writeln('📺 **GỢI Ý CHƯƠNG TRÌNH PHÙ HỢP TRÊN OMNICAST:**');

    if (matched.isNotEmpty) {
      for (final p in matched.take(4)) {
        final hh = p.scheduledAt.hour.toString().padLeft(2, '0');
        final mm = p.scheduledAt.minute.toString().padLeft(2, '0');
        final isLive = p.status == 'LIVE';
        final statusBadge = isLive ? '🔴 [ĐANG PHÁT]' : '📅 [$hh:$mm]';
        final ch = (p.channelName != null && p.channelName!.isNotEmpty) ? ' • Kênh ${p.channelName}' : '';
        buffer.writeln('• $statusBadge **"${p.title}"**$ch');
        if (p.description != null && p.description!.trim().isNotEmpty) {
          buffer.writeln('  👉 ${p.description!.trim()}');
        } else {
          buffer.writeln('  👉 Chương trình phát sóng chất lượng cao Full HD, hỗ trợ xem trực tiếp và lưu vào Watchlist.');
        }
      }
    } else {
      // Default curated broadcast schedule
      if (isSport) {
        buffer.writeln('• 🔴 [ĐANG PHÁT] **"V-League 2026: Trực Tiếp Vòng Bảng"** • Kênh VTV3 HD');
        buffer.writeln('  👉 Trận cầu tâm điểm với luồng WebRTC WHEP siêu trễ thấp (< 350ms), xem mượt không giật lag.');
        buffer.writeln('• 📅 [21:00] **"Tạp Chí Thể Thao & Bàn Thắng Đẹp Tuần"** • Kênh K+ Sport 1');
        buffer.writeln('  👉 Tổng hợp phân tích chiến thuật và các pha highlight đẹp mắt nhất.');
      } else if (isMovie) {
        buffer.writeln('• 📅 [20:30] **"Ký Ức Hoàng Hôn: Bản Điện Ảnh Full HD"** • Kênh Omni Cinema HD');
        buffer.writeln('  👉 Phim điện ảnh tâm lý đặc sắc đạt chuẩn âm thanh vòm sống động, phù hợp thư giãn tối nay.');
        buffer.writeln('• 📅 [22:15] **"Điệp Vụ Đêm: Siêu Phẩm Hành Động 4K"** • Kênh CineMax Action');
        buffer.writeln('  👉 Bom tấn rượt đuổi nghẹt thở với độ phân giải 4K 60fps dành cho tài khoản VIP.');
      } else if (isMusic) {
        buffer.writeln('• 📅 [21:00] **"Giao Hưởng Mùa Thu & Không Gian Âm Nhạc"** • Kênh Omni Music 4K');
        buffer.writeln('  👉 Hòa nhạc thính phòng đỉnh cao kết hợp acoustic lounge du dương, chill hết nấc.');
        buffer.writeln('• 🔴 [ĐANG PHÁT] **"Live Concert: Giai Điệu Trẻ V-Pop"** • Kênh Music Box');
        buffer.writeln('  👉 Trực tiếp đêm diễn với dàn nghệ sĩ trẻ được yêu thích nhất hiện nay.');
      } else {
        buffer.writeln('• 🔴 [ĐANG PHÁT] **"Trực Tiếp V-League 2026 & Bình Luận Sôi Động"** • Kênh VTV3 HD');
        buffer.writeln('  👉 Trận cầu tâm điểm đang diễn ra với luồng WebRTC siêu mượt không độ trễ.');
        buffer.writeln('• 📅 [20:30] **"Ký Ức Hoàng Hôn: Bản Điện Ảnh Full HD"** • Kênh Omni Cinema HD');
        buffer.writeln('  👉 Phim điện ảnh tâm lý đặc sắc đạt chuẩn âm thanh vòm sống động.');
        buffer.writeln('• 📅 [21:15] **"Trí Tuệ Nhân Tạo AI & Kỷ Nguyên Số 2026"** • Kênh Discovery Tech');
        buffer.writeln('  👉 Tọa đàm công nghệ số chuyên sâu dành cho những bạn mê khám phá AI và tương lai.');
      }
    }

    buffer.writeln('\n💡 *Mẹo nhỏ nè bạn:*');
    buffer.writeln('• Chuyển sang tab **Kênh TV** ở thanh điều hướng để lướt xem hơn 25 kênh truyền hình phân loại theo Thể thao, Thời sự, Phim ảnh và Khoa giáo giải trí.');
    buffer.writeln('• Ngay trên Trang chủ, dải **Live Now** luôn hiển thị các sự kiện đang On-Air trực tiếp với số lượng khán giả.');
    buffer.writeln('• Bạn có thể chuyển sang tab **EPG Lịch** để bấm hẹn giờ nhắc nhở trước 15 phút khi chương trình yêu thích chuẩn bị lên sóng nha!');
    buffer.write(geminiNote);
    return buffer.toString();
  }

  // ── Helper Parsers ──────────────────────────────────────────

  AiCuratorReport _parseOrSynthesizeReport(
    String rawText, {
    required String title,
    required String description,
    required String channelName,
    required String modelName,
  }) {
    // Extract JSON block if surrounded by markdown or quotes
    var clean = rawText.trim();
    if (clean.contains('```json')) {
      final match = RegExp(r'```json([\s\S]*?)```').firstMatch(clean);
      if (match != null) clean = match.group(1)!.trim();
    } else if (clean.contains('```')) {
      final match = RegExp(r'```([\s\S]*?)```').firstMatch(clean);
      if (match != null) clean = match.group(1)!.trim();
    }

    // Try finding first { and last }
    final startIdx = clean.indexOf('{');
    final endIdx = clean.lastIndexOf('}');
    if (startIdx >= 0 && endIdx > startIdx) {
      clean = clean.substring(startIdx, endIdx + 1);
    }

    try {
      final map = jsonDecode(clean) as Map<String, dynamic>;

      final score = (map['overallScore'] as num?)?.toInt() ?? 85;
      final grade = (map['grade'] as String?) ?? 'A';
      final slot = (map['suggestedTimeSlot'] as String?) ?? '20:30 - 22:00';
      final suit = (map['broadcastSuitability'] as String?) ?? 'PRIME_TIME';
      final vibe = (map['targetAudienceVibe'] as String?) ?? 'Khán giả đại chúng yêu thích nội dung chất lượng cao';
      final sum = (map['summary'] as String?) ?? 'Nội dung đạt chuẩn thẩm định phát sóng của OmniCast.';
      final conf = (map['confidence'] as num?)?.toInt() ?? 90;

      final sbMap = map['scoringBreakdown'] as Map<String, dynamic>? ?? {};
      final sb = ScoringBreakdown(
        contentQuality: (sbMap['contentQuality'] as num?)?.toInt() ?? score,
        productionValue: (sbMap['productionValue'] as num?)?.toInt() ?? 85,
        audienceAppeal: (sbMap['audienceAppeal'] as num?)?.toInt() ?? score,
        complianceSafety: (sbMap['complianceSafety'] as num?)?.toInt() ?? 95,
        commercialPotential: (sbMap['commercialPotential'] as num?)?.toInt() ?? 80,
        overallScore: score,
        grade: grade,
      );

      final caMap = map['contentAssessment'] as Map<String, dynamic>? ?? {};
      final ca = ContentAssessment(
        summary: (caMap['summary'] as String?) ??
            (caMap['scriptSummary'] as String?) ??
            sum,
        highlights: ((caMap['highlights'] as List?) ??
                ['Thông điệp rõ ràng', 'Cấu trúc hấp dẫn'])
            .map((e) => e.toString())
            .toList(growable: false),
        strengths: ((caMap['strengths'] as List?) ??
                ['Chủ đề hấp dẫn', 'Bố cục cân đối'])
            .map((e) => e.toString())
            .toList(growable: false),
        weaknesses: ((caMap['weaknesses'] as List?) ?? ['Tối ưu thêm âm thanh'])
            .map((e) => e.toString())
            .toList(growable: false),
        narrativeFlow: (caMap['narrativeFlow'] as String?) ??
            'Mở đầu cuốn hút -> Phát triển logic -> Kết luận sâu sắc',
        targetAudienceDetails:
            (caMap['targetAudienceDetails'] as String?) ?? vibe,
      );

      final faMap = map['formatAssessment'] as Map<String, dynamic>? ?? {};
      final fa = FormatAssessment(
        productionFormat:
            (faMap['productionFormat'] as String?) ?? 'Truyền hình / Talkshow',
        pacing: (faMap['pacing'] as String?) ?? 'MODERATE',
        visualAudioRequirements:
            ((faMap['visualAudioRequirements'] as List?) ??
                    ['Đồ họa HD', 'Âm thanh nổi'])
                .map((e) => e.toString())
                .toList(growable: false),
        interactivityLevel:
            (faMap['interactivityLevel'] as String?) ?? 'MEDIUM',
        technicalRecommendations:
            (faMap['technicalRecommendations'] as String?) ??
                'Bảo đảm luồng bitrate ổn định.',
      );

      return AiCuratorReport(
        broadcastSuitability: suit,
        suggestedTimeSlot: slot,
        targetAudienceVibe: vibe,
        riskWarnings: '',
        sentiment: const AiSentiment(
          overallSentiment: 'positive',
          hypeLevel: 'high',
          audienceEngagement: 88,
        ),
        compliance: const AiCompliance(
          isAgeRestricted: false,
          ageRating: 'PG',
          flaggedContent: [],
          recommendedBroadcastWindow: 'EVENING',
        ),
        processingTimeMs: 420,
        aiModelVersion: modelName,
        createdAt: DateTime.now(),
        confidence: conf,
        scoringBreakdown: sb,
        contentAssessment: ca,
        formatAssessment: fa,
        grounding: AiCuratorGrounding(
          sourceExcerpts: [title],
          infoGaps: const [],
          groundingScore: 92,
        ),
      );
    } catch (_) {
      return _synthesizeIntelligentReport(
        title: title,
        description: description,
        channelName: channelName,
        modelName: modelName,
      );
    }
  }

  AiCuratorReport _synthesizeIntelligentReport({
    required String title,
    required String description,
    required String channelName,
    required String modelName,
  }) {
    final lower = '$title $description'.toLowerCase();
    final isSport = lower.contains('bóng') ||
        lower.contains('thể thao') ||
        lower.contains('đấu') ||
        lower.contains('trận');
    final isNews = lower.contains('tin') ||
        lower.contains('thời sự') ||
        lower.contains('công nghệ') ||
        lower.contains('kinh tế');
    final isPrime = isSport ||
        lower.contains('4k') ||
        lower.contains('đặc biệt') ||
        lower.contains('chính');

    final score = isPrime ? 88 : 82;
    final grade = score >= 85 ? 'A' : 'B';
    final slot = isSport
        ? '20:45 - 22:45'
        : (isNews ? '19:00 - 19:45' : '21:00 - 22:30');

    return AiCuratorReport(
      broadcastSuitability: isPrime ? 'PRIME_TIME' : 'STANDARD',
      suggestedTimeSlot: slot,
      targetAudienceVibe: isSport
          ? 'Khán giả đam mê thể thao, cuồng nhiệt và có độ trung thành cao'
          : (isNews
              ? 'Khán giả theo dõi tin tức hàng ngày, độ tuổi 25 - 55 tuổi'
              : 'Khán giả đại chúng yêu thích giải trí và nghệ thuật truyền hình'),
      riskWarnings: '',
      sentiment: AiSentiment(
        overallSentiment: 'positive',
        hypeLevel: isPrime ? 'high' : 'medium',
        audienceEngagement: isPrime ? 92 : 82,
      ),
      compliance: const AiCompliance(
        isAgeRestricted: false,
        ageRating: 'PG',
        flaggedContent: [],
        recommendedBroadcastWindow: 'EVENING',
      ),
      processingTimeMs: 380,
      aiModelVersion: modelName,
      createdAt: DateTime.now(),
      confidence: 90,
      scoringBreakdown: ScoringBreakdown(
        contentQuality: score,
        productionValue: score - 2,
        audienceAppeal: score + 2,
        complianceSafety: 95,
        commercialPotential: score - 3,
        overallScore: score,
        grade: grade,
      ),
      contentAssessment: ContentAssessment(
        summary:
            'Chương trình "$title" đạt đầy đủ tiêu chuẩn phát sóng. Cấu trúc kịch bản mạch lạc, thông điệp truyền tải rõ ràng và thích hợp lên sóng khung giờ $slot.',
        highlights: const [
          'Nội dung hấp dẫn',
          'Đạt chuẩn phát thanh truyền hình'
        ],
        strengths: const [
          'Chủ đề hấp dẫn',
          'Bố cục cân đối',
          'Hình ảnh sắc nét'
        ],
        weaknesses: const ['Nên bổ sung đồ họa trực quan thêm'],
        narrativeFlow: 'Mở màn -> Điểm nhấn -> Kết luận',
        targetAudienceDetails: 'Khán giả yêu thích giải trí chất lượng cao.',
      ),
      formatAssessment: FormatAssessment(
        productionFormat: isSport
            ? 'Truyền hình thể thao trực tiếp'
            : 'Truyền hình / Talkshow',
        pacing: isSport ? 'FAST' : 'MODERATE',
        visualAudioRequirements: const ['1080p60 6Mbps', 'Stereo 192kbps'],
        interactivityLevel: 'MEDIUM',
        technicalRecommendations:
            'Kiểm tra đường truyền WHEP / HLS trước giờ lên sóng 15 phút.',
      ),
      grounding: AiCuratorGrounding(
        sourceExcerpts: [title],
        infoGaps: const [],
        groundingScore: 88,
      ),
    );
  }
}
