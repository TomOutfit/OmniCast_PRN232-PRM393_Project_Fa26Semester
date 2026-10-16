// OmniCast - i18n Strings
// Lightweight translation table shared across the app.

import 'package:flutter/widgets.dart';

enum AppLocale {
  vi('vi', 'Tiếng Việt'),
  en('en', 'English');

  final String code;
  final String label;
  const AppLocale(this.code, this.label);

  static AppLocale fromCode(String? code) {
    if (code == 'en') return AppLocale.en;
    return AppLocale.vi;
  }

  Locale toFlutterLocale() => Locale(code);
}

class AppStrings {
  static const Map<String, Map<String, String>> _table = {
    // Common
    'common.search': {'vi': 'Tìm kiếm chương trình...', 'en': 'Search programs...'},
    'common.cancel': {'vi': 'Hủy', 'en': 'Cancel'},
    'common.confirm': {'vi': 'Xác nhận', 'en': 'Confirm'},
    'common.save': {'vi': 'Lưu', 'en': 'Save'},
    'common.loading': {'vi': 'Đang tải...', 'en': 'Loading...'},
    'common.retry': {'vi': 'Thử lại', 'en': 'Retry'},
    'common.empty': {'vi': 'Không có dữ liệu', 'en': 'No data'},

    // Nav
    'nav.home': {'vi': 'Trang chủ', 'en': 'Home'},
    'nav.epg': {'vi': 'Lịch phát sóng', 'en': 'Schedule'},
    'nav.search': {'vi': 'Tìm kiếm', 'en': 'Search'},
    'nav.channels': {'vi': 'Kênh', 'en': 'Channels'},
    'nav.watchlist': {'vi': 'Yêu thích', 'en': 'Watchlist'},
    'nav.recordings': {'vi': 'VOD', 'en': 'VOD'},

    // Recordings / VOD library
    'recordings.title': {'vi': 'Thư viện VOD', 'en': 'VOD library'},
    'recordings.subtitle': {
      'vi': 'Xem lại các chương trình, podcast và video đã phát sóng trên OmniCast.',
      'en': 'Replay programs, podcasts and videos that aired on OmniCast.',
    },
    'recordings.searchHint': {
      'vi': 'Tìm kiếm VOD...',
      'en': 'Search VOD...',
    },
    'recordings.filterAll': {'vi': 'Tất cả', 'en': 'All'},
    'recordings.featured': {
      'vi': 'Nội dung nổi bật',
      'en': 'Featured',
    },
    'recordings.empty': {
      'vi': 'Không tìm thấy VOD phù hợp',
      'en': 'No VOD found',
    },
    'recordings.emptyHint': {
      'vi': 'Thử đổi bộ lọc hoặc từ khóa khác.',
      'en': 'Try a different filter or keyword.',
    },
    'recordings.clearFilters': {'vi': 'Xóa bộ lọc', 'en': 'Clear filters'},
    'recordings.resultsCount': {'vi': 'kết quả', 'en': 'results'},
    'recordings.pageOf': {'vi': 'Trang', 'en': 'Page'},
    'recordings.badge.featured': {'vi': 'Nổi bật', 'en': 'Featured'},
    'recordings.badge.age18': {'vi': '18+', 'en': '18+'},
    'recordings.badge.vod': {'vi': 'VOD', 'en': 'VOD'},
    'recordings.duration.format': {
      'vi': 'phút',
      'en': 'min',
    },

    // Recording detail
    'recording.description': {'vi': 'Mô tả', 'en': 'Description'},
    'recording.tags': {'vi': 'Thẻ', 'en': 'Tags'},
    'recording.source': {'vi': 'Nguồn', 'en': 'Source'},
    'recording.related': {
      'vi': 'Video liên quan',
      'en': 'Related videos',
    },
    'recording.action.save': {'vi': 'Lưu', 'en': 'Save'},
    'recording.action.share': {'vi': 'Chia sẻ', 'en': 'Share'},
    'recording.action.viewChannel': {'vi': 'Xem kênh', 'en': 'View channel'},
    'recording.stats.views': {'vi': 'lượt xem', 'en': 'views'},
    'recording.stats.likes': {'vi': 'thích', 'en': 'likes'},
    'recording.stats.comments': {'vi': 'bình luận', 'en': 'comments'},
    'recording.stats.shares': {'vi': 'chia sẻ', 'en': 'shares'},
    'recording.noDescription': {
      'vi': 'Chưa có mô tả.',
      'en': 'No description yet.',
    },

    // Settings
    'settings.title': {'vi': 'Cài đặt', 'en': 'Settings'},
    'settings.appearance': {'vi': 'Giao diện', 'en': 'Appearance'},
    'settings.notifications': {'vi': 'Thông báo', 'en': 'Notifications'},
    'settings.account': {'vi': 'Tài khoản', 'en': 'Account'},
    'settings.theme.label': {'vi': 'Chế độ hiển thị', 'en': 'Display mode'},
    'settings.theme.light': {'vi': 'Sáng', 'en': 'Light'},
    'settings.theme.dark': {'vi': 'Tối', 'en': 'Dark'},
    'settings.theme.system': {'vi': 'Theo hệ thống', 'en': 'System'},
    'settings.language.label': {'vi': 'Ngôn ngữ', 'en': 'Language'},
    'settings.notifications.push':
        {'vi': 'Thông báo đẩy', 'en': 'Push notifications'},
    'settings.notifications.email':
        {'vi': 'Thông báo qua email', 'en': 'Email notifications'},
    'settings.notifications.live':
        {'vi': 'Thông báo khi kênh phát trực tiếp', 'en': 'Notify on live streams'},
    'settings.dataSaver': {'vi': 'Tiết kiệm dữ liệu', 'en': 'Data saver'},

    // Onboarding
    'onboarding.skip': {'vi': 'Bỏ qua', 'en': 'Skip'},
    'onboarding.next': {'vi': 'Tiếp tục', 'en': 'Next'},
    'onboarding.done': {'vi': 'Bắt đầu', 'en': 'Get started'},
    'onboarding.step1.title':
        {'vi': 'Chương trình trực tiếp', 'en': 'Live programs'},
    'onboarding.step1.desc': {
      'vi': 'Theo dõi 25 kênh phát sóng trực tiếp từ khắp nơi trên thế giới.',
      'en': 'Watch 25 channels broadcasting live from around the world.',
    },
    'onboarding.step2.title':
        {'vi': 'Cá nhân hoá trải nghiệm', 'en': 'Personalize your experience'},
    'onboarding.step2.desc': {
      'vi': 'Theo dõi kênh yêu thích và nhận thông báo khi có chương trình mới.',
      'en': 'Follow your favorite channels and get notified about new shows.',
    },
    'onboarding.step3.title':
        {'vi': 'Xem mọi lúc mọi nơi', 'en': 'Watch anywhere, anytime'},
    'onboarding.step3.desc': {
      'vi': 'Tiếp tục xem trên mọi thiết bị, hỗ trợ HLS và tải về offline.',
      'en': 'Continue watching on any device with HLS support and offline downloads.',
    },

    // Continue watching
    'continueWatching.title':
        {'vi': 'Tiếp tục xem', 'en': 'Continue watching'},
    'continueWatching.empty': {
      'vi': 'Bạn chưa có chương trình nào đang xem dở.',
      'en': 'Nothing in progress yet.',
    },

    // Notifications
    'notifications.title': {'vi': 'Thông báo', 'en': 'Notifications'},
    'notifications.empty':
        {'vi': 'Bạn chưa có thông báo nào.', 'en': 'You have no notifications.'},
    'notifications.markAllRead': {
      'vi': 'Đánh dấu tất cả đã đọc',
      'en': 'Mark all as read',
    },

    // Premium / billing
    'premium.title': {'vi': 'Gói Premium', 'en': 'Premium plans'},
    'premium.choosePlan': {
      'vi': 'Chọn gói phù hợp với bạn',
      'en': 'Choose a plan that fits you',
    },
    'premium.upgrade': {'vi': 'Nâng cấp ngay', 'en': 'Upgrade now'},
    'billing.title':
        {'vi': 'Lịch sử thanh toán', 'en': 'Billing history'},
    'billing.empty':
        {'vi': 'Chưa có giao dịch nào.', 'en': 'No transactions yet.'},

    // Auth
    'auth.login.title': {'vi': 'Đăng nhập', 'en': 'Sign in'},
    'auth.register.title': {'vi': 'Đăng ký tài khoản', 'en': 'Create an account'},
    'auth.email': {'vi': 'Email', 'en': 'Email'},
    'auth.password': {'vi': 'Mật khẩu', 'en': 'Password'},
    'auth.fullName': {'vi': 'Họ và tên', 'en': 'Full name'},
    'auth.confirmPassword':
        {'vi': 'Xác nhận mật khẩu', 'en': 'Confirm password'},
    'auth.noAccount': {'vi': 'Chưa có tài khoản?', 'en': "Don't have an account?"},
    'auth.haveAccount':
        {'vi': 'Đã có tài khoản?', 'en': 'Already have an account?'},
    'auth.goRegister': {'vi': 'Đăng ký ngay', 'en': 'Sign up'},
    'auth.goLogin': {'vi': 'Đăng nhập ngay', 'en': 'Sign in'},

    // Reviews
    'reviews.title': {'vi': 'Đánh giá', 'en': 'Reviews'},
    'reviews.empty':
        {'vi': 'Chưa có đánh giá nào.', 'en': 'No reviews yet.'},
    'reviews.submit': {'vi': 'Gửi đánh giá', 'en': 'Submit review'},
    'reviews.writePlaceholder':
        {'vi': 'Chia sẻ trải nghiệm của bạn...', 'en': 'Share your experience...'},

    // AI Curator Studio (Staff/Admin)
    'curator.pageTitle': {'vi': 'AI Curator Studio', 'en': 'AI Curator Studio'},
    'curator.pageSubtitle': {
      'vi': '3-AGENT CONTENT ANALYSIS // STAFF ONLY',
      'en': '3-AGENT CONTENT ANALYSIS // STAFF ONLY',
    },
    'curator.accessDeniedAppBar': {'vi': 'AI Curator', 'en': 'AI Curator'},

    // Tabs
    'curator.analyzeTab': {'vi': 'Phân tích mới', 'en': 'New analysis'},
    'curator.applyTab': {'vi': 'Áp dụng đề xuất', 'en': 'Apply suggestions'},
    'curator.curateExistingTab': {
      'vi': 'Phân tích có sẵn',
      'en': 'Curate existing',
    },

    // Curate-existing
    'curator.emptyCurateExisting': {
      'vi': 'Chưa có chương trình nào đang chờ phân tích',
      'en': 'No programs waiting for analysis',
    },
    'curator.emptyCurateExistingHint': {
      'vi': 'Các chương trình ở trạng thái SCHEDULED sẽ xuất hiện tại đây.',
      'en': 'Programs in SCHEDULED status will appear here.',
    },
    'curator.runAnalysisBtn': {
      'vi': 'Phân tích AI',
      'en': 'Run AI',
    },
    'curator.curatingProgram': {
      'vi': 'Đang phân tích "{title}"...',
      'en': 'Analyzing "{title}"...',
    },
    'curator.confidenceLabel': {
      'vi': 'Độ tin cậy',
      'en': 'Confidence',
    },
    'curator.confidencePercent': {
      'vi': 'Độ tin cậy: {value}%',
      'en': 'Confidence: {value}%',
    },

    // Preview header
    'curator.newAnalysisHeader': {
      'vi': 'Phân tích nội dung với AI',
      'en': 'AI content analysis',
    },
    'curator.threeAgentHint': {
      'vi': '3-Agent pipeline: Sentiment · Compliance · Editorial',
      'en': '3-Agent pipeline: Sentiment · Compliance · Editorial',
    },

    // Form fields
    'curator.titleFieldLabel': {
      'vi': 'Tiêu đề chương trình',
      'en': 'Program title',
    },
    'curator.titleHint': {
      'vi': 'VD: Chung kết World Cup 2026',
      'en': 'e.g. World Cup 2026 Final',
    },
    'curator.descriptionFieldLabel': {
      'vi': 'Mô tả (tùy chọn)',
      'en': 'Description (optional)',
    },
    'curator.descriptionHint': {
      'vi': 'Mô tả chi tiết về nội dung...',
      'en': 'Detailed description of the content...',
    },
    'curator.channelFieldLabel': {
      'vi': 'Tên kênh (tùy chọn)',
      'en': 'Channel name (optional)',
    },
    'curator.channelHint': {'vi': 'VD: VTV3 HD', 'en': 'e.g. Sports HD'},

    // Buttons
    'curator.runAnalysisButton': {
      'vi': 'CHẠY PHÂN TÍCH VỚI AI',
      'en': 'RUN AI ANALYSIS',
    },
    'curator.analyzingButton': {
      'vi': 'ĐANG PHÂN TÍCH...',
      'en': 'ANALYZING...',
    },
    'curator.applySuggestionButton': {
      'vi': 'ÁP DỤNG ĐỀ XUẤT',
      'en': 'APPLY SUGGESTION',
    },
    'curator.applySuggestionToProgram': {
      'vi': 'ÁP DỤNG ĐỀ XUẤT LÊN CHƯƠNG TRÌNH',
      'en': 'APPLY SUGGESTION TO PROGRAM',
    },
    'curator.applyingButton': {
      'vi': 'ĐANG ÁP DỤNG...',
      'en': 'APPLYING...',
    },

    // Errors
    'curator.errorTitleRequired': {
      'vi': 'Tiêu đề là bắt buộc.',
      'en': 'Title is required.',
    },
    'curator.errorUnknown': {
      'vi': 'Lỗi không xác định: {error}',
      'en': 'Unknown error: {error}',
    },
    'curator.errorApply': {
      'vi': 'Lỗi khi áp dụng: {error}',
      'en': 'Error applying: {error}',
    },
    'curator.errorLoadHistory': {
      'vi': 'Không tải được lịch sử: {error}',
      'en': 'Could not load history: {error}',
    },

    // Apply tab
    'curator.runAnalysisFirst': {
      'vi':
          'Chạy "Phân tích mới" trước để có kết quả AI, sau đó quay lại tab này để áp dụng.',
      'en':
          'Run "New analysis" first to get AI results, then return to this tab to apply.',
    },
    'curator.emptyApply': {
      'vi': 'Không có chương trình nào để áp dụng',
      'en': 'No programs to apply to',
    },
    'curator.emptyApplyHint': {
      'vi':
          'Chạy "Phân tích mới" trước để có kết quả AI, sau đó chọn chương trình tại đây.',
      'en':
          'Run "New analysis" first to get AI results, then pick a program here.',
    },
    'curator.selectProgram': {
      'vi': 'CHỌN CHƯƠNG TRÌNH',
      'en': 'SELECT PROGRAM',
    },
    'curator.selectProgramHint': {
      'vi': 'Chọn chương trình...',
      'en': 'Select program...',
    },
    'curator.applySuccess': {
      'vi': 'Đã áp dụng đề xuất lên "{title}"',
      'en': 'Applied suggestion to "{title}"',
    },
    'curator.applyWithSuggestion': {
      'vi':
          'Áp dụng "{slot}" + mô tả AI lên "{title}"?',
      'en':
          'Apply "{slot}" + AI description to "{title}"?',
    },

    // Result summary
    'curator.aiResultLabel': {'vi': 'Kết quả AI', 'en': 'AI Result'},
    'curator.analysisOverview': {
      'vi': 'TỔNG QUAN PHÂN TÍCH',
      'en': 'ANALYSIS OVERVIEW',
    },
    'curator.timeSlot': {'vi': 'Khung giờ', 'en': 'Time slot'},
    'curator.engagement': {'vi': 'Tương tác', 'en': 'Engagement'},
    'curator.broadcastWindow': {'vi': 'Khung phát', 'en': 'Broadcast window'},
    'curator.ageLimit': {'vi': 'Giới hạn độ tuổi', 'en': 'Age limit'},
    'curator.recommendedSlot': {
      'vi': 'Khung giờ đề xuất: {slot}',
      'en': 'Recommended slot: {slot}',
    },
    'curator.slotWithValue': {
      'vi': 'Khung giờ: {slot}',
      'en': 'Time slot: {slot}',
    },
    'curator.audienceWithValue': {
      'vi': 'Đối tượng: {audience}',
      'en': 'Audience: {audience}',
    },

    // Suitability card
    'curator.broadcastSuitability': {
      'vi': 'KHẢ NĂNG PHÁT SÓNG',
      'en': 'BROADCAST SUITABILITY',
    },

    // Sentiment card
    'curator.sentimentAnalysis': {
      'vi': 'PHÂN TÍCH TÌNH CẢM',
      'en': 'SENTIMENT ANALYSIS',
    },
    'curator.emotion': {'vi': 'Cảm xúc', 'en': 'Emotion'},
    'curator.hypeLevel': {'vi': 'Mức hype', 'en': 'Hype level'},

    // Compliance card
    'curator.complianceAssessment': {
      'vi': 'ĐÁNH GIÁ TUÂN THỦ',
      'en': 'COMPLIANCE ASSESSMENT',
    },
    'curator.broadcastLabel': {
      'vi': 'Phát: {window}',
      'en': 'Broadcast: {window}',
    },

    // Risk warning
    'curator.warning': {'vi': 'CẢNH BÁO', 'en': 'WARNING'},

    // History
    'curator.historyReports': {
      'vi': 'LỊCH SỬ BÁO CÁO',
      'en': 'REPORT HISTORY',
    },
    'curator.emptyHistory': {
      'vi': 'Chưa có báo cáo nào cho chương trình này.',
      'en': 'No reports for this program yet.',
    },
    'curator.historyMeta': {
      'vi': '{model} · {ms}ms · {tokens} tokens',
      'en': '{model} · {ms}ms · {tokens} tokens',
    },

    // Access denied
    'curator.accessDeniedTitle': {
      'vi': 'TRUY CẬP BỊ TỪ CHỐI',
      'en': 'ACCESS DENIED',
    },
    'curator.accessDeniedMessage': {
      'vi':
          'Tính năng AI Curator phân tích nội dung chỉ dành riêng cho tài khoản Quản trị & Điều hành phát sóng.',
      'en':
          'AI Curator content analysis is restricted to Admin & Broadcast operations accounts.',
    },

    // Info dialog
    'curator.infoTitle': {'vi': 'AI Curator Studio', 'en': 'AI Curator Studio'},
    'curator.infoContent': {
      'vi':
          'AI Curator sử dụng 3-agent pipeline để phân tích nội dung:\n\n'
          '1. Sentiment Agent — đánh giá tình cảm & hype\n'
          '2. Compliance Agent — kiểm tra giới hạn độ tuổi\n'
          '3. Editorial Agent — đề xuất khung giờ & đối tượng\n\n'
          'Dùng cho Staff/Admin để phê duyệt và tối ưu lịch phát sóng.',
      'en':
          'AI Curator uses a 3-agent pipeline to analyze content:\n\n'
          '1. Sentiment Agent — assesses sentiment & hype\n'
          '2. Compliance Agent — checks age restrictions\n'
          '3. Editorial Agent — recommends time slots & audience\n\n'
          'Used by Staff/Admin to approve and optimize broadcast schedules.',
    },
    'curator.close': {'vi': 'Đóng', 'en': 'Close'},

    // Suitability enum mapping
    'curator.suitability.primeTime': {
      'vi': '★ Giờ vàng',
      'en': '★ Prime time',
    },
    'curator.suitability.restricted': {
      'vi': '⚠ Hạn chế',
      'en': '⚠ Restricted',
    },
    'curator.suitability.standard': {
      'vi': '◆ Phát thường',
      'en': '◆ Standard',
    },

    // Sentiment enum mapping
    'curator.sentiment.positive': {
      'vi': 'Tích cực',
      'en': 'Positive',
    },
    'curator.sentiment.negative': {
      'vi': 'Tiêu cực',
      'en': 'Negative',
    },
    'curator.sentiment.neutral': {
      'vi': 'Trung lập',
      'en': 'Neutral',
    },

    // Broadcast window enum mapping
    'curator.window.day': {'vi': 'Ban ngày', 'en': 'Daytime'},
    'curator.window.evening': {'vi': 'Buổi tối', 'en': 'Evening'},
    'curator.window.lateNight': {'vi': 'Đêm khuya', 'en': 'Late night'},
  };

  static String t(String key, AppLocale locale, {String? fallback}) {
    final row = _table[key];
    if (row == null) return fallback ?? key;
    final value = row[locale.code];
    if (value != null) return value;
    final vi = row['vi'];
    if (vi != null) return vi;
    return fallback ?? key;
  }
}
