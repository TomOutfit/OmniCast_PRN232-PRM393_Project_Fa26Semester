import type { Metadata } from 'next';
import Link from 'next/link';
import { 
  Users, 
  Tv, 
  Play, 
  Eye, 
  TrendingUp, 
  TrendingDown,
  Clock,
  AlertTriangle,
  Shield,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Quản lý hệ thống OmniCast',
};

export default function AdminDashboardPage() {
  // Mock data
  const stats = [
    { 
      label: 'Tổng người dùng', 
      value: '125,430', 
      change: '+12.5%', 
      trend: 'up',
      icon: Users,
      color: 'text-primary-400'
    },
    { 
      label: 'Kênh hoạt động', 
      value: '24', 
      change: '+2', 
      trend: 'up',
      icon: Tv,
      color: 'text-accent-cyan'
    },
    { 
      label: 'Chương trình hôm nay', 
      value: '186', 
      change: '+15%', 
      trend: 'up',
      icon: Play,
      color: 'text-accent-gold'
    },
    { 
      label: 'Lượt xem hôm nay', 
      value: '2.4M', 
      change: '-3.2%', 
      trend: 'down',
      icon: Eye,
      color: 'text-purple-400'
    },
  ];

  const recentActivities = [
    { id: 1, action: 'User registered', user: 'nguyen.van.a@email.com', time: '2 phút trước', type: 'user' },
    { id: 2, action: 'New channel approved', user: 'Omni Sport 3', time: '15 phút trước', type: 'channel' },
    { id: 3, action: 'Live stream started', user: 'Omni News', time: '23 phút trước', type: 'live' },
    { id: 4, action: 'Report submitted', user: 'Staff: tran.thi.b', time: '1 giờ trước', type: 'report' },
    { id: 5, action: 'Content flagged', user: 'System AI', time: '2 giờ trước', type: 'alert' },
  ];

  const liveChannels = [
    { name: 'Omni Sport 1', viewers: 2450000, status: 'healthy' },
    { name: 'Omni Show', viewers: 1890000, status: 'healthy' },
    { name: 'Omni News', viewers: 1200000, status: 'warning' },
    { name: 'Omni Cine', viewers: 980000, status: 'healthy' },
  ];

  const systemHealth = {
    uptime: 99.97,
    avgResponse: 124,
    activeConnections: 45678,
    errorRate: 0.02,
  };

  return (
    <div className="min-h-[80vh]">
      {/* Page Header */}
      <div className="bg-dark-900 border-b border-dark-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-dark-400">Xem tổng quan hệ thống và quản lý nội dung</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Báo cáo
              </Button>
              <Button className="gap-2">
                <Shield className="w-4 h-4" />
                Kiểm duyệt
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Quick Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { href: '/admin/users', label: 'Quản lý người dùng', icon: Users, color: 'from-blue-600 to-blue-800' },
            { href: '/admin/audit-logs', label: 'Nhật ký hoạt động', icon: Activity, color: 'from-purple-600 to-purple-800' },
            { href: '/studio/curator', label: 'AI Curator Studio', icon: Tv, color: 'from-green-600 to-green-800' },
            { href: '/epg', label: 'Quản lý EPG', icon: Clock, color: 'from-orange-600 to-orange-800' },
          ].map((item) => (
            <Link key={item.href} href={item.href}>
              <Card className="p-4 glass-card hover:border-primary-500/50 transition-all cursor-pointer group">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
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
                <div className={`w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  stat.trend === 'up' ? 'text-green-400' : 'text-red-400'
                }`}>
                  {stat.trend === 'up' ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  {stat.change}
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
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
              <Link href="/channels" className="text-sm text-primary-400 hover:text-primary-300">
                Xem tất cả
              </Link>
            </div>
            <div className="divide-y divide-dark-700">
              {liveChannels.map((channel) => (
                <div key={channel.name} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-dark-700 flex items-center justify-center">
                      <Tv className="w-5 h-5 text-dark-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{channel.name}</p>
                      <p className="text-sm text-dark-400">
                        {(channel.viewers / 1000000).toFixed(1)}M người xem
                      </p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${
                    channel.status === 'healthy' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {channel.status === 'healthy' ? 'Tốt' : 'Cảnh báo'}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* System Health */}
          <Card className="glass-card">
            <div className="p-4 border-b border-dark-700">
              <h2 className="font-bold text-white">Tình trạng hệ thống</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-dark-400">Uptime</span>
                <span className="text-white font-medium">{systemHealth.uptime}%</span>
              </div>
              <div className="w-full bg-dark-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${systemHealth.uptime}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-dark-400">Response Time</span>
                <span className="text-white font-medium">{systemHealth.avgResponse}ms</span>
              </div>
              <div className="w-full bg-dark-700 rounded-full h-2">
                <div className="bg-primary-500 h-2 rounded-full" style={{ width: '70%' }} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-dark-400">Active Connections</span>
                <span className="text-white font-medium">{systemHealth.activeConnections.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-dark-400">Error Rate</span>
                <span className="text-green-400 font-medium">{systemHealth.errorRate}%</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="mt-6 glass-card">
          <div className="p-4 border-b border-dark-700 flex items-center justify-between">
            <h2 className="font-bold text-white">Hoạt động gần đây</h2>
            <Link href="/admin/audit-logs" className="text-sm text-primary-400 hover:text-primary-300">
              Xem tất cả
            </Link>
          </div>
          <div className="divide-y divide-dark-700">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.type === 'alert' ? 'bg-red-500/20 text-red-400' :
                    activity.type === 'user' ? 'bg-blue-500/20 text-blue-400' :
                    activity.type === 'channel' ? 'bg-green-500/20 text-green-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {activity.type === 'alert' ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : activity.type === 'user' ? (
                      <Users className="w-4 h-4" />
                    ) : activity.type === 'channel' ? (
                      <Tv className="w-4 h-4" />
                    ) : (
                      <Activity className="w-4 h-4" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-white">{activity.action}</p>
                    <p className="text-xs text-dark-500">{activity.user}</p>
                  </div>
                </div>
                <span className="text-xs text-dark-500">{activity.time}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
