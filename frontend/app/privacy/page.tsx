// ============================================================
// OmniCast · Chính Sách Quyền Riêng Tư (Privacy Policy)
// ============================================================

import type { Metadata } from 'next';
import { LegalPageLayout, type TocItem } from '@/components/legal/legal-page-layout';
import {
  ShieldCheck,
  Eye,
  Database,
  Lock,
  Share2,
  UserCheck,
  Cookie,
  Mail,
  Info,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Chính Sách Quyền Riêng Tư · OmniCast',
  description:
    'Cam kết bảo vệ dữ liệu cá nhân, tuân thủ Nghị định 13/2023/NĐ-CP và tiêu chuẩn an toàn thông tin của OmniCast Network.',
};

const PRIVACY_TOC: TocItem[] = [
  { id: 'sec-1', title: '1. Nguyên Tắc Bảo Vệ Dữ Liệu & Khung Pháp Lý', badge: 'Nghị định 13' },
  { id: 'sec-2', title: '2. Các Loại Dữ Liệu Được Thu Thập' },
  { id: 'sec-3', title: '3. Mục Đích & Căn Cứ Xử Lý Dữ Liệu' },
  { id: 'sec-4', title: '4. Biện Pháp Kỹ Thuật Bảo Mật & Mã Hóa', badge: 'TLS 1.3 / Argon2' },
  { id: 'sec-5', title: '5. Chia Sẻ Thông Tin Với Nhà Cung Cấp Hạ Tầng' },
  { id: 'sec-6', title: '6. Quyền Của Khán Giả Đối Với Dữ Liệu Cá Nhân', badge: 'Quyền của bạn' },
  { id: 'sec-7', title: '7. Lưu Trữ Cục Bộ (Local Storage) & Preferences' },
  { id: 'sec-8', title: '8. Kênh Liên Hệ Cán Bộ Bảo Vệ Dữ Liệu (DPO)' },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      currentTab="privacy"
      title="Chính Sách Quyền Riêng Tư"
      subtitle="OmniCast Network cam kết tôn trọng quyền riêng tư và bảo vệ tối đa dữ liệu cá nhân của mọi khán giả, đạo diễn phát sóng và thành viên theo các tiêu chuẩn an ninh mạng nghiêm ngặt nhất."
      lastUpdated="16 Tháng 10, 2026"
      version="v2.4"
      toc={PRIVACY_TOC}
    >
      {/* ── Key Highlights Callout ────────────────────────────── */}
      <section className="rounded-2xl border border-purple-500/20 bg-purple-950/20 p-5 sm:p-6 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-purple-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-xs sm:text-sm text-purple-200/90 leading-relaxed">
            <h2 className="font-bold text-white text-sm sm:text-base">
              Cam kết cốt lõi về quyền riêng tư:
            </h2>
            <p>
              OmniCast <strong>tuyệt đối không bán dữ liệu cá nhân</strong> của bạn cho bất kỳ bên
              thứ ba nào vì mục đích quảng cáo hoặc tiếp thị chéo. Toàn bộ dữ liệu truyền tải đều được
              mã hóa bảo mật hai đầu, và bạn có toàn quyền yêu cầu xem, chỉnh sửa hoặc xóa vĩnh viễn
              tài khoản cùng dữ liệu lịch sử xem bất kỳ lúc nào.
            </p>
          </div>
        </div>
      </section>

      {/* ── 1. Khung pháp lý ────────────────────────────────────── */}
      <article
        id="sec-1"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-purple-400">
          <ShieldCheck className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            1. Nguyên Tắc Bảo Vệ Dữ Liệu & Khung Pháp Lý
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Chính sách này được xây dựng trên cơ sở tuân thủ đầy đủ các quy định của:{' '}
          <strong>Nghị định 13/2023/NĐ-CP</strong> của Chính phủ Việt Nam về Bảo vệ dữ liệu cá nhân,{' '}
          <strong>Luật An ninh mạng 2018</strong>, và tham chiếu các tiêu chuẩn bảo mật quốc tế
          (ISO/IEC 27001, GDPR).
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">
          Chúng tôi chỉ thu thập dữ liệu ở mức tối thiểu cần thiết nhằm duy trì trải nghiệm truyền hình
          trực tuyến thông suốt, tối ưu hóa băng thông luồng phát theo thiết bị và gửi thông báo lịch
          phát sóng kịp thời.
        </p>
      </article>

      {/* ── 2. Dữ liệu thu thập ─────────────────────────────────── */}
      <article
        id="sec-2"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-purple-400">
          <Database className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            2. Các Loại Dữ Liệu Được Thu Thập
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
          <div className="p-4 rounded-xl border border-slate-700/60 bg-slate-800/40 space-y-2">
            <h3 className="font-bold text-purple-300 flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Dữ liệu bạn trực tiếp cung cấp:
            </h3>
            <ul className="space-y-1 text-slate-400 list-disc pl-4">
              <li>Địa chỉ email đăng ký và tên hiển thị (Nickname).</li>
              <li>Mật khẩu (đã được băm một chiều an toàn bằng Argon2).</li>
              <li>Danh sách kênh yêu thích và lịch theo dõi Watchlist.</li>
              <li>Nội dung bình luận và các biểu tượng cảm xúc gửi trong luồng live.</li>
            </ul>
          </div>
          <div className="p-4 rounded-xl border border-slate-700/60 bg-slate-800/40 space-y-2">
            <h3 className="font-bold text-cyan-300 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Dữ liệu kỹ thuật thu thập tự động:
            </h3>
            <ul className="space-y-1 text-slate-400 list-disc pl-4">
              <li>Mã thông báo thiết bị FCM Device Token (phục vụ thông báo đẩy).</li>
              <li>Địa chỉ IP (dùng ẩn danh để xác định chất lượng đường truyền CDN).</li>
              <li>Thông số thiết bị: phiên bản hệ điều hành (Android/iOS/Web), độ phân giải màn hình.</li>
              <li>Thời lượng xem và chỉ số đo trễ phát sóng (RTT Latency).</li>
            </ul>
          </div>
        </div>
      </article>

      {/* ── 3. Mục đích xử lý ──────────────────────────────────── */}
      <article
        id="sec-3"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-purple-400">
          <Eye className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            3. Mục Đích & Căn Cứ Xử Lý Dữ Liệu
          </h2>
        </div>
        <ul className="space-y-2 text-sm text-slate-300 pl-4 list-disc marker:text-purple-400">
          <li>
            <strong>Cung cấp dịch vụ phát sóng trực tuyến 24/7:</strong> Định tuyến đường truyền đến
            CDN gần bạn nhất để hạn chế tối đa tình trạng giật lag hay giảm chất lượng video.
          </li>
          <li>
            <strong>Gửi thông báo nhắc giờ phát sóng:</strong> Nhắc nhở trước 15 phút khi chương
            trình trong Watchlist của bạn chuẩn bị phát sóng qua thông báo đẩy FCM.
          </li>
          <li>
            <strong>Gợi ý nội dung thông minh với AI Curator:</strong> Phân tích xu hướng xem tổng hợp
            để đưa ra các chương trình thịnh hành phù hợp mà không định danh cá nhân cụ thể.
          </li>
          <li>
            <strong>Bảo vệ an ninh mạng & Phát hiện bất thường:</strong> Ghi log kiểm toán gRPC Audit
            Logger để phát hiện các cuộc tấn công chiếm đoạt tài khoản hoặc xâm phạm hệ thống.
          </li>
        </ul>
      </article>

      {/* ── 4. Kỹ thuật bảo mật ─────────────────────────────────── */}
      <article
        id="sec-4"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-purple-400">
          <Lock className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            4. Biện Pháp Kỹ Thuật Bảo Mật & Mã Hóa
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          OmniCast áp dụng mô hình phòng thủ theo chiều sâu (Defense-in-Depth) với các tiêu chuẩn kỹ
          thuật tiên tiến:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
            <span className="font-bold text-cyan-300 font-mono">TLS 1.3 / HTTPS</span>
            <p className="text-slate-400">
              Mã hóa toàn bộ lưu lượng dữ liệu trao đổi giữa Client và NestJS API Gateway.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
            <span className="font-bold text-purple-300 font-mono">Argon2 Password Hash</span>
            <p className="text-slate-400">
              Mật khẩu được băm một chiều với độ phức tạp cao, chống giải mã rainbow table.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
            <span className="font-bold text-emerald-300 font-mono">gRPC Audit Isolation</span>
            <p className="text-slate-400">
              Nhật ký kiểm toán được tách biệt trong microservice riêng biệt, bất biến và an toàn.
            </p>
          </div>
        </div>
      </article>

      {/* ── 5. Chia sẻ thông tin ─────────────────────────────────── */}
      <article
        id="sec-5"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-purple-400">
          <Share2 className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            5. Chia Sẻ Thông Tin Với Nhà Cung Cấp Hạ Tầng
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Dữ liệu của bạn chỉ được chuyển giao trong phạm vi hạ tầng kỹ thuật cần thiết để phục vụ
          phát sóng, bao gồm:
        </p>
        <ul className="space-y-1.5 text-sm text-slate-300 pl-4 list-disc marker:text-purple-400">
          <li>
            <strong>Bunny Stream & Cloudinary:</strong> Cung cấp mạng phân phối nội dung (CDN) lưu
            trữ và phát video trực tuyến.
          </li>
          <li>
            <strong>Google Firebase Cloud Messaging (FCM):</strong> Chuyển phát các gói tin thông
            báo đẩy đến thiết bị di động của bạn.
          </li>
          <li>
            <strong>Supabase Cloud:</strong> Cơ sở dữ liệu PostgreSQL bảo mật đạt chuẩn SOC 2 Type II
            lưu trữ thông tin tài khoản và danh sách phát.
          </li>
        </ul>
        <p className="text-sm text-slate-400 italic pt-2">
          * Chúng tôi có văn bản cam kết bảo mật dữ liệu nghiêm ngặt (DPA) với tất cả các đối tác hạ
          tầng nêu trên.
        </p>
      </article>

      {/* ── 6. Quyền của người dùng ─────────────────────────────── */}
      <article
        id="sec-6"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-purple-400">
          <UserCheck className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            6. Quyền Của Khán Giả Đối Với Dữ Liệu Cá Nhân
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Theo quy định của Nghị định 13/2023/NĐ-CP, bạn có các quyền hợp pháp sau:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
            <span className="font-bold text-white">Quyền Biết & Quyền Truy Cập:</span>
            <p className="text-slate-400">
              Xem lại toàn bộ thông tin cá nhân của bạn trong trang Cài Đặt Hồ Sơ cá nhân.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
            <span className="font-bold text-white">Quyền Chỉnh Sửa & Cập Nhật:</span>
            <p className="text-slate-400">
              Tự do sửa đổi tên hiển thị, mật khẩu và tùy chọn nhận bản tin bất kỳ lúc nào.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
            <span className="font-bold text-white">Quyền Xóa Bỏ (Right to be Forgotten):</span>
            <p className="text-slate-400">
              Yêu cầu xóa vĩnh viễn tài khoản và toàn bộ dữ liệu lịch sử liên kết khỏi máy chủ.
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
            <span className="font-bold text-white">Quyền Rút Lại Sự Đồng Ý:</span>
            <p className="text-slate-400">
              Hủy nhận thông báo hoặc hủy đăng ký nhận email bản tin với một cú nhấp chuột.
            </p>
          </div>
        </div>
      </article>

      {/* ── 7. Cookies & Local storage ──────────────────────────── */}
      <article
        id="sec-7"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-purple-400">
          <Cookie className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            7. Lưu Trữ Cục Bộ (Local Storage) & Preferences
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          OmniCast <strong>không sử dụng cookie theo dõi hành vi chéo (Third-party tracking cookies)</strong>{' '}
          của mạng lưới quảng cáo. Chúng tôi chỉ sử dụng bộ nhớ cục bộ trình duyệt (Local Storage) và
          Token Storage an toàn trên ứng dụng di động để lưu trữ:
        </p>
        <ul className="space-y-1.5 text-sm text-slate-300 pl-4 list-disc marker:text-purple-400">
          <li>Mã thông báo truy cập phiên làm việc hiện tại (Auth Token).</li>
          <li>Cờ đánh dấu đã hoàn thành màn hình giới thiệu (Onboarding Complete flag).</li>
          <li>Cài đặt ngôn ngữ (Tiếng Việt / English) và mức âm lượng ưu tiên của trình phát.</li>
        </ul>
      </article>

      {/* ── 8. DPO Contact ──────────────────────────────────────── */}
      <article
        id="sec-8"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-purple-400">
          <Mail className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            8. Kênh Liên Hệ Cán Bộ Bảo Vệ Dữ Liệu (DPO)
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Nếu bạn có bất kỳ câu hỏi nào về chính sách quyền riêng tư này hoặc muốn thực hiện các
          quyền của chủ thể dữ liệu (như yêu cầu trích xuất dữ liệu hoặc xóa tài khoản), xin vui lòng
          liên hệ:
        </p>
        <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/20 text-xs sm:text-sm space-y-1.5">
          <p>
            <strong>Cán bộ Bảo vệ Dữ liệu (Data Protection Officer):</strong> OmniCast Legal &
            Security Council
          </p>
          <p>
            <strong>Email tiếp nhận:</strong>{' '}
            <a
              href="mailto:dpo@omnicast.tv"
              className="text-purple-300 font-mono font-bold hover:underline"
            >
              dpo@omnicast.tv
            </a>{' '}
            hoặc{' '}
            <a
              href="mailto:privacy@omnicast.tv"
              className="text-cyan-300 font-mono font-bold hover:underline"
            >
              privacy@omnicast.tv
            </a>
          </p>
          <p>
            <strong>Thời hạn giải quyết yêu cầu:</strong> Trong vòng 72 giờ làm việc kể từ thời điểm
            nhận được thư xác thực.
          </p>
        </div>
      </article>
    </LegalPageLayout>
  );
}
