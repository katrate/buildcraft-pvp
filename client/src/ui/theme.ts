// ============================================================
// Design tokens for BuildCraft PvP — clean, calm, eye-comfortable.
//
// Dark slate base, muted periwinkle primary, soft teal secondary,
// desaturated status colors, soft glass surfaces, gentle shadows.
// No neon glows — legibility and comfort come first. Legacy CSS
// variable NAMES are preserved (--accent, --good, ...) so inline
// styles and prop-passed colors elsewhere keep working.
// ============================================================

export const glassTheme = {
  colors: {
    bg: '#12151c',
    bgSoft: '#181c25',
    text: '#e8ecf2',
    textDim: '#96a0b0',
    accent: '#8294c9', // muted periwinkle — primary CTA
    accent2: '#6fa5ad', // soft teal — secondary
    good: '#82b39a', // sage
    bad: '#c78b95', // muted rose
    warn: '#c7a76d', // soft gold
    rare: '#79a3c6', // steel blue
    epic: '#a294c4', // dusty lavender
    border: 'rgba(255, 255, 255, 0.1)',
    borderSoft: 'rgba(255, 255, 255, 0.06)',
    glass: 'rgba(255, 255, 255, 0.03)',
    glassStrong: 'rgba(255, 255, 255, 0.055)',
    panelInner: 'rgba(255, 255, 255, 0.02)',
    track: 'rgba(0, 0, 0, 0.4)',
    overlay: 'rgba(8, 10, 15, 0.84)',
  },
  radius: {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    pill: 999,
  },
  blur: {
    glass: 'blur(16px) saturate(92%)',
    soft: 'blur(6px)',
  },
  shadow: {
    card: '0 8px 24px rgba(0, 0, 0, 0.42)',
    lift: '0 14px 34px rgba(0, 0, 0, 0.5)',
    glow: '0 0 0 rgba(0, 0, 0, 0)', // reserved — glows are retired
    glowCyan: '0 0 0 rgba(0, 0, 0, 0)',
    glowGreen: '0 0 0 rgba(0, 0, 0, 0)',
    glowPurple: '0 0 0 rgba(0, 0, 0, 0)',
  },
  // Condensed display face + techy body face
  font: "'Chakra Petch', 'Segoe UI', system-ui, sans-serif",
  fontDisplay: "'Rajdhani', 'Segoe UI', system-ui, sans-serif",
  fontMono: 'Consolas, "SF Mono", monospace',
} as const;

export type GlassTheme = typeof glassTheme;
