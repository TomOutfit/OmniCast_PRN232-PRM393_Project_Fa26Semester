# 📋 OmniCast — Danh Mục Test Cases Môn PRN232
## Phân Hệ: Back-End NestJS (19 Modules, REST API, gRPC) & Web Portal Next.js 15

---

### 1. Thông Tin Chung
- **Dự án:** OmniCast — Enterprise Media & Broadcast Intelligence Platform
- **Môn học:** PRN232 (Building Cross-Platform Back-End Application)
- **Học kỳ:** Fa26
- **Tổng số ca kiểm thử:** 28 Test Cases thủ công / E2E + 391 Automated Tests (163 Backend + 228 Frontend)
- **Tỷ lệ thực thi:** 100% ĐẠT (PASS)

---

### 2. Danh Mục Test Cases Chi Tiết

#### 2.1. Module Xác thực, JWT & Phân quyền RBAC (Role-Based Access Control)
| Mã TC | Kịch bản kiểm thử | Dữ liệu đầu vào & Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-PRN-01** | Đăng ký tài khoản người dùng mới | `POST /api/v1/auth/register`<br>Body: `{ email, password, fullName }` | HTTP 201 Created, mật khẩu mã hóa bcrypt 10 rounds, gán quyền mặc định `VIEWER` (Role 1). | Trả về thông tin User đã tạo không kèm mật khẩu | **PASS** |
| **TC-PRN-02** | Đăng ký trùng lặp email đã có | `POST /api/v1/auth/register` với email đã tồn tại trong DB | HTTP 409 Conflict, thông báo `"Email already registered"`. | Trả về đúng mã lỗi 409 | **PASS** |
| **TC-PRN-03** | Đăng nhập tài khoản hợp lệ | `POST /api/v1/auth/login`<br>Body: `{ email, password }` | HTTP 200 OK, trả về cặp `accessToken` (hạn 60m) và `refreshToken` (xoay vòng 90 ngày). | Trả về token và hồ sơ người dùng | **PASS** |
| **TC-PRN-04** | Đăng nhập sai mật khẩu | `POST /api/v1/auth/login` với mật khẩu sai | HTTP 401 Unauthorized, thông báo lỗi xác thực bảo mật. | HTTP 401 Unauthorized | **PASS** |
| **TC-PRN-05** | Xoay vòng Refresh Token | `POST /api/v1/auth/refresh`<br>Header: `Authorization: Bearer <refreshToken>` | HTTP 200 OK, thu hồi token cũ trong bảng `RefreshToken`, cấp phát cặp token mới. | Token cũ vô hiệu hóa, cấp cặp token mới | **PASS** |
| **TC-PRN-06** | Kiểm soát quyền truy cập RBAC (StaffOnly) | Dùng token `VIEWER` gọi `POST /api/v1/channels` | HTTP 403 Forbidden qua `RolesGuard`. | HTTP 403 Forbidden | **PASS** |
| **TC-PRN-07** | Quản trị viên truy cập nhật ký kiểm toán | Dùng token `ADMIN` gọi `GET /api/v1/admin/audit-logs` | HTTP 200 OK, dữ liệu nhật ký đồng bộ từ gRPC microservice. | HTTP 200 OK | **PASS** |

#### 2.2. Module Kênh & Thuật toán Phát hiện Xung đột Lịch phát (Anti-Conflict Scheduling)
| Mã TC | Kịch bản kiểm thử | Dữ liệu đầu vào & Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-PRN-08** | Lấy danh mục kênh phát sóng | `GET /api/v1/channels` (Public) | HTTP 200 OK, danh sách kênh có đầy đủ logo, slug, danh mục và trạng thái. | Danh mục kênh tải đầy đủ | **PASS** |
| **TC-PRN-09** | Thêm lịch phát sóng không xung đột | `POST /api/v1/programs` khung giờ trống `10:00 - 11:00` | HTTP 201 Created, bản ghi `LiveEvent` được lưu vào PostgreSQL. | Sự kiện lưu thành công | **PASS** |
| **TC-PRN-10** | Xung đột lịch: Giao thoa phần đầu | Kênh 1 có lịch `14:00 - 15:00`. Thêm lịch `13:30 - 14:30` | HTTP 409 Conflict, thông báo xung đột với sự kiện hiện có. | HTTP 409 Conflict | **PASS** |
| **TC-PRN-11** | Xung đột lịch: Giao thoa phần đuôi | Kênh 1 có lịch `14:00 - 15:00`. Thêm lịch `14:30 - 15:30` | HTTP 409 Conflict, thông báo xung đột thời gian kết thúc. | HTTP 409 Conflict | **PASS** |
| **TC-PRN-12** | Xung đột lịch: Bao trùm toàn bộ | Kênh 1 có lịch `14:00 - 15:00`. Thêm lịch `13:00 - 16:00` | HTTP 409 Conflict, chặn lưu vào cơ sở dữ liệu. | HTTP 409 Conflict | **PASS** |
| **TC-PRN-13** | Cùng giờ chiếu nhưng trên kênh khác | Kênh 1 có lịch `14:00 - 15:00`. Thêm lịch `14:00 - 15:00` trên Kênh 2 | HTTP 201 Created (cho phép hai kênh phát sóng song song). | HTTP 201 Created | **PASS** |

#### 2.3. Module Cơ chế Điền Lịch EPG 24/7 (24/7 Seeded Filler)
| Mã TC | Kịch bản kiểm thử | Dữ liệu đầu vào & Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-PRN-14** | Truy vấn EPG ngày có lịch thưa thớt | `GET /api/v1/epg?channelId=1&date=2026-10-28` | HTTP 200 OK, lưới 24 giờ không bị khoảng trống (gaps) nhờ thuật toán chèn bản ghi đệm. | Lưới EPG lấp đầy 24 giờ | **PASS** |
| **TC-PRN-15** | Tính tái lập của EPG Filler | Gọi liên tiếp 2 lần cùng kênh và cùng ngày | Cùng một bộ dữ liệu chương trình với thứ tự cố định dựa trên seed ngẫu nhiên xác định. | Kết quả 2 lần gọi trùng khớp 100% | **PASS** |

#### 2.4. Module Trợ Lý Biên Tập AI (AI Curator Pipeline)
| Mã TC | Kịch bản kiểm thử | Dữ liệu đầu vào & Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-PRN-16** | Đánh giá nội dung với OpenAI API | `POST /api/v1/ai-curator/curate` khi có `OPENAI_API_KEY` | Gọi mô hình GPT-4o một lần duy nhất, kết quả kiểm tra qua Zod schema, lưu báo cáo vào PostgreSQL. | Báo cáo AI sinh thành công | **PASS** |
| **TC-PRN-17** | Chế độ dự phòng Heuristic (Fallback) | Gọi phân tích khi tắt `OPENAI_API_KEY` hoặc lỗi mạng | Hệ thống chuyển sang thuật toán Heuristic, tính điểm tuân thủ và độ tin cậy từ kho luật ngữ cảnh. | Báo cáo Heuristic trả về đúng chuẩn | **PASS** |
| **TC-PRN-18** | Lưu trữ dấu vết phiên bản (Provenance) | Kiểm tra bản ghi `AiCuratorReport` trong cơ sở dữ liệu | Lưu đầy đủ `promptVersion`, `aiModelVersion`, `executionTimeMs`, `retryCount`. | Thông tin dấu vết đầy đủ | **PASS** |

#### 2.5. Module Cổng Web Next.js 15 & Giao Diện Người Dùng
| Mã TC | Kịch bản kiểm thử | Dữ liệu đầu vào & Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-PRN-19** | Tải trang chủ Cổng Web | Truy cập URL `/` trên trình duyệt | HTTP 200 OK, hiển thị Featured Carousel, danh mục kênh, thanh điều hướng theo quyền. | Tải mượt mà < 500ms | **PASS** |
| **TC-PRN-20** | Xem lịch phát sóng EPG trên Web | Truy cập URL `/epg`, chọn ngày | Hiển thị bảng điều khiển EPG lưới thời gian, hỗ trợ lọc theo ngày và theo kênh. | Bảng EPG cuộn mượt | **PASS** |
| **TC-PRN-21** | Tìm kiếm tổng hợp theo từ khóa | Nhập từ khóa `"Tin tức"` trên ô tìm kiếm `/search` | Trả về danh sách kết quả tổng hợp kênh, sự kiện và bản ghi VOD sau debounce 300ms. | Kết quả hiển thị chính xác | **PASS** |
| **TC-PRN-22** | Truy cập Studio dành cho Creator | Đăng nhập tài khoản Staff, truy cập `/studio` | Hiển thị bảng điều khiển phát sóng trực tiếp, công cụ cấu hình WHIP và chạy AI Curator. | Bảng điều khiển Studio tải đầy đủ | **PASS** |
