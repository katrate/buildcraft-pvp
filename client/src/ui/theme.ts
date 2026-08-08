// ============================================================
// Glassmorphism design tokens for BuildCraft PvP.
//
// Keep the legacy CSS variable NAMES (--accent, --good, ...) so
// inline styles and prop-passed colors elsewhere keep working.
// ============================================================

export const glassTheme = {
  colors: {
    bg: '#070b14',
    bgSoft: '#0c1220',
    text: '#eaf0fb',
    textDim: '#93a2bd',
    accent: '#ff9f43',
    accent2: '#4dd0e1',
    good: '#45d483',
    bad: '#ff5d6c',
    warn: '#ffd166',
    rare: '#5aa7ff',
    epic: '#c77dff',
    border: 'rgba(255, 255, 255, 0.10)',
    borderSoft: 'rgba(255, 255, 255, 0.06)',
    glass: 'rgba(255, 255, 255, 0.055)',
    glassStrong: 'rgba(255, 255, 255, 0.10)',
    panelInner: 'rgba(255, 255, 255, 0.03)',
    track: 'rgba(0, 0, 0, 0.35)',
    overlay: 'rgba(4, 7, 13, 0.72)',
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
    pill: 999,
  },
  blur: {
    glass: 'blur(20px) saturate(160%)',
    soft: 'blur(6px)',
  },
  shadow: {
    card: '0 12px 40px rgba(0, 0, 0, 0.45)',
    lift: '0 18px 50px rgba(0, 0, 0, 0.55)',
    glow: '0 0 26px rgba(255, 159, 67, 0.28)',
    glowCyan: '0 0 26px rgba(77, 208, 225, 0.28)',
    glowGreen: '0 0 18px rgba(69, 212, 131, 0.30)',
    glowPurple: '0 0 18px rgba(199, 125, 255, 0.35)',
  },
  font: "'Segoe UI', system-ui, -apple-system, sans-serif",
  fontMono: 'Consolas, "SF Mono", monospace',
} as const;

export type GlassTheme = typeof glassTheme;
