# 📁 OmniCast — Cấu Trúc Kho Mã Nguồn & Hướng Dẫn Phát Triển (Repository Guide)
## Tổ Chức Monorepo, Quy Ước Mã Nguồn & Quy Trình Đóng Góp (PRN232 & PRM393)

---

### 1. Thông Tin Kho Mã Nguồn (GitHub Repository)

- **Đường dẫn Repository chính thức:**  
  👉 **[https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester](https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester)**
- **Nhánh mặc định (Default Branch):** `main`
- **Phiên bản phát hành (Production Tag):** `v1.2.0`
- **Mã lệnh sao chép mã nguồn (Clone command):**
  ```bash
  git clone https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester.git
  ```

---

### 2. Cấu Trúc Thư Mục Monorepo (Repository Layout)

Kho mã nguồn OmniCast được tổ chức theo mô hình Monorepo hợp nhất chứa trọn vẹn cả 3 sản phẩm phần mềm và tài liệu bàn giao:

```
omnicast/
├── backend/                       # PHÂN HỆ BACK-END (PRN232)
│   ├── src/                       # 19 Modules nghiệp vụ NestJS
│   │   ├── auth/                  # JWT, RBAC guards, decorators
│   │   ├── channels/              # CRUD danh mục kênh phát sóng
│   │   ├── programs/              # Lịch phát sóng & thuật toán chống trùng lặp
│   │   ├── epg/                   # Cơ chế điền lịch 24/7 có hạt giống
│   │   ├── ai-curator/            # Quy trình gọi OpenAI, schema Zod, fallback
│   │   ├── live/                  # WebSocket gateway (/live) & WebRTC signaling
│   │   ├── audit/                 # gRPC client kết nối microservice kiểm toán
│   │   └── ...                    # Users, Billing, Recordings, Search, Watchlist...
│   ├── prisma/
│   │   └── schema.prisma          # 21 Models PostgreSQL (Supabase)
│   ├── microservices/
│   │   └── audit-logger/          # Microservice ghi nhật ký kiểm toán gRPC
│   └── test/                      # 16 tệp spec kiểm thử (node:test, 163 tests)
│
├── frontend/                      # PHÂN HỆ CỔNG WEB (PRN232)
│   ├── app/                       # Next.js 15 App Router (33 routes)
│   │   ├── (public)/              # Trang chủ, kênh, epg, recordings, search
│   │   ├── (auth)/                # Login, register, forgot-password
│   │   ├── live/                  # Trình xem livestream trực tiếp
│   │   ├── studio/                # Giao diện phát sóng WHIP & chạy AI Curator
│   │   └── admin/                 # Bảng điều khiển quản trị & audit logs
│   ├── components/                # UI components (Cinema Dark aesthetic)
│   └── lib/                       # API clients, hooks, state management
│
├── mobile/                        # PHÂN HỆ ỨNG DỤNG DI ĐỘNG (PRM393)
│   ├── lib/
│   │   ├── core/                  # get_it DI, constants, theme, network interceptor
│   │   ├── data/                  # Repositories, DTO models, SQLite DatabaseHelper
│   │   ├── logic/                 # 12 Modules BLoC/Cubit (Auth, Watchlist, Epg...)
│   │   └── presentation/          # 31 Màn hình, OmniPlayer, LiveChat, Donation modal
│   └── test/                      # 8 suites kiểm thử (flutter test, 91 tests)
│
├── deliverables/                  # TÀI NGUYÊN NỘP BÀI CHÍNH THỨC
│   ├── 00_README.md               # Bản chỉ dẫn nộp bài tổng quan
│   ├── 01_Reports/                # Báo cáo IEEE (4 PDF + 4 DOCX) cho PRN232 & PRM393
│   ├── 02_Testing/                # Test cases, execution report, test-results, screenshots
│   ├── 03_Deployment/             # Hướng dẫn triển khai live production (DEPLOYMENT.md)
│   ├── 04_Repository/             # Hướng dẫn kho mã nguồn (REPOSITORY.md)
│   ├── 05_Reference_Docs/         # Tài liệu gốc ban đầu kèm ghi chú hiệu chỉnh
│   └── assets/                    # Shared TikZ, build scripts (build.ps1, env.bat)
│
├── Document/                      # Tài liệu thiết kế sơ khai của dự án
└── playwright-tests/              # Kịch bản kiểm thử trình duyệt E2E tự động
```

---

### 2. Quy Mô Mã Nguồn Chi Tiết (Source Code Scale)

Thống kê theo số dòng vật lý thực tế (Physical Lines of Code) bằng công cụ quét tự động:

| Thành phần | Đường dẫn thư mục | Số dòng mã (LOC) | Loại tệp chính |
| :--- | :--- | :---: | :--- |
| **NestJS Back-End Core** | `backend/src/` | **27.826** | TypeScript (`.ts`) |
| **Back-End Automated Tests** | `backend/test/` | **4.512** | TypeScript (`.ts`) |
| **gRPC Microservice & Proto** | `backend/microservices/` | **465** | `.proto`, `.ts` |
| **Prisma Database Schema** | `backend/prisma/` | **683** | `.prisma` |
| **Next.js 15 Web Portal** | `frontend/` | **51.742** | TypeScript / React (`.tsx`) |
| **Flutter Mobile Application** | `mobile/lib/` | **53.922** | Dart (`.dart`) |
| **Mobile Automated Tests** | `mobile/test/` | **2.529** | Dart (`.dart`) |
| **Playwright E2E Tests** | `playwright-tests/` | **1.218** | JavaScript (`.js`) |
| **TỔNG CỘNG HỆ THỐNG** | **Toàn bộ dự án** | **142.897 LOC** | Đa ngôn ngữ |

---

### 3. Quy Trình Nhánh & Cam Kết Mã Nguồn (Git Conventions)

- **Quy tắc phân nhánh (Branching Model):**
  - `main`: Nhánh sản xuất chính thức, tích hợp tự động qua CI/CD GitHub Actions.
  - `feat/*`: Phát triển tính năng mới.
  - `fix/*`: Sửa lỗi kỹ thuật và vá bảo mật.
  - `docs/*`: Cập nhật tài liệu kỹ thuật và báo cáo.

- **Quy chuẩn thông điệp Cam kết (Conventional Commits):**
  - `feat(...)`: Bổ sung tính năng mới (ví dụ: `feat(player): add dynamic LAN discovery`).
  - `fix(...)`: Sửa lỗi (ví dụ: `fix(mobile): resolve MediaMTX to home LAN IP`).
  - `test(...)`: Bổ sung hoặc cập nhật ca kiểm thử.
  - `docs(...)`: Soạn thảo tài liệu báo cáo học thuật.

---

### 4. Hướng Dẫn Cài Đặt Môi Trường Phát Triển Cục Bộ (Local Setup)

#### Yêu cầu tiên quyết:
- Node.js >= 20.x
- Flutter SDK >= 3.x (kèm Android SDK / Xcode)
- Docker Desktop (chạy MediaMTX và PostgreSQL nếu cần)
- MiKTeX + Pandoc (để biên dịch tài liệu LaTeX / Word)

#### Các lệnh khởi chạy nhanh:
```bash
# 1. Chạy Backend API (Cổng 3001)
cd backend && npm run start:dev

# 2. Chạy Cổng Web (Cổng 3000)
cd frontend && npm run dev

# 3. Chạy Ứng dụng Di động
cd mobile && flutter run
```
