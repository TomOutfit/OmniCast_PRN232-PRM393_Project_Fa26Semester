// ============================================================
// OmniCast · Bản Quyền & Chính Sách DMCA (Copyright & DMCA)
// ============================================================

import type { Metadata } from 'next';
import { LegalPageLayout, type TocItem } from '@/components/legal/legal-page-layout';
import {
  Scale,
  ShieldCheck,
  FileText,
  AlertOctagon,
  FileWarning,
  Clock,
  Send,
  Info,
  CheckCircle2,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Bản Quyền & DMCA · OmniCast',
  description:
    'Chính sách sở hữu trí tuệ, cơ chế tiếp nhận gỡ bỏ bản quyền DMCA và bảo vệ tác quyền số của OmniCast Network.',
};

const DMCA_TOC: TocItem[] = [
  { id: 'dmca-1', title: '1. Tuyên Bố Bản Quyền & Danh Mục Giấy Phép', badge: 'License' },
  { id: 'dmca-2', title: '2. Quy Trình Tiếp Nhận Yêu Cầu Gỡ Bỏ (Takedown)', badge: 'SLA 24h' },
  { id: 'dmca-3', title: '3. Các Thành Phần Cần Có Trong Thông Báo Hợp Lệ' },
  { id: 'dmca-4', title: '4. Biểu Mẫu Thông Báo Vi Phạm Mẫu (DMCA Template)', badge: 'Mẫu chuẩn' },
  { id: 'dmca-5', title: '5. Thủ Tục Gửi Thông Báo Phản Kháng (Counter-Notice)' },
  { id: 'dmca-6', title: '6. Chính Sách Xử Lý Tài Khoản Tái Phạm (Three Strikes)', badge: 'Kỷ luật' },
  { id: 'dmca-7', title: '7. Thông Tin Đại Diện Bản Quyền (Designated DMCA Agent)' },
];

export default function DmcaPolicyPage() {
  return (
    <LegalPageLayout
      currentTab="dmca"
      title="Bản Quyền & Chính Sách DMCA"
      subtitle="OmniCast Network tôn trọng tối đa quyền sở hữu trí tuệ của các nhà sáng tạo nội dung, nghệ sĩ và đài truyền hình, đồng thời tuân thủ nghiêm ngặt Đạo luật Bản quyền Thiên niên kỷ Kỹ thuật số (DMCA) cùng Luật Sở hữu trí tuệ Việt Nam."
      lastUpdated="16 Tháng 10, 2026"
      version="v2.4"
      toc={DMCA_TOC}
    >
      {/* ── Key Highlights Callout ────────────────────────────── */}
      <section className="rounded-2xl border border-amber-500/20 bg-amber-950/20 p-5 sm:p-6 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-xs sm:text-sm text-amber-200/90 leading-relaxed">
            <h2 className="font-bold text-white text-sm sm:text-base">
              Cam kết bảo vệ bản quyền số của OmniCast:
            </h2>
            <p>
              Toàn bộ các nguồn phát sóng phát hành chính thức trên OmniCast đều được thẩm tra nguồn
              gốc giấy phép chặt chẽ (Pexels License, Blender Foundation Open Movie CC-BY 3.0, Internet
              Archive Public Domain, NASA và Bunny CDN tự sở hữu). Nếu bạn là chủ sở hữu bản quyền và
              phát hiện nội dung vi phạm, chúng tôi cam kết tiếp nhận và xử lý gỡ bỏ tạm thời trong
              vòng <strong>24 giờ làm việc</strong>.
            </p>
          </div>
        </div>
      </section>

      {/* ── 1. Tuyên bố bản quyền & Catalog ─────────────────────── */}
      <article
        id="dmca-1"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-amber-400">
          <ShieldCheck className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            1. Tuyên Bố Bản Quyền & Danh Mục Giấy Phép
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          OmniCast thiết lập cơ chế kiểm định nguồn phát (License Audit) định kỳ nhằm đảm bảo 100%
          video trên hệ thống đều có căn cứ bản quyền minh bạch:
        </p>
        <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-800/40">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-slate-700 bg-slate-800/80 font-mono uppercase text-slate-400">
              <tr>
                <th className="px-4 py-2.5">Nhà cung cấp nguồn</th>
                <th className="px-4 py-2.5">Phân loại giấy phép</th>
                <th className="px-4 py-2.5">Yêu cầu ghi công (Attribution)</th>
                <th className="px-4 py-2.5">Trạng thái phát hành</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              <tr>
                <td className="px-4 py-2.5 font-bold text-white">Pexels Media</td>
                <td className="px-4 py-2.5 font-mono text-cyan-400">PEXELS_LICENSE</td>
                <td className="px-4 py-2.5 text-slate-400">Miễn phí thương mại, không bắt buộc</td>
                <td className="px-4 py-2.5 text-emerald-400 font-semibold">✓ Production-Safe</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-bold text-white">Blender Foundation</td>
                <td className="px-4 py-2.5 font-mono text-cyan-400">CC-BY 3.0</td>
                <td className="px-4 py-2.5 text-slate-400">Ghi công Blender Foundation Open Movie</td>
                <td className="px-4 py-2.5 text-emerald-400 font-semibold">✓ Production-Safe</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-bold text-white">Internet Archive</td>
                <td className="px-4 py-2.5 font-mono text-cyan-400">CC0_PUBLIC_DOMAIN</td>
                <td className="px-4 py-2.5 text-slate-400">Tác phẩm thuộc phạm vi công cộng</td>
                <td className="px-4 py-2.5 text-emerald-400 font-semibold">✓ Production-Safe</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-bold text-white">NASA Official</td>
                <td className="px-4 py-2.5 font-mono text-cyan-400">PUBLIC_BROADCAST_OK</td>
                <td className="px-4 py-2.5 text-slate-400">Ghi công NASA Media Portal</td>
                <td className="px-4 py-2.5 text-emerald-400 font-semibold">✓ Production-Safe</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-bold text-white">Bunny Stream Self-Hosted</td>
                <td className="px-4 py-2.5 font-mono text-cyan-400">BUNNY_SELF_HOSTED</td>
                <td className="px-4 py-2.5 text-slate-400">Bản quyền sản xuất thuộc OmniCast</td>
                <td className="px-4 py-2.5 text-emerald-400 font-semibold">✓ Production-Safe</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      {/* ── 2. Quy trình tiếp nhận DMCA ─────────────────────────── */}
      <article
        id="dmca-2"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-amber-400">
          <Clock className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            2. Quy Trình Tiếp Nhận Yêu Cầu Gỡ Bỏ (Takedown Process)
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Quy trình giải quyết khiếu nại bản quyền tại OmniCast được tự động hóa và giám sát bởi Ban
          Pháp Chế:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1.5">
            <span className="font-mono text-amber-400 font-bold">Bước 1 · Tiếp nhận 24/7</span>
            <p className="text-slate-400">
              Tiếp nhận văn bản qua email <strong className="text-white">dmca@omnicast.tv</strong>{' '}
              và phát hành mã tra cứu khiếu nại (Ticket ID) trong vòng 2 giờ.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1.5">
            <span className="font-mono text-amber-400 font-bold">Bước 2 · Thẩm tra sơ bộ</span>
            <p className="text-slate-400">
              Kiểm tra tính hợp lệ của hồ sơ ủy quyền tác quyền và đối chiếu mã hash video hoặc đường
              dẫn chương trình phát sóng EPG.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1.5">
            <span className="font-mono text-amber-400 font-bold">Bước 3 · Cách ly nội dung</span>
            <p className="text-slate-400">
              Tạm ngừng phát sóng chương trình liên quan hoặc gỡ khỏi kho Cloud VOD trong tối đa 24
              giờ làm việc để bảo toàn quyền lợi các bên.
            </p>
          </div>
        </div>
      </article>

      {/* ── 3. Yêu cầu văn bản ──────────────────────────────────── */}
      <article
        id="dmca-3"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-amber-400">
          <FileText className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            3. Các Thành Phần Cần Có Trong Thông Báo Hợp Lệ
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Theo Điều 512(c)(3) của DMCA, một thông báo vi phạm bản quyền hợp lệ bắt buộc phải bao gồm
          đầy đủ các nội dung sau:
        </p>
        <ul className="space-y-2 text-sm text-slate-300 pl-4 list-disc marker:text-amber-400">
          <li>Chữ ký vật lý hoặc chữ ký điện tử của chủ sở hữu bản quyền hoặc người được ủy quyền.</li>
          <li>Mô tả tác phẩm gốc được bảo hộ quyền tác giả mà bạn cho rằng đã bị xâm phạm.</li>
          <li>
            Đường dẫn URL cụ thể hoặc thông tin định danh chương trình (Kênh, Tiêu đề, Khung giờ phát
            sóng EPG) trên nền tảng OmniCast.
          </li>
          <li>Thông tin liên hệ của bạn: Họ tên đầy đủ, địa chỉ gửi thư, số điện thoại và email.</li>
          <li>
            Tuyên bố rằng bạn thực sự tin rằng việc sử dụng tác phẩm đó không được chủ sở hữu, người
            đại diện hoặc luật pháp cho phép (Good Faith Belief).
          </li>
          <li>
            Tuyên bố chịu trách nhiệm trước pháp luật về tội khai man rằng các thông tin trong thông
            báo là hoàn toàn chính xác.
          </li>
        </ul>
      </article>

      {/* ── 4. Biểu mẫu mẫu ────────────────────────────────────── */}
      <article
        id="dmca-4"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-amber-400">
          <Send className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            4. Biểu Mẫu Thông Báo Vi Phạm Mẫu (DMCA Template)
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Bạn có thể sao chép văn bản mẫu dưới đây, điền thông tin và gửi trực tiếp tới email{' '}
          <span className="text-amber-300 font-mono">dmca@omnicast.tv</span>:
        </p>
        <div className="relative rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-xs text-slate-300 leading-relaxed overflow-x-auto">
          <pre>{`Kính gửi: Đại diện Bản quyền (Designated DMCA Agent) - OmniCast Network
Tiêu đề: [DMCA NOTICE] Yêu cầu gỡ bỏ nội dung vi phạm bản quyền

1. Thông tin chủ thể khiếu nại:
- Họ và tên người khiếu nại / Đại diện: [Họ và tên của bạn]
- Tổ chức / Công ty sở hữu bản quyền: [Tên công ty / Studio nếu có]
- Email: [Địa chỉ email của bạn] | Số điện thoại: [Số điện thoại]

2. Tác phẩm bị xâm phạm bản quyền:
- Tên tác phẩm gốc: [Tên phim, chương trình, âm nhạc hoặc video gốc]
- Bằng chứng quyền sở hữu / URL tác phẩm gốc: [Link website tác quyền]

3. Vị trí nội dung vi phạm trên OmniCast:
- URL chương trình vi phạm: https://omnicast-fe.vercel.app/programs/[ID]
- Tên kênh phát sóng & Khung giờ EPG: [Ví dụ: Kênh VTV1 HD / 20:00 ngày DD/MM/YYYY]

4. Tuyên bố cam kết:
"Tôi xác nhận với sự trung thực rằng việc sử dụng tác phẩm nói trên không được chủ bản quyền cho phép. Tôi xin chịu mọi trách nhiệm trước pháp luật về tính xác thực của thông báo này."

Ký tên: [Họ tên hoặc Chữ ký điện tử của bạn]`}</pre>
        </div>
      </article>

      {/* ── 5. Counter-Notice ───────────────────────────────────── */}
      <article
        id="dmca-5"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-amber-400">
          <FileWarning className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            5. Thủ Tục Gửi Thông Báo Phản Kháng (Counter-Notice)
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Nếu bạn là Đạo diễn phát sóng (Staff Broadcaster) hoặc người dùng có nội dung bị gỡ bỏ nhầm
          lẫn, bạn có quyền gửi Thông Báo Phản Kháng (Counter-Notification) kèm theo chứng chỉ bản
          quyền hợp pháp hoặc thỏa thuận giấy phép mở (Creative Commons, Pexels, Public Domain).
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">
          Sau khi nhận được Counter-Notice hợp lệ, OmniCast sẽ chuyển tiếp bản sao cho bên khiếu nại
          ban đầu. Nếu trong vòng 10 đến 14 ngày làm việc bên khiếu nại không xuất trình chứng cứ khởi
          kiện ra tòa án, chương trình sẽ được khôi phục phát sóng trở lại trên hệ thống EPG.
        </p>
      </article>

      {/* ── 6. Three Strikes Policy ─────────────────────────────── */}
      <article
        id="dmca-6"
        className="rounded-2xl border border-rose-500/20 bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-rose-400">
          <AlertOctagon className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            6. Chính Sách Xử Lý Tài Khoản Tái Phạm (Repeat Infringer Policy)
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          OmniCast áp dụng chính sách kỷ luật nghiêm khắc <strong>Three Strikes (3 Gậy Vi Phạm)</strong>{' '}
          đối với các tài khoản vi phạm bản quyền:
        </p>
        <div className="space-y-2 text-sm text-slate-300">
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
            <span className="font-semibold text-amber-300">Gậy lần 1:</span>
            <span className="text-xs text-slate-400">
              Cảnh báo văn bản, xóa video vi phạm và bắt buộc hoàn thành bài kiểm tra bản quyền.
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-center justify-between">
            <span className="font-semibold text-orange-400">Gậy lần 2:</span>
            <span className="text-xs text-slate-400">
              Đình chỉ quyền sử dụng Live Studio và quyền lên lịch EPG trong thời hạn 30 ngày.
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-center justify-between">
            <span className="font-semibold text-rose-400">Gậy lần 3:</span>
            <span className="text-xs text-rose-200">
              Hủy bỏ tài khoản vĩnh viễn, cấm tạo tài khoản mới và hủy bỏ toàn bộ quyền truy cập.
            </span>
          </div>
        </div>
      </article>

      {/* ── 7. Designated Agent ─────────────────────────────────── */}
      <article
        id="dmca-7"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-amber-400">
          <Scale className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            7. Thông Tin Đại Diện Bản Quyền (Designated DMCA Agent)
          </h2>
        </div>
        <div className="p-5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs sm:text-sm space-y-2">
          <p>
            <strong>Tổ chức đại diện bản quyền:</strong> OmniCast Copyright Compliance Department
          </p>
          <p>
            <strong>Đại diện pháp lý được chỉ định:</strong> Ban Pháp Chế & An Ninh Thông Tin
            OmniCast
          </p>
          <p>
            <strong>Địa chỉ văn phòng:</strong> Tòa nhà Trung tâm Công nghệ Số, Khu Công Nghệ Cao,
            TP. Thủ Đức, TP. Hồ Chí Minh, Việt Nam
          </p>
          <p>
            <strong>Hotline khẩn cấp DMCA:</strong> (+84) 28 7300 8888 (Nhánh 4 - Bản quyền)
          </p>
          <p>
            <strong>Email chính thức:</strong>{' '}
            <a
              href="mailto:dmca@omnicast.tv"
              className="text-amber-400 font-mono font-bold hover:underline"
            >
              dmca@omnicast.tv
            </a>
          </p>
        </div>
      </article>
    </LegalPageLayout>
  );
}
