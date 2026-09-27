// ============================================================
// OmniCast - Shared Type Definitions (TypeScript)
// ============================================================

// User Types
export type UserRole = 'GUEST' | 'VIEWER' | 'STAFF' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  bio?: string;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

// Channel Types
export type LiveCategory =
  | 'SPORTS'
  | 'SHOW'
  | 'ENTERTAINMENT'
  | 'CINE'
  | 'DRAMA'
  | 'NEWS'
  | 'MUSIC'
  | 'KIDS'
  | 'DOCUMENTARY'
  | 'GAMING'
  | 'TECH'
  | 'PODCAST'
  | 'EDUCATION'
  | 'LIFESTYLE'
  | 'FOOD'
  | 'TRAVEL'
  | 'ART'
  | 'BUSINESS'
  | 'HEALTH';

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  badgeUrl?: string;
  bannerUrl?: string;
  bannerColor?: string;
  tagline?: string;
  category: LiveCategory;
  subcategory?: string;
  language: string;
  region?: string;
  followerCount: number;
  totalViews: number;
  totalVideos: number;
  subscriberCount: number;
  isVerified: boolean;
  isActive: boolean;
  isFeatured: boolean;
  ownerId?: string;
  isPublic: boolean;
  allowComments: boolean;
  requireSub: boolean;
  createdAt: string;
  updatedAt: string;
}

// Program/Event Types
export type EventStatus = 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED' | 'ON_DEMAND';
export type ContentSource = 'EXTERNAL' | 'UPLOADED' | 'GENERATED';
export type StreamQuality = 'AUTO' | 'SD_480P' | 'HD_720P' | 'FULL_HD_1080P' | 'QHD_1440P' | 'UHD_4K';

export interface LiveEvent {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  contentSource: ContentSource;
  externalPlatform?: string;
  externalUrl?: string;
  embedCode?: string;
  streamUrl?: string;
  channelId: string;
  status: EventStatus;
  scheduledAt: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  viewerCount: number;
  peakViewers: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  quality: StreamQuality;
  language: string;
  tags: string[];
  autoRecord: boolean;
  slowMode: boolean;
  chatEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  channel?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

// Search Types
export interface SearchResult {
  channels: Channel[];
  liveEvents: LiveEvent[];
  recordings: any[];
  totalResults: number;
}

// Recording / VOD Types
export interface Recording {
  id: string;
  title: string;
  description?: string;
  thumbnailUrl?: string;
  contentSource: ContentSource;
  externalUrl?: string;
  videoUrl?: string;
  duration: number;
  viewCount: number | string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  quality: StreamQuality;
  language: string;
  tags: string[];
  isPublished: boolean;
  isFeatured: boolean;
  isAgeRestricted: boolean;
  category?: LiveCategory;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
  channel?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
    category?: LiveCategory;
  };
}

// Comment & Reaction Types
export type ReactionTypeValue = 'HEART' | 'FIRE' | 'CLAP' | 'WOW' | 'SAD' | 'ANGRY';

export interface CommentAuthor {
  id: string;
  fullName: string;
  avatarUrl?: string;
  role: UserRole;
}

export interface Comment {
  id: string;
  content: string;
  userId: string;
  recordingId: string;
  parentId?: string | null;
  likeCount: number;
  isPinned: boolean;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  user?: CommentAuthor;
  replies?: Comment[];
  _count?: { replies: number; likes: number };
}

export interface ReactionSummary {
  data: Partial<Record<ReactionTypeValue, number>>;
  total: number;
}

// Audit log Types
export interface AuditLogEntry {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  oldValues?: any;
  newValues?: any;
  createdAt: string;
}

// User stats
export interface UserStats {
  role: UserRole;
  memberSince: string;
  followedChannels: number;
  commentsPosted: number;
  reactionsGiven: number;
  totalWatchMinutes: number;
  totalWatchHours: number;
  programsReviewed: number;
  aiReportsGenerated: number;
}

// AI Curator Types
export interface AiCuratorReport {
  broadcastSuitability: 'PRIME_TIME' | 'STANDARD' | 'RESTRICTED';
  suggestedTimeSlot: string;
  targetAudienceVibe: string;
  riskWarnings: string;
  sentimentAnalysis: {
    overallSentiment: 'positive' | 'neutral' | 'negative';
    hypeLevel: 'low' | 'medium' | 'high';
    audienceEngagement: number;
  };
  complianceAssessment: {
    isAgeRestricted: boolean;
    ageRating: 'PG' | 'T13' | 'T16' | 'T18';
    flaggedContent: string[];
    recommendedBroadcastWindow: 'DAY' | 'EVENING' | 'LATE_NIGHT';
  };
  aiModelVersion: string;
  processingTimeMs: number;
}
