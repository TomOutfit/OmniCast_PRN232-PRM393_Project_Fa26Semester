# 🏗️ OmniCast (OMNI) — Cấu Trúc Dự Án Hoàn Chỉnh (Project Structure)
# Kiến Trúc Hiện Đại: NestJS 11 (Backend Web API) + Next.js 15 (Frontend Web) + Flutter 3.x (Mobile) + Supabase (Database & Storage)
# Kế Hoạch Triển Khai Cho Nhóm 4 Thành Viên (PRN232 & PRM393)

**Tên Dự Án:** OmniCast Enterprise Media & Broadcast Intelligence Network  
**Mã Dự Án:** OMNI  
**Mô Hình Quản Lý Mã Nguồn:** **Single Monorepo (1 GitHub Repository Duy Nhất)**  
**Mục Đích Tài Liệu:** Đặc tả toàn bộ cây thư mục, tệp tin cấu hình, các module nghiệp vụ, Swagger OpenAPI endpoints, và quy trình triển khai Cloud trên Vercel & Supabase.

---

## 🌳 Tổng Quan Cây Thư Mục Monorepo Cấp Cao (High-Level Monorepo Tree)

```plaintext
OmniCast/
├── backend/                       # 💻 [MÔN PRN232] NestJS 11 Backend Web API (TypeScript)
│   ├── vercel.json                # Cấu hình Serverless / Cloud API Deployment trên Vercel
│   ├── package.json               # NestJS, Prisma, Swagger, Passport JWT, Argon2
│   ├── tsconfig.json              # TypeScript configuration
│   ├── prisma/
│   │   ├── schema.prisma          # Schema 6 Models kết nối PostgreSQL Supabase Cloud
│   │   └── seed.ts                # Nạp dữ liệu mẫu ban đầu (Admin, Kênh, Chương trình)
│   ├── src/
│   │   ├── main.ts                # Bootstrap, Swagger UI setup, Global Filters
│   │   ├── app.module.ts          # Root Module nạp các Sub-Modules
│   │   ├── auth/                  # Authentication JWT, Argon2, Role Guards (1, 2, 3)
│   │   ├── channels/              # Quản lý danh mục Kênh truyền hình
│   │   ├── programs/              # CRUD Chương trình & Thuật toán chống trùng lịch
│   │   ├── search/                # Dynamic Search & Filter Engine
│   │   ├── ai-curator/            # Module thẩm định AI & lưu Supabase
│   │   ├── audit-logger/          # Module ghi vết kiểm toán gRPC vào DB
│   │   └── common/                # Filters, Guards, Decorators, Interceptors
│   └── protos/
│       └── audit_logger.proto     # Định nghĩa Protobuf gRPC Audit Logger
│
├── frontend/                      # 🌐 [MÔN PRN232] Next.js 15 Web Portal (React 19, Tailwind CSS)
│   ├── package.json               # Next.js, React 19, Tailwind CSS, Lucide Icons, Axios
│   ├── next.config.ts             # Cấu hình Next.js
│   ├── tailwind.config.ts         # Cinema Dark Theme configuration
│   └── app/                       # Next.js App Router
│       ├── layout.tsx             # Root layout với Navbar và Footer
│       ├── page.tsx               # Landing page / Trang chủ
│       ├── login/                 # Trang Đăng nhập phân luồng Role
│       ├── register/              # Trang Đăng ký
│       ├── epg/                   # Lịch phát sóng EPG Grid Schedule 24h
│       ├── programs/[id]/         # Chi tiết chương trình & Trailer Player
│       ├── search/                # Tìm kiếm nâng cao & Filter Chips
│       ├── studio/curator/        # Studio Thẩm định AI dành riêng cho Staff
│       ├── admin/dashboard/       # Dashboard quản trị cho Admin
│       └── admin/audit-logs/      # Nhật ký kiểm toán gRPC
│
├── mobile/                        # 📱 [MÔN PRM393] Flutter 3.x Mobile App (Android & iOS)
│   ├── pubspec.yaml               # flutter_bloc, dio, sqflite, flutter_local_notifications
│   └── lib/
│       ├── main.dart              # Entrypoint ứng dụng di động
│       ├── core/                  # Theme, Constants, Utils, Network Client
│       ├── data/                  # Models, SQLite Database Helper, Repositories
│       ├── logic/                 # BLoC / Cubit State Management
│       └── presentation/          # Màn hình (EPG Timeline, Search, Watchlist, Notification)
│
├── Document/                      # 📚 Tài liệu kỹ thuật, đặc tả & tài liệu kiểm thử
│   ├── PRD.md                     # Tài liệu Yêu cầu Sản phẩm (Product Requirements Document)
│   ├── Project_Structure.md       # Cấu trúc hệ thống chi tiết & phân chia module
│   ├── Work_Breakdown.md          # Bảng phân công công việc 4 thành viên (WBS)
│   ├── TEST_CASES.md              # Bộ kịch bản kiểm thử chức năng & phi chức năng
│   ├── Testing_Guide.md           # Hướng dẫn kiểm thử & nghiệm thu QA
│   ├── QUICK_START.md             # Hướng dẫn khởi động nhanh
│   ├── FAQ.md                     # Câu hỏi thường gặp
│   └── HELP.md                    # Hướng dẫn trợ giúp & khắc phục sự cố
│
├── .gitignore                     # Cấu hình bỏ qua các file build, dependencies & secrets
└── README.md                      # Hướng dẫn tổng quan dự án & liên kết triển khai
```

---

## 🔗 Liên Kết Triển Khai Cloud Chính Thức

| Phân Hệ | Dịch Vụ / Nền Tảng | Đường Dẫn Triển Khai |
|:---|:---|:---|
| 🗄️ **Cơ Sở Dữ Liệu & Storage** | Supabase Cloud (PostgreSQL) | `https://tktexqtqfnlfynbytjpw.supabase.co` |
| ⚙️ **Backend Web API** | Vercel Live Deployment | `https://omnicast-api.vercel.app` (Swagger: `/swagger`) |
| 🌐 **Frontend Web Portal** | Vercel Live Deployment | `https://omnicast-fe.vercel.app` |
| 📱 **Mobile App** | Flutter Android Release | `mobile/` (`app-release.apk`) |

---

## 👥 Phân Bổ Nhân Lực 4 Thành Viên (PRN232 & PRM393)

1. **Member 1 (Tech Lead & Search Engine):** Auth Core (NestJS JWT/Argon2/RBAC), Search API & Query Builder, Next.js Auth & Search UI, Flutter BLoC Auth & Search Screen (50 tasks).
2. **Member 2 (Broadcast Content & Notifications):** CRUD Channels & Programs, Anti-Conflict Schedule Algorithm, Next.js EPG Grid Schedule, Flutter EPG Timeline `LIVE NOW`, Native Local Notifications 15p (50 tasks).
3. **Member 3 (AI Integration & Mobile Offline Storage):** NestJS AI Curator Module, Next.js Studio Curator UI, Flutter AI Curator Screen, SQLite Local Storage (`omnicast_local.db`), Offline Watchlist BLoC, APK Release Build (50 tasks).
4. **Member 4 (gRPC, DevOps Vercel, Data Seed & Security — Chuyên trách PRN232):** gRPC AuditLogger Microservice & Protobuf, `seed.ts` nạp dữ liệu toàn diện, Next.js Admin Logs Viewer, Cấu hình Vercel CI/CD cho Backend API & Frontend Web, Rate Limiting, Stress Test & QA (50 tasks).

---
*Tài liệu Project Structure v4.0 chuẩn hóa toàn diện cấu trúc Monorepo NestJS + Next.js + Flutter + Vercel/Supabase cho nhóm 4 thành viên.*
