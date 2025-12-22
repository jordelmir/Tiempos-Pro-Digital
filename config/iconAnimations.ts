export type IconTheme = 'cyber' | 'neon' | 'minimal' | 'ios' | 'futuristic';

export type IconAnimationProfile = {
  enabled?: boolean;
  animation?: 'infinite' | 'pulse' | 'bounce' | 'spin3d' | 'infiniteTrail';
  speed?: number; // seconds
  size?: number;
  glow?: boolean;
  theme?: IconTheme;
  trail?: boolean; // aplica estela si el icono es svg
};

export const ICON_DEFAULTS: IconAnimationProfile = {
  enabled: true,
  animation: 'infinite',
  speed: 2,
  size: 1,
  glow: true,
  theme: 'futuristic',
  trail: false,
};

export const ICON_THEMES: Record<IconTheme, Partial<IconAnimationProfile>> = {
  cyber: { glow: true, theme: 'cyber', speed: 1.6, trail: true, animation: 'spin3d' },
  neon: { glow: true, theme: 'neon', speed: 2.4, trail: true, animation: 'infiniteTrail' },
  minimal: { glow: false, theme: 'minimal', speed: 2.2, animation: 'pulse' },
  ios: { glow: true, theme: 'ios', speed: 1.8, animation: 'bounce' },
  futuristic: { glow: true, theme: 'futuristic', speed: 2.6, animation: 'spin3d', trail: true },
};
