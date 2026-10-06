// OmniCast - 25 Channels Tier Matrix & Client-Side Live Seek Engine
// ─────────────────────────────────────────────────────────────────────
// • Free Tier (Channels 1-5): Public broadcast for all viewers & guests
// • Premium Tier (Channels 6-25): VIP 4K Ultra HD Broadcast (requires subscription)

class ChannelTiers {
  static const List<String> freeChannelSlugs = [
    'sport-1',   // Omni Sport 1
    'sport-2',   // Omni Sport 2
    'show',      // Omni Show
    'entertain', // Omni Entertain
    'cine',      // Omni Cine
  ];

  static bool isPremium(String? slug) {
    if (slug == null || slug.isEmpty) return false;
    final normalized = slug.toLowerCase().replaceFirst(RegExp(r'^omni-'), '');
    return !freeChannelSlugs.contains(normalized);
  }

  /// Calculates current playback offset in seconds based on scheduled time.
  /// Seamless client-side live seek simulation without heavy server transcoding.
  static int calculateLiveSeekOffset({
    required DateTime? scheduledAt,
    int? durationMinutes,
  }) {
    if (scheduledAt == null) return 0;
    try {
      final now = DateTime.now();
      if (now.isBefore(scheduledAt)) return 0;

      final durationSeconds = (durationMinutes != null && durationMinutes > 0)
          ? durationMinutes * 60
          : 3600;

      final elapsedTotalSeconds = now.difference(scheduledAt).inSeconds;
      return elapsedTotalSeconds % durationSeconds;
    } catch (_) {
      return 0;
    }
  }
}
