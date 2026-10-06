/**
 * OmniCast 25 Channels Tier Matrix & Client-Side Live Seek Engine
 * ─────────────────────────────────────────────────────────────────────
 * • Free Tier (Channels 1-5): Public broadcast for all viewers & guests
 * • Premium Tier (Channels 6-25): VIP 4K Ultra HD Broadcast (requires subscription)
 */

export const FREE_CHANNEL_SLUGS = [
  'sport-1',   // Omni Sport 1
  'sport-2',   // Omni Sport 2
  'show',      // Omni Show
  'entertain', // Omni Entertain
  'cine',      // Omni Cine
] as const;

export function isChannelPremium(slug?: string): boolean {
  if (!slug) return false;
  const s = slug.toLowerCase().replace(/^omni-/, '');
  return !(FREE_CHANNEL_SLUGS as readonly string[]).includes(s);
}

/**
 * Calculates current live playback offset in seconds based on scheduled time.
 * Creates an authentic continuous live broadcast illusion without server transcoding.
 */
export function calculateLiveSeekOffset(
  scheduledAt?: string | Date | null,
  durationMinutes?: number | null,
): number {
  if (!scheduledAt) return 0;
  try {
    const startTime = new Date(scheduledAt).getTime();
    const now = Date.now();
    
    // Duration in seconds (fallback to 60 mins = 3600s)
    const durationSeconds = Math.max(180, (durationMinutes || 60) * 60);

    if (now < startTime) {
      return 0; // Scheduled for future
    }

    const elapsedTotalSeconds = Math.floor((now - startTime) / 1000);
    // Continuous loop within program duration
    const currentLoopSecond = elapsedTotalSeconds % durationSeconds;
    return currentLoopSecond;
  } catch {
    return 0;
  }
}
