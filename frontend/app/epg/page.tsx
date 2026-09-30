import type { Metadata } from 'next';
import { EPGGrid } from '@/components/epg/epg-grid';

export const metadata: Metadata = {
  title: 'Lịch phát sóng EPG',
  description: 'Xem lịch phát sóng EPG 24 giờ của tất cả các kênh trên OmniCast',
};

export default function EPGPage() {
  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      <EPGGrid />
    </div>
  );
}
