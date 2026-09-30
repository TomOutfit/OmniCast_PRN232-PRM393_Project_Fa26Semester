// ============================================================
// OmniCast - Search Validation Schema
// Used to validate search inputs before calling /search.
// Includes business rules:
//   - query must be at least SEARCH_QUERY_MIN characters
//   - page must be >= 1
//   - limit must be in [1, SEARCH_PAGE_SIZE_MAX]
// ============================================================

import { z } from 'zod';
import { LIMITS } from '@/lib/constants/limits';

export const searchTypeSchema = z.enum(['all', 'channels', 'programs', 'recordings'], {
  errorMap: () => ({ message: 'Loại tìm kiếm không hợp lệ' }),
});

export const searchSortSchema = z.enum(['relevance', 'recent', 'popular'], {
  errorMap: () => ({ message: 'Thứ tự sắp xếp không hợp lệ' }),
});

export const searchSchema = z.object({
  query: z
    .string()
    .trim()
    .min(LIMITS.SEARCH_QUERY_MIN, `Từ khóa phải có ít nhất ${LIMITS.SEARCH_QUERY_MIN} ký tự`)
    .max(LIMITS.SEARCH_QUERY_MAX, `Từ khóa tối đa ${LIMITS.SEARCH_QUERY_MAX} ký tự`),

  type: searchTypeSchema.default('all'),
  sortBy: searchSortSchema.default('relevance'),

  category: z
    .string()
    .max(60)
    .optional()
    .or(z.literal('')),

  page: z
    .number()
    .int('Trang phải là số nguyên')
    .min(1, 'Trang phải >= 1')
    .default(1),

  limit: z
    .number()
    .int()
    .min(1)
    .max(LIMITS.SEARCH_PAGE_SIZE_MAX, `Tối đa ${LIMITS.SEARCH_PAGE_SIZE_MAX} kết quả mỗi trang`)
    .default(LIMITS.SEARCH_PAGE_SIZE_DEFAULT),
});
export type SearchInput = z.infer<typeof searchSchema>;

/** Coerce from URLSearchParams (e.g. `?q=...&page=2`) */
export function parseSearchParams(params: URLSearchParams): Partial<SearchInput> {
  const out: Partial<SearchInput> = {};
  const q = params.get('q') ?? params.get('query');
  if (q) out.query = q;
  const type = params.get('type');
  if (type) out.type = searchTypeSchema.parse(type);
  const sortBy = params.get('sortBy');
  if (sortBy) out.sortBy = searchSortSchema.parse(sortBy);
  const category = params.get('category');
  if (category) out.category = category;
  const page = params.get('page');
  if (page) out.page = Number.parseInt(page, 10) || 1;
  const limit = params.get('limit');
  if (limit) out.limit = Number.parseInt(limit, 10) || LIMITS.SEARCH_PAGE_SIZE_DEFAULT;
  return out;
}