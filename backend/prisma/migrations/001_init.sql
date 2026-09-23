-- ============================================================
-- OmniCast Database Migration
-- PostgreSQL for Supabase
-- Version: 2.1 (Live Streaming & Creator Channels Only)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Full-Text Search (optional)
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE "UserRole" AS ENUM ('GUEST', 'VIEWER', 'STAFF', 'ADMIN');
CREATE TYPE "LiveCategory" AS ENUM ('SPORTS', 'SHOW', 'ENTERTAINMENT', 'CINE', 'DRAMA', 'NEWS', 'MUSIC', 'KIDS', 'DOCUMENTARY', 'GAMING', 'TECH', 'PODCAST', 'EDUCATION', 'LIFESTYLE', 'FOOD', 'TRAVEL', 'ART', 'BUSINESS', 'HEALTH');
CREATE TYPE "ContentSource" AS ENUM ('EXTERNAL', 'UPLOADED', 'GENERATED');
CREATE TYPE "ExternalPlatform" AS ENUM ('YOUTUBE', 'VIMEO', 'TWITCH', 'FACEBOOK', 'TIKTOK', 'DAILYMOTION', 'CUSTOM_HLS', 'CUSTOM_RTMP', 'CUSTOM_MP4', 'EMBED_IFRAME');
CREATE TYPE "EventStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED', 'ON_DEMAND');
CREATE TYPE "ContentType" AS ENUM ('VIDEO', 'AUDIO', 'LIVE');
CREATE TYPE "StreamQuality" AS ENUM ('AUTO', 'SD_480P', 'HD_720P', 'FULL_HD_1080P', 'QHD_1440P', 'UHD_4K');
CREATE TYPE "TagType" AS ENUM ('GENRE', 'COUNTRY', 'RATING', 'FEATURE');
CREATE TYPE "ReactionType" AS ENUM ('HEART', 'FIRE', 'CLAP', 'WOW', 'SAD', 'ANGRY');
CREATE TYPE "NotificationType" AS ENUM ('NEW_FOLLOWER', 'NEW_VIDEO', 'LIVE_START', 'LIVE_ENDED', 'COMMENT_REPLY', 'COMMENT_MENTION', 'REACTION', 'SYSTEM_ANNOUNCEMENT');
CREATE TYPE "WatchSource" AS ENUM ('CHANNEL_PAGE', 'SEARCH', 'RECOMMENDATION', 'DIRECT_LINK', 'SOCIAL_SHARE');

-- ============================================================
-- MODULE 1: CORE TABLES & AUTH
-- ============================================================

-- Users
CREATE TABLE "User" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  "passwordHash" VARCHAR(255) NOT NULL,
  "fullName" VARCHAR(255) NOT NULL,
  "avatarUrl" VARCHAR(500),
  bio VARCHAR(500),
  role "UserRole" DEFAULT 'VIEWER',
  "isActive" BOOLEAN DEFAULT true,
  "emailVerified" BOOLEAN DEFAULT false,
  "lastLoginAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_user_email ON "User"(email);
CREATE INDEX idx_user_role ON "User"(role);

-- Refresh Tokens
CREATE TABLE "RefreshToken" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token VARCHAR(500) UNIQUE NOT NULL,
  "userId" UUID REFERENCES "User"(id) ON DELETE CASCADE,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "isRevoked" BOOLEAN DEFAULT false
);
CREATE INDEX idx_refresh_token_user ON "RefreshToken"("userId");
CREATE INDEX idx_refresh_token_expires ON "RefreshToken"("expiresAt");

-- ============================================================
-- MODULE 2: PRODUCTION TAGS
-- ============================================================

CREATE TABLE "ProductionTag" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) UNIQUE NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  color VARCHAR(20),
  type "TagType" NOT NULL
);
CREATE INDEX idx_production_tag_type ON "ProductionTag"(type);

-- ============================================================
-- MODULE 3: LIVE STREAMING & VOD (CREATOR CHANNELS)
-- ============================================================

-- Live Channels (Creator Channels)
CREATE TABLE "LiveChannel" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description VARCHAR(1500),
  "logoUrl" VARCHAR(500),
  "badgeUrl" VARCHAR(500),
  "avatarUrl" VARCHAR(500),
  "coverUrl" VARCHAR(500),
  "bannerColor" VARCHAR(20),
  tagline VARCHAR(200),
  category "LiveCategory" NOT NULL,
  subcategory VARCHAR(100),
  language VARCHAR(10) DEFAULT 'vi',
  region VARCHAR(100),
  "followerCount" INTEGER DEFAULT 0,
  "totalViews" BIGINT DEFAULT 0,
  "totalVideos" INTEGER DEFAULT 0,
  "subscriberCount" INTEGER DEFAULT 0,
  "isVerified" BOOLEAN DEFAULT false,
  "isActive" BOOLEAN DEFAULT true,
  "isFeatured" BOOLEAN DEFAULT false,
  "ownerId" UUID REFERENCES "User"(id),
  "isPublic" BOOLEAN DEFAULT true,
  "allowComments" BOOLEAN DEFAULT true,
  "requireSub" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_live_channel_category ON "LiveChannel"(category);
CREATE INDEX idx_live_channel_slug ON "LiveChannel"(slug);
CREATE INDEX idx_live_channel_featured ON "LiveChannel"("isFeatured", "followerCount");
CREATE INDEX idx_live_channel_owner ON "LiveChannel"("ownerId");

-- Live Events
CREATE TABLE "LiveEvent" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description VARCHAR(3000),
  "thumbnailUrl" VARCHAR(500),
  "streamSource" "ContentSource" DEFAULT 'EXTERNAL',
  "externalPlatform" "ExternalPlatform",
  "externalId" VARCHAR(255),
  "externalUrl" VARCHAR(500),
  "embedCode" TEXT,
  "streamUrl" VARCHAR(500),
  "streamKey" VARCHAR(255),
  "isPrivate" BOOLEAN DEFAULT false,
  "streamPassword" VARCHAR(255),
  quality "StreamQuality" DEFAULT 'AUTO',
  language VARCHAR(10) DEFAULT 'vi',
  status "EventStatus" DEFAULT 'SCHEDULED',
  "scheduledAt" TIMESTAMP NOT NULL,
  "startedAt" TIMESTAMP,
  "endedAt" TIMESTAMP,
  duration INTEGER,
  "viewerCount" INTEGER DEFAULT 0,
  "peakViewers" INTEGER DEFAULT 0,
  "likeCount" INTEGER DEFAULT 0,
  "commentCount" INTEGER DEFAULT 0,
  "shareCount" INTEGER DEFAULT 0,
  "channelId" UUID REFERENCES "LiveChannel"(id) ON DELETE CASCADE,
  tags TEXT[],
  "autoRecord" BOOLEAN DEFAULT true,
  "slowMode" BOOLEAN DEFAULT false,
  "chatEnabled" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_live_event_status_scheduled ON "LiveEvent"(status, "scheduledAt");
CREATE INDEX idx_live_event_channel_status ON "LiveEvent"("channelId", status);
CREATE INDEX idx_live_event_status_started ON "LiveEvent"(status, "startedAt");

-- Recordings
CREATE TABLE "Recording" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description VARCHAR(3000),
  "thumbnailUrl" VARCHAR(500),
  "contentSource" "ContentSource" DEFAULT 'EXTERNAL',
  "externalPlatform" "ExternalPlatform",
  "externalId" VARCHAR(255),
  "externalUrl" VARCHAR(500),
  "embedCode" TEXT,
  "videoUrl" VARCHAR(500),
  "videoBucketPath" VARCHAR(500),
  "fileSize" BIGINT,
  "generatedFromEventId" UUID UNIQUE,
  duration INTEGER NOT NULL,
  quality "StreamQuality" DEFAULT 'HD_720P',
  language VARCHAR(10) DEFAULT 'vi',
  "audioUrl" VARCHAR(500),
  "audioBucketPath" VARCHAR(500),
  "viewCount" BIGINT DEFAULT 0,
  "likeCount" INTEGER DEFAULT 0,
  "commentCount" INTEGER DEFAULT 0,
  "shareCount" INTEGER DEFAULT 0,
  "downloadCount" INTEGER DEFAULT 0,
  "contentType" "ContentType" DEFAULT 'VIDEO',
  "channelId" UUID REFERENCES "LiveChannel"(id) ON DELETE CASCADE,
  "isPublished" BOOLEAN DEFAULT true,
  "isFeatured" BOOLEAN DEFAULT false,
  "isAgeRestricted" BOOLEAN DEFAULT false,
  tags TEXT[],
  category "LiveCategory",
  chapters JSONB,
  subtitles JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),
  "publishedAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_recording_channel ON "Recording"("channelId");
CREATE INDEX idx_recording_content_source ON "Recording"("contentSource");
CREATE INDEX idx_recording_content_type ON "Recording"("contentType");
CREATE INDEX idx_recording_view_count ON "Recording"("viewCount");
CREATE INDEX idx_recording_featured ON "Recording"("isFeatured", "publishedAt");

-- ============================================================
-- MODULE 4: PODCAST & AUDIO
-- ============================================================

-- Podcasts
CREATE TABLE "Podcast" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) UNIQUE NOT NULL,
  description VARCHAR(2000),
  "coverUrl" VARCHAR(500),
  category "LiveCategory" DEFAULT 'PODCAST',
  tags TEXT[],
  "channelId" UUID REFERENCES "LiveChannel"(id) ON DELETE CASCADE,
  "totalEpisodes" INTEGER DEFAULT 0,
  "totalListens" BIGINT DEFAULT 0,
  "isExplicit" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_podcast_channel ON "Podcast"("channelId");

-- Podcast Episodes
CREATE TABLE "PodcastEpisode" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description VARCHAR(2000),
  "episodeNumber" INTEGER,
  "seasonNumber" INTEGER DEFAULT 1,
  duration INTEGER NOT NULL,
  "audioUrl" VARCHAR(500) NOT NULL,
  "coverUrl" VARCHAR(500),
  "listenCount" BIGINT DEFAULT 0,
  "podcastId" UUID REFERENCES "Podcast"(id) ON DELETE CASCADE,
  "publishedAt" TIMESTAMP DEFAULT NOW(),
  "createdAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_podcast_episode_podcast ON "PodcastEpisode"("podcastId");

-- ============================================================
-- MODULE 5: SOCIAL & ENGAGEMENT
-- ============================================================

-- Follows
CREATE TABLE "Follow" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "followerId" UUID REFERENCES "User"(id) ON DELETE CASCADE,
  "channelId" UUID REFERENCES "LiveChannel"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("followerId", "channelId")
);
CREATE INDEX idx_follow_follower ON "Follow"("followerId");
CREATE INDEX idx_follow_channel ON "Follow"("channelId");

-- Comments
CREATE TABLE "Comment" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content VARCHAR(1000) NOT NULL,
  "userId" UUID REFERENCES "User"(id) ON DELETE CASCADE,
  "recordingId" UUID REFERENCES "Recording"(id) ON DELETE CASCADE,
  "parentId" UUID REFERENCES "Comment"(id) ON DELETE CASCADE,
  "likeCount" INTEGER DEFAULT 0,
  "isPinned" BOOLEAN DEFAULT false,
  "isEdited" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_comment_recording ON "Comment"("recordingId");
CREATE INDEX idx_comment_parent ON "Comment"("parentId");

-- Comment Likes
CREATE TABLE "CommentLike" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID REFERENCES "User"(id) ON DELETE CASCADE,
  "commentId" UUID REFERENCES "Comment"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("userId", "commentId")
);

-- Reactions (Likes / Emojis)
CREATE TABLE "Reaction" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID REFERENCES "User"(id) ON DELETE CASCADE,
  type "ReactionType" NOT NULL,
  "recordingId" UUID REFERENCES "Recording"(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("userId", "recordingId", type)
);
CREATE INDEX idx_reaction_recording ON "Reaction"("recordingId");

-- Watch History
CREATE TABLE "WatchHistory" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID REFERENCES "User"(id) ON DELETE CASCADE,
  "recordingId" UUID REFERENCES "Recording"(id) ON DELETE CASCADE,
  "progressSeconds" INTEGER DEFAULT 0,
  "completedPercent" INTEGER DEFAULT 0,
  "isCompleted" BOOLEAN DEFAULT false,
  "lastWatchedAt" TIMESTAMP DEFAULT NOW(),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("userId", "recordingId")
);
CREATE INDEX idx_watch_history_user ON "WatchHistory"("userId", "lastWatchedAt");

-- Notifications
CREATE TABLE "Notification" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID REFERENCES "User"(id) ON DELETE CASCADE,
  type "NotificationType" NOT NULL,
  title VARCHAR(255) NOT NULL,
  message VARCHAR(500),
  "actionUrl" VARCHAR(500),
  "actorId" UUID REFERENCES "User"(id),
  "eventId" UUID,
  "recordingId" UUID,
  "channelId" UUID,
  "isRead" BOOLEAN DEFAULT false,
  "readAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_notification_user_read ON "Notification"("userId", "isRead");
CREATE INDEX idx_notification_user_date ON "Notification"("userId", "createdAt");

-- ============================================================
-- MODULE 6: AUDIT LOG
-- ============================================================

CREATE TABLE "AuditLog" (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" UUID,
  "userEmail" VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  "entityType" VARCHAR(100),
  "entityId" UUID,
  "oldValues" JSONB,
  "newValues" JSONB,
  "ipAddress" VARCHAR(50),
  "userAgent" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_audit_user ON "AuditLog"("userId", "createdAt");
CREATE INDEX idx_audit_entity ON "AuditLog"("entityType", "entityId");
CREATE INDEX idx_audit_action ON "AuditLog"(action, "createdAt");

-- ============================================================
-- Row Level Security (RLS) - Enable for Supabase
-- ============================================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RefreshToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProductionTag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LiveChannel" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LiveEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Recording" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Podcast" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PodcastEpisode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Follow" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Comment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CommentLike" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Reaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WatchHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- Public read for channels and recordings
CREATE POLICY "Public can view active channels" ON "LiveChannel" FOR SELECT USING ("isPublic" = true);
CREATE POLICY "Public can view published recordings" ON "Recording" FOR SELECT USING ("isPublished" = true);
CREATE POLICY "Public can view production tags" ON "ProductionTag" FOR SELECT USING (true);

-- Users can manage their own data
CREATE POLICY "Users can manage own profile" ON "User" FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users can manage own watch history" ON "WatchHistory" FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "Users can manage own notifications" ON "Notification" FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "Users can manage own comments" ON "Comment" FOR ALL USING (auth.uid() = "userId");
CREATE POLICY "Users can manage own reactions" ON "Reaction" FOR ALL USING (auth.uid() = "userId");

-- Follow policies
CREATE POLICY "Users can view their own follows" ON "Follow" FOR SELECT USING (auth.uid() = "followerId");
CREATE POLICY "Users can follow channels" ON "Follow" FOR INSERT WITH CHECK (auth.uid() = "followerId");
CREATE POLICY "Users can unfollow channels" ON "Follow" FOR DELETE USING (auth.uid() = "followerId");

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Function to update follower count
CREATE OR REPLACE FUNCTION update_channel_follower_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE "LiveChannel" SET "followerCount" = "followerCount" + 1 WHERE id = NEW."channelId";
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE "LiveChannel" SET "followerCount" = "followerCount" - 1 WHERE id = OLD."channelId";
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger for follower count
CREATE TRIGGER trigger_update_follower_count
AFTER INSERT OR DELETE ON "Follow"
FOR EACH ROW EXECUTE FUNCTION update_channel_follower_count();

-- Function to update recording view count
CREATE OR REPLACE FUNCTION increment_recording_view_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE "Recording" SET "viewCount" = "viewCount" + 1 WHERE id = NEW."recordingId";
  UPDATE "LiveChannel" SET "totalViews" = "totalViews" + 1 WHERE id = (SELECT "channelId" FROM "Recording" WHERE id = NEW."recordingId");
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for recording view count on watch history
CREATE TRIGGER trigger_increment_view_count
AFTER INSERT ON "WatchHistory"
FOR EACH ROW EXECUTE FUNCTION increment_recording_view_count();
