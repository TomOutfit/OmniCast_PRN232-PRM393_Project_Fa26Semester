# OmniCast 3D Web Experience

A comprehensive, performance-aware 3D layer that turns the OmniCast streaming
platform into an immersive WebGL experience — without sacrificing the
existing UI, tests, or build pipeline.

## What's new

- **Global 3D background** mounted in the root layout: a slow particle
  field + drifting shapes that react to the camera.
- **Page-level 3D heroes** on every major route:
  - `/` — `HeroScene3D`: rotating channel carousel with live indicator.
  - `/channels` — `ChannelsScene3D`: 25-channel Fibonacci-sphere of
    glowing category-colored orbs.
  - `/programs` — `ProgramsScene3D`: curved 3D poster showcase with
    hover-pop and category colors.
  - `/epg` — `EPGScene3D`: 3D timeline with "now" marker, hour grid, and
    channel rows.
  - `/watchlist` — `WatchlistScene3D`: 3D card stack with status color and
    mouse parallax.
  - `/studio/live` — `StudioScene3D`: pulsing icosahedral core with a
    wireframe outer shell, "ON AIR" pulse when live.
  - `/login` & `/register` — `AuthScene3D`: low-density particle cloud
    + 4 floating shapes + brand text.
- **3D cursor follower**: a soft glowing dot trails the real cursor with
  damping, screen-blended so it doesn't interfere with clicks.
- **3D page transitions**: framer-motion fly-through with Z-axis depth and
  blur on every route change; degrades to a fade when
  `prefers-reduced-motion` is set.
- **Scroll-linked 3D parallax** (`Scroll3DParallax`) for hero sections.
- **DOM-side 3D tilt** (`ChannelCardTilt`) for existing 2D channel cards
  (no WebGL cost — pure CSS transform).
- **Post-processing**: bloom + vignette on every tier, plus chromatic
  aberration + film grain on the "high" tier.

## How it stays fast

| Concern | Mitigation |
| --- | --- |
| Low-end devices | `lib/three/capabilities.ts` detects WebGL, hardware concurrency, mobile UA, SaveData, and `prefers-reduced-motion`. Quality tier is set to `low` or `off` accordingly. |
| Mobile DPR | DPR cap of 1 on low, 1.5 on medium, 2 on high. |
| Antialiasing | Disabled on `low` tier to save fill rate. |
| Reduced motion | Particles, shapes, and 3D page transitions all honor `useReducedMotion`. |
| Battery | `powerPreference: 'low-power'` on low tier, `'high-performance'` otherwise. |
| Single Canvas rule | The `<Canvas3D>` is the only place we mount `<Canvas>`. All scenes are children. |
| Static geometry | Particle buffers are built once at mount; only the matrix updates per frame. |
| `Suspense` boundaries | Every 3D page is wrapped so a slow asset never blocks the rest of the tree. |
| Post-processing | Skipped entirely on low tier; only Bloom + Vignette on medium. |
| Pointer events | `pointer-events: none` on the global background and cursor dot — never blocks UI clicks. |

## Architecture

```
lib/three/
├── capabilities.ts          # WebGL + device + motion detection
├── useMousePosition.ts      # rAF-throttled cursor tracking
├── types.ts                 # shared type surface
├── index.ts                 # public exports
├── capabilities.test.ts     # unit tests
└── types.test.ts

components/three/
├── Canvas3D.tsx             # adaptive <Canvas> wrapper
├── Global3DBackground.tsx   # root-layout ambient layer
├── Page3DHero.tsx           # page-level 3D scene switcher
├── PageTransition3D.tsx     # framer-motion route transitions
├── Scroll3DParallax.tsx     # scroll-linked Y/scale animation
├── index.ts                 # public exports
├── primitives/
│   ├── ParticleField.tsx
│   ├── FloatingShapes.tsx
│   ├── PostprocessingFX.tsx
│   ├── ChannelCard3D.tsx    # also exports ChannelCardTilt
│   └── CursorFollower3D.tsx # also exports CursorFollowerDOM
└── scenes/
    ├── BackgroundScene3D.tsx
    ├── HeroScene3D.tsx
    ├── ChannelsScene3D.tsx
    ├── EPGScene3D.tsx
    ├── ProgramsScene3D.tsx
    ├── WatchlistScene3D.tsx
    ├── StudioScene3D.tsx
    └── AuthScene3D.tsx
```

## Adding a new 3D page

1. Create a `*Scene3D.tsx` in `components/three/scenes/` exporting a
   component that receives props for the data it needs to render.
2. Add a new variant to the `Page3DVariant` union in
   `components/three/Page3DHero.tsx` and wire it up in the switch.
3. From your page, mount:

   ```tsx
   import { Page3DHero } from '@/components/three/Page3DHero';
   import type { MySceneData } from '@/components/three/scenes/MyScene3D';

   <Page3DHero variant="my-variant" myData={data} height={460} />
   ```

4. Optionally, add a `ChannelCardTilt` around existing 2D card lists.

## Testing

- 174/174 unit tests pass (15 new 3D-specific tests in
  `lib/three/capabilities.test.ts` and `lib/three/types.test.ts`).
- `next build` compiles all 30 routes; the 3D pages report
  First Load JS in the 410–474 kB range (the 3D libraries are shared).
- `next dev` smoke-tested `/`, `/channels`, `/programs`, `/epg`,
  `/watchlist`, `/login` — all return 200 with the 3D canvas mounted.
