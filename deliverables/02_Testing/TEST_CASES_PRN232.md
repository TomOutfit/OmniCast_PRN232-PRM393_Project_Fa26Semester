# 📋 OmniCast — Danh Mục Test Cases Môn PRN232
## Phân Hệ: Back-End NestJS (19 Modules, REST API, gRPC) & Web Portal Next.js 15

**Học viện Công nghệ FPT Quy Nhơn — FPTU Quy Nhon AI Campus - FU Cahata**  
*Dự án: OmniCast — Nền tảng Truyền thông & Trí tuệ Phát thanh Truyền hình Đa Phương tiện*

---

### Thông Tin Dự Án & Hội Đồng Kiểm Thử
- **Đơn vị đào tạo:** Đại học FPT Quy Nhơn (FPTU Quy Nhon AI Campus)
- **Tổ chức / Câu lạc bộ:** FU Cahata
- **Môn học:** PRN232 (Building Cross-Platform Back-End Application)
- **Học kỳ:** Fall 2026 (Fa26)
- **Giảng viên hướng dẫn (Mentor):** Thầy **Huỳnh Vang**
- **Nhóm sinh viên thực hiện (4 thành viên):**
  1. **Nguyễn Bình An** (`TomOutfit` — Trưởng nhóm / Tech Lead)
  2. **Trần Thanh Sơn** (`TranThanhSonQE170080` — MSSV: `QE170080`)
  3. **Nguyễn Vĩnh Phú** (`phunvqe180136` — MSSV: `QE180136`)
  4. **Đồng Hoàng Nguyên** (`teng122`)
- **Tổng số ca kiểm thử:** 32 Test Cases chức năng / E2E + 391 Automated Tests (163 Backend + 228 Frontend)
- **Tỷ lệ thực thi:** 100% ĐẠT (PASS)

---

### Danh Mục Test Cases Chi Tiết

#### 1. Module Xác thực, JWT & Phân quyền RBAC (Role-Based Access Control)
| Mã TC | Kịch bản kiểm thử | Dữ liệu đầu vào & Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-PRN-01** | Đăng ký tài khoản người dùng mới | `POST /api/v1/auth/register`<br>Body: `{ email, password, fullName }` | HTTP 201 Created, mật khẩu mã hóa bcrypt 10 rounds, gán quyền mặc định `VIEWER` (Role 1). | Trả về thông tin User đã tạo không kèm mật khẩu | **PASS** |
| **TC-PRN-02** | Đăng ký trùng lặp email đã có | `POST /api/v1/auth/register` với email đã tồn tại trong DB | HTTP 409 Conflict, thông báo `"Email already registered"`. | Trả về đúng mã lỗi 409 | **PASS** |
| **TC-PRN-03** | Đăng nhập tài khoản hợp lệ | `POST /api/v1/auth/login`<br>Body: `{ email, password }` | HTTP 200 OK, trả về cặp `accessToken` (hạn 60m) và `refreshToken` (xoay vòng 90 ngày). | Trả về token và hồ sơ người dùng | **PASS** |
| **TC-PRN-04** | Đăng nhập sai mật khẩu | `POST /api/v1/auth/login` với mật khẩu sai | HTTP 401 Unauthorized, thông báo lỗi xác thực bảo mật. | HTTP 401 Unauthorized | **PASS** |
| **TC-PRN-05** | Xoay vòng Refresh Token | `POST /api/v1/auth/refresh`<br>Header: `Authorization: Bearer <refreshToken>` | HTTP 200 OK, thu hồi token cũ trong bảng `RefreshToken`, cấp phát cặp token mới. | Token cũ vô hiệu hóa, cấp cặp token mới | **PASS** |
| **TC-PRN-06** | Kiểm soát quyền truy cập RBAC (StaffOnly) | Dùng token `VIEWER` gọi `POST /api/v1/channels` | HTTP 403 Forbidden qua `RolesGuard`. | HTTP 403 Forbidden | **PASS** |
| **TC-PRN-07** | Quản trị viên truy cập nhật ký kiểm toán | Dùng token `ADMIN` gọi `GET /api/v1/admin/audit-logs` | HTTP 200 OK, dữ liệu nhật ký đồng bộ từ gRPC microservice. | HTTP 200 OK | **PASS** |

#### 2. Module Kênh & Thuật toán Phát hiện Xung đột Lịch phát (Anti-Conflict Scheduling)
| Mã TC | Kịch bản kiểm thử | Dữ liệu đầu vào & Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-PRN-08** | Lấy danh mục kênh phát sóng | `GET /api/v1/channels` (Public) | HTTP 200 OK, danh sách kênh có đầy đủ logo, slug, danh mục và trạng thái. | Danh mục kênh tải đầy đủ | **PASS** |
| **TC-PRN-09** | Thêm lịch phát sóng không xung đột | `POST /api/v1/programs` khung giờ trống `10:00 - 11:00` | HTTP 201 Created, bản ghi `LiveEvent` được lưu vào PostgreSQL. | Sự kiện lưu thành công | **PASS** |
| **TC-PRN-10** | Xung đột lịch: Giao thoa phần đầu | Kênh 1 có lịch `14:00 - 15:00`. Thêm lịch `13:30 - 14:30` | HTTP 409 Conflict, thông báo xung đột với sự kiện hiện có. | HTTP 409 Conflict | **PASS** |
| **TC-PRN-11** | Xung đột lịch: Giao thoa phần đuôi | Kênh 1 có lịch `14:00 - 15:00`. Thêm lịch `14:30 - 15:30` | HTTP 409 Conflict, thông báo xung đột thời gian kết thúc. | HTTP 409 Conflict | **PASS** |
| **TC-PRN-12** | Xung đột lịch: Bao trùm toàn bộ | Kênh 1 có lịch `14:00 - 15:00`. Thêm lịch `13:00 - 16:00` | HTTP 409 Conflict, chặn lưu vào cơ sở dữ liệu. | HTTP 409 Conflict | **PASS** |
| **TC-PRN-13** | Cùng giờ chiếu nhưng trên kênh khác | Kênh 1 có lịch `14:00 - 15:00`. Thêm lịch `14:00 - 15:00` trên Kênh 2 | HTTP 201 Created (cho phép hai kênh phát sóng song song). | HTTP 201 Created | **PASS** |

#### 3. Module Cơ chế Điền Lịch EPG 24/7 (24/7 Seeded Filler)
| Mã TC | Kịch bản kiểm thử | Dữ liệu đầu vào & Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-PRN-14** | Truy vấn EPG ngày có lịch thưa thớt | `GET /api/v1/epg?channelId=1&date=2026-10-28` | HTTP 200 OK, lưới 24 giờ không bị khoảng trống (gaps) nhờ thuật toán chèn bản ghi đệm. | Lưới EPG lấp đầy 24 giờ | **PASS** |
| **TC-PRN-15** | Tính tái lập của EPG Filler | Gọi liên tiếp 2 lần cùng kênh và cùng ngày | Cùng một bộ dữ liệu chương trình với thứ tự cố định dựa trên seed ngẫu nhiên xác định. | Kết quả 2 lần gọi trùng khớp 100% | **PASS** |

#### 4. Module Trợ Lý Biên Tập AI (AI Curator Pipeline)
| Mã TC | Kịch bản kiểm thử | Dữ liệu đầu vào & Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-PRN-16** | Đánh giá nội dung với OpenAI API | `POST /api/v1/ai-curator/curate` khi có `OPENAI_API_KEY` | Gọi mô hình GPT-4o một lần duy nhất, kết quả kiểm tra qua Zod schema, lưu báo cáo vào PostgreSQL. | Báo cáo AI sinh thành công | **PASS** |
| **TC-PRN-17** | Chế độ dự phòng Heuristic (Fallback) | Gọi phân tích khi tắt `OPENAI_API_KEY` hoặc lỗi mạng | Hệ thống chuyển sang thuật toán Heuristic, tính điểm tuân thủ và độ tin cậy từ kho luật ngữ cảnh. | Báo cáo Heuristic trả về đúng chuẩn | **PASS** |
| **TC-PRN-18** | Lưu trữ dấu vết phiên bản (Provenance) | Kiểm tra bản ghi `AiCuratorReport` trong cơ sở dữ liệu | Lưu đầy đủ `promptVersion`, `aiModelVersion`, `executionTimeMs`, `retryCount`. | Thông tin dấu vết đầy đủ | **PASS** |

#### 5. Module Tương Tác Thời Gian Thực & Phòng LiveStream (`/live/[id]`)
| Mã TC | Kịch bản kiểm thử | Dữ liệu đầu vào & Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-PRN-19** | Kết nối Socket.IO Namespace `/live` | Client kết nối Socket tới `/live` với query `channelId=1` | Server chấp nhận kết nối, tự động gia nhập room `channel:1`, phát sự kiện `viewerCount`. | Kết nối thành công, đếm số người xem chính xác | **PASS** |
| **TC-PRN-20** | Live Chat kèm kiểm duyệt vi phạm | Gửi tin nhắn chứa từ khóa spam hoặc vượt quá độ dài | Bộ lọc Regex & Heuristic chặn tin nhắn độc hại, phát tin nhắn hợp lệ tới phòng. | Lọc tin rác hoạt động chuẩn xác | **PASS** |
| **TC-PRN-21** | Phát tán Floating Reactions thời gian thực | Client gửi sự kiện `reaction` với emoji `heart`, `fire` | Server nhận và broadcast tới toàn bộ client trong room `< 50ms`. | Phản hồi tức thì | **PASS** |
| **TC-PRN-22** | Chuyển đổi 7 bộ chủ đề phòng Live (Room Themes) | Người dùng chọn chủ đề Sunset, Ocean, Neon, Sakura... | Giao diện Next.js thay đổi toàn bộ biến màu CSS và hiệu ứng mà không ngắt luồng video HLS. | Chuyển chủ đề trơn tru | **PASS** |
| **TC-PRN-23** | Khởi tạo và Bỏ phiếu Live Poll | Host tạo cuộc thăm dò, Viewer gửi phiếu bầu | Cập nhật tỷ lệ phiếu bầu theo thời gian thực tới tất cả khán giả. | Thăm dò thời gian thực chính xác | **PASS** |
| **TC-PRN-24** | Đặt câu hỏi và Ghim Q&A lên màn hình | Viewer gửi câu hỏi, Host bấm `Highlight on Screen` | Phát sự kiện `highlightQuestion`, câu hỏi ghim cố định trên khung chiếu video. | Câu hỏi ghim nổi bật | **PASS** |
| **TC-PRN-25** | Ghim thẻ sản phẩm Live Commerce | Host bấm `Pin Product` từ bảng điều khiển Studio | Sự kiện `pinnedProduct` gửi tới khán giả, hiển thị thẻ mua hàng nổi bật. | Thẻ sản phẩm nổi lên tức thời | **PASS** |

#### 6. Module Bàn Điều Khiển Phát Sóng Studio (`/studio/live`)
| Mã TC | Kịch bản kiểm thử | Dữ liệu đầu vào & Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-PRN-26** | Cấp phát khóa luồng RTMP / WHIP | Staff truy cập `/studio/live`, chọn kênh | Server trả về `streamKey` bảo mật và endpoint `whipUrl` hợp lệ. | Cấp khóa luồng bảo mật | **PASS** |
| **TC-PRN-27** | Đẩy luồng WebRTC WHIP từ trình duyệt | Bật WebCam/Screen Share, bấm `Go Live` | Thiết lập PeerConnection tới MediaMTX, truyền video và audio trễ < 500ms. | Luồng phát ổn định | **PASS** |
| **TC-PRN-28** | Chế độ phát lặp ảo (Virtual Loop Stream) | Kích hoạt chế độ Loop cho kênh không có streamer trực tiếp | Hệ thống tự động nạp danh sách VOD và phát lặp 24/7 không gián đoạn. | Phát lặp mượt mà | **PASS** |
| **TC-PRN-29** | Quản lý điều phối 4 Tab Studio | Chuyển đổi giữa Chat Moderation, Polls, Q&A, Commerce | Mỗi tab hoạt động độc lập, không ảnh hưởng đến luồng truyền phát đang chạy. | Điều khiển mượt mà | **PASS** |

#### 7. Module Standalone gRPC Audit Microservice & Cổng Web
| Mã TC | Kịch bản kiểm thử | Dữ liệu đầu vào & Các bước | Kết quả mong đợi | Kết quả thực tế | Trạng thái |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **TC-PRN-30** | Ghi nhận nhật ký kiểm toán qua gRPC | Khi thực hiện thao tác nhạy cảm (đổi role, xóa kênh) | NestJS gọi gRPC Client `LogActivity`, microservice ghi nhận vào DB độc lập. | Nhật ký ghi nhận tức thì | **PASS** |
| **TC-PRN-31** | Tải trang chủ Cổng Web Next.js 15 | Truy cập URL `/` trên trình duyệt | HTTP 200 OK, tải SSR mượt mà kèm Navbar, Carousel, Kênh nổi bật. | Tải trang < 450ms | **PASS** |
| **TC-PRN-32** | Tìm kiếm chống rung (Debounce Search) | Nhập từ khóa tại `/search` | Debounce 300ms, gửi query và hiển thị kết quả phân loại kênh, chương trình, VOD. | Kết quả hiển thị chính xác | **PASS** |
