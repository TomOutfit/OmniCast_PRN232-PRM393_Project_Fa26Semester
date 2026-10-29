# 🚀 OmniCast — Hướng Dẫn Triển Khai Hệ Thống (Deployment Guide)
## Kiến Trúc Triển Khai Thực Tế Nền Tảng Đa Dịch Vụ (PRN232 & PRM393)

---

### 1. Tổng Quan Kiến Trúc Triển Khai (Deployment Topology)

Hệ thống **OmniCast** được thiết kế và triển khai trên mô hình lai (Hybrid Cloud & Microservices):

```
                        ┌─────────────────────────────────────────┐
                        │            NGƯỜI DÙNG CUỐI              │
                        │    Web Browser / Flutter Mobile App     │
                        └───────────────┬─────────────────────────┘
                                        │
                 ┌──────────────────────┼───────────────────────┐
                 │ HTTPS                │ WSS                   │ HLS / WebRTC
                 ▼                      ▼                       ▼
     ┌──────────────────────┐ ┌──────────────────┐  ┌──────────────────┐
     │  Next.js 15 Web      │ │  Socket Gateway  │  │     MediaMTX     │
     │  (Vercel Edge/Node)  │ │  (Namespace /live│  │  (Streaming Node │
     └──────────┬───────────┘ └────────┬─────────┘  │   WHIP / HLS)    │
                │ REST API             │            └────────┬─────────┘
                ▼                      │                     │ Ingest
     ┌─────────────────────────────────┴──┐                  │
     │       NestJS 10 Core Back-End      │◄─────────────────┘
     │        (Vercel Serverless)         │
     └──────────┬──────────────────┬──────┘
                │ gRPC             │ Prisma ORM
                ▼                  ▼
     ┌──────────────────────┐ ┌──────────────────────────┐
     │ Audit-Logger Service │ │  PostgreSQL Database     │
     │ (Render Cloud Host)  │ │  (Supabase Cloud 21 Tbl) │
     └──────────────────────┘ └──────────────────────────┘
```

---

### 2. Các Dịch Vụ Đang Vận Hành Thực Tế (Live Production Endpoints)

| Thành phần | Công nghệ | Nền tảng Host | Trạng thái | Điểm cuối (Endpoint) |
| :--- | :--- | :--- | :---: | :--- |
| **Cổng Web Portal** | Next.js 15 (React 19) | Vercel Live Production | **Hoạt động (200)** | [https://omnicast-fe.vercel.app](https://omnicast-fe.vercel.app) |
| **Core Back-End API** | NestJS 10, TypeScript | Vercel Serverless | **Hoạt động (200)** | [https://omnicast-api.vercel.app/api/v1](https://omnicast-api.vercel.app/api/v1) |
| **API Swagger UI** | OpenAPI 3.0 / Swagger | Vercel API Docs | **Hoạt động (200)** | [https://omnicast-api.vercel.app/swagger](https://omnicast-api.vercel.app/swagger) |
| **Audit Microservice** | NestJS, gRPC Proto | Render Cloud Host | **Hoạt động (200)** | `audit-service.onrender.com:50051` |
| **Cơ sở dữ liệu** | PostgreSQL 15 | Supabase (Seoul) | **Hoạt động (200)** | 21 Prisma Models (`tktexqtqfnlfynbytjpw.supabase.co`) |
| **Máy chủ Livestream** | MediaMTX | Docker Node | **Hoạt động (200)** | HLS: `:8888`, WebRTC: `:8889` |
| **Media Asset CDN** | Cloudinary | Cloudinary CDN | **Hoạt động (200)** | Video uploads, avatars, thumbnails |
| **Bản cài Android Mobile (APK)**| Flutter 3.x Release | GitHub Releases v1.2.0 | **Sẵn sàng** | [Tải APK (v1.2.0)](https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester/releases/tag/v1.2.0) |

---

### 3. Danh Sách Tài Khoản Thử Nghiệm (Demo Credentials)

Hội đồng và Giám khảo có thể dùng trực tiếp các tài khoản đã được nạp sẵn quyền hạn (RBAC) trên hệ thống Production:

| Vai trò (Role) | Email đăng nhập | Mật khẩu | Quyền hạn kiểm thử |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (ADMIN)** | `admin@omnicast.tv` | `Admin123!` | Toàn quyền quản trị kênh, người dùng, xem Telemetry, Audit Logs |
| **Biên tập viên (STAFF)** | `staff@omnicast.tv` | `Admin123!` | Quản lý phát sóng, duyệt video, điều phối lịch EPG, Live Chat |
| **Khán giả (VIEWER)** | `viewer1@omnicast.tv` | `Admin123!` | Xem kênh trực tiếp, chat realtime, donate quà ảo, watchlist |

---

### 3. Cấu Hình Biến Môi Trường (Environment Variables)

Mẫu cấu hình môi trường được chuẩn hóa tại `backend/.env.example`.

```env
# Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"

# JWT Authentication
JWT_SECRET="omnicast_enterprise_jwt_secret_production_key_2026"
JWT_EXPIRES_IN="3600s"
JWT_REFRESH_SECRET="omnicast_enterprise_jwt_refresh_secret_key_2026"
JWT_REFRESH_EXPIRES_IN="90d"

# Microservice gRPC Configuration
AUDIT_GRPC_URL="audit-service.onrender.com:50051"

# AI Integration
OPENAI_API_KEY="sk-proj-omnicast-production-ai-curator-key"
OPENAI_MODEL="gpt-4o"

# Streaming & Media (MediaMTX & Cloudinary)
MEDIAMTX_HOST="localhost"
MEDIAMTX_API_PORT="9997"
MEDIAMTX_HLS_PORT="8888"
MEDIAMTX_WEBRTC_PORT="8889"
CLOUDINARY_CLOUD_NAME="omnicast"
CLOUDINARY_API_KEY="987654321098765"
CLOUDINARY_API_SECRET="omnicast_cloudinary_api_secret"
```

---

### 4. Quy Trình Cài Đặt & Triển Khai Từ Đầu (Step-by-Step Deployment)

#### Bước 1: Khởi tạo Cơ sở dữ liệu PostgreSQL
```bash
cd backend
npm install
# Tạo cấu trúc 21 bảng từ schema Prisma
npx prisma migrate deploy
# Sinh Prisma Client
npx prisma generate
# Nạp dữ liệu hạt giống ban đầu (Seed data: kênh, người dùng, lịch EPG mẫu)
npm run seed
```

#### Bước 2: Triển khai Microservice Audit-Logger (gRPC)
```bash
cd backend/microservices/audit-logger
npm install
npm run build
# Khởi chạy máy chủ gRPC trên port 50051
npm run start:prod
```

#### Bước 3: Triển khai Máy chủ Livestream MediaMTX
Sử dụng Docker để khởi chạy MediaMTX với cấu hình WHIP và HLS/WebRTC:
```bash
docker run -d --name mediamtx \
  -p 8554:8554 \
  -p 1935:1935 \
  -p 8888:8888 \
  -p 8889:8889 \
  -p 9997:9997 \
  bluenviron/mediamtx:latest
```

#### Bước 4: Triển khai Cổng Web Next.js 15
```bash
cd frontend
npm install
npm run build
npm run start
```

#### Bước 5: Đóng gói và Phân phối Ứng dụng Di động Flutter
```bash
cd mobile
flutter pub get
# Kiểm tra bộ test
flutter test
# Đóng gói APK phân tán theo kiến trúc CPU
flutter build apk --split-per-abi --release
```
*Tệp APK đầu ra đặt tại: `mobile/build/app/outputs/flutter-apk/app-arm64-v8a-release.apk`.*

---

### 5. Kiểm Tra Tình Trạng Hoạt Động (Health Checks)

Sau khi hoàn tất triển khai, chạy các lệnh kiểm tra trạng thái sức khỏe dịch vụ:

- **Core API Health:**
  ```bash
  curl -I https://omnicast.tv/api/v1/health
  # HTTP/2 200 OK
  ```
- **Swagger / OpenAPI Documentation:**
  ```bash
  curl -I https://omnicast.tv/api/v1/docs
  # HTTP/2 200 OK
  ```
- **MediaMTX Control API:**
  ```bash
  curl http://localhost:9997/v3/paths/list
  # {"itemCount": ..., "items": [...]}
  ```
