# OmniCast - Antigravity UI/UX Rules & Guidelines

Whenever designing, modifying, or refactoring UI components or screens in this project (especially Flutter Mobile and React Web), adhere strictly to the following standards powered by **Impeccable** and **UI/UX Pro Max**:

## 1. Context & Single Source of Truth
- Always align with [PRODUCT.md](PRODUCT.md) for product purpose, workflows, user roles, and constraints.
- Always follow the tokens and component specifications defined in [DESIGN.md](DESIGN.md).

## 2. Design System & Aesthetics (OLED Cinema Dark)
- **Palette**:
  - Background: Deep Obsidian (`#080B11`)
  - Surface Card: Slate (`#0F1523`)
  - Elevated Surface: (`#131B2E`)
  - Hairline Border: `0x14FFFFFF` (or `rgba(255, 255, 255, 0.08)`)
  - Accents: Neon Cyan (`#00E5FF`) for active states/focus; Rose Red (`#EF4444`) for live/recording badges
  - Text: High contrast Off-White (`#F8FAFC`) for titles, Muted Slate (`#94A3B8`) for secondary copy
- **Spacing & Layout**:
  - Strict 8px grid (8, 12, 16, 24, 32).
  - Minimum touch target: 44x44 dp on all buttons, tabs, and interactive chips.
  - Safe Area padding respected on notch, status bar, and bottom navigation bar.

## 3. Strict Anti-Patterns (Zero "AI Slop")
- **NO emoji icons**: Always use SVG or vector icons (`MaterialIcons`, `CupertinoIcons`, or `Lucide`).
- **NO fake telemetry / vanity metrics**: Do not add fake latency counters, fake bitrates, or pseudo-matrix grids on login, profile, or splash screens.
- **NO cheesy multi-layer neon blur / glow**: Avoid `BoxShadow` with high blur radius and saturated opacity that degrade readability.
- **NO duplicate rails**: Avoid redundant channel lists, duplicate hero banners, or stacked filter strips that clutter the screen.

## 4. Engineering Quality & Integrity
- **Zero Regression**: Preserve 100% of existing state management (BLoC/Cubit), models, API endpoints, socket connections, and routing arguments.
- **Haptic & Transitions**: Use `HapticFeedback.selectionClick()` on tab/navigation actions and smooth 150-250ms curves for state animations.
- **Zero Errors**: Always ensure `flutter analyze` passes with 0 errors and release builds succeed.

