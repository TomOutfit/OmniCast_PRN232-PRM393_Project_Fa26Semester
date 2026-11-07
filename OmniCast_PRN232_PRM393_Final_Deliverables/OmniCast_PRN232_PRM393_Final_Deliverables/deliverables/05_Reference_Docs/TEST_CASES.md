# 🧪 OmniCast (OMNI) — Biểu Mẫu Ghi Nhận Kết Quả Kiểm Thử (Test Execution Sheet)
# Bảng Theo Dõi & Điền Kết Quả Kiểm Thử Dành Cho Thành Viên Nhóm (PRN232 & PRM393)

> 📝 **Hướng Dẫn Sử Dụng Cho Thành Viên Nhóm:**  
> - Bảng này là **mẫu biểu theo dõi kiểm thử thực tế** trong suốt 10 tuần học kỳ (4 đợt Review).  
> - Các cột **`Kết Quả Thực Tế (Actual Result)`**, **`Trạng Thái (Status)`**, **`Người Test (Tester)`**, **`Ngày Test (Date)`**, **`Ghi Chú / Bug ID`** được **để trống hoàn toàn** để các thành viên tự tiến hành kiểm thử và điền kết quả vào.  
> - Khi phát hiện lỗi (Fail), ghi mã lỗi/mô tả lỗi vào cột **Ghi Chú / Bug ID** để người phụ trách sửa.

---

## 📌 Bảng Quy Ước Điền Trạng Thái (Status Legend)
- `[PASS]`: Tính năng hoạt động chính xác 100% như kết quả mong đợi.
- `[FAIL]`: Tính năng bị lỗi, crash hoặc trả về kết quả sai nghiệp vụ.
- `[BLOCKED]`: Bị nghẽn, chưa thể test do tính năng/API phụ thuộc chưa xong.
- `[NOT RUN]`: Chưa chạy kiểm thử.

---

## 💻🌐 PHẦN 1: MÔN PRN232 (NESTJS CORE API, FASTAPI AI SERVICE & WEB NEXT.JS 15)

---

### 1.1. NestJS Core API: Xác thực, JWT & Phân quyền RBAC (Role 1, 2, 3)

| Mã TC | Kịch Bản Kiểm Thử | Dữ Liệu & Các Bước Thực Hiện | Kết Quả Mong Đợi (Expected Result) | Kết Quả Thực Tế (Actual Result) | Trạng Thái (Status) | Người Test | Ngày Test | Ghi Chú / Bug ID |
|:---:|:---|:---|:---|:---|:---:|:---:|:---:|:---|
| **TC-PRN-01** | Đăng ký tài khoản mới thành công | `POST /api/auth/register`<br>- FullName: `"Nguyễn Văn A"`<br>- Email: `"viewer_test@omnicast.tv"`<br>- Password: `"Password123!"` | - HTTP 201 Created.<br>- Mật khẩu băm PBKDF2 trong Supabase.<br>- Mặc định gán `Role = 2` (Viewer). | | | | | |
| **TC-PRN-02** | Đăng ký với Email đã tồn tại | `POST /api/auth/register`<br>- Email: `"admin@omnicast.tv"` (đã tồn tại trong DB) | - HTTP 409 Conflict.<br>- Thông báo lỗi: `"Email đã được sử dụng"`. | | | | | |
| **TC-PRN-03** | Đăng nhập đúng Email & Mật khẩu | `POST /api/auth/login`<br>- Email: `"staff@omnicast.tv"`<br>- Password: Mật khẩu chính xác | - HTTP 200 OK.<br>- Trả về JWT Access Token (hạn 60p, claim `role="1"`).<br>- Refresh Token lưu vào DB (hạn 7 ngày). | | | | | |
| **TC-PRN-04** | Đăng nhập sai Mật khẩu | `POST /api/auth/login`<br>- Email: Đúng<br>- Password: `"WrongPass123!"` | - HTTP 401 Unauthorized.<br>- Thông báo lỗi: `"Thông tin đăng nhập không chính xác"`. | | | | | |
| **TC-PRN-05** | Cấp lại Access Token bằng Refresh Token | `POST /api/auth/refresh-token`<br>- Gửi `RefreshTokenRequestDto` hợp lệ | - HTTP 200 OK.<br>- Thu hồi token cũ, cấp mới cặp Access/Refresh Token. | | | | | |
| **TC-PRN-06** | Phân quyền RBAC Policy: `StaffOnly` | Dùng token `Role = 2` (Viewer) gọi `POST /api/channels` tạo kênh mới | - HTTP 403 Forbidden.<br>- Backend từ chối request không đúng Role. | | | | | |
| **TC-PRN-07** | Phân quyền RBAC Policy: `AdminOnly` | Dùng token `Role = 3` (Admin) gọi `GET /admin/audit-logs` xem nhật ký | - HTTP 200 OK.<br>- Trả về dữ liệu danh sách Audit Logs. | | | | | |

---

### 1.2. Backend API: Quản lý Kênh & Thuật toán Chống trùng lịch EPG

| Mã TC | Kịch Bản Kiểm Thử | Dữ Liệu & Các Bước Thực Hiện | Kết Quả Mong Đợi (Expected Result) | Kết Quả Thực Tế (Actual Result) | Trạng Thái (Status) | Người Test | Ngày Test | Ghi Chú / Bug ID |
|:---:|:---|:---|:---|:---|:---:|:---:|:---:|:---|
| **TC-PRN-08** | Lấy danh mục Kênh phát sóng | `GET /api/channels` (công khai) | - HTTP 200 OK.<br>- Trả về danh sách kênh kèm Logo, Tên kênh, Trạng thái. | | | | | |
| **TC-PRN-09** | Thêm Kênh truyền hình mới | Token Staff (`Role=1`), gửi `POST /api/channels` (Tên: `"Omni Action HD"`, Mã: `"OMNI_ACT"`) | - HTTP 201 Created.<br>- Bản ghi kênh mới được lưu vào Supabase DB. | | | | | |
| **TC-PRN-10** | Thêm lịch chương trình hợp lệ | `POST /api/programs` trên Kênh 1 vào khung giờ chưa có lịch: `14:00 - 15:00` | - HTTP 201 Created.<br>- Chương trình được lưu vào DB. | | | | | |
| **TC-PRN-11** | Chống trùng lịch: Giao thoa phần đầu | Kênh 1 đã có lịch `14:00 - 15:00`. Thêm lịch mới `13:30 - 14:30` | - HTTP 409 Conflict.<br>- Báo lỗi: `"Xung đột lịch phát sóng trên kênh này"`. | | | | | |
| **TC-PRN-12** | Chống trùng lịch: Giao thoa phần đuôi | Kênh 1 đã có lịch `14:00 - 15:00`. Thêm lịch mới `14:30 - 15:30` | - HTTP 409 Conflict.<br>- Chặn không cho lưu vào DB. | | | | | |
| **TC-PRN-13** | Chống trùng lịch: Bao trùm toàn bộ | Kênh 1 đã có lịch `14:00 - 15:00`. Thêm lịch mới `13:00 - 16:00` | - HTTP 409 Conflict.<br>- Chặn không cho lưu vào DB. | | | | | |
| **TC-PRN-14** | Trùng giờ chiếu nhưng KHÁC kênh | Kênh 1 có lịch `14:00 - 15:00`. Thêm lịch mới `14:00 - 15:00` trên Kênh 2 | - HTTP 201 Created.<br>- Cho phép lưu (2 kênh phát song song cùng giờ). | | | | | |

---

### 1.3. Backend API: Truy vấn Động OData 8.x (`/odata/Programs`)

| Mã TC | Kịch Bản Kiểm Thử | Dữ Liệu & Các Bước Thực Hiện | Kết Quả Mong Đợi (Expected Result) | Kết Quả Thực Tế (Actual Result) | Trạng Thái (Status) | Người Test | Ngày Test | Ghi Chú / Bug ID |
|:---:|:---|:---|:---|:---|:---:|:---:|:---:|:---|
| **TC-PRN-15** | Lọc OData theo thời lượng ($filter) | `GET /odata/Programs?$filter=DurationMinutes gt 90` | - HTTP 200 OK.<br>- 100% kết quả có thời lượng > 90 phút.<br>- Phản hồi < 300ms. | | | | | |
| **TC-PRN-16** | Tìm kiếm theo tựa đề ($filter contains) | `GET /odata/Programs?$filter=contains(tolower(Title), 'interstellar')` | - HTTP 200 OK.<br>- Chỉ trả về các phim có chứa chuỗi `"interstellar"`. | | | | | |
| **TC-PRN-17** | Mở rộng liên kết bảng ($expand) | `GET /odata/Programs?$expand=Channel,AiReport` | - HTTP 200 OK.<br>- Payload JSON lồng đầy đủ thông tin `Channel` và `AiReport`. | | | | | |
| **TC-PRN-18** | Sắp xếp lịch phát sóng ($orderby) | `GET /odata/Programs?$orderby=AirDateTime desc` | - HTTP 200 OK.<br>- Danh sách sắp xếp giảm dần theo thời điểm phát sóng. | | | | | |

---

### 1.4. Backend API: Multi-Agent AI Pipeline & gRPC AuditLogger

| Mã TC | Kịch Bản Kiểm Thử | Dữ Liệu & Các Bước Thực Hiện | Kết Quả Mong Đợi (Expected Result) | Kết Quả Thực Tế (Actual Result) | Trạng Thái (Status) | Người Test | Ngày Test | Ghi Chú / Bug ID |
|:---:|:---|:---|:---|:---|:---:|:---:|:---:|:---|
| **TC-PRN-19** | Kích hoạt chuỗi 3 Agent AI thẩm định | Token Staff (`Role=1`), gửi `POST /api/ai-curator/analyze/{id}` | - HTTP 200 OK trong ≤ 25s.<br>- Lưu kết quả vào `BroadcastAiReports` (`PRIME TIME`, `STANDARD`, `RESTRICTED`). | | | | | |
| **TC-PRN-20** | Viewer/Khách kích hoạt AI | Dùng token `Role = 2` (Viewer) gọi `POST /api/ai-curator/analyze/{id}` | - HTTP 403 Forbidden.<br>- Chặn người dùng không có quyền biên tập. | | | | | |
| **TC-PRN-21** | Transaction Rollback khi AI lỗi | Giả lập mất kết nối OpenAI API khi đang chạy chuỗi 3 Agent | - HTTP 500 Internal Error.<br>- DB rollback tự động, không tạo báo cáo rác. | | | | | |
| **TC-PRN-22** | Ghi nhật ký kiểm toán gRPC | Staff thêm lịch hoặc chạy AI ➔ Server kích hoạt non-blocking gRPC | - Bảng `AuditLogs` ghi nhận 1 record mới (`UserId`, `Action`, `Timestamp`). | | | | | |
| **TC-PRN-23** | Mở Swagger UI Live trên Vercel | Truy cập `https://omnicast-api.vercel.app/swagger` trên trình duyệt | - Trang Swagger tải đầy đủ 100% endpoints.<br>- Nút `Authorize` Bearer JWT hoạt động tốt. | | | | | |

---

### 1.5. Web Next.js: Giao diện Khán giả, Lịch EPG & Trailer Player

| Mã TC | Kịch Bản Kiểm Thử | Dữ Liệu & Các Bước Thực Hiện | Kết Quả Mong Đợi (Expected Result) | Kết Quả Thực Tế (Actual Result) | Trạng Thái (Status) | Người Test | Ngày Test | Ghi Chú / Bug ID |
|:---:|:---|:---|:---|:---|:---:|:---:|:---:|:---|
| **TC-PRN-24** | Form Đăng nhập & Validation Web | Mở trang `/login`<br>1. Nhập email sai cú pháp ➔ Bấm Login<br>2. Nhập đúng tài khoản Staff ➔ Bấm Login | 1. Hiển thị lỗi validation inline.<br>2. Đăng nhập thành công, chuyển hướng tới `/studio/curator`. | | | | | |
| **TC-PRN-25** | Bảng EPG Grid Schedule đa kênh | Mở trang `/epg` trên Web | - Bảng lưới EPG hiển thị các khối chương trình theo đúng dòng thời gian 24h. | | | | | |
| **TC-PRN-26** | Thẻ LIVE NOW nhấp nháy đỏ | Xem chương trình đang chiếu tại thời điểm hiện tại trên EPG | - Thẻ hiển thị huy hiệu `LIVE NOW` màu đỏ nhấp nháy (CSS Pulse). | | | | | |
| **TC-PRN-27** | Phát Video Trailer HD nhúng | Mở trang chi tiết `/programs/[id]` | - Trình phát video YouTube iframe / MP4 phát mượt mà, có nút phóng to Fullscreen. | | | | | |
| **TC-PRN-28** | Tìm kiếm & Lọc OData trên Web | Mở trang `/search`<br>1. Nhập từ khóa<br>2. Chọn Filter Chip `Phim >60p` | - Giao diện tự tạo query OData, hiển thị danh sách kết quả lọc dưới 300ms. | | | | | |

---

### 1.6. Web Next.js: AI Studio & Admin Audit Logs Hub

| Mã TC | Kịch Bản Kiểm Thử | Dữ Liệu & Các Bước Thực Hiện | Kết Quả Mong Đợi (Expected Result) | Kết Quả Thực Tế (Actual Result) | Trạng Thái (Status) | Người Test | Ngày Test | Ghi Chú / Bug ID |
|:---:|:---|:---|:---|:---|:---:|:---:|:---:|:---|
| **TC-PRN-29** | Staff kích hoạt AI Thẩm định trên Web | Đăng nhập tài khoản Staff, mở `/studio/curator`<br>1. Bấm "Kích hoạt Thẩm định AI" | - Hiển thị hiệu ứng Shimmer tiến trình.<br>- Sau 15-20s hiển thị kết quả và Badge phát sáng. | | | | | |
| **TC-PRN-30** | Admin xem vết kiểm toán gRPC | Đăng nhập tài khoản Admin, mở `/admin/audit-logs` | - Bảng hiển thị đầy đủ lịch sử: User nào đã sửa lịch hoặc chạy AI vào giờ nào. | | | | | |
| **TC-PRN-31** | Web Portal Live trên Cloud | Mở `https://omnicast.vercel.app` trên Chrome, Edge, Safari | - Web chạy trực tiếp trên Cloud, gọi API Vercel Live trơn tru, Lighthouse Score ≥ 90. | | | | | |

---

## 📱 PHẦN 2: MÔN PRM393 (FLUTTER MOBILE APPLICATION)

---

### 2.1. Mobile: Xác thực, Token SecureStorage & AuthBloc

| Mã TC | Kịch Bản Kiểm Thử | Dữ Liệu & Các Bước Thực Hiện | Kết Quả Mong Đợi (Expected Result) | Kết Quả Thực Tế (Actual Result) | Trạng Thái (Status) | Người Test | Ngày Test | Ghi Chú / Bug ID |
|:---:|:---|:---|:---|:---|:---:|:---:|:---:|:---|
| **TC-PRM-01** | Khởi chạy App kiểm tra phiên (SplashScreen) | Mở app khi chưa đăng nhập (Storage rỗng) | - `SplashScreen` kiểm tra token rỗng ➔ Tự động chuyển tới `LoginScreen`. | | | | | |
| **TC-PRM-02** | Đăng nhập tài khoản trên Mobile | Nhập Email/Password tài khoản Viewer ➔ Bấm Đăng nhập | - `AuthBloc` emit `Authenticated`.<br>- Lưu token vào `flutter_secure_storage`.<br>- Mở `HomeScreen`. | | | | | |
| **TC-PRM-03** | Đăng nhập sai mật khẩu | Nhập mật khẩu sai ➔ Bấm Đăng nhập | - Hiển thị SnackBar đỏ: `"Thông tin đăng nhập không chính xác"`, app không crash. | | | | | |
| **TC-PRM-04** | Tự động Refresh Token khi gặp 401 | Gọi API khi Access Token hết hạn 60 phút | - `AuthInterceptor` tự động gọi refresh token ngầm, nạp dữ liệu không bị ngắt quãng. | | | | | |
| **TC-PRM-05** | Đăng xuất người dùng | Tại `ProfileScreen`, bấm nút "Đăng xuất" | - Xóa sạch token trong `flutter_secure_storage`, điều hướng về `LoginScreen`. | | | | | |

---

### 2.2. Mobile: Lịch EPG Timeline, Live Now Pulse & Trailer Player

| Mã TC | Kịch Bản Kiểm Thử | Dữ Liệu & Các Bước Thực Hiện | Kết Quả Mong Đợi (Expected Result) | Kết Quả Thực Tế (Actual Result) | Trạng Thái (Status) | Người Test | Ngày Test | Ghi Chú / Bug ID |
|:---:|:---|:---|:---|:---|:---:|:---:|:---:|:---|
| **TC-PRM-06** | Chọn kênh EPG cuộn ngang | Mở `EpgTimelineScreen`<br>1. Cuộn danh sách kênh ngang<br>2. Chạm chọn Kênh 2 | - Danh sách lịch phát sóng cuộn dọc cập nhật tức thì theo kênh được chọn. | | | | | |
| **TC-PRM-07** | Hiển thị huy hiệu LIVE NOW phát sáng | Có chương trình đang chiếu tại thời điểm hiện tại | - Hiển thị widget `LiveNowPulseWidget` màu đỏ nhấp nháy phát sáng trên thẻ phim. | | | | | |
| **TC-PRM-08** | Xem Video Trailer YouTube trong app | Mở màn hình `ProgramDetailScreen`<br>1. Bấm nút Play Trailer | - Video trailer YouTube tải và phát HD mượt mà, hỗ trợ xoay ngang màn hình (Landscape). | | | | | |
| **TC-PRM-09** | Vuốt để làm mới (Pull-to-Refresh) | Tại `HomeScreen` hoặc `EpgTimelineScreen`, vuốt màn hình từ trên xuống | - Hiển thị vòng xoay loading, nạp lại dữ liệu EPG mới nhất từ Vercel API Live. | | | | | |

---

### 2.3. Mobile: Tìm kiếm Nâng cao OData & Filter Chips

| Mã TC | Kịch Bản Kiểm Thử | Dữ Liệu & Các Bước Thực Hiện | Kết Quả Mong Đợi (Expected Result) | Kết Quả Thực Tế (Actual Result) | Trạng Thái (Status) | Người Test | Ngày Test | Ghi Chú / Bug ID |
|:---:|:---|:---|:---|:---|:---:|:---:|:---:|:---|
| **TC-PRM-10** | Tìm kiếm OData có Debounce | Mở `AdvancedSearchScreen`<br>1. Gõ liên tục từ khóa tìm kiếm | - Sau khi dừng gõ 300ms mới gửi 1 request OData lên server (chống spam request). | | | | | |
| **TC-PRM-11** | Bật tắt Filter Chips linh hoạt | Chạm chọn các chips: `Phim >60p`, `Kênh Cinema` | - `ODataQueryBuilder` tạo chuỗi query `$filter` chuẩn, danh sách lọc cập nhật dưới 300ms. | | | | | |
| **TC-PRM-12** | Staff kích hoạt AI trên Mobile | Đăng nhập tài khoản Staff, mở `StaffCuratorScreen`<br>1. Bấm "Kích hoạt Thẩm định AI" | - Hiển thị Shimmer Loading.<br>- Sau khi xong hiển thị BottomSheet kết quả thẩm định. | | | | | |

---

### 2.4. Mobile: SQLite Offline-First & Quản lý Watchlist Ngoại tuyến

| Mã TC | Kịch Bản Kiểm Thử | Dữ Liệu & Các Bước Thực Hiện | Kết Quả Mong Đợi (Expected Result) | Kết Quả Thực Tế (Actual Result) | Trạng Thái (Status) | Người Test | Ngày Test | Ghi Chú / Bug ID |
|:---:|:---|:---|:---|:---|:---:|:---:|:---:|:---|
| **TC-PRM-13** | Thêm chương trình vào Watchlist | Tại `ProgramDetailScreen`, bấm nút "Thêm vào Watchlist" | - Dữ liệu phim được lưu tức thì vào SQLite cục bộ (`insertWatchlist`), nút đổi thành "Đã lưu". | | | | | |
| **TC-PRM-14** | Mở Watchlist khi ngắt mạng (Airplane Mode) | Bật chế độ máy bay (ngắt toàn bộ Wifi/4G)<br>1. Mở tab `WatchlistScreen` | - App không crash.<br>- Hiển thị Banner cảnh báo màu vàng "Chế độ Ngoại tuyến".<br>- Đọc trọn vẹn danh sách phim từ SQLite. | | | | | |
| **TC-PRM-15** | Xóa chương trình khỏi Watchlist | Tại màn hình `WatchlistScreen`, bấm nút Thùng rác xóa 1 phim | - Bản ghi bị xóa khỏi SQLite local, danh sách cập nhật ngay lập tức. | | | | | |

---

### 2.5. Mobile: Hẹn giờ Thông báo Native Push trước 15 phút

| Mã TC | Kịch Bản Kiểm Thử | Dữ Liệu & Các Bước Thực Hiện | Kết Quả Mong Đợi (Expected Result) | Kết Quả Thực Tế (Actual Result) | Trạng Thái (Status) | Người Test | Ngày Test | Ghi Chú / Bug ID |
|:---:|:---|:---|:---|:---|:---:|:---:|:---:|:---|
| **TC-PRM-16** | Đặt lịch hẹn giờ thông báo | Chương trình chiếu lúc `20:00`<br>1. Bấm nút "Nhắc tôi"<br>2. Cấp quyền Notification | - `LocalNotificationService` tạo lịch hẹn Native lúc `19:45` (trước 15p), hiển thị SnackBar xác nhận. | | | | | |
| **TC-PRM-17** | Nhận thông báo Native khi tắt app | Đã hẹn giờ trước đó<br>1. Tắt hoàn toàn app (Kill task)<br>2. Chờ đến đúng giờ hẹn (`AirDateTime - 15m`) | - Điện thoại Android nhận được thông báo Native kèm chuông và rung, hiển thị tựa đề phim. | | | | | |
| **TC-PRM-18** | Chạm thông báo mở màn hình chi tiết | Nhận thông báo trên thanh trạng thái Android<br>1. Chạm vào thông báo | - App tự khởi chạy và điều hướng mở thẳng màn hình `ProgramDetailScreen` của phim đó. | | | | | |

---

### 2.6. Mobile: Đóng gói APK Release & Kiểm thử Thiết bị Android thật

| Mã TC | Kịch Bản Kiểm Thử | Dữ Liệu & Các Bước Thực Hiện | Kết Quả Mong Đợi (Expected Result) | Kết Quả Thực Tế (Actual Result) | Trạng Thái (Status) | Người Test | Ngày Test | Ghi Chú / Bug ID |
|:---:|:---|:---|:---|:---|:---:|:---:|:---:|:---|
| **TC-PRM-19** | Đóng gói bản phát hành chính thức | Tại thư mục `mobile/`, chạy `flutter build apk --release` | - Tạo thành công file `app-release.apk` tại `build/app/outputs/flutter-apk/` (dung lượng ≤ 25MB). | | | | | |
| **TC-PRM-20** | Cài đặt và chạy trên máy Android thật | Cài file APK lên điện thoại Android thật (Android 11 - 14) | - App chạy mượt mà 60 FPS, kết nối trực tiếp với Backend Vercel Live thông suốt 100%. | | | | | |

---

## 3. 📊 BẢNG TỔNG KẾT TIẾN ĐỘ KIỂM THỬ (TESTING PROGRESS DASHBOARD)

> 💡 *Sau mỗi đợt kiểm thử hoặc Review tiến độ, nhóm thống kê số lượng Test Cases đạt và chưa đạt vào bảng dưới đây:*

| Phân Hệ / Môn Học | Tổng Số Test Cases | Số Test Đạt (PASS) | Số Test Lỗi (FAIL) | Bị Nghẽn (BLOCKED) | Chưa Chạy (NOT RUN) | Tỷ Lệ Đạt (% Pass) |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| 💻 **PRN232 - Backend .NET 10 API** | **23** | | | | 23 | % |
| 🌐 **PRN232 - Web Next.js 15 Portal** | **8** | | | | 8 | % |
| 📱 **PRM393 - Flutter Mobile App** | **20** | | | | 20 | % |
| **TỔNG CỘNG TOÀN HỆ THỐNG** | **51** | | | | **51** | **%** |

---
*Biểu mẫu Test Cases Execution Sheet này được dùng trong toàn bộ quá trình lập trình, kiểm thử và báo cáo nghiệm thu 4 đợt Review cho cả hai môn PRN232 & PRM393.*
