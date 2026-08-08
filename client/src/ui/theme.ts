// ============================================================
// "STRIKE" design tokens for BuildCraft PvP — Valorant × Fortnite.
//
// Dark tactical base, Valorant-red primary, electric cyan/purple
// energy accents, angular clipped-corner shapes, condensed display
// type. Legacy CSS variable NAMES are preserved (--accent, --good,
// ...) so inline styles and prop-passed colors elsewhere keep working.
// ============================================================

export const glassTheme = {
  colors: {
    bg: '#0a0c12',
    bgSoft: '#10141d',
    text: '#eef2f9',
    textDim: '#8d97ac',
    accent: '#ff4655', // Valorant red — primary CTA
    accent2: '#2dd4ff', // electric cyan — energy secondary
    good: '#45d483',
    bad: '#ff6b81',
    warn: '#ffd166',
    rare: '#4d9fff',
    epic: '#c06bff',
    border: 'rgba(255, 255, 255, 0.14)',
    borderSoft: 'rgba(255, 255, 255, 0.08)',
    glass: 'rgba(255, 255, 255, 0.045)',
    glassStrong: 'rgba(255, 255, 255, 0.09)',
    panelInner: 'rgba(255, 255, 255, 0.03)',
    track: 'rgba(0, 0, 0, 0.45)',
    overlay: 'rgba(5, 7, 12, 0.82)',
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    pill: 999,
  },
  blur: {
    glass: 'blur(18px) saturate(140%)',
    soft: 'blur(6px)',
  },
  shadow: {
    card: '0 10px 30px rgba(0, 0, 0, 0.5)',
    lift: '0 18px 44px rgba(0, 0, 0, 0.6)',
    glow: '0 0 22px rgba(255, 70, 85, 0.35)',
    glowCyan: '0 0 22px rgba(45, 212, 255, 0.35)',
    glowGreen: '0 0 16px rgba(69, 212, 131, 0.35)',
    glowPurple: '0 0 18px rgba(192, 107, 255, 0.4)',
  },
  // Condensed, uppercase-heavy display face (Tungsten-ish) + techy body face
  font: "'Chakra Petch', 'Segoe UI', system-ui, sans-serif",
  fontDisplay: "'Rajdhani', 'Segoe UI', system-ui, sans-serif",
  fontMono: 'Consolas, "SF Mono", monospace',
} as const;

export type GlassTheme = typeof glassTheme;
