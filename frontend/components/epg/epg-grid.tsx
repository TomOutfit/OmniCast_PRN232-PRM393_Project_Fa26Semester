'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Calendar,
  Clock,
  Play,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  Radio,
  Tv,
  Film,
  Flame,
  Star,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Bell,
  Info,
  SlidersHorizontal,
  Layers,
  Volume2,
  Maximize2,
  Share2,
  Cast,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChannelLogo } from '@/components/ui/channel-logo';
import { useChannels } from '@/lib/hooks/useChannels';
import { useEpgDay } from '@/lib/hooks/usePrograms';
import {
  type RealEpgProgram,
  type RealEpgChannel,
  CATEGORY_FILTERS,
  buildFallbackChannels,
  mapApiEpgToRealChannels,
} from './epg-channels-data';
export type { RealEpgProgram, RealEpgChannel };

// ─────────────────────────────────────────────────────────────────────────────
// REAL-WORLD 24-HOUR BROADCAST SCHEDULE (LỊCH PHÁT SÓNG THỰC TẾ 25 KÊNH)
// Thời lượng thực tế: 15p, 30p, 45p, 50p, 75p, 90p, 110p, 135p, 150p...
// ─────────────────────────────────────────────────────────────────────────────
export const REAL_WORLD_CHANNELS_EPG: RealEpgChannel[] = [
  // ── 01. Omni Sport 1 (Thể Thao Ngoại Hạng & Champions League) ─────────
  {
    id: 'ch-01',
    slug: 'sport-1',
    chNumber: 'CH #001',
    name: 'Omni Sport 1',
    category: 'sports',
    categoryLabel: 'Thể Thao Đỉnh Cao',
    logo: '/Channel_Logos/01-omni-sport-1-icon.svg',
    color: '#EF4444',
    programs: [
      {
        id: 'sp1-1',
        title: 'Thể Thao 24H: Điểm Tin Sáng Toàn Cầu',
        category: 'Tin Tức',
        startTime: '06:00',
        endTime: '06:30',
        startMinutes: 360,
        durationMinutes: 30,
        quality: '1080p60',
        audio: 'Stereo',
        description: 'Tổng hợp kết quả các trận đấu bóng đá châu Âu đêm qua, bảng xếp hạng và các thông tin thể thao quốc tế mới nhất.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'sp1-2',
        title: 'Tạp Chí Ngoại Hạng Anh: Bàn Thắng Vòng Đấu',
        category: 'Tạp Chí',
        startTime: '06:30',
        endTime: '07:15',
        startMinutes: 390,
        durationMinutes: 45,
        badge: 'HIGHLIGHT',
        quality: '4K UHD',
        audio: 'Dolby 5.1',
        description: 'Bình luận chi tiết và chiêm ngưỡng top 10 siêu phẩm bàn thắng đẹp mắt nhất vòng đấu Ngoại Hạng Anh.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'sp1-3',
        title: 'Xem Lại Trận Đấu: Real Madrid vs Bayern Munich',
        subtitle: 'Bán Kết Lượt Về UEFA Champions League',
        category: 'Trận Cầu Đinh',
        startTime: '07:15',
        endTime: '08:45',
        startMinutes: 435,
        durationMinutes: 90,
        badge: 'CATCH-UP 4K',
        quality: '4K 60FPS',
        audio: 'Dolby Atmos',
        description: 'Màn rượt đuổi tỉ số nghẹt thở trên thánh địa Santiago Bernabéu với cú đúp phút bù giờ khó tin của Joselu.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'sp1-4',
        title: 'Bản Tin Chuyển Nhượng: Tin Nóng Sân Cỏ',
        category: 'Tin Nhanh',
        startTime: '08:45',
        endTime: '09:05',
        startMinutes: 525,
        durationMinutes: 20,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Cập nhật diễn biến thị trường chuyển nhượng mùa hè châu Âu và các bản hợp đồng bom tấn chuẩn bị kích nổ.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'sp1-5',
        title: 'Quần Vợt ATP Masters 1000: Vòng Tứ Kết',
        category: 'Quần Vợt',
        startTime: '09:05',
        endTime: '11:15',
        startMinutes: 545,
        durationMinutes: 130,
        quality: '4K HDR',
        audio: 'Dolby 5.1',
        description: 'Cuộc so tài đỉnh cao giữa Carlos Alcaraz và Jannik Sinner trên mặt sân cứng.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'sp1-6',
        title: 'Thể Thao Trưa & Phỏng Vấn Chuyên Sâu',
        category: 'Talkshow',
        startTime: '11:15',
        endTime: '12:00',
        startMinutes: 675,
        durationMinutes: 45,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Gặp gỡ và trò chuyện cùng các chuyên gia bóng đá hàng đầu về cơ hội vô địch của các câu lạc bộ lớn.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'sp1-7',
        title: 'Đua Xe F1: Chặng Đua Monaco GP - Vòng Phân Hạng',
        category: 'F1 Motorsport',
        startTime: '12:00',
        endTime: '13:30',
        startMinutes: 720,
        durationMinutes: 90,
        badge: 'REPLAY 4K',
        quality: '4K 60FPS',
        audio: 'Dolby 5.1',
        description: 'Những góc cua tử thần tại Monte Carlo cùng màn tranh giành pole position nghẹt thở của Max Verstappen và Charles Leclerc.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'sp1-8',
        title: 'Bóng Chuyền Nữ VNL: Việt Nam vs Thái Lan',
        category: 'Bóng Chuyền',
        startTime: '13:30',
        endTime: '15:15',
        startMinutes: 810,
        durationMinutes: 105,
        quality: '1080p60',
        audio: 'Dolby Audio',
        description: 'Trận thư hùng kinh điển khu vực Đông Nam Á tại đấu trường FIVB Volleyball Nations League.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'sp1-9',
        title: 'Toàn Cảnh Champions League: Kỷ Niệm 70 Năm',
        category: 'Tài Liệu',
        startTime: '15:15',
        endTime: '16:45',
        startMinutes: 915,
        durationMinutes: 90,
        quality: '4K UHD',
        audio: 'Dolby Atmos',
        description: 'Hành trình 7 thập kỷ hình thành và phát triển của giải bóng đá danh giá nhất hành tinh cấp câu lạc bộ.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'sp1-10',
        title: 'Bản Tin Thể Thao Tối & Tiền Trận Siêu Cúp',
        category: 'Tin Nóng',
        startTime: '16:45',
        endTime: '17:45',
        startMinutes: 1005,
        durationMinutes: 60,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Cập nhật đội hình ra sân chính thức, sơ đồ chiến thuật và nhận định chuyên gia trước giờ bóng lăn.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'sp1-11',
        title: 'Trực Tiếp: Manchester City vs Arsenal',
        subtitle: 'Vòng 35 Ngoại Hạng Anh • SVĐ Etihad',
        category: 'Trực Tiếp Đỉnh Cao',
        startTime: '17:45',
        endTime: '20:15',
        startMinutes: 1065,
        durationMinutes: 150,
        badge: 'TRỰC TIẾP 4K',
        quality: '4K 60FPS HEVC',
        audio: 'DOLBY ATMOS 5.1',
        rating: 9.9,
        description: 'Trận đại chiến quyết định ngôi vương Premier League. Trực tiếp 16 góc máy cùng BLV Quang Huy & BLV Anh Ngọc.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80',
        features: ['16 Multi-Cam', 'Dolby Atmos 5.1', 'Tactical AI'],
      },
      {
        id: 'sp1-12',
        title: 'Omni Extra Time: Họp Báo & Phỏng Vấn HLV',
        category: 'Hậu Trận',
        startTime: '20:15',
        endTime: '21:00',
        startMinutes: 1215,
        durationMinutes: 45,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Phỏng vấn độc quyền HLV Pep Guardiola và Mikel Arteta ngay tại phòng họp báo sân vận động Etihad.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'sp1-13',
        title: 'Trực Tiếp: Real Madrid vs FC Barcelona',
        subtitle: 'El Clásico Kinh Điển Tây Ban Nha • SVĐ Santiago Bernabéu',
        category: 'Siêu Kinh Điển',
        startTime: '21:00',
        endTime: '23:30',
        startMinutes: 1260,
        durationMinutes: 150,
        badge: 'TRỰC TIẾP 4K',
        quality: '4K UHD HDR',
        audio: 'DOLBY ATMOS',
        rating: 9.8,
        description: 'Trận El Clásico rực lửa giữa hai gã khổng lồ của bóng đá thế giới. Vinicius Jr, Bellingham chạm trán Lewandowski, Yamal.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=80',
        features: ['Spider-Cam', 'Player-Cam', 'Dolby Atmos'],
      },
      {
        id: 'sp1-14',
        title: 'Tổng Hợp Vòng Đấu & Bàn Thắng Vàng Đêm Nay',
        category: 'Tổng Hợp',
        startTime: '23:30',
        endTime: '01:00',
        startMinutes: 1410,
        durationMinutes: 90,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Xem lại toàn bộ các pha làm bàn đỉnh cao và các tình huống gây tranh cãi của vòng đấu.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'sp1-15',
        title: 'Trực Tiếp: Chung Kết Bóng Rổ Nhà Nghề Mỹ NBA Game 7',
        category: 'Bóng Rổ NBA',
        startTime: '01:00',
        endTime: '03:30',
        startMinutes: 60,
        durationMinutes: 150,
        badge: 'LIVE NBA',
        quality: '4K UHD',
        audio: 'Dolby 5.1',
        description: 'Trận Game 7 sống còn tranh chức vô địch NBA Finals.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'sp1-16',
        title: 'Thể Thao Đêm Khuya & Phát Lại Trận Cầu Đinh',
        category: 'Phát Lại',
        startTime: '03:30',
        endTime: '06:00',
        startMinutes: 210,
        durationMinutes: 150,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Phát lại trọn vẹn trận đấu hấp dẫn nhất trong ngày dành cho khán giả không thể theo dõi trực tiếp.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80',
      },
    ],
  },

  // ── 02. Omni Cine 4K (Điện Ảnh Bom Tấn & Phim Chiếu Rạp) ───────────────
  {
    id: 'ch-02',
    slug: 'cine',
    chNumber: 'CH #005',
    name: 'Omni Cine 4K',
    category: 'movies',
    categoryLabel: 'Phim Chiếu Rạp 4K',
    logo: '/Channel_Logos/05-omni-cine-icon.svg',
    color: '#F59E0B',
    programs: [
      {
        id: 'cn-1',
        title: 'Phim Hành Động Sáng: Giờ Cao Điểm 3',
        category: 'Hành Động',
        startTime: '06:00',
        endTime: '07:45',
        startMinutes: 360,
        durationMinutes: 105,
        quality: '1080p FHD',
        audio: 'Dolby 5.1',
        description: 'Thanh tra Lee và cảnh sát Carter tái xuất trong phi vụ triệt phá băng đảng Tam Hoàng tại thủ đô Paris hoa lệ.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cn-2',
        title: 'Thế Giới Hậu Trường & Trailer Bom Tấn 2026',
        category: 'Hậu Trường',
        startTime: '07:45',
        endTime: '08:05',
        startMinutes: 465,
        durationMinutes: 20,
        quality: '4K UHD',
        audio: 'Stereo',
        description: 'Khám phá hậu trường kỹ xảo điện ảnh VFX và các trích đoạn trailer mới nhất của Hollywood.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cn-3',
        title: 'Bom Tấn Viễn Tưởng: Interstellar (Hố Đen Tử Thần)',
        category: 'Khoa Học Viễn Tưởng',
        startTime: '08:05',
        endTime: '11:00',
        startMinutes: 485,
        durationMinutes: 175,
        badge: 'IMAX 4K',
        quality: '4K IMAX MASTER',
        audio: 'DOLBY ATMOS 7.1',
        rating: 9.8,
        description: 'Kiệt tác của Christopher Nolan về hành trình xuyên không gian tìm kiếm miền đất hứa cho nhân loại.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cn-4',
        title: 'Chuyện Bên Lề Lễ Trao Giải Oscar Lần Thứ 97',
        category: 'Tạp Chí Điện Ảnh',
        startTime: '11:00',
        endTime: '11:20',
        startMinutes: 660,
        durationMinutes: 20,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Những khoảnh khắc xúc động và giải thưởng danh giá nhất tại đêm vinh danh điện ảnh thế giới.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cn-5',
        title: 'Phim Tâm Lý Âm Nhạc: La La Land (Những Kẻ Khờ Mộng Mơ)',
        category: 'Âm Nhạc • Lãng Mạn',
        startTime: '11:20',
        endTime: '13:30',
        startMinutes: 680,
        durationMinutes: 130,
        badge: '6 GIẢI OSCAR',
        quality: '4K HDR',
        audio: 'Dolby Atmos',
        rating: 9.2,
        description: 'Bản tình ca ngọt ngào và đầy day dứt giữa chàng nhạc công piano Sebastian và cô nàng diễn viên Mia tại Los Angeles.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cn-6',
        title: 'Bom Tấn Hoạt Hình: Spider-Man: Into the Spider-Verse',
        category: 'Hoạt Hình • Siêu Anh Hùng',
        startTime: '13:30',
        endTime: '15:30',
        startMinutes: 810,
        durationMinutes: 120,
        quality: '4K UHD',
        audio: 'Dolby 5.1',
        description: 'Miles Morales khám phá khả năng của Người Nhện và sát cánh cùng 5 người nhện đến từ các vũ trụ song song.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cn-7',
        title: 'Phim Hành Động Sát Thủ: John Wick: Chapter 4',
        category: 'Hành Động Gay Cấn',
        startTime: '15:30',
        endTime: '18:25',
        startMinutes: 930,
        durationMinutes: 175,
        badge: 'BẢN CHIẾU RẠP 4K',
        quality: '4K HDR10+',
        audio: 'Dolby Atmos 7.1',
        rating: 9.3,
        description: 'John Wick tìm ra con đường đánh bại Hội Tối Cao, nhưng anh phải đối đầu với một kẻ thù mới đầy quyền lực.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cn-8',
        title: 'Tiêu Điểm Phim Giờ Vàng: Đạo Diễn Denis Villeneuve',
        category: 'Phim Tài Liệu',
        startTime: '18:25',
        endTime: '18:45',
        startMinutes: 1105,
        durationMinutes: 20,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Hành trình sáng tạo thế giới sa mạc Arrakis trong thiên sử thi viễn tưởng Dune.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cn-9',
        title: 'Phim Giờ Vàng: Dune: Part Two (Hành Tinh Cát 2)',
        subtitle: 'Siêu Phẩm Điện Ảnh Chiếu Rạp Đoạt Kỷ Lục Phòng Vé',
        category: 'Khoa Học Viễn Tưởng',
        startTime: '18:45',
        endTime: '21:35',
        startMinutes: 1125,
        durationMinutes: 170,
        badge: 'PREMIERE 4K',
        quality: '4K DOLBY VISION',
        audio: 'DOLBY ATMOS 7.1',
        rating: 9.7,
        description: 'Paul Atreides hợp lực cùng Chani và tộc Fremen để trả thù những kẻ đã hủy diệt gia đình anh.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80',
        features: ['Dolby Vision', 'Dolby Atmos 7.1', 'Phụ Đề Song Ngữ'],
      },
      {
        id: 'cn-10',
        title: 'Bom Tấn Đa Vũ Trụ: Spider-Man: Across the Spider-Verse',
        subtitle: 'Phim Hoạt Hình Đỉnh Cao Nhất Thập Kỷ',
        category: 'Điện Ảnh',
        startTime: '21:35',
        endTime: '23:55',
        startMinutes: 1295,
        durationMinutes: 140,
        badge: 'TOP #1 PHÒNG VÉ',
        quality: '4K UHD HDR',
        audio: 'DOLBY ATMOS',
        rating: 9.6,
        description: 'Miles Morales bị cuốn vào cuộc chiến xuyên không gian giữa các Người Nhện đa vũ trụ.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1635805737707-575885ab0820?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cn-11',
        title: 'Phim Kinh Dị Đêm Muộn: The Conjuring (Ám Ảnh Kinh Hoàng)',
        category: 'Kinh Dị • Tâm Linh',
        startTime: '23:55',
        endTime: '01:50',
        startMinutes: 1435,
        durationMinutes: 115,
        badge: '18+',
        quality: '4K HDR',
        audio: 'Dolby 5.1',
        description: 'Cặp vợ chồng chuyên gia điều tra hiện tượng siêu nhiên Ed và Lorraine Warren giúp đỡ một gia đình bị quỷ ám.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cn-12',
        title: 'Phim Trinh Thám: Cô Gái Mất Tích (Gone Girl)',
        category: 'Tội Phạm • Trinh Thám',
        startTime: '01:50',
        endTime: '04:15',
        startMinutes: 110,
        durationMinutes: 145,
        quality: '1080p FHD',
        audio: 'Dolby Audio',
        description: 'Vụ mất tích đầy bí ẩn của Amy Dunne và bức màn đen tối về cuộc hôn nhân tưởng chừng hoàn hảo.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cn-13',
        title: 'Điện Ảnh Kinh Điển: Bố Già (The Godfather Remastered)',
        category: 'Kinh Điển',
        startTime: '04:15',
        endTime: '06:00',
        startMinutes: 255,
        durationMinutes: 105,
        quality: '4K RESTORED',
        audio: 'Mono HD',
        description: 'Bản phục chế 4K kỷ niệm 50 năm tác phẩm kinh điển về gia tộc Mafia Corleone của đạo diễn Francis Ford Coppola.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?auto=format&fit=crop&w=600&q=80',
      },
    ],
  },

  // ── 03. News 24/7 (Thời Sự Chính Trị & Tin Tức Quốc Tế) ───────────────
  {
    id: 'ch-03',
    slug: 'news',
    chNumber: 'CH #007',
    name: 'News 24/7',
    category: 'news',
    categoryLabel: 'Tin Tức Thời Sự',
    logo: '/Channel_Logos/07-omni-news-icon.svg',
    color: '#3B82F6',
    programs: [
      {
        id: 'nw-1',
        title: 'Chào Ngày Mới & Điểm Báo Buổi Sáng',
        category: 'Thời Sự',
        startTime: '06:00',
        endTime: '06:45',
        startMinutes: 360,
        durationMinutes: 45,
        quality: '1080p60',
        audio: 'Stereo',
        description: 'Cập nhật tin tức thời sự trong nước, quốc tế, điểm các bài báo đáng chú ý và tình hình giao thông đầu ngày.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'nw-2',
        title: 'Dự Báo Thời Tiết & Chất Lượng Không Khí 24H',
        category: 'Thời Tiết',
        startTime: '06:45',
        endTime: '07:00',
        startMinutes: 405,
        durationMinutes: 15,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Bản đồ dự báo thời tiết 3 miền, cảnh báo triều cường và chỉ số bụi mịn AQI tại các thành phố lớn.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1592210454359-9043f067919b?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'nw-3',
        title: 'Tài Chính & Thị Trường Chứng Khoán Phiên Mở Cửa',
        category: 'Kinh Tế',
        startTime: '07:00',
        endTime: '07:45',
        startMinutes: 420,
        durationMinutes: 45,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Nhận định xu hướng VN-Index, biến động giá vàng, dầu thô và tỷ giá ngoại tệ đầu ngày.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'nw-4',
        title: 'Hồ Sơ Toàn Cầu: Khủng Hoảng Năng Lượng Xanh',
        category: 'Phóng Sự',
        startTime: '07:45',
        endTime: '08:35',
        startMinutes: 465,
        durationMinutes: 50,
        quality: '4K UHD',
        audio: 'Dolby 5.1',
        description: 'Phóng sự điều tra về cuộc chạy đua năng lượng tái tạo và tương lai năng lượng hạt nhân thế hệ mới.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'nw-5',
        title: 'Bản Tin 9 Giờ: Tin Tức Nóng Châu Á - Thái Bình Dương',
        category: 'Tin Nóng',
        startTime: '08:35',
        endTime: '09:00',
        startMinutes: 515,
        durationMinutes: 25,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Các sự kiện ngoại giao nổi bật và hiệp định kinh tế khu vực vừa được ký kết.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'nw-6',
        title: 'Kỷ Nguyên Trí Tuệ Nhân Tạo & Chuyển Đổi Số',
        category: 'Công Nghệ',
        startTime: '09:00',
        endTime: '09:50',
        startMinutes: 540,
        durationMinutes: 50,
        quality: '4K UHD',
        audio: 'Stereo',
        description: 'Ứng dụng AI tổng quát trong y tế, giáo dục và bài toán an ninh dữ liệu quốc gia.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'nw-7',
        title: 'Đối Thoại Trực Tiếp: Khởi Nghiệp & Đổi Mới Sáng Tạo',
        category: 'Tọa Đàm',
        startTime: '09:50',
        endTime: '11:30',
        startMinutes: 590,
        durationMinutes: 100,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Gặp gỡ các nhà sáng lập startup công nghệ Việt Nam gọi vốn thành công triệu USD.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'nw-8',
        title: 'Bản Tin Thời Sự Trưa 11h30 (Trực Tiếp)',
        category: 'Thời Sự Chính',
        startTime: '11:30',
        endTime: '12:05',
        startMinutes: 690,
        durationMinutes: 35,
        badge: 'LIVE 11:30',
        quality: '1080p60',
        audio: 'Dolby Audio',
        description: 'Bản tin thời sự tổng hợp buổi trưa với các thông tin nổi bật diễn ra trong sáng nay.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'nw-9',
        title: 'Thế Giới 24 Giờ Qua: Góc Nhìn Phóng Viên Quốc Tế',
        category: 'Quốc Tế',
        startTime: '12:05',
        endTime: '12:50',
        startMinutes: 725,
        durationMinutes: 45,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Phản ánh chân thực từ các cơ quan thường trú tại Washington, London, Tokyo và Bắc Kinh.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'nw-10',
        title: 'Chuyên Đề: Bảo Vệ Môi Trường & Phát Triển Bền Vững',
        category: 'Chuyên Đề',
        startTime: '12:50',
        endTime: '14:10',
        startMinutes: 770,
        durationMinutes: 80,
        quality: '4K UHD',
        audio: 'Dolby 5.1',
        description: 'Giải pháp giảm rác thải nhựa đại dương và chuyển dịch xanh trong ngành công nghiệp sản xuất.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'nw-11',
        title: 'Bản Tin Kinh Tế & Thị Trường Phiên Đóng Cửa',
        category: 'Kinh Tế Chiều',
        startTime: '14:10',
        endTime: '14:45',
        startMinutes: 850,
        durationMinutes: 35,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Tổng kết phiên giao dịch chứng khoán, chỉ số thanh khoản và các cổ phiếu bứt phá trong ngày.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'nw-12',
        title: 'Nhịp Sống Đô Thị & Văn Hóa Đời Sống',
        category: 'Đời Sống',
        startTime: '14:45',
        endTime: '16:00',
        startMinutes: 885,
        durationMinutes: 75,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Nét đẹp văn hóa làng nghề truyền thống và nhịp sống trẻ tại các thành phố năng động.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'nw-13',
        title: 'Phim Tài Liệu Khám Phá: Di Sản Thiên Nhiên Thế Giới',
        category: 'Tài Liệu',
        startTime: '16:00',
        endTime: '17:30',
        startMinutes: 960,
        durationMinutes: 90,
        quality: '4K 60FPS',
        audio: 'Dolby Atmos',
        description: 'Chiêm ngưỡng vẻ đẹp hùng vĩ của Vịnh Hạ Long, Vườn quốc gia Phong Nha - Kẻ Bàng qua ống kính 4K siêu nét.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'nw-14',
        title: 'Bản Tin Chiều: Tin Tức 17h30',
        category: 'Tin Nhanh',
        startTime: '17:30',
        endTime: '18:15',
        startMinutes: 1050,
        durationMinutes: 45,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Tóm lược các sự kiện xã hội, an ninh trật tự và tình hình giao thông giờ cao điểm tan tầm.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'nw-15',
        title: 'Toàn Cảnh Hội Nghị Cấp Cao: Phát Huy Sức Mạnh Tham Mưu Chiến Lược',
        category: 'Chính Trị Trọng Điểm',
        startTime: '18:15',
        endTime: '19:00',
        startMinutes: 1095,
        durationMinutes: 45,
        badge: 'ĐẶC BIỆT',
        quality: '4K UHD',
        audio: 'Dolby Audio',
        description: 'Phát biểu chỉ đạo quan trọng của các đồng chí lãnh đạo Đảng và Nhà nước tại hội nghị toàn quốc.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'nw-16',
        title: 'Bản Tin Thời Sự 19 Giờ (Trực Tiếp Toàn Quốc)',
        subtitle: 'Bản Tin Quan Trọng Nhất Trong Ngày',
        category: 'Thời Sự Quốc Gia',
        startTime: '19:00',
        endTime: '19:45',
        startMinutes: 1140,
        durationMinutes: 45,
        badge: 'TRỰC TIẾP 19:00',
        quality: '1080p60 HD',
        audio: 'Dolby Digital',
        rating: 9.9,
        description: 'Chương trình Thời sự trọng điểm phản ánh các hoạt động lãnh đạo của Đảng, Nhà nước và đời sống chính trị - kinh tế toàn quốc.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=600&q=80',
        features: ['Phát Sóng Toàn Quốc', 'Phụ Đề Khiếm Thính'],
      },
      {
        id: 'nw-17',
        title: 'Tiêu Điểm Kinh Tế: Tăng Trưởng GDP & Cơ Hội Thu Hút Vốn FDI',
        category: 'Phân Tích',
        startTime: '19:45',
        endTime: '20:30',
        startMinutes: 1185,
        durationMinutes: 45,
        quality: '4K UHD',
        audio: 'Stereo',
        description: 'Phân tích các động lực thúc đẩy kinh tế số và làn sóng đầu tư vào ngành bán dẫn tại Việt Nam.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'nw-18',
        title: 'Hồ Sơ Vụ Án: Phóng Sự Điều Tra Chuyên Đề',
        category: 'Pháp Luật',
        startTime: '20:30',
        endTime: '21:20',
        startMinutes: 1230,
        durationMinutes: 50,
        badge: 'ĐIỀU TRA',
        quality: '1080p',
        audio: 'Stereo',
        description: 'Các vụ án công nghệ cao xuyên quốc gia và bài học cảnh giác cho người dân trên không gian mạng.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'nw-19',
        title: 'Thế Giới Nghiêng: Bình Luận & Phân Tích Địa Chính Trị',
        category: 'Quốc Tế',
        startTime: '21:20',
        endTime: '22:15',
        startMinutes: 1280,
        durationMinutes: 55,
        quality: '4K UHD',
        audio: 'Dolby 5.1',
        description: 'Góc nhìn đa chiều về các điểm nóng xung đột quân sự và đàm phán hòa bình trên bàn cờ ngoại giao quốc tế.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'nw-20',
        title: 'Bản Tin Thời Sự Cuối Ngày: Tin Nhanh 22h30',
        category: 'Thời Sự Đêm',
        startTime: '22:15',
        endTime: '23:00',
        startMinutes: 1335,
        durationMinutes: 45,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Tổng kết bức tranh toàn cảnh 24 giờ qua và các tin vắn nổi bật trước giờ chuyển giao ngày mới.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'nw-21',
        title: 'Chuyên Đề Đêm: Những Phát Minh Làm Thay Đổi Thế Giới',
        category: 'Khoa Học',
        startTime: '23:00',
        endTime: '00:30',
        startMinutes: 1380,
        durationMinutes: 90,
        quality: '4K UHD',
        audio: 'Dolby Atmos',
        description: 'Hành trình từ động cơ hơi nước, máy tính lượng tử đến kỷ nguyên thám hiểm Sao Hỏa.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'nw-22',
        title: 'Chương Trình Đêm Khuya: Không Gian Âm Nhạc & Thư Giãn',
        category: 'Nghệ Thuật',
        startTime: '00:30',
        endTime: '06:00',
        startMinutes: 30,
        durationMinutes: 330,
        quality: '1080p',
        audio: 'Stereo HQ',
        description: 'Giai điệu hòa tấu không lời êm dịu đồng hành cùng thính giả qua đêm muộn.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
      },
    ],
  },

  // ── 04. Omni Esports (Đấu Trường Thể Thao Điện Tử) ─────────────────────
  {
    id: 'ch-04',
    slug: 'esports',
    chNumber: 'CH #013',
    name: 'Omni Esports',
    category: 'esports',
    categoryLabel: 'Esports & Gaming',
    logo: '/Channel_Logos/13-omni-esports-icon.svg',
    color: '#DC2626',
    programs: [
      {
        id: 'es-1',
        title: 'Bản Tin Esports Sáng: Điểm Tin Giải Đấu',
        category: 'Tin Tức Game',
        startTime: '06:00',
        endTime: '06:40',
        startMinutes: 360,
        durationMinutes: 40,
        quality: '1080p60',
        audio: 'Stereo',
        description: 'Kết quả giải đấu LCK, LPL và bảng xếp hạng đội tuyển thế giới.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'es-2',
        title: 'Top 10 Pha Xử Lý Xuất Thần Tuần Này',
        category: 'Highlight',
        startTime: '06:40',
        endTime: '07:15',
        startMinutes: 400,
        durationMinutes: 35,
        badge: 'HIGHLIGHT',
        quality: '4K UHD',
        audio: 'Dolby 5.1',
        description: 'Những pha Outplay ảo diệu của Faker, Chovy, Gumayusi và Canyon.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'es-3',
        title: 'Xem Lại Trận Đấu: T1 vs Dplus KIA (Bo5)',
        category: 'Trận Đinh',
        startTime: '07:15',
        endTime: '10:30',
        startMinutes: 435,
        durationMinutes: 195,
        badge: 'CATCH-UP',
        quality: '1080p60',
        audio: 'Stereo',
        description: 'Trận bán kết kịch tính nghẹt thở kéo dài đủ 5 ván đấu.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'es-4',
        title: 'Phân Tích Chiến Thuật Cấm Chọn & Meta Bản Cập Nhật',
        category: 'Phân Tích',
        startTime: '10:30',
        endTime: '11:15',
        startMinutes: 630,
        durationMinutes: 45,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Chi tiết thay đổi thông số tướng và cách vận hành lối chơi mùa giải mới.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'es-5',
        title: 'Giải Đấu CS2 Major: Vòng Tứ Kết',
        category: 'Bắn Súng CS2',
        startTime: '11:15',
        endTime: '13:45',
        startMinutes: 675,
        durationMinutes: 150,
        quality: '4K 60FPS',
        audio: 'Dolby Audio',
        description: 'Màn đọ súng căng thẳng giữa Natus Vincere và FaZe Clan trên Map Mirage.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'es-6',
        title: 'Valorant Champions Tour: Trận Chung Kết Nhánh Thua',
        category: 'Valorant',
        startTime: '13:45',
        endTime: '16:30',
        startMinutes: 825,
        durationMinutes: 165,
        quality: '4K UHD',
        audio: 'Dolby 5.1',
        description: 'Cuộc chiến giành tấm vé cuối cùng vào chơi trận chung kết tổng thế giới.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'es-7',
        title: 'Tọa Đàm Tiền Trận: Chung Kết CKTG 2025',
        category: 'Tiền Trận',
        startTime: '16:30',
        endTime: '17:30',
        startMinutes: 990,
        durationMinutes: 60,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Dàn bình luận viên và phân tích viên dự đoán tỷ số trận đại chiến T1 vs Gen.G.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'es-8',
        title: 'Trực Tiếp Chung Kết CKTG LMHT: T1 vs Gen.G',
        subtitle: 'Trận Bo5 Kinh Điển Tranh Cúp Vô Địch Thế Giới',
        category: 'Trực Tiếp Đỉnh Cao',
        startTime: '17:30',
        endTime: '21:45',
        startMinutes: 1050,
        durationMinutes: 255,
        badge: 'TRỰC TIẾP BO5',
        quality: '4K UHD 60FPS',
        audio: 'DOLBY AUDIO',
        rating: 9.9,
        description: 'Faker và T1 bước vào trận đại chiến lịch sử trước đại kình địch Gen.G. Tường thuật trực tiếp với phân tích Tactical AI.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
        features: ['Tactical Cam', 'Player POV', 'Bình Luận Đa Luồng'],
      },
      {
        id: 'es-9',
        title: 'Lễ Trao Cúp & Phỏng Vấn Nhà Vô Địch Thế Giới',
        category: 'Lễ Đăng Quang',
        startTime: '21:45',
        endTime: '22:45',
        startMinutes: 1305,
        durationMinutes: 60,
        quality: '4K UHD',
        audio: 'Dolby 5.1',
        description: 'Khoảnh khắc nâng cao chiếc cúp Summoner danh giá và phỏng vấn danh hiệu MVP trận đấu.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'es-10',
        title: 'Highlight Trọn Bộ 5 Ván Đấu Chung Kết',
        category: 'Highlight',
        startTime: '22:45',
        endTime: '01:00',
        startMinutes: 1365,
        durationMinutes: 135,
        quality: '1080p60',
        audio: 'Stereo',
        description: 'Xem lại các pha Combat nảy lửa, Baron lật kèo và những tình huống tỏa sáng cá nhân xuất sắc.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'es-11',
        title: 'Phát Lại Các Trận Cầu Kinh Điển Mùa Giải Trước',
        category: 'Phát Lại',
        startTime: '01:00',
        endTime: '06:00',
        startMinutes: 60,
        durationMinutes: 300,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Trọn bộ các trận chung kết quốc tế huyền thoại trong lịch sử thể thao điện tử.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=600&q=80',
      },
    ],
  },

  // ── 05. Omni Discovery (Thế Giới Thiên Nhiên & Khoa Học BBC) ──────────
  {
    id: 'ch-05',
    slug: 'discovery',
    chNumber: 'CH #012',
    name: 'Omni Discovery',
    category: 'discovery',
    categoryLabel: 'Khoa Học & Khám Phá',
    logo: '/Channel_Logos/12-omni-discovery-icon.svg',
    color: '#14B8A6',
    programs: [
      {
        id: 'dc-1',
        title: 'Bình Minh Trên Đảo Galapagos: Kỳ Quan Động Vật',
        category: 'Thiên Nhiên',
        startTime: '06:00',
        endTime: '07:10',
        startMinutes: 360,
        durationMinutes: 70,
        quality: '4K UHD',
        audio: 'Dolby 5.1',
        description: 'Hành trình khám phá hệ sinh thái độc nhất vô nhị nơi loài rùa khổng lồ và cự đà biển sinh sống.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'dc-2',
        title: 'Bí Mật Rạn San Hô Great Barrier Dưới Lòng Biển',
        category: 'Đại Dương',
        startTime: '07:10',
        endTime: '08:30',
        startMinutes: 430,
        durationMinutes: 80,
        quality: '4K 60FPS',
        audio: 'Dolby Atmos',
        description: 'Hệ thống rạn san hô lớn nhất hành tinh cùng những sinh vật biển kỳ lạ dưới đại dương sâu thẳm.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'dc-3',
        title: 'Hành Trình Chinh Phục Đỉnh Everest: Giới Hạn Sinh Tồn',
        category: 'Thám Hiểm',
        startTime: '08:30',
        endTime: '10:00',
        startMinutes: 510,
        durationMinutes: 90,
        quality: '4K UHD',
        audio: 'Dolby Audio',
        description: 'Câu chuyện phi thường của các nhà leo núi vượt qua vùng tử địa ở độ cao trên 8.000m.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'dc-4',
        title: 'Bí Ẩn Kim Tự Tháp & Nền Văn Minh Ai Cập Cổ Đại',
        category: 'Lịch Sử',
        startTime: '10:00',
        endTime: '11:15',
        startMinutes: 600,
        durationMinutes: 75,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Những phát hiện khảo cổ chấn động bằng công nghệ quét Lidar xuyên lòng đất.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1503177119275-0aa32b3a9368?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'dc-5',
        title: 'Vũ Trụ Vô Tận: Sự Hình Thành Của Các Vì Sao',
        category: 'Thiên Văn',
        startTime: '11:15',
        endTime: '12:45',
        startMinutes: 675,
        durationMinutes: 90,
        badge: 'BBC EARTH',
        quality: '4K HDR',
        audio: 'Dolby Atmos',
        rating: 9.8,
        description: 'Những hình ảnh ngoạn mục nhất từ kính thiên văn không gian James Webb hé lộ khoảnh khắc khởi nguyên của vũ trụ.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'dc-6',
        title: 'Động Vật Hoang Dã Châu Phi: Cuộc Đại Di Cư Serengeti',
        category: 'Hoang Dã',
        startTime: '12:45',
        endTime: '14:20',
        startMinutes: 765,
        durationMinutes: 95,
        quality: '4K UHD',
        audio: 'Dolby 5.1',
        description: 'Hàng triệu linh dương đầu bò vượt qua dòng sông Mara đầy cá sấu săn mồi để tìm kiếm nguồn cỏ non.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1516426122078-c23e76319801?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'dc-7',
        title: 'Rừng Mưa Amazon: Lá Phổi Xanh Đang Kêu Cứu',
        category: 'Môi Trường',
        startTime: '14:20',
        endTime: '16:00',
        startMinutes: 860,
        durationMinutes: 100,
        quality: '4K 60FPS',
        audio: 'Dolby Atmos',
        description: 'Độ đa dạng sinh học kỳ vĩ của lưu vực sông Amazon và những thách thức bảo tồn trước biến đổi khí hậu.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'dc-8',
        title: 'Khoa Học Chế Tạo: Bí Mật Tàu Ngầm Hạt Nhân Siêu Hiện Đại',
        category: 'Kỹ Thuật',
        startTime: '16:00',
        endTime: '17:30',
        startMinutes: 960,
        durationMinutes: 90,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Tìm hiểu quy trình cơ khí chính xác và công nghệ tàng hình âm học dưới lòng biển sâu.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'dc-9',
        title: 'Khung Giờ Vàng: Planet Earth III (Hành Tinh Trái Đất 3)',
        subtitle: 'Kiệt Tác Tài Liệu Thiên Nhiên Của Ngài David Attenborough',
        category: 'Tài Liệu Độc Quyền',
        startTime: '17:30',
        endTime: '19:45',
        startMinutes: 1050,
        durationMinutes: 135,
        badge: 'PREMIERE BBC',
        quality: '4K 60FPS HDR',
        audio: 'DOLBY ATMOS 7.1',
        rating: 9.9,
        description: 'Ghi lại những hành vi sinh tồn chưa từng thấy của các loài động vật quý hiếm trên khắp 7 châu lục.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80',
        features: ['Thuyết Minh Tiếng Việt', 'Dolby Atmos', '4K UHD HDR'],
      },
      {
        id: 'dc-10',
        title: 'Bắc Cực Băng Giá: Vương Quốc Của Gấu Trắng',
        category: 'Băng Giá',
        startTime: '19:45',
        endTime: '21:15',
        startMinutes: 1185,
        durationMinutes: 90,
        quality: '4K UHD',
        audio: 'Dolby 5.1',
        description: 'Cuộc chiến sinh tồn khắc nghiệt giữa biển băng tuyết trắng xoá trong mùa đông địa cực.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1517824806704-9040b037703b?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'dc-11',
        title: 'Núi Lửa & Những Cơn Thịnh Nộ Của Trái Đất',
        category: 'Địa Chất',
        startTime: '21:15',
        endTime: '22:45',
        startMinutes: 1275,
        durationMinutes: 90,
        badge: 'DISCOVERY SPECIAL',
        quality: '4K UHD',
        audio: 'Dolby Atmos',
        description: 'Những đợt phun trào dung nham đỏ rực tại Iceland và Hawaii qua máy bay không người lái chuyên dụng.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'dc-12',
        title: 'Khám Phá Hang Động Sơn Đoòng: Kỳ Quan Lòng Đất Việt Nam',
        category: 'Việt Nam Hùng Vĩ',
        startTime: '22:45',
        endTime: '00:30',
        startMinutes: 1365,
        durationMinutes: 105,
        quality: '4K 60FPS',
        audio: 'Dolby 5.1',
        description: 'Hang động tự nhiên lớn nhất thế giới với rừng nguyên sinh và hệ thống thời tiết riêng biệt bên trong hang.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'dc-13',
        title: 'Tài Liệu Đêm Muộn: Hành Tinh Hoang Dã',
        category: 'Thiên Nhiên Đêm',
        startTime: '00:30',
        endTime: '06:00',
        startMinutes: 30,
        durationMinutes: 330,
        quality: '1080p',
        audio: 'Stereo',
        description: 'Tổng hợp các thước phim tài liệu thiên nhiên thư giãn cùng âm thanh tự nhiên của rừng già và sóng biển.',
        thumbnailUrl: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80',
      },
    ],
  },
];

export function EPGGrid() {
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeChannelId, setActiveChannelId] = useState<string>('ch-01');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'timeline' | 'schedule_list'>('timeline');
  const [selectedProgram, setSelectedProgram] = useState<RealEpgProgram | null>(null);
  const [reminderToast, setReminderToast] = useState<string | null>(null);

  // Compute wall-clock target date from selected offset
  const selectedDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + selectedDayOffset);
    return d;
  }, [selectedDayOffset]);

  // Dynamic API queries
  const { data: epgResponse, isLoading: isEpgLoading } = useEpgDay(selectedDate);
  const { data: channelsResponse } = useChannels({ limit: 100, isActive: true });

  const rawChannels = useMemo(() => {
    if (!channelsResponse) return [];
    if (Array.isArray(channelsResponse)) return channelsResponse;
    return (channelsResponse as any)?.data ?? [];
  }, [channelsResponse]);

  const channelMetaMap = useMemo(() => {
    const map = new Map<string, any>();
    rawChannels.forEach((ch: any) => {
      if (ch.id) map.set(ch.id, ch);
      if (ch.slug) map.set(ch.slug, ch);
    });
    return map;
  }, [rawChannels]);

  // Current real time marker (e.g. 19:15 = 1155 minutes)
  const [currentTimeMinutes, setCurrentTimeMinutes] = useState<number>(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTimeMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // 7-Day Date Carousel List (Hôm qua, Hôm nay, Ngày mai...)
  const SEVEN_DAYS = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(today);
      d.setDate(today.getDate() + offset);
      const isToday = offset === 0;
      const dayName = isToday
        ? 'Hôm Nay'
        : offset === -1
        ? 'Hôm Qua'
        : offset === 1
        ? 'Ngày Mai'
        : `Thứ ${d.getDay() === 0 ? 'CN' : d.getDay() + 1}`;
      const dateFormatted = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      days.push({ offset, isToday, dayName, dateFormatted });
    }
    return days;
  }, []);

  // Combine API data or rotated 25-channel fallback
  const allChannels = useMemo<RealEpgChannel[]>(() => {
    if (epgResponse?.channels && epgResponse.channels.length > 0) {
      return mapApiEpgToRealChannels(epgResponse, rawChannels);
    }
    return buildFallbackChannels(selectedDayOffset, channelMetaMap);
  }, [epgResponse, rawChannels, selectedDayOffset, channelMetaMap]);

  // Filter channels by category
  const filteredChannels = useMemo(() => {
    let list = allChannels;
    if (selectedCategory !== 'ALL') {
      list = list.filter((ch) => ch.category === selectedCategory);
    }
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      list = list.map((ch) => ({
        ...ch,
        programs: ch.programs.filter(
          (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
        ),
      })).filter((ch) => ch.programs.length > 0);
    }
    return list;
  }, [allChannels, selectedCategory, searchQuery]);

  const activeChannel = useMemo(() => {
    return filteredChannels.find((ch) => ch.id === activeChannelId || ch.slug === activeChannelId) || filteredChannels[0] || allChannels[0] || REAL_WORLD_CHANNELS_EPG[0];
  }, [filteredChannels, activeChannelId, allChannels]);

  // Set reminder handler with cyber toast
  const handleSetReminder = (prog: RealEpgProgram) => {
    setReminderToast(`Đã đặt lịch nhắc nhở: "${prog.title}" lúc ${prog.startTime}`);
    setTimeout(() => setReminderToast(null), 4000);
  };

  // Helper to determine program status
  const getProgramStatus = (prog: RealEpgProgram) => {
    if (selectedDayOffset < 0) return 'catchup';
    if (selectedDayOffset > 0) return 'upcoming';
    // Today
    const endMinutes = prog.startMinutes + prog.durationMinutes;
    if (currentTimeMinutes >= prog.startMinutes && currentTimeMinutes < endMinutes) {
      return 'live';
    }
    if (currentTimeMinutes >= endMinutes) {
      return 'catchup';
    }
    return 'upcoming';
  };

  return (
    <div className="w-full space-y-6 text-slate-100">
      
      {/* ── 1. Top EPG Header & 7-Day Date Carousel Bar ─────────────── */}
      <div className="p-5 md:p-6 rounded-3xl bg-[#090f1a] border border-[#16253c] shadow-2xl space-y-5">
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-[#142236] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f2fe]" />
              <span className="text-[11px] font-black uppercase tracking-widest text-cyan-400 font-mono flex items-center gap-1.5">
                REALTIME ELECTRONIC PROGRAMME GUIDE • {allChannels.length} CHANNELS
                {isEpgLoading && <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />}
              </span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Calendar className="w-6 h-6 text-cyan-400" />
              Lịch Phát Sóng Truyền Hình & Xem Lại 7 Ngày
            </h1>
          </div>

          {/* View Mode Toggle: Timeline Grid vs Detailed Linear Schedule */}
          <div className="flex items-center gap-2 bg-[#060a12] p-1.5 rounded-2xl border border-[#18283e]">
            <button
              onClick={() => setViewMode('timeline')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                viewMode === 'timeline'
                  ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Clock className="w-3.5 h-3.5" />
              Lưới Timeline 24H
            </button>

            <button
              onClick={() => setViewMode('schedule_list')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                viewMode === 'schedule_list'
                  ? 'bg-cyan-500 text-black shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              <Layers className="w-3.5 h-3.5" />
              Lịch Theo Kênh
            </button>
          </div>
        </div>

        {/* 7-Day Date Carousel Tabs */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto scrollbar-none py-1">
          <div className="flex items-center gap-2 min-w-max">
            {SEVEN_DAYS.map((day) => {
              const isSelected = selectedDayOffset === day.offset;
              return (
                <button
                  key={day.offset}
                  onClick={() => setSelectedDayOffset(day.offset)}
                  className={cn(
                    'flex flex-col items-center px-4 py-2.5 rounded-2xl border text-center transition-all cursor-pointer min-w-[100px]',
                    isSelected
                      ? 'bg-gradient-to-b from-cyan-950/80 to-[#0e1a2b] border-cyan-400 text-cyan-200 shadow-[0_0_15px_rgba(0,242,254,0.3)] scale-102'
                      : 'bg-[#0d1624] hover:bg-[#132034] border-[#18273c] text-slate-300'
                  )}
                >
                  <span className={cn('text-xs font-black tracking-wide', isSelected ? 'text-cyan-400' : 'text-slate-200')}>
                    {day.dayName}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 mt-0.5">
                    {day.dateFormatted}
                  </span>
                  {day.isToday && (
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>

          {selectedDayOffset !== 0 && (
            <button
              onClick={() => setSelectedDayOffset(0)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-cyan-300 text-xs font-bold hover:bg-cyan-900/60 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
              Về Hôm Nay
            </button>
          )}
        </div>

        {/* Category Filters & Quick Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
          
          {/* Category Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORY_FILTERS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                  selectedCategory === cat.id
                    ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,242,254,0.4)]'
                    : 'bg-[#0d1624] hover:bg-[#132034] text-slate-300 border border-[#1b2b42]'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Quick Search */}
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm chương trình, trận đấu..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#0c1421] border border-[#1b2b42] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
            />
          </div>
        </div>

      </div>

      {/* ── 2. VIEW MODE 1: CONTINUOUS 24-HOUR TIMELINE GRID ────────── */}
      {viewMode === 'timeline' && (
        <div className="p-4 md:p-6 rounded-3xl bg-[#090f1a] border border-[#16253c] shadow-2xl space-y-4 overflow-hidden">
          
          <div className="flex items-center justify-between text-xs text-slate-400 border-b border-[#142236] pb-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="font-bold text-white">Trực Quan Thời Lượng Thực:</span>
              <span>Độ rộng thẻ tự động co giãn theo số phút thực tế (15p, 30p, 45p, 90p, 150p...)</span>
            </div>
            <div className="hidden sm:flex items-center gap-4 text-[11px] font-mono">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Đang Chiếu</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Xem Lại (Catch-Up)</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-500" /> Sắp Chiếu</span>
            </div>
          </div>

          {/* Timeline Scrollable Grid Container */}
          <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-cyan-500/20 pb-4">
            <div className="min-w-[1400px] space-y-3">
              
              {filteredChannels.map((ch) => (
                <div key={ch.id} className="flex items-stretch gap-3 group/row">
                  
                  {/* Channel Header (Sticky Left) */}
                  <Link
                    href={`/channels/${ch.slug}`}
                    className="flex-shrink-0 w-44 md:w-52 p-3 rounded-2xl bg-[#0b1320] border border-[#18283e] hover:border-cyan-400/60 flex items-center gap-3 transition-colors shadow-lg"
                  >
                    <ChannelLogo slug={ch.slug} name={ch.name} size="md" />
                    <div className="overflow-hidden">
                      <div className="text-xs font-black text-white truncate group-hover/row:text-cyan-300">
                        {ch.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {ch.chNumber} • {ch.categoryLabel}
                      </div>
                    </div>
                  </Link>

                  {/* Flexible Programs Flow with Natural Durations */}
                  <div className="flex-1 flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
                    {ch.programs.map((prog) => {
                      const status = getProgramStatus(prog);
                      const isLive = status === 'live';
                      const isCatchUp = status === 'catchup';

                      // Width proportional to realistic duration: min 140px, max 380px
                      const cardWidth = Math.max(140, Math.min(380, prog.durationMinutes * 2.2));

                      return (
                        <div
                          key={prog.id}
                          style={{ width: `${cardWidth}px` }}
                          onClick={() => setSelectedProgram({ ...prog, channelSlug: ch.slug, channelName: ch.name })}
                          className={cn(
                            'flex-shrink-0 h-24 p-3 rounded-2xl border transition-all duration-200 flex flex-col justify-between cursor-pointer relative group/prog overflow-hidden',
                            isLive
                              ? 'bg-gradient-to-r from-red-950/60 to-[#120a14] border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.25)] ring-1 ring-red-500/50'
                              : isCatchUp
                              ? 'bg-[#0d1624] hover:bg-[#132034] border-[#18273c] hover:border-cyan-400/60'
                              : 'bg-[#080d17] hover:bg-[#0e1624] border-[#142032] opacity-85 hover:opacity-100'
                          )}
                        >
                          {/* Top Badges */}
                          <div className="flex items-center justify-between gap-1 z-10">
                            <span className="text-[10px] font-mono font-bold text-slate-300">
                              {prog.startTime} - {prog.endTime}
                            </span>
                            {isLive ? (
                              <span className="flex items-center gap-1 text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-red-600 text-white animate-pulse">
                                LIVE
                              </span>
                            ) : prog.badge ? (
                              <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                                {prog.badge}
                              </span>
                            ) : (
                              <span className="text-[9px] font-mono text-slate-500">
                                {prog.durationMinutes}p
                              </span>
                            )}
                          </div>

                          {/* Title */}
                          <div className="z-10">
                            <h4 className="text-xs font-bold text-white line-clamp-1 group-hover/prog:text-cyan-300 transition-colors">
                              {prog.title}
                            </h4>
                            <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                              {prog.category} {prog.quality ? `• ${prog.quality}` : ''}
                            </div>
                          </div>

                          {/* Hover Play / Catchup Icon */}
                          <div className="absolute right-2 bottom-2 z-10 opacity-0 group-hover/prog:opacity-100 transition-opacity">
                            {isLive || isCatchUp ? (
                              <div className="w-6 h-6 rounded-full bg-cyan-500 text-black flex items-center justify-center shadow-[0_0_8px_#00f2fe]">
                                <Play className="w-3 h-3 fill-current ml-0.5" />
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetReminder(prog);
                                }}
                                className="w-6 h-6 rounded-full bg-[#18283e] hover:bg-cyan-500 hover:text-black text-slate-300 flex items-center justify-center transition-colors"
                                title="Đặt lịch nhắc nhở"
                              >
                                <Bell className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              ))}

            </div>
          </div>

        </div>
      )}

      {/* ── 3. VIEW MODE 2: DETAILED CHANNEL LINEAR SCHEDULE (THEO KHUNG GIỜ) */}
      {viewMode === 'schedule_list' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Channel Selector Sidebar (3 cols) */}
          <aside className="lg:col-span-3 space-y-3">
            <div className="p-4 rounded-3xl bg-[#090f1a] border border-[#16253c] shadow-xl space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider text-cyan-400 font-mono flex items-center gap-2">
                <Tv className="w-4 h-4" />
                CHỌN KÊNH TRUYỀN HÌNH
              </h3>
              
              <div className="space-y-1.5 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/20 pr-1">
                {filteredChannels.map((ch) => {
                  const isCurrent = ch.id === activeChannel.id;
                  return (
                    <button
                      key={ch.id}
                      onClick={() => setActiveChannelId(ch.id)}
                      className={cn(
                        'w-full p-2.5 rounded-2xl border text-left flex items-center gap-3 transition-all cursor-pointer group',
                        isCurrent
                          ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(0,242,254,0.25)]'
                          : 'bg-[#0d1624] hover:bg-[#132034] border-[#18273c]'
                      )}
                    >
                      <ChannelLogo slug={ch.slug} name={ch.name} size="sm" />
                      <div className="overflow-hidden flex-1">
                        <div className="text-xs font-black text-white group-hover:text-cyan-300 truncate">
                          {ch.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate">
                          {ch.programs.length} chương trình hôm nay
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Chronological Daily Timeline Program Cards (9 cols) */}
          <main className="lg:col-span-9 space-y-4">
            
            {/* Active Channel Header Card */}
            <div className="p-5 rounded-3xl bg-[#090f1a] border border-[#16253c] shadow-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <ChannelLogo slug={activeChannel.slug} name={activeChannel.name} size="lg" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white">{activeChannel.name}</h2>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-400 border border-cyan-800">
                      {activeChannel.chNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Thể loại: {activeChannel.categoryLabel} • Hỗ trợ độ phân giải 4K HDR & âm thanh Dolby Atmos
                  </p>
                </div>
              </div>

              <Link
                href={`/channels/${activeChannel.slug}`}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-black flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,242,254,0.3)] transition-transform hover:scale-105"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Xem Kênh Trực Tiếp
              </Link>
            </div>

            {/* Program Timeline Items */}
            <div className="space-y-3">
              {activeChannel.programs.map((prog) => {
                const status = getProgramStatus(prog);
                const isLive = status === 'live';
                const isCatchUp = status === 'catchup';

                return (
                  <div
                    key={prog.id}
                    onClick={() => setSelectedProgram({ ...prog, channelSlug: activeChannel.slug, channelName: activeChannel.name })}
                    className={cn(
                      'p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer group',
                      isLive
                        ? 'bg-gradient-to-r from-red-950/60 via-[#101927] to-[#0a101b] border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.25)] ring-1 ring-red-500/50'
                        : 'bg-[#0a111d] hover:bg-[#111c2e] border-[#16253c] hover:border-cyan-500/40'
                    )}
                  >
                    <div className="flex items-start sm:items-center gap-4 flex-1">
                      
                      {/* Time Block */}
                      <div className="w-24 text-left sm:text-center flex-shrink-0">
                        <div className={cn('text-sm font-black font-mono', isLive ? 'text-red-400' : 'text-cyan-400')}>
                          {prog.startTime}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {prog.endTime} ({prog.durationMinutes}p)
                        </div>
                      </div>

                      {/* Thumbnail */}
                      <div className="relative w-20 h-14 rounded-xl overflow-hidden bg-black flex-shrink-0 hidden sm:block">
                        <Image
                          src={prog.thumbnailUrl}
                          alt={prog.title}
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      </div>

                      {/* Info */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {isLive && (
                            <span className="flex items-center gap-1 px-2 py-0.2 rounded text-[9px] font-black uppercase bg-red-600 text-white animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-white" /> ĐANG PHÁT
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-cyan-300 uppercase">
                            {prog.category}
                          </span>
                          {prog.quality && (
                            <span className="text-[9px] font-mono text-slate-400 bg-black/50 px-1.5 py-0.2 rounded">
                              {prog.quality}
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                          {prog.title}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-1">
                          {prog.description}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2.5 self-end sm:self-center flex-shrink-0">
                      {isLive ? (
                        <Link
                          href={`/channels/${activeChannel.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black flex items-center gap-1.5 shadow-[0_0_12px_rgba(239,68,68,0.5)] transition-transform hover:scale-105"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Xem Ngay
                        </Link>
                      ) : isCatchUp ? (
                        <Link
                          href={prog.sourceRecordingId ? `/programs/recording/${prog.sourceRecordingId}` : `/channels/${activeChannel.slug}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-3.5 py-2 rounded-xl bg-[#121f33] hover:bg-cyan-500 hover:text-black border border-cyan-500/40 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Xem Lại
                        </Link>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetReminder(prog);
                          }}
                          className="px-3 py-2 rounded-xl bg-[#101b2a] hover:bg-[#18283e] border border-[#1a2d44] text-slate-300 hover:text-cyan-400 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          Nhắc Nhở
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </main>
        </div>
      )}

      {/* ── 4. PROGRAM DETAIL CYBER DRAWER / MODAL ───────────────────── */}
      {selectedProgram && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl rounded-3xl bg-[#09111e] border border-[#1b2f4a] p-6 shadow-2xl relative space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#162338]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-cyan-400 font-mono">
                  THÔNG TIN CHƯƠNG TRÌNH PHÁT SÓNG
                </span>
              </div>
              <button
                onClick={() => setSelectedProgram(null)}
                className="p-1.5 rounded-lg bg-[#101b2a] hover:bg-[#18283e] text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Poster / Backdrop */}
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-black">
              <Image
                src={selectedProgram.thumbnailUrl}
                alt={selectedProgram.title}
                fill
                unoptimized
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                <span className="text-xs font-black uppercase text-cyan-300 bg-black/70 px-2.5 py-1 rounded-md border border-cyan-500/40">
                  {selectedProgram.category}
                </span>
                <span className="text-xs font-mono font-bold text-white bg-black/70 px-2.5 py-1 rounded-md">
                  {selectedProgram.startTime} - {selectedProgram.endTime} ({selectedProgram.durationMinutes} phút)
                </span>
              </div>
            </div>

            {/* Details Content */}
            <div className="space-y-2">
              <h3 className="text-lg font-black text-white">
                {selectedProgram.title}
              </h3>
              {selectedProgram.subtitle && (
                <p className="text-xs font-semibold text-cyan-400">
                  {selectedProgram.subtitle}
                </p>
              )}
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedProgram.description}
              </p>
            </div>

            {/* Audio / Quality Features */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#142135]">
              {selectedProgram.quality && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#121f33] text-cyan-300 border border-cyan-800">
                  {selectedProgram.quality}
                </span>
              )}
              {selectedProgram.audio && (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#121f33] text-amber-400 border border-amber-800">
                  {selectedProgram.audio}
                </span>
              )}
              {selectedProgram.features?.map((f, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-mono bg-black/60 text-slate-400 border border-slate-700">
                  {f}
                </span>
              ))}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Link
                href={`/channels/${selectedProgram.channelSlug || activeChannel.slug}`}
                onClick={() => setSelectedProgram(null)}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,242,254,0.4)]"
              >
                <Play className="w-4 h-4 fill-current" />
                Mở Luồng Kênh Trực Tiếp
              </Link>
              {selectedProgram.sourceRecordingId ? (
                <Link
                  href={`/programs/recording/${selectedProgram.sourceRecordingId}`}
                  onClick={() => setSelectedProgram(null)}
                  className="px-4 py-3 rounded-xl bg-[#121f33] hover:bg-[#1a2b45] text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Xem Bản Ghi VOD
                </Link>
              ) : (
                <button
                  onClick={() => {
                    handleSetReminder(selectedProgram);
                    setSelectedProgram(null);
                  }}
                  className="px-4 py-3 rounded-xl bg-[#121f33] hover:bg-[#1a2b45] text-cyan-300 text-xs font-bold border border-cyan-500/30 flex items-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  Đặt Nhắc Nhở
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── 5. CYBER TOAST NOTIFICATION ─────────────────────────────── */}
      {reminderToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-[#09121f] border border-cyan-400 text-cyan-200 text-xs font-bold shadow-[0_0_25px_rgba(0,242,254,0.4)] flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-4 h-4 text-cyan-400" />
          <span>{reminderToast}</span>
        </div>
      )}

    </div>
  );
}