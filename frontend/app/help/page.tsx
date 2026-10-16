'use client';

// ============================================================
// OmniCast · Trung Tâm Trợ Giúp & Hỗ Trợ (Help & Support Hub)
// ============================================================

import * as React from 'react';
import Link from 'next/link';
import {
  Search,
  LifeBuoy,
  Tv,
  Smartphone,
  Radio,
  Gem,
  Shield,
  Scale,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  Send,
  MessageSquare,
  PhoneCall,
  Mail,
  Zap,
  ExternalLink,
  BookOpen,
} from 'lucide-react';

interface FaqItem {
  id: string;
  category: 'viewer' | 'studio' | 'billing' | 'tech' | 'security';
  question: string;
  answer: string;
  tags: string[];
}

const FAQ_ITEMS: FaqItem[] = [
  // ── Khán giả & Phát sóng ───────────────────────────────────
  {
    id: 'faq-1',
    category: 'viewer',
    question: 'Làm thế nào để xem lịch phát sóng EPG 24/7 và đặt thông báo nhắc giờ?',
    answer:
      'Bạn truy cập mục "Lịch Phát Sóng (EPG)" trên thanh điều hướng để xem toàn bộ 25 kênh phát sóng. Nhấp vào bất kỳ chương trình nào để xem tóm tắt nội dung, phân loại độ tuổi và nhấn nút "Thêm vào Watchlist". Trên ứng dụng di động Flutter, hệ thống sẽ tự động lên lịch thông báo đẩy (FCM) nhắc bạn trước giờ phát sóng 15 phút.',
    tags: ['epg', 'lịch chiếu', 'thông báo', 'watchlist', 'nhắc giờ'],
  },
  {
    id: 'faq-2',
    category: 'viewer',
    question: 'Tôi gặp hiện tượng video bị đệm (buffering) hoặc giảm độ phân giải, phải làm sao?',
    answer:
      'Trình phát OmniCast tích hợp công nghệ ABR (Adaptive Bitrate) tự động điều chỉnh độ phân giải từ 720p đến 4K theo băng thông mạng. Nếu gặp tình trạng đệm, bạn hãy nhấp biểu tượng bánh răng trên trình phát để cố định chất lượng 1080p, hoặc kiểm tra kết nối mạng. Hệ thống sử dụng mạng lưới CDN phân tán của Bunny Stream nên độ trễ thông thường luôn dưới 2.5 giây.',
    tags: ['buffering', 'giật lag', 'độ phân giải', 'cdn', '4k'],
  },
  {
    id: 'faq-3',
    category: 'viewer',
    question: 'Phân loại độ tuổi P, K, T13, T16, T18, C trên OmniCast có ý nghĩa gì?',
    answer:
      'OmniCast áp dụng tiêu chuẩn kiểm duyệt phát sóng chính thức: P (Mọi lứa tuổi), K (Khán giả nhỏ tuổi dưới 13 tuổi có phụ huynh), T13 (Từ 13 tuổi trở lên), T16 (Từ 16 tuổi trở lên), T18 (Người trưởng thành từ 18 tuổi có cảnh báo tâm lý/hành động), và C (Nội dung cấm phát hành). Bạn có thể xem chi tiết tại trang Tiêu Chuẩn Phát Sóng (/standards).',
    tags: ['độ tuổi', 'phân loại', 'rating', 't13', 't18'],
  },
  // ── Live Studio (Dành cho Staff) ───────────────────────────
  {
    id: 'faq-4',
    category: 'studio',
    question: 'Làm thế nào để sử dụng Live Studio để tự ghi hình hoặc phát trực tiếp?',
    answer:
      'Tài khoản cần có quyền Đạo Diễn / Phát Thanh Viên (Role = STAFF hoặc ADMIN). Bạn vào mục "Studio" trên thanh điều hướng để mở bàn điều khiển phát sóng. Tại đây bạn có thể chọn camera/mic, ghi hình trực tiếp (Self-Recording) hoặc tải lên video nguồn qua cổng Cloudinary Signed Direct Upload an toàn.',
    tags: ['studio', 'staff', 'ghi hình', 'livestream', 'cloudinary'],
  },
  {
    id: 'faq-5',
    category: 'studio',
    question: 'Cơ chế phát hiện xung đột lịch EPG (Schedule Conflict) hoạt động như thế nào?',
    answer:
      'Khi Đạo diễn tạo hoặc chỉnh sửa khung giờ phát sóng cho một chương trình, backend NestJS sẽ chạy thuật toán kiểm tra giao thoa thời gian (Start Time -> End Time) trên cùng kênh. Nếu có chương trình khác đã chiếm khung giờ này, hệ thống sẽ trả về lỗi HTTP 409 Conflict và từ chối lưu nhằm bảo vệ tính toàn vẹn 24/7 của lịch phát.',
    tags: ['xung đột', 'conflict', 'epg', '409', 'lịch'],
  },
  {
    id: 'faq-6',
    category: 'studio',
    question: 'Động cơ AI Curator thẩm định video như thế nào trước khi phát sóng?',
    answer:
      'AI Curator vận hành cơ chế thẩm định kép (Dual-Mode): Lớp Fast Heuristics phản hồi trong 40ms để kiểm tra từ khóa cấm và vi phạm cơ bản; kết hợp mô hình Deep Multi-Model LLM phân tích hình ảnh, cảm xúc và âm thanh. Các báo cáo kiểm duyệt được lưu trữ trong cơ sở dữ liệu telemetry và hiển thị chi tiết tại Dashboard kiểm duyệt (/studio/curator/dashboard).',
    tags: ['ai curator', 'kiểm duyệt', 'telemetry', 'dual-mode'],
  },
  // ── Gói Premium & Thanh toán ───────────────────────────────
  {
    id: 'faq-7',
    category: 'billing',
    question: 'Gói thành viên Premium có những quyền lợi gì vượt trội?',
    answer:
      'Thành viên Premium được mở khóa luồng phát sóng chuẩn 4K Ultra HD 60fps, hỗ trợ âm thanh vòm Dolby Atmos 5.1, không có quảng cáo tài trợ và truy cập không giới hạn vào toàn bộ kho lưu trữ Cloud VOD ghi lại từ các kênh truyền hình.',
    tags: ['premium', 'quyền lợi', '4k', 'dolby', 'vod'],
  },
  {
    id: 'faq-8',
    category: 'billing',
    question: 'Làm thế nào để thanh toán gói Premium và cách hủy gia hạn định kỳ?',
    answer:
      'Trên ứng dụng di động Flutter, bạn có thể đăng ký gói thông qua Google Play In-App Billing (hỗ trợ Momo, Thẻ tín dụng, Viettel Telecom...). Bạn có thể hủy gia hạn định kỳ bất kỳ lúc nào bằng cách vào Google Play Store -> Thanh toán & gói thuê bao -> OmniCast -> Hủy gói thuê bao ít nhất 24 giờ trước kỳ thanh toán mới.',
    tags: ['thanh toán', 'google play', 'hủy gói', 'gia hạn', 'momo'],
  },
  // ── Kỹ thuật & Sự cố ───────────────────────────────────────
  {
    id: 'faq-9',
    category: 'tech',
    question: 'Ứng dụng di động Flutter có hỗ trợ xem khi không có mạng (Offline Mode) không?',
    answer:
      'Có. Ứng dụng di động OmniCast tích hợp hệ thống bộ nhớ đệm đa tầng (Multi-tier Cache) lưu trữ danh sách kênh, lịch EPG trong ngày và thông tin chương trình cục bộ vào SQLite/SharedPreferences. Khi mất kết nối Internet, bạn vẫn có thể tra cứu lịch phát và các thông tin đã lưu trước đó.',
    tags: ['offline', 'flutter', 'sqlite', 'cache', 'mất mạng'],
  },
  {
    id: 'faq-10',
    category: 'tech',
    question: 'Mã lỗi ERR_STREAM_TIMEOUT hoặc màn hình đen trên trình phát có ý nghĩa gì?',
    answer:
      'Lỗi này thường xảy ra khi đường truyền Internet quốc tế bị gián đoạn hoặc CDN tạm thời mất kết nối tới nguồn phát. Hệ thống OmniCast có cơ chế tự động chuyển hướng sang CDN dự phòng trong 3 giây. Nếu màn hình không tự tải lại, vui lòng bấm nút "Tải lại luồng" (Reload Stream) trên góc phải trình phát.',
    tags: ['lỗi', 'màn hình đen', 'timeout', 'stream', 'sửa lỗi'],
  },
  // ── Bảo mật & Tài khoản ────────────────────────────────────
  {
    id: 'faq-11',
    category: 'security',
    question: 'Tôi bị quên mật khẩu thì lấy lại quyền truy cập tài khoản như thế nào?',
    answer:
      'Bạn truy cập trang Quên Mật Khẩu (/forgot-password), nhập email đã đăng ký. Hệ thống backend sẽ tạo mã thông báo xác thực một lần (Reset Token). Bạn nhập mã này cùng mật khẩu mới để kích hoạt lại tài khoản tức thì.',
    tags: ['quên mật khẩu', 'reset password', 'token', 'tài khoản'],
  },
  {
    id: 'faq-12',
    category: 'security',
    question: 'Tính năng Đăng xuất đa thiết bị (Multi-Device Logout) hoạt động ra sao?',
    answer:
      'Khi bạn vào Hồ sơ cá nhân và chọn "Đăng xuất tất cả thiết bị", backend NestJS sẽ thu hồi toàn bộ Refresh Token của tài khoản đó. Bất kỳ phiên làm việc nào trên máy tính, điện thoại khác sẽ bị vô hiệu hóa ngay trong chu kỳ xác thực tiếp theo, giúp bảo vệ an toàn tối đa nếu bạn nghi ngờ tài khoản bị lộ.',
    tags: ['đăng xuất', 'bảo mật', 'multi-device', 'refresh token'],
  },
];

const ERROR_CODES = [
  {
    code: 'ERR_STREAM_TIMEOUT',
    meaning: 'Hết thời gian chờ kết nối luồng phát',
    fix: 'Kiểm tra đường truyền Internet hoặc nhấn F5 để tải lại CDN dự phòng.',
  },
  {
    code: 'HTTP_409_CONFLICT',
    meaning: 'Xung đột khung giờ lịch chiếu trên kênh EPG',
    fix: 'Chỉ xảy ra ở tài khoản Staff. Cần chọn khung giờ không giao thoa với chương trình khác.',
  },
  {
    code: 'AUTH_TOKEN_EXPIRED',
    meaning: 'Phiên đăng nhập đã hết hạn',
    fix: 'Hệ thống tự động gia hạn token. Nếu thất bại, vui lòng đăng nhập lại.',
  },
  {
    code: 'PAYMENT_PENDING_VERIFY',
    meaning: 'Biên lai thanh toán đang chờ xác thực',
    fix: 'Biên lai Google Play được xác thực tự động trong 30-60 giây sau khi ngân hàng trừ tiền.',
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [expandedFaq, setExpandedFaq] = React.useState<string | null>('faq-1');

  // Support ticket form state
  const [ticketName, setTicketName] = React.useState('');
  const [ticketEmail, setTicketEmail] = React.useState('');
  const [ticketContent, setTicketContent] = React.useState('');
  const [ticketSubmitted, setTicketSubmitted] = React.useState(false);

  const filteredFaqs = FAQ_ITEMS.filter((item) => {
    const matchesCategory =
      selectedCategory === 'all' || item.category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q) ||
      item.tags.some((tag) => tag.toLowerCase().includes(q));
    return matchesCategory && matchesSearch;
  });

  const handleSubmitTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketEmail.trim() || !ticketContent.trim()) return;
    setTicketSubmitted(true);
    setTimeout(() => {
      setTicketName('');
      setTicketEmail('');
      setTicketContent('');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050810] via-[#080d1a] to-[#04060c] text-slate-200">
      {/* ── Top Bar ──────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.08] bg-[#070b14]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-cyan-300 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Về trang chủ</span>
            </Link>
            <span className="text-slate-700">/</span>
            <span className="text-xs font-mono font-medium text-cyan-400">
              Trung Tâm Trợ Giúp
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/docs"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition"
            >
              <BookOpen className="h-3.5 w-3.5 text-cyan-400" />
              <span>Tài liệu kỹ thuật (/docs)</span>
            </Link>
            <Link
              href="/terms"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/[0.08] hover:text-white transition"
            >
              <Scale className="h-3.5 w-3.5 text-purple-400" />
              <span>Pháp lý</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-14 space-y-12">
        {/* ── Hero Search Banner ─────────────────────────────────── */}
        <section className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/30 px-3.5 py-1 text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
            <LifeBuoy className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '8s' }} />
            OmniCast Help & Support Portal · 24/7
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text">
            Chúng tôi có thể giúp gì cho bạn?
          </h1>
          <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Tra cứu nhanh giải pháp kỹ thuật, hướng dẫn sử dụng tính năng và quy trình phát sóng trên
            hệ thống truyền hình trực tuyến OmniCast.
          </p>

          {/* Search Box */}
          <div className="pt-2">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nhập từ khóa tìm kiếm (ví dụ: giật lag, epg, 4k, studio, quên mật khẩu)..."
                className="w-full pl-12 pr-4 py-3 text-sm rounded-2xl bg-slate-900/90 border border-white/15 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 shadow-xl"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-3 text-xs text-slate-500 hover:text-slate-300 px-2 py-0.5 rounded bg-white/[0.06]"
                >
                  Xóa
                </button>
              )}
            </div>

            {/* Quick Keyword Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 pt-3 text-xs text-slate-400">
              <span className="text-slate-600 font-mono text-[11px]">Từ khóa phổ biến:</span>
              {['Khắc phục giật lag', 'Lịch EPG 24/7', 'Gói Premium', 'Live Studio', 'AI Curator'].map(
                (keyword) => (
                  <button
                    key={keyword}
                    onClick={() => setSearchQuery(keyword)}
                    className="px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.03] hover:bg-cyan-500/10 hover:border-cyan-500/30 hover:text-cyan-300 transition"
                  >
                    {keyword}
                  </button>
                ),
              )}
            </div>
          </div>
        </section>

        {/* ── 6 Core Support Category Cards ──────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div
            onClick={() => setSelectedCategory('viewer')}
            className={`cursor-pointer rounded-2xl border p-5 transition-all duration-200 group ${
              selectedCategory === 'viewer'
                ? 'border-cyan-500/50 bg-cyan-950/30 shadow-lg shadow-cyan-950/40'
                : 'border-white/[0.08] bg-slate-900/60 hover:border-white/20 hover:bg-slate-900/90'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                <Tv className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Xem Luồng & Lịch EPG</h3>
                <span className="text-[11px] font-mono text-cyan-400">25 Kênh sóng 24/7</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cách tra cứu lịch phát, bật âm thanh Dolby 5.1, chuyển đổi luồng phát và thêm vào
              Watchlist yêu thích.
            </p>
          </div>

          <div
            onClick={() => setSelectedCategory('tech')}
            className={`cursor-pointer rounded-2xl border p-5 transition-all duration-200 group ${
              selectedCategory === 'tech'
                ? 'border-purple-500/50 bg-purple-950/30 shadow-lg shadow-purple-950/40'
                : 'border-white/[0.08] bg-slate-900/60 hover:border-white/20 hover:bg-slate-900/90'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Ứng Dụng Flutter Mobile</h3>
                <span className="text-[11px] font-mono text-purple-400">Android & iOS</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bật thông báo đẩy FCM nhắc trước 15 phút, tính năng Offline Caching và vuốt xem kênh tiện
              lợi.
            </p>
          </div>

          <div
            onClick={() => setSelectedCategory('studio')}
            className={`cursor-pointer rounded-2xl border p-5 transition-all duration-200 group ${
              selectedCategory === 'studio'
                ? 'border-amber-500/50 bg-amber-950/30 shadow-lg shadow-amber-950/40'
                : 'border-white/[0.08] bg-slate-900/60 hover:border-white/20 hover:bg-slate-900/90'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
                <Radio className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Live Studio (Staff)</h3>
                <span className="text-[11px] font-mono text-amber-400">Đạo diễn phát sóng</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tải video qua Cloudinary Direct Upload, lên lịch chống trùng giờ và kiểm duyệt với AI
              Curator.
            </p>
          </div>

          <div
            onClick={() => setSelectedCategory('billing')}
            className={`cursor-pointer rounded-2xl border p-5 transition-all duration-200 group ${
              selectedCategory === 'billing'
                ? 'border-emerald-500/50 bg-emerald-950/30 shadow-lg shadow-emerald-950/40'
                : 'border-white/[0.08] bg-slate-900/60 hover:border-white/20 hover:bg-slate-900/90'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                <Gem className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Gói Hội Viên Premium</h3>
                <span className="text-[11px] font-mono text-emerald-400">Chuẩn 4K Ultra HD</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Quyền lợi tài khoản Premium, thanh toán an toàn qua Google Play Billing và quản lý chu
              kỳ gia hạn.
            </p>
          </div>

          <div
            onClick={() => setSelectedCategory('security')}
            className={`cursor-pointer rounded-2xl border p-5 transition-all duration-200 group ${
              selectedCategory === 'security'
                ? 'border-rose-500/50 bg-rose-950/30 shadow-lg shadow-rose-950/40'
                : 'border-white/[0.08] bg-slate-900/60 hover:border-white/20 hover:bg-slate-900/90'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/20">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Bảo Mật & Đăng Nhập</h3>
                <span className="text-[11px] font-mono text-rose-400">JWT & Argon2</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Đặt lại mật khẩu quên, phân quyền RBAC 4 vai trò và bảo vệ tài khoản với đăng xuất đa
              thiết bị.
            </p>
          </div>

          <div
            onClick={() => setSelectedCategory('all')}
            className={`cursor-pointer rounded-2xl border p-5 transition-all duration-200 group ${
              selectedCategory === 'all'
                ? 'border-cyan-500/50 bg-cyan-950/30 shadow-lg shadow-cyan-950/40'
                : 'border-white/[0.08] bg-slate-900/60 hover:border-white/20 hover:bg-slate-900/90'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Xem Toàn Bộ Câu Hỏi</h3>
                <span className="text-[11px] font-mono text-slate-400">Tất cả danh mục</span>
              </div>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hiển thị danh sách đầy đủ tất cả câu hỏi thường gặp và tài liệu hỗ trợ nhanh trên hệ
              thống.
            </p>
          </div>
        </section>

        {/* ── Interactive FAQ Section ────────────────────────────── */}
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-white/[0.08]">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-cyan-400" />
                Câu Hỏi Thường Gặp (FAQ)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Hiển thị {filteredFaqs.length} câu hỏi phù hợp với tiêu chí lọc.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              {[
                { key: 'all', label: 'Tất cả' },
                { key: 'viewer', label: 'Khán giả' },
                { key: 'studio', label: 'Live Studio' },
                { key: 'billing', label: 'Premium' },
                { key: 'tech', label: 'Kỹ thuật' },
                { key: 'security', label: 'Bảo mật' },
              ].map((btn) => (
                <button
                  key={btn.key}
                  onClick={() => setSelectedCategory(btn.key)}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    selectedCategory === btn.key
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-white'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-white/[0.08] bg-slate-900/40">
                <AlertCircle className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                <p className="text-sm text-slate-400">
                  Không tìm thấy câu hỏi phù hợp với từ khóa &ldquo;{searchQuery}&rdquo;.
                </p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="mt-3 text-xs text-cyan-400 hover:underline"
                >
                  Đặt lại bộ lọc
                </button>
              </div>
            ) : (
              filteredFaqs.map((faq) => {
                const isExpanded = expandedFaq === faq.id;
                return (
                  <div
                    key={faq.id}
                    className="rounded-2xl border border-white/[0.08] bg-slate-900/70 overflow-hidden transition-all duration-200"
                  >
                    <button
                      onClick={() => setExpandedFaq(isExpanded ? null : faq.id)}
                      className="w-full p-4 sm:p-5 text-left flex items-start justify-between gap-4 hover:bg-white/[0.02] transition"
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-xs text-cyan-400 mt-0.5 font-bold">
                          Q.
                        </span>
                        <span className="text-sm sm:text-base font-bold text-white leading-snug">
                          {faq.question}
                        </span>
                      </div>
                      <ChevronDown
                        className={`h-5 w-5 text-slate-400 flex-shrink-0 transition-transform duration-200 ${
                          isExpanded ? 'rotate-180 text-cyan-300' : ''
                        }`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-1 border-t border-white/[0.05] text-xs sm:text-sm text-slate-300 leading-relaxed space-y-3 bg-slate-950/40">
                        <p>{faq.answer}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {faq.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.05] text-slate-400"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* ── Troubleshooting & Error Matrix ────────────────────── */}
        <section className="rounded-2xl border border-white/[0.08] bg-slate-900/70 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Zap className="h-5 w-5" />
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Bảng Tra Cứu Sự Cố & Mã Lỗi Nhanh
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Nếu bạn gặp thông báo lỗi hiển thị trên màn hình phát sóng hoặc khi gửi yêu cầu API, đối
            chiếu các mã lỗi thường gặp sau:
          </p>

          <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-800/40">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="border-b border-slate-700 bg-slate-800/80 font-mono uppercase text-slate-400 text-[11px]">
                <tr>
                  <th className="px-4 py-3">Mã lỗi</th>
                  <th className="px-4 py-3">Ý nghĩa sự cố</th>
                  <th className="px-4 py-3">Cách xử lý tức thì</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {ERROR_CODES.map((err) => (
                  <tr key={err.code}>
                    <td className="px-4 py-3 font-mono font-bold text-amber-300 whitespace-nowrap">
                      {err.code}
                    </td>
                    <td className="px-4 py-3 text-slate-200">{err.meaning}</td>
                    <td className="px-4 py-3 text-slate-400">{err.fix}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── System Status Banner ────────────────────────────────── */}
        <section className="rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-900/60 to-slate-900/60 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">Hệ Thống Đang Vận Hành Bình Thường</h3>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded border border-emerald-500/30">
                  99.98% Uptime
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Tất cả 25 kênh sóng truyền hình, cụm NestJS API Gateway và Bunny CDN đang hoạt động
                ổn định.
              </p>
            </div>
          </div>
          <a
            href="https://status.omnicast.tv"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.05] text-xs font-semibold text-slate-200 hover:bg-white/10 transition flex-shrink-0"
          >
            Trang giám sát live
            <ExternalLink className="h-3 w-3" />
          </a>
        </section>

        {/* ── Contact Channels & Ticket Form ───────────────────────── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Support Channels Info */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-xl font-bold text-white">Kênh Hỗ Trợ Trực Tiếp</h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Bạn vẫn chưa tìm được giải đáp thỏa đáng? Đội ngũ kỹ thuật viên và điều phối viên phát
              sóng OmniCast luôn sẵn sàng hỗ trợ 24/7.
            </p>

            <div className="space-y-3 pt-2">
              <a
                href="mailto:support@omnicast.tv"
                className="flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.08] bg-slate-900/60 hover:border-cyan-500/30 hover:bg-slate-900 transition group"
              >
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                  <Mail className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Email Kỹ Thuật & Dịch Vụ</div>
                  <div className="text-xs font-mono text-cyan-400">support@omnicast.tv</div>
                </div>
              </a>

              <a
                href="tel:02873008888"
                className="flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.08] bg-slate-900/60 hover:border-emerald-500/30 hover:bg-slate-900 transition group"
              >
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <PhoneCall className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Tổng Đài Trực Tuyến 24/7</div>
                  <div className="text-xs font-mono text-emerald-400">(+84) 28 7300 8888</div>
                </div>
              </a>

              <Link
                href="/terms"
                className="flex items-center gap-3 p-3.5 rounded-xl border border-white/[0.08] bg-slate-900/60 hover:border-purple-500/30 hover:bg-slate-900 transition group"
              >
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                  <Scale className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Ban Pháp Chế & Bản Quyền</div>
                  <div className="text-xs font-mono text-purple-400">dmca@omnicast.tv</div>
                </div>
              </Link>
            </div>
          </div>

          {/* Quick Ticket Form */}
          <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-slate-900/70 p-6 sm:p-8 backdrop-blur-md">
            <h3 className="text-lg font-bold text-white mb-1 flex items-center gap-2">
              <Send className="h-4 w-4 text-cyan-400" />
              Gửi Yêu Cầu Hỗ Trợ Khẩn Cấp
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Điền thông tin sự cố, chuyên viên sẽ phản hồi qua email của bạn trong vòng tối đa 2 giờ.
            </p>

            {ticketSubmitted ? (
              <div className="p-6 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                <h4 className="font-bold text-white text-base">Đã Tiếp Nhận Yêu Cầu Thành Công</h4>
                <p className="text-xs text-slate-300">
                  Mã số sự cố đã được gửi về email của bạn. Đội ngũ OmniCast đang xử lý.
                </p>
                <button
                  onClick={() => setTicketSubmitted(false)}
                  className="mt-3 text-xs text-cyan-400 font-semibold hover:underline"
                >
                  Gửi thêm yêu cầu khác
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitTicket} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium">Họ và tên của bạn</label>
                    <input
                      type="text"
                      required
                      value={ticketName}
                      onChange={(e) => setTicketName(e.target.value)}
                      placeholder="Nguyễn Văn A"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-slate-300 font-medium">Email nhận phản hồi</label>
                    <input
                      type="email"
                      required
                      value={ticketEmail}
                      onChange={(e) => setTicketEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-slate-300 font-medium">
                    Mô tả chi tiết sự cố bạn đang gặp
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={ticketContent}
                    onChange={(e) => setTicketContent(e.target.value)}
                    placeholder="Mô tả cụ thể kênh sóng, thời gian xảy ra lỗi hoặc vấn đề tài khoản..."
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 font-bold hover:opacity-90 transition flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Gửi yêu cầu hỗ trợ
                </button>
              </form>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
