/**
 * Public surface for the 3D component layer.
 * Import from "@/components/three" instead of reaching into individual files.
 */
export { Canvas3D } from './Canvas3D';
export { Global3DBackground } from './Global3DBackground';
export { PageTransition3D } from './PageTransition3D';
export { Page3DHero, type Page3DVariant, type Page3DHeroProps } from './Page3DHero';
export { Scroll3DParallax } from './Scroll3DParallax';
export { ParticleField } from './primitives/ParticleField';
export { FloatingShapes } from './primitives/FloatingShapes';
export { PostprocessingFX } from './primitives/PostprocessingFX';
export { ChannelCard3D, ChannelCardTilt } from './primitives/ChannelCard3D';
export { CursorFollower3D, CursorFollowerDOM } from './primitives/CursorFollower3D';

export { BackgroundScene3D } from './scenes/BackgroundScene3D';
export { HeroScene3D } from './scenes/HeroScene3D';
export { ChannelsScene3D, type ChannelOrbData } from './scenes/ChannelsScene3D';
export { EPGScene3D, type EPGProgram } from './scenes/EPGScene3D';
export { ProgramsScene3D, type ProgramPoster } from './scenes/ProgramsScene3D';
export { WatchlistScene3D, type WatchlistItem3D } from './scenes/WatchlistScene3D';
export { StudioScene3D } from './scenes/StudioScene3D';
export { AuthScene3D } from './scenes/AuthScene3D';
export { CyberScene3D } from './scenes/CyberScene3D';
export { SpatialUniverseModal } from './SpatialUniverseModal';
