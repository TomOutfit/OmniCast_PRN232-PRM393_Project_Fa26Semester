# 📱 OmniCast — Danh Mục Test Cases Môn PRM393
## Phân Hệ: Ứng Dụng Di Động Flutter (Clean Architecture, BLoC, SQLite Offline-First, OmniPlayer)

---

### 1. Thông Tin Chung
- **Dự án:** OmniCast Mobile — Cross-Platform Broadcast & Streaming Client
- **Môn học:** PRM393 (Mobile Applications Development)
- **Học kỳ:** Fa26
- **Tổng số ca kiểm thử:** 24 Test Cases thủ công / Tích hợp + 91 Automated Tests (Flutter Unit & Widget Tests)
- **Tỷ lệ thực thi:** 100% ĐẠT (PASS)

---

### 2. Danh Mục Test Cases Chi Tiết

#### 2.1. Quản lý Trạng thái Phiên & Bảo mật Token (AuthBloc)
| Mã TC | Kịch bản kiểm thử | Dữ liệu đầu vào & Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-PRM-01** | Đăng nhập tài khoản trên thiết bị di động | Điền email/mật khẩu tại `LoginScreen`, bấm Đăng nhập | `AuthBloc` phát trạng thái `AuthLoading` -> `Authenticated`. Lưu access/refresh token vào `flutter_secure_storage`. | Đăng nhập thành công, chuyển hướng về Trang chủ | **PASS** |
| **TC-PRM-02** | Tự động làm mới phiên đăng nhập (Silent Token Refresh) | Khi Access Token hết hạn (401), gửi request ngầm | `AuthInterceptor` tạm khóa hàng đợi, gọi `/auth/refresh` bằng refresh token và phát lại request mà không văng ra màn hình đăng nhập. | Tự động làm mới mượt mà | **PASS** |
| **TC-PRM-03** | Đăng xuất an toàn | Bấm Đăng xuất tại `ProfileScreen` | Xóa dữ liệu phiên trong SecureStorage, xóa bộ đệm cá nhân hóa, chuyển hướng về màn hình Đăng nhập. | Trạng thái đăng xuất sạch sẽ | **PASS** |

#### 2.2. Cơ chế Hoạt động Ngoại tuyến & Đồng bộ Danh sách Xem (WatchlistBloc & SQLite)
| Mã TC | Kịch bản kiểm thử | Dữ liệu đầu vào & Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-PRM-04** | Thêm chương trình vào Watchlist khi có mạng (Online) | Bấm nút Lưu vào Watchlist tại trang chi tiết chương trình | Giao diện cập nhật ngay lập tức (Optimistic UI), ghi nhận vào SQLite `watchlist` và gửi `POST /me/watchlist` lên máy chủ. | Trạng thái đồng bộ tức thì | **PASS** |
| **TC-PRM-05** | Thêm chương trình vào Watchlist khi MẤT MẠNG (Offline) | Bật chế độ máy bay (Airplane mode), bấm Lưu vào Watchlist | Lưu vào bảng SQLite `watchlist` với cờ `dirty = 1`, ghi bản ghi thêm vào bảng `pending_ops`. Không hiện lỗi mạng. | Lưu ngoại tuyến thành công | **PASS** |
| **TC-PRM-06** | Xóa chương trình khỏi Watchlist khi MẤT MẠNG | Tiếp tục ở chế độ ngoại tuyến, bấm Bỏ lưu chương trình | Xóa khỏi danh sách hiển thị, ghi nhận thao tác xóa vào hàng đợi `pending_ops`. | Ghi nhận thao tác xóa vào SQLite | **PASS** |
| **TC-PRM-07** | Tự động phát lại thao tác (Replay) khi có mạng trở lại | Tắt chế độ máy bay (kết nối Wi-Fi/4G phục hồi) | Dịch vụ `WatchlistSyncService` tự động duyệt các thao tác trong `pending_ops`, gửi lên NestJS API và làm sạch hàng đợi. | Đồng bộ hoàn tất, cờ dirty = 0 | **PASS** |
| **TC-PRM-08** | Hiển thị thống kê bộ nhớ đệm (CacheStats) | Truy cập mục Cài đặt -> Quản lý dữ liệu cục bộ | Hiển thị chính xác số kênh, số chương trình, số mục watchlist và kích thước tệp `omnicast_local.db` (KB/MB). | Thông số bộ nhớ đệm hiển thị chính xác | **PASS** |

#### 2.3. Lên Lịch Thông Báo Nhắc Lịch Cục Bộ Trước 15 Phút
| Mã TC | Kịch bản kiểm thử | Dữ liệu đầu vào & Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-PRM-09** | Đặt lịch nhắc tự động cho sự kiện sắp tới | Lưu chương trình phát sóng lúc 19:00 vào Watchlist | Tự động tính mốc `18:45` (19:00 - 15 phút), gọi `zonedSchedule` với chế độ `exactAllowWhileIdle`. | Thông báo được lên lịch chính xác | **PASS** |
| **TC-PRM-10** | Hủy lịch nhắc khi xóa chương trình | Xóa chương trình đã lưu khỏi Watchlist | Tự động hủy thông báo cục bộ tương ứng qua `notificationsPlugin.cancel(id)`. | Lịch nhắc bị hủy bỏ thành công | **PASS** |

#### 2.4. Trình Phát Đa Phương Tiện OmniPlayer & Tương Tác Trực Tiếp
| Mã TC | Kịch bản kiểm thử | Dữ liệu đầu vào & Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-PRM-11** | Phát luồng trực tiếp MediaMTX trên mạng cục bộ | Mở một kênh đang trực tiếp trên thiết bị thật | `OmniPlayer` tự động thay thế `localhost` bằng IP máy chủ LAN, khởi tạo trình phát HLS/WebRTC mượt mà. | Video phát ổn định < 1s độ trễ | **PASS** |
| **TC-PRM-12** | Tự động phục hồi khi mất kết nối luồng phát | Giả lập rớt gói mạng trong 3 giây khi đang xem | Trình phát hiển thị vòng tròn chờ tải lại nhẹ, tự kích hoạt retry theo Exponential Backoff mà không crash ứng dụng. | Tự động kết nối lại khi có luồng | **PASS** |
| **TC-PRM-13** | Gửi và nhận tin nhắn Live Chat thời gian thực | Nhập bình luận tại thanh chat trên màn hình Live | Gửi qua WebSocket `/live`, tin nhắn xuất hiện tức thì trong danh sách chat bán trong suốt của tất cả người xem. | Tin nhắn hiển thị tức thời | **PASS** |
| **TC-PRM-14** | Thả cảm xúc hoạt họa nổi (Floating Reactions) | Bấm liên tục biểu tượng Trái tim và Lửa | Biểu tượng cảm xúc bay lên màn hình với chuyển động cong mượt mà, phát tán qua WebSocket tới các máy khác. | Hiệu ứng CustomPainter mượt 60fps | **PASS** |
| **TC-PRM-15** | Quyên góp ủng hộ trực tiếp (Live Donation Sheet) | Mở modal quyên góp, chọn mức 20.000đ và gửi lời nhắn | Xác thực giao dịch thành công, hiển thị banner vinh danh người ủng hộ trên luồng phát. | Quyên góp được ghi nhận thành công | **PASS** |

#### 2.5. Điều Hướng GoRouter & Giao Diện Người Dùng
| Mã TC | Kịch bản kiểm thử | Dữ liệu đầu vào & Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-PRM-16** | Chuyển tab giữ nguyên trạng thái (StatefulShellRoute) | Cuộn trang Kênh đến vị trí giữa, chuyển sang tab EPG rồi quay lại tab Kênh | Vị trí cuộn và danh mục đã chọn của tab Kênh vẫn giữ nguyên vẹn, không bị khởi tạo lại từ đầu. | Giữ trạng thái cuộn mượt mà | **PASS** |
| **TC-PRM-17** | Bảo vệ tuyến đường cá nhân (Auth Guard) | Đăng xuất tài khoản, thử mở URL liên kết sâu `/watchlist` | `GoRouter` phát hiện trạng thái chưa xác thực, tự động điều hướng sang `/login?from=/watchlist`. | Chuyển hướng an toàn | **PASS** |
| **TC-PRM-18** | Tìm kiếm chống rung (Debounce Search) | Gõ nhanh từng ký tự trong ô tìm kiếm | `SearchBloc` áp dụng concurrency transformer `restartable` + debounce 300ms, chỉ gửi 1 request cuối cùng. | Tiết kiệm băng thông tối đa | **PASS** |
