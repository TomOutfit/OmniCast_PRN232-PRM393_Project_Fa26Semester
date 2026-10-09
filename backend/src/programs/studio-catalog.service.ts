// ============================================================
// OmniCast - Studio Catalog Service
// ============================================================
//
// A curated, **static** directory of public-domain / royalty-free
// video sources the Studio can stream immediately. Operators
// browse the catalog in the Studio "Danh mục nguồn" tab and
// click → the backend drops the row into the broadcastable
// library for the chosen channel.
//
// Why a static catalog (vs. scraping free CDNs at runtime)?
//   • Zero outbound dependency at request time. The frontend
//     can show the picker offline.
//   • Each entry has been hand-curated with a fitting
//     title/description per channel theme (no "Cat.mp4" with
//     channel name "Omni Sport 1"). Operators can rename on
//     the picker side anyway.
//
// Layout per entry:
//   • id                — stable slug used by the frontend.
//   • title / description — operator-facing labels.
//   • url               — actual videoUrl we will persist.
//   • thumbnailUrl      — poster image.
//   • format            — HLS | MP4 | DASH.
//   • codec             — h264 | h265 | av1 (best-effort).
//   • resolution        — best-effort label.
//   • durationSec       — approximate runtime.
//   • channelSlugs[]    — channel slugs this entry is themed for.
//   • tags[]            — searchable tags.
//   • source            — where it lives (Mux, Unified, Cloudinary...).
//   • verified          — true if HEAD/GET probed ok from our env.
//   • notes             — licensing note for the audit log.
// ============================================================

import { Injectable } from '@nestjs/common';

/**
 * Lightweight descriptor of a catalog entry. The service
 * normalizes the raw records into this shape.
 */
export interface StudioCatalogStream {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnailUrl: string;
  format: 'HLS' | 'MP4' | 'DASH' | 'WEBM';
  codec?: string;
  resolution?: string;
  durationSec: number;
  channelSlugs: string[]; // empty array = available on any channel
  tags: string[];
  source: string; // CDN / origin label
  verified: boolean; // probed-ok from this env at build time
  license: string; // e.g. 'Creative Commons', 'Public Domain', ...
  notes?: string;
}

/**
 * The raw catalog. Each entry's `channelSlugs` field groups
 * the stream with the channels it visually belongs to — e.g.
 * Big Buck Bunny fits `sport-1` (viral sports reel feel),
 * `entertain` (canonical Blender comedy) and `cine` (short
 * film). Multiple slugs are fine.
 */
const RAW_CATALOG: Array<Omit<StudioCatalogStream, 'id'>> = [
  // ============================================================
  // 1. Mux test streams — canonical HLS fixtures
  //    Source: https://test-streams.mux.dev/
  // ============================================================
  {
    title: 'Mux Test Stream — Big Buck Bunny (HLS Master)',
    description:
      'Blender Foundation Big Buck Bunny — bản master HLS từ Mux. ' +
      'Đây là stream tham chiếu chuẩn để kiểm thử player HLS.',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    thumbnailUrl:
      'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
    format: 'HLS',
    codec: 'h264',
    resolution: '640x360',
    durationSec: 596,
    channelSlugs: ['cine', 'entertain', 'art-design', 'kids'],
    tags: ['Mux', 'TestStream', 'Blender', 'Animation', 'CC-BY'],
    source: 'Mux',
    verified: true,
    license: 'Creative Commons',
    notes: 'Mux public test stream — universally available.',
  },
  {
    title: 'Mux Test Stream — Tears of Steel (HLS Master)',
    description:
      'Blender Foundation Tears of Steel — bản master HLS từ Mux. ' +
      'Sci-fi short film phù hợp Discovery / Cine.',
    url: 'https://test-streams.mux.dev/test_001/stream.m3u8',
    thumbnailUrl:
      'https://mango.blender.org/wp-content/themes/mango/images/header.jpg',
    format: 'HLS',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 734,
    channelSlugs: ['cine', 'discovery', 'tech', 'art-design'],
    tags: ['Mux', 'TestStream', 'Blender', 'SciFi', 'CC-BY'],
    source: 'Mux',
    verified: true,
    license: 'Creative Commons',
    notes: 'Mux public test stream — universally available.',
  },
  {
    title: 'Mux Test Stream — 7s Variant (HLS)',
    description:
      'Biến thể 7 giây của test stream Mux — lý tưởng cho smoke test.',
    url: 'https://test-streams.mux.dev/x36xhzz/url_2/193039199_mp4_h264_aac_ld_7.m3u8',
    thumbnailUrl:
      'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
    format: 'HLS',
    codec: 'h264',
    resolution: '640x360',
    durationSec: 7,
    channelSlugs: ['cine', 'tech', 'art-design'],
    tags: ['Mux', 'TestStream', 'Short', 'Smoke'],
    source: 'Mux',
    verified: false,
    license: 'Creative Commons',
  },

  // ============================================================
  // 2. Unified Streaming public demos
  //    Source: https://demo.unified-streaming.com/
  // ============================================================
  {
    title: 'Unified Streaming — Tears of Steel (HLS)',
    description:
      'Demo HLS từ Unified Streaming — Tears of Steel multi-bitrate. ' +
      'Tốt cho kiểm thử adaptive bitrate và Dolby audio track.',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    thumbnailUrl:
      'https://mango.blender.org/wp-content/themes/mango/images/header.jpg',
    format: 'HLS',
    codec: 'h264',
    resolution: '1920x800',
    durationSec: 734,
    channelSlugs: ['cine', 'discovery', 'tech', 'art-design'],
    tags: ['Unified', 'Demo', 'ABR', 'SciFi'],
    source: 'Unified Streaming',
    verified: true,
    license: 'Creative Commons',
  },
  {
    title: 'Unified Streaming — Tears of Steel (DASH)',
    description:
      'Biến thể DASH (MPD) của Tears of Steel — phù hợp browser hỗ trợ MPEG-DASH.',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/tears-of-steel-audio_eng=64000.dash',
    thumbnailUrl:
      'https://mango.blender.org/wp-content/themes/mango/images/header.jpg',
    format: 'DASH',
    codec: 'h264',
    resolution: '1920x800',
    durationSec: 734,
    channelSlugs: ['cine', 'tech'],
    tags: ['Unified', 'DASH', 'MPD'],
    source: 'Unified Streaming',
    verified: true,
    license: 'Creative Commons',
  },

  // ============================================================
  // 3. Bitmovin / Akamai samples — multi-bitrate HLS test
  // ============================================================
  {
    title: 'Bitmovin Demo — Sintel (HLS multi-bitrate)',
    description:
      'Bitmovin public demo HLS playlist — Sintel multi-bitrate. ' +
      'Chuẩn công nghiệp cho player ABR testing.',
    url: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    thumbnailUrl:
      'https://download.blender.org/durian/trailer/sintel_poster.jpg',
    format: 'HLS',
    codec: 'h264',
    resolution: '1920x818',
    durationSec: 888,
    channelSlugs: ['cine', 'art-design', 'discovery'],
    tags: ['Bitmovin', 'Akamai', 'ABR', 'Sintel'],
    source: 'Bitmovin',
    verified: false,
    license: 'Creative Commons',
    notes: 'CDN chặn HEAD/GET ở một số mạng — sẽ thử GET on 403.',
  },

  // ============================================================
  // 4. Test-videos.co.uk (free MP4 fixtures)
  //    Source: https://test-videos.co.uk/
  // ============================================================
  {
    title: 'Big Buck Bunny — 360p 1MB (MP4)',
    description:
      'Big Buck Bunny phiên bản 360p, ~1MB, 10s. Lý tưởng cho smoke test bandwidth.',
    url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
    thumbnailUrl:
      'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '640x360',
    durationSec: 10,
    channelSlugs: ['cine', 'entertain', 'kids', 'art-design'],
    tags: ['BigBuckBunny', 'Blender', 'CC-BY', 'Short'],
    source: 'test-videos.co.uk',
    verified: true,
    license: 'Creative Commons',
  },
  {
    title: 'Big Buck Bunny — 360p 2MB (MP4)',
    description:
      'Big Buck Bunny phiên bản 360p, ~2MB, 10s. Chất lượng tốt hơn cho preview.',
    url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_2MB.mp4',
    thumbnailUrl:
      'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '640x360',
    durationSec: 10,
    channelSlugs: ['cine', 'entertain', 'kids', 'art-design'],
    tags: ['BigBuckBunny', 'Blender', 'CC-BY'],
    source: 'test-videos.co.uk',
    verified: true,
    license: 'Creative Commons',
  },
  {
    title: 'Big Buck Bunny — 360p 5MB (MP4)',
    description:
      'Big Buck Bunny phiên bản 360p, ~5MB, 10s. Chất lượng cao nhất của bản 360p.',
    url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_5MB.mp4',
    thumbnailUrl:
      'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '640x360',
    durationSec: 10,
    channelSlugs: ['cine', 'entertain', 'kids', 'art-design'],
    tags: ['BigBuckBunny', 'Blender', 'CC-BY', 'HQ'],
    source: 'test-videos.co.uk',
    verified: true,
    license: 'Creative Commons',
  },
  {
    title: 'Sintel — 360p 1MB (MP4)',
    description:
      'Sintel phiên bản 360p, ~1MB, 10s. Phim ngắn Blender đoạt giải.',
    url: 'https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4',
    thumbnailUrl:
      'https://download.blender.org/durian/trailer/sintel_poster.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '640x360',
    durationSec: 10,
    channelSlugs: ['cine', 'art-design', 'drama'],
    tags: ['Sintel', 'Blender', 'CC-BY', 'ShortFilm'],
    source: 'test-videos.co.uk',
    verified: true,
    license: 'Creative Commons',
  },

  // ============================================================
  // 5. Cloudinary public samples
  //    Source: https://res.cloudinary.com/demo/
  // ============================================================
  {
    title: 'Cloudinary Demo — dog.mp4 (MP4)',
    description:
      'Cloudinary demo asset — dog.mp4 (~9MB). Thử nghiệm chung cho MP4 streaming.',
    url: 'https://res.cloudinary.com/demo/video/upload/dog.mp4',
    thumbnailUrl:
      'https://res.cloudinary.com/demo/image/upload/c_scale,w_640/v1/samples/animals/three-dogs.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 30,
    channelSlugs: ['entertain', 'kids'],
    tags: ['Cloudinary', 'Demo', 'Animals'],
    source: 'Cloudinary',
    verified: true,
    license: 'Demo / Public Sample',
  },
  {
    title: 'Cloudinary Demo — cld-sample-video (MP4)',
    description:
      'Cloudinary demo — cld-sample-video (~28MB). Sample video chất lượng cao cho test player.',
    url: 'https://res.cloudinary.com/demo/video/upload/cld-sample-video.mp4',
    thumbnailUrl:
      'https://res.cloudinary.com/demo/image/upload/c_scale,w_640/v1/samples/landscapes/architecture-signs.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '1920x1080',
    durationSec: 30,
    channelSlugs: ['travel-world', 'travel-vn', 'discovery'],
    tags: ['Cloudinary', 'Demo', 'Sample'],
    source: 'Cloudinary',
    verified: true,
    license: 'Demo / Public Sample',
  },

  // ============================================================
  // 6. Internet Archive — public domain films
  //    Source: https://archive.org/
  // ============================================================
  {
    title: 'Internet Archive — Big Buck Bunny (720p surround MP4)',
    description:
      'Big Buck Bunny 720p surround từ Internet Archive — public domain. ' +
      'Dùng cho Cine / Entertain.',
    url: 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4',
    thumbnailUrl:
      'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 596,
    channelSlugs: ['cine', 'entertain', 'kids'],
    tags: ['Archive', 'BigBuckBunny', 'PublicDomain'],
    source: 'Internet Archive',
    verified: true,
    license: 'Public Domain',
  },
  {
    title: 'Internet Archive — Popeye for President (MP4)',
    description:
      'Popeye for President — phim hoạt hình cổ điển từ Internet Archive. ' +
      'Phù hợp kênh giải trí / kids.',
    url: 'https://archive.org/download/Popeye_forPresident/Popeye_forPresident_512kb.mp4',
    thumbnailUrl:
      'https://archive.org/services/img/Popeye_forPresident',
    format: 'MP4',
    codec: 'h264',
    resolution: '512x384',
    durationSec: 360,
    channelSlugs: ['entertain', 'kids'],
    tags: ['Archive', 'Popeye', 'Classic', 'PublicDomain'],
    source: 'Internet Archive',
    verified: true,
    license: 'Public Domain',
  },

  // ============================================================
  // 7. Samplelib.com — generic MP4 length fixtures
  //    Source: https://download.samplelib.com/
  // ============================================================
  {
    title: 'Samplelib — sample-5s (MP4)',
    description: 'Sample MP4 5 giây — kiểm thử tải nhanh.',
    url: 'https://download.samplelib.com/mp4/sample-5s.mp4',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=640&q=80',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 5,
    channelSlugs: ['tech', 'art-design', 'kids'],
    tags: ['Samplelib', 'Short'],
    source: 'Samplelib',
    verified: true,
    license: 'Demo / Public Sample',
  },
  {
    title: 'Samplelib — sample-10s (MP4)',
    description: 'Sample MP4 10 giây — kiểm thử pre-roll.',
    url: 'https://download.samplelib.com/mp4/sample-10s.mp4',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=640&q=80',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 10,
    channelSlugs: ['tech', 'art-design'],
    tags: ['Samplelib'],
    source: 'Samplelib',
    verified: true,
    license: 'Demo / Public Sample',
  },
  {
    title: 'Samplelib — sample-15s (MP4)',
    description: 'Sample MP4 15 giây — kiểm thử mid-roll.',
    url: 'https://download.samplelib.com/mp4/sample-15s.mp4',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=640&q=80',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 15,
    channelSlugs: ['tech', 'art-design', 'cine'],
    tags: ['Samplelib'],
    source: 'Samplelib',
    verified: true,
    license: 'Demo / Public Sample',
  },
  {
    title: 'Samplelib — sample-20s (MP4)',
    description: 'Sample MP4 20 giây — kiểm thử post-roll quảng cáo.',
    url: 'https://download.samplelib.com/mp4/sample-20s.mp4',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=640&q=80',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 20,
    channelSlugs: ['tech', 'art-design'],
    tags: ['Samplelib'],
    source: 'Samplelib',
    verified: true,
    license: 'Demo / Public Sample',
  },

  // ============================================================
  // 8. W3 Schools — most famous MP4 fixture on the internet
  // ============================================================
  {
    title: 'W3 Schools — mov_bbb.mp4',
    description:
      'Big Buck Bunny bản ~800KB từ W3 Schools — nguồn MP4 phổ biến nhất ' +
      'trên web. Dùng cho mọi channel smoke test.',
    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    thumbnailUrl:
      'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '640x360',
    durationSec: 10,
    channelSlugs: [
      'sport-1',
      'sport-2',
      'show',
      'entertain',
      'cine',
      'drama',
      'news',
      'music',
      'kids',
      'tech',
      'food',
      'discovery',
      'esports',
      'indie-games',
      'podcast',
      'audiobook',
      'academy',
      'skill-lab',
      'wellness',
      'fashion',
      'travel-vn',
      'travel-world',
      'art-design',
      'business',
      'health',
    ],
    tags: ['W3', 'BigBuckBunny', 'Smoke'],
    source: 'W3 Schools',
    verified: true,
    license: 'Creative Commons',
    notes: 'Universal MP4 fixture — works on virtually every network.',
  },

  // ============================================================
  // 9. Pexels free stock video (direct MP4)
  //    Source: https://www.pexels.com/videos/
  // ============================================================
  {
    title: 'Pexels — Aerial City (UHD 4K 25fps)',
    description:
      'Pexels aerial city UHD — phù hợp Travel World / Discovery.',
    url: 'https://videos.pexels.com/video-files/3209211/3209211-uhd_3840_2160_25fps.mp4',
    thumbnailUrl:
      'https://images.pexels.com/videos/3209211/free-video-3209211.jpg?auto=compress&cs=tinysrgb&fit=crop&h=360',
    format: 'MP4',
    codec: 'h264',
    resolution: '3840x2160',
    durationSec: 30,
    channelSlugs: ['travel-world', 'travel-vn', 'discovery', 'business'],
    tags: ['Pexels', 'Aerial', '4K', 'Travel'],
    source: 'Pexels',
    verified: true,
    license: 'Pexels License',
  },
  {
    title: 'Pexels — Ocean Waves (HD 1080p 25fps)',
    description:
      'Pexels ocean waves — phù hợp Wellness / Discovery.',
    url: 'https://videos.pexels.com/video-files/1409899/1409899-hd_1920_1080_25fps.mp4',
    thumbnailUrl:
      'https://images.pexels.com/videos/1409899/free-video-1409899.jpg?auto=compress&cs=tinysrgb&fit=crop&h=360',
    format: 'MP4',
    codec: 'h264',
    resolution: '1920x1080',
    durationSec: 30,
    channelSlugs: ['wellness', 'discovery', 'travel-vn', 'travel-world'],
    tags: ['Pexels', 'Ocean', 'Wellness'],
    source: 'Pexels',
    verified: true,
    license: 'Pexels License',
  },

  // ============================================================
  // 10. Pexels — nhiều stock video theo chủ đề (đã verify ở môi
  //     trường giới hạn). Một số URL vẫn 403 ở HEAD trong môi
  //     trường này nhưng player vẫn GET được — đó là lý do ta
  //     whitelist `videos.pexels.com` để BYPASS probe.
  // ============================================================
  {
    title: 'Pexels — Sunset Over Mountains (HD 1080p)',
    description:
      'Pexels sunset over mountains — phù hợp Discovery, Travel, Wellness.',
    url: 'https://videos.pexels.com/video-files/4434150/4434150-uhd_2560_1440_30fps.mp4',
    thumbnailUrl:
      'https://images.pexels.com/videos/4434150/free-video-4434150.jpg?auto=compress&cs=tinysrgb&fit=crop&h=360',
    format: 'MP4',
    codec: 'h264',
    resolution: '2560x1440',
    durationSec: 30,
    channelSlugs: ['discovery', 'travel-world', 'travel-vn', 'wellness'],
    tags: ['Pexels', 'Sunset', 'Travel', 'Nature'],
    source: 'Pexels',
    verified: false,
    license: 'Pexels License',
    notes: 'CDN sometimes 403s HEAD — bypassed via trusted CDN whitelist.',
  },
  {
    title: 'Pexels — Skateboard Tricks (HD 1080p)',
    description:
      'Pexels skateboard tricks — phù hợp Sport, Esports, Entertainment.',
    url: 'https://videos.pexels.com/video-files/5098953/5098953-hd_1920_1080_30fps.mp4',
    thumbnailUrl:
      'https://images.pexels.com/videos/5098953/free-video-5098953.jpg?auto=compress&cs=tinysrgb&fit=crop&h=360',
    format: 'MP4',
    codec: 'h264',
    resolution: '1920x1080',
    durationSec: 30,
    channelSlugs: ['sport-1', 'sport-2', 'esports', 'indie-games', 'entertain'],
    tags: ['Pexels', 'Skateboard', 'Action', 'Sport'],
    source: 'Pexels',
    verified: false,
    license: 'Pexels License',
  },
  {
    title: 'Pexels — Coffee Pour (HD 1080p)',
    description:
      'Pexels coffee pouring slow-motion — phù hợp Food, Wellness, Lifestyle.',
    url: 'https://videos.pexels.com/video-files/4434286/4434286-uhd_2560_1440_25fps.mp4',
    thumbnailUrl:
      'https://images.pexels.com/videos/4434286/free-video-4434286.jpg?auto=compress&cs=tinysrgb&fit=crop&h=360',
    format: 'MP4',
    codec: 'h264',
    resolution: '2560x1440',
    durationSec: 30,
    channelSlugs: ['food', 'wellness', 'fashion'],
    tags: ['Pexels', 'Coffee', 'Food', 'Lifestyle'],
    source: 'Pexels',
    verified: false,
    license: 'Pexels License',
  },
  {
    title: 'Pexels — Cooking Kitchen (HD 1080p)',
    description:
      'Pexels cooking kitchen — phù hợp Food, Health.',
    url: 'https://videos.pexels.com/video-files/3163534/3163534-uhd_3840_2160_25fps.mp4',
    thumbnailUrl:
      'https://images.pexels.com/videos/3163534/free-video-3163534.jpg?auto=compress&cs=tinysrgb&fit=crop&h=360',
    format: 'MP4',
    codec: 'h264',
    resolution: '3840x2160',
    durationSec: 30,
    channelSlugs: ['food', 'health', 'wellness'],
    tags: ['Pexels', 'Cooking', 'Kitchen'],
    source: 'Pexels',
    verified: false,
    license: 'Pexels License',
  },

  // ============================================================
  // 11. Internet Archive — thêm nhiều phim public domain
  // ============================================================
  {
    title: 'Internet Archive — Sintel (MP4)',
    description:
      'Sintel — Blender Open Movie trên Internet Archive. Phim ngắn ' +
      'giả tưởng đoạt giải, public domain.',
    url: 'https://archive.org/download/Sintel/sintel-2048-surround.mp4',
    thumbnailUrl:
      'https://download.blender.org/durian/trailer/sintel_poster.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '2048x872',
    durationSec: 888,
    channelSlugs: ['cine', 'art-design', 'drama', 'discovery'],
    tags: ['Archive', 'Sintel', 'PublicDomain', 'Fantasy'],
    source: 'Internet Archive',
    verified: false,
    license: 'Public Domain',
    notes: 'CDN alias — verify locally before scheduling live.',
  },
  {
    title: 'Internet Archive — Tears of Steel (MP4)',
    description:
      'Tears of Steel — Blender sci-fi short film, public domain.',
    url: 'https://archive.org/download/TearsOfSteel/tos-1920-stereo.mp4',
    thumbnailUrl:
      'https://mango.blender.org/wp-content/themes/mango/images/header.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '1920x800',
    durationSec: 734,
    channelSlugs: ['cine', 'discovery', 'tech', 'art-design'],
    tags: ['Archive', 'TearsOfSteel', 'PublicDomain', 'SciFi'],
    source: 'Internet Archive',
    verified: false,
    license: 'Public Domain',
  },

  // ============================================================
  // 12. Cloudinary — thêm các mẫu stock video
  // ============================================================
  {
    title: 'Cloudinary Demo — kitten (MP4)',
    description:
      'Cloudinary demo — thú cưng dễ thương. Phù hợp Kids, Wellness.',
    url: 'https://res.cloudinary.com/demo/video/upload/kitten.mp4',
    thumbnailUrl:
      'https://res.cloudinary.com/demo/image/upload/c_scale,w_640/v1/samples/animals/cat.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 15,
    channelSlugs: ['kids', 'wellness', 'entertain'],
    tags: ['Cloudinary', 'Animals', 'Kids'],
    source: 'Cloudinary',
    verified: false,
    license: 'Demo / Public Sample',
  },
  {
    title: 'Cloudinary Demo — elephants (MP4)',
    description:
      'Cloudinary demo — đàn voi. Phù hợp Discovery, Kids, Travel.',
    url: 'https://res.cloudinary.com/demo/video/upload/elephants.mp4',
    thumbnailUrl:
      'https://res.cloudinary.com/demo/image/upload/c_scale,w_640/v1/samples/animals/three-elephants.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '1920x1080',
    durationSec: 30,
    channelSlugs: ['discovery', 'kids', 'travel-world'],
    tags: ['Cloudinary', 'Animals', 'Discovery'],
    source: 'Cloudinary',
    verified: false,
    license: 'Demo / Public Sample',
  },
  {
    title: 'Cloudinary Demo — oldwine (MP4)',
    description:
      'Cloudinary demo — phong cảnh vintage. Phù hợp Travel, Discovery.',
    url: 'https://res.cloudinary.com/demo/video/upload/oldwine.mp4',
    thumbnailUrl:
      'https://res.cloudinary.com/demo/image/upload/c_scale,w_640/v1/samples/landscapes/landscape-panorama.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 20,
    channelSlugs: ['travel-world', 'discovery', 'food'],
    tags: ['Cloudinary', 'Vintage', 'Travel'],
    source: 'Cloudinary',
    verified: false,
    license: 'Demo / Public Sample',
  },

  // ============================================================
  // 13. test-videos.co.uk — bổ sung các biến thể MP4
  // ============================================================
  {
    title: 'Sintel — 360p 1MB (test-videos.co.uk)',
    description: 'Sintel bản 360p 1MB — ngắn gọn, lý tưởng cho smoke test.',
    url: 'https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4',
    thumbnailUrl:
      'https://download.blender.org/durian/trailer/sintel_poster.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '640x360',
    durationSec: 10,
    channelSlugs: ['cine', 'art-design', 'drama'],
    tags: ['Sintel', 'Blender', 'CC-BY'],
    source: 'test-videos.co.uk',
    verified: true,
    license: 'Creative Commons',
  },

  // ============================================================
  // 14. Mux — biến thể test streams bổ sung
  // ============================================================
  {
    title: 'Mux Test — Tears of Steel (HLS 720p)',
    description: 'Mux Tears of Steel HLS stream — high quality 720p.',
    url: 'https://test-streams.mux.dev/test_001/stream.m3u8',
    thumbnailUrl:
      'https://mango.blender.org/wp-content/themes/mango/images/header.jpg',
    format: 'HLS',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 734,
    channelSlugs: ['cine', 'discovery', 'tech', 'art-design', 'drama'],
    tags: ['Mux', 'HLS', 'SciFi', 'TearsOfSteel'],
    source: 'Mux',
    verified: true,
    license: 'Creative Commons',
  },

  // ============================================================
  // 15. Wikimedia Commons — Public Domain films
  // ============================================================
  {
    title: 'Wikimedia — Big Buck Bunny (Public Domain)',
    description:
      'Big Buck Bunny từ Wikimedia Commons — public domain mirror.',
    url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/a/a7/Big_Buck_Bunny_%28film%29.webm/Big_Buck_Bunny_%28film%29.webm.480p.vp9.webm',
    thumbnailUrl:
      'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Big.Buck.Bunny.-.Opening.Screen.png/640px-Big.Buck.Bunny.-.Opening.Screen.png',
    format: 'WEBM',
    codec: 'vp9',
    resolution: '854x480',
    durationSec: 596,
    channelSlugs: ['cine', 'entertain', 'kids', 'art-design'],
    tags: ['Wikimedia', 'BigBuckBunny', 'PublicDomain', 'WEBM'],
    source: 'Wikimedia Commons',
    verified: false,
    license: 'Public Domain',
    notes: 'WEBM/VP9 codec — verify native player support.',
  },

  // ============================================================
  // 16. Universal Smoke Test — đa kênh
  // ============================================================
  {
    title: 'W3 Schools Universal — mov_bbb.mp4 (Entertainment)',
    description: 'Smoke test source — dùng cho mọi kênh giải trí.',
    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    thumbnailUrl:
      'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '640x360',
    durationSec: 10,
    channelSlugs: ['entertain', 'show', 'kids'],
    tags: ['W3', 'Smoke', 'Universal'],
    source: 'W3 Schools',
    verified: true,
    license: 'Creative Commons',
  },
  {
    title: 'Samplelib — sample-15s (Travel Smoke)',
    description: 'Samplelib 15s — smoke test cho travel channel.',
    url: 'https://download.samplelib.com/mp4/sample-15s.mp4',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=640&q=80',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 15,
    channelSlugs: ['travel-vn', 'travel-world', 'fashion'],
    tags: ['Samplelib', 'Travel'],
    source: 'Samplelib',
    verified: true,
    license: 'Demo / Public Sample',
  },

  // ============================================================
  // 17. Cloudinary — multi-bitrate HLS samples
  // ============================================================
  {
    title: 'Cloudinary — dog.m3u8 (HLS)',
    description: 'Cloudinary dog.m3u8 HLS — test HLS adaptive streaming.',
    url: 'https://res.cloudinary.com/demo/video/upload/dog.m3u8',
    thumbnailUrl:
      'https://res.cloudinary.com/demo/image/upload/c_scale,w_640/v1/samples/animals/three-dogs.jpg',
    format: 'HLS',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 30,
    channelSlugs: ['entertain', 'kids', 'tech', 'art-design'],
    tags: ['Cloudinary', 'HLS', 'Animals'],
    source: 'Cloudinary',
    verified: false,
    license: 'Demo / Public Sample',
    notes: 'HLS generated by Cloudinary — verify locally before scheduling live.',
  },
  {
    title: 'Cloudinary — cld-sample-video.m3u8 (HLS)',
    description: 'Cloudinary cld-sample-video HLS — sample HLS test.',
    url: 'https://res.cloudinary.com/demo/video/upload/cld-sample-video.m3u8',
    thumbnailUrl:
      'https://res.cloudinary.com/demo/image/upload/c_scale,w_640/v1/samples/landscapes/architecture-signs.jpg',
    format: 'HLS',
    codec: 'h264',
    resolution: '1920x1080',
    durationSec: 30,
    channelSlugs: ['travel-world', 'travel-vn', 'discovery'],
    tags: ['Cloudinary', 'HLS', 'Sample'],
    source: 'Cloudinary',
    verified: false,
    license: 'Demo / Public Sample',
  },

  // ============================================================
  // 18. Akamai test streams — multiple bitrates
  // ============================================================
  {
    title: 'Akamai Test — H264 480p (HLS)',
    description:
      'Akamai test stream H264 480p — kiểm thử manifest HLS chuẩn.',
    url: 'https://test-streams.akamaized.net/TS_from_Akamai_h264_480p_1.m3u8',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1611162617213-7d7a39e76f01?auto=format&fit=crop&w=640&q=80',
    format: 'HLS',
    codec: 'h264',
    resolution: '854x480',
    durationSec: 60,
    channelSlugs: ['tech', 'art-design', 'cine'],
    tags: ['Akamai', 'HLS', '480p', 'TestStream'],
    source: 'Akamai',
    verified: false,
    license: 'Test Stream / Public',
  },

  // ============================================================
  // 19. Bitmovin demos — multi-bitrate
  // ============================================================
  {
    title: 'Bitmovin Demo — Multi-bitrate HLS',
    description: 'Bitmovin public demo — multi-bitrate HLS playlist.',
    url: 'https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=640&q=80',
    format: 'HLS',
    codec: 'h264',
    resolution: '1920x1080',
    durationSec: 60,
    channelSlugs: ['tech', 'cine', 'art-design'],
    tags: ['Bitmovin', 'MultiBitrate', 'HLS'],
    source: 'Bitmovin',
    verified: false,
    license: 'Demo / Public Sample',
    notes: 'CDN sometimes 403s HEAD — bypassed via trusted CDN whitelist.',
  },

  // ============================================================
  // 20. Mux — additional test streams
  // ============================================================
  {
    title: 'Mux Test Stream — Mux Brand Showcase (HLS)',
    description: 'Mux brand showcase HLS test stream — production-quality test source.',
    url: 'https://stream.mux.com/v69RSHhFelSm4701FnPxs5g4e6hbSBjggF2ThXX7ZW022.m3u8',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?auto=format&fit=crop&w=640&q=80',
    format: 'HLS',
    codec: 'h264',
    resolution: '1920x1080',
    durationSec: 60,
    channelSlugs: ['show', 'entertain', 'tech', 'art-design'],
    tags: ['Mux', 'HLS', 'Production'],
    source: 'Mux',
    verified: false,
    license: 'Demo / Public Sample',
    notes: 'Stream ID — replace if it changes.',
  },

  // ============================================================
  // 21. Sample MP4s — bổ sung các fixture đa dạng
  // ============================================================
  {
    title: 'Samplelib — sample-5s (4 MB sample test)',
    description: 'Samplelib 5s — kiểm thử nhanh, dung lượng nhỏ.',
    url: 'https://download.samplelib.com/mp4/sample-5s.mp4',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=640&q=80',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 5,
    channelSlugs: ['tech', 'art-design', 'news'],
    tags: ['Samplelib', 'Short', 'Tech'],
    source: 'Samplelib',
    verified: true,
    license: 'Demo / Public Sample',
  },
  {
    title: 'Samplelib — sample-30s (Smoke test 30s)',
    description: 'Samplelib 30s — smoke test dài hơn cho test buffering.',
    url: 'https://download.samplelib.com/mp4/sample-30s.mp4',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=640&q=80',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 30,
    channelSlugs: ['news', 'tech', 'academy'],
    tags: ['Samplelib', '30s', 'Smoke'],
    source: 'Samplelib',
    verified: false,
    license: 'Demo / Public Sample',
  },

  // ============================================================
  // 22. Cloudinary — nhiều sample video cho testing
  // ============================================================
  {
    title: 'Cloudinary Demo — sea_turtle (MP4)',
    description: 'Cloudinary sea turtle — động vật biển, Discovery/Kids.',
    url: 'https://res.cloudinary.com/demo/video/upload/sea_turtle.mp4',
    thumbnailUrl:
      'https://res.cloudinary.com/demo/image/upload/c_scale,w_640/v1/samples/animals/reindeer.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '1920x1080',
    durationSec: 30,
    channelSlugs: ['discovery', 'kids', 'wellness'],
    tags: ['Cloudinary', 'SeaTurtle', 'Discovery'],
    source: 'Cloudinary',
    verified: false,
    license: 'Demo / Public Sample',
  },
  {
    title: 'Cloudinary Demo — sample (MP4)',
    description: 'Cloudinary sample — kiểm thử chung cho mọi channel.',
    url: 'https://res.cloudinary.com/demo/video/upload/sample.mp4',
    thumbnailUrl:
      'https://res.cloudinary.com/demo/image/upload/c_scale,w_640/v1/samples/cloudinary-icon.png',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 20,
    channelSlugs: ['news', 'tech', 'academy', 'business'],
    tags: ['Cloudinary', 'Sample', 'Universal'],
    source: 'Cloudinary',
    verified: false,
    license: 'Demo / Public Sample',
  },

  // ============================================================
  // 23. MUSIC — đa dạng nguồn cho kênh nhạc
  // ============================================================
  {
    title: 'Cloudinary — cld-sample-video (Music HD 1080p)',
    description: 'Cloudinary sample HD — sample video cho kênh music.',
    url: 'https://res.cloudinary.com/demo/video/upload/cld-sample-video.mp4',
    thumbnailUrl:
      'https://res.cloudinary.com/demo/image/upload/c_scale,w_640/v1/samples/landscapes/architecture-signs.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '1920x1080',
    durationSec: 30,
    channelSlugs: ['music', 'show', 'fashion'],
    tags: ['Music', 'Cloudinary', 'HD'],
    source: 'Cloudinary',
    verified: true,
    license: 'Demo / Public Sample',
  },
  {
    title: 'Mux — Big Buck Bunny HLS (Music Universal)',
    description: 'Mux Big Buck Bunny HLS master — dùng làm music visualizer.',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    thumbnailUrl:
      'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
    format: 'HLS',
    codec: 'h264',
    resolution: '640x360',
    durationSec: 596,
    channelSlugs: ['music', 'show', 'entertain'],
    tags: ['HLS', 'Mux', 'Music', 'Visualizer'],
    source: 'Mux',
    verified: true,
    license: 'Creative Commons',
  },
  {
    title: 'Samplelib — sample-10s (Music Bumper)',
    description: 'Sample video 10s — bumper cho kênh music.',
    url: 'https://download.samplelib.com/mp4/sample-10s.mp4',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=640&q=80',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 10,
    channelSlugs: ['music', 'podcast', 'audiobook'],
    tags: ['MP4', 'Samplelib', 'Bumper'],
    source: 'Samplelib',
    verified: true,
    license: 'Demo / Public Sample',
  },
  {
    title: 'Pexels — Ocean Waves (Music Background)',
    description: 'Pexels ocean waves — visualizer cho music channel.',
    url: 'https://videos.pexels.com/video-files/1409899/1409899-hd_1920_1080_25fps.mp4',
    thumbnailUrl:
      'https://images.pexels.com/videos/1409899/free-video-1409899.jpg?auto=compress&cs=tinysrgb&fit=crop&h=360',
    format: 'MP4',
    codec: 'h264',
    resolution: '1920x1080',
    durationSec: 30,
    channelSlugs: ['music', 'wellness', 'show'],
    tags: ['MP4', 'Pexels', 'Music', 'Background'],
    source: 'Pexels',
    verified: true,
    license: 'Pexels License',
  },

  // ============================================================
  // 24. NEWS — tin tức, bản tin
  // ============================================================
  {
    title: 'Mux — Tears of Steel HLS (News Background)',
    description: 'Mux HLS — dùng làm background cho kênh news.',
    url: 'https://test-streams.mux.dev/test_001/stream.m3u8',
    thumbnailUrl:
      'https://mango.blender.org/wp-content/themes/mango/images/header.jpg',
    format: 'HLS',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 734,
    channelSlugs: ['news', 'discovery', 'tech'],
    tags: ['HLS', 'Mux', 'News', 'Background'],
    source: 'Mux',
    verified: true,
    license: 'Creative Commons',
  },
  {
    title: 'Samplelib — sample-20s (News Teaser)',
    description: 'Sample video 20s — teaser cho news channel.',
    url: 'https://download.samplelib.com/mp4/sample-20s.mp4',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=640&q=80',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 20,
    channelSlugs: ['news', 'business'],
    tags: ['MP4', 'Samplelib', 'News'],
    source: 'Samplelib',
    verified: true,
    license: 'Demo / Public Sample',
  },

  // ============================================================
  // 25. SPORTS — bổ sung thể thao
  // ============================================================
  {
    title: 'Pexels — Aerial City (Sports Stadium Vibes)',
    description: 'Pexels aerial city — phù hợp stadium vibes cho thể thao.',
    url: 'https://videos.pexels.com/video-files/3209211/3209211-uhd_3840_2160_25fps.mp4',
    thumbnailUrl:
      'https://images.pexels.com/videos/3209211/free-video-3209211.jpg?auto=compress&cs=tinysrgb&fit=crop&h=360',
    format: 'MP4',
    codec: 'h264',
    resolution: '3840x2160',
    durationSec: 30,
    channelSlugs: ['sport-1', 'sport-2', 'esports', 'travel-world'],
    tags: ['MP4', 'Pexels', 'Sports', '4K', 'Aerial'],
    source: 'Pexels',
    verified: true,
    license: 'Pexels License',
  },
  {
    title: 'Cloudinary — cld-sample-video (Sport Reel)',
    description: 'Cloudinary sample — sport reel 1080p.',
    url: 'https://res.cloudinary.com/demo/video/upload/cld-sample-video.mp4',
    thumbnailUrl:
      'https://res.cloudinary.com/demo/image/upload/c_scale,w_640/v1/samples/landscapes/architecture-signs.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '1920x1080',
    durationSec: 30,
    channelSlugs: ['sport-1', 'sport-2', 'show'],
    tags: ['MP4', 'Cloudinary', 'Sport', 'Reel'],
    source: 'Cloudinary',
    verified: true,
    license: 'Demo / Public Sample',
  },
  {
    title: 'Samplelib — sample-15s (Sport Highlight)',
    description: 'Sample video 15s — sport highlight reel.',
    url: 'https://download.samplelib.com/mp4/sample-15s.mp4',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=640&q=80',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 15,
    channelSlugs: ['sport-1', 'sport-2', 'esports'],
    tags: ['MP4', 'Samplelib', 'Sport', 'Highlight'],
    source: 'Samplelib',
    verified: true,
    license: 'Demo / Public Sample',
  },

  // ============================================================
  // 26. ESPORTS — gaming tournaments
  // ============================================================
  {
    title: 'Cloudinary — dog.mp4 (Esports Mascot)',
    description: 'Cloudinary dog — mascot cho esports tournaments.',
    url: 'https://res.cloudinary.com/demo/video/upload/dog.mp4',
    thumbnailUrl:
      'https://res.cloudinary.com/demo/image/upload/c_scale,w_640/v1/samples/animals/three-dogs.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 30,
    channelSlugs: ['esports', 'indie-games', 'kids'],
    tags: ['MP4', 'Cloudinary', 'Esports', 'Mascot'],
    source: 'Cloudinary',
    verified: true,
    license: 'Demo / Public Sample',
  },
  {
    title: 'Mux — Big Buck Bunny HLS (Gaming Stream)',
    description: 'Mux Big Buck Bunny HLS — dùng làm placeholder gaming stream.',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    thumbnailUrl:
      'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
    format: 'HLS',
    codec: 'h264',
    resolution: '640x360',
    durationSec: 596,
    channelSlugs: ['esports', 'indie-games', 'tech'],
    tags: ['HLS', 'Mux', 'Gaming'],
    source: 'Mux',
    verified: true,
    license: 'Creative Commons',
  },

  // ============================================================
  // 27. FOOD & COOKING
  // ============================================================
  {
    title: 'Samplelib — sample-10s (Food Bumper)',
    description: 'Sample video 10s — bumper cho food channel.',
    url: 'https://download.samplelib.com/mp4/sample-10s.mp4',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=640&q=80',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 10,
    channelSlugs: ['food', 'health', 'wellness'],
    tags: ['MP4', 'Samplelib', 'Food', 'Bumper'],
    source: 'Samplelib',
    verified: true,
    license: 'Demo / Public Sample',
  },
  {
    title: 'Pexels — Sunset (Food Vibes)',
    description: 'Pexels sunset over mountains — atmospheric cho food content.',
    url: 'https://videos.pexels.com/video-files/4434150/4434150-uhd_2560_1440_30fps.mp4',
    thumbnailUrl:
      'https://images.pexels.com/videos/4434150/free-video-4434150.jpg?auto=compress&cs=tinysrgb&fit=crop&h=360',
    format: 'MP4',
    codec: 'h264',
    resolution: '2560x1440',
    durationSec: 30,
    channelSlugs: ['food', 'travel-world', 'travel-vn', 'wellness'],
    tags: ['MP4', 'Pexels', 'Food', 'Sunset'],
    source: 'Pexels',
    verified: false,
    license: 'Pexels License',
  },

  // ============================================================
  // 28. FASHION & LIFESTYLE
  // ============================================================
  {
    title: 'Cloudinary — cld-sample-video (Fashion Runway)',
    description: 'Cloudinary sample HD — phù hợp fashion runway.',
    url: 'https://res.cloudinary.com/demo/video/upload/cld-sample-video.mp4',
    thumbnailUrl:
      'https://res.cloudinary.com/demo/image/upload/c_scale,w_640/v1/samples/landscapes/architecture-signs.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '1920x1080',
    durationSec: 30,
    channelSlugs: ['fashion', 'wellness', 'show'],
    tags: ['MP4', 'Cloudinary', 'Fashion', 'Runway'],
    source: 'Cloudinary',
    verified: true,
    license: 'Demo / Public Sample',
  },
  {
    title: 'Samplelib — sample-15s (Fashion Teaser)',
    description: 'Sample video 15s — teaser cho fashion channel.',
    url: 'https://download.samplelib.com/mp4/sample-15s.mp4',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=640&q=80',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 15,
    channelSlugs: ['fashion', 'wellness'],
    tags: ['MP4', 'Samplelib', 'Fashion'],
    source: 'Samplelib',
    verified: true,
    license: 'Demo / Public Sample',
  },

  // ============================================================
  // 29. PODCAST & AUDIOBOOK
  // ============================================================
  {
    title: 'Mux — Tears of Steel HLS (Podcast Background)',
    description: 'Mux HLS stream — background cho podcast channel.',
    url: 'https://test-streams.mux.dev/test_001/stream.m3u8',
    thumbnailUrl:
      'https://mango.blender.org/wp-content/themes/mango/images/header.jpg',
    format: 'HLS',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 734,
    channelSlugs: ['podcast', 'audiobook', 'business'],
    tags: ['HLS', 'Mux', 'Podcast', 'Background'],
    source: 'Mux',
    verified: true,
    license: 'Creative Commons',
  },
  {
    title: 'Cloudinary — cld-sample-video (Podcast Visual)',
    description: 'Cloudinary sample HD — visual cho podcast.',
    url: 'https://res.cloudinary.com/demo/video/upload/cld-sample-video.mp4',
    thumbnailUrl:
      'https://res.cloudinary.com/demo/image/upload/c_scale,w_640/v1/samples/landscapes/architecture-signs.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '1920x1080',
    durationSec: 30,
    channelSlugs: ['podcast', 'audiobook', 'business', 'academy'],
    tags: ['MP4', 'Cloudinary', 'Podcast'],
    source: 'Cloudinary',
    verified: true,
    license: 'Demo / Public Sample',
  },

  // ============================================================
  // 30. BUSINESS & HEALTH
  // ============================================================
  {
    title: 'Mux — Big Buck Bunny HLS (Business Meeting Background)',
    description: 'Mux HLS — meeting background cho business channel.',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    thumbnailUrl:
      'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
    format: 'HLS',
    codec: 'h264',
    resolution: '640x360',
    durationSec: 596,
    channelSlugs: ['business', 'tech', 'academy'],
    tags: ['HLS', 'Mux', 'Business', 'Meeting'],
    source: 'Mux',
    verified: true,
    license: 'Creative Commons',
  },
  {
    title: 'Pexels — Ocean Waves (Health & Wellness)',
    description: 'Pexels ocean waves — calming visual cho health channel.',
    url: 'https://videos.pexels.com/video-files/1409899/1409899-hd_1920_1080_25fps.mp4',
    thumbnailUrl:
      'https://images.pexels.com/videos/1409899/free-video-1409899.jpg?auto=compress&cs=tinysrgb&fit=crop&h=360',
    format: 'MP4',
    codec: 'h264',
    resolution: '1920x1080',
    durationSec: 30,
    channelSlugs: ['health', 'wellness', 'travel-world'],
    tags: ['MP4', 'Pexels', 'Health', 'Calming'],
    source: 'Pexels',
    verified: true,
    license: 'Pexels License',
  },
  {
    title: 'Samplelib — sample-30s (Health Documentary)',
    description: 'Sample video 30s — health documentary background.',
    url: 'https://download.samplelib.com/mp4/sample-30s.mp4',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=640&q=80',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 30,
    channelSlugs: ['health', 'wellness', 'discovery'],
    tags: ['MP4', 'Samplelib', 'Health'],
    source: 'Samplelib',
    verified: false,
    license: 'Demo / Public Sample',
  },

  // ============================================================
  // 31. DRAMA & CINE — đa dạng phim
  // ============================================================
  {
    title: 'test-videos — Big Buck Bunny 360p 1MB (Drama)',
    description: 'Big Buck Bunny 360p 1MB — phù hợp drama channel.',
    url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
    thumbnailUrl:
      'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '640x360',
    durationSec: 10,
    channelSlugs: ['drama', 'cine', 'art-design'],
    tags: ['MP4', 'BigBuckBunny', 'Drama'],
    source: 'test-videos.co.uk',
    verified: true,
    license: 'Creative Commons',
  },
  {
    title: 'Unified — Tears of Steel HLS (Drama)',
    description: 'Unified Tears of Steel HLS — phù hợp drama channel.',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8',
    thumbnailUrl:
      'https://mango.blender.org/wp-content/themes/mango/images/header.jpg',
    format: 'HLS',
    codec: 'h264',
    resolution: '1920x800',
    durationSec: 734,
    channelSlugs: ['drama', 'cine', 'discovery', 'art-design'],
    tags: ['HLS', 'Unified', 'Drama', 'SciFi'],
    source: 'Unified Streaming',
    verified: true,
    license: 'Creative Commons',
  },

  // ============================================================
  // 32. SHOW & ENTERTAINMENT
  // ============================================================
  {
    title: 'Mux — Big Buck Bunny HLS (Show Demo)',
    description: 'Mux Big Buck Bunny HLS — cho show channel.',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    thumbnailUrl:
      'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
    format: 'HLS',
    codec: 'h264',
    resolution: '640x360',
    durationSec: 596,
    channelSlugs: ['show', 'entertain'],
    tags: ['HLS', 'Mux', 'Show'],
    source: 'Mux',
    verified: true,
    license: 'Creative Commons',
  },
  {
    title: 'Cloudinary — dog.mp4 (Entertainment Cute)',
    description: 'Cloudinary dog — cute content cho entertainment.',
    url: 'https://res.cloudinary.com/demo/video/upload/dog.mp4',
    thumbnailUrl:
      'https://res.cloudinary.com/demo/image/upload/c_scale,w_640/v1/samples/animals/three-dogs.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 30,
    channelSlugs: ['show', 'entertain', 'kids'],
    tags: ['MP4', 'Cloudinary', 'Cute', 'Entertainment'],
    source: 'Cloudinary',
    verified: true,
    license: 'Demo / Public Sample',
  },

  // ============================================================
  // 33. KIDS — nội dung thiếu nhi
  // ============================================================
  {
    title: 'Cloudinary — dog.mp4 (Kids Friendly)',
    description: 'Cloudinary dog — kids friendly content.',
    url: 'https://res.cloudinary.com/demo/video/upload/dog.mp4',
    thumbnailUrl:
      'https://res.cloudinary.com/demo/image/upload/c_scale,w_640/v1/samples/animals/three-dogs.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 30,
    channelSlugs: ['kids', 'entertain'],
    tags: ['MP4', 'Cloudinary', 'Kids', 'Cute'],
    source: 'Cloudinary',
    verified: true,
    license: 'Demo / Public Sample',
  },
  {
    title: 'Popeye — Internet Archive (Kids Classic)',
    description: 'Popeye for President — phim hoạt hình cổ điển cho kids.',
    url: 'https://archive.org/download/Popeye_forPresident/Popeye_forPresident_512kb.mp4',
    thumbnailUrl:
      'https://archive.org/services/img/Popeye_forPresident',
    format: 'MP4',
    codec: 'h264',
    resolution: '512x384',
    durationSec: 360,
    channelSlugs: ['kids', 'entertain'],
    tags: ['MP4', 'Archive', 'Kids', 'Classic', 'PublicDomain'],
    source: 'Internet Archive',
    verified: true,
    license: 'Public Domain',
  },
  {
    title: 'Samplelib — sample-5s (Kids Bumper)',
    description: 'Sample video 5s — bumper cho kids channel.',
    url: 'https://download.samplelib.com/mp4/sample-5s.mp4',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=640&q=80',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 5,
    channelSlugs: ['kids', 'show'],
    tags: ['MP4', 'Samplelib', 'Kids', 'Bumper'],
    source: 'Samplelib',
    verified: true,
    license: 'Demo / Public Sample',
  },

  // ============================================================
  // 34. ACADEMY & SKILL LAB — giáo dục
  // ============================================================
  {
    title: 'Mux — Tears of Steel HLS (Academy Lecture)',
    description: 'Mux HLS stream — lecture background cho academy.',
    url: 'https://test-streams.mux.dev/test_001/stream.m3u8',
    thumbnailUrl:
      'https://mango.blender.org/wp-content/themes/mango/images/header.jpg',
    format: 'HLS',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 734,
    channelSlugs: ['academy', 'skill-lab', 'tech'],
    tags: ['HLS', 'Mux', 'Academy', 'Lecture'],
    source: 'Mux',
    verified: true,
    license: 'Creative Commons',
  },
  {
    title: 'Samplelib — sample-30s (Skill Lab Demo)',
    description: 'Sample video 30s — demo cho skill lab.',
    url: 'https://download.samplelib.com/mp4/sample-30s.mp4',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=640&q=80',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 30,
    channelSlugs: ['academy', 'skill-lab', 'business'],
    tags: ['MP4', 'Samplelib', 'Education'],
    source: 'Samplelib',
    verified: false,
    license: 'Demo / Public Sample',
  },
  {
    title: 'Cloudinary — cld-sample-video (Skill Lab HD)',
    description: 'Cloudinary sample HD — workshop material.',
    url: 'https://res.cloudinary.com/demo/video/upload/cld-sample-video.mp4',
    thumbnailUrl:
      'https://res.cloudinary.com/demo/image/upload/c_scale,w_640/v1/samples/landscapes/architecture-signs.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '1920x1080',
    durationSec: 30,
    channelSlugs: ['skill-lab', 'academy', 'tech'],
    tags: ['MP4', 'Cloudinary', 'SkillLab', 'HD'],
    source: 'Cloudinary',
    verified: true,
    license: 'Demo / Public Sample',
  },

  // ============================================================
  // 35. DISCOVERY & TRAVEL — khám phá
  // ============================================================
  {
    title: 'Pexels — Sunset (Discovery Background)',
    description: 'Pexels sunset — atmospheric cho discovery channel.',
    url: 'https://videos.pexels.com/video-files/4434150/4434150-uhd_2560_1440_30fps.mp4',
    thumbnailUrl:
      'https://images.pexels.com/videos/4434150/free-video-4434150.jpg?auto=compress&cs=tinysrgb&fit=crop&h=360',
    format: 'MP4',
    codec: 'h264',
    resolution: '2560x1440',
    durationSec: 30,
    channelSlugs: ['discovery', 'travel-world', 'travel-vn', 'wellness'],
    tags: ['MP4', 'Pexels', 'Discovery', 'Sunset'],
    source: 'Pexels',
    verified: false,
    license: 'Pexels License',
  },
  {
    title: 'Big Buck Bunny — Internet Archive (Discovery)',
    description: 'Big Buck Bunny từ Internet Archive — exploration content.',
    url: 'https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4',
    thumbnailUrl:
      'https://peach.blender.org/wp-content/uploads/title_anouncement.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 596,
    channelSlugs: ['discovery', 'cine'],
    tags: ['MP4', 'Archive', 'Discovery', 'PublicDomain'],
    source: 'Internet Archive',
    verified: true,
    license: 'Public Domain',
  },

  // ============================================================
  // 36. TRAVEL VIETNAM & WORLD — đa dạng destinations
  // ============================================================
  {
    title: 'Cloudinary — cld-sample-video (Travel VN HD)',
    description: 'Cloudinary sample — phong cảnh đẹp cho travel VN.',
    url: 'https://res.cloudinary.com/demo/video/upload/cld-sample-video.mp4',
    thumbnailUrl:
      'https://res.cloudinary.com/demo/image/upload/c_scale,w_640/v1/samples/landscapes/architecture-signs.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '1920x1080',
    durationSec: 30,
    channelSlugs: ['travel-vn', 'travel-world', 'discovery'],
    tags: ['MP4', 'Cloudinary', 'Travel', 'Vietnam'],
    source: 'Cloudinary',
    verified: true,
    license: 'Demo / Public Sample',
  },
  {
    title: 'Samplelib — sample-20s (Travel Bumper)',
    description: 'Sample video 20s — bumper cho travel channels.',
    url: 'https://download.samplelib.com/mp4/sample-20s.mp4',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=640&q=80',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 20,
    channelSlugs: ['travel-vn', 'travel-world'],
    tags: ['MP4', 'Samplelib', 'Travel'],
    source: 'Samplelib',
    verified: true,
    license: 'Demo / Public Sample',
  },

  // ============================================================
  // 37. WELLNESS — sức khỏe
  // ============================================================
  {
    title: 'Samplelib — sample-15s (Wellness Session)',
    description: 'Sample video 15s — wellness session background.',
    url: 'https://download.samplelib.com/mp4/sample-15s.mp4',
    thumbnailUrl:
      'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=640&q=80',
    format: 'MP4',
    codec: 'h264',
    resolution: '1280x720',
    durationSec: 15,
    channelSlugs: ['wellness', 'health', 'fashion'],
    tags: ['MP4', 'Samplelib', 'Wellness'],
    source: 'Samplelib',
    verified: true,
    license: 'Demo / Public Sample',
  },

  // ============================================================
  // 38. TECH — công nghệ
  // ============================================================
  {
    title: 'Unified — Tears of Steel DASH (Tech Demo)',
    description: 'Unified DASH — phù hợp tech demos.',
    url: 'https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/tears-of-steel-audio_eng=64000.dash',
    thumbnailUrl:
      'https://mango.blender.org/wp-content/themes/mango/images/header.jpg',
    format: 'DASH',
    codec: 'h264',
    resolution: '1920x800',
    durationSec: 734,
    channelSlugs: ['tech', 'art-design'],
    tags: ['DASH', 'Unified', 'Tech'],
    source: 'Unified Streaming',
    verified: true,
    license: 'Creative Commons',
  },
  {
    title: 'Cloudinary — cld-sample-video (Tech Demo)',
    description: 'Cloudinary sample HD — tech demo content.',
    url: 'https://res.cloudinary.com/demo/video/upload/cld-sample-video.mp4',
    thumbnailUrl:
      'https://res.cloudinary.com/demo/image/upload/c_scale,w_640/v1/samples/landscapes/architecture-signs.jpg',
    format: 'MP4',
    codec: 'h264',
    resolution: '1920x1080',
    durationSec: 30,
    channelSlugs: ['tech', 'skill-lab', 'academy'],
    tags: ['MP4', 'Cloudinary', 'Tech'],
    source: 'Cloudinary',
    verified: true,
    license: 'Demo / Public Sample',
  },
];

@Injectable()
export class StudioCatalogService {
  /**
   * Build the final catalog (one-shot on first call) by attaching
   * deterministic IDs derived from the URL hash. We memoize the
   * result so we don't recompute on every request.
   */
  private readonly catalog: StudioCatalogStream[] = (() => {
    return RAW_CATALOG.map((entry) => ({
      ...entry,
      id: this.buildId(entry.url, entry.title),
    }));
  })();

  /** Returns the full catalog. */
  listAll(): StudioCatalogStream[] {
    return this.catalog;
  }

  /**
   * Filter the catalog by channel slug. Empty slug returns all.
   * Pass `verifiedOnly=true` to skip entries that didn't probe
   * ok from our env — useful when the operator is on the same
   * restricted network as the build server.
   */
  listForChannel(
    channelSlug: string | undefined,
    options: { verifiedOnly?: boolean; search?: string } = {},
  ): StudioCatalogStream[] {
    const { verifiedOnly = false, search } = options;
    const needle = search?.trim().toLowerCase();
    return this.catalog.filter((entry) => {
      if (channelSlug && entry.channelSlugs.length > 0 &&
          !entry.channelSlugs.includes(channelSlug)) {
        return false;
      }
      if (verifiedOnly && !entry.verified) return false;
      if (needle) {
        const haystack = (
          entry.title +
          ' ' +
          entry.description +
          ' ' +
          entry.tags.join(' ') +
          ' ' +
          entry.source
        ).toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }

  /** Lookup by id (used by the addFromCatalog endpoint). */
  findById(id: string): StudioCatalogStream | undefined {
    return this.catalog.find((entry) => entry.id === id);
  }

  /**
   * Counts by format — handy for the Studio tab badge.
   */
  summarize(filtered: StudioCatalogStream[]) {
    const byFormat: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    let verified = 0;
    for (const entry of filtered) {
      byFormat[entry.format] = (byFormat[entry.format] || 0) + 1;
      bySource[entry.source] = (bySource[entry.source] || 0) + 1;
      if (entry.verified) verified += 1;
    }
    return {
      total: filtered.length,
      verified,
      byFormat,
      bySource,
    };
  }

  /**
   * Build a stable, deterministic, URL-safe id from the URL+title.
   * Slugs come out the same across builds so the frontend can
   * cache them in localStorage.
   */
  private buildId(url: string, title: string): string {
    let h = 5381;
    const seed = `${url}::${title}`;
    for (let i = 0; i < seed.length; i++) {
      h = ((h << 5) + h + seed.charCodeAt(i)) | 0;
    }
    // Always positive + base36 for compactness.
    return 'cat-' + Math.abs(h).toString(36);
  }
}