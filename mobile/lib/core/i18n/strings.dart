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
  };

  static String t(String key, AppLocale locale) {
    final row = _table[key];
    if (row == null) return key;
    final value = row[locale.code];
    if (value != null) return value;
    final fallback = row['vi'];
    return fallback ?? key;
  }
}
