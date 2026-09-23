// ============================================================
// OmniCast - Common Interfaces
// ============================================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
}

export interface CursorPagination {
  cursor?: string;
  limit?: number;
}

export interface DateRangeFilter {
  fromDate?: Date;
  toDate?: Date;
}
