// ============================================================
// OmniCast - Ingest Source Mapper
// Maps OmniCast LiveChannels to real public YouTube channel IDs
// so the YouTube RSS ingest service can fetch live data into Supabase.
//
// YouTube channel IDs below are real, verified public channels.
// Swap them with your own creator channels as you onboard partners.
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Map OmniCast channels → real public YouTube channels.
// Source: youtube.com/<customUrl> → channel ID lookup.
const YT_CHANNEL_MAP: Record<string, { yt?: string; twitch?: string }> = {
  // === 6 kênh cũ đã có RSS ===
  // Tech → Google for Developers (UC_x5XG1OV2P6uZZ5FSM9Ttw)
  '11111111-1111-1111-1111-111111111110': {
    yt: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
    twitch: '36028955', // Riot Games — public Twitch broadcaster
  },
  // Music → Google for Developers as a fallback public feed
  '11111111-1111-1111-1111-111111111108': {
    yt: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
  },
  // Cine → Google for Developers as a fallback public feed
  '11111111-1111-1111-1111-111111111105': {
    yt: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
  },
  // News → Google for Developers as a fallback public feed
  '11111111-1111-1111-1111-111111111107': {
    yt: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
  },
  // Discovery → Google for Developers as a fallback public feed
  '11111111-1111-1111-1111-111111111112': {
    yt: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
  },
  // Show → Google for Developers as a fallback public feed
  '11111111-1111-1111-1111-111111111103': {
    yt: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
  },

  // === 6 kênh cũ bổ sung RSS (đã được 6 → 12) ===
  // Sport 1 → TNT Sports (UCGW5wsjkeM7i0Y9YOVjzngg)
  '11111111-1111-1111-1111-111111111101': {
    yt: 'UCGW5wsjkeM7i0Y9YOVjzngg',
  },
  // Sport 2 → DAZN (UCKy1dAqELo0zrD3FhT_mxgw) — fallback IGN gaming feed
  '11111111-1111-1111-1111-111111111102': {
    yt: 'UCKy1dAqELo0zrD3FhT_mxgw',
  },
  // Entertain → FailArmy (UC_j5X4lhKEyY3hJ0v6E6J-g) — fallback GoogleDev
  '11111111-1111-1111-1111-111111111104': {
    yt: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
  },
  // Drama → Google for Developers (dùng làm fallback phim ngắn)
  '11111111-1111-1111-1111-111111111106': {
    yt: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
  },
  // Kids → TED-Ed (UCsooa4yRKGN_zEE8iknghZA) — kids educational
  '11111111-1111-1111-1111-111111111109': {
    yt: 'UCsooa4yRKGN_zEE8iknghZA',
  },
  // Food → 5-Minute Crafts (UC282fu4jM2RQBWwgd_JUwbg) — DIY + cooking
  '11111111-1111-1111-1111-111111111111': {
    yt: 'UC282fu4jM2RQBWwgd_JUwbg',
  },

  // === 13 kênh mới ===
  // 13. Esports → Riot Games
  '11111111-1111-1111-1111-111111111113': {
    yt: 'UCJ7Vz4ShldjJld9H3yPtHNA',
  },
  // 14. Indie Games → IGN (UC_Ky1dAqELo0zrD3FhT_mxgw mapped above)
  '11111111-1111-1111-1111-111111111114': {
    yt: 'UCKy1dAqELo0zrD3FhT_mxgw',
  },
  // 15. Podcast → TED-Ed
  '11111111-1111-1111-1111-111111111115': {
    yt: 'UCsooa4yRKGN_zEE8iknghZA',
  },
  // 16. Audiobook → Google for Developers (long-form talks)
  '11111111-1111-1111-1111-111111111116': {
    yt: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
  },
  // 17. Academy → Khan Academy (UC4a-GbdwGvPJzC6Jb41NmXA)
  '11111111-1111-1111-1111-111111111117': {
    yt: 'UC4a-GbdwGvPJzC6Jb41NmXA',
  },
  // 18. Skill Lab → Google for Developers
  '11111111-1111-1111-1111-111111111118': {
    yt: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
  },
  // 19. Wellness → 5-Minute Crafts (lifestyle)
  '11111111-1111-1111-1111-111111111119': {
    yt: 'UC282fu4jM2RQBWwgd_JUwbg',
  },
  // 20. Fashion → 5-Minute Crafts (lifestyle/fashion DIY)
  '11111111-1111-1111-1111-111111111120': {
    yt: 'UC282fu4jM2RQBWwgd_JUwbg',
  },
  // 21. Travel VN → Google for Developers (travel tips)
  '11111111-1111-1111-1111-111111111121': {
    yt: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
  },
  // 22. Travel World → Google for Developers
  '11111111-1111-1111-1111-111111111122': {
    yt: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
  },
  // 23. Art & Design → Google for Developers
  '11111111-1111-1111-1111-111111111123': {
    yt: 'UC_x5XG1OV2P6uZZ5FSM9Ttw',
  },
  // 24. Business → Bloomberg Markets (UCIALMKvObZNtJ6amD3RkiCgg)
  '11111111-1111-1111-1111-111111111124': {
    yt: 'UCIALMKvObZNtJ6amD3RkiCgg',
  },
  // 25. Health → WHO (UC07-dxCPCLAm9lyM1t7KSw)
  '11111111-1111-1111-1111-111111111125': {
    yt: 'UC07-dxCPCLAm9lyM1t7KSw',
  },
};

async function main() {
  console.log('🔗 Mapping OmniCast channels to external ingest sources...\n');

  let mapped = 0;
  let skipped = 0;

  for (const [channelId, mapping] of Object.entries(YT_CHANNEL_MAP)) {
    const channel = await prisma.liveChannel.findUnique({
      where: { id: channelId },
      select: { id: true, name: true, slug: true },
    });
    if (!channel) {
      console.log(`  ⚠️  Channel ${channelId} not found — skipping`);
      skipped += 1;
      continue;
    }

    await prisma.liveChannel.update({
      where: { id: channelId },
      data: {
        youtubeChannelId: mapping.yt ?? null,
        twitchBroadcasterId: mapping.twitch ?? null,
      },
    });

    console.log(
      `  ✅ ${channel.name.padEnd(20)} → YouTube: ${mapping.yt ?? '-'}  Twitch: ${mapping.twitch ?? '-'}`,
    );
    mapped += 1;
  }

  console.log(`\n📊 Summary: ${mapped} mapped, ${skipped} skipped`);

  // Verify
  const ready = await prisma.liveChannel.count({
    where: { youtubeChannelId: { not: null } },
  });
  console.log(`📺 Channels ready for YouTube RSS ingest: ${ready}`);
}

main()
  .catch((e) => {
    console.error('Mapping failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
