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
