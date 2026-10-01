'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT, useI18n } from '@/lib/i18n/i18n-provider';
import { useAuth } from '@/lib/auth-context';
import {
  Shield,
  Crown,
  Tv,
  Sparkles,
  CheckCircle2,
  Lock,
  Volume2,
  Video,
  Globe,
  Bell,
  Monitor,
  Zap,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user, isAuthenticated } = useAuth();
  const { locale, setLocale } = useI18n();

  const [activeSection, setActiveSection] = useState<'omnipass' | 'playback' | 'security'>('omnipass');
  const [resolutionPref, setResolutionPref] = useState('4k');
  const [audioPref, setAudioPref] = useState('dolby');
  const [dvrAutoSave, setDvrAutoSave] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 py-6 px-4 lg:px-6">
      <div className="max-w-[1200px] mx-auto space-y-6">
        
        {/* ── Page Header ───────────────────────────────────────────── */}
        <div className="p-6 rounded-3xl bg-[#090f1a] border border-[#162338] shadow-2xl flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00f2fe]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400 font-mono">
                ACCOUNT CENTER & BROADCAST PREFERENCES
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Cài Đặt Tài Khoản & Gói Dịch Vụ OmniPass
            </h1>
          </div>

          {savedSuccess && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              Đã lưu cài đặt thành công!
            </div>
          )}
        </div>

        {/* ── Main Layout: Sidebar Tabs + Content ────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Left Sidebar */}
          <div className="md:col-span-4 space-y-2">
            {[
              { key: 'omnipass', label: 'Gói Dịch Vụ OmniPass VIP', icon: Crown },
              { key: 'playback', label: 'Tùy Chọn Phát Sóng 4K & Audio', icon: Video },
              { key: 'security', label: 'Bảo Mật & Đổi Mật Khẩu', icon: Lock },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeSection === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveSection(tab.key as any)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3.5 rounded-2xl text-xs font-bold transition-all text-left border',
                    isSelected
                      ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(0,242,254,0.2)]'
                      : 'bg-[#090f1a] hover:bg-[#0f1a2c] border-[#162338] text-slate-400 hover:text-white'
                  )}
                >
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Content Area */}
          <div className="md:col-span-8">
            
            {/* Tab 1: OmniPass VIP Tier */}
            {activeSection === 'omnipass' && (
              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-gradient-to-br from-[#121c2e] via-[#09111e] to-[#060a12] border-2 border-cyan-500/40 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-500 text-black shadow-md flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5" />
                      OMNIPASS ULTRA VIP
                    </span>
                    <span className="text-xs text-emerald-400 font-mono font-bold">ĐANG HOẠT ĐỘNG</span>
                  </div>

                  <h3 className="text-xl font-black text-white mb-2">Quyền Lợi Gói Phát Sóng Cao Cấp</h3>
                  <p className="text-xs text-slate-300 mb-6 leading-relaxed">
                    Trải nghiệm xem toàn bộ 12 kênh truyền hình không giới hạn, đường truyền Satellite Downlink 2160p60 HEVC và xem lại Catch-up 7 ngày.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs mb-6">
                    {[
                      'Truyền dẫn 4K UHD 60FPS Low Latency',
                      'Đa góc quay Multi-Cam Spider & Player Cam',
                      'Âm thanh Dolby Atmos 5.1 & bình luận kép',
                      'Catch-up xem lại 7 ngày không quảng cáo',
                      'Tính năng ghi hình Cloud DVR không giới hạn',
                      'Hỗ trợ 5 thiết bị đồng thời (TV, Mobile, Web)',
                    ].map((feat, i) => (
                      <div key={i} className="flex items-center gap-2 text-slate-200">
                        <Check className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-4 border-t border-white/10 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400">Hạn gia hạn tiếp theo:</div>
                      <div className="text-xs font-mono font-bold text-white">31/12/2026 (Thanh toán tự động)</div>
                    </div>
                    <Button
                      onClick={handleSave}
                      className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs px-5 shadow-[0_0_15px_rgba(0,242,254,0.4)]"
                    >
                      Quản lý gói cước
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Playback & Broadcast Settings */}
            {activeSection === 'playback' && (
              <div className="p-6 rounded-3xl bg-[#090f1a] border border-[#162338] shadow-2xl space-y-6">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Video className="w-4 h-4 text-cyan-400" />
                  Cài Đặt Chất Lượng Luồng Phát Sóng
                </h3>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-2">Độ phân giải mặc định:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: '4k', label: '4K UHD 60FPS (Khuyên dùng)' },
                        { key: '1080p', label: '1080p60 Full HD' },
                        { key: 'auto', label: 'Tự động thích ứng (Auto)' },
                      ].map((res) => (
                        <button
                          key={res.key}
                          onClick={() => setResolutionPref(res.key)}
                          className={cn(
                            'p-3 rounded-xl border text-left font-bold transition-all',
                            resolutionPref === res.key
                              ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300'
                              : 'bg-[#0b1320] border-[#16253c] text-slate-400'
                          )}
                        >
                          {res.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-2">Định dạng âm thanh ưu tiên:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: 'dolby', label: 'Dolby Atmos 5.1 Surround' },
                        { key: 'stereo', label: 'Stereo 2.0 Tiêu chuẩn' },
                      ].map((aud) => (
                        <button
                          key={aud.key}
                          onClick={() => setAudioPref(aud.key)}
                          className={cn(
                            'p-3 rounded-xl border text-left font-bold transition-all',
                            audioPref === aud.key
                              ? 'bg-cyan-950/60 border-cyan-400 text-cyan-300'
                              : 'bg-[#0b1320] border-[#16253c] text-slate-400'
                          )}
                        >
                          {aud.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">Tự động kích hoạt DVR Time-shift</div>
                      <div className="text-[11px] text-slate-400">Cho phép tua lại tức thì ngay khi mở luồng trực tiếp</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={dvrAutoSave}
                      onChange={(e) => setDvrAutoSave(e.target.checked)}
                      className="w-5 h-5 accent-cyan-400 rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={handleSave}
                    className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs px-6"
                  >
                    Lưu cấu hình phát sóng
                  </Button>
                </div>
              </div>
            )}

            {/* Tab 3: Security & Password */}
            {activeSection === 'security' && (
              <div className="p-6 rounded-3xl bg-[#090f1a] border border-[#162338] shadow-2xl space-y-6">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  Bảo Mật Tài Khoản & Mật Khẩu
                </h3>

                <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Mật khẩu hiện tại</label>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      className="bg-[#0b1320] border-[#18273e] text-white text-xs rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Mật khẩu mới</label>
                    <Input
                      type="password"
                      placeholder="Ít nhất 8 ký tự..."
                      className="bg-[#0b1320] border-[#18273e] text-white text-xs rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">Xác nhận mật khẩu mới</label>
                    <Input
                      type="password"
                      placeholder="Nhập lại mật khẩu mới..."
                      className="bg-[#0b1320] border-[#18273e] text-white text-xs rounded-xl"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold text-xs px-6"
                  >
                    Cập nhật mật khẩu
                  </Button>
                </form>
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}