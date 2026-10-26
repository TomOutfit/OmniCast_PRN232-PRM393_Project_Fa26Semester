### 🚀 OmniCast v1.2.0 — Đồng Bộ Telemetry Dashboard Đa Kênh, Hệ Sinh Thái Live Donate / Super Chat & Báo Cáo Kỹ Thuật Dự Án

Bản phát hành chính thức **OmniCast v1.2.0** đánh dấu bước chuyển mình toàn diện về năng lực giám sát hạ tầng thời gian thực và trải nghiệm tương tác tài chính số (Donation & Super Chat) đồng bộ liền mạch giữa **Frontend Web Studio** và **Mobile Flutter App**.

---

### 🌟 Các Cải Tiến & Tính Năng Trọng Tâm

#### 1. 📊 Hệ Thống Telemetry Dashboard Đa Kênh Thời Gian Thực (Web & Mobile)
- **Biểu đồ sóng Spline Bezier Đa Chiều**: Thay thế các biểu đồ đơn điệu trước đây bằng hệ thống đường cong Cubic Bezier mượt mà, đồng bộ 4 chỉ số viễn trắc then chốt:
  - 🔵 **Active CCU**: Số lượng người xem trực tiếp thời gian thực.
  - 🟢 **CDN Bandwidth**: Băng thông mạng truyền tải qua cụm Edge Server (Gbps).
  - 🟣 **Live Reactions**: Mật độ tương tác cảm xúc mỗi phút.
  - 🟡 **Capacity Baseline**: Ngưỡng tải định mức của cụm máy chủ phân phối.
- **Tương Tác Crosshair Thông Minh & Đa Khung Thời Gian**:
  - Hỗ trợ chuyển đổi linh hoạt giữa 3 chu kỳ quan sát: **Trực tiếp 60s**, **24 Giờ qua** và **7 Ngày gần nhất**.
  - Rê chuột trên Web hoặc chạm vuốt cảm ứng trên Mobile để kiểm tra chi tiết thông số tức thời (Interactive Crosshair Inspector & Floating Tooltip) kèm phản xạ rung Haptic Feedback.
- **Thước Đo Hiệu Năng & Phân Phối Nền Tảng**:
  - Bộ 4 thẻ KPI động: Đỉnh người xem đồng thời (Peak CCU), Băng thông tích lũy, Tần suất phản ứng và Tỷ lệ sẵn sàng hạ tầng.
  - Thanh phân bổ lưu lượng theo thiết bị người dùng: Web Desktop, Mobile App, Smart TV.

#### 2. 💖 Luồng Ủng Hộ Live Stream, Quét QR Sống Động & Nạp Tiền Trực Tiếp Vào Tài Khoản Streamer
- **Bộ Quà Tặng Ảo 6 Cấp Độ Đa Dạng**:
  - ☕ **Cà phê sáng** (10.000 ₫)
  - 🧋 **Trà sữa trân châu** (20.000 ₫)
  - 🍕 **Bữa tối vui vẻ** (50.000 ₫)
  - 🎆 **Pháo hoa VIP** (100.000 ₫)
  - 🚀 **Tên lửa siêu cấp** (200.000 ₫)
  - 💎 **Kim cương vương miện** (500.000 ₫)
- **Đa Dạng 4 Cổng Thanh Toán Trực Tuyến Mô Phỏng (Sandbox Mock Gateway)**:
  - Tích hợp lựa chọn 4 phương thức bản địa hóa: **Ví MoMo**, **VNPay QR Code**, **ZaloPay**, và **Thẻ ATM / Thẻ Quốc Tế**.
- **Màn Hình Quét Mã QR & Xác Nhận Chuyển Tiền Như Thật**:
  - Tạo mã QR động chuẩn VietQR / MoMo / ZaloPay hiển thị đầy đủ thông tin người thụ hưởng chính là **Streamer (Người tạo ra phiên phát sóng)**: Tên chủ tài khoản, Ngân hàng thụ hưởng (MBBank), Số tài khoản, Số tiền theo gói quà, Cú pháp chuyển khoản và đồng hồ đếm ngược phiên 15:00.
  - Người xem có thể quét hoặc bấm nút **"Xác nhận đã chuyển tiền (0đ thực tế)"** để hoàn tất đối soát tức thời.
- **Định Tuyến Tiền Ảo Vào Tài Khoản Thật Của Streamer**:
  - Giao dịch nguyên tử (`$transaction`) trong Supabase PostgreSQL tự động nhận diện `LiveEvent.channel.ownerId` và tăng số dư ví `User.walletBalance` cho Streamer.
  - Khán giả người xem không bị trừ tiền thật (chi phí thực tế = 0đ) và tiền ủng hộ không bao giờ bị nạp nhầm vào tài khoản người xem.
- **Ví Doanh Thu Streamer (Creator Sandbox Wallet)**:
  - Tích hợp khu vực quản lý số dư và lịch sử các khoản donate đã nhận trên trang hồ sơ cá nhân (Web Profile & Mobile).
- **Thẻ Ghim Super Chat & Hiệu Ứng Hạt Ăn Mừng (Celebration Particle FX)**:
  - Kích hoạt sự kiện thời gian thực WebSocket `live:donation:received` ghim thông điệp Super Chat đổi màu gradient nổi bật và phát pháo hoa rực rỡ trong phòng xem live.

#### 3. 🛡️ Cơ Chế Thanh Toán Mô Phỏng (Sandbox / Mock Gateway) — Cam Kết Không Mất Tiền Thật
- **Môi trường học tập an toàn 100%**: Dự án OmniCast là đồ án capstone học tập (PRN232 + PRM393, Fa26Semester). Tất cả tính năng ủng hộ (Donation), tặng quà ảo và gửi Super Chat đều hoạt động trong môi trường **Giả lập (Mock Payment Gateway)**.
- **Không trừ tiền ngân hàng**: Tất cả các tùy chọn thanh toán gồm **Ví MoMo**, **VNPay QR**, **ZaloPay**, và **Thẻ ATM / Visa** đều được dán nhãn `[Sandbox 0đ]` / `[Mô phỏng]`.
- **Chi phí thực tế = 0 ₫**: Hệ thống cam kết không thu thập thông tin thẻ ngân hàng thật, không kích hoạt giao dịch tài chính thật và **tuyệt đối không trừ tiền từ bất kỳ tài khoản nào** của người dùng.

#### 4. 📈 Mở Rộng Biểu Đồ Phân Tích Người Dùng & Thói Quen Cá Nhân (Frontend)
- **User Analytics & Retention**: Bổ sung biểu đồ thống kê DAU, thành viên đăng ký mới và tỷ lệ duy trì người dùng trong trang quản trị thành viên Admin.
- **Personal Viewing Habits**: Thêm biểu đồ thống kê thời lượng xem và dung lượng mạng đã xem theo tuần trong trang hồ sơ cá nhân.

#### 5. 📑 Báo Cáo Kỹ Thuật Toàn Diện (Project Technical Architecture Report)
- Đính kèm tệp tài liệu PDF chuẩn hóa quốc tế `OmniCast_Comprehensive_Project_Report.pdf` trình bày chi tiết kiến trúc vi dịch vụ (Microservices), cơ sở dữ liệu Entity-Relationship, hạ tầng phân phối video HLS/DASH/WebRTC và hệ thống phân quyền RBAC.

---

### 📦 Tải Về Cài Đặt Cho Điện Thoại Android (APK Release)

Chọn tệp APK tương thích với thiết bị của bạn để cài đặt trực tiếp:

| Tệp Cài Đặt (Asset) | Kích Thước | Thiết Bị Đề Xuất |
| :--- | :---: | :--- |
| **`app-arm64-v8a-release.apk`** | **41.0 MB** | **Khuyên dùng**: Dành cho tất cả smartphone Android đời mới (Samsung, Xiaomi, Realme, Oppo, Pixel, Vivo,...) |
| **`app-armeabi-v7a-release.apk`** | **34.3 MB** | Dành cho các dòng điện thoại hoặc máy tính bảng Android 32-bit đời cũ |
| **`app-x86_64-release.apk`** | **43.7 MB** | Dành cho máy tính chạy phần mềm giả lập (LDPlayer, NoxPlayer, Bluestacks, Android Studio Emulator) hoặc ChromeOS |
| **`OmniCast_Comprehensive_Project_Report.pdf`** | **1.3 MB** | Toàn văn báo cáo kiến trúc kỹ thuật dự án OmniCast |

---

### 🛠️ Hướng Dẫn Cài Đặt Nhanh Trên Điện Thoại Android
1. Nhấn tải tệp **`app-arm64-v8a-release.apk`** về điện thoại.
2. Mở tệp vừa tải về trong thư mục **Tải về (Downloads)** hoặc thanh thông báo.
3. Nếu điện thoại hiển thị cảnh báo bảo mật, chọn **Cài đặt từ nguồn này** (Allow from this source).
4. Nhấn **Cài đặt (Install)** và mở ứng dụng **OmniCast** để trải nghiệm ngay!
