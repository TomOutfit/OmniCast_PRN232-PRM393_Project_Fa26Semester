'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Star,
  Search,
  Calendar,
  RotateCcw,
  Sparkles,
  Download,
  Info,
  Radio,
  Tv,
  ChevronRight,
  ChevronLeft,
  Clock,
  Volume2,
  Video,
  Play,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEpgDay } from '@/lib/hooks/usePrograms';
import { useChannels } from '@/lib/hooks/useChannels';
import type { LiveCategory } from '@/types';

export interface StitchProgram {
  id: string;
  title: string;
  subtitle?: string;
  startHour: number; // e.g. 19.5 for 19:30
  endHour: number;   // e.g. 22 for 22:00
  timeString: string;
  badge?: string;
  badgeType?: 'live' | 'catchup' | 'replay' | 'premiere' | 'final';
  features?: string[];
  isLiveNow?: boolean;
}

export interface StitchChannelRow {
  id: string;
  chNumber: string;
  name: string;
  badgeTag: string;
  logo: string;
  category: 'sports' | 'movies' | 'shows' | 'news_edu' | 'lifestyle';
  isFavorite?: boolean;
  programs: StitchProgram[];
}

export const STITCH_CHANNELS_25: StitchChannelRow[] = [
  {
    id: 'ch-01',
    chNumber: 'CH #001',
    name: 'Omni Sport 1',
    badgeTag: 'PREMIUM LIVE 4K',
    logo: '/Channel_Logos/01-omni-sport-1-icon.svg',
    category: 'sports',
    isFavorite: true,
    programs: [
      {
        id: 'p-1',
        title: 'Bản Tin Tiền Trận: Siêu Kinh Điển Anh',
        subtitle: 'Phân tích chiến thuật trước trận derby • Omni Sports Desk',
        startHour: 18,
        endHour: 19.5,
        timeString: '18:00 - 19:30',
        badge: 'REPLAY HD',
        badgeType: 'replay',
      },
      {
        id: 'p-2',
        title: 'Trực Tiếp: Manchester City vs Arsenal',
        subtitle: 'Vòng 35 Ngoại Hạng Anh • SVĐ Etihad • BLV Quang Huy & Anh Ngọc',
        startHour: 19.5,
        endHour: 22,
        timeString: '19:30 - 22:00',
        badge: 'ON-AIR 4K HDR',
        badgeType: 'live',
        features: ['5.1 SURROUND', 'Multi-Cam Ready'],
        isLiveNow: true,
      },
      {
        id: 'p-3',
        title: 'Omni Extra Time: Họp Báo Sau Trận',
        subtitle: 'Phỏng vấn HLV Pep Guardiola & Arteta',
        startHour: 22,
        endHour: 23,
        timeString: '22:00 - 23:00',
        badge: 'LIVE PRESS',
        badgeType: 'live',
      },
    ],
  },
  {
    id: 'ch-02',
    chNumber: 'CH #002',
    name: 'Omni Sport 2',
    badgeTag: 'ACTION & RACING',
    logo: '/Channel_Logos/02-omni-sport-2-icon.svg',
    category: 'sports',
    isFavorite: true,
    programs: [
      {
        id: 'p-4',
        title: 'NBA Playoff Game 6: Celtics vs Heat',
        subtitle: 'Phát lại trọn vẹn trận đấu kịch tính • BASKETBALL 4K 60FPS',
        startHour: 18,
        endHour: 20,
        timeString: '18:00 - 20:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-5',
        title: 'F1 GP Monaco: Vòng Đua Phân Hạng Q1-Q3',
        subtitle: 'Trực tiếp từ trường đua Monte Carlo với On-board Radio & Telemetry',
        startHour: 20,
        endHour: 22,
        timeString: '20:00 - 22:00',
        badge: 'ON-AIR LIVE',
        badgeType: 'live',
        features: ['TELEMETRY ON-SCREEN'],
        isLiveNow: true,
      },
      {
        id: 'p-6',
        title: 'UFC Fight Night Main Card',
        subtitle: 'Các trận đấu vô địch hạng nhẹ',
        startHour: 22,
        endHour: 24,
        timeString: '22:00 - 24:00',
        badge: 'COMBAT 4K',
        badgeType: 'live',
      },
    ],
  },
  {
    id: 'ch-03',
    chNumber: 'CH #003',
    name: 'Omni Show',
    badgeTag: 'TALK & CELEBRITY',
    logo: '/Channel_Logos/03-omni-show-icon.svg',
    category: 'shows',
    programs: [
      {
        id: 'p-7',
        title: 'Omni Talk: Chuyện Hậu Trường Showbiz',
        subtitle: 'Khách mời đặc biệt ca sĩ Mỹ Tâm • TALKSHOW FULL HD',
        startHour: 18,
        endHour: 20,
        timeString: '18:00 - 20:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-8',
        title: 'Ca Sĩ Mặt Nạ: Bán Kết All-Stars',
        subtitle: 'Trấn Thành, Tóc Tiên, Bích Phương lộ diện mascot bí ẩn • OMNI ORIGINAL SHOW',
        startHour: 20,
        endHour: 22.5,
        timeString: '20:00 - 22:30',
        badge: 'ON-AIR LIVE',
        badgeType: 'live',
        isLiveNow: true,
      },
    ],
  },
  {
    id: 'ch-04',
    chNumber: 'CH #004',
    name: 'Omni Entertain',
    badgeTag: 'REALITY & GAMES',
    logo: '/Channel_Logos/04-omni-entertain-icon.svg',
    category: 'shows',
    programs: [
      {
        id: 'p-9',
        title: '2 Ngày 1 Đêm: Chặng Miền Tây Sông Nước',
        subtitle: 'Tập đặc biệt hành trình khám phá chợ nổi Cái Răng',
        startHour: 18,
        endHour: 20,
        timeString: '18:00 - 20:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-10',
        title: 'Hành Trình Rực Rỡ: Gala Chung Kết',
        subtitle: 'Đại tiệc âm nhạc và giải thưởng nghệ thuật truyền hình',
        startHour: 20,
        endHour: 22.5,
        timeString: '20:00 - 22:30',
        badge: 'ON-AIR 4K',
        badgeType: 'live',
        isLiveNow: true,
      },
    ],
  },
  {
    id: 'ch-05',
    chNumber: 'CH #005',
    name: 'Omni Cine',
    badgeTag: 'BLOCKBUSTER 4K',
    logo: '/Channel_Logos/05-omni-cine-icon.svg',
    category: 'movies',
    isFavorite: true,
    programs: [
      {
        id: 'p-11',
        title: 'Interstellar: Hố Đen Tử Thần',
        subtitle: 'Đạo diễn Christopher Nolan • Matthew McConaughey • DOLBY VISION 13+',
        startHour: 17.5,
        endHour: 20,
        timeString: '17:30 - 20:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-12',
        title: 'Dune: Hành Tinh Cát - Phần 2',
        subtitle: 'Độc quyền chiếu rạp OTT • Timothée Chalamet & Zendaya • ATMOS AUDIO',
        startHour: 20,
        endHour: 22.75,
        timeString: '20:00 - 22:45',
        badge: 'ON-AIR 4K',
        badgeType: 'live',
        features: ['ATMOS AUDIO', 'Phụ Đề VIE / ENG'],
        isLiveNow: true,
      },
    ],
  },
  {
    id: 'ch-06',
    chNumber: 'CH #006',
    name: 'Omni Drama',
    badgeTag: 'SERIES & NOVELA',
    logo: '/Channel_Logos/06-omni-drama-icon.svg',
    category: 'movies',
    programs: [
      {
        id: 'p-13',
        title: 'Nữ Hoàng Nước Mắt (Tập 15)',
        subtitle: 'Kim Soo Hyun & Kim Ji Won • K-DRAMA THUYẾT MINH',
        startHour: 18,
        endHour: 19.5,
        timeString: '18:00 - 19:30',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-14',
        title: 'Nữ Hoàng Nước Mắt (Tập 16 - Final)',
        subtitle: 'Hồi kết đại kết cục xúc động lấy nước mắt khán giả • PREMIERE PHÁT SONG SONG',
        startHour: 19.5,
        endHour: 21,
        timeString: '19:30 - 21:00',
        badge: 'ON-AIR TẬP CUỐI',
        badgeType: 'final',
        isLiveNow: true,
      },
      {
        id: 'p-15',
        title: 'Gia Tộc Rồng: Mùa 2 (Tập 1)',
        subtitle: 'Cuộc chiến Dance of the Dragons • HBO ORIGINAL 18+',
        startHour: 21,
        endHour: 22.5,
        timeString: '21:00 - 22:30',
        badge: 'PREMIERE',
        badgeType: 'premiere',
      },
    ],
  },
  {
    id: 'ch-07',
    chNumber: 'CH #007',
    name: 'Omni News',
    badgeTag: '24/7 ROLLING NEWS',
    logo: '/Channel_Logos/07-omni-news-icon.svg',
    category: 'news_edu',
    programs: [
      {
        id: 'p-16',
        title: 'Toàn Cảnh Thế Giới 18h',
        subtitle: 'Tin tức thời sự quốc tế và tài chính thị trường phố Wall',
        startHour: 18,
        endHour: 19,
        timeString: '18:00 - 19:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-17',
        title: 'Bản Tin Thời Sự 19h Trực Tiếp',
        subtitle: 'Tin nóng chính trị, kinh tế xã hội và thời tiết',
        startHour: 19,
        endHour: 20,
        timeString: '19:00 - 20:00',
        badge: 'LIVE NOW',
        badgeType: 'live',
      },
      {
        id: 'p-18',
        title: 'Tiêu Điểm Kinh Tế Số & AI',
        subtitle: 'Diễn đàn công nghệ và tài chính số Việt Nam 2026',
        startHour: 20,
        endHour: 22,
        timeString: '20:00 - 22:00',
        badge: 'ON-AIR 4K',
        badgeType: 'live',
        isLiveNow: true,
      },
    ],
  },
  {
    id: 'ch-08',
    chNumber: 'CH #008',
    name: 'Omni Music',
    badgeTag: 'HITS & LIVE CONCERT',
    logo: '/Channel_Logos/08-omni-music-icon.svg',
    category: 'shows',
    programs: [
      {
        id: 'p-19',
        title: 'Top Hits V-Pop Weekly Countdown',
        subtitle: 'Bảng xếp hạng 20 ca khúc thịnh hành nhất tuần',
        startHour: 18,
        endHour: 20,
        timeString: '18:00 - 20:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-20',
        title: 'Sơn Tùng M-TP: Live Symphony 4K',
        subtitle: 'Đại nhạc hội giao hưởng kết hợp âm thanh vòm Dolby Atmos',
        startHour: 20,
        endHour: 22.5,
        timeString: '20:00 - 22:30',
        badge: 'ON-AIR LIVE',
        badgeType: 'live',
        features: ['DOLBY ATMOS', '4K UHD'],
        isLiveNow: true,
      },
    ],
  },
  {
    id: 'ch-09',
    chNumber: 'CH #009',
    name: 'Omni Kids',
    badgeTag: 'FAMILY & ANIME',
    logo: '/Channel_Logos/09-omni-kids-icon.svg',
    category: 'lifestyle',
    programs: [
      {
        id: 'p-21',
        title: 'Doraemon: Nobita và Bản Giao Hưởng Địa Cầu',
        subtitle: 'Phim hoạt hình chiếu rạp lồng tiếng Việt chuẩn',
        startHour: 18,
        endHour: 20,
        timeString: '18:00 - 20:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-22',
        title: 'Khám Phá Vũ Trụ Cùng Bé',
        subtitle: 'Chương trình khoa học vui giáo dục tương tác',
        startHour: 20,
        endHour: 22,
        timeString: '20:00 - 22:00',
        badge: 'ON-AIR KIDS',
        badgeType: 'live',
        isLiveNow: true,
      },
    ],
  },
  {
    id: 'ch-10',
    chNumber: 'CH #010',
    name: 'Omni Tech',
    badgeTag: 'AI & FUTURE TECH',
    logo: '/Channel_Logos/10-omni-tech-icon.svg',
    category: 'news_edu',
    programs: [
      {
        id: 'p-23',
        title: 'Google I/O & Gemini AI Keynote Recap',
        subtitle: 'Phân tích các mô hình AI thế hệ mới nhất 2026',
        startHour: 18,
        endHour: 20,
        timeString: '18:00 - 20:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-24',
        title: 'Trực Tiếp: Ra Mắt Kính Thực Tế Ảo Thế Hệ Mới',
        subtitle: 'Trải nghiệm không gian ảo Spatial Computing đỉnh cao',
        startHour: 20,
        endHour: 22,
        timeString: '20:00 - 22:00',
        badge: 'ON-AIR TECH',
        badgeType: 'live',
        isLiveNow: true,
      },
    ],
  },
  {
    id: 'ch-11',
    chNumber: 'CH #011',
    name: 'Omni Food',
    badgeTag: 'CULINARY & TRAVEL',
    logo: '/Channel_Logos/11-omni-food-icon.svg',
    category: 'lifestyle',
    programs: [
      {
        id: 'p-25',
        title: 'MasterChef Việt Nam: Thử Thách Ẩm Thực 3 Miền',
        subtitle: 'Top 10 thí sinh đối đầu tại cố đô Huế',
        startHour: 18,
        endHour: 20,
        timeString: '18:00 - 20:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-26',
        title: 'Street Food Tour: Hương Vị Sài Gòn Đêm',
        subtitle: 'Khám phá những quán ăn đêm trứ danh cùng đầu bếp sao Michelin',
        startHour: 20,
        endHour: 22,
        timeString: '20:00 - 22:00',
        badge: 'ON-AIR 4K',
        badgeType: 'live',
        isLiveNow: true,
      },
    ],
  },
  {
    id: 'ch-12',
    chNumber: 'CH #012',
    name: 'Omni Discovery',
    badgeTag: 'NATURE & SCIENCE',
    logo: '/Channel_Logos/12-omni-discovery-icon.svg',
    category: 'news_edu',
    programs: [
      {
        id: 'p-27',
        title: 'Hành Tinh Trái Đất III: Đại Dương Sâu Thẳm',
        subtitle: 'Những sinh vật kỳ bí nhất dưới rãnh Mariana 4K HDR',
        startHour: 18,
        endHour: 20,
        timeString: '18:00 - 20:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-28',
        title: 'Bí Mật Rừng Nhiệt Đới Amazon',
        subtitle: 'Thám hiểm hệ sinh thái nguyên sinh chưa từng được công bố',
        startHour: 20,
        endHour: 22.5,
        timeString: '20:00 - 22:30',
        badge: 'ON-AIR 4K',
        badgeType: 'live',
        features: ['4K HDR', 'DOLBY 5.1'],
        isLiveNow: true,
      },
    ],
  },
  {
    id: 'ch-13',
    chNumber: 'CH #013',
    name: 'Omni Esports',
    badgeTag: 'PRO ESPORTS ARENA',
    logo: '/Channel_Logos/13-omni-esports-icon.svg',
    category: 'sports',
    isFavorite: true,
    programs: [
      {
        id: 'p-29',
        title: 'Chung Kết LCK Mùa Hè: T1 vs Gen.G',
        subtitle: 'Trận đại chiến kinh điển tranh tấm vé CKTG',
        startHour: 18,
        endHour: 21,
        timeString: '18:00 - 21:00',
        badge: 'ON-AIR LIVE',
        badgeType: 'live',
        isLiveNow: true,
      },
      {
        id: 'p-30',
        title: 'Valorant Champions Tour Highlights',
        subtitle: 'Top 10 pha xử lý clutch xuất thần nhất mùa giải',
        startHour: 21,
        endHour: 23,
        timeString: '21:00 - 23:00',
        badge: 'ESPORTS 4K',
        badgeType: 'live',
      },
    ],
  },
  {
    id: 'ch-14',
    chNumber: 'CH #014',
    name: 'Omni Indie Games',
    badgeTag: 'INDIE & PIXEL ART',
    logo: '/Channel_Logos/14-omni-indie-games-icon.svg',
    category: 'shows',
    programs: [
      {
        id: 'p-31',
        title: 'Khám Phá Tuyệt Phẩm Indie: Hollow Knight Silksong',
        subtitle: 'Trải nghiệm gameplay độc quyền cùng nhà phát triển',
        startHour: 18,
        endHour: 20,
        timeString: '18:00 - 20:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-32',
        title: 'Pixel Art Showcase & Game Dev Studio',
        subtitle: 'Workshop thiết kế game indie cùng chuyên gia quốc tế',
        startHour: 20,
        endHour: 22,
        timeString: '20:00 - 22:00',
        badge: 'ON-AIR LIVE',
        badgeType: 'live',
        isLiveNow: true,
      },
    ],
  },
  {
    id: 'ch-15',
    chNumber: 'CH #015',
    name: 'Omni Podcast',
    badgeTag: 'DEEP TALK & VOICES',
    logo: '/Channel_Logos/15-omni-podcast-icon.svg',
    category: 'shows',
    programs: [
      {
        id: 'p-33',
        title: 'Have A Sip: Trò Chuyện Cùng Giáo Sư Triết Học',
        subtitle: 'Tìm lại sự an yên trong tâm hồn giữa kỷ nguyên số hóa',
        startHour: 18,
        endHour: 20,
        timeString: '18:00 - 20:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-34',
        title: 'The AI Revolution: Tương Lai Nhân Loại 2030',
        subtitle: 'Đối thoại trực tiếp cùng các nhà khoa học máy tính hàng đầu',
        startHour: 20,
        endHour: 22.5,
        timeString: '20:00 - 22:30',
        badge: 'ON-AIR LIVE',
        badgeType: 'live',
        isLiveNow: true,
      },
    ],
  },
  {
    id: 'ch-16',
    chNumber: 'CH #016',
    name: 'Omni Audiobook',
    badgeTag: 'AUDIOBOOK STUDIO 24/7',
    logo: '/Channel_Logos/16-omni-audiobook-icon.svg',
    category: 'news_edu',
    programs: [
      {
        id: 'p-35',
        title: 'Đắc Nhân Tâm: Nghệ Thuật Ứng Xử Hiện Đại',
        subtitle: 'Giọng đọc truyền cảm của NSƯT Thành Lộc',
        startHour: 18,
        endHour: 20,
        timeString: '18:00 - 20:00',
        badge: 'AUDIO HD',
        badgeType: 'catchup',
      },
      {
        id: 'p-36',
        title: 'Sapiens: Lược Sử Loài Người - Phần 3',
        subtitle: 'Cách mạng khoa học và tương lai của loài người',
        startHour: 20,
        endHour: 22,
        timeString: '20:00 - 22:00',
        badge: 'ON-AIR AUDIO',
        badgeType: 'live',
        isLiveNow: true,
      },
    ],
  },
  {
    id: 'ch-17',
    chNumber: 'CH #017',
    name: 'Omni Academy',
    badgeTag: 'OPEN UNIVERSITY & STEM',
    logo: '/Channel_Logos/17-omni-academy-icon.svg',
    category: 'news_edu',
    programs: [
      {
        id: 'p-37',
        title: 'Toán Học Ứng Dụng & Thuật Toán Tối Ưu',
        subtitle: 'Bài giảng từ Viện Toán Học Cao Cấp Việt Nam',
        startHour: 18,
        endHour: 20,
        timeString: '18:00 - 20:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-38',
        title: 'Lập Trình Web Hiện Đại Với Next.js & React 19',
        subtitle: 'Khóa học thực chiến xây dựng ứng dụng quy mô lớn',
        startHour: 20,
        endHour: 22,
        timeString: '20:00 - 22:00',
        badge: 'ON-AIR EDU',
        badgeType: 'live',
        isLiveNow: true,
      },
    ],
  },
  {
    id: 'ch-18',
    chNumber: 'CH #018',
    name: 'Omni Skill Lab',
    badgeTag: 'HANDS-ON WORKSHOP',
    logo: '/Channel_Logos/18-omni-skill-lab-icon.svg',
    category: 'news_edu',
    programs: [
      {
        id: 'p-39',
        title: 'Workshop Thiết Kế Hệ Thống Design System',
        subtitle: 'Xây dựng UI tokens và components cho doanh nghiệp',
        startHour: 18,
        endHour: 20,
        timeString: '18:00 - 20:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-40',
        title: 'Thực Hành Data Analytics & AI Prompting',
        subtitle: 'Phân tích dữ liệu kinh doanh bằng Python và PowerBI',
        startHour: 20,
        endHour: 22,
        timeString: '20:00 - 22:00',
        badge: 'ON-AIR LAB',
        badgeType: 'live',
        isLiveNow: true,
      },
    ],
  },
  {
    id: 'ch-19',
    chNumber: 'CH #019',
    name: 'Omni Wellness',
    badgeTag: 'YOGA & MINDFULNESS',
    logo: '/Channel_Logos/19-omni-wellness-icon.svg',
    category: 'lifestyle',
    programs: [
      {
        id: 'p-41',
        title: 'Thiền Định Tái Tạo Năng Lượng Buổi Tối',
        subtitle: 'Giải tỏa căng thẳng sau ngày làm việc bận rộn',
        startHour: 18,
        endHour: 20,
        timeString: '18:00 - 20:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-42',
        title: 'Yoga Giãn Cơ Cột Sống Cùng Master Ấn Độ',
        subtitle: 'Tăng cường sự dẻo dai và phòng ngừa thoái hóa',
        startHour: 20,
        endHour: 22,
        timeString: '20:00 - 22:00',
        badge: 'ON-AIR WELLNESS',
        badgeType: 'live',
        isLiveNow: true,
      },
    ],
  },
  {
    id: 'ch-20',
    chNumber: 'CH #020',
    name: 'Omni Fashion',
    badgeTag: 'RUNWAY & HAUTE COUTURE',
    logo: '/Channel_Logos/20-omni-fashion-icon.svg',
    category: 'lifestyle',
    programs: [
      {
        id: 'p-43',
        title: 'Paris Fashion Week Haute Couture 2026',
        subtitle: 'Trực tiếp sàn diễn thời trang danh giá nhất hành tinh',
        startHour: 18,
        endHour: 20,
        timeString: '18:00 - 20:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-44',
        title: 'Vietnam International Fashion Show',
        subtitle: 'Bộ sưu tập áo dài lụa tơ tằm di sản từ các NTK hàng đầu',
        startHour: 20,
        endHour: 22,
        timeString: '20:00 - 22:00',
        badge: 'ON-AIR 4K',
        badgeType: 'live',
        isLiveNow: true,
      },
    ],
  },
  {
    id: 'ch-21',
    chNumber: 'CH #021',
    name: 'Omni Travel VN',
    badgeTag: 'VIETNAM DISCOVERY',
    logo: '/Channel_Logos/21-omni-travel-vn-icon.svg',
    category: 'lifestyle',
    programs: [
      {
        id: 'p-45',
        title: 'Kỳ Vĩ Hang Sơn Đoòng: Chuyến Đi Đời Người',
        subtitle: 'Hành trình 5 ngày 4 đêm khám phá hang động lớn nhất thế giới',
        startHour: 18,
        endHour: 20,
        timeString: '18:00 - 20:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-46',
        title: 'Mùa Vàng Ruộng Bậc Thang Mù Cang Chải',
        subtitle: 'Góc quay flycam 4K siêu sắc nét cảnh sắc Tây Bắc',
        startHour: 20,
        endHour: 22,
        timeString: '20:00 - 22:00',
        badge: 'ON-AIR 4K',
        badgeType: 'live',
        isLiveNow: true,
      },
    ],
  },
  {
    id: 'ch-22',
    chNumber: 'CH #022',
    name: 'Omni Travel World',
    badgeTag: 'GLOBAL EXPEDITION',
    logo: '/Channel_Logos/22-omni-travel-world-icon.svg',
    category: 'lifestyle',
    programs: [
      {
        id: 'p-47',
        title: 'Săn Cực Quang Bắc Cực Tại Iceland',
        subtitle: 'Hiện tượng thiên nhiên huyền ảo trên bầu trời đêm Reykjavik',
        startHour: 18,
        endHour: 20,
        timeString: '18:00 - 20:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-48',
        title: 'Khám Phá Đền Cổ Kyoto Mùa Hoa Anh Đào',
        subtitle: 'Hòa mình vào vẻ đẹp thanh bình của văn hóa truyền thống Nhật Bản',
        startHour: 20,
        endHour: 22,
        timeString: '20:00 - 22:00',
        badge: 'ON-AIR 4K',
        badgeType: 'live',
        isLiveNow: true,
      },
    ],
  },
  {
    id: 'ch-23',
    chNumber: 'CH #023',
    name: 'Omni Art & Design',
    badgeTag: 'CREATIVE & VISUAL ART',
    logo: '/Channel_Logos/23-omni-art-design-icon.svg',
    category: 'news_edu',
    programs: [
      {
        id: 'p-49',
        title: 'Triển Lãm Nghệ Thuật Đương Đại Art Basel',
        subtitle: 'Tuyển tập các tác phẩm hội họa và điêu khắc ấn tượng nhất',
        startHour: 18,
        endHour: 20,
        timeString: '18:00 - 20:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-50',
        title: '3D Motion Graphics & VFX Cinema Workshop',
        subtitle: 'Quy trình tạo kỹ xảo điện ảnh bom tấn trên Cinema 4D và Houdini',
        startHour: 20,
        endHour: 22,
        timeString: '20:00 - 22:00',
        badge: 'ON-AIR ART',
        badgeType: 'live',
        isLiveNow: true,
      },
    ],
  },
  {
    id: 'ch-24',
    chNumber: 'CH #024',
    name: 'Omni Business',
    badgeTag: 'FINANCE & STARTUP',
    logo: '/Channel_Logos/24-omni-business-icon.svg',
    category: 'news_edu',
    programs: [
      {
        id: 'p-51',
        title: 'Shark Tank & Kỳ Lân Công Nghệ Châu Á',
        subtitle: 'Chiến lược gọi vốn Series A/B từ các quỹ đầu tư mạo hiểm',
        startHour: 18,
        endHour: 20,
        timeString: '18:00 - 20:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-52',
        title: 'Nhịp Đập Phố Wall & Thị Trường Chứng Khoán',
        subtitle: 'Phân tích vĩ mô lãi suất FED và xu hướng dòng tiền toàn cầu',
        startHour: 20,
        endHour: 22,
        timeString: '20:00 - 22:00',
        badge: 'ON-AIR FINANCE',
        badgeType: 'live',
        isLiveNow: true,
      },
    ],
  },
  {
    id: 'ch-25',
    chNumber: 'CH #025',
    name: 'Omni Health',
    badgeTag: 'MEDICAL & HEALTHCARE 24/7',
    logo: '/Channel_Logos/25-omni-health-icon.svg',
    category: 'lifestyle',
    programs: [
      {
        id: 'p-53',
        title: 'Dinh Dưỡng Học Đường & Sức Khỏe Gia Đình',
        subtitle: 'Tư vấn chế độ ăn uống khoa học phòng chống bệnh tim mạch',
        startHour: 18,
        endHour: 20,
        timeString: '18:00 - 20:00',
        badge: 'CATCH-UP',
        badgeType: 'catchup',
      },
      {
        id: 'p-54',
        title: 'Bác Sĩ Trực Tuyến: Giải Đáp Bệnh Lý 24/7',
        subtitle: 'Tư vấn trực tiếp cùng các chuyên gia Bệnh viện Đại học Y Dược',
        startHour: 20,
        endHour: 22,
        timeString: '20:00 - 22:00',
        badge: 'ON-AIR HEALTH',
        badgeType: 'live',
        isLiveNow: true,
      },
    ],
  },
];

function mapCategoryToGroup(cat?: string): StitchChannelRow['category'] {
  if (!cat) return 'lifestyle';
  const c = cat.toUpperCase();
  if (c.includes('SPORT') || c.includes('GAME') || c.includes('GAMING') || c.includes('ESPORT')) return 'sports';
  if (c.includes('CINE') || c.includes('DRAMA') || c.includes('MOVIE') || c.includes('FILM')) return 'movies';
  if (c.includes('SHOW') || c.includes('MUSIC') || c.includes('ENTERTAIN') || c.includes('KIDS')) return 'shows';
  if (c.includes('NEWS') || c.includes('TECH') || c.includes('EDU') || c.includes('BUSINESS') || c.includes('DISCOVERY')) return 'news_edu';
  return 'lifestyle';
}

export function EPGGrid() {
  const [activeDateIndex, setActiveDateIndex] = useState(6); // Today (Active)
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'sports' | 'movies' | 'shows' | 'news_edu' | 'lifestyle'>('all');
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<'morning' | 'afternoon' | 'prime' | 'night'>('prime');
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [currentTimePos, setCurrentTimePos] = useState(20.42); // 20:25:40 = 20.428h

  // Date list for 7-day Catch-up dynamically generated
  const DATE_RIBBON = useMemo(() => {
    const list = [];
    const dayNames = ['CN', 'T.HAI', 'T.BA', 'T.TƯ', 'T.NĂM', 'T.SÁU', 'T.BẢY'];
    const now = new Date();
    for (let offset = -6; offset <= 7; offset++) {
      const d = new Date(now);
      d.setDate(now.getDate() + offset);
      const isToday = offset === 0;
      const isYesterday = offset === -1;
      const isTomorrow = offset === 1;
      const dayLabel = isToday
        ? 'HÔM NAY'
        : isYesterday
        ? 'HÔM QUA'
        : isTomorrow
        ? 'NGÀY MAI'
        : dayNames[d.getDay()];
      const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      list.push({ label: dayLabel, date: dateStr, fullDate: d, isToday });
    }
    return list;
  }, []);

  const activeDate = DATE_RIBBON[activeDateIndex]?.fullDate || new Date();

  // Dynamic EPG day & Channels queries
  const { data: epgDayData, isLoading: isEpgLoading } = useEpgDay(activeDate);
  const { data: channelsData } = useChannels({ limit: 50 });

  // Merge dynamic API channels/schedules with Stitch matrix
  const channelsList = useMemo<StitchChannelRow[]>(() => {
    if (epgDayData?.channels && epgDayData.channels.length > 0) {
      return epgDayData.channels.map((ch, idx) => {
        const chNumber = `CH #${String(idx + 1).padStart(3, '0')}`;
        const categoryGroup = mapCategoryToGroup(ch.channelCategory);
        const progs: StitchProgram[] = (ch.programs || []).map((p, pIdx) => {
          const start = new Date(p.startTime);
          const end = new Date(p.endTime);
          const startHour = start.getHours() + start.getMinutes() / 60;
          const endHour = end.getHours() + end.getMinutes() / 60;
          const timeString = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')} - ${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
          const isLive = p.status === 'LIVE';
          return {
            id: p.id || `prog-${idx}-${pIdx}`,
            title: p.title,
            subtitle: p.isFiller ? 'Chương trình phát lại tuyển chọn' : `Trực tiếp trên ${ch.channelName}`,
            startHour: isNaN(startHour) ? 18 : startHour,
            endHour: isNaN(endHour) ? 20 : (endHour < startHour ? endHour + 24 : endHour),
            timeString,
            badge: isLive ? 'ON-AIR 4K HDR' : p.isFiller ? 'REPLAY HD' : 'PREMIERE',
            badgeType: isLive ? 'live' : 'replay',
            features: ['5.1 SURROUND', 'Multi-Cam Ready'],
            isLiveNow: isLive,
          };
        });

        return {
          id: ch.channelId,
          chNumber,
          name: ch.channelName,
          badgeTag: ch.channelCategory || 'PREMIUM 4K',
          logo: ch.channelLogoUrl || STITCH_CHANNELS_25[idx % STITCH_CHANNELS_25.length]?.logo || '/Channel_Logos/01-omni-sport-1-icon.svg',
          category: categoryGroup,
          isFavorite: idx < 5,
          programs: progs.length > 0 ? progs : (STITCH_CHANNELS_25[idx % STITCH_CHANNELS_25.length]?.programs || []),
        };
      });
    }
    return STITCH_CHANNELS_25;
  }, [epgDayData]);

  // Timeline hours from 18:00 to 22:00 (Prime time block)
  const TIMELINE_HOURS = [18.0, 18.5, 19.0, 19.5, 20.0, 20.5, 21.0, 21.5, 22.0];
  const BASE_START_HOUR = 18.0;
  const BASE_END_HOUR = 22.5;
  const TOTAL_HOURS = BASE_END_HOUR - BASE_START_HOUR;

  // Filter channels
  const filteredChannels = useMemo(() => {
    return channelsList.filter((ch) => {
      if (selectedCategory !== 'all' && ch.category !== selectedCategory) return false;
      if (favoritesOnly && !ch.isFavorite) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = ch.name.toLowerCase().includes(q);
        const matchesProg = ch.programs.some((p) => p.title.toLowerCase().includes(q));
        if (!matchesName && !matchesProg) return false;
      }
      return true;
    });
  }, [channelsList, selectedCategory, favoritesOnly, searchQuery]);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* ── 1. Top EPG Title & Live Action Controls ──────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 rounded-2xl bg-[#090f1a] border border-[#162338] shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f2fe]" />
            <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400">
              EPG REALTIME SYNC UTC+7 (HANOI)
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span className="text-cyan-400 text-sm font-bold uppercase bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
              HỆ THỐNG 25 KÊNH
            </span>
            Lịch Phát Sóng Điện Tử & Catch-Up 7 Ngày
          </h2>
        </div>

        {/* Right Tools: HIỆN TẠI (LIVE), Search, Originals, Export */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setCurrentTimePos(20.42)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs shadow-[0_0_15px_rgba(0,242,254,0.4)] transition-all"
          >
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            HIỆN TẠI (LIVE)
          </button>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tên trận đấu, phim, gameshow..."
              className="pl-8 pr-3 py-1.5 bg-[#0e1726] border border-[#1d2f4a] focus:border-cyan-400 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none w-52 md:w-64"
            />
          </div>

          <button className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e1726] hover:bg-[#152339] border border-[#1d2f4a] text-xs font-bold text-slate-300 hover:text-cyan-400 transition-colors">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            Omni Originals
          </button>

          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e1726] hover:bg-[#152339] border border-[#1d2f4a] text-xs font-bold text-slate-300 hover:text-white transition-colors">
            <Download className="w-3.5 h-3.5" />
            Xuất Lịch
          </button>
        </div>
      </div>

      {/* ── 2. 7-Day Catch-Up Date Ribbon Bar (Stitch 1:1) ───────────── */}
      <div className="w-full overflow-x-auto scrollbar-none py-1 px-1">
        <div className="flex items-center gap-2 min-w-max">
          <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-400 uppercase tracking-wider mr-2">
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            CATCH-UP:
          </div>

          {DATE_RIBBON.map((item, idx) => {
            const isSelected = activeDateIndex === idx;
            return (
              <button
                key={idx}
                onClick={() => setActiveDateIndex(idx)}
                className={cn(
                  'flex flex-col items-center justify-center px-3 py-1.5 rounded-xl border text-xs font-bold transition-all min-w-[70px]',
                  isSelected
                    ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_12px_rgba(0,242,254,0.5)] font-black scale-105'
                    : 'bg-[#0b1320] hover:bg-[#121f33] border-[#18273e] text-slate-300'
                )}
              >
                <span className="text-[10px] uppercase">{item.label}</span>
                <span className="text-xs font-mono">{item.date}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 3. Category Tabs & Time Block Filters ────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#080d17] border border-[#142033]">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'all', label: 'TẤT CẢ (25 KÊNH)' },
            { key: 'sports', label: 'THỂ THAO & ESPORTS (3)' },
            { key: 'movies', label: 'PHIM & DRAMA (2)' },
            { key: 'shows', label: 'SHOWS & NHẠC (5)' },
            { key: 'news_edu', label: 'TRI THỨC & CÔNG NGHỆ (8)' },
            { key: 'lifestyle', label: 'ĐỜI SỐNG & DU LỊCH (7)' },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key as any)}
              className={cn(
                'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all',
                selectedCategory === cat.key
                  ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(0,242,254,0.4)]'
                  : 'bg-[#0e1625] hover:bg-[#152338] text-slate-300 border border-[#1b2b42]'
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Time Blocks on the Right */}
        <div className="flex items-center gap-1.5 bg-[#0e1625] p-1 rounded-xl border border-[#1b2b42] text-[11px] font-bold">
          {[
            { key: 'morning', label: 'Sáng (06:00-12:00)' },
            { key: 'afternoon', label: 'Chiều (12:00-18:00)' },
            { key: 'prime', label: '● Giờ Vàng (18:00-23:00)', isLivePulse: true },
            { key: 'night', label: 'Đêm (23:00-06:00)' },
          ].map((tb) => (
            <button
              key={tb.key}
              onClick={() => setSelectedTimeBlock(tb.key as any)}
              className={cn(
                'px-2.5 py-1 rounded-lg transition-colors',
                selectedTimeBlock === tb.key
                  ? 'bg-cyan-500 text-black font-extrabold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {tb.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. Catch-Up Notice Banner ────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-950/40 via-blue-950/20 to-transparent border border-cyan-500/20 text-xs">
        <div className="flex items-center gap-2 text-cyan-200">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>
            Tính năng <strong>Catch-Up 7 ngày</strong> hỗ trợ toàn bộ <strong>25 kênh</strong> cho phép xem lại chương trình đã phát sóng với âm thanh Dolby 5.1 và phụ đề đa ngôn ngữ.
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-300">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-500" />
            Đã phát (Xem lại)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#00f2fe]" />
            Đang phát (Live)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Sắp phát sóng
          </span>
        </div>
      </div>

      {/* ── 5. EPG Timeline Schedule Grid with Glowing Live Line ─────── */}
      <div className="relative rounded-2xl bg-[#070b13] border border-[#162338] shadow-2xl overflow-x-auto max-h-[750px] overflow-y-auto">
        
        {/* EPG Timeline Header (Sticky top) */}
        <div className="sticky top-0 z-40 flex items-center border-b border-[#18273e] bg-[#05080e] min-w-[1200px]">
          {/* Left Column Label: 25 KÊNH PHÁT SÓNG */}
          <div className="w-64 p-3 border-r border-[#18273e] text-xs font-black uppercase text-slate-300 tracking-wider flex items-center justify-between bg-[#05080e]">
            <span>25 KÊNH PHÁT SÓNG</span>
            <span className="text-[10px] text-cyan-400 font-mono">CH #001 - #025</span>
          </div>

          {/* Timeline Hours */}
          <div className="flex-1 grid grid-cols-9 text-xs font-mono text-slate-400 font-bold divide-x divide-[#152235]">
            {TIMELINE_HOURS.map((h, i) => {
              const hourStr = `${Math.floor(h)}:${h % 1 === 0 ? '00' : '30'}`;
              return (
                <div key={i} className="p-2.5 text-center">
                  {hourStr}
                </div>
              );
            })}
          </div>
        </div>

        {/* EPG Channel Rows Container (Relative for Glowing Live Marker) */}
        <div className="relative min-w-[1200px] divide-y divide-[#131e30]">
          
          {/* Glowing Vertical Orange Live Timeline Line */}
          <div
            className="absolute top-0 bottom-0 z-30 pointer-events-none"
            style={{
              left: `calc(16rem + ${((currentTimePos - BASE_START_HOUR) / TOTAL_HOURS) * 100}% * (1 - 16rem/100%))`,
            }}
          >
            {/* Slicing Orange Line */}
            <div className="w-[2px] h-full bg-[#ff5722] shadow-[0_0_12px_#ff5722,0_0_24px_#ff5722]" />
            {/* Live Tag Top Badge */}
            <div className="sticky top-8 left-1/2 -translate-x-1/2 bg-[#ff5722] text-white text-[10px] font-black px-2 py-0.5 rounded shadow-[0_0_10px_#ff5722] whitespace-nowrap">
              LIVE 20:25:40
            </div>
          </div>

          {/* Channel Rows */}
          {filteredChannels.map((channel) => (
            <div key={channel.id} className="flex items-stretch hover:bg-[#0c1422]/60 transition-colors">
              
              {/* Left Channel Header Card */}
              <div className="w-64 p-3 border-r border-[#18273e] flex items-center gap-3 bg-[#080d17]/90 flex-shrink-0 sticky left-0 z-20">
                <button
                  onClick={() => {}}
                  className="text-slate-500 hover:text-amber-400 transition-colors"
                >
                  <Star className={cn('w-4 h-4', channel.isFavorite ? 'text-amber-400 fill-amber-400' : '')} />
                </button>

                <div className="w-8 h-8 rounded-lg bg-[#121e30] border border-[#1f304a] flex items-center justify-center p-1 shadow-sm">
                  <Tv className="w-5 h-5 text-cyan-400" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-black text-white truncate flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 font-mono">{channel.chNumber}</span>
                    {channel.name}
                  </div>
                  <div className="text-[9px] font-black uppercase text-cyan-400 tracking-wider truncate">
                    {channel.badgeTag}
                  </div>
                </div>
              </div>

              {/* Right Schedule Row Timeline */}
              <div className="flex-1 relative flex items-center p-2 gap-2 min-h-[90px]">
                {channel.programs.map((prog) => {
                  const widthPct = Math.max(20, ((prog.endHour - prog.startHour) / TOTAL_HOURS) * 100);

                  return (
                    <div
                      key={prog.id}
                      className={cn(
                        'group/card rounded-xl p-3 flex flex-col justify-between border transition-all cursor-pointer relative overflow-hidden',
                        prog.isLiveNow
                          ? 'bg-gradient-to-r from-cyan-950/60 to-[#0e1c2e] border-cyan-500/50 shadow-[0_0_15px_rgba(0,242,254,0.15)] hover:border-cyan-400'
                          : 'bg-[#0a111c] hover:bg-[#101b2c] border-[#18263a]'
                      )}
                      style={{
                        width: `${widthPct}%`,
                        minWidth: '220px',
                      }}
                    >
                      {/* Top Program Info */}
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[10px] font-mono text-slate-400 font-semibold">
                            {prog.timeString}
                          </span>
                          {prog.badge && (
                            <span
                              className={cn(
                                'text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider',
                                prog.badgeType === 'live'
                                  ? 'bg-red-950 text-red-300 border border-red-800'
                                  : prog.badgeType === 'final'
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-[#152236] text-cyan-300 border border-[#213554]'
                              )}
                            >
                              {prog.badge}
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs font-bold text-white group-hover/card:text-cyan-300 transition-colors line-clamp-1">
                          {prog.title}
                        </h4>
                        {prog.subtitle && (
                          <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {prog.subtitle}
                          </p>
                        )}
                      </div>

                      {/* Bottom Tags / Features & Xem Ngay Button */}
                      <div className="flex items-center justify-between gap-1 mt-2 pt-1 border-t border-white/5">
                        <div className="flex items-center gap-1.5">
                          {prog.features?.map((f, fi) => (
                            <span
                              key={fi}
                              className="text-[9px] font-bold text-slate-400 bg-black/40 px-1.5 py-0.2 rounded"
                            >
                              {f}
                            </span>
                          ))}
                        </div>

                        <Link
                          href={prog.id.startsWith('p-') || prog.id.startsWith('prog-') ? `/channels` : `/programs/${prog.id}`}
                          className="flex items-center gap-1 text-[10px] font-black text-cyan-400 group-hover/card:underline whitespace-nowrap ml-auto"
                        >
                          <span>Xem Ngay</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
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
  );
}