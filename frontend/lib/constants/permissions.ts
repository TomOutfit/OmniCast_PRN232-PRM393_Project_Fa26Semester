// ============================================================
// OmniCast - Permission Constants
// Used by client-side guards and by `lib/guards/permissions.ts`.
// ============================================================

import type { UserRole } from '@/types';

/**
 * Capabilities are coarse-grained strings. Specific actions can require
 * additional checks (ownership, moderation state) — see `lib/guards/`.
 */
export type Capability =
  // Channel capabilities
  | 'channel.create'
  | 'channel.update'
  | 'channel.delete'
  | 'channel.feature'
  | 'channel.moderate'
  // Program capabilities
  | 'program.create'
  | 'program.update'
  | 'program.delete'
  | 'program.approve'
  | 'program.reject'
  // Comment capabilities
  | 'comment.create'
  | 'comment.delete.own'
  | 'comment.delete.any'
  | 'comment.pin'
  // User capabilities
  | 'user.view'
  | 'user.update.own'
  | 'user.update.any'
  | 'user.deactivate'
  | 'user.changeRole'
  // Recording capabilities
  | 'recording.create'
  | 'recording.update'
  | 'recording.delete'
  | 'recording.feature'
  // Analytics / Audit
  | 'analytics.view'
  | 'audit.view'
  // AI Curator
  | 'aiCurator.run';

/** Minimum role required for each capability. */
export const CAPABILITY_MIN_ROLE: Record<Capability, UserRole> = {
  'channel.create': 'VIEWER',
  'channel.update': 'STAFF',
  'channel.delete': 'ADMIN',
  'channel.feature': 'STAFF',
  'channel.moderate': 'STAFF',

  'program.create': 'STAFF',
  'program.update': 'STAFF',
  'program.delete': 'STAFF',
  'program.approve': 'STAFF',
  'program.reject': 'STAFF',

  'comment.create': 'VIEWER',
  'comment.delete.own': 'VIEWER',
  'comment.delete.any': 'STAFF',
  'comment.pin': 'STAFF',

  'user.view': 'STAFF',
  'user.update.own': 'VIEWER',
  'user.update.any': 'ADMIN',
  'user.deactivate': 'ADMIN',
  'user.changeRole': 'ADMIN',

  'recording.create': 'STAFF',
  'recording.update': 'STAFF',
  'recording.delete': 'STAFF',
  'recording.feature': 'STAFF',

  'analytics.view': 'STAFF',
  'audit.view': 'ADMIN',

  'aiCurator.run': 'STAFF',
};

/** Human-readable Vietnamese labels for capabilities (admin UI) */
export const CAPABILITY_LABELS: Record<Capability, string> = {
  'channel.create': 'Tạo kênh',
  'channel.update': 'Chỉnh sửa kênh',
  'channel.delete': 'Xóa kênh',
  'channel.feature': 'Đánh dấu kênh nổi bật',
  'channel.moderate': 'Kiểm duyệt kênh',
  'program.create': 'Tạo chương trình',
  'program.update': 'Chỉnh sửa chương trình',
  'program.delete': 'Xóa chương trình',
  'program.approve': 'Phê duyệt chương trình',
  'program.reject': 'Từ chối chương trình',
  'comment.create': 'Đăng bình luận',
  'comment.delete.own': 'Xóa bình luận của mình',
  'comment.delete.any': 'Xóa bất kỳ bình luận',
  'comment.pin': 'Ghim bình luận',
  'user.view': 'Xem danh sách người dùng',
  'user.update.own': 'Cập nhật hồ sơ',
  'user.update.any': 'Cập nhật người dùng khác',
  'user.deactivate': 'Vô hiệu hóa tài khoản',
  'user.changeRole': 'Thay đổi vai trò',
  'recording.create': 'Tạo bản ghi',
  'recording.update': 'Chỉnh sửa bản ghi',
  'recording.delete': 'Xóa bản ghi',
  'recording.feature': 'Đánh dấu bản ghi nổi bật',
  'analytics.view': 'Xem thống kê',
  'audit.view': 'Xem nhật ký kiểm tra',
  'aiCurator.run': 'Chạy AI Curator',
};
