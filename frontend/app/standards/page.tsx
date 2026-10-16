// ============================================================
// OmniCast · Tiêu Chuẩn Phát Sóng (Broadcasting Standards)
// ============================================================

import type { Metadata } from 'next';
import { LegalPageLayout, type TocItem } from '@/components/legal/legal-page-layout';
import {
  Radio,
  Sparkles,
  Tv,
  Bot,
  AlertCircle,
  Video,
  Shield,
  Flag,
  CheckCircle,
  Info,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Tiêu Chuẩn Phát Sóng · OmniCast',
  description:
    'Bộ quy chuẩn kỹ thuật phát sóng, phân loại độ tuổi khán giả (P, K, T13, T16, T18, C) và kiểm duyệt tự động AI Curator của OmniCast Network.',
};

const STANDARDS_TOC: TocItem[] = [
  { id: 'std-1', title: '1. Sứ Mệnh Phát Sóng & Cam Kết Chất Lượng', badge: 'Tầm nhìn' },
  { id: 'std-2', title: '2. Khung Phân Loại Độ Tuổi Khán Giả (P, K, T13, T16, T18, C)', badge: 'Phân loại' },
  { id: 'std-3', title: '3. Quy Chuẩn Kỹ Thuật Truyền Dẫn Âm Thanh & Hình Ảnh', badge: '1080p / 4K' },
  { id: 'std-4', title: '4. Kiểm Duyệt Tự Động Với Động Cơ AI Curator', badge: 'AI Engine' },
  { id: 'std-5', title: '5. Tiêu Chuẩn Đạo Đức Cho Đạo Diễn Phát Sóng (Live Studio)' },
  { id: 'std-6', title: '6. Cơ Chế Báo Cáo Vi Phạm & Nút Khẩn Cấp (Kill Switch)', badge: 'Bảo vệ' },
];

export default function BroadcastingStandardsPage() {
  return (
    <LegalPageLayout
      currentTab="standards"
      title="Tiêu Chuẩn Phát Sóng"
      subtitle="Bộ quy tắc biên tập, phân loại nội dung điện ảnh truyền hình và thông số kỹ thuật truyền dẫn trực tuyến trên toàn bộ 25 kênh sóng thuộc OmniCast Network."
      lastUpdated="16 Tháng 10, 2026"
      version="v2.4"
      toc={STANDARDS_TOC}
    >
      {/* ── Key Highlights Callout ────────────────────────────── */}
      <section className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-5 sm:p-6 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-emerald-400 mt-0.5 flex-shrink-0" />
          <div className="space-y-2 text-xs sm:text-sm text-emerald-200/90 leading-relaxed">
            <h2 className="font-bold text-white text-sm sm:text-base">
              Mục tiêu phát sóng văn minh và chất lượng cao:
            </h2>
            <p>
              OmniCast kết hợp quy trình thẩm định nội dung 2 lớp:{' '}
              <strong>Động cơ trí tuệ nhân tạo AI Curator</strong> phân tích đa mô hình (Dual-mode:
              Fast Heuristics 40ms + Deep LLM) kết hợp cùng{' '}
              <strong>Hội đồng Biên tập Phát thanh viên</strong>, cam kết đem lại luồng phát sóng an
              toàn, chuẩn màu điện ảnh, âm thanh chuẩn Dolby và bảo vệ tuyệt đối khán giả nhỏ tuổi.
            </p>
          </div>
        </div>
      </section>

      {/* ── 1. Sứ mệnh ─────────────────────────────────────────── */}
      <article
        id="std-1"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-emerald-400">
          <Radio className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            1. Sứ Mệnh Phát Sóng & Cam Kết Chất Lượng
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          OmniCast hướng tới mục tiêu trở thành mạng truyền hình số tương tác hiện đại bậc nhất, nơi
          khán giả được thưởng thức các chương trình truyền hình trực tiếp 24/7 liền mạch, các thước
          phim tài liệu chuẩn 4K, bản tin thời sự cập nhật và các giải đấu thể thao kịch tính.
        </p>
        <p className="text-sm text-slate-300 leading-relaxed">
          Chúng tôi cam kết tuân thủ <strong>Luật Báo chí</strong>,{' '}
          <strong>Luật Điện ảnh</strong> và các quy định của Bộ Thông tin và Truyền thông về phát sóng
          truyền thanh, truyền hình trên không gian mạng.
        </p>
      </article>

      {/* ── 2. Content Rating ──────────────────────────────────── */}
      <article
        id="std-2"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-emerald-400">
          <Tv className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            2. Khung Phân Loại Độ Tuổi Khán Giả (Content Rating System)
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Mỗi chương trình xuất hiện trên lưới lịch phát sóng EPG đều bắt buộc phải mang một trong các
          nhãn độ tuổi chính thức sau:
        </p>
        <div className="space-y-3">
          {/* Rating P */}
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-emerald-500 text-slate-950 font-black text-base flex items-center justify-center flex-shrink-0">
                P
              </span>
              <div>
                <h3 className="font-bold text-white text-sm">Phổ Biến (General Audiences)</h3>
                <p className="text-xs text-slate-400">
                  Nội dung lành mạnh, bổ ích, thích hợp cho mọi lứa tuổi xem mọi lúc.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-300 px-2.5 py-1 rounded bg-emerald-500/10 border border-emerald-500/30">
              Mọi lứa tuổi
            </span>
          </div>

          {/* Rating K */}
          <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-cyan-500 text-slate-950 font-black text-base flex items-center justify-center flex-shrink-0">
                K
              </span>
              <div>
                <h3 className="font-bold text-white text-sm">Khán Giả Thiếu Nhi (Kids Under 13)</h3>
                <p className="text-xs text-slate-400">
                  Phim hoạt hình, chương trình giáo dục; khuyến khích có phụ huynh đồng hành.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-cyan-300 px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/30">
              Dưới 13 tuổi
            </span>
          </div>

          {/* Rating T13 */}
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-amber-500 text-slate-950 font-black text-base flex items-center justify-center flex-shrink-0">
                T13
              </span>
              <div>
                <h3 className="font-bold text-white text-sm">Khán Giả Từ 13 Tuổi Trở Lên (Teens 13+)</h3>
                <p className="text-xs text-slate-400">
                  Phim hành động giả tưởng nhẹ, tâm lý học đường, khoa học viễn tưởng.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-amber-300 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/30">
              Từ 13 tuổi
            </span>
          </div>

          {/* Rating T16 */}
          <div className="p-4 rounded-xl border border-orange-500/30 bg-orange-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-orange-500 text-slate-950 font-black text-base flex items-center justify-center flex-shrink-0">
                T16
              </span>
              <div>
                <h3 className="font-bold text-white text-sm">Khán Giả Từ 16 Tuổi Trở Lên (Mature 16+)</h3>
                <p className="text-xs text-slate-400">
                  Có cảnh hành động mạnh, yếu tố hình sự, hồi hộp kịch tính hoặc ngôn từ gai góc.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-orange-300 px-2.5 py-1 rounded bg-orange-500/10 border border-orange-500/30">
              Từ 16 tuổi
            </span>
          </div>

          {/* Rating T18 */}
          <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-purple-500 text-slate-950 font-black text-base flex items-center justify-center flex-shrink-0">
                T18
              </span>
              <div>
                <h3 className="font-bold text-white text-sm">Khán Giả Trưởng Thành (Adults 18+)</h3>
                <p className="text-xs text-slate-400">
                  Phim điện ảnh người lớn, đề tài tâm lý xã hội sâu sắc, yêu cầu xác thực độ tuổi.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-purple-300 px-2.5 py-1 rounded bg-purple-500/10 border border-purple-500/30">
              Từ 18 tuổi
            </span>
          </div>

          {/* Rating C */}
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-lg bg-rose-600 text-white font-black text-base flex items-center justify-center flex-shrink-0">
                C
              </span>
              <div>
                <h3 className="font-bold text-rose-300 text-sm">Cấm Phổ Biến (Strictly Prohibited)</h3>
                <p className="text-xs text-rose-200/80">
                  Bạo lực cực đoan, chống phá an ninh quốc gia, khiêu dâm hoặc thông tin độc hại.
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-rose-400 px-2.5 py-1 rounded bg-rose-500/20 border border-rose-500/40">
              Tuyệt đối cấm
            </span>
          </div>
        </div>
      </article>

      {/* ── 3. Quy chuẩn kỹ thuật ───────────────────────────────── */}
      <article
        id="std-3"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-emerald-400">
          <Video className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            3. Quy Chuẩn Kỹ Thuật Truyền Dẫn Âm Thanh & Hình Ảnh
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Tất cả luồng video được đưa lên hệ thống OmniCast (dù qua Cloudinary Direct Upload hay Live
          Studio Broadcaster) phải đáp ứng ngưỡng tiêu chuẩn sau:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Độ phân giải</span>
            <div className="text-sm font-bold text-white">1080p / 4K UHD</div>
            <p className="text-slate-400 text-[11px]">Hỗ trợ chuyển đổi thích ứng ABR HLS</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Video Bitrate</span>
            <div className="text-sm font-bold text-white">4,500 – 8,500 kbps</div>
            <p className="text-slate-400 text-[11px]">Codec H.264 / H.265 tối ưu hóa mạng</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Âm thanh</span>
            <div className="text-sm font-bold text-white">48 kHz Stereo / Dolby</div>
            <p className="text-slate-400 text-[11px]">Bitrate âm thanh tối thiểu 192 kbps</p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 space-y-1">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Độ trễ truyền dẫn</span>
            <div className="text-sm font-bold text-emerald-400">&lt; 2.5 giây (ULL)</div>
            <p className="text-slate-400 text-[11px]">Đồng bộ hóa bình luận & tương tác</p>
          </div>
        </div>
      </article>

      {/* ── 4. AI Curator ───────────────────────────────────────── */}
      <article
        id="std-4"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-emerald-400">
          <Bot className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            4. Kiểm Duyệt Tự Động Với Động Cơ AI Curator
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Động cơ <strong>AI Curator</strong> hoạt động độc lập trên backend NestJS thực hiện quét tự
          động các video trước và trong quá trình phát sóng:
        </p>
        <ul className="space-y-2 text-sm text-slate-300 pl-4 list-disc marker:text-emerald-400">
          <li>
            <strong>Phân tích hai chế độ (Dual-Mode Evaluation):</strong> Lớp lọc nhanh Fast
            Heuristics (phản hồi trong &lt;40ms) phát hiện từ khóa cấm, kết hợp mô hình học sâu Deep
            LLM phân tích ngữ cảnh, hình ảnh bạo lực và phát hiện âm thanh vi phạm bản quyền.
          </li>
          <li>
            <strong>Chỉ số tín nhiệm (Confidence Score):</strong> Nếu điểm rủi ro vi phạm vượt quá{' '}
            <code className="text-cyan-300 bg-slate-800 px-1.5 py-0.5 rounded">0.85</code>, hệ thống
            tự động gắn cờ cảnh báo, chuyển trạng thái chương trình sang chờ Ban Biên Tập thẩm tra.
          </li>
          <li>
            <strong>Nhật ký kiểm toán minh bạch:</strong> Tất cả quyết định kiểm duyệt của AI đều
            được ghi nhận vào bảng cơ sở dữ liệu telemetry và gửi qua gRPC Audit-Logger để chống can
            thiệp sai lệch.
          </li>
        </ul>
      </article>

      {/* ── 5. Đạo đức phát sóng Live ───────────────────────────── */}
      <article
        id="std-5"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-emerald-400">
          <Shield className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            5. Tiêu Chuẩn Đạo Đức Cho Đạo Diễn Phát Sóng (Live Studio)
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Thành viên giữ vai trò Đạo Diễn / Phát Thanh Viên (Role Staff) khi sử dụng phòng phát sóng
          Live Studio phải tuân thủ nghiêm ngặt các quy tắc sau:
        </p>
        <div className="space-y-2 text-xs sm:text-sm text-slate-300">
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-2.5">
            <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Trang phục & Phát ngôn:</strong> Tác phong lịch sự, không sử dụng từ ngữ thô
              tục, kích động thù địch hoặc xúc phạm danh dự của bất kỳ cá nhân, tổ chức nào.
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-2.5">
            <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Bảo vệ trẻ em:</strong> Tuyệt đối không để trẻ em tham gia các thử thách độc hại,
              nguy hiểm hoặc các hoạt động có nguy cơ gây chấn thương thể chất và tâm lý.
            </span>
          </div>
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/60 flex items-start gap-2.5">
            <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Trung thực về nguồn tin:</strong> Không phát tán tin giả (Fake News), thông
              tin giật gân sai sự thật hoặc quảng cáo các sản phẩm cấm, cờ bạc trực tuyến trái phép.
            </span>
          </div>
        </div>
      </article>

      {/* ── 6. Kill Switch ──────────────────────────────────────── */}
      <article
        id="std-6"
        className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-6 sm:p-8 space-y-4"
      >
        <div className="flex items-center gap-2 text-emerald-400">
          <Flag className="h-5 w-5" />
          <h2 className="text-lg sm:text-xl font-bold text-white">
            6. Cơ Chế Báo Cáo Vi Phạm & Nút Khẩn Cấp (Kill Switch)
          </h2>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          OmniCast trang bị tính năng <strong>Báo cáo luồng vi phạm</strong> trực tiếp trên trình
          phát video dành cho mọi khán giả. Khi nhận được từ 5 báo cáo vi phạm liên tiếp từ người
          dùng xác thực, hệ thống sẽ:
        </p>
        <ol className="space-y-1.5 text-sm text-slate-300 pl-5 list-decimal marker:text-emerald-400">
          <li>Kích hoạt tức thì chế độ cảnh báo khẩn cấp trên màn hình trực của Quản trị viên (Admin Hub).</li>
          <li>
            Kích hoạt <strong>Nút Khẩn Cấp (Kill Switch)</strong> ngắt luồng truyền dẫn CDN trong vòng{' '}
            <strong className="text-emerald-300">60 giây</strong> nếu xác định có vi phạm an ninh nghiêm trọng.
          </li>
          <li>Tự động chuyển hướng khán giả sang luồng phát sóng dự phòng hoặc hiển thị màn hình chờ kỹ thuật.</li>
        </ol>
      </article>
    </LegalPageLayout>
  );
}
