'use client';

import { Canvas3D } from './Canvas3D';
import { HeroScene3D } from './scenes/HeroScene3D';
import { ChannelsScene3D, type ChannelOrbData } from './scenes/ChannelsScene3D';
import { EPGScene3D, type EPGProgram } from './scenes/EPGScene3D';
import { ProgramsScene3D, type ProgramPoster } from './scenes/ProgramsScene3D';
import { WatchlistScene3D, type WatchlistItem3D } from './scenes/WatchlistScene3D';
import { StudioScene3D } from './scenes/StudioScene3D';
import { AuthScene3D } from './scenes/AuthScene3D';
import { CyberScene3D } from './scenes/CyberScene3D';
import { detectCapabilities } from '@/lib/three/capabilities';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import type { ChannelCard3DData } from './primitives/ChannelCard3D';

export type Page3DVariant =
  | 'hero'
  | 'channels'
  | 'programs'
  | 'epg'
  | 'studio'
  | 'watchlist'
  | 'auth'
  | 'cyber';

export interface Page3DHeroProps {
  variant: Page3DVariant;
  /** Optional fixed height. Default: 480px desktop, 320px mobile. */
  height?: number;
  /** Hero channels (for variant="hero"). */
  channels?: ChannelCard3DData[];
  /** Channel orbs (for variant="channels"). */
  channelOrbs?: ChannelOrbData[];
  /** Programs (for variant="programs"). */
  programs?: ProgramPoster[];
  /** EPG programs (for variant="epg"). */
  epgPrograms?: EPGProgram[];
  /** EPG channels (for variant="epg"). */
  epgChannels?: string[];
  /** Watchlist items (for variant="watchlist"). */
  watchlistItems?: WatchlistItem3D[];
  /** Whether the studio is live (for variant="studio"). */
  isLive?: boolean;
  /** Headline (for variant="hero"|"auth"). */
  headline?: string;
  /** Subline (for variant="hero"|"auth"). */
  subline?: string;
  /** Tagline (for variant="auth"). */
  tagline?: string;
  /** Class for the outer wrapper. */
  className?: string;
  /** When true, removes the bottom fade so the 3D scene fills the area. */
  noFade?: boolean;
  /** Click handler for a card/orb/program. */
  onSelect?: (id: string) => void;
}

/**
 * Page3DHero — page-level 3D scene mounted above the existing 2D
 * content. Each variant is a self-contained Three.js scene tuned
 * for that page. Falls back to nothing when WebGL is unavailable.
 */
export function Page3DHero({
  variant,
  height,
  channels,
  channelOrbs,
  programs,
  epgPrograms,
  epgChannels,
  watchlistItems,
  isLive = false,
  headline,
  subline,
  tagline,
  className,
  noFade,
  onSelect,
}: Page3DHeroProps) {
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(detectCapabilities().webgl);
  }, []);

  if (!supported) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const sceneHeight = height ?? (isMobile ? 320 : 480);

  return (
    <div
      className={cn('relative w-full', className)}
      style={{ height: sceneHeight }}
      data-3d-hero={variant}
    >
      <Canvas3D
        cameraPosition={[0, 0, 5]}
        fov={50}
        postprocessing
        className="w-full h-full"
      >
        {variant === 'hero' && (
          <HeroScene3D
            channels={channels}
            headline={headline}
            subline={subline}
            onSelect={(c) => onSelect?.(c.id)}
          />
        )}
        {variant === 'channels' && channelOrbs && (
          <ChannelsScene3D
            channels={channelOrbs}
            onSelect={(c) => onSelect?.(c.id)}
          />
        )}
        {variant === 'programs' && programs && (
          <ProgramsScene3D
            programs={programs}
            onSelect={(p) => onSelect?.(p.id)}
          />
        )}
        {variant === 'epg' && epgPrograms && (
          <EPGScene3D
            programs={epgPrograms}
            channels={epgChannels}
            onSelect={(p) => onSelect?.(p.id)}
          />
        )}
        {variant === 'watchlist' && watchlistItems && (
          <WatchlistScene3D
            items={watchlistItems}
            onSelect={(it) => onSelect?.(it.id)}
          />
        )}
        {variant === 'studio' && <StudioScene3D title={headline ?? 'OMNICAST STUDIO'} isLive={isLive} />}
        {variant === 'auth' && <AuthScene3D brand={headline ?? 'OMNICAST'} tagline={tagline ?? subline ?? 'Sign in to continue'} />}
        {variant === 'cyber' && (
          <CyberScene3D
            title={headline ?? 'OMNICAST KNOWLEDGE HUB'}
            subtitle={subline ?? 'Tài liệu kỹ thuật & Kiến trúc phát sóng 4K'}
          />
        )}
      </Canvas3D>

      {/* Bottom fade so 2D content flows in naturally. */}
      {!noFade && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
          style={{
            background:
              'linear-gradient(180deg, rgba(7,11,18,0) 0%, rgba(7,11,18,0.95) 80%, rgba(7,11,18,1) 100%)',
          }}
        />
      )}
      {/* Top fade for navbar readability. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-16"
        style={{
          background:
            'linear-gradient(180deg, rgba(7,11,18,0.7) 0%, rgba(7,11,18,0) 100%)',
        }}
      />
    </div>
  );
}
