# OmniCast - Design System & UI/UX Guidelines

## Visual Philosophy
Inspired by **Apple TV+**, **Netflix**, and **Impaktfull UI**:
- **Cinema-first immersion**: The media is the hero. Dark, neutral backgrounds make video thumbnails and live streams pop without visual distractions.
- **Restraint and clarity**: Remove unnecessary decorative clutter (glowing borders, multi-layer drop shadows, fake telemetry grids, emoji icons).
- **Hairline precision**: Subtle borders (`0x14FFFFFF` or `rgba(255, 255, 255, 0.08)`) separate cards and rails cleanly without harsh dividing lines.
- **Responsive tactile feedback**: Haptic clicks on mobile navigation and smooth 150-250ms transitions on interactive states.

## Color Palette (OLED Cinema Dark)

| Token | Hex / Value | Usage |
| :--- | :--- | :--- |
| `bg` | `#080B11` | Primary background (Deep Obsidian) |
| `surface` | `#0F1523` | Card backgrounds, list tiles, bottom sheets |
| `surfaceRaised` | `#131B2E` | Modals, elevated dialogs, floating panels |
| `surfaceContainer` | `#192338` | Hover states, pill containers, chip backgrounds |
| `border` | `rgba(255, 255, 255, 0.08)` (`0x14FFFFFF`) | Card borders, dividers, subtle outlines |
| `textPrimary` | `#F8FAFC` | Primary titles, channel names, headings |
| `textSecondary` | `#94A3B8` | Subtitles, duration badges, timestamps |
| `textMuted` | `#64748B` | Inactive icons, placeholder hints |
| `accent` / `active` | `#00E5FF` | Active navigation tabs, play indicators, focus rings |
| `liveRed` | `#EF4444` / `#E11D48` | LIVE badge, recording indicator, donation highlights |

## Typography
- **Font Family**: Inter, SF Pro, Roboto (Clean geometric sans-serif)
- **Scale**:
  - Title Large: 22px, Bold, tracking -0.5px
  - Title Medium: 17px, SemiBold
  - Body: 14px, Regular, line-height 1.45
  - Caption / Badge: 11-12px, Medium, uppercase for badges

## Key Components & Rules
1. **Hero Spotlight**: 16:9 full-bleed card with bottom gradient scrim (`LinearGradient(Colors.transparent, Color(0xFF080B11))`).
2. **Channel & Live Rails**: Horizontal scrollable rails with snap or smooth inertia; minimal padding (16px edge gutters, 12px card spacing).
3. **Badges**: Pill-shaped with 4px border radius, subtle semi-transparent background, and bold 11px uppercase label.
4. **Dock Navigation**: 58px fixed dock, hairline top border, active color cyan/white with haptic selection feedback.
5. **Anti-patterns to Avoid**:
   - Never use emojis as functional icons (use MaterialIcons or Lucide SVG).
   - Never use fake metric counters or telemetry graphs on authentication or profile screens.
   - Never use loud neon glow or dual-layer box shadows that reduce readability.
