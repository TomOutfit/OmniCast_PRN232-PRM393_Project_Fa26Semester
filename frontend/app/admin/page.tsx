'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Tv,
  Play,
  Eye,
  Clock,
  AlertTriangle,
  Shield,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { useRecentActivity } from '@/lib/hooks/useAuditLogs';
import { useChannels } from '@/lib/hooks/useChannels';
import { useLiveNow } from '@/lib/hooks/usePrograms';
import { useAdminUsers } from '@/lib/hooks/useUsers';
import { toast } from 'sonner';
import type { LiveEvent } from '@/types';

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/');
      toast.error('Bạn không có quyền truy cập');
    }
  }, [authLoading, user, router]);

  const { data: usersData } = useAdminUsers({ limit: 1 });
  const { data: channelsData } = useChannels({ isActive: true, limit: 100 });
  const { data: liveEvents } = useLiveNow();
  const { data: activities, isLoading: loadingActivities } = useRecentActivity(8);

  const totalUsers = usersData?.meta?.total ?? 0;
  const totalChannels = channelsData?.meta?.total ?? 0;
  const liveChannels: LiveEvent[] = Array.isArray(liveEvents) ? liveEvents : (liveEvents as any)?.data ?? [];

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  if (!user || user.role !== 'ADMIN') {
    return null;
  }

  const totalViewers = liveChannels.reduce((s, e) => s + (e.viewerCount || 0), 0);

  const stats = [
    {
      label: 'Tổng người dùng',
      value: totalUsers.toLocaleString(),
      icon: Users,
      color: 'text-primary-400',
    },
    {
      label: 'Kênh hoạt động',
      value: String(totalChannels),
      icon: Tv,
      color: 'text-accent-cyan',
    },
    {
      label: 'Đang phát sóng',
      value: String(liveChannels.length),
      icon: Play,
      color: 'text-accent-gold',
    },
    {
      label: 'Người xem trực tiếp',
      value: formatCompact(totalViewers),
      icon: Eye,
      color: 'text-purple-400',
    },
  ];

  return (
    <div className="min-h-[80vh]">
      {/* Page Header */}
      <div className="bg-dark-900 border-b border-dark-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-dark-400">
                Xem tổng quan hệ thống và quản lý nội dung
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild variant="outline" className="gap-2">
                <Link href="/admin/audit-logs">
                  <BarChart3 className="w-4 h-4" />
                  Nhật ký
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              href: '/admin/users',
              label: 'Quản lý người dùng',
              icon: Users,
              color: 'from-blue-600 to-blue-800',
            },
            {
              href: '/admin/audit-logs',
              label: 'Nhật ký hoạt động',
              icon: Activity,
              color: 'from-purple-600 to-purple-800',
            },
            {
              href: '/studio/curator',
              label: 'AI Curator Studio',
              icon: Tv,
              color: 'from-green-600 to-green-800',
            },
            {
              href: '/epg',
              label: 'Quản lý EPG',
              icon: Clock,
              color: 'from-orange-600 to-orange-800',
            },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="p-4 glass-card hover:border-primary-500/50 transition-all cursor-pointer group">
                <div
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}
                >
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <p className="font-medium text-white">{item.label}</p>
              </Card>
            </Link>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <Card key={stat.label} className="p-6 glass-card">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">
                {stat.value}
              </div>
              <p className="text-sm text-dark-400">{stat.label}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Live Channels */}
          <Card className="lg:col-span-2 glass-card">
            <div className="p-4 border-b border-dark-700 flex items-center justify-between">
              <h2 className="font-bold text-white flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                Kênh đang phát trực tiếp
              </h2>
              <Link
                href="/channels"
                className="text-sm text-primary-400 hover:text-primary-300"
              >
                Xem tất cả
              </Link>
            </div>
            <div className="divide-y divide-dark-700">
              {liveChannels.length === 0 ? (
                <div className="p-6 text-center text-dark-400 text-sm">
                  Hiện không có kênh nào đang phát trực tiếp.
                </div>
              ) : (
                liveChannels.slice(0, 6).map((event) => (
                  <div
                    key={event.id}
                    className="p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0">
                        <Tv className="w-5 h-5 text-dark-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">
                          {event.channel?.name || 'Channel'}
                        </p>
                        <p className="text-sm text-dark-400 truncate">
                          {event.title}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-white">
                        {formatCompact(event.viewerCount)}
                      </p>
                      <p className="text-xs text-dark-500">đang xem</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Quick Stats */}
          <Card className="glass-card">
            <div className="p-4 border-b border-dark-700">
              <h2 className="font-bold text-white">Tổng quan nhanh</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-dark-400 text-sm">
                    Tỷ lệ kênh live
                  </span>
                  <span className="text-white font-medium">
                    {totalChannels > 0
                      ? Math.round((liveChannels.length / totalChannels) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-dark-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${
                        totalChannels > 0
                          ? Math.min(
                              100,
                              (liveChannels.length / totalChannels) * 100,
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-dark-700">
                <span className="text-dark-400 text-sm">Người xem cao nhất</span>
                <span className="text-white font-medium">
                  {formatCompact(
                    Math.max(0, ...liveChannels.map((e) => e.viewerCount || 0)),
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-dark-700">
                <span className="text-dark-400 text-sm">Tổng người dùng</span>
                <span className="text-white font-medium">
                  {totalUsers.toLocaleString()}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mt-6 glass-card">
          <div className="p-4 border-b border-dark-700 flex items-center justify-between">
            <h2 className="font-bold text-white">Hoạt động gần đây</h2>
            <Link
              href="/admin/audit-logs"
              className="text-sm text-primary-400 hover:text-primary-300"
            >
              Xem tất cả
            </Link>
          </div>
          <div className="divide-y divide-dark-700">
            {loadingActivities ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
              </div>
            ) : !activities || activities.length === 0 ? (
              <div className="p-6 text-center text-dark-400 text-sm">
                Chưa có hoạt động nào.
              </div>
            ) : (
              activities.map((activity) => (
                <div
                  key={activity.id}
                  className="p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-white">
                        {activity.action.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-dark-500">
                        {activity.userEmail || 'Hệ thống'} •{' '}
                        {activity.entityType || '-'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-dark-500 whitespace-nowrap">
                    {formatTimeAgo(activity.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K`;
  return String(n);
}

function formatTimeAgo(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s trước`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m trước`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h trước`;
    const day = Math.floor(hr / 24);
    return `${day}d trước`;
  } catch {
    return '';
  }
}
