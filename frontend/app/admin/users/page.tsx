'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  MoreHorizontal,
  Mail,
  Shield,
  UserX,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

// Mock users data
const mockUsers = [
  { id: '1', fullName: 'Nguyễn Văn A', email: 'nguyen.van.a@email.com', role: 'ADMIN', isActive: true, emailVerified: true, createdAt: '2024-01-15', lastLoginAt: '2026-09-24T10:30:00' },
  { id: '2', fullName: 'Trần Thị B', email: 'tran.thi.b@email.com', role: 'STAFF', isActive: true, emailVerified: true, createdAt: '2024-02-20', lastLoginAt: '2026-09-24T08:15:00' },
  { id: '3', fullName: 'Lê Hoàng C', email: 'le.hoang.c@email.com', role: 'VIEWER', isActive: true, emailVerified: true, createdAt: '2024-03-10', lastLoginAt: '2026-09-23T22:45:00' },
  { id: '4', fullName: 'Phạm Minh D', email: 'pham.minh.d@email.com', role: 'VIEWER', isActive: false, emailVerified: true, createdAt: '2024-04-05', lastLoginAt: '2026-09-20T14:20:00' },
  { id: '5', fullName: 'Hoàng Thị E', email: 'hoang.thi.e@email.com', role: 'STAFF', isActive: true, emailVerified: false, createdAt: '2024-05-12', lastLoginAt: '2026-09-24T09:00:00' },
  { id: '6', fullName: 'Đặng Quốc F', email: 'dang.quoc.f@email.com', role: 'GUEST', isActive: true, emailVerified: false, createdAt: '2024-06-18', lastLoginAt: null },
  { id: '7', fullName: 'Bùi Thị G', email: 'bui.thi.g@email.com', role: 'VIEWER', isActive: true, emailVerified: true, createdAt: '2024-07-22', lastLoginAt: '2026-09-24T11:30:00' },
  { id: '8', fullName: 'Ngô Văn H', email: 'ngo.van.h@email.com', role: 'ADMIN', isActive: true, emailVerified: true, createdAt: '2024-08-01', lastLoginAt: '2026-09-24T07:00:00' },
];

const roleColors: Record<string, string> = {
  ADMIN: 'bg-red-500/20 text-red-400 border-red-500/30',
  STAFF: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  VIEWER: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  GUEST: 'bg-dark-600/50 text-dark-400 border-dark-600',
};

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch = 
      user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    const matchesStatus = selectedStatus === 'all' || 
      (selectedStatus === 'active' && user.isActive) ||
      (selectedStatus === 'inactive' && !user.isActive);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-[80vh]">
      {/* Page Header */}
      <div className="bg-dark-900 border-b border-dark-800">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-white">Quản lý người dùng</h1>
          <p className="text-dark-400">Xem và quản lý tài khoản người dùng trên hệ thống</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
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
                placeholder="Tìm kiếm theo tên, email..."
                className="pl-10 bg-dark-900 border-dark-700"
              />
            </div>

            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="ADMIN">Admin</option>
              <option value="STAFF">Staff</option>
              <option value="VIEWER">Viewer</option>
              <option value="GUEST">Guest</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 bg-dark-900 border border-dark-700 rounded-lg text-white"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Bị khóa</option>
            </select>
          </div>
        </Card>

        {/* Users Table */}
        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-900/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Người dùng</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Vai trò</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Trạng thái</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Xác thực</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-dark-400">Đăng nhập gần nhất</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-dark-800/50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-medium">
                          {user.fullName[0]}
                        </div>
                        <div>
                          <p className="font-medium text-white">{user.fullName}</p>
                          <p className="text-sm text-dark-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${roleColors[user.role]}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {user.isActive ? (
                        <span className="flex items-center gap-1 text-green-400 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Hoạt động
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-400 text-sm">
                          <XCircle className="w-4 h-4" />
                          Bị khóa
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {user.emailVerified ? (
                        <span className="flex items-center gap-1 text-green-400 text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Đã xác thực
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-yellow-400 text-sm">
                          <XCircle className="w-4 h-4" />
                          Chưa xác thực
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-sm text-dark-400">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('vi-VN') : 'Chưa đăng nhập'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="text-dark-400 hover:text-white">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-dark-400 hover:text-white">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-dark-400 hover:text-red-400">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-dark-700 flex items-center justify-between">
            <p className="text-sm text-dark-400">
              Hiển thị {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredUsers.length)} của {filteredUsers.length} người dùng
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
