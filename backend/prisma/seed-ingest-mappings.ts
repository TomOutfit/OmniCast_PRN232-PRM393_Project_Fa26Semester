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
  // Tech / Coding → freeCodeCamp (UC8butISFwT-Wl7EV0hUK0BQ)
  '11111111-1111-1111-1111-111111111110': { yt: 'UC8butISFwT-Wl7EV0hUK0BQ', twitch: '36028955' },
  // Music → Linus Tech Tips VOD Feed (UCXuqSBlHAE6Xw-yeJA0Tunw)
  '11111111-1111-1111-1111-111111111108': { yt: 'UCXuqSBlHAE6Xw-yeJA0Tunw' },
  // Cine → freeCodeCamp
  '11111111-1111-1111-1111-111111111105': { yt: 'UC8butISFwT-Wl7EV0hUK0BQ' },
  // News → Linus Tech Tips
  '11111111-1111-1111-1111-111111111107': { yt: 'UCXuqSBlHAE6Xw-yeJA0Tunw' },
  // Discovery → freeCodeCamp
  '11111111-1111-1111-1111-111111111112': { yt: 'UC8butISFwT-Wl7EV0hUK0BQ' },
  // Show → Linus Tech Tips
  '11111111-1111-1111-1111-111111111103': { yt: 'UCXuqSBlHAE6Xw-yeJA0Tunw' },

  // === 6 kênh cũ bổ sung RSS ===
  // Sport 1 → freeCodeCamp
  '11111111-1111-1111-1111-111111111101': { yt: 'UC8butISFwT-Wl7EV0hUK0BQ' },
  // Sport 2 → Linus Tech Tips
  '11111111-1111-1111-1111-111111111102': { yt: 'UCXuqSBlHAE6Xw-yeJA0Tunw' },
  // Entertain → freeCodeCamp
  '11111111-1111-1111-1111-111111111104': { yt: 'UC8butISFwT-Wl7EV0hUK0BQ' },
  // Drama → Linus Tech Tips
  '11111111-1111-1111-1111-111111111106': { yt: 'UCXuqSBlHAE6Xw-yeJA0Tunw' },
  // Kids → freeCodeCamp
  '11111111-1111-1111-1111-111111111109': { yt: 'UC8butISFwT-Wl7EV0hUK0BQ' },
  // Food → Linus Tech Tips
  '11111111-1111-1111-1111-111111111111': { yt: 'UCXuqSBlHAE6Xw-yeJA0Tunw' },

  // === 13 kênh mới ===
  '11111111-1111-1111-1111-111111111113': { yt: 'UC8butISFwT-Wl7EV0hUK0BQ' },
  '11111111-1111-1111-1111-111111111114': { yt: 'UCXuqSBlHAE6Xw-yeJA0Tunw' },
  '11111111-1111-1111-1111-111111111115': { yt: 'UC8butISFwT-Wl7EV0hUK0BQ' },
  '11111111-1111-1111-1111-111111111116': { yt: 'UCXuqSBlHAE6Xw-yeJA0Tunw' },
  '11111111-1111-1111-1111-111111111117': { yt: 'UC8butISFwT-Wl7EV0hUK0BQ' },
  '11111111-1111-1111-1111-111111111118': { yt: 'UCXuqSBlHAE6Xw-yeJA0Tunw' },
  '11111111-1111-1111-1111-111111111119': { yt: 'UC8butISFwT-Wl7EV0hUK0BQ' },
  '11111111-1111-1111-1111-111111111120': { yt: 'UCXuqSBlHAE6Xw-yeJA0Tunw' },
  '11111111-1111-1111-1111-111111111121': { yt: 'UC8butISFwT-Wl7EV0hUK0BQ' },
  '11111111-1111-1111-1111-111111111122': { yt: 'UCXuqSBlHAE6Xw-yeJA0Tunw' },
  '11111111-1111-1111-1111-111111111123': { yt: 'UC8butISFwT-Wl7EV0hUK0BQ' },
  '11111111-1111-1111-1111-111111111124': { yt: 'UCXuqSBlHAE6Xw-yeJA0Tunw' },
  '11111111-1111-1111-1111-111111111125': { yt: 'UC8butISFwT-Wl7EV0hUK0BQ' },
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
