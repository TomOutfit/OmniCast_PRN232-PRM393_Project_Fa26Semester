// OmniCast - Error Utilities
// Friendly Vietnamese error parsing for DioException and general errors.

import 'package:dio/dio.dart';

class ErrorUtils {
  static String parseError(dynamic error, {String? defaultMsg}) {
    if (error is DioException) {
      if (error.response != null) {
        final status = error.response!.statusCode;
        final data = error.response!.data;

        if (data is Map && data['message'] != null) {
          final msg = data['message'];
          if (msg is String && msg.isNotEmpty) {
            return msg;
          } else if (msg is List && msg.isNotEmpty) {
            return msg.first.toString();
          }
        }

        switch (status) {
          case 400:
            return 'Yêu cầu không hợp lệ. Vui lòng thử lại.';
          case 401:
            return 'Phiên làm việc hết hạn. Vui lòng đăng nhập lại.';
          case 403:
            return 'Bạn không có quyền thực hiện thao tác này.';
          case 404:
            return 'Không tìm thấy dữ liệu từ máy chủ.';
          case 409:
            return 'Dữ liệu đã tồn tại hoặc có xung đột.';
          case 429:
            return 'Thao tác quá nhanh. Vui lòng đợi trong giây lát.';
          case 500:
          case 502:
          case 503:
          case 504:
            return 'Máy chủ gặp sự cố tạm thời (mã $status). Vui lòng thử lại sau.';
          default:
            return 'Máy chủ phản hồi lỗi (mã $status).';
        }
      }

      switch (error.type) {
        case DioExceptionType.connectionTimeout:
        case DioExceptionType.sendTimeout:
        case DioExceptionType.receiveTimeout:
          return 'Kết nối mạng quá thời gian chờ. Vui lòng thử lại.';
        case DioExceptionType.connectionError:
          return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra Internet.';
        case DioExceptionType.cancel:
          return 'Yêu cầu đã bị hủy.';
        default:
          return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại mạng.';
      }
    }

    if (error is Exception) {
      final str = error.toString().replaceAll('Exception: ', '');
      if (str.contains('DioException')) {
        return 'Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại.';
      }
      return str;
    }

    return defaultMsg ?? 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.';
  }
}
