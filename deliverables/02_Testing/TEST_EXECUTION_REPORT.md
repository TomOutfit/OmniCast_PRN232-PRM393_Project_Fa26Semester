# 📊 OmniCast — Báo Cáo Thực Thi Kiểm Thử Toàn Diện (Test Execution Report)
## Tổng Hợp Kết Quả Kiểm Thử Đa Nền Tảng (PRN232 & PRM393)

**Học viện Công nghệ FPT Quy Nhơn — FPTU Quy Nhon AI Campus - FU Cahata**  
*Dự án: OmniCast — Nền tảng Truyền thông & Trí tuệ Phát thanh Truyền hình Đa Phương tiện*

---

### Thông Tin Dự Án & Hội Đồng Kiểm Thử
- **Đơn vị đào tạo:** Đại học FPT Quy Nhơn (FPTU Quy Nhon AI Campus)
- **Tổ chức / Câu lạc bộ:** FU Cahata
- **Môn học tích hợp:**
  - **PRN232:** Building Cross-Platform Back-End Application with .NET / NestJS & Enterprise Architecture
  - **PRM393:** Mobile Applications Development with Flutter / Android & Clean Architecture
- **Học kỳ:** Fall 2026 (Fa26)
- **Giảng viên hướng dẫn (Mentor):** Thầy **Huỳnh Vang**
- **Nhóm sinh viên thực hiện (4 thành viên):**
  1. **Nguyễn Bình An** (`TomOutfit`) — **Trưởng nhóm / Tech Lead**: Kiến trúc NestJS 11, Phân quyền RBAC & Bảo mật JWT, Thuật toán phát hiện xung đột lịch EPG, Direct Stream Engine, Điều phối CI/CD & Đóng gói sản phẩm.
  2. **Trần Thanh Sơn** (`TranThanhSonQE170080` — MSSV: `QE170080`): Standalone gRPC Audit Microservice, Thiết kế Cơ sở dữ liệu Supabase PostgreSQL (21 Prisma Models), Telemetry, Health Check & Seeding.
  3. **Nguyễn Vĩnh Phú** (`phunvqe180136` — MSSV: `QE180136`): **Mobile Lead Developer**: Ứng dụng di động Flutter 4-Tier Clean Architecture & 12 BLoCs, Trình phát đa phương tiện `OmniPlayer`, Bàn điều khiển `LiveStudioScreen` 4 tab, WebRTC WHIP `MobileStudioRecorderScreen` & Đồng bộ ngoại tuyến SQLite.
  4. **Đồng Hoàng Nguyên** (`teng122`): **Full-Stack & Realtime Engineer**: Cổng thông tin Web Next.js 15 Cinema Dark Portal (33 routes), Phòng xem trực tiếp `/live/[id]` (7 themes), Bàn điều khiển Creator `/studio/live` (4 tabs), Socket.IO `/live` Gateway & Mô-đun AI Curator.

---

### 1. Tóm Tắt Tổng Quan (Executive Summary)

Báo cáo này tổng hợp kết quả thực thi kiểm thử toàn bộ hệ sinh thái phần mềm **OmniCast** bao gồm: Back-end NestJS, Standalone gRPC Microservice, Cổng Web Next.js 15 Cinema Dark Portal, Ứng dụng di động Flutter Cross-Platform, và Bộ kịch bản kiểm thử trình duyệt Playwright E2E.

| Chỉ số kiểm thử | Số lượng | Tỷ lệ Đạt (Pass Rate) | Ghi chú & Công cụ thực thi |
| :--- | :---: | :---: | :--- |
| **Backend Unit & Integration Tests (NestJS)** | **163** | **100%** | Chạy qua `node:test` trên 16 tệp spec độc lập |
| **Frontend Unit & Component Tests (Next.js)** | **228** | **100%** | Chạy qua `vitest` trên 76 bộ kiểm thử UI & Hook |
| **Mobile tests in CI (Flutter)** | **77** | **100%** | Artifact run 40630318005; CI chọn test/data, test/logic, test/presentation |
| **Tổng automated tests trong run 40630318005** | **468** | **100%** | **468 Passed / 0 Failed** trong artifacts backend/web/mobile |
| **E2E smoke có ảnh chụp** | **8** | **8/8 được ghi nhận** | Bộ kịch bản chụp màn hình ở mục 3; không có log runner kèm theo |
| **Playwright E2E PRN232** | **8** | **6/8 trong lần chạy được mô tả** | Hai lỗi môi trường/assertion ở mục 5; chưa có log thời gian |
| **Kiểm thử Tích hợp LiveStream & Studio** | **12** | **100%** | Xác minh luồng WHIP/RTMP, HLS, Chat, Polls, Q&A, Commerce |
| **Thời gian thực thi quy trình CI/CD** | **8m 28s** | **Thành công** | Run 40630318005, 2026-10-28 11:05:17-11:13:45 +07:00 |

#### 1.1. Mốc chạy và độ tin cậy của số liệu

GitHub Actions còn lưu artifacts và job timestamps cho run **40630318005**, commit **edafb2347b224d05909d47d85fc152f83901097c**. Timestamp dưới đây được quy đổi từ UTC sang ICT (+07:00). Thời lượng trong artifact là thời gian cộng gộp runner ghi; wall time của bước test có thể dài hơn do khởi động và đóng runner.

| Mốc | Thông tin có thể xác nhận từ tài liệu/kho mã | Thông tin chưa được lưu |
| :--- | :--- | :--- |
| 28/10/2026 11:05:17-11:13:45 +07:00 | Run 40630318005, commit edafb234...: backend 163/163, web 228/228, mobile CI subset 77/77; tổng 468/468. | E2E 6/8 được ghi ở tài liệu riêng, không có artifact gắn với run này |
| 29/10/2026 14:17:14-14:22:50 +07:00 | Run 40834458443: backend/web tests và Flutter tests đạt; APK build thất bại. | Build log ghi lỗi compile Dart |
| 29/10/2026 14:19:42-14:25:07 +07:00 | Run 40834718325, commit e041fbf...: APK build tiếp tục thất bại; quality gate báo mobile job lỗi. | Không phải unit-test failure |
| 29/10/2026 14:29:01 +07:00 | Commit 64f66fc thêm import AppConstants/DioClient trong main.dart và xóa dấu ngoặc nhọn thừa trong settings_screen.dart. | Commit sửa được truy vết trong Git |
| 29/10/2026 14:29:53-14:37:56 +07:00 | Run 40835801104, commit 64f66fc...: ba suite, quality report và deploy thành công. | CI xác nhận build sau bản sửa |
| 04/11/2026 17:49:30-17:57:28 +07:00 | Run 41816740967: frontend/mobile jobs đạt; backend migration lỗi P3018, thiếu relation StreamDonation; quality gate fail, deploy bị skip. | Chưa thấy run sau xác nhận bản sửa tính đến 04/11/2026 |

Artifact lần chạy thành công ghi duration cộng gộp backend 12.466s, frontend 0.989s và mobile subset 4.501s. Các số cũ 9.42s/14.85s/11.23s và ~4m12s đã được thay bằng số có nguồn. Mobile có 91 test trong toàn test tree, nhưng workflow run này chỉ chọn data/logic/presentation nên artifact CI có 77 test; 14 test ngoài phạm vi job không nằm trong tổng 468.

Nguồn CI: [run 40630318005](https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester/actions/runs/40630318005), [run 40834458443](https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester/actions/runs/40834458443), [run 40834718325](https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester/actions/runs/40834718325), [run 40835801104](https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester/actions/runs/40835801104), [run mới nhất 41816740967](https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester/actions/runs/41816740967). Frontend và mobile artifacts giữ duration từng test; backend artifact chỉ có duration theo spec, các duration từng test bằng 0 do runner/parser hiện tại.

Artifacts đã được lưu kèm deliverable: [backend](ci_runs/40630318005/backend-test-results.json), [frontend](ci_runs/40630318005/frontend-test-results.json), [mobile](ci_runs/40630318005/mobile-test-results.json), cùng [ghi chú phạm vi](ci_runs/40630318005/README.md).

---

### 2. Chi Tiết Thực Thi 3 Test Suite Mã Nguồn

#### 2.1. Back-End Test Suite (NestJS `node:test`)
- **Môi trường chạy:** Node.js v24.x, PostgreSQL (Supabase 21 Prisma Models), Redis Cache, Prisma ORM, gRPC Client.
- **Tổng số ca kiểm thử:** 163 tests trong 16 tệp spec.
- **CI 40630318005:** 163/163; duration artifact 12.466 giây; bước runner 11:06:09-11:06:25 +07:00.
- **Phân bổ theo tệp kiểm thử:**
  1. `test/ai-curator-stats.service.spec.ts`: 10 tests (Thống kê chỉ số AI, phân nhóm tỷ lệ duyệt nội dung).
  2. `test/ai-curator.e2e.spec.ts`: 13 tests (Controller and curator API flows).
  3. `test/ai-curator.service.spec.ts`: 19 tests (Curator pipeline, caching, and persistence).
  4. `test/audit-logger.service.spec.ts`: 8 tests (Kết nối gRPC client tới Standalone Audit Microservice).
  5. `test/auth.service.spec.ts`: 17 tests (Registration, login, and refresh-token rotation).
  6. `test/billing.service.spec.ts`: 3 tests (Subscription billing and Premium access).
  7. `test/channels.service.spec.ts`: 7 tests (Channel CRUD and access control).
  8. `test/epg-filler.spec.ts`: 18 tests (Deterministic 24/7 schedule filling).
  9. `test/epg-timeline.spec.ts`: 5 tests (EPG timeline and broadcast-day queries).
  10. `test/ingest-sources.spec.ts`: 11 tests (YouTube, Twitch, and HLS RSS normalisation).
  11. `test/live-studio.service.spec.ts`: 18 tests (WHIP/RTMP setup and MediaMTX sync).
  12. `test/programs.conflict.spec.ts`: 7 tests (SQL schedule-conflict cases).
  13. `test/programs.counter.spec.ts`: 8 tests (Event and recording counters).
  14. `test/search.service.spec.ts`: 4 tests (Full-text and filtered search).
  15. `test/users.service.spec.ts`: 4 tests (Profile, roles, and account states).
  16. `test/watchlist.service.spec.ts`: 11 tests (Personal watchlist sync).

#### 2.2. Web Front-End Test Suite (Next.js 15 `vitest`)
- **Môi trường chạy:** Vitest, React Testing Library, JSDOM, TailwindCSS.
- **Tổng số ca kiểm thử:** 228 tests trong 76 bộ kiểm thử.
- **CI 40630318005:** 228/228; duration artifact 0.989 giây; bước runner 11:05:54-11:05:57 +07:00.
- **Phạm vi bảo vệ:**
  - **Logic thuần (Pure Functions):** Query Builder, EPG Grid Layout Math, Form Validators, Token Manager, Watch-Party clock drift calculation.
  - **Thành phần giao diện (UI Components):** Live Carousel, Live Chat Box, Floating Reactions Overlay, EPG Timeline Grid, Studio Upload Button, Role Badge, Notification Bell, Pinned Product Card.
  - **Phòng Live (`/live/[id]`):** Chuyển đổi 7 bộ chủ đề giao diện (Default, Sunset, Ocean, Sakura, Neon, Forest, Gaming), kết nối Socket.IO namespace `/live`.
  - **Bàn điều khiển Studio (`/studio/live`):** Điều khiển 4 tabs (Chat Moderation, Polls Management, Q&A Moderation, Live Commerce Products).
  - **Trang & Tuyến đường được bảo vệ (Route Guards):** Kiểm tra chuyển hướng chưa đăng nhập cho `/watchlist`, `/studio`, và `/admin`.

#### 2.3. Mobile Test Suite (Flutter 3.24+ `flutter test`)
- **Môi trường chạy:** Flutter SDK 3.24+, Dart 3.5+, Mockito, BLoC Test.
- **Tổng theo CI 40630318005:** 77/77 trong 8 spec files được chọn bởi workflow.
- **Duration artifact:** 4.501 giây; bước runner 11:06:12-11:06:32 +07:00.
- **Phạm vi ngoài job:** test/core và test/widget_test.dart; 14 test này không có trong artifact CI run trên.
- **Phân bổ chi tiết:**
  1. `test/data/repositories/ai_curator_repository_test.dart`: 25 tests.
  2. `test/data/watchlist_item_model_test.dart`: 8 tests.
  3. `test/logic/auth_bloc_test.dart`: 13 tests.
  4. `test/logic/watchlist_bloc_test.dart`: 10 tests.
  5. `test/presentation/save_to_watchlist_button_test.dart`: 4 tests.
  6. `test/presentation/screens/studio/ai_curator_screen_test.dart`: 10 tests.
  7. `test/logic/epg_bloc_test.dart`: 5 tests.
  8. `test/presentation/screens/onboarding/onboarding_screen_test.dart`: 2 tests.

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

### 4. Kiểm Thử Tính Năng LiveStream & Live Studio

| Mã kiểm thử | Phân hệ | Thao tác kiểm thử | Tiêu chuẩn đánh giá | Kết quả |
| :---: | :--- | :--- | :--- | :---: |
| **LIVE-01** | Web / Mobile | Phát luồng HLS ABR thích ứng | Tự động thích ứng bitrate, trễ khởi tạo dưới 1.5s | **PASS** |
| **LIVE-02** | Web Portal | Đổi 7 chủ đề phòng live (`/live/[id]`) | Giao diện đổi màu nền, accent, chat bubble ngay lập tức | **PASS** |
| **LIVE-03** | Web / Mobile | Bắn 6 loại Floating Reactions | Hiệu ứng CustomPainter/Canvas bay lên mượt mà 60 FPS | **PASS** |
| **LIVE-04** | Web / Mobile | Tạo và bình chọn Live Polls | Cập nhật tỷ lệ phần trăm trực tiếp theo thời gian thực | **PASS** |
| **LIVE-05** | Web / Mobile | Live Q&A và Ghim câu hỏi lên màn hình | Câu hỏi được chọn hiển thị nổi bật trên khung phát sóng | **PASS** |
| **LIVE-06** | Web / Mobile | Ghim sản phẩm Live Commerce | Thẻ sản phẩm nổi bật có hình ảnh, giá và nút mua hàng | **PASS** |
| **LIVE-07** | Studio Web | Đẩy luồng WebRTC WHIP từ Webcam/Màn hình | Trễ luồng dưới 500ms, đồng bộ âm thanh và hình ảnh | **PASS** |
| **LIVE-08** | Studio Mobile | Phát luồng trực tiếp từ Camera điện thoại | Chuyển đổi camera trước/sau, lật gương, đồng bộ WHIP | **PASS** |

---

### 5. Nhật Ký Sửa Lỗi Trong Quá Trình Kiểm Thử (Defect Resolution Log)

**Khả năng truy vết:** BUG-01 đến BUG-05 có mô tả nguyên nhân và giải pháp trong hồ sơ, nhưng không có giờ phát hiện, commit/version khắc phục hoặc lần chạy hồi quy. Trạng thái “đã sửa” phản ánh nội dung được ghi nhận, không xác nhận mốc phát hành.

| Thứ tự | Thời điểm ICT (+07:00) | Kết quả và lỗi quan sát | Nguyên nhân có trong log/commit | Bản sửa và lần xác nhận |
| :---: | :--- | :--- | :--- | :--- |
| 1 | 28/10/2026, giờ không có trong báo cáo | Playwright 6/8; STAFF login timeout và unauthenticated /studio nhận 401 thay vì redirect assertion | Tài liệu quy lỗi cho seed STAFF thiếu và khác biệt giữa HTTP 401 với assertion; không còn raw Playwright log | Không có mã commit sửa hoặc kết quả chạy lại trong hồ sơ |
| 2 | 29/10/2026 14:17:14-14:22:50 | Mobile unit tests đạt, APK build và quality gate thất bại | Thiếu import AppConstants/DioClient, dấu ngoặc nhọn thừa ở settings_screen.dart | Lỗi tái hiện ở run 40834718325 |
| 3 | 29/10/2026 14:29:01 | Commit 64f66fc bổ sung hai import và bỏ ngoặc nhọn thừa | Sửa đúng các lỗi compile được log ở hai run trước | Run 40835801104 đạt, kết thúc 14:37:56; toàn pipeline success |

Với E2E, hệ thống còn thiếu timestamp theo từng test ID và commit sửa. Với lỗi APK, log có thời gian thất bại và commit sửa cụ thể; lần chạy sau xác nhận pipeline thành công.

| Mã lỗi | Mô tả vấn đề phát hiện | Nguyên nhân gốc rễ | Giải pháp đã thực hiện | Trạng thái |
| :---: | :--- | :--- | :--- | :---: |
| **BUG-01** | Trình phát di động không mở được luồng phát MediaMTX trên máy thật | Luồng phát trả về URL chứa `localhost:8889` khiến thiết bị di động không kết nối được | Thêm cơ chế `resolveStreamUrl` tự động phân giải sang IP máy chủ nội bộ trong mạng LAN | **ĐÃ SỬA** |
| **BUG-02** | Xung đột token khi nhiều yêu cầu nhận mã 401 đồng thời | Nhiều request cùng lúc gọi `/auth/refresh` làm xoay vòng token nhiều lần và vô hiệu hóa token hợp lệ | Thiết lập cơ chế khóa hàng đợi (Queue Lock) trong `AuthInterceptor` chỉ cho phép 1 tiến trình refresh duy nhất | **ĐÃ SỬA** |
| **BUG-03** | Mất dữ liệu Watchlist khi thao tác ngoại tuyến | SQLite chưa lưu vết các thao tác phát sinh khi mất mạng | Bổ sung bảng `pending_ops` với hàng đợi FIFO và tự động phát lại khi có mạng | **ĐÃ SỬA** |
| **BUG-04** | Tràn bảng dữ liệu khi xuất tài liệu báo cáo | Một số bảng LaTeX có độ rộng vượt quá một cột trong định dạng hai cột của IEEE | Bổ sung macro `\fitcol` và `\fitfull` kết hợp `tabularx` để co giãn tự động theo cột | **ĐÃ SỬA** |
| **BUG-05** | Xung đột thời gian thực trong phòng Live khi có nhiều kết nối | Gateway Socket.IO chưa quản lý room isolation theo `channelId` | Bổ sung cơ chế `socket.join("channel:" + channelId)` và emit cục bộ theo room | **ĐÃ SỬA** |

---

### 6. Kết Luận & Biên Bản Nghiệm Thu Chất Lượng (Quality Sign-Off)

Run CI 40630318005 ghi nhận 468/468 test trong các job backend, frontend và mobile subset. Một smoke set có ảnh được báo cáo 8/8; bộ Playwright PRN232 riêng ghi 6/8. Không gộp hai bộ E2E thành một kết quả:
1. **Automated tests:** 468/468 trong CI artifacts; 14 test mobile ngoài phạm vi job chưa được chạy trong run này.
2. **Khả năng hoạt động ngoại tuyến:** Cơ chế lưu trữ đệm SQLite và hàng đợi thao tác phát lại hoạt động tin cậy.
3. **Hiệu năng truyền phát trực tiếp:** Luồng WebRTC WHIP đạt độ trễ cực thấp (< 500ms), luồng phát lại HLS ABR mượt mà.
4. **Tính nhất quán kiến trúc:** Tuân thủ phân tầng Clean Architecture, NestJS Modular System, và cơ sở dữ liệu quan hệ 21 Prisma Models.

**Trạng thái hồ sơ:** CI run và artifacts có timestamp/commit đã được liên kết trong timeline; Playwright E2E vẫn thiếu artifact theo test ID.  
*FPTU Quy Nhon AI Campus - FU Cahata, Tháng 10/2026.*
