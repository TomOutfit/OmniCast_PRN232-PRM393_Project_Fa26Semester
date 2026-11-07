# 📝 OmniCast — Ghi Chú Hiệu Chỉnh Tài Liệu Tham Khảo (Revision Notes)
## Đối Chiếu Sai Lệch Giữa Tài Liệu Thiết Kế Sơ Khai & Hiện Thực Mã Nguồn Thực Tế

---

### 1. Mục Đích Của Tài Liệu Này

Thư mục `05_Reference_Docs/` lưu trữ toàn bộ các tài liệu phân tích nghiệp vụ, tài liệu thiết kế kiến trúc sơ khai được lập ở giai đoạn đầu của dự án OmniCast (giai đoạn đề xuất đề tài). 

Trong quá trình triển khai thực tế trên mã nguồn, để đáp ứng tối đa các yêu cầu kỹ thuật hiện đại, chuẩn hóa mô hình phân tầng và tối ưu hóa hiệu năng, nhóm phát triển đã có những bước cải tiến kiến trúc đáng kể so với bản phác thảo ban đầu. Tài liệu này liệt kê chi tiết các điểm sai lệch và lý do kỹ thuật đằng sau mỗi quyết định thay đổi.

---

### 2. Bảng Đối Chiếu Các Sai Lệch Trọng Yếu

| Hạng mục kỹ thuật | Thiết kế sơ khai trong `Document/` | Hiện thực mã nguồn thực tế | Lý do kỹ thuật thay đổi |
| :--- | :--- | :--- | :--- |
| **Công nghệ Back-End chính** | Dự thảo C# .NET Core Web API + FastAPI Python cho AI | **NestJS 10 (TypeScript)** thống nhất, tích hợp microservice gRPC kiểm toán | NestJS mang lại kiến trúc module hóa chặt chẽ theo Dependency Injection, đồng bộ kiểu dữ liệu TypeScript với Next.js và hỗ trợ WebSocket tốt hơn. |
| **Truy vấn Dữ liệu Động** | Dự kiến tích hợp OData 8.x cho .NET | Bộ **Query Builder động** trên NestJS kết hợp **Prisma ORM** | Prisma cung cấp khả năng Type-Safe tuyệt đối tại thời điểm biên dịch, ngăn ngừa lỗi runtime so với OData truyền thống. |
| **Quy mô Lược đồ Cơ sở dữ liệu** | 14 bảng dữ liệu sơ bộ | **21 Models Prisma** chuẩn hóa trên PostgreSQL | Bổ sung các bảng quan trọng cho vận hành thực tế: `AiCuratorReport`, `StreamDonation`, `WatchHistory`, `Notification`, `CommentLike`, `ProductionTag`. |
| **Giao thức Phát sóng Trực tiếp** | RTMP truyền thống | **WHIP / WebRTC & HLS qua MediaMTX** | WebRTC mang lại độ trễ siêu thấp (< 1 giây) phù hợp tương tác thời gian thực, trong khi HLS tối ưu khả năng tương thích trên thiết bị di động. |
| **Quản lý Trạng thái Di động** | Provider / StateNotifier cơ bản | **flutter_bloc (BLoC Pattern)** với 12 module và concurrency transformers | BLoC tách biệt hoàn toàn logic nghiệp vụ khỏi UI, hỗ trợ xử lý luồng sự kiện phản ứng và dễ dàng viết 91 ca kiểm thử đơn vị. |
| **Cơ chế Ngoại tuyến Di động** | Bộ nhớ đệm SharedPreferences đơn giản | **SQLite cục bộ (`omnicast_local.db`)** với hàng đợi `pending_ops` | Cho phép truy vấn có cấu trúc, lưu trữ toàn bộ lưới EPG nhiều ngày và phát lại các đột biến dữ liệu theo thứ tự FIFO khi có mạng. |
| **Trợ lý Biên tập AI** | Gọi nhiều API phân mảnh, phụ thuộc cứng | **Quy trình đơn lệnh (Consolidated Call)**, kiểm duyệt qua Zod, có đường fallback Heuristic | Tiết kiệm 75% chi phí API OpenAI, giảm độ trễ phản hồi từ 12s xuống 2.4s và bảo đảm hệ thống vẫn chạy khi mất mạng. |

---

### 3. Hướng Dẫn Đọc & Sử Dụng Tài Liệu Trong Thư Mục Này

- Khi chấm điểm kiến trúc và mã nguồn thực tế, quý thầy cô và hội đồng vui lòng tham khảo bộ báo cáo chuẩn học thuật tại:
  - `01_Reports/PRN232/PRN232_Report_VI.pdf` (và `.docx`)
  - `01_Reports/PRM393/PRM393_Report_VI.pdf` (và `.docx`)
- Các tệp trong thư mục `05_Reference_Docs/` (như `PRD.md`, `DATABASE_DESIGN.md`, `STREAMING_PLAN.md`) được giữ lại nguyên vẹn nhằm thể hiện tính liên tục trong quá trình nghiên cứu và phát triển sản phẩm qua từng giai đoạn học kỳ.
