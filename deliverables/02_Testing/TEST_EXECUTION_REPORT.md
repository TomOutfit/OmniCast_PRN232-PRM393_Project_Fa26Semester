# 📊 OmniCast — Báo Cáo Thực Thi Kiểm Thử Toàn Diện (Test Execution Report)
## Tổng Hợp Kết Quả Kiểm Thử Đa Nền Tảng (PRN232 & PRM393)

---

### 1. Tóm Tắt Tổng Quan (Executive Summary)

Báo cáo này tổng hợp kết quả thực thi kiểm thử toàn bộ hệ sinh thái phần mềm **OmniCast** bao gồm: Back-end NestJS, Cổng Web Next.js 15, Ứng dụng di động Flutter và Kịch bản kiểm thử trình duyệt Playwright E2E.

| Chỉ số kiểm thử | Số lượng | Tỷ lệ Đạt (Pass Rate) | Ghi chú |
| :--- | :---: | :---: | :--- |
| **Backend Unit & Integration Tests (NestJS)** | **163** | **100%** | Chạy qua `node:test` trên 16 tệp spec |
| **Frontend Unit & Component Tests (Next.js)** | **228** | **100%** | Chạy qua `vitest` trên 76 bộ kiểm thử |
| **Mobile Unit & Widget Tests (Flutter)** | **91** | **100%** | Chạy qua `flutter test` trên 8 bộ kiểm thử |
| **Tổng số Automated Tests (Codebase)** | **482** | **100%** | **482 Passed / 0 Failed / 0 Skipped** |
| **Kịch bản E2E Playwright Browser** | **8** | **100%** | Chụp 8 màn hình kiểm thử hành trình người dùng |
| **Thời gian thực thi quy trình CI/CD** | **~4m 12s** | **Thành công** | Ma trận 5 jobs độc lập trên GitHub Actions |

---

### 2. Chi Tiết Thực Thi 3 Test Suite Mã Nguồn

#### 2.1. Back-End Test Suite (NestJS `node:test`)
- **Môi trường chạy:** Node.js v24.x, PostgreSQL (Supabase), Prisma ORM
- **Tổng số ca kiểm thử:** 163 tests trong 16 tệp spec
- **Thời gian thực thi:** 9.42 giây
- **Phân bổ theo tệp kiểm thử:**
  1. `test/ai-curator-stats.service.spec.ts`: 10 tests (Thống kê chỉ số AI, phân nhóm tỷ lệ duyệt)
  2. `test/ai-curator.e2e.spec.ts`: 12 tests (Quy trình gọi OpenAI, schema Zod, fallback)
  3. `test/ai-curator.service.spec.ts`: 15 tests (Logic biên tập và phân tích ngữ nghĩa)
  4. `test/audit-logger.service.spec.ts`: 8 tests (Kết nối gRPC client và đẩy log)
  5. `test/auth.service.spec.ts`: 14 tests (Băm mật khẩu, ký JWT, xoay vòng Refresh Token)
  6. `test/billing.service.spec.ts`: 6 tests (Thanh toán và đăng ký gói tài khoản)
  7. `test/channels.service.spec.ts`: 11 tests (CRUD danh mục kênh và phân quyền)
  8. `test/epg-filler.spec.ts`: 14 tests (Thuật toán điền lịch 24/7 có hạt giống)
  9. `test/epg-timeline.spec.ts`: 9 tests (Xử lý dòng thời gian và truy vấn ngày)
  10. `test/ingest-sources.spec.ts`: 10 tests (Chuẩn hóa sự kiện từ YouTube, Twitch, RSS)
  11. `test/live-studio.service.spec.ts`: 8 tests (Cấu hình luồng WHIP và đồng bộ MediaMTX)
  12. `test/programs.conflict.spec.ts`: 16 tests (Thuật toán SQL chống trùng lặp lịch phát EPG)
  13. `test/programs.counter.spec.ts`: 7 tests (Đếm số lượng sự kiện theo danh mục)
  14. `test/search.service.spec.ts`: 9 tests (Tìm kiếm toàn văn bản)
  15. `test/users.service.spec.ts`: 8 tests (Quản lý hồ sơ người dùng và khóa tài khoản)
  16. `test/watchlist.service.spec.ts`: 6 tests (Đồng bộ danh sách theo dõi)

#### 2.2. Web Front-End Test Suite (Next.js 15 `vitest`)
- **Môi trường chạy:** Vitest, React Testing Library, JSDOM
- **Tổng số ca kiểm thử:** 228 tests trong 76 bộ kiểm thử
- **Thời gian thực thi:** 14.85 giây
- **Phạm vi bảo vệ:**
  - Logic thuần (Pure Functions): Query Builder, EPG Grid Layout Math, Form Validators, Token Manager.
  - Thành phần giao diện (UI Components): Carousel, Live Chat Box, EPG Timeline Grid, Studio Upload Button, Role Badge, Notification Bell.
  - Trang & Route Guards: Kiểm tra chuyển hướng chưa đăng nhập cho `/watchlist` và `/admin`.

#### 2.3. Mobile Test Suite (Flutter 3.x `flutter test`)
- **Môi trường chạy:** Flutter SDK 3.x, Dart 3.x, Mockito
- **Tổng số ca kiểm thử:** 91 tests trong 8 bộ kiểm thử
- **Thời gian thực thi:** 11.23 giây
- **Phân bổ chi tiết:**
  1. `test/data/repositories/ai_curator_repository_test.dart`: 26 tests (Mock phản hồi API AI)
  2. `test/data/watchlist_item_model_test.dart`: 9 tests (Chuyển đổi DTO và tính toán dirty flag)
  3. `test/logic/auth_bloc_test.dart`: 14 tests (Luồng phát trạng thái đăng nhập/làm mới token)
  4. `test/logic/watchlist_bloc_test.dart`: 13 tests (Quản lý trạng thái lưu và đồng bộ SQLite)
  5. `test/presentation/save_to_watchlist_button_test.dart`: 7 tests (Kiểm thử tương tác nút bấm)
  6. `test/presentation/screens/studio/ai_curator_screen_test.dart`: 13 tests (Kiểm thử UI studio)
  7. `test/logic/epg_bloc_test.dart`: 6 tests (Lọc lịch phát sóng theo ngày)
  8. `test/presentation/screens/onboarding/onboarding_screen_test.dart`: 3 tests (Luồng màn hình chào mừng)

---

### 3. Kết Quả Kiểm Thử Trình Duyệt E2E (Playwright)

Bộ kiểm thử trình duyệt thực hiện 8 kịch bản xuyên suốt hành trình người dùng trên Cổng Web:

| STT | Kịch bản E2E | Phạm vi xác minh | Tệp ảnh chụp minh chứng | Kết quả |
| :---: | :--- | :--- | :--- | :---: |
| 1 | Trang chủ Desktop | Tải trang chủ, hiển thị Navbar, Carousel, Kênh nổi bật | `01_home_desktop.png` | **PASS** |
| 2 | Trang chủ Mobile Web | Tải giao diện co giãn responsive trên khung hình di động | `02_home_mobile.png` | **PASS** |
| 3 | Danh mục Kênh | Tải danh sách kênh, bộ lọc theo thể loại (Tin tức, Thể thao, Giải trí) | `subpage_channels.png` | **PASS** |
| 4 | Lịch phát sóng EPG | Hiển thị bảng điều khiển EPG 24 giờ, cuộn theo trục thời gian | `subpage_epg.png` | **PASS** |
| 5 | Kho video VOD | Duyệt danh sách bản ghi đã phát sóng, phân trang | `subpage_recordings.png` | **PASS** |
| 6 | Tìm kiếm tổng hợp | Nhập từ khóa, hiển thị danh sách kênh và chương trình phù hợp | `subpage_search.png` | **PASS** |
| 7 | Cài đặt cá nhân | Xem thông tin hồ sơ người dùng và cấu hình thông báo | `subpage_settings.png` | **PASS** |
| 8 | Danh sách theo dõi | Hiển thị các chương trình đã đánh dấu kèm nút kích hoạt nhắc nhở | `subpage_watchlist.png` | **PASS** |

*(Toàn bộ các tệp ảnh chụp minh chứng trên đã được lưu trữ trong thư mục `deliverables/02_Testing/screenshots/`)*.

---

### 4. Nhật Ký Sửa Lỗi Trong Quá Trình Kiểm Thử (Defect Resolution Log)

| Mã lỗi | Mô tả vấn đề phát hiện | Nguyên nhân gốc rễ | Giải pháp đã thực hiện | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **BUG-01** | Trình phát di động không mở được luồng phát MediaMTX trên máy thật | Luồng phát trả về URL chứa `localhost:8889` khiến thiết bị di động không kết nối được | Thêm cơ chế `resolveStreamUrl` tự động phân giải sang IP máy chủ nội bộ trong mạng LAN | **ĐÃ SỬA** |
| **BUG-02** | Xung đột token khi nhiều yêu cầu nhận mã 401 đồng thời | Nhiều request cùng lúc gọi `/auth/refresh` làm xoay vòng token nhiều lần và vô hiệu hóa token hợp lệ | Thiết lập cơ chế khóa hàng đợi (Queue Lock) trong `AuthInterceptor` chỉ cho phép 1 tiến trình refresh duy nhất | **ĐÃ SỬA** |
| **BUG-03** | Mất dữ liệu Watchlist khi thao tác ngoại tuyến | SQLite chưa lưu vết các thao tác phát sinh khi mất mạng | Bổ sung bảng `pending_ops` với hàng đợi FIFO và tự động phát lại khi có mạng | **ĐÃ SỬA** |
| **BUG-04** | Tràn bảng dữ liệu khi xuất tài liệu báo cáo | Một số bảng LaTeX có độ rộng vượt quá một cột trong định dạng hai cột của IEEE | Bổ sung macro `\fitcol` và `\fitfull` kết hợp `tabularx` để co giãn tự động theo cột | **ĐÃ SỬA** |

---

### 5. Kết Luận & Chứng Nhận Chất Lượng (Quality Gate Sign-Off)

Toàn bộ hệ thống phần mềm OmniCast đã hoàn thành 100% các tiêu chí kiểm định chất lượng:
1. **Tính đúng đắn về mặt logic:** 482/482 bài kiểm thử tự động đạt kết quả PASS.
2. **Tính khả dụng khi ngoại tuyến:** Cơ chế lưu trữ đệm SQLite và đồng bộ dữ liệu hoạt động tin cậy.
3. **Độ ổn định triển khai:** Các dịch vụ sản xuất trên Vercel và Render phản hồi với mã HTTP 200 ổn định.

**Xác nhận:** Đủ điều kiện nghiệm thu và đóng gói nộp bài cho học phần PRN232 & PRM393.
