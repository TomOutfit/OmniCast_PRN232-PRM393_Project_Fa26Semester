// ============================================================
// OmniCast - Ingest Source Mapper
// Maps OmniCast LiveChannels to real public YouTube channel IDs
// so the YouTube RSS ingest service can fetch live data into Supabase.
//
// YouTube channel IDs below are real, verified public channels.
// Swap them with your own creator channels as you onboard partners.
// ============================================================

import { PrismaClient } from '@prisma/client';
import process from 'process';

const prisma = new PrismaClient();

// Map OmniCast channels → real public YouTube channels.
// Source: youtube.com/<customUrl> → channel ID lookup.
const YT_CHANNEL_MAP: Record<string, { yt?: string; twitch?: string }> = {
  // 01. Sport 1 → Red Bull (UCblfuW_4rakIf2h6aqANefA)
  '11111111-1111-1111-1111-111111111101': { yt: 'UCblfuW_4rakIf2h6aqANefA' },
  // 02. Sport 2 → Formula 1 (UC0R3-zRpeIVUnavcRTPWzZA)
  '11111111-1111-1111-1111-111111111102': { yt: 'UC0R3-zRpeIVUnavcRTPWzZA' },
  // 03. Show → The Tonight Show (UC8-Th83bH_thdKZDJCrn88g)
  '11111111-1111-1111-1111-111111111103': { yt: 'UC8-Th83bH_thdKZDJCrn88g' },
  // 04. Entertain → Dude Perfect (UCRijo3ddMTht_IHyNSNXpNQ)
  '11111111-1111-1111-1111-111111111104': { yt: 'UCRijo3ddMTht_IHyNSNXpNQ' },
  // 05. Cine → Rotten Tomatoes Trailers (UCi8e0iOVk1fEOogdfu4YgfA)
  '11111111-1111-1111-1111-111111111105': { yt: 'UCi8e0iOVk1fEOogdfu4YgfA' },
  // 06. Drama → Netflix (UCWOA1ZGywLbqmigxE4Qlvuw)
  '11111111-1111-1111-1111-111111111106': { yt: 'UCWOA1ZGywLbqmigxE4Qlvuw' },
  // 07. News → BBC News (UC16niRr50-MSBwiO3YDb3RA)
  '11111111-1111-1111-1111-111111111107': { yt: 'UC16niRr50-MSBwiO3YDb3RA' },
  // 08. Music → Lofi Girl (UCSJ4gkVC6NrvII8umztf0Ow)
  '11111111-1111-1111-1111-111111111108': { yt: 'UCSJ4gkVC6NrvII8umztf0Ow' },
  // 09. Kids → Nat Geo Kids (UCXVCgDuD_QCkI7gTKU7-tpg)
  '11111111-1111-1111-1111-111111111109': { yt: 'UCXVCgDuD_QCkI7gTKU7-tpg' },
  // 10. Tech / Coding → Marques Brownlee (UCBJycsmduvYEL83R_U4JriQ) & Twitch RiotGames
  '11111111-1111-1111-1111-111111111110': { yt: 'UCBJycsmduvYEL83R_U4JriQ', twitch: '36028955' },
  // 11. Food → Tasty (UCJFp8uSYCjXOMnkUyb3CQ3Q)
  '11111111-1111-1111-1111-111111111111': { yt: 'UCJFp8uSYCjXOMnkUyb3CQ3Q' },
  // 12. Discovery → National Geographic (UCpVm7bg6pXKo1Pr6k5kxG9A)
  '11111111-1111-1111-1111-111111111112': { yt: 'UCpVm7bg6pXKo1Pr6k5kxG9A' },
  // 13. Esports → LoL Esports (UCvqRdlKsE5Q8mf8YXbdIJLw)
  '11111111-1111-1111-1111-111111111113': { yt: 'UCvqRdlKsE5Q8mf8YXbdIJLw' },
  // 14. Indie Games → IGN (UCKy1dAqELo0zrOtPkf0eTMw)
  '11111111-1111-1111-1111-111111111114': { yt: 'UCKy1dAqELo0zrOtPkf0eTMw' },
  // 15. Podcast → TED (UCAuUUnT6oDeKwE6v1NGQxug)
  '11111111-1111-1111-1111-111111111115': { yt: 'UCAuUUnT6oDeKwE6v1NGQxug' },
  // 16. Audiobook → Greatest AudioBooks (UCf099SXtegD4kv9-M3GIgnw)
  '11111111-1111-1111-1111-111111111116': { yt: 'UCf099SXtegD4kv9-M3GIgnw' },
  // 17. Academy → CrashCourse (UCX6b17PVsYBQ0ip5gyeme-Q)
  '11111111-1111-1111-1111-111111111117': { yt: 'UCX6b17PVsYBQ0ip5gyeme-Q' },
  // 18. Skill Lab → freeCodeCamp (UC8butISFwT-Wl7EV0hUK0BQ)
  '11111111-1111-1111-1111-111111111118': { yt: 'UC8butISFwT-Wl7EV0hUK0BQ' },
  // 19. Wellness → Yoga With Adriene (UCFKE7WVJfvaHW5q283SxchA)
  '11111111-1111-1111-1111-111111111119': { yt: 'UCFKE7WVJfvaHW5q283SxchA' },
  // 20. Fashion → Vogue (UCRXiA3h1no_PFkb1JCP0yMA)
  '11111111-1111-1111-1111-111111111120': { yt: 'UCRXiA3h1no_PFkb1JCP0yMA' },
  // 21. Travel VN → Khoai Lang Thang (UCZE88kYvCKUKjM-G0uc8Duw)
  '11111111-1111-1111-1111-111111111121': { yt: 'UCZE88kYvCKUKjM-G0uc8Duw' },
  // 22. Travel World → Expedia (UCGaOvAFinZ7BCN_FDmw74fQ)
  '11111111-1111-1111-1111-111111111122': { yt: 'UCGaOvAFinZ7BCN_FDmw74fQ' },
  // 23. Art & Design → Proko (UClM2LuQ1q5WEc23462tQzBg)
  '11111111-1111-1111-1111-111111111123': { yt: 'UClM2LuQ1q5WEc23462tQzBg' },
  // 24. Business → CNBC (UCvJJ_dzjViJCoLf5uKUTwoA)
  '11111111-1111-1111-1111-111111111124': { yt: 'UCvJJ_dzjViJCoLf5uKUTwoA' },
  // 25. Health → Doctor Mike (UC0QHWhjbe5fGJEPz3sVb6nw)
  '11111111-1111-1111-1111-111111111125': { yt: 'UC0QHWhjbe5fGJEPz3sVb6nw' },
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
