import type { Metadata } from 'next';
import { EPGGrid } from '@/components/epg/epg-grid';

export const metadata: Metadata = {
  title: 'Lịch Phát Sóng Điện Tử & Catch-Up 7 Ngày | OmniCast',
  description: 'Hệ thống 12 kênh lịch phát sóng điện tử EPG 24 giờ và xem lại Catch-up 7 ngày trên OmniCast.',
};

export default function EPGPage() {
  return (
    <main className="min-h-screen bg-[#070b12] text-slate-100 py-6 px-4 lg:px-6">
      <div className="max-w-[1680px] w-full mx-auto">
        <h1 className="sr-only">Lịch Phát Sóng Điện Tử & Catch-Up 7 Ngày | OmniCast</h1>
        <EPGGrid />
      </div>
    </main>
  );
}
