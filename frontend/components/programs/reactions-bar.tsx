'use client';

import {
  Heart,
  Flame,
  HandMetal,
  Sparkles,
  Loader2,
} from 'lucide-react';
import {
  useReactions,
  useToggleReaction,
} from '@/lib/hooks/useSocial';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import type { ReactionTypeValue } from '@/types';

interface ReactionsBarProps {
  recordingId: string;
}

const REACTION_OPTIONS: {
  type: ReactionTypeValue;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  { type: 'HEART', label: 'Yêu thích', Icon: Heart, color: 'text-pink-400' },
  { type: 'FIRE', label: 'Tuyệt vời', Icon: Flame, color: 'text-orange-400' },
  { type: 'CLAP', label: 'Vỗ tay', Icon: HandMetal, color: 'text-yellow-400' },
  { type: 'WOW', label: 'Wow', Icon: Sparkles, color: 'text-cyan-400' },
];

export function ReactionsBar({ recordingId }: ReactionsBarProps) {
  const { data, isLoading } = useReactions(recordingId);
  const toggle = useToggleReaction(recordingId);
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  const handleClick = async (type: ReactionTypeValue) => {
    if (!isAuthenticated) {
      toast.info('Đăng nhập để thả cảm xúc');
      router.push('/login');
      return;
    }
    try {
      await toggle.mutateAsync(type);
    } catch (err: any) {
      toast.error('Không thể thả cảm xúc', {
        description: err?.response?.data?.message || err?.message,
      });
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {REACTION_OPTIONS.map(({ type, label, Icon, color }) => {
        const count = data?.data?.[type] ?? 0;
        return (
          <button
            key={type}
            onClick={() => handleClick(type)}
            disabled={toggle.isPending}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-dark-900/50 border border-dark-700 hover:border-primary-500/50 transition-colors disabled:opacity-60"
          >
            {toggle.isPending ? (
              <Loader2 className="w-6 h-6 animate-spin text-dark-400" />
            ) : (
              <Icon className={`w-6 h-6 ${color}`} />
            )}
            <span className="text-sm font-medium text-white">{label}</span>
            {isLoading ? (
              <span className="text-xs text-dark-500">…</span>
            ) : (
              <span className="text-xs text-dark-400">
                {count > 0 ? formatCount(count) : 'Bấm để thả'}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}
