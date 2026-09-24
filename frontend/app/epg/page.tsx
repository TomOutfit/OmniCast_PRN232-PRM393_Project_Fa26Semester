import type { Metadata } from 'next';
import { EPGGrid } from '@/components/epg/epg-grid';

export const metadata: Metadata = {
  title: 'Lịch phát sóng EPG',
  description: 'Xem lịch phát sóng EPG 24 giờ của tất cả các kênh trên OmniCast',
};

export default function EPGPage() {
  return (
    <div className="min-h-[80vh]">
      {/* Page Header */}
      <div className="bg-dark-900 border-b border-dark-800">
        <div className="max-w-[1920px] mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-white mb-2">Lịch phát sóng EPG</h1>
          <p className="text-dark-400">
            Theo dõi lịch trình phát sóng chi tiết 24 giờ của tất cả các kênh
          </p>
        </div>
      </div>

      {/* EPG Grid */}
      <div className="max-w-[1920px] mx-auto p-4">
        <EPGGrid />
      </div>
    </div>
  );
}
