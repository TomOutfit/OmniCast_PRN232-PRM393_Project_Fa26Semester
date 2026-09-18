# OmniCast - Frequently Asked Questions

**Project:** OmniCast Enterprise Media & Broadcast Intelligence Network  
**Version:** 5.0  
**Last Updated:** 2026

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Tài khoản & Đăng nhập](#2-tài-khoản--đăng-nhập)
3. [EPG & Lịch phát sóng](#3-epg--lịch-phát-sóng)
4. [AI Content Analysis](#4-ai-content-analysis)
5. [Ứng dụng Mobile](#5-ứng-dụng-mobile)
6. [Thông báo](#6-thông-báo)
7. [Offline Mode](#7-offline-mode)
8. [3D Features](#8-3d-features)
9. [Lỗi thường gặp](#9-lỗi-thường-gặp)
10. [Liên hệ hỗ trợ](#10-liên-hệ-hỗ-trợ)

---

## 1. Tổng quan

### 1.1 OmniCast là gì?
**OmniCast** là hệ thống quản lý broadcast đa kênh, kết hợp media intelligence với AI-powered content curation. Hệ thống hoạt động trên 4 nền tảng: Core API (NestJS), AI Service (FastAPI), Web Portal (Next.js 15), và Mobile App (Flutter).

### 1.2 OmniCast hỗ trợ những nền tảng nào?
| Nền tảng | Công nghệ | Trạng thái |
|:---|:---|:---:|
| Web Portal | Next.js 15 | ✅ Active |
| Mobile App | Flutter 3.x | ✅ Active |
| Core API | NestJS 11+ | ✅ Active |
| AI Service | FastAPI (Python) | ✅ Active |

### 1.3 Chi phí sử dụng?
**100% FREE** - Tất cả dịch vụ đều sử dụng tier miễn phí:
- **Vercel:** Web + Backend hosting
- **Supabase:** Database
- **Groq API:** AI Processing

---

## 2. Tài khoản & Đăng nhập

### 2.1 Làm sao để đăng ký tài khoản?
1. Truy cập trang đăng ký tại `/auth/register`
2. Điền thông tin: Email, Password, Full Name
3. Xác nhận email (nếu enabled)
4. Đăng nhập thành công

### 2.2 Quên mật khẩu thì làm sao?
1. Click "Forgot Password" tại trang đăng nhập
2. Nhập email đã đăng ký
3. Kiểm tra hộp thư để lấy link reset password
4. Link có hiệu lực trong 24 giờ

### 2.3 JWT Token hoạt động như thế nào?
- **Access Token:** Thời hạn 15 phút, lưu trong memory
- **Refresh Token:** Thời hạn 7 ngày, lưu trong HTTP-only cookie
- Tự động refresh khi Access Token hết hạn

### 2.4 Có thể đăng nhập từ nhiều thiết bị không?
✅ **Có** - Hệ thống hỗ trợ multi-device login. Mỗi thiết bị sẽ có refresh token riêng.

### 2.5 Các Role người dùng?

| Role ID | Tên | Quyền hạn |
|:---:|:---|:---|
| 0 | Guest | Xem EPG công khai, xem trailer (chỉ đọc) |
| 1 | Staff | CRUD channels/programs, kích hoạt AI analysis |
| 2 | Viewer | Xem EPG, tìm kiếm, watchlist, thông báo |
| 3 | Admin | Quản lý user, audit logs, giám sát hệ thống |

---

## 3. EPG & Lịch phát sóng

### 3.1 EPG là gì?
**EPG (Electronic Program Guide)** là lịch trình phát sóng điện tử, hiển thị:
- Các chương trình đang/phát sắp chiếu
- Thời gian bắt đầu và kết thúc
- Thông tin chi tiết về chương trình
- Badge "LIVE NOW" cho chương trình đang phát

### 3.2 Timeline EPG hoạt động như thế nào?
- **24-Hour Timeline:** Hiển thị lịch phát trong 24 giờ
- **Auto-scroll:** Tự động cuộn đến giờ hiện tại
- **Conflict Detection:** Phát hiện xung đột lịch phát

### 3.3 Làm sao xem chi tiết chương trình?
1. Click vào card chương trình trên EPG Grid
2. Modal hiển thị thông tin chi tiết
3. Có thể thêm vào Watchlist từ đây

### 3.4 Tìm kiếm chương trình như thế nào?
- **Basic Search:** Tìm theo tên chương trình
- **Advanced Filters:** 
  - Thể loại (Drama, Comedy, News...)
  - Ngày giờ chiếu
  - Kênh cụ thể
  - Độ tuổi phù hợp

### 3.5 Schedule Conflict Detection là gì?
Hệ thống tự động phát hiện khi:
- 2+ chương trình cùng thời gian trên cùng kênh
- Chương trình kéo dài quá giờ kết thúc dự kiến
- Thời gian nghỉ giữa các chương trình không hợp lý

---

## 4. AI Content Analysis

### 4.1 AI Analysis làm gì?
Hệ thống AI đa agent phân tích nội dung chương trình:
- **Content Suitability Agent:** Đánh giá độ tuổi phù hợp
- **Context Agent:** Phân tích ngữ cảnh và chủ đề
- **Recommendation Agent:** Gợi ý chương trình liên quan

### 4.2 Làm sao kích hoạt AI Analysis?
**Chỉ Staff/Admin mới có quyền:**
1. Đăng nhập với tài khoản Staff+
2. Chọn chương trình cần phân tích
3. Click "Run AI Analysis"
4. Đợi kết quả (thường 5-30 giây)

### 4.3 AI Analysis mất bao lâu?
| Loại phân tích | Thời gian |
|:---|:---:|
| Quick Analysis | 5-10 giây |
| Full Analysis | 30-60 giây |
| Batch Analysis (10+) | 2-5 phút |

### 4.4 AI timeout xử lý thế nào?
- **Timeout:** 60 giây
- **Fallback:** Polling mechanism cho realtime features
- **Retry:** Tự động retry 3 lần nếu fail

### 4.5 AI Analysis có chính xác không?
AI được train để đưa ra gợi ý, không phải đánh giá tuyệt đối. Staff nên xem xét kết quả trước khi áp dụng.

---

## 5. Ứng dụng Mobile

### 5.1 Yêu cầu hệ thống?
| Platform | Phiên bản tối thiểu |
|:---|:---|
| Android | Android 5.0 (API 21) |
| iOS | iOS 12.0+ |

### 5.2 Download APK ở đâu?
- **GitHub Releases:** [Link đến releases page]
- **Website:** Trang download trong app
- **Version:** Kiểm tra trong Settings > About

### 5.3 Flutter app khác gì Web version?
| Feature | Web | Mobile |
|:---|:---:|:---:|
| 3D Effects | React Three Fiber | Skia/Flame |
| Offline Storage | - | SQLite |
| Notifications | Browser | Native |
| Biometric Login | ❌ | ✅ |

### 5.4 Cập nhật app như thế nào?
1. Mở app > Settings > Check for Updates
2. Hoặc download APK mới từ website
3. Install và khởi động lại

---

## 6. Thông báo

### 6.1 Bật/tắt thông báo như thế nào?
**Web:**
1. Settings > Notifications
2. Toggle các loại thông báo

**Mobile:**
1. Settings > Notifications
2. Cho phép notification từ hệ thống
3. Config trong app

### 6.2 Thông báo trước bao lâu?
**Mặc định:** 15 phút trước khi chương trình bắt đầu
**Tùy chỉnh:** 5, 10, 15, 30, 60 phút

### 6.3 Tone thông báo như thế nào?
**Mixed tone (Casual + Smart Contextual):**
- "Này bạn ơi! 'Running Man' bắt đầu rồi nè!"
- "Mình thấy 'Maid' hợp với bạn đấy!"

### 6.4 Không nhận được thông báo?
1. Kiểm tra kết nối internet
2. Kiểm tra settings notification trong app
3. Kiểm tra permission trên thiết bị
4. Thử restart app

---

## 7. Offline Mode

### 7.1 Offline mode là gì?
Cho phép xem Watchlist và EPG đã lưu khi không có internet. Dữ liệu được lưu trong SQLite database trên mobile.

### 7.2 Những gì có thể xem offline?
- ✅ Watchlist (đã thêm vào)
- ✅ Lịch EPG (đã sync)
- ✅ Thông tin kênh
- ❌ Trailer/Video
- ❌ AI Analysis (cần online)

### 7.3 Làm sao sync dữ liệu offline?
1. Kết nối internet
2. Mở app > Pull to refresh
3. Hoặc Settings > Sync Now
4. Đợi sync hoàn tất

### 7.4 Dữ liệu offline có hết hạn không?
- **Watchlist:** Không hết hạn (local)
- **EPG Cache:** 24 giờ
- **Channel Info:** 7 ngày

---

## 8. 3D Features

### 8.1 Web 3D Features có gì?
| Component | Effect |
|:---|:---|
| Landing Page | 3D Hero animations |
| EPG Grid | Interactive timeline với parallax |
| Channel Cards | 3D flip effects |
| Program Detail | 3D poster reveals |

### 8.2 Device không hỗ trợ 3D thì sao?
- **Automatic Detection:** Hệ thống tự detect khả năng thiết bị
- **Graceful Fallback:** Tự động chuyển sang 2D
- **Performance Budget:** 60 FPS budget

### 8.3 Tắt 3D effects được không?
✅ Có:
1. Settings > Display
2. Toggle "Enable 3D Effects" OFF
3. Refresh trang

### 8.4 Mobile có 3D không?
Có, sử dụng **Skia/Flame** engine:
- Smooth hero transitions
- Parallax scrolling
- Custom animated components

---

## 9. Lỗi thường gặp

### 9.1 Lỗi đăng nhập

| Error | Giải pháp |
|:---|:---|
| "Invalid credentials" | Kiểm tra email/password |
| "Token expired" | Đăng nhập lại |
| "Account locked" | Liên hệ Admin |

### 9.2 Lỗi kết nối

| Error | Giải pháp |
|:---|:---|
| "Network error" | Kiểm tra internet |
| "Server timeout" | Thử lại sau |
| "API error" | Clear cache, thử lại |

### 9.3 Lỗi hiển thị

| Error | Giải pháp |
|:---|:---|
| EPG không load | Pull to refresh |
| Card không hiển thị | Clear browser cache |
| 3D không hoạt động | Check WebGL support |

### 9.4 Lỗi Mobile

| Error | Giải pháp |
|:---|:---|
| App crash | Update app, restart device |
| Sync fail | Kiểm tra internet, thử lại |
| Storage full | Xóa cache, giải phóng bộ nhớ |

---

## 10. Liên hệ hỗ trợ

### 10.1 Kênh hỗ trợ

| Kênh | Thông tin |
|:---|:---|
| Email | support@omnicast.vn |
| GitHub Issues | [Repository Link] |
| Documentation | [Wiki Link] |

### 10.2 Thông tin phiên bản
Xem trong **Settings > About > Version**

---

## Revision History

| Version | Date | Author | Changes |
|:---:|:---|:---|:---|
| 1.0 | 2026-09-10 | Team | Initial FAQ |
