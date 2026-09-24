'use client';

import { useState } from 'react';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  Activity,
  User,
  Tv,
  Shield,
  FileEdit,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Mock audit logs
const mockLogs = [
  { id: 1, action: 'USER_LOGIN', user: 'admin@omnicast.tv', role: 'ADMIN', resource: 'System', details: 'Login successful from 192.168.1.1', timestamp: '2026-09-24T10:30:00', status: 'success' },
  { id: 2, action: 'CHANNEL_CREATE', user: 'staff@omnicast.tv', role: 'STAFF', resource: 'Channel: Omni Sport 3', details: 'New channel created and approved', timestamp: '2026-09-24T10:15:00', status: 'success' },
  { id: 3, action: 'PROGRAM_SCHEDULE', user: 'staff@omnicast.tv', role: 'STAFF', resource: 'EPG', details: 'Scheduled 5 new programs for tomorrow', timestamp: '2026-09-24T09:45:00', status: 'success' },
  { id: 4, action: 'CONTENT_FLAG', user: 'AI_System', role: 'SYSTEM', resource: 'Program: Test Content', details: 'Age-restricted content detected: T16', timestamp: '2026-09-24T09:30:00', status: 'warning' },
  { id: 5, action: 'USER_REGISTER', user: 'new.user@email.com', role: 'GUEST', resource: 'Auth', details: 'New user registration', timestamp: '2026-09-24T09:15:00', status: 'success' },
  { id: 6, action: 'USER_LOGIN_FAILED', user: 'unknown@hack.com', role: 'GUEST', resource: 'Auth', details: 'Failed login attempt - invalid credentials', timestamp: '2026-09-24T09:00:00', status: 'error' },
  { id: 7, action: 'PERMISSION_CHANGE', user: 'admin@omnicast.tv', role: 'ADMIN', resource: 'User: staff@omnicast.tv', details: 'Role changed from VIEWER to STAFF', timestamp: '2026-09-24T08:45:00', status: 'success' },
  { id: 8, action: 'CONTENT_DELETE', user: 'staff@omnicast.tv', role: 'STAFF', resource: 'Program: Old Movie', details: 'Content deleted due to copyright', timestamp: '2026-09-24T08:30:00', status: 'success' },
  { id: 9, action: 'AI_REPORT_GENERATED', user: 'AI_System', role: 'SYSTEM', resource: 'Curator Report', details: 'AI report generated for Champions League match', timestamp: '2026-09-24T08:15:00', status: 'success' },
  { id: 10, action: 'USER_SUSPENDED', user: 'admin@omnicast.tv', role: 'ADMIN', resource: 'User: banned.user@email.com', details: 'Account suspended for terms violation', timestamp: '2026-09-24T08:00:00', status: 'warning' },
  { id: 11, action: 'CHANNEL_SETTINGS', user: 'staff@omnicast.tv', role: 'STAFF', resource: 'Channel: Omni News', details: 'Updated channel category and tags', timestamp: '2026-09-24T07:45:00', status: 'success' },
  { id: 12, action: 'LIVE_START', user: 'staff@omnicast.tv', role: 'STAFF', resource: 'Channel: Omni Sport 1', details: 'Live stream started', timestamp: '2026-09-24T07:30:00', status: 'success' },
];

const actionIcons: Record<string, any> = {
  USER_LOGIN: User,
  USER_REGISTER: User,
  USER_LOGIN_FAILED: User,
  USER_SUSPENDED: User,
  PERMISSION_CHANGE: Shield,
  CHANNEL_CREATE: Tv,
  CHANNEL_SETTINGS: Tv,
  PROGRAM_SCHEDULE: FileEdit,
  CONTENT_FLAG: AlertTriangle,
  CONTENT_DELETE: Trash2,
  AI_REPORT_GENERATED: Activity,
  LIVE_START: Tv,
};

const actionColors: Record<string, string> = {
  success: 'bg-green-500/20 text-green-400',
  warning: 'bg-yellow-500/20 text-yellow-400',
  error: 'bg-red-500/20 text-red-400',
};

export default function AuditLogsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredLogs = mockLogs.filter((log) => {
    const matchesSearch = 
      log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = selectedAction === 'all' || log.action.includes(selectedAction);
    const matchesRole = selectedRole === 'all' || log.role === selectedRole;
    
    return matchesSearch && matchesAction && matchesRole;
  });

  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-[80vh]">
      {/* Page Header */}
      <div className="bg-dark-900 border-b border-dark-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-white">Nhật ký hoạt động</h1>
          <p className="text-dark-400">Theo dõi tất cả hoạt động trên hệ thống</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{mockLogs.filter(l => l.status === 'success').length}</p>
                <p className="text-sm text-dark-400">Thành công</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{mockLogs.filter(l => l.status === 'warning').length}</p>
                <p className="text-sm text-dark-400">Cảnh báo</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Activity className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{mockLogs.filter(l => l.status === 'error').length}</p>
                <p className="text-sm text-dark-400">Lỗi</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 glass-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{mockLogs.length}</p>
                <p className="text-sm text-dark-400">Tổng hoạt động</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4 glass-card mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm..."
                className="pl-10 bg-dark-900 border-dark-700"
              />
            </div>

            {/* Action Filter */}
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white"
            >
              <option value="all">Tất cả hành động</option>
              <option value="USER">Người dùng</option>
              <option value="CHANNEL">Kênh</option>
              <option value="PROGRAM">Chương trình</option>
              <option value="CONTENT">Nội dung</option>
              <option value="AI">AI</option>
            </select>

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="ADMIN">Admin</option>
              <option value="STAFF">Staff</option>
              <option value="SYSTEM">System</option>
            </select>
          </div>
        </Card>

        {/* Logs Table */}
        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Thời gian</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Hành động</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Người dùng</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Chi tiết</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {paginatedLogs.map((log) => {
                  const Icon = actionIcons[log.action] || Activity;
                  return (
                    <tr key={log.id} className="hover:bg-dark-800/50 transition-colors">
                      <td className="px-4 py-4 text-sm text-dark-400 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${actionColors[log.status]}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{log.action.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-dark-500">{log.resource}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-white">{log.user}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          log.role === 'ADMIN' ? 'bg-red-500/20 text-red-400' :
                          log.role === 'STAFF' ? 'bg-yellow-500/20 text-yellow-400' :
                          log.role === 'SYSTEM' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-dark-600/50 text-dark-400'
                        }`}>
                          {log.role}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-dark-400 max-w-md">
                        {log.details}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.status === 'success' ? 'bg-green-500/20 text-green-400' :
                          log.status === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          {log.status === 'success' ? 'Thành công' : 
                           log.status === 'warning' ? 'Cảnh báo' : 'Lỗi'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-dark-700 flex items-center justify-between">
            <p className="text-sm text-dark-400">
              Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredLogs.length)} của {filteredLogs.length} bản ghi
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
