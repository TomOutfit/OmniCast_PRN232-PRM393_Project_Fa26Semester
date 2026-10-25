# 📡 OmniCast — Enterprise Media & Broadcast Intelligence Network

> **Dự án tích hợp môn học: PRN232 (Web API Core & Kiến trúc vi dịch vụ nâng cao) & PRM393 (Lập trình ứng dụng di động Flutter)**  
> **Học kỳ:** FA26 — Trường Đại học FPT (FPT University)  
> **Phiên bản phát hành:** `v1.2.0` (Production Release)

<p align="center">
  <img src="https://img.shields.io/badge/Release-v1.2.0-00E5FF?style=for-the-badge&logo=github&logoColor=black" alt="Release" />
  <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
  <img src="https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React_19-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/Flutter_3.x-02569B?style=for-the-badge&logo=flutter&logoColor=white" alt="Flutter" />
  <img src="https://img.shields.io/badge/Dart-0175C2?style=for-the-badge&logo=dart&logoColor=white" alt="Dart" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma_ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Swagger-85EA2D?style=for-the-badge&logo=swagger&logoColor=black" alt="Swagger" />
  <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
</p>

---

## 🌟 Tổng Quan Hệ Thống

**OmniCast** là nền tảng truyền hình số và phân phối nội dung đa phương tiện thế hệ mới (**Hybrid OTT / IPTV / FAST — Free Ad-supported Streaming TV**), kết hợp sức mạnh xử lý thời gian thực giữa **Web Studio (Next.js 15 / React 19)**, **Ứng dụng di động (Flutter Mobile App)** và **Cụm Backend Microservices (NestJS 11 + Prisma ORM + gRPC)** trên nền tảng đám mây **Supabase Cloud PostgreSQL**.

Hệ thống được thiết kế theo chuẩn doanh nghiệp phát thanh - truyền hình, giải quyết triệt để các bài toán:
- **Tự động hóa chống xung đột lịch phát sóng EPG (Airtime Collision Prevention)**.
- **Phát trực tiếp đa kênh Native Video Player** triệt tiêu hoàn toàn màn hình đăng nhập tài khoản Google Drive.
- **Tương tác hai chiều siêu tốc (Zero-Latency Realtime Chat & Floating Reactions)** qua WebSocket / Socket.IO.
- **Hệ sinh thái Live Donation & Super Chat mô phỏng (Sandbox Mock Gateway)** với 6 gói quà ảo biểu trưng, cam kết 100% an toàn học tập không mất tiền thật.
- **Bảng điều khiển Telemetry đa sóng Spline Bezier** (Active CCU, CDN Bandwidth, Live Reactions, Capacity Baseline) tra cứu tương tác cảm ứng haptic trên cả Web và Mobile.

---

## 🔗 Liên Kết Triển Khai & Bản Cài Đặt (Release Assets)

| Thành Phần | Dịch Vụ / Nền Tảng | Liên Kết / Điểm Truy Cập |
| :--- | :--- | :--- |
| 🌐 **Frontend Web Portal** | Vercel Live Production | [https://omnicast-fe.vercel.app](https://omnicast-fe.vercel.app) |
| ⚙️ **Backend Web API & Swagger** | Vercel API Core | [https://omnicast-api.vercel.app/swagger](https://omnicast-api.vercel.app/swagger) |
| 🗄️ **Cơ Sở Dữ Liệu & Storage** | Supabase PostgreSQL 15 | [Supabase Console](https://supabase.com/dashboard/project/tktexqtqfnlfynbytjpw) *(Seoul Region Pooler)* |
| 📦 **GitHub Release v1.2.0** | GitHub Releases | [Release v1.2.0 Tag](https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester/releases/tag/v1.2.0) |
| 📱 **Bản cài APK ARM64 (Khuyên dùng)** | Android Smartphone | [Tải `app-arm64-v8a-release.apk` (41.0 MB)](https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester/releases/download/v1.2.0/app-arm64-v8a-release.apk) |
| 📱 **Bản cài APK ARMv7** | Android 32-bit | [Tải `app-armeabi-v7a-release.apk` (34.4 MB)](https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester/releases/download/v1.2.0/app-armeabi-v7a-release.apk) |
| 💻 **Bản cài APK x86_64** | Giả lập PC / Emulator | [Tải `app-x86_64-release.apk` (43.7 MB)](https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester/releases/download/v1.2.0/app-x86_64-release.apk) |
| 📑 **Báo Cáo Kỹ Thuật Dự Án (PDF)** | Báo Cáo Kỹ Thuật Đồ Án | [Tải `OmniCast_Comprehensive_Project_Report.pdf` (1.3 MB)](https://github.com/TomOutfit/OmniCast_PRN232-PRM393_Project_Fa26Semester/releases/download/v1.2.0/OmniCast_Comprehensive_Project_Report.pdf) |

---

## 🏛️ Sơ Đồ Kiến Trúc Hệ Thống (Architecture Flowcharts)

### 1. Kiến Trúc Tổng Thể Đa Tầng (End-to-End Enterprise Architecture)

```mermaid
flowchart TB
    subgraph Clients["TẦNG GIAO DIỆN KHÁCH HÀNG (CLIENTS)"]
        Web["🌐 Web Portal (Next.js 15 + React 19)<br/>• Cinema Dark 3D Cards<br/>• Realtime Live Chat & Spline Telemetry<br/>• Curator Studio & Admin Mission Control"]
        Mobile["📱 Mobile App (Flutter 3.x / Dart)<br/>• BLoC / Cubit Architecture<br/>• Offline-First SQLite EPG Cache<br/>• Native Video Player & Haptic Gestures"]
    end

    subgraph EdgeTier["TẦNG BIÊN MẠNG & CỔNG TRUYỀN DẪN (EDGE & GATEWAY)"]
        VercelCDN["⚡ Vercel Edge Global CDN<br/>• Serverless Function Invocation<br/>• Reverse Proxy & TLS Termination"]
        Swagger["📑 OpenAPI 3.0 / Swagger UI<br/>• Contract-First API Specifications"]
    end

    subgraph AppTier["TẦNG ỨNG DỤNG & DỊCH VỤ (APPLICATION MICROSERVICES)"]
        CoreAPI["⚙️ NestJS 11+ Core Web API<br/>• Authentication (JWT + Refresh Tokens)<br/>• EPG Scheduling & Overlap Conflict Engine<br/>• Channels & Live Events Dispatcher<br/>• User Management & RBAC Security"]
        RealtimeGW["⚡ WebSocket Gateway (Socket.IO)<br/>• Subscribed Event Rooms<br/>• Instant Chat Ingestion & Moderation<br/>• Live Floating Reactions & Emergency Banner"]
        gRPCService["🛡️ gRPC Microservice Layer<br/>• Independent Audit Logging<br/>• High-Throughput Binary Protocol"]
        AIEngine["🤖 AI Content Curator (OpenAI GPT-4o)<br/>• Multi-Agent Sentiment Analysis<br/>• Compliance Screening & Editorial Insights"]
    end

    subgraph DataTier["TẦNG CƠ SỞ DỮ LIỆU & LƯU TRỮ ĐÁM MÂY (SUPABASE CLOUD)"]
        SupabaseDB[("🗄️ Supabase PostgreSQL 15+<br/>• 170 Người dùng thực tế<br/>• 25 Kênh phát sóng chuẩn<br/>• 494 Bản ghi theo dõi kênh<br/>• Prisma ORM Transaction Pooler (:6543)")]
        SupabaseStorage["☁️ Supabase Storage<br/>• Thumbnails, Posters & Channel Logos"]
    end

    Web -->|HTTPS / REST / SSE| VercelCDN
    Mobile -->|HTTPS / REST| VercelCDN
    Web <-->|WSS WebSocket| RealtimeGW
    Mobile <-->|WSS WebSocket| RealtimeGW
    VercelCDN --> CoreAPI
    CoreAPI --> Swagger
    CoreAPI <-->|gRPC Protobuf| gRPCService
    CoreAPI <-->|REST API| AIEngine
    CoreAPI <-->|Prisma Client| SupabaseDB
    gRPCService <-->|Async Log Ingest| SupabaseDB
    CoreAPI <-->|S3 S3-compatible API| SupabaseStorage
```

---

### 2. Luồng Phát Trực Tiếp Video & Cơ Chế Dự Phòng (Smart Fallback Pipeline)

Khắc phục triệt để lỗi chuyển hướng HTTP 302 sang trang đăng nhập tài khoản Google (`accounts.google.com`).

```mermaid
sequenceDiagram
    autonumber
    actor KhangGia as Khán giả (Web / Mobile)
    participant Player as Trình phát (Native Player / ExoPlayer)
    participant Resolver as Bộ bóc tách luồng (Direct Stream Resolver)
    participant EdgeCDN as Cụm máy chủ biên (Edge Media Server)
    participant FallbackStream as Luồng dự phòng (Smart Fallback Live)

    KhangGia->>Player: Nhấn mở kênh phát sóng hoặc sự kiện trực tiếp
    Player->>Resolver: Yêu cầu liên kết phát video theo Media ID
    Resolver->>Resolver: Chuẩn hóa URL, bóc tách File ID trực tiếp
    alt Video Google Drive / Direct MP4 hợp lệ
        Resolver-->>Player: Trả về Direct Stream URL (drive.usercontent.google.com/...)
        Player->>EdgeCDN: Gửi yêu cầu phân đoạn byte video (HTTP Range Request)
        EdgeCDN-->>Player: Dòng dữ liệu media trực tiếp 1080p/60fps
        Player-->>KhangGia: Phát video tức thì, KHÔNG qua trang đăng nhập Google
    else Giới hạn quyền riêng tư / Hết băng thông giới hạn (HTTP 403/429)
        EdgeCDN-->>Player: Phát hiện lỗi gián đoạn truyền tải
        Player->>FallbackStream: Kích hoạt cơ chế chuyển mạch tự động (Failover Switch)
        FallbackStream-->>Player: Cấp phát luồng phát sóng thay thế HLS/YouTube Embed
        Player-->>KhangGia: Phát sóng luồng trực tiếp thay thế liền mạch (Zero Downtime)
    end
```

---

### 3. Luồng Tương Tác Hai Chiều Thời Gian Thực (WebSocket Realtime Feed)

```mermaid
sequenceDiagram
    autonumber
    actor Viewer as Khán giả (Mobile / Web)
    participant SocketGW as Cổng WebSocket (Socket.IO Gateway)
    participant EventRoom as Phòng sự kiện (Event Room: eventId)
    participant DB as Supabase PostgreSQL
    actor Host as Broadcaster / Studio Admin

    Viewer->>SocketGW: Kết nối WSS kèm JWT Access Token
    SocketGW->>SocketGW: Xác thực danh tính & cấp phép tham gia
    Viewer->>SocketGW: Gửi sự kiện 'subscribe:event' (eventId)
    SocketGW->>EventRoom: Đăng ký Socket Client vào phòng sự kiện
    
    par Trò chuyện trực tiếp (Live Chat)
        Viewer->>SocketGW: Gửi bình luận 'live:chat:send' (content)
        SocketGW->>DB: Bất đồng bộ lưu bản ghi vào bảng Comment
        SocketGW-->>EventRoom: Phát tán tức thời 'live:chat:new' cho toàn bộ khán giả
    and Thả cảm xúc nổi (Floating Reactions)
        Viewer->>SocketGW: Gửi cảm xúc 'live:reaction:send' (HEART/FIRE/CLAP/WOW)
        SocketGW-->>EventRoom: Broadcast 'live:reaction:stream' tạo hiệu ứng hạt nổi
    and Thông báo khẩn cấp từ đài phát sóng (Broadcaster Announcement)
        Host->>SocketGW: Phát thông điệp ghim 'live:broadcast:send' (message)
        SocketGW-->>EventRoom: Ghim biểu ngữ thông báo đỏ nổi bật lên đầu màn hình
    end
```

---

### 4. Luồng Ủng Hộ Live Stream & Super Chat Mô Phỏng (Sandbox Mock Gateway)

> 🛡️ **Cam kết an toàn tuyệt đối:** Tính năng được xây dựng phục vụ nghiên cứu và trải nghiệm đồ án môn học (Fa26Semester). Mọi giao dịch qua MoMo, VNPay QR, ZaloPay và Thẻ ATM/Visa đều là **giả lập (Mock Gateway) với chi phí thực tế = 0 ₫**, không thu thập thẻ và không bao giờ trừ tiền thật từ tài khoản ngân hàng của người dùng.

```mermaid
flowchart TD
    Start([Khán giả nhấn nút ỦNG HỘ STREAMER]) --> OpenModal[Mở hộp thoại Live Donation & Super Chat]
    
    OpenModal --> Notice[Hiển thị Huy hiệu Bảo vệ: CHẾ ĐỘ MÔ PHỎNG 0đ]
    Notice --> SelectTier[Chọn 1 trong 6 gói quà ảo:<br/>☕ Cà phê 10k | 🧋 Trà sữa 20k | 🍕 Pizza 50k<br/>🎆 Pháo hoa 100k | 🚀 Tên lửa 200k | 💎 Kim cương 500k]
    
    SelectTier --> SelectPayment[Chọn cổng thanh toán giả lập:<br/>• Ví MoMo (Sandbox 0đ)<br/>• VNPay QR (Mô phỏng 0đ)<br/>• ZaloPay (Sandbox 0đ)<br/>• Thẻ ATM / Visa (Giả lập 0đ)]
    
    SelectPayment --> InputMessage[Nhập tên hiển thị & Lời nhắn Super Chat]
    InputMessage --> CostCard[Bảng kê đối soát chi phí:<br/>• Số tiền hiển thị: Đã chọn<br/>• Chi phí thực tế bị trừ: 0 ₫ Không mất tiền]
    
    CostCard --> ConfirmClick{Nhấn XÁC NHẬN GỬI MÔ PHỎNG}
    
    ConfirmClick --> MockProcess[Xử lý giao dịch Mock Gateway<br/>• Tạo mã Token giả lập an toàn<br/>• Tự động phê duyệt trong 800ms]
    
    MockProcess --> EmitChat[Gửi tin nhắn Super Chat ghim nổi bật qua WebSocket]
    EmitChat --> ParticleFX[Kích hoạt hiệu ứng hạt ánh sáng ăn mừng rực rỡ]
    ParticleFX --> PinCard[Ghim Thẻ Super Chat đổi màu gradient theo mức quà tặng]
    PinCard --> ToastAlert[Hiển thị thông báo Toast: Ủng hộ thành công 0đ thực tế]
    ToastAlert --> End([Hoàn tất phiên tương tác an toàn])
```

---

### 5. Luồng Bảng Điều Khiển Telemetry Đa Chiều (Spline Bezier Crosshair Engine)

```mermaid
flowchart LR
    subgraph DataSources["NGUỒN THU THẬP VIỄN TRẮC (METRICS ENGINE)"]
        CCU["🔵 Active CCU<br/>(Lượng người xem tức thời)"]
        BW["🟢 CDN Bandwidth<br/>(Băng thông luồng Gbps)"]
        React["🟣 Live Reactions<br/>(Tần suất cảm xúc/phút)"]
        Cap["🟡 Capacity Baseline<br/>(Ngưỡng tải định mức 18k)"]
    end

    subgraph HorizonSelector["CHỌN KHUNG THỜI GIAN"]
        H1["Trực tiếp 60 Giây"]
        H2["24 Giờ Qua"]
        H3["7 Ngày Gần Nhất"]
    end

    subgraph RenderingEngine["BỘ TÍNH TOÁN ĐƯỜNG CONG NATIVE"]
        SplineCalc["Thuật toán Nội suy Cubic Bezier Splines<br/>• Web: SVG Path Generator (C control points)<br/>• Mobile: CustomPainter (path.cubicTo)"]
    end

    subgraph UserInteraction["TƯƠNG TÁC NGƯỜI DÙNG ĐA NỀN TẢNG"]
        Crosshair["Crosshair Inspector (Rê chuột Web / Chạm vuốt Mobile)<br/>• Hiển thị Tooltip Card chứa đầy đủ 4 thông số<br/>• Phản hồi rung cảm giác Haptic Feedback"]
        KPICards["Bộ 4 Thẻ KPI động & Thanh phân bổ nền tảng<br/>(Web Desktop, Mobile App, Smart TV)"]
    end

    DataSources --> HorizonSelector
    HorizonSelector --> SplineCalc
    SplineCalc --> Crosshair
    SplineCalc --> KPICards
```

---

### 6. Sơ Đồ Thực Thể Cơ Sở Dữ Liệu (Database Entity-Relationship Model)

```mermaid
erDiagram
    User ||--o{ LiveChannel : "sở hữu (owns)"
    User ||--o{ Follow : "theo dõi (follows)"
    User ||--o{ Comment : "bình luận (authors)"
    User ||--o{ Reaction : "thả cảm xúc (reacts)"
    User ||--o{ RefreshToken : "duy trì phiên (tokens)"
    
    LiveChannel ||--o{ LiveEvent : "tổ chức sự kiện (schedules)"
    LiveChannel ||--o{ Recording : "lưu trữ kho VOD (archives)"
    LiveChannel ||--o{ Follow : "có khán giả theo dõi (followers)"
    
    LiveEvent ||--o{ Comment : "nhận bình luận trực tiếp"
    LiveEvent ||--o{ Reaction : "nhận cảm xúc trực tiếp"

    User {
        uuid id PK
        varchar email UK "Email duy nhất (170 tài khoản)"
        varchar fullName "Họ và tên người dùng"
        varchar passwordHash "Mã băm mật khẩu bcrypt"
        varchar role "ADMIN | STAFF | VIEWER"
        boolean isActive "Trạng thái hoạt động"
        boolean emailVerified "Xác thực email"
        timestamp lastLoginAt "Thời điểm đăng nhập gần nhất"
        timestamp premiumUntil "Hạn đăng ký VIP (66 tài khoản)"
        timestamp createdAt "Thời điểm khởi tạo"
    }

    LiveChannel {
        uuid id PK
        varchar name "Tên kênh phát sóng (25 kênh)"
        varchar slug UK "Định danh URL thân thiện"
        varchar category "SPORTS | CINE | NEWS | TECH | ..."
        int followerCount "Tổng lượng khán giả theo dõi"
        boolean isVerified "Kênh chính thức kiểm duyệt"
        boolean isActive "Kênh đang hoạt động"
        uuid ownerId FK "Người quản trị kênh"
    }

    LiveEvent {
        uuid id PK
        varchar title "Tiêu đề phiên phát sóng"
        timestamp scheduledStart "Thời gian bắt đầu phát"
        timestamp scheduledEnd "Thời gian kết thúc phát"
        varchar status "UPCOMING | LIVE | ENDED"
        uuid channelId FK "Kênh sở hữu"
    }

    Follow {
        uuid id PK
        uuid followerId FK "Khán giả theo dõi"
        uuid channelId FK "Kênh được theo dõi"
        timestamp createdAt "Thời gian bấm theo dõi (494 bản ghi)"
    }

    Comment {
        uuid id PK
        varchar content "Nội dung bình luận / Super Chat"
        uuid userId FK "Người bình luận"
        uuid liveEventId FK "Phiên live stream"
        boolean isPinned "Bình luận được ghim"
        timestamp createdAt "Thời điểm gửi"
    }

    Reaction {
        uuid id PK
        varchar type "HEART | FIRE | CLAP | WOW"
        uuid userId FK "Người thả cảm xúc"
        uuid liveEventId FK "Phiên live stream"
        timestamp createdAt "Thời gian tương tác"
    }
```

---

### 7. Ma Trận Phân Quyền Vai Trò (Role-Based Access Control — RBAC)

```mermaid
flowchart TD
    ClientReq([Yêu cầu từ người dùng]) --> AuthGuard{JWT Auth Guard & Roles Guard}
    
    AuthGuard -->|Vai trò: ADMIN| AdminZone["👑 TRUNG TÂM QUẢN TRỊ CAO CẤP (ADMIN)
    • Quản lý 170 tài khoản người dùng (Kích hoạt / Khóa tài khoản)
    • Giám sát hạ tầng Mission Control Telemetry thời gian thực
    • Truy xuất và phân tích toàn bộ Audit Log hệ thống
    • Quản trị cấp quyền kênh và kiểm duyệt nội dung phát sóng"]
    
    AuthGuard -->|Vai trò: STAFF| StaffZone["🛠️ ĐỘI NGŨ BIÊN TẬP & STUDIO (STAFF)
    • Truy cập Bàn điều khiển phát sóng Studio (Live Broadcaster Console)
    • Thiết lập lịch phát sóng EPG & kiểm tra trùng lịch tự động
    • Điều tiết phòng chat, xóa bình luận vi phạm bản quyền
    • Phát thông điệp khẩn cấp ghim đỏ lên luồng trực tiếp"]
    
    AuthGuard -->|Vai trò: VIEWER| ViewerZone["👥 CỘNG ĐỒNG KHÁN GIẢ (VIEWER)
    • Xem trực tiếp 25 kênh truyền hình Native Stream không Google login
    • Tra cứu lịch phát sóng EPG 24/7 & Hẹn giờ thông báo
    • Gửi bình luận, thả cảm xúc nổi và gửi Super Chat mô phỏng (0đ)
    • Theo dõi kênh và theo dõi lịch sử thời lượng xem cá nhân"]
    
    AuthGuard -->|Khách vãng lai / GUEST| GuestZone["👁️ KHÁCH CHƯA ĐĂNG NHẬP (GUEST)
    • Xem danh mục kênh công khai & lịch chiếu EPG tổng quan
    • Đăng ký tài khoản mới & Đăng nhập hệ thống bảo mật"]
```

---

## 👥 Thành Viên Nhóm Phát Triển (Team Members)

Dự án được phân bổ cân bằng và chuyên nghiệp giữa 4 thành viên theo đúng định hướng kỹ thuật môn học **PRN232** & **PRM393**:

| Thành Viên | MSSV | Tài Khoản GitHub | Vai Trò & Trách Nhiệm Chính | Phân Hệ Phụ Trách |
| :--- | :---: | :--- | :--- | :--- |
| **Trần Thanh Sơn** | **QE170080** | [`TranThanhSonQE170080`](https://github.com/TranThanhSonQE170080) | **DevOps & Database Administrator**<br/>• Thiết kế cơ sở dữ liệu Supabase PostgreSQL & Prisma ORM<br/>• Xây dựng script mở rộng dữ liệu 170 người dùng & 494 follows<br/>• Tự động hóa CI/CD, biên dịch báo cáo kỹ thuật dự án PDF<br/>• Kiểm thử hiệu năng truy vấn và bảo mật cơ sở dữ liệu | **Database & DevOps (PRN232)** |
| **Nguyễn Vĩnh Phú** | **QE180136** | [`phunvqe180136`](https://github.com/phunvqe180136) | **Mobile Lead Developer**<br/>• Phát triển ứng dụng Flutter theo mô hình BLoC / Cubit<br/>• Xây dựng bộ CustomPainter Cubic Bezier Telemetry đa sóng<br/>• Tích hợp luồng Live Donate & Super Chat kèm rung Haptic<br/>• Đóng gói và tối ưu hóa bản dựng Android Release APK | **Mobile App (PRM393)** |
| **Nguyễn Bình An** | — | [`TomOutfit`](https://github.com/TomOutfit) | **Team Leader / Core Architect**<br/>• Thiết kế kiến trúc tổng thể, mô hình bảo mật JWT & RBAC<br/>• Xây dựng luồng Direct Stream triệt tiêu Google Login Screen<br/>• Quản lý phát hành GitHub Release & Điều phối chung | **Backend API & Web Security** |
| **Đồng Hoàng Nguyên** | — | [`teng122`](https://github.com/teng122) | **Full-Stack & Realtime Engineer**<br/>• Xây dựng giao diện Next.js 15 Cinema Dark UI & SVG Charts<br/>• Phát triển hạ tầng WebSocket tương tác thời gian thực siêu tốc<br/>• Tích hợp trợ lý thẩm định AI Curator (OpenAI GPT-4o)<br/>• Tối ưu hóa bảng điều khiển Admin Mission Control | **Full-Stack & AI (PRN232)** |

---

## 🛠️ Hướng Dẫn Cài Đặt & Chạy Cục Bộ (Local Setup Guide)

### Yêu Cầu Môi Trường (Prerequisites)
- **Node.js**: Phiên bản `18.x` hoặc `20.x+` (Khuyên dùng `v20` hoặc `v24`).
- **Flutter SDK**: Phiên bản `3.x` (kênh stable).
- **PostgreSQL / Supabase**: Tài khoản hoặc chuỗi kết nối PostgreSQL Supabase đã cấu hình.

---

### 1. Khởi Chạy Backend Web API (NestJS)

```bash
# 1. Di chuyển vào thư mục backend
cd backend

# 2. Cài đặt các thư viện phụ thuộc
npm install

# 3. Đồng bộ schema Prisma và sinh Prisma Client
npx prisma generate

# 4. (Tùy chọn) Chạy script mở rộng dữ liệu 170 người dùng lên Supabase
npm run db:seed:users

# 5. Khởi động máy chủ backend ở chế độ phát triển
npm run start:dev
```
> API và tài liệu tương tác Swagger sẽ khởi chạy tại: `http://localhost:3000/swagger`

---

### 2. Khởi Chạy Frontend Web Portal (Next.js)

```bash
# 1. Di chuyển vào thư mục frontend
cd frontend

# 2. Cài đặt các gói npm
npm install

# 3. Kiểm tra kiểu dữ liệu TypeScript (0 lỗi)
npm run type-check

# 4. Khởi chạy máy chủ giao diện Next.js
npm run dev
```
> Cổng giao diện Web Portal sẽ hoạt động tại: `http://localhost:3001`

---

### 3. Khởi Chạy Ứng Dụng Di Động (Flutter Mobile App)

```bash
# 1. Di chuyển vào thư mục mobile
cd mobile

# 2. Tải các gói thư viện Dart / Flutter
flutter pub get

# 3. Kiểm tra mã nguồn tĩnh (Zero analysis issues)
flutter analyze

# 4. Chạy ứng dụng trên thiết bị Android thật hoặc máy ảo
flutter run

# 5. Hoặc biên dịch gói cài đặt Release APK cho điện thoại
flutter build apk --release --split-per-abi
```

---

## 📜 Giấy Phép & Bản Quyền (License)

Dự án được xây dựng và công bố theo giấy phép mã nguồn mở **MIT License**.  
Bản quyền thuộc về **Đội ngũ Phát triển Dự án OmniCast (FA26 Semester — FPT University)**.
