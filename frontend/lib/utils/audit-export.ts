// ============================================================
// OmniCast - Enterprise Security Audit Logs Exporter
// ------------------------------------------------------------
// Exports audit logs to:
//   1. Excel (.xlsx) with auto-formatted column widths & headers
//   2. JSON (.json) formatted with 2-space indentation
//   3. PDF (.pdf) formatted with jsPDF + autoTable table layout
// ============================================================

import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export interface AuditLogExportItem {
  id: string;
  createdAt: string | Date;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  ipAddress?: string | null;
  oldValues?: any;
  newValues?: any;
}

export interface ExportMeta {
  adminEmail?: string;
  totalRecords?: number;
  selectedAction?: string;
}

/** Helper to download any Blob in browser */
export function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/** Determine severity label */
export function getActionStatusLabel(action: string): 'Thành công' | 'Cảnh báo' | 'Lỗi' {
  const upper = (action || '').toUpperCase();
  if (
    upper.includes('FAIL') ||
    upper.includes('ERROR') ||
    upper.includes('BLOCKED') ||
    upper.includes('DENIED') ||
    upper.includes('REJECT')
  ) {
    return 'Lỗi';
  }
  if (
    upper.includes('WARN') ||
    upper.includes('FLAG') ||
    upper.includes('SKIP') ||
    upper.includes('DELETE') ||
    upper.includes('DEACTIVATE') ||
    upper.includes('CANCEL') ||
    upper.includes('STOP')
  ) {
    return 'Cảnh báo';
  }
  return 'Thành công';
}

/** Human readable action name */
export function getActionReadableName(action: string): string {
  const map: Record<string, string> = {
    USER_LOGIN: 'Đăng nhập thành công',
    USER_LOGIN_FAILED: 'Đăng nhập thất bại',
    USER_REGISTER: 'Đăng ký tài khoản',
    USER_ROLE_CHANGE: 'Thay đổi quyền hạn',
    USER_DEACTIVATE: 'Vô hiệu hóa người dùng',
    ADMIN_PROMOTION_BLOCKED: 'Chặn tự phong Admin trái phép',
    CHANNEL_CREATE: 'Tạo kênh phát sóng mới',
    CHANNEL_UPDATE: 'Cập nhật thông tin kênh',
    CHANNEL_DELETE: 'Xóa kênh phát sóng',
    CREATE_LIVE_EVENT: 'Lên lịch phát sóng EPG',
    UPDATE_LIVE_EVENT: 'Cập nhật lịch phát sóng',
    DELETE_LIVE_EVENT: 'Hủy lịch phát sóng',
    STUDIO_CURATE_LIVE: 'Phát sóng trực tiếp (Go Live)',
    STUDIO_STOP_LIVE: 'Dừng phát sóng trực tiếp',
    STUDIO_SELF_RECORD_UPLOAD: 'Tải lên video phát sóng',
    STUDIO_LIBRARY_ADD: 'Thêm video vào kho phát sóng',
    AI_CURATION_PREVIEW: 'Chạy phân tích AI (Preview)',
    AI_CURATION_COMPLETE: 'Lưu báo cáo AI Curator',
    AI_CURATION_APPLIED: 'Áp dụng đề xuất AI Curator',
    INGEST_YT_RSS_RUN: 'Đồng bộ RSS Kênh YouTube',
    INGEST_YOUTUBE_RUN: 'Đồng bộ nội dung YouTube',
    INGEST_TWITCH_RUN: 'Đồng bộ nội dung Twitch',
    TMDB_ENRICH_LIVE_EVENT: 'Làm giàu dữ liệu phim TMDB',
    TMDB_ENRICH_RECORDING: 'Làm giàu bản ghi TMDB',
    WATCHLIST_ADD: 'Thêm vào danh sách yêu thích',
    WATCHLIST_REMOVE: 'Xóa khỏi danh sách yêu thích',
    CREATE_COMMENT: 'Đăng bình luận mới',
    DELETE_COMMENT: 'Xóa bình luận vi phạm',
    SYSTEM_ANNOUNCEMENT_BROADCAST: 'Phát thông báo toàn hệ thống',
  };
  return map[action] || action;
}

/**
 * 1. EXPORT TO EXCEL (.xlsx)
 */
export function exportAuditLogsToExcel(
  logs: AuditLogExportItem[],
  meta?: ExportMeta,
) {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
  const filename = `omnicast-audit-logs-${timestamp}.xlsx`;

  const rows = logs.map((log, index) => {
    const dt = log.createdAt ? new Date(log.createdAt) : null;
    const timeStr =
      dt && !isNaN(dt.getTime())
        ? format(dt, 'dd/MM/yyyy HH:mm:ss')
        : String(log.createdAt || '—');

    let details = '—';
    if (log.newValues) {
      details =
        typeof log.newValues === 'object'
          ? JSON.stringify(log.newValues)
          : String(log.newValues);
    } else if (log.oldValues) {
      details =
        typeof log.oldValues === 'object'
          ? JSON.stringify(log.oldValues)
          : String(log.oldValues);
    }

    return {
      'STT': index + 1,
      'Thời gian': timeStr,
      'Mã hành động': log.action,
      'Ý nghĩa hành động': getActionReadableName(log.action),
      'Trạng thái': getActionStatusLabel(log.action),
      'Đối tượng': log.entityType || '—',
      'ID đối tượng': log.entityId || '—',
      'Người thực hiện': log.userEmail || (log.userId === 'system-ingest' ? 'Hệ thống tự động' : log.userId || '—'),
      'Địa chỉ IP': log.ipAddress || '—',
      'Dữ liệu chi tiết': details,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // Set explicit professional column widths
  worksheet['!cols'] = [
    { wch: 6 },  // STT
    { wch: 20 }, // Thời gian
    { wch: 28 }, // Mã hành động
    { wch: 30 }, // Ý nghĩa hành động
    { wch: 14 }, // Trạng thái
    { wch: 18 }, // Đối tượng
    { wch: 38 }, // ID đối tượng
    { wch: 30 }, // Người thực hiện
    { wch: 16 }, // Địa chỉ IP
    { wch: 60 }, // Dữ liệu chi tiết
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Nhật ký kiểm toán');

  // Add Summary sheet
  const summaryRows = [
    { 'Thuộc tính': 'Hệ thống', 'Giá trị': 'OmniCast Network - Enterprise Broadcast Intelligence' },
    { 'Thuộc tính': 'Loại báo cáo', 'Giá trị': 'Nhật ký kiểm toán an toàn thông tin (Security Audit Logs)' },
    { 'Thuộc tính': 'Thời gian xuất', 'Giá trị': format(new Date(), 'dd/MM/yyyy HH:mm:ss') },
    { 'Thuộc tính': 'Người xuất', 'Giá trị': meta?.adminEmail || 'Quản trị viên' },
    { 'Thuộc tính': 'Tổng số bản ghi', 'Giá trị': logs.length },
    { 'Thuộc tính': 'Bộ lọc hành động', 'Giá trị': meta?.selectedAction || 'Tất cả' },
  ];
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 25 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Thông tin báo cáo');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  downloadBlob(blob, filename);
}

/**
 * 2. EXPORT TO JSON (.json)
 */
export function exportAuditLogsToJson(
  logs: AuditLogExportItem[],
  meta?: ExportMeta,
) {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
  const filename = `omnicast-audit-logs-${timestamp}.json`;

  const payload = {
    metadata: {
      system: 'OmniCast Network Enterprise',
      reportType: 'Security Audit Logs',
      exportedAt: new Date().toISOString(),
      exportedBy: meta?.adminEmail || 'Admin',
      totalRecords: logs.length,
      filter: meta?.selectedAction || 'all',
    },
    data: logs,
  };

  const jsonStr = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, filename);
}

/**
 * 3. EXPORT TO PDF (.pdf)
 */
export function exportAuditLogsToPdf(
  logs: AuditLogExportItem[],
  meta?: ExportMeta,
) {
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
  const filename = `omnicast-audit-logs-${timestamp}.pdf`;

  // Use landscape A4 for comprehensive audit table
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  // Clean ASCII normalization for PDF table rendering (avoids missing glyphs without huge font pack)
  const safeAscii = (str: string | null | undefined): string => {
    if (!str) return '—';
    return String(str)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D');
  };

  // Header Banner
  doc.setFillColor(12, 20, 33); // #0c1421
  doc.rect(0, 0, 297, 24, 'F');

  doc.setTextColor(0, 242, 254); // Cyan
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('OMNICAST NETWORK - SECURITY AUDIT LOGS REPORT', 14, 11);

  doc.setTextColor(148, 163, 184); // Slate 400
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Exported: ${format(new Date(), 'dd/MM/yyyy HH:mm:ss')} | Generated by: ${meta?.adminEmail || 'Administrator'} | Total: ${logs.length} records`,
    14,
    18,
  );

  // Table Body Rows
  const tableData = logs.map((log, index) => {
    const dt = log.createdAt ? new Date(log.createdAt) : null;
    const timeStr =
      dt && !isNaN(dt.getTime())
        ? format(dt, 'dd/MM/yyyy HH:mm:ss')
        : String(log.createdAt || '—');

    const status = getActionStatusLabel(log.action);
    const readable = getActionReadableName(log.action);

    const userStr =
      log.userEmail || (log.userId === 'system-ingest' ? 'System Ingest' : log.userId || '—');

    return [
      String(index + 1),
      timeStr,
      log.action,
      safeAscii(readable),
      safeAscii(status),
      log.entityType || '—',
      userStr,
      log.ipAddress || '—',
    ];
  });

  autoTable(doc, {
    startY: 28,
    head: [
      [
        '#',
        'Timestamp',
        'Action Code',
        'Action Description',
        'Status',
        'Entity',
        'User / Actor',
        'IP Address',
      ],
    ],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [18, 28, 45],
      textColor: [0, 242, 254],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'left',
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 41, 59],
      cellPadding: 2,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 32 },
      2: { cellWidth: 46 },
      3: { cellWidth: 50 },
      4: { cellWidth: 24, halign: 'center' },
      5: { cellWidth: 26 },
      6: { cellWidth: 50 },
      7: { cellWidth: 30 },
    },
    didDrawPage: (data) => {
      // Page numbering footer
      const str = `Page ${data.pageNumber} of ${(doc as any).internal.getNumberOfPages()}`;
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        str,
        297 - 14,
        210 - 8,
        { align: 'right' },
      );
      doc.text(
        'OmniCast Enterprise Media & Broadcast Intelligence — Confidential Audit Record',
        14,
        210 - 8,
      );
    },
  });

  doc.save(filename);
}
