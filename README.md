# 📡 OmniCast — Hệ Thống Quản Lý Lịch Phát Sóng & Lịch Chương Trình Điện Tử (EPG)

> **Dự án môn học: PRN232 (Web API & Lập trình nâng cao) + PRM393 (Lập trình Di động)**  
> *Học kỳ: FA26*

<p align="left">
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white" alt="Flutter" />
  <img src="https://img.shields.io/badge/Dart-0175C2?style=for-the-badge&logo=dart&logoColor=white" alt="Dart" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
  <img src="https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" alt="Swagger" />
</p>

---

## 🔗 Liên Kết Dự Án & Triển Khai Cloud

| Thành Phần | Dịch Vụ / Nền Tảng | Liên Kết / Endpoint |
| :--- | :--- | :--- |
| 🐙 **Mã Nguồn (Source Code)** | GitHub | [TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester](https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester) |
| 🗄️ **Cơ Sở Dữ Liệu & Storage** | Supabase Cloud (PostgreSQL) | [https://tktexqtqfnlfynbytjpw.supabase.co](https://tktexqtqfnlfynbytjpw.supabase.co) |
| 🌐 **Frontend Web Portal** | Vercel Live Deployment | [https://omnicast-fe.vercel.app](https://omnicast-fe.vercel.app) *(hoặc domain Vercel cấu hình)* |
| ⚙️ **Backend API (Web API)** | Vercel API / Cloud Deployment | [https://omnicast-api.vercel.app](https://omnicast-api.vercel.app) *(Swagger Docs: `/swagger`)* |
| 📱 **Ứng Dụng Di Động** | Flutter App (Android / iOS) | Thư mục `/mobile` |

---

## 📂 Cấu Trúc Thư Mục Dự Án

```plaintext
OmniCast/
├── backend/                       # Dịch vụ Backend (Web API, Prisma ORM, Auth, Swagger)
├── frontend/                      # Giao diện Web Portal (Next.js, React, Tailwind CSS)
├── mobile/                        # Ứng dụng Di động (Flutter, BLoC Pattern, SQLite EPG)
├── Document/                      # Tài liệu kỹ thuật, đặc tả & tài liệu kiểm thử
│   ├── PRD.md                     # Tài liệu Yêu cầu Sản phẩm (Product Requirements Document)
│   ├── Project_Structure.md       # Cấu trúc hệ thống chi tiết & phân chia module
│   ├── Work_Breakdown.md          # Bảng phân công công việc & tiến độ chi tiết
│   ├── TEST_CASES.md              # Bộ kịch bản kiểm thử chức năng & phi chức năng
│   └── Testing_Guide.md           # Hướng dẫn kiểm thử & nghiệm thu QA
├── .gitignore                     # Cấu hình bỏ qua các file build, dependencies & secrets
└── README.md                      # Hướng dẫn tổng quan dự án & liên kết triển khai
```

---

## 🛠️ Công Nghệ & Framework Sử Dụng

### ⚙️ Backend (Web API)
![NestJS](https://img.shields.io/badge/NestJS-E0234E?style=flat-square&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-85EA2D?style=flat-square&logo=swagger&logoColor=black)
- **Framework & Runtime**: NestJS 11+, Node.js (TypeScript).
- **ORM & Database**: Prisma ORM kết nối cơ sở dữ liệu PostgreSQL trên Supabase Cloud.
- **Bảo mật & Phân quyền**: JSON Web Token (JWT), Password Hashing (Argon2 / PBKDF2), Role-Based Access Control (RBAC).
- **Tài liệu API**: Tự động sinh Swagger OpenAPI UI.

### 🌐 Frontend (Web Portal)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React_19-20232A?style=flat-square&logo=react&logoColor=61DAFB)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat-square&logo=vercel&logoColor=white)
- **Framework**: Next.js (App Router, React Server Components).
- **Styling & UI**: Tailwind CSS, Lucide Icons.
- **Deployment**: Triển khai tự động (CI/CD) trên Vercel.

### 📱 Mobile (Ứng Dụng Di Động)
![Flutter](https://img.shields.io/badge/Flutter-02569B?style=flat-square&logo=flutter&logoColor=white)
![Dart](https://img.shields.io/badge/Dart-0175C2?style=flat-square&logo=dart&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=flat-square&logo=sqlite&logoColor=white)
![Android](https://img.shields.io/badge/Android-3DDC84?style=flat-square&logo=android&logoColor=white)
![iOS](https://img.shields.io/badge/iOS-000000?style=flat-square&logo=apple&logoColor=white)
- **Framework**: Flutter SDK (Dart) hỗ trợ đa nền tảng Android & iOS.
- **State Management**: BLoC Pattern / Cubit.
- **Networking & Cache**: Dio Client, SQLite (lưu trữ EPG & Watchlist offline).

### 🗄️ Database & Cloud Services
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=flat-square&logo=postgresql&logoColor=white)
- **Database Server**: Supabase Cloud PostgreSQL 15+.
- **Storage**: Supabase Storage lưu trữ hình ảnh thumbnail, poster chương trình.

---

## 🚀 Hướng Dẫn Chạy Dự Án

### 1. Backend (API)
```bash
cd backend
npm install
npm run start:dev
```

### 2. Frontend (Web)
```bash
cd frontend
npm install
npm run dev
```

### 3. Mobile (Flutter)
```bash
cd mobile
flutter pub get
flutter run
```

---

## 👥 Nhóm Thực Hiện
- **Nhóm Phát Triển Dự Án PRN232 & PRM393**
