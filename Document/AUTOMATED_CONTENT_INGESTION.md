# OmniCast - Kiến Trúc Thu Thập & Tự Động Hóa Nội Dung 12 Kênh (Automated Content & EPG Ingestion)

Tài liệu đặc tả kiến trúc tự động hóa nguồn cấp nội dung, xử lý AI, lập lịch EPG thông minh và đồng bộ cơ sở dữ liệu Supabase cho 12 kênh phát sóng OmniCast.

---

## 1. Kiến Trúc Tổng Thể (System Architecture)

```mermaid
flowchart TB
    subgraph DataSources["1. NGUỒN CẤP DỮ LIỆU ĐA THỂ LOẠI (DATA SOURCES)"]
        direction TB
        S1["📰 News RSS & REST APIs<br/>(VnExpress, Tuổi Trẻ, Reuters, BBC)"]
        S2["🎥 Video & VOD Creator Feeds<br/>(YouTube Data API v3, Partner Channels)"]
        S3["⚽ Sports Open Data APIs<br/>(API-Football, TheSportsDB, Ergast F1)"]
        S4["📡 Broadcast EPG XMLTV<br/>(Open IPTV / XMLTV Feeds)"]
        S5["🌍 Open Media & Documentary<br/>(Internet Archive, Wikimedia Commons)"]
    end

    subgraph BackendPipeline["2. BACKEND INGESTION & AI WORKER (NESTJS)"]
        direction TB
        W1["⏰ Cron Scheduler / BullQueue Ingestion"]
        W2["🤖 AI Content Curator (Gemini / Claude Engine)<br/>• Phân loại thể loại (Category)<br/>• Sinh tóm tắt & Hashtag SEO<br/>• Đánh giá độ tuổi & thời lượng"]
        W3["📅 Dynamic EPG 24h Scheduler<br/>• Phân bổ khung giờ vàng (Prime Time)<br/>• Chống trùng lặp nội dung 7 ngày"]
        
        W1 --> W2 --> W3
    end

    subgraph SupabaseDB["3. CƠ SỞ DỮ LIỆU SUPABASE (POSTGRESQL)"]
        direction TB
        DB1[("LiveChannel<br/>(12 Kênh thống nhất)")]
        DB2[("LiveEvent<br/>(Lịch EPG 24h & Livestream)")]
        DB3[("Recording<br/>(VOD, Phóng sự, Bản tin đã phát)")]
        DB4[("ProductionTag<br/>(Thẻ phân loại AI)")]
        
        DB1 --- DB2
        DB1 --- DB3
        DB2 --- DB4
    end

    subgraph Clients["4. HỆ THỐNG PHÁT SÓNG & TRẢI NGHIỆM ĐA NỀN TẢNG"]
        direction TB
        C1["💻 Web Application (Next.js 14)"]
        C2["📱 Mobile Application (Flutter)"]
        C3["🔔 Realtime Push & Webhook"]
    end

    DataSources -->|"Định kỳ cào / gọi API"| W1
    W3 -->|"Ghi trực tiếp Prisma ORM"| SupabaseDB
    SupabaseDB -->|"Supabase REST / Realtime WebSocket"| Clients
```

---

## 2. Quy Trình Phân Bổ Nội Dung Tự Động Theo Kênh (Kênh Tin Tức & Chuyên Đề)

Quy trình tự động hóa cho kênh Tin tức, Phóng sự, Tọa đàm và Chuyên đề chuyên biệt:

```mermaid
sequenceDiagram
    autonumber
    participant Source as Nguồn Tin (RSS/APIs/YouTube)
    participant Worker as Ingestion Worker (NestJS)
    participant AI as AI Curator (Gemini Engine)
    participant DB as Supabase DB
    participant Client as Web / Mobile Client

    Worker->>Source: Cào tin tức mới / Quét playlist định kỳ (15 phút/lần)
    Source-->>Worker: Trả về bài viết, video metadata, audio stream
    Worker->>AI: Gửi tiêu đề, nội dung gốc, thời lượng
    AI-->>Worker: Trả về phân loại (Bản tin / Chuyên đề / Phóng sự), Tóm tắt, Tag
    Worker->>DB: Ghi bản ghi vào LiveEvent (EPG) & Recording (VOD)
    DB-->>Client: Supabase Realtime thông báo cập nhật EPG & Phát sóng
```

---

## 3. Thiết Kế Cơ Sở Dữ Liệu Supabase (Entity Relationship Diagram)

```mermaid
erDiagram
    User ||--o{ LiveChannel : "quản lý"
    LiveChannel ||--o{ LiveEvent : "có lịch phát sóng"
    LiveChannel ||--o{ Recording : "lưu trữ VOD"
    LiveChannel ||--o{ Follow : "được theo dõi bởi"
    User ||--o{ Follow : "theo dõi"

    LiveChannel {
        uuid id PK
        varchar name "Tên kênh (Omni News, Omni Sport 1...)"
        varchar slug UK "Slug định danh (news, sport-1...)"
        text description "Mô tả kênh"
        varchar logoUrl "Đường dẫn SVG Logo Focus Core"
        varchar badgeUrl "Đường dẫn SVG Badge"
        varchar bannerColor "Mã màu nhận diện thương hiệu"
        enum category "SPORTS, NEWS, TECH, FOOD..."
        int followerCount "Số người theo dõi"
        bigint totalViews "Tổng lượt xem"
        boolean isLive "Trạng thái phát trực tiếp"
        boolean isVerified "Kênh chính thức đã xác minh"
    }

    LiveEvent {
        uuid id PK
        uuid channelId FK "Khóa ngoại tới LiveChannel"
        varchar title "Tên chương trình (Thời sự 24h, Phóng sự...)"
        text description "Tóm tắt nội dung chương trình"
        varchar thumbnailUrl "Ảnh bìa chương trình"
        varchar streamUrl "Luồng phát HLS / RTMP / Embed"
        enum status "SCHEDULED, LIVE, ENDED"
        timestamptz scheduledAt "Thời gian bắt đầu phát sóng"
        timestamptz endedAt "Thời gian kết thúc"
        enum quality "FULL_HD_1080P, UHD_4K"
    }

    Recording {
        uuid id PK
        uuid channelId FK "Khóa ngoại tới LiveChannel"
        varchar title "Tên video VOD / Chuyên đề"
        text description "Mô tả chi tiết"
        varchar videoUrl "Đường dẫn video xem lại"
        int duration "Thời lượng tính bằng giây"
        int viewCount "Lượt xem VOD"
        timestamptz publishedAt "Ngày phát hành"
    }

    ProductionTag {
        uuid id PK
        varchar name "Tên thẻ (#ThoiSu, #CongNgheAI)"
        varchar slug UK "Slug thẻ"
        enum type "GENRE, FEATURE, RATING"
    }
```

---

## 4. Ma Trận Nội Dung 12 Kênh & Khung Giờ 24/7

| STT | Kênh | Thể Loại | Nguồn Cấp Dữ Liệu Tự Động | Cấu Trúc Khung Giờ 24/7 Tiêu Biểu |
| :---: | :--- | :--- | :--- | :--- |
| **01** | **Omni Sport 1** | SPORTS | API-Football, TheSportsDB | **06:00**: Điểm tin sáng • **14:00**: Highlight vòng đấu • **19:00**: Bình luận trước trận • **20:00**: Trực tiếp Ngoại Hạng Anh / C1 |
| **02** | **Omni Sport 2** | SPORTS | Ergast F1, MMA/UFC feeds | **08:00**: Tạp chí tốc độ F1 • **15:00**: Tổng hợp Knockout MMA • **21:00**: Trực tiếp chặng đua F1/MotoGP |
| **03** | **Omni Show** | SHOW | YouTube Creator APIs, Talkshow Feeds | **09:00**: Gameshow tương tác • **14:00**: Sao & Hậu trường • **20:00**: Talkshow độc quyền |
| **04** | **Omni Entertain** | ENTERTAINMENT | Comedy Clips, Sân khấu kịch | **12:00**: Hài kịch thư giãn • **18:00**: Tiểu phẩm viral • **20:30**: Gala cười cuối tuần |
| **05** | **Omni Cine** | CINE | Open Movie DB, Indie Film Archives | **10:00**: Phân tích điện ảnh • **15:00**: Phim ngắn đoạt giải • **20:00**: Bom tấn điện ảnh 4K |
| **06** | **Omni Drama** | DRAMA | Web-drama & Phim bộ dài tập | **11:00**: Web-drama tập mới • **19:30**: Phim truyền hình khung giờ vàng |
| **07** | **Omni News** | NEWS | RSS VnExpress, Tuổi Trẻ, Reuters, AP | **Đầu mỗi giờ**: Flash News (5p) • **07:00**: Thời sự sáng • **12:00**: Chuyển động thế giới • **15:00**: Tài chính & Thị trường • **20:00**: Phóng sự điều tra & Tọa đàm chuyên đề |
| **08** | **Omni Music** | MUSIC | Top Hits API, Live Concert Streams | **07:30**: Acoustic Morning • **16:00**: Top Hits V-Pop & Billboard • **20:30**: Live Concert |
| **09** | **Omni Kids** | KIDS | Hoạt hình 3D Creative Commons | **07:00**: Bé học tiếng Anh • **11:30**: Hoạt hình 3D vui nhộn • **17:30**: Khoa học vui cho bé |
| **10** | **Omni Tech** | TECH | TechCrunch, GitHub, Creator Feeds | **08:30**: Điểm tin công nghệ AI • **14:30**: Unbox & Đánh giá thiết bị • **20:00**: Workshop & Keynote |
| **11** | **Omni Food** | FOOD | MasterChef feeds, Street Food VODs | **06:30**: Bữa sáng dinh dưỡng • **11:30**: Food Tour 3 Miền • **18:30**: Công thức MasterChef |
| **12** | **Omni Discovery** | DOCUMENTARY | Internet Archive, Open Science | **09:00**: Thiên nhiên hoang dã • **16:00**: Hành trình khám phá đại dương • **21:00**: Bí ẩn vũ trụ |

---

## 5. Cấu Hình Đồng Bộ Dữ Liệu Với Supabase

### 1. Đồng bộ Schema lên Supabase
```bash
cd backend
npx prisma db push
```

### 2. Chạy Seeding khởi tạo 12 Kênh và Lịch EPG mẫu
```bash
npx prisma db seed
```
*(Dữ liệu được nạp tự động qua file `backend/prisma/seed.ts` và `backend/prisma/seed.sql`).*
