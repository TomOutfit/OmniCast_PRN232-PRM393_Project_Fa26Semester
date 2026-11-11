# OmniCast - Product Context

## Purpose
OmniCast is an enterprise-grade, low-latency live broadcast streaming and catch-up OTT television platform. It bridges high-throughput ingest (HLS, RTSP, RTMP, WebRTC WHEP via MediaMTX), low-latency live distribution, interactive live chats, electronic program guides (EPG), DVR/catch-up replay, and QR-based automated donation flows (PayOS).

## Users & Jobs
- **TV & Live Stream Viewers (Mobile & Web)**: Watch high-bitrate 24/7 channels, browse EPG schedules, set broadcast reminders, replay catch-up VOD recordings, and donate to live events via QR/PayOS.
- **Broadcasters & Field Reporters (Mobile Studio)**: Broadcast high-definition live video feeds directly from smartphones or studio rigs into TV channels via WebRTC/WHEP/MediaMTX.
- **Station Operators & Administrators (Web Portal)**: Manage live events, channels, EPG metadata, stream health telemetry, transcode pipelines, donations, and platform analytics.

## Platform
- **Mobile**: Flutter 3.24+ (Android Universal & Split ABI APKs, iOS ready)
- **Web Frontend**: React 18, Vite, Tailwind CSS, Lucide icons, Video.js
- **Backend**: NestJS, TypeScript, PostgreSQL, Prisma ORM, Socket.IO, Redis, MediaMTX

## Capabilities & Workflows
1. **Live TV Streaming**: Instant channel switching, adaptive bitrates (HLS / WebRTC WHEP), picture-in-picture, fullscreen orientation.
2. **Interactive Community**: Real-time Socket.IO chat, live viewer count, instant PayOS QR donations with automated polling & webhook settlement.
3. **Electronic Program Guide (EPG)**: 7-day schedule grid, local notifications for upcoming airings.
4. **DVR & Recordings**: Stream capture, catch-up library, pagination and filtering by category/tags.
5. **Mobile Studio**: On-the-go low-latency camera broadcasting to configured RTMP/WHEP ingest endpoints.

## Durable Constraints
- Modern minimalist, cinema-grade UI inspired by Apple TV+ and Netflix.
- Deep obsidian and slate palette (`#080B11`, `#0F1523`) with high contrast white text and cyan/rose accents.
- Zero fake metrics or clutter on user-facing operational screens.
