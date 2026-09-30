// ============================================================
// OmniCast - Validation & Business Limits
// Centralized so that Zod schemas and the backend DTOs can share
// the same numeric constraints.
// ============================================================

/** User-visible field length limits */
export const LIMITS = {
  // Auth
  PASSWORD_MIN: 8,
  PASSWORD_MAX: 128,
  FULL_NAME_MIN: 2,
  FULL_NAME_MAX: 80,

  // Channels
  CHANNEL_NAME_MIN: 2,
  CHANNEL_NAME_MAX: 80,
  CHANNEL_TAGLINE_MAX: 140,
  CHANNEL_DESCRIPTION_MAX: 2000,
  /** Display slug pattern. We validate client-side; backend may re-validate. */
  CHANNEL_SLUG_MIN: 3,
  CHANNEL_SLUG_MAX: 64,

  // Programs / Live events
  PROGRAM_TITLE_MIN: 3,
  PROGRAM_TITLE_MAX: 200,
  PROGRAM_DESCRIPTION_MAX: 5000,
  TAGS_MIN: 0,
  TAGS_MAX: 20,
  TAG_MIN_LEN: 1,
  TAG_MAX_LEN: 32,
  DURATION_MIN_SEC: 60, // 1 minute
  DURATION_MAX_SEC: 60 * 60 * 24, // 24 hours

  // Comments
  COMMENT_MIN: 1,
  COMMENT_MAX: 1000,
  COMMENT_NOTE_MAX: 500,

  // Search
  SEARCH_QUERY_MIN: 2,
  SEARCH_QUERY_MAX: 120,
  SEARCH_PAGE_SIZE_MAX: 100,
  SEARCH_PAGE_SIZE_DEFAULT: 20,

  // AI Curator
  AI_TITLE_MIN: 3,
  AI_TITLE_MAX: 200,
  AI_DESCRIPTION_MAX: 5000,
  AI_TAGS_MAX: 20,

  // Recordings
  RECORDING_TITLE_MAX: 200,
  RECORDING_DESCRIPTION_MAX: 5000,

  // Pagination
  PAGE_SIZE_DEFAULT: 20,
  PAGE_SIZE_MAX: 100,
} as const;

/** ISO 639-1 language codes accepted by the platform */
export const SUPPORTED_LANGUAGE_CODES = [
  'vi',
  'en',
  'ko',
  'ja',
  'zh',
  'fr',
  'es',
  'pt',
  'th',
  'id',
] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGE_CODES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  ko: '한국어',
  ja: '日本語',
  zh: '中文',
  fr: 'Français',
  es: 'Español',
  pt: 'Português',
  th: 'ภาษาไทย',
  id: 'Bahasa Indonesia',
};

/** Stream quality presets (matches `StreamQuality` type) */
export const STREAM_QUALITY_OPTIONS = [
  { value: 'AUTO', label: 'Tự động (đề xuất)' },
  { value: 'SD_480P', label: 'SD 480p' },
  { value: 'HD_720P', label: 'HD 720p' },
  { value: 'FULL_HD_1080P', label: 'Full HD 1080p' },
  { value: 'QHD_1440P', label: 'QHD 1440p' },
  { value: 'UHD_4K', label: 'UHD 4K' },
] as const;

/** Allowed content sources */
export const CONTENT_SOURCES = [
  { value: 'EXTERNAL', label: 'Liên kết ngoài (YouTube, Twitch...)' },
  { value: 'UPLOADED', label: 'Tải lên từ thiết bị' },
  { value: 'GENERATED', label: 'Nội dung AI tạo' },
] as const;

/** Slug regex: lowercase letters, digits, dashes. Cannot start/end with dash. */
export const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/** Hex color (#RGB or #RRGGBB) */
export const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** Basic URL check (http/https). Does not validate reachability. */
export const URL_REGEX = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;
