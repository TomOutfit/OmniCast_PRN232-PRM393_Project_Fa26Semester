# 🎓 OmniCast — Bộ Hồ Sơ Bàn Giao & Báo Cáo Tốt Nghiệp Học Phần
## Đồ Án Hợp Nhất Môn PRN232 (Back-End Đa Nền Tảng) & PRM393 (Ứng Dụng Di Động)

---

### 📌 BẢNG ĐỐI CHIẾU TIÊU CHÍ NỘP BÀI (DELIVERABLES SUBMISSION CHECKLIST)

Bảng đối chiếu 100% các hạng mục yêu cầu nộp bài của Giảng viên:

| # | Hạng mục yêu cầu (Submission Items) | Trạng thái | Vị trí tài nguyên trong gói bàn giao |
| :-: | :--- | :---: | :--- |
| 1 | **Project report** | ✅ ĐẦY ĐỦ | • Word PRN232: `01_Reports/PRN232/PRN232_Report_VI.docx` & `EN.docx`<br>• Word PRM393: `01_Reports/PRM393/PRM393_Report_VI.docx` & `EN.docx`<br>• Báo cáo tổng thể: `05_Reference_Docs/OmniCast_Comprehensive_Project_Report.pdf` |
| 2 | **LaTeX source files** | ✅ ĐẦY ĐỦ | • Phân hệ PRN232: `01_Reports/PRN232/latex/`<br>• Phân hệ PRM393: `01_Reports/PRM393/latex/`<br>(Bao gồm toàn bộ `.tex`, `.bib`, macro TikZ, và bảng số liệu) |
| 3 | **GitHub repository link or source code** | ✅ ĐẦY ĐỦ | • **GitHub Repo:** [https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester](https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester)<br>• **Branch:** `main`<br>• **Chi tiết kiến trúc:** `04_Repository/REPOSITORY.md` |
| 4 | **Deployed web app & backend** | ✅ ĐANG CHẠY | • **Frontend Web:** [https://omnicast-fe.vercel.app](https://omnicast-fe.vercel.app)<br>• **Backend API Root:** [https://omnicast-api.vercel.app/api/v1](https://omnicast-api.vercel.app/api/v1)<br>• **API Swagger UI:** [https://omnicast-api.vercel.app/swagger](https://omnicast-api.vercel.app/swagger)<br>• **Tài khoản Demo Admin:** `admin@omnicast.tv` / `Admin123!`<br>• **Hướng dẫn chi tiết:** `03_Deployment/DEPLOYMENT.md` |
| 5 | **Testing documentation** | ✅ ĐẦY ĐỦ | • Thư mục: `02_Testing/`<br>• **Hồ sơ Master Testing:** `02_Testing/OmniCast_Comprehensive_Testing_Report.pdf` (cùng `.html` & `.docx`)<br>• Báo cáo tổng kết 482 tests PASS: `02_Testing/TEST_EXECUTION_REPORT.pdf` (cùng `.html`, `.docx`)<br>• Test cases PRN232 (32 ca): `02_Testing/TEST_CASES_PRN232.pdf` (cùng `.html`, `.docx`)<br>• Test cases PRM393 (28 ca): `02_Testing/TEST_CASES_PRM393.pdf` (cùng `.html`, `.docx`)<br>• Minh chứng E2E: `02_Testing/screenshots/` |
| 6 | **PDF version generated from LaTeX** | ✅ ĐẦY ĐỦ | • **PRN232 PDF (VI):** `01_Reports/PRN232/PRN232_Report_VI.pdf`<br>• **PRN232 PDF (EN):** `01_Reports/PRN232/PRN232_Report_EN.pdf`<br>• **PRM393 PDF (VI):** `01_Reports/PRM393/PRM393_Report_VI.pdf`<br>• **PRM393 PDF (EN):** `01_Reports/PRM393/PRM393_Report_EN.pdf` |

---

### 1. Thông Tin Chung Đồ Án

- **Tên dự án:** **OmniCast** — Enterprise Media & Broadcast Intelligence Platform  
- **Đơn vị & Câu lạc bộ:** **FPTU Quy Nhon AI Campus - FU Cahata** (Trường Đại học FPT)  
- **Giảng viên hướng dẫn (Mentor):** **Thầy Huỳnh Vang**  
- **Thành viên nhóm thực hiện (4 thành viên):**
  1. **Nguyễn Bình An** (`TomOutfit` — Nhóm trưởng / Kiến trúc Backend NestJS, Bảo mật JWT/RBAC, Thuật toán chống xung đột lịch EPG, Direct Stream Engine, CI/CD)
  2. **Trần Thanh Sơn** (`QE170080` — Kiến trúc vi dịch vụ gRPC Audit Logger, Cơ sở dữ liệu PostgreSQL Supabase 21 Prisma models, Telemetry & Seeding)
  3. **Nguyễn Vĩnh Phú** (`QE180136` — Trưởng nhóm Mobile Flutter 31 màn hình, 12 BLoC, Trình phát `OmniPlayer`, `LiveStudioScreen` 4 tab, Máy quay `MobileStudioRecorderScreen` WebRTC WHIP & Offline SQLite)
  4. **Đồng Hoàng Nguyên** (`teng122` — Full-Stack Web Next.js 15 33 route, Phòng xem Live 7 chủ đề `/live/[id]`, Bàn điều khiển `/studio/live`, Socket.IO `/live` & Trợ lý AI Curator)
- **Ý tưởng cốt lõi:** Hệ thống lập lịch, truyền phát trực tiếp (LiveStream & Live Studio) và phân phối nội dung số đa nền tảng kết hợp trợ lý biên tập AI, cơ chế EPG 24/7 không để trống lịch, trình phát đa phương tiện độ trễ thấp và ứng dụng di động ngoại tuyến (Offline-First).
- **Học kỳ:** Fall 2026 (Fa26)
- **Học phần thực hiện:**
  - **PRN232:** *Building Cross-Platform Back-End Application* (NestJS 10, Next.js 15, PostgreSQL Supabase, gRPC Microservice)
  - **PRM393:** *Mobile Applications Development* (Flutter 3.x, Dart, BLoC Pattern, SQLite Offline Cache, MediaMTX WebRTC/HLS)

---

### 2. Cấu Trúc Gói Hồ Sơ Bàn Giao (`deliverables/`)

Toàn bộ tài nguyên phục vụ việc đánh giá và nghiệm thu được quy hoạch khoa học thành 5 phân khu chính:

```
deliverables/
├── 00_README.md                     # [BẠN ĐANG ĐỌC] Bản chỉ dẫn nộp bài tổng quan
│
├── 01_Reports/                      # BỘ BÁO CÁO HỌC THUẬT CHUẨN IEEE (4 PDF + 4 DOCX)
│   ├── PRN232/
│   │   ├── PRN232_Report_VI.pdf     # Báo cáo PRN232 Tiếng Việt (13 trang: 1 Trang bìa chuẩn ĐH FPT + 12 trang IEEE, có phân trang)
│   │   ├── PRN232_Report_EN.pdf     # Báo cáo PRN232 Tiếng Anh (13 trang: 1 Trang bìa chuẩn ĐH FPT + 12 trang IEEE, có phân trang)
│   │   ├── PRN232_Report_VI.docx    # Bản Word tương ứng Tiếng Việt (có trang bìa & ngắt trang)
│   │   ├── PRN232_Report_EN.docx    # Bản Word tương ứng Tiếng Anh (có trang bìa & ngắt trang)
│   │   └── latex/                   # Mã nguồn LaTeX, TikZ sơ đồ, cover.tex, bảng biểu
│   └── PRM393/
│       ├── PRM393_Report_VI.pdf     # Báo cáo PRM393 Tiếng Việt (7 trang: 1 Trang bìa chuẩn ĐH FPT + 6 trang IEEE, có phân trang)
│       ├── PRM393_Report_EN.pdf     # Báo cáo PRM393 Tiếng Anh (7 trang: 1 Trang bìa chuẩn ĐH FPT + 6 trang IEEE, có phân trang)
│       ├── PRM393_Report_VI.docx    # Bản Word tương ứng Tiếng Việt (có trang bìa & ngắt trang)
│       ├── PRM393_Report_EN.docx    # Bản Word tương ứng Tiếng Anh (có trang bìa & ngắt trang)
│       └── latex/                   # Mã nguồn LaTeX, cover.tex và sơ đồ BLoC/SQLite
│
├── 02_Testing/                      # BỘ HỒ SƠ KIỂM THỬ ĐA NỀN TẢNG (482 TESTS)
│   ├── TEST_CASES_PRN232.md         # 22 Test cases chi tiết phân hệ Back-End & Web
│   ├── TEST_CASES_PRM393.md         # 18 Test cases chi tiết phân hệ Di Động
│   ├── TEST_EXECUTION_REPORT.md     # Báo cáo tổng hợp kết quả thực thi kiểm thử 100% PASS
│   ├── screenshots/                 # 8 ảnh chụp màn hình kiểm thử Playwright E2E
│   └── test-results/                # Nhật ký kiểm thử gốc (NestJS, Vitest, Flutter)
│
├── 03_Deployment/                   # HƯỚNG DẪN TRIỂN KHAI & VẬN HÀNH THỰC TẾ
│   └── DEPLOYMENT.md                # Cấu hình Vercel, Supabase, Render, MediaMTX
│
├── 04_Repository/                   # HƯỚNG DẪN KHO MÃ NGUỒN & QUY ƯỚC LẬP TRÌNH
│   └── REPOSITORY.md                # Cấu trúc Monorepo, 142.897 LOC, Git convention
│
├── 05_Reference_Docs/               # TÀI LIỆU THIẾT KẾ GỐC BAN ĐẦU
│   ├── REVISION_NOTES.md            # Bảng giải trình sai lệch giữa tài liệu cũ & mã nguồn mới
│   ├── PRD.md, DATABASE_DESIGN.md   # Các tài liệu phân tích sơ khai
│   └── STREAMING_PLAN.md...
│
├── 06_Presentation/                 # SLIDE BÁO CÁO & THUYẾT TRÌNH BẢO VỆ ĐỒ ÁN (TIẾNG ANH)
│   ├── presentation.pdf             # Slide PDF chuẩn Beamer 16:9 Cinema Dark (Hợp nhất PRN232 & PRM393, tách 2 Part)
│   ├── presentation.tex             # Mã nguồn LaTeX Beamer của bộ Slide
│   ├── index.html                   # Trình chiếu Slide trực tiếp trên trình duyệt (Fullscreen, phím tắt, Overview)
│   └── SPEAKER_NOTES.md             # Kịch bản thuyết trình Tiếng Anh, phân bổ thời gian & câu hỏi phản biện
│
├── build.ps1                        # Script tự động hóa biên dịch LaTeX và DOCX
└── assets/                          # Môi trường MiKTeX/Pandoc và tài nguyên TikZ song ngữ
```

---

### 3. Bảng Tổng Hợp Số Liệu Kỹ Thuật Đạt Được

| Tiêu chí kỹ thuật | Số lượng thực tế | Mô tả chi tiết |
| :--- | :---: | :--- |
| **Quy mô mã nguồn hệ thống** | **142.897 LOC** | 27k LOC Backend, 51k LOC Web, 53k LOC Mobile |
| **Số ca kiểm thử tự động (CI/CD)** | **482 Tests** | 163 Backend + 228 Web + 91 Mobile (100% PASS) |
| **Kịch bản kiểm thử trình duyệt E2E** | **8 Kịch bản** | Thực hiện qua Playwright, có ảnh chụp minh chứng |
| **Số lượng Endpoint REST API** | **140+ Endpoints** | Trải rộng trên 19 Modules nghiệp vụ NestJS |
| **Lược đồ Cơ sở dữ liệu** | **21 Prisma Models** | Chuẩn hóa trên PostgreSQL (Supabase) |
| **Màn hình ứng dụng di động** | **31 Màn hình** | Quản lý bởi 12 Module BLoC và GoRouter |
| **Số tuyến đường Cổng Web** | **33 Tuyến đường** | Kiến trúc Next.js 15 App Router co giãn |
| **Tài liệu nộp bài** | **4 PDF + 4 DOCX** | Chuẩn IEEE song ngữ Việt - Anh đầy đủ |

---

### 4. Hướng Dẫn Nhanh Cho Giám Khảo & Hội Đồng

1. **Truy Cập Nhanh Hệ Thống Triển Khai (Live Production):**
   - **Frontend Web Portal:** [https://omnicast-fe.vercel.app](https://omnicast-fe.vercel.app)
   - **Backend REST API Swagger:** [https://omnicast-api.vercel.app/swagger](https://omnicast-api.vercel.app/swagger)
   - **Kho mã nguồn GitHub:** [https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester](https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester)
   - **Tài khoản đăng nhập kiểm thử:**
     - `admin@omnicast.tv` / `Admin123!` (Quyền Admin)
     - `staff@omnicast.tv` / `Admin123!` (Quyền Staff / Editor)
     - `viewer1@omnicast.tv` / `Admin123!` (Quyền Khán giả)
   - Xem chi tiết tại: [03_Deployment/DEPLOYMENT.md](file:///d:/Coder-Program/OmniCast%20-%20PRN232%20+%20PRM393%20Project/deliverables/03_Deployment/DEPLOYMENT.md)

2. **Xem Báo Cáo Nghiệm Thu Chuẩn IEEE (PDF & DOCX):**
   - Đọc báo cáo Back-end PRN232: [PRN232_Report_VI.pdf](file:///d:/Coder-Program/OmniCast%20-%20PRN232%20+%20PRM393%20Project/deliverables/01_Reports/PRN232/PRN232_Report_VI.pdf) | Bản tiếng Anh: [PRN232_Report_EN.pdf](file:///d:/Coder-Program/OmniCast%20-%20PRN232%20+%20PRM393%20Project/deliverables/01_Reports/PRN232/PRN232_Report_EN.pdf)
   - Đọc báo cáo Di động PRM393: [PRM393_Report_VI.pdf](file:///d:/Coder-Program/OmniCast%20-%20PRN232%20+%20PRM393%20Project/deliverables/01_Reports/PRM393/PRM393_Report_VI.pdf) | Bản tiếng Anh: [PRM393_Report_EN.pdf](file:///d:/Coder-Program/OmniCast%20-%20PRN232%20+%20PRM393%20Project/deliverables/01_Reports/PRM393/PRM393_Report_EN.pdf)
   - Mã nguồn LaTeX: nằm trong thư mục `latex/` của từng môn tương ứng.

3. **Xem Hồ Sơ Kiểm Thử (Testing Documentation):**
   - Báo cáo kiểm định 482 tests PASS: [02_Testing/TEST_EXECUTION_REPORT.md](file:///d:/Coder-Program/OmniCast%20-%20PRN232%20+%20PRM393%20Project/deliverables/02_Testing/TEST_EXECUTION_REPORT.md)
   - Danh mục 22 Test Cases PRN232: [02_Testing/TEST_CASES_PRN232.md](file:///d:/Coder-Program/OmniCast%20-%20PRN232%20+%20PRM393%20Project/deliverables/02_Testing/TEST_CASES_PRN232.md)
   - Danh mục 18 Test Cases PRM393: [02_Testing/TEST_CASES_PRM393.md](file:///d:/Coder-Program/OmniCast%20-%20PRN232%20+%20PRM393%20Project/deliverables/02_Testing/TEST_CASES_PRM393.md)
   - Ảnh chụp minh chứng E2E: `02_Testing/screenshots/`

4. **Xem Đối Chiếu Tài Liệu & Kiến Trúc:**
   - Cấu trúc mã nguồn & Git conventions: [04_Repository/REPOSITORY.md](file:///d:/Coder-Program/OmniCast%20-%20PRN232%20+%20PRM393%20Project/deliverables/04_Repository/REPOSITORY.md)
   - Bảng phân tích sai lệch so với tài liệu gốc: [05_Reference_Docs/REVISION_NOTES.md](file:///d:/Coder-Program/OmniCast%20-%20PRN232%20+%20PRM393%20Project/deliverables/05_Reference_Docs/REVISION_NOTES.md)
