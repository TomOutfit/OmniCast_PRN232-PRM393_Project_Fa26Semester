-- ============================================================
-- OmniCast Seed Data
-- Diversified Format Live Channels: Sport 1, Sport 2, Show, Entertain, Cine, Drama, News, Music, Kids, Tech, Food, Discovery
-- ============================================================

-- ============================================================
-- 1. DEMO USERS
-- Password: Admin123! (hashed with bcrypt)
-- ============================================================

INSERT INTO "User" (id, email, "passwordHash", "fullName", role, "emailVerified", "isActive")
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'admin@omnicast.tv',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bHJ3z3LZyL8X3Hy', -- Admin123!
  'OmniCast Admin',
  'ADMIN',
  true,
  true
);

-- Create Staff User
INSERT INTO "User" (id, email, "passwordHash", "fullName", role, "emailVerified", "isActive")
VALUES (
  'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  'staff@omnicast.tv',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bHJ3z3LZyL8X3Hy', -- Admin123!
  'OmniCast Studio',
  'STAFF',
  true,
  true
);

-- Create Viewer Users
INSERT INTO "User" (id, email, "passwordHash", "fullName", role, "emailVerified", "isActive")
VALUES
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', 'viewer1@omnicast.tv', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bHJ3z3LZyL8X3Hy', 'Nguyen Van A', 'VIEWER', true, true),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', 'viewer2@omnicast.tv', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bHJ3z3LZyL8X3Hy', 'Tran Thi B', 'VIEWER', true, true),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', 'viewer3@omnicast.tv', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4bHJ3z3LZyL8X3Hy', 'Le Van C', 'VIEWER', true, true);

-- ============================================================
-- 2. DIVERSIFIED OMNICAST LIVE CHANNELS (12 Channels)
-- ============================================================

INSERT INTO "LiveChannel" (id, name, slug, description, tagline, "logoUrl", "badgeUrl", "avatarUrl", "bannerColor", category, language, "followerCount", "totalViews", "totalVideos", "isFeatured", "isVerified", "ownerId")
VALUES
  -- 1. Sport 1
  (
    '11111111-1111-1111-1111-111111111101',
    'Omni Sport 1',
    'sport-1',
    'Kênh thể thao đỉnh cao số 1 OmniCast - Trực tiếp các giải bóng đá vô địch quốc gia, cúp châu Âu, Tennis Grand Slam và bình luận trước - sau trận đấu.',
    'Đỉnh Cao Thể Thao Thế Giới',
    '/Channel_Logos/01-omni-sport-1-icon.svg',
    '/Channel_Logos/01-omni-sport-1-badge.svg',
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=200&auto=format&fit=crop&q=80',
    '#ef4444',
    'SPORTS',
    'vi',
    350000,
    45000000,
    620,
    true,
    true,
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  ),
  -- 2. Sport 2
  (
    '11111111-1111-1111-1111-111111111102',
    'Omni Sport 2',
    'sport-2',
    'Kênh thể thao tốc độ và đối kháng - Trực tiếp giải đua xe F1, MotoGP, võ thuật tổng hợp MMA/UFC, Boxing đỉnh cao và thể thao mạo hiểm X-Games.',
    'Bứt Phá Mọi Giới Hạn Tốc Độ',
    '/Channel_Logos/02-omni-sport-2-icon.svg',
    '/Channel_Logos/02-omni-sport-2-badge.svg',
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=200&auto=format&fit=crop&q=80',
    '#f97316',
    'SPORTS',
    'vi',
    220000,
    28000000,
    410,
    true,
    true,
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  ),
  -- 3. Show
  (
    '11111111-1111-1111-1111-111111111103',
    'Omni Show',
    'show',
    'Kênh truyền hình thực tế & talkshow độc quyền - Gameshow tương tác trực tiếp, phỏng vấn ngôi sao hàng đầu, thảm đỏ và hậu trường showbiz hấp dẫn.',
    'Sân Khấu Showbiz & Truyền Hình Thực Tế',
    '/Channel_Logos/03-omni-show-icon.svg',
    '/Channel_Logos/03-omni-show-badge.svg',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=200&auto=format&fit=crop&q=80',
    '#8b5cf6',
    'SHOW',
    'vi',
    410000,
    52000000,
    580,
    true,
    true,
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  ),
  -- 4. Entertain
  (
    '11111111-1111-1111-1111-111111111104',
    'Omni Entertain',
    'entertain',
    'Thế giới giải trí không giới hạn - Hài kịch độc thoại, sân khấu kịch tương tác, chương trình ảo thuật và các khoảnh khắc viral hài hước nhất.',
    'Giải Trí Bùng Nổ Mọi Lúc Mọi Nơi',
    '/Channel_Logos/04-omni-entertain-icon.svg',
    '/Channel_Logos/04-omni-entertain-badge.svg',
    'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&auto=format&fit=crop&q=80',
    '#eab308',
    'ENTERTAINMENT',
    'vi',
    380000,
    48000000,
    730,
    true,
    true,
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  ),
  -- 5. Cine
  (
    '11111111-1111-1111-1111-111111111105',
    'Omni Cine',
    'cine',
    'Kênh điện ảnh chất lượng 4K - Công chiếu phim ngắn độc quyền, liên hoan phim indie, phân tích điện ảnh chuyên sâu và trailer bom tấn.',
    'Điện Ảnh 4K & Trải Nghiệm Màn Ảnh Lớn',
    '/Channel_Logos/05-omni-cine-icon.svg',
    '/Channel_Logos/05-omni-cine-badge.svg',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=200&auto=format&fit=crop&q=80',
    '#3b82f6',
    'CINE',
    'vi',
    290000,
    36000000,
    350,
    true,
    true,
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  ),
  -- 6. Drama
  (
    '11111111-1111-1111-1111-111111111106',
    'Omni Drama',
    'drama',
    'Kênh phim bộ dài tập & web-drama - Tuyển tập những series phim tâm lý xã hội, tình cảm, hình sự kịch tính được sản xuất độc quyền cho OmniCast.',
    'Những Câu Chuyện Chạm Đến Cảm Xúc',
    '/Channel_Logos/06-omni-drama-icon.svg',
    '/Channel_Logos/06-omni-drama-badge.svg',
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=200&auto=format&fit=crop&q=80',
    '#ec4899',
    'DRAMA',
    'vi',
    310000,
    42000000,
    490,
    true,
    true,
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  ),
  -- 7. News
  (
    '11111111-1111-1111-1111-111111111107',
    'Omni News',
    'news',
    'Tin tức chuyển động số 24/7 - Cập nhật dòng chảy sự kiện thời sự, kinh tế tài chính, phân tích thị trường và xu hướng công nghệ toàn cầu liên tục.',
    'Thông Tin Nhanh Chóng, Chính Xác 24/7',
    '/Channel_Logos/07-omni-news-icon.svg',
    '/Channel_Logos/07-omni-news-badge.svg',
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=200&auto=format&fit=crop&q=80',
    '#dc2626',
    'NEWS',
    'vi',
    460000,
    65000000,
    1200,
    true,
    true,
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  ),
  -- 8. Music
  (
    '11111111-1111-1111-1111-111111111108',
    'Omni Music',
    'music',
    'Không gian âm nhạc trực tiếp - Trực tiếp live concert, acoustic lounge, bảng xếp hạng Top Hits V-Pop & Quốc tế, phát hành MV độc quyền.',
    'Giai Điệu Kết Nối Triệu Trái Tim',
    '/Channel_Logos/08-omni-music-icon.svg',
    '/Channel_Logos/08-omni-music-badge.svg',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200&auto=format&fit=crop&q=80',
    '#a855f7',
    'MUSIC',
    'vi',
    520000,
    78000000,
    850,
    true,
    true,
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  ),
  -- 9. Kids
  (
    '11111111-1111-1111-1111-111111111109',
    'Omni Kids',
    'kids',
    'Thế giới tuổi thơ diệu kỳ - Phim hoạt hình 3D, chương trình khoa học vui, ca nhạc thiếu nhi và bài học tiếng Anh tương tác bổ ích.',
    'Khám Phá, Vui Chơi Và Học Hỏi Cùng Bé',
    '/Channel_Logos/09-omni-kids-icon.svg',
    '/Channel_Logos/09-omni-kids-badge.svg',
    'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&auto=format&fit=crop&q=80',
    '#06b6d4',
    'KIDS',
    'vi',
    180000,
    21000000,
    390,
    false,
    true,
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  ),
  -- 10. Tech
  (
    '11111111-1111-1111-1111-111111111110',
    'Omni Tech',
    'tech',
    'Kênh công nghệ & trí tuệ nhân tạo - Livestream unbox sản phẩm mới, sự kiện công nghệ Apple/Google/Meta, lập trình viên và workshop AI 2026.',
    'Khám Phá Kỷ Nguyên Công Nghệ Tương Lai',
    '/Channel_Logos/10-omni-tech-icon.svg',
    '/Channel_Logos/10-omni-tech-badge.svg',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&auto=format&fit=crop&q=80',
    '#10b981',
    'TECH',
    'vi',
    340000,
    39000000,
    510,
    true,
    true,
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  ),
  -- 11. Food
  (
    '11111111-1111-1111-1111-111111111111',
    'Omni Food',
    'food',
    'Hương vị ẩm thực & phong cách sống - Livestream nấu ăn cùng MasterChef, food tour ẩm thực đường phố 3 miền và bí quyết pha chế đồ uống.',
    'Hành Trình Đánh Thức Vị Giác',
    '/Channel_Logos/11-omni-food-icon.svg',
    '/Channel_Logos/11-omni-food-badge.svg',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200&auto=format&fit=crop&q=80',
    '#ea580c',
    'FOOD',
    'vi',
    210000,
    25000000,
    360,
    false,
    true,
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  ),
  -- 12. Discovery
  (
    '11111111-1111-1111-1111-111111111112',
    'Omni Discovery',
    'discovery',
    'Kênh khám phá thế giới & du lịch trải nghiệm - Phim tài liệu thiên nhiên hoang dã, thám hiểm văn hóa bản địa và các kỳ quan hùng vĩ của hành tinh.',
    'Mở Rộng Tầm Nhìn Đến Mọi Miền Đất Nước',
    '/Channel_Logos/12-omni-discovery-icon.svg',
    '/Channel_Logos/12-omni-discovery-badge.svg',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=200&auto=format&fit=crop&q=80',
    '#14b8a6',
    'DOCUMENTARY',
    'vi',
    195000,
    23000000,
    320,
    true,
    true,
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'
  );

-- ============================================================
-- 3. LIVE EVENTS (Sample Events across Channels)
-- ============================================================

INSERT INTO "LiveEvent" (id, title, description, "thumbnailUrl", "streamSource", "externalPlatform", "externalId", status, "scheduledAt", "startedAt", "endedAt", duration, "viewerCount", "peakViewers", "channelId", tags, "autoRecord")
VALUES
  -- 1. Live on Sport 1
  (
    'eeee0000-0000-0000-0000-000000000001',
    'Trực Tiếp: Trận Siêu Kinh Điển Champions League 2026',
    'Trận đại chiến nảy lửa giữa hai ông lớn bóng đá châu Âu. Bình luận trực tiếp cùng các chuyên gia thể thao Omni Sport 1.',
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=640&auto=format&fit=crop&q=80',
    'EXTERNAL',
    'YOUTUBE',
    'dQw4w9WgXcQ',
    'LIVE',
    '2026-09-23T10:00:00Z',
    '2026-09-23T10:00:00Z',
    NULL,
    7200,
    18450,
    24000,
    '11111111-1111-1111-1111-111111111101',
    ARRAY['Football', 'Champions League', 'Bóng Đá', 'Sport1', 'Live'],
    true
  ),
  -- 2. Live on Show
  (
    'eeee0000-0000-0000-0000-000000000002',
    'Omni Star Talk: Gặp Gỡ Dàn Diễn Viên Bom Tấn 2026',
    'Talkshow độc quyền trò chuyện cùng đạo diễn và các diễn viên chính, tiết lộ những bí mật hậu trường chưa từng công bố.',
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=640&auto=format&fit=crop&q=80',
    'EXTERNAL',
    'YOUTUBE',
    'dQw4w9WgXcQ',
    'LIVE',
    '2026-09-23T10:30:00Z',
    '2026-09-23T10:30:00Z',
    NULL,
    5400,
    8200,
    11500,
    '11111111-1111-1111-1111-111111111103',
    ARRAY['Show', 'Talkshow', 'Celeb', 'OmniShow', 'Live'],
    true
  ),
  -- 3. Scheduled on Sport 2
  (
    'eeee0000-0000-0000-0000-000000000003',
    'F1 Singapore Grand Prix: Vòng Phân Hạng Q3 Tối Nay',
    'Vòng phân hạng đua đêm F1 trên đường đua Marina Bay. Cạnh tranh vị trí Pole nghẹt thở giữa các tay đua hàng đầu.',
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=640&auto=format&fit=crop&q=80',
    'EXTERNAL',
    'YOUTUBE',
    'dQw4w9WgXcQ',
    'SCHEDULED',
    '2026-09-25T19:00:00Z',
    NULL,
    NULL,
    NULL,
    0,
    0,
    '11111111-1111-1111-1111-111111111102',
    ARRAY['F1', 'Racing', 'Sport2', 'GrandPrix'],
    true
  ),
  -- 4. Scheduled on Music
  (
    'eeee0000-0000-0000-0000-000000000004',
    'Omni Acoustic Sunset: Đêm Nhạc Mùa Thu 2026',
    'Live concert acoustic phát sóng trực tiếp từ ban công hoàng hôn với các bản tình ca sâu lắng.',
    'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=640&auto=format&fit=crop&q=80',
    'EXTERNAL',
    'YOUTUBE',
    'dQw4w9WgXcQ',
    'SCHEDULED',
    '2026-09-26T17:30:00Z',
    NULL,
    NULL,
    NULL,
    0,
    0,
    '11111111-1111-1111-1111-111111111108',
    ARRAY['Music', 'Acoustic', 'LiveConcert', 'OmniMusic'],
    true
  ),
  -- 5. Ended on Tech
  (
    'eeee0000-0000-0000-0000-000000000005',
    'Keynote AI Revolution 2026: Ra Mắt Các Siêu Trợ Lý AI',
    'Toàn cảnh sự kiện ra mắt thế hệ AI mới với khả năng đa phương thức và xử lý tác vụ thời gian thực.',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=640&auto=format&fit=crop&q=80',
    'EXTERNAL',
    'YOUTUBE',
    'dQw4w9WgXcQ',
    'ENDED',
    '2026-09-22T14:00:00Z',
    '2026-09-22T14:00:00Z',
    '2026-09-22T16:30:00Z',
    9000,
    0,
    32000,
    '11111111-1111-1111-1111-111111111110',
    ARRAY['Tech', 'AI', 'Keynote', 'OmniTech'],
    true
  );

-- ============================================================
-- 4. RECORDINGS (VOD Content across Channels)
-- ============================================================

INSERT INTO "Recording" (id, title, description, "thumbnailUrl", "contentSource", "externalPlatform", "externalId", duration, quality, "contentType", "viewCount", "likeCount", "commentCount", "channelId", tags, category, "isFeatured", "publishedAt")
VALUES
  -- 1. Sport 1 VOD
  (
    'dddd0000-0000-0000-0000-000000000001',
    'Top 10 Pha Cứu Thua Ngoạn Mục Nhất Ngoại Hạng Anh',
    'Tuyển tập những pha phản xạ không tưởng từ các thủ môn xuất sắc nhất thế giới trong tuần thi đấu vừa qua.',
    'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=640&auto=format&fit=crop&q=80',
    'EXTERNAL',
    'YOUTUBE',
    'dQw4w9WgXcQ',
    720,
    'FULL_HD_1080P',
    'VIDEO',
    125000,
    8900,
    512,
    '11111111-1111-1111-1111-111111111101',
    ARRAY['Sport', 'Highlights', 'Goalkeeper', 'Football'],
    'SPORTS',
    true,
    '2026-09-22T08:00:00Z'
  ),
  -- 2. Cine VOD
  (
    'dddd0000-0000-0000-0000-000000000002',
    'Phim Ngắn: "Ánh Sáng Nơi Cuối Hẻm" (4K HDR)',
    'Bộ phim ngắn đoạt giải thưởng điện ảnh trẻ Omni Cine 2026 về câu chuyện tình cảm gia đình giữa lòng phố thị náo nhiệt.',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=640&auto=format&fit=crop&q=80',
    'UPLOADED',
    NULL,
    NULL,
    1800,
    'UHD_4K',
    'VIDEO',
    89000,
    7200,
    410,
    '11111111-1111-1111-1111-111111111105',
    ARRAY['Cine', 'ShortFilm', '4K', 'Drama'],
    'CINE',
    true,
    '2026-09-21T14:00:00Z'
  ),
  -- 3. Drama VOD
  (
    'dddd0000-0000-0000-0000-000000000003',
    'Series "Bí Ẩn Tầng 13" - Tập 1: Cuộc Hẹn Nửa Đêm',
    'Mở màn chuỗi phim tâm lý trinh thám hồi hộp, những vụ án kỳ bí bắt đầu lộ diện từ một tòa chung cư cũ.',
    'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=640&auto=format&fit=crop&q=80',
    'UPLOADED',
    NULL,
    NULL,
    2700,
    'FULL_HD_1080P',
    'VIDEO',
    156000,
    14200,
    980,
    '11111111-1111-1111-1111-111111111106',
    ARRAY['Drama', 'Series', 'Thriller', 'Mystery'],
    'DRAMA',
    true,
    '2026-09-20T19:00:00Z'
  ),
  -- 4. News VOD
  (
    'dddd0000-0000-0000-0000-000000000004',
    'Bản Tin Kinh Tế Số: Dự Báo Thị Trường Tài Chính Cuối Năm 2026',
    'Báo cáo và nhận định chuyên sâu về dòng vốn đầu tư, lãi suất ngân hàng và triển vọng các ngành công nghệ cao.',
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=640&auto=format&fit=crop&q=80',
    'EXTERNAL',
    'YOUTUBE',
    'dQw4w9WgXcQ',
    1500,
    'FULL_HD_1080P',
    'VIDEO',
    64000,
    4300,
    230,
    '11111111-1111-1111-1111-111111111107',
    ARRAY['News', 'Economy', 'Finance', 'OmniNews'],
    'NEWS',
    false,
    '2026-09-22T06:30:00Z'
  ),
  -- 5. Food VOD
  (
    'dddd0000-0000-0000-0000-000000000005',
    'Bí Quyết Nấu Nước Dùng Phở Bò Thơm Lừng Chuẩn Vị Gia Truyền',
    'Công thức ninh xương bò đúng điệu cùng các loại thảo mộc truyền thống cho nước dùng trong vắt, ngọt thanh tự nhiên.',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=640&auto=format&fit=crop&q=80',
    'UPLOADED',
    NULL,
    NULL,
    1200,
    'FULL_HD_1080P',
    'VIDEO',
    110000,
    9800,
    645,
    '11111111-1111-1111-1111-111111111111',
    ARRAY['Food', 'Cooking', 'PhoBo', 'VietnameseFood'],
    'FOOD',
    false,
    '2026-09-19T11:00:00Z'
  ),
  -- 6. Discovery VOD
  (
    'dddd0000-0000-0000-0000-000000000006',
    'Kỳ Quan Hang Én & Sơn Đoòng: Hành Trình Vào Lòng Đất Mẹ',
    'Thước phim tài liệu 4K mãn nhãn khám phá hệ thống hang động tự nhiên kỳ vĩ bậc nhất thế giới tại Quảng Bình.',
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=640&auto=format&fit=crop&q=80',
    'EXTERNAL',
    'YOUTUBE',
    'dQw4w9WgXcQ',
    2400,
    'UHD_4K',
    'VIDEO',
    95000,
    8600,
    520,
    '11111111-1111-1111-1111-111111111112',
    ARRAY['Discovery', 'Travel', 'SonDoong', 'Vietnam', '4K'],
    'DOCUMENTARY',
    true,
    '2026-09-18T16:00:00Z'
  );

-- ============================================================
-- 5. SAMPLE COMMENTS
-- ============================================================

INSERT INTO "Comment" (id, content, "userId", "recordingId", "createdAt")
VALUES
  ('cccc0000-0000-0000-0000-000000000001', 'Kênh Sport 1 phát sóng chất lượng mượt mà quá, bình luận viên rất chuyên nghiệp!', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'dddd0000-0000-0000-0000-000000000001', '2026-09-22T09:00:00Z'),
  ('cccc0000-0000-0000-0000-000000000002', 'Phim ngắn trên Omni Cine hình ảnh 4K màu sắc quá nghệ thuật, nhạc phim cũng xuất sắc!', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'dddd0000-0000-0000-0000-000000000002', '2026-09-21T16:30:00Z'),
  ('cccc0000-0000-0000-0000-000000000003', 'Tập 1 Drama cuốn thật sự, mong chờ tập 2 quá Omni Drama ơi!', 'e5f6a7b8-c9d0-1234-efab-345678901234', 'dddd0000-0000-0000-0000-000000000003', '2026-09-20T21:00:00Z'),
  ('cccc0000-0000-0000-0000-000000000004', 'Xem Discovery ngắm Sơn Đoòng mà tự hào đất nước mình ghê.', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'dddd0000-0000-0000-0000-000000000006', '2026-09-19T08:20:00Z');

-- ============================================================
-- 6. SAMPLE REACTIONS
-- ============================================================

INSERT INTO "Reaction" (id, "userId", type, "recordingId", "createdAt")
VALUES
  ('fa000000-0000-0000-0000-000000000001', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'HEART', 'dddd0000-0000-0000-0000-000000000001', '2026-09-22T09:10:00Z'),
  ('fa000000-0000-0000-0000-000000000002', 'd4e5f6a7-b8c9-0123-defa-234567890123', 'FIRE', 'dddd0000-0000-0000-0000-000000000002', '2026-09-21T17:00:00Z'),
  ('fa000000-0000-0000-0000-000000000003', 'e5f6a7b8-c9d0-1234-efab-345678901234', 'CLAP', 'dddd0000-0000-0000-0000-000000000003', '2026-09-20T21:30:00Z'),
  ('fa000000-0000-0000-0000-000000000004', 'c3d4e5f6-a7b8-9012-cdef-123456789012', 'WOW', 'dddd0000-0000-0000-0000-000000000006', '2026-09-19T08:30:00Z');

-- ============================================================
-- 7. SAMPLE FOLLOWS
-- ============================================================

INSERT INTO "Follow" ("followerId", "channelId", "createdAt")
VALUES
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', '11111111-1111-1111-1111-111111111101', '2026-09-10T10:00:00Z'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', '11111111-1111-1111-1111-111111111103', '2026-09-11T10:00:00Z'),
  ('c3d4e5f6-a7b8-9012-cdef-123456789012', '11111111-1111-1111-1111-111111111105', '2026-09-12T10:00:00Z'),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', '11111111-1111-1111-1111-111111111102', '2026-09-13T10:00:00Z'),
  ('d4e5f6a7-b8c9-0123-defa-234567890123', '11111111-1111-1111-1111-111111111107', '2026-09-14T10:00:00Z'),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', '11111111-1111-1111-1111-111111111106', '2026-09-15T10:00:00Z'),
  ('e5f6a7b8-c9d0-1234-efab-345678901234', '11111111-1111-1111-1111-111111111108', '2026-09-16T10:00:00Z');

-- ============================================================
-- 8. PRODUCTION TAGS (12 Tags)
-- ============================================================

INSERT INTO "ProductionTag" (name, slug, color, type)
VALUES
  ('Việt Nam', 'viet-nam', '#ef4444', 'COUNTRY'),
  ('Quốc Tế', 'quoc-te', '#3b82f6', 'COUNTRY'),
  ('Châu Á', 'chau-a', '#22c55e', 'COUNTRY'),
  ('Thể Thao', 'the-thao', '#f97316', 'GENRE'),
  ('Hành Động', 'hanh-dong', '#dc2626', 'GENRE'),
  ('Hài Hước', 'hai-huoc', '#eab308', 'GENRE'),
  ('Tình Cảm', 'tinh-cam', '#ec4899', 'GENRE'),
  ('Kịch Tính', 'kich-tinh', '#8b5cf6', 'GENRE'),
  ('HD 1080p', 'hd-1080p', '#10b981', 'FEATURE'),
  ('4K Ultra HD', '4k-uhd', '#06b6d4', 'FEATURE'),
  ('Mọi Độ Tuổi (G)', 'rating-g', '#6366f1', 'RATING'),
  ('16+ (PG-16)', 'rating-pg16', '#f59e0b', 'RATING');

-- ============================================================
-- 9. UPDATE CHANNEL STATS
-- ============================================================

UPDATE "LiveChannel" lc SET "totalViews" = (
  SELECT COALESCE(SUM(r."viewCount"), 0) 
  FROM "Recording" r 
  WHERE r."channelId" = lc.id
);

UPDATE "LiveChannel" lc SET "followerCount" = (
  SELECT COUNT(*) 
  FROM "Follow" f 
  WHERE f."channelId" = lc.id
);

UPDATE "LiveChannel" lc SET "totalVideos" = (
  SELECT COUNT(*) 
  FROM "Recording" r 
  WHERE r."channelId" = lc.id AND r."isPublished" = true
);

-- ============================================================
-- COMPLETE & VERIFY
-- ============================================================

SELECT 'Users:' as table_name, COUNT(*) as count FROM "User"
UNION ALL
SELECT 'OmniCast Channels:', COUNT(*) FROM "LiveChannel"
UNION ALL
SELECT 'Live Events:', COUNT(*) FROM "LiveEvent"
UNION ALL
SELECT 'Recordings (VOD):', COUNT(*) FROM "Recording"
UNION ALL
SELECT 'Comments:', COUNT(*) FROM "Comment"
UNION ALL
SELECT 'Reactions:', COUNT(*) FROM "Reaction"
UNION ALL
SELECT 'Follows:', COUNT(*) FROM "Follow"
UNION ALL
SELECT 'Production Tags:', COUNT(*) FROM "ProductionTag";
