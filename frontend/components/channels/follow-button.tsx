'use client';

import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  useFollowChannel,
  useIsFollowingChannel,
  useUnfollowChannel,
} from '@/lib/hooks/useChannels';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface FollowButtonProps {
  channelId: string;
  variant?: 'solid' | 'outline' | 'default';
}

export function FollowButton({ channelId, variant = 'default' }: FollowButtonProps) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const { data: status, isLoading: loadingStatus } = useIsFollowingChannel(channelId);
  const follow = useFollowChannel();
  const unfollow = useUnfollowChannel();
  const [localState, setLocalState] = useState<boolean | null>(null);

  const buttonVariant = variant === 'solid' ? 'default' : variant;
  const isFollowing = localState ?? status?.isFollowing ?? false;
  const isBusy = follow.isPending || unfollow.isPending;

  const handleClick = async () => {
    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để theo dõi kênh');
      router.push('/login');
      return;
    }
    try {
      if (isFollowing) {
        setLocalState(false);
        await unfollow.mutateAsync(channelId);
        toast.success('Đã bỏ theo dõi kênh');
      } else {
        setLocalState(true);
        await follow.mutateAsync(channelId);
        toast.success('Đã theo dõi kênh');
      }
    } catch (err: any) {
      setLocalState(null);
      toast.error('Thao tác thất bại', {
        description: err?.response?.data?.message || err?.message,
      });
    }
  };

  if (loadingStatus && localState === null) {
    return (
      <Button variant={buttonVariant} disabled className="gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Đang tải
      </Button>
    );
  }

  return (
    <Button
      variant={isFollowing ? 'outline' : buttonVariant}
      onClick={handleClick}
      disabled={isBusy}
      className="gap-2"
    >
      {isBusy ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isFollowing ? (
        <BellOff className="w-4 h-4" />
      ) : (
        <Bell className="w-4 h-4" />
      )}
      {isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
    </Button>
  );
}
