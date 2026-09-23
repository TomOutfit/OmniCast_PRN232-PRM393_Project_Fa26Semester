# OmniCast Database Setup Guide

## Quick Start

### Option 1: Run SQL Directly on Supabase (Recommended)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to your project > SQL Editor
3. Copy content from `prisma/migrations/001_init.sql`
4. Paste and run
5. Copy content from `prisma/seed.sql`
6. Paste and run

### Option 2: Using Prisma CLI

```bash
# 1. Navigate to backend
cd backend

# 2. Install dependencies
npm install

# 3. Create .env file
cp .env.example .env
# Edit .env and add your database password

# 4. Generate Prisma Client
npx prisma generate

# 5. Push schema to database
npx prisma db push

# 6. Seed data (optional)
npx prisma db seed
# Or run seed.sql directly on Supabase
```

## Files Overview

| File | Description |
|------|-------------|
| `prisma/schema.prisma` | Prisma ORM schema (source of truth) |
| `prisma/migrations/001_init.sql` | Pure SQL for Supabase Dashboard |
| `prisma/seed.sql` | Sample data (10 channels, recordings, events) |

## Database Connection

```
Host: db.tktexqtqfnlfynbytjpw.supabase.co
Port: 5432
Database: postgres
User: postgres
Password: [YOUR-PASSWORD]
```

**Connection String:**
```
postgresql://postgres:[YOUR-PASSWORD]@db.tktexqtqfnlfynbytjpw.supabase.co:5432/postgres
```

## Sample Data Included

### Users (5 users)
| Email | Password | Role |
|-------|----------|------|
| admin@omnicast.tv | Admin123! | ADMIN |
| staff@omnicast.tv | Admin123! | STAFF |
| viewer1@omnicast.tv | Admin123! | VIEWER |
| viewer2@omnicast.tv | Admin123! | VIEWER |
| viewer3@omnicast.tv | Admin123! | VIEWER |

### Live Channels (10 fictional)
1. OmniGaming (GAMING) - 125K followers
2. TechTalk Vietnam (PODCAST) - 89K followers
3. MusicHub (MUSIC) - 200K followers
4. EduStream (EDUCATION) - 65K followers
5. LifestyleVN (LIFESTYLE) - 95K followers
6. OmniNews (NEWS) - 180K followers
7. SportsArena (SPORTS) - 150K followers
8. CookWithMe (FOOD) - 78K followers
9. TravelDiary (TRAVEL) - 62K followers
10. ComedyHouse (ENTERTAINMENT) - 220K followers

### Sample Content
- 5 Live Events (mix of LIVE, SCHEDULED, ENDED)
- 10 Recordings (mix of EXTERNAL, UPLOADED, GENERATED)
- Sample comments, reactions, follows

## Schema Modules

```
OmniCast Database
├── Module 1: Auth & Users
├── Module 2: EPG (Broadcast TV)
├── Module 3: Live Streaming & VOD
├── Module 4: Podcast & Audio
├── Module 5: Social & Engagement
├── Module 6: EPG Features
└── Module 7: Audit Log
```

## Next Steps

1. Run migrations on Supabase
2. Seed sample data
3. Start backend development
4. Implement authentication
5. Build API endpoints
6. Connect frontend
