// ============================================================
// OmniCast · Điều Khoản Dịch Vụ (Terms of Service)
// ============================================================

import type { Metadata } from 'next';
import { LegalPageLayout, type TocItem } from '@/components/legal/legal-page-layout';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Lock,
  CreditCard,
  Server,
  Scale,
  Users,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Điều Khoản Dịch Vụ · OmniCast',
  description:
    'Các điều khoản và điều kiện pháp lý điều chỉnh việc truy cập và sử dụng nền tảng truyền hình trực tuyến OmniCast Network.',
};

const TERMS_TOC: TocItem[] = [
  { id: 'chap-1', title: '1. Chấp Thuận Điều Khoản & Đối Tượng Áp Dụng', badge: 'Cốt lõi' },
  { id: 'chap-2', title: '2. Ma Trận Quyền Hạn RBAC & Quản Lý Tài Khoản', badge: 'Bảo mật' },
  { id: 'chap-3', title: '3. Quyền Sở Hữu Trí Tuệ & Giấy Phép Sử Dụng' },
  { id: 'chap-4', title: '4. Hành Vi Nghiêm Cấm & An Ninh Mạng', badge: 'Quan trọng' },
  { id: 'chap-5', title: '5. Đăng Ký Gói Premium & Cơ Chế Thanh Toán', badge: 'Billing' },
  { id: 'chap-6', title: '6. Cam Kết Uptime Dịch Vụ (SLA) & Miễn Trừ Trách Nhiệm' },
  { id: 'chap-7', title: '7. Chấm Dứt Dịch Vụ & Xử Lý Vi Phạm' },
  { id: 'chap-8', title: '8. Luật Áp Dụng & Giải Quyết Tranh Chấp' },
];

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout
      currentTab="terms"
      title="Điều Khoản Dịch Vụ"
      subtitle="Bản thỏa thuận dịch vụ chính thức xác lập quyền và trách nhiệm pháp lý giữa OmniCast Network và người sử dụng trên hệ thống Web và Ứng dụng Di động."
      lastUpdated="16 Tháng 10, 2026"
      version="v2.4"
      toc={TERMS_TOC}
    >
      {/* ── Key Highlights Callout ────────────────────────────── */}
      <section className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-5 sm:p-6 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-cyan-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-xs sm:text-sm text-cyan-200/90 leading-relaxed">
            <h2 className="font-bold text-white text-sm sm:text-base">
              Tóm tắt nhanh cho người dùng:
            </h2>
            <p>
              Bằng việc truy cập hoặc tạo tài khoản trên OmniCast, bạn đồng ý tuân thủ toàn bộ các
              quy định trong văn bản này. OmniCast cung cấp dịch vụ phát sóng trực tuyến 24/7 theo
              mô hình bảo vệ bản quyền kỹ thuật số (DRM) và áp dụng kiểm duyệt thông minh với AI
              Curator. Xin vui lòng đọc kỹ các mục trước khi sử dụng.
            </p>
          </div>
        </div>
      </section>

      {/* ── 1. Chấp thuận điều khoản ────────────────────────────── */}
      <article
        id="chap-1"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-cyan-400">
          <Scale className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            1. Chấp Thuận Điều Khoản & Đối Tượng Áp Dụng
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Điều khoản Dịch vụ này (sau đây gọi là &ldquo;Điều Khoản&rdquo;) điều chỉnh việc sử dụng
          toàn bộ dịch vụ, giao diện phát sóng, cổng API, ứng dụng web Next.js, ứng dụng di động
          Flutter và các kênh truyền dẫn nội dung thuộc quyền quản lý của{' '}
          <strong>OmniCast Network</strong> (sau đây gọi là &ldquo;OmniCast&rdquo;, &ldquo;Chúng
          tôi&rdquo;).
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">
          Khi bạn nhấp chọn &ldquo;Đồng ý điều khoản&rdquo;, đăng ký tài khoản, hoặc đơn giản là truy
          cập vào xem luồng phát sóng EPG trên OmniCast, bạn xác nhận rằng bạn đã đủ độ tuổi theo luật
          định (từ đủ 13 tuổi trở lên, hoặc có sự giám hộ hợp pháp của phụ huynh đối với nội dung
          phân loại K) và đồng ý chịu sự ràng buộc bởi các quy định này.
        </p>
      </article>

      {/* ── 2. RBAC & Tài khoản ─────────────────────────────────── */}
      <article
        id="chap-2"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-cyan-400">
          <Users className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            2. Ma Trận Quyền Hạn RBAC & Quản Lý Tài Khoản
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          OmniCast vận hành mô hình kiểm soát truy cập dựa trên vai trò (RBAC) nghiêm ngặt với 4 cấp
          độ bảo mật:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3.5 rounded-xl border border-slate-700/60 bg-slate-800/40 space-y-1">
            <span className="font-bold text-slate-300 uppercase tracking-wider font-mono text-[10px]">
              Cấp 0 · Khách Vãng Lai (GUEST)
            </span>
            <p className="text-slate-400">
              Xem lịch phát sóng EPG công khai, tìm kiếm cơ bản, xem video thử nghiệm có giới hạn.
            </p>
          </div>
          <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-950/20 space-y-1">
            <span className="font-bold text-cyan-400 uppercase tracking-wider font-mono text-[10px]">
              Cấp 2 · Khán Giả Thành Viên (VIEWER)
            </span>
            <p className="text-slate-400">
              Lưu Watchlist cá nhân, tương tác bình luận, nhận thông báo đẩy FCM nhắc lịch trước 15
              phút.
            </p>
          </div>
          <div className="p-3.5 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-1">
            <span className="font-bold text-purple-400 uppercase tracking-wider font-mono text-[10px]">
              Cấp 1 · Đạo Diễn / Phát Thanh Viên (STAFF)
            </span>
            <p className="text-slate-400">
              Sử dụng Live Studio, điều phối lịch EPG, chạy kiểm duyệt AI Curator và ghi hình Cloud
              VOD.
            </p>
          </div>
          <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-1">
            <span className="font-bold text-amber-400 uppercase tracking-wider font-mono text-[10px]">
              Cấp 3 · Quản Trị Hệ Thống (ADMIN)
            </span>
            <p className="text-slate-400">
              Toàn quyền quản lý người dùng, xem telemetry thời gian thực, điều phối microservice và
              audit logs.
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed pt-2">
          <strong>Bảo vệ phiên đăng nhập:</strong> Hệ thống sử dụng cặp mã thông báo JWT truy cập ngắn
          hạn và Refresh Token mã hóa lưu trữ an toàn. Bạn có nghĩa vụ bảo mật mật khẩu của mình và
          thông báo ngay cho OmniCast khi phát hiện bất kỳ dấu hiệu truy cập trái phép nào.
        </p>
      </article>

      {/* ── 3. Sở hữu trí tuệ ───────────────────────────────────── */}
      <article
        id="chap-3"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-cyan-400">
          <Lock className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            3. Quyền Sở Hữu Trí Tuệ & Giấy Phép Sử Dụng
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Tất cả các thành phần cấu thành OmniCast — bao gồm mã nguồn, kiến trúc gRPC, thuật toán AI
          Curator, thiết kế đồ họa Cyberpunk, biểu tượng các kênh truyền hình, và hệ thống giao diện
          người dùng — đều thuộc quyền sở hữu trí tuệ độc quyền của OmniCast Network hoặc các đối tác
          cấp phép hợp pháp.
        </p>
        <ul className="space-y-2 text-sm text-slate-300 pl-4 list-disc marker:text-cyan-400">
          <li>
            OmniCast cấp cho bạn một giấy phép cá nhân, có thể thu hồi, không thể chuyển nhượng và
            phi độc quyền để truy cập và xem các chương trình phát sóng phục vụ nhu cầu giải trí phi
            thương mại.
          </li>
          <li>
            Nghiêm cấm hành vi tái phát sóng, phát sóng thương mại công cộng tại các địa điểm có thu
            vé mà không có văn bản thỏa thuận bản quyền phát sóng thương mại từ OmniCast.
          </li>
        </ul>
      </article>

      {/* ── 4. Hành vi nghiêm cấm ───────────────────────────────── */}
      <article
        id="chap-4"
        className="rounded-2xl border border-rose-500/20 bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-rose-400">
          <ShieldAlert className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            4. Hành Vi Nghiêm Cấm & An Ninh Mạng
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Để bảo vệ tính toàn vẹn của nền tảng phát sóng, người dùng tuyệt đối không được thực hiện
          hoặc hỗ trợ người khác thực hiện các hành vi sau:
        </p>
        <div className="space-y-2 text-sm text-slate-300">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/20 border border-rose-500/20">
            <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Khai thác bẻ khóa (DRM Bypassing):</strong> Sử dụng công cụ thu phát lậu, trích
              xuất key giải mã luồng video CDN, hoặc reverse proxy các nguồn stream trực tiếp.
            </span>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/20 border border-rose-500/20">
            <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Tấn công từ chối dịch vụ (DDoS) & Spam API:</strong> Gửi request vượt ngưỡng
              rate-limit của hệ thống, quét lỗ hổng backend hoặc inject mã độc qua các form bình luận.
            </span>
          </div>
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-950/20 border border-rose-500/20">
            <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Phát ngôn thù hận & Xúc phạm:</strong> Đăng tải nội dung kích động bạo lực, vi
              phạm thuần phong mỹ tục hoặc quấy rối thành viên khác trong khu vực bình luận tương tác.
            </span>
          </div>
        </div>
      </article>

      {/* ── 5. Billing ─────────────────────────────────────────── */}
      <article
        id="chap-5"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-cyan-400">
          <CreditCard className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            5. Đăng Ký Gói Premium & Cơ Chế Thanh Toán
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Khán giả có thể nâng cấp lên tài khoản Premium để trải nghiệm luồng phát sóng chuẩn 4K
          Ultra HD, loại bỏ quảng cáo tài trợ và mở khóa toàn bộ kho lưu trữ Cloud VOD không giới hạn.
        </p>
        <ul className="space-y-2 text-sm text-slate-300 pl-4 list-disc marker:text-cyan-400">
          <li>
            <strong>Xử lý giao dịch:</strong> Các giao dịch trên ứng dụng di động được xử lý thông qua
            Google Play In-App Billing với biên lai thanh toán số được xác thực tức thì bởi backend
            OmniCast.
          </li>
          <li>
            <strong>Gia hạn & Hủy bỏ:</strong> Đăng ký tự động gia hạn theo chu kỳ hàng tháng hoặc
            hàng năm. Bạn có thể hủy gói đăng ký bất kỳ lúc nào trong cài đặt tài khoản Google Play
            hoặc cài đặt hồ sơ OmniCast ít nhất 24 giờ trước khi chu kỳ mới bắt đầu.
          </li>
        </ul>
      </article>

      {/* ── 6. SLA & Miễn trừ trách nhiệm ──────────────────────── */}
      <article
        id="chap-6"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-cyan-400">
          <Server className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            6. Cam Kết Uptime Dịch Vụ (SLA) & Miễn Trừ Trách Nhiệm
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          OmniCast hướng tới mục tiêu duy trì tỷ lệ sẵn sàng dịch vụ tối thiểu <strong>99.9%</strong>{' '}
          thông qua mạng lưới CDN toàn cầu (Bunny Stream & Cloudinary) và cụm máy chủ NestJS phân
          tán.
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">
          Tuy nhiên, chúng tôi không chịu trách nhiệm đối với sự gián đoạn luồng phát sóng phát sinh
          từ: (a) Lỗi kết nối mạng của nhà cung cấp dịch vụ Internet (ISP) phía người dùng; (b) Các sự
          kiện bất khả kháng thiên tai, đứt cáp quang biển quốc tế; (c) Các đợt bảo trì nâng cấp hạ
          tầng định kỳ đã được thông báo trước trên hệ thống EPG.
        </p>
      </article>

      {/* ── 7. Chấm dứt dịch vụ ─────────────────────────────────── */}
      <article
        id="chap-7"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-cyan-400">
          <CheckCircle2 className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            7. Chấm Dứt Dịch Vụ & Xử Lý Vi Phạm
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          OmniCast bảo lưu quyền áp dụng các biện pháp kỹ thuật và pháp lý khi phát hiện vi phạm:
        </p>
        <ol className="space-y-1.5 text-sm text-slate-300 pl-5 list-decimal marker:text-cyan-400">
          <li>Cảnh báo vi phạm lần đầu qua thông báo đẩy và email tài khoản.</li>
          <li>Tạm khóa quyền tương tác bình luận và gửi phản ứng trong 7 đến 30 ngày.</li>
          <li>
            Khóa vĩnh viễn tài khoản và hủy toàn bộ phiên làm việc trên các thiết bị đối với các vi
            phạm nghiêm trọng về bản quyền hoặc tấn công an ninh mạng.
          </li>
        </ol>
      </article>

      {/* ── 8. Luật áp dụng ────────────────────────────────────── */}
      <article
        id="chap-8"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-cyan-400">
          <Scale className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            8. Luật Áp Dụng & Giải Quyết Tranh Chấp
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Điều Khoản Dịch Vụ này được điều chỉnh và giải thích theo quy định của pháp luật Nước Cộng
          Hòa Xã Hội Chủ Nghĩa Việt Nam.
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">
          Mọi tranh chấp phát sinh từ việc sử dụng dịch vụ trước hết sẽ được ưu tiên thương lượng giải
          quyết trên tinh thần hòa giải và thiện chí. Trường hợp không đạt được thỏa thuận trong vòng
          30 ngày làm việc, tranh chấp sẽ được đưa ra giải quyết tại Tòa án nhân dân có thẩm quyền
          tại Thành phố Hồ Chí Minh.
        </p>
      </article>
    </LegalPageLayout>
  );
}
