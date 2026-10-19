// ============================================================
// OmniCast - Cloudinary Health Banner
// ============================================================
//
// Sticky amber banner shown at the top of Mode 1 when the
// backend reports Cloudinary is not available. The Studio then
// falls back to the old `/programs/studio/recordings/upload/file`
// path (which still uses local storage) so local development
// without Cloudinary credentials still works.
//
// Trigger:
//   • On mount, calls `getCloudinaryHealth()` once.
//   • Re-checks when the user clicks "Thử lại".
//   • Hides itself when `configured === true`.
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, CloudOff, Loader2 } from 'lucide-react';
import { getCloudinaryHealth } from '@/lib/api/cloudinary';

export function CloudinaryHealthBanner() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [cloudName, setCloudName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const check = async () => {
    setChecking(true);
    setError(null);
    try {
      const status = await getCloudinaryHealth();
      setConfigured(status.configured);
      setCloudName(status.cloudName);
    } catch (err: any) {
      setError(err?.message ?? 'Không kiểm tra được trạng thái Cloudinary.');
      setConfigured(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    check();
  }, []);

  // Hide when configured (or while the first call is in flight).
  if (configured === null) return null;
  if (configured === true) return null;

  return (
    <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-[#0c1421] border border-amber-500/40 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-950 border border-amber-500/40 flex items-center justify-center text-amber-300 flex-shrink-0">
          <CloudOff className="w-4.5 h-4.5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-amber-200 uppercase tracking-wider font-mono">
              Cloudinary chưa được cấu hình
            </h4>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-200 border border-amber-500/40 uppercase">
              Fallback mode
            </span>
          </div>
          <p className="text-[11px] text-slate-300 leading-relaxed">
            {error ? (
              <span>Lỗi kết nối: {error}</span>
            ) : (
              <>
                Sẽ dùng <strong className="text-white">StorageService local</strong> qua API host (giới hạn 4.5 MB / file). Để có thể upload trực tiếp lên{' '}
                <strong className="text-cyan-300">Cloudinary CDN</strong> và vượt qua giới hạn 4.5 MB, hãy thêm{' '}
                <code className="px-1 py-0.5 rounded bg-black/60 text-cyan-300 text-[10px] font-mono">
                  CLOUDINARY_URL
                </code>{' '}
                hoặc{' '}
                <code className="px-1 py-0.5 rounded bg-black/60 text-cyan-300 text-[10px] font-mono">
                  CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET
                </code>{' '}
                vào <code className="text-cyan-300">backend/.env</code> rồi khởi động lại API.
              </>
            )}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={check}
        disabled={checking}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900 border border-amber-500/40 text-amber-200 text-[11px] font-bold transition-colors disabled:opacity-50"
        title="Kiểm tra lại trạng thái Cloudinary"
      >
        {checking ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5" />
        )}
        <span>Thử lại</span>
      </button>
    </div>
  );
}