// ============================================================
// BuildCraft PvP — "STRIKE" UI primitives (styled-components)
//
// Valorant × Fortnite inspired: dark tactical base, red primary,
// cyan/purple energy accents, angular clipped corners, condensed
// uppercase display type. Every visual element of the app is a
// React component here — screens import these and compose them.
// ============================================================
import styled, { createGlobalStyle, css, keyframes } from 'styled-components';

// styled-components v6 forwards unknown props to the DOM; filter the typed
// props so booleans/numbers never leak as invalid HTML attributes.
const forwardFilter = <T extends string>(...names: T[]) => ({
  shouldForwardProp: (prop: PropertyKey) => !names.includes(prop as T),
});

// ------------------------------------------------------------
// Shared angular shape helpers
// ------------------------------------------------------------
// Clipped ("cut") corner — the signature Valorant corner treatment.
export const cutCorners = (s = 14) => css`
  clip-path: polygon(
    0 0,
    calc(100% - ${s}px) 0,
    100% ${s}px,
    100% 100%,
    ${s}px 100%,
    0 calc(100% - ${s}px)
  );
`;

export const DISPLAY = css`
  font-family: 'Rajdhani', 'Segoe UI', system-ui, sans-serif;
  font-weight: 700;
  text-transform: uppercase;
`;

// ------------------------------------------------------------
// Global styles: CSS variables, animated energy background,
// scrollbars, fonts.
// ------------------------------------------------------------
export const GlobalStyle = createGlobalStyle`
  :root {
    --bg: #0a0c12;
    --bg-soft: #10141d;
    --panel: rgba(255,255,255,0.045);
    --panel-2: rgba(255,255,255,0.09);
    --border: rgba(255,255,255,0.14);
    --text: #eef2f9;
    --text-dim: #8d97ac;
    --accent: #ff4655;
    --accent-2: #2dd4ff;
    --good: #45d483;
    --bad: #ff6b81;
    --warn: #ffd166;
    --rare: #4d9fff;
    --epic: #c06bff;
    --radius: 10px;
    --shadow: 0 10px 30px rgba(0,0,0,0.5);
  }

  * { box-sizing: border-box; }

  html, body, #root { height: 100%; margin: 0; }

  /* #root must be a flex column so AppShell's flex: 1 actually fills the viewport */
  #root { display: flex; flex-direction: column; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Chakra Petch', 'Segoe UI', system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }

  /* tactical grid floor behind everything */
  body::before {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -2;
    background-image:
      linear-gradient(rgba(255,255,255,0.028) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.028) 1px, transparent 1px);
    background-size: 46px 46px;
    pointer-events: none;
    mask-image: radial-gradient(ellipse 90% 70% at 50% 40%, black 30%, transparent 100%);
    -webkit-mask-image: radial-gradient(ellipse 90% 70% at 50% 40%, black 30%, transparent 100%);
  }

  /* angled energy beams — red & cyan, like a loading screen */
  body::after {
    content: '';
    position: fixed;
    inset: 0;
    z-index: -3;
    pointer-events: none;
    background:
      radial-gradient(ellipse 60% 42% at 82% -8%, rgba(255, 70, 85, 0.16), transparent 70%),
      radial-gradient(ellipse 55% 40% at 6% 108%, rgba(45, 212, 255, 0.13), transparent 70%),
      radial-gradient(ellipse 45% 36% at 60% 116%, rgba(192, 107, 255, 0.10), transparent 70%);
    animation: beam-drift 18s ease-in-out infinite alternate;
  }
  @keyframes beam-drift {
    from { transform: translate3d(0, 0, 0) scale(1); }
    to { transform: translate3d(-2.5vmax, 2vmax, 0) scale(1.08); }
  }

  @keyframes glass-spin { to { transform: rotate(360deg); } }
  @keyframes glass-toast {
    from { transform: translate(-50%, 20px); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
  }
  @keyframes glass-pop {
    from { opacity: 0; transform: translateY(10px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  ::-webkit-scrollbar { width: 10px; height: 10px; }
  ::-webkit-scrollbar-track { background: rgba(255,255,255,0.03); }
  ::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.16);
    border-radius: 99px;
    border: 2px solid transparent;
    background-clip: content-box;
  }
  ::-webkit-scrollbar-thumb:hover { background-color: rgba(255,255,255,0.26); background-clip: content-box; }

  button { font-family: inherit; }
  input, textarea { font-family: inherit; }

  h1, h2, h3 {
    margin: 0 0 10px;
    font-family: 'Rajdhani', 'Segoe UI', system-ui, sans-serif;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    line-height: 1.05;
  }
  h1 { font-size: 1.9rem; }
  h2 { font-size: 1.4rem; }
  h3 { font-size: 1.1rem; }
  code {
    background: rgba(255,255,255,0.08);
    padding: 1px 6px;
    border-radius: 4px;
    font-size: 0.85em;
    color: var(--accent-2);
  }
  ::selection { background: rgba(255, 70, 85, 0.4); }
`;

// ------------------------------------------------------------
// Layout
// ------------------------------------------------------------
export const Screen = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 26px;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
`;

export const Row = styled.div.withConfig(forwardFilter('wrap', 'center', 'between', 'gap'))<{ wrap?: boolean; center?: boolean; between?: boolean; gap?: number }>`
  display: flex;
  gap: ${(p) => p.gap ?? 14}px;
  align-items: center;
  ${(p) => p.wrap && 'flex-wrap: wrap;'}
  ${(p) => p.center && 'justify-content: center;'}
  ${(p) => p.between && 'justify-content: space-between;'}
`;

export const Col = styled.div<{ gap?: number }>`
  display: flex;
  flex-direction: column;
  gap: ${(p) => p.gap ?? 14}px;
`;

export const Grow = styled.div`flex: 1; min-width: 0;`;

export const Muted = styled.span`color: var(--text-dim); font-size: 0.85rem;`;
export const Tiny = styled.span`
  font-size: 0.72rem;
  color: var(--text-dim);
  letter-spacing: 0.03em;
`;
// Block-level variant for multi-line notes (spans can't contain divs)
export const MutedBlock = styled.div`
  color: var(--text-dim);
  font-size: 0.75rem;
  line-height: 1.5;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: center;
`;
export const P = styled.p`
  color: var(--text-dim);
  font-size: 0.85rem;
  line-height: 1.55;
  margin: 0;
`;
export const B = styled.b`color: var(--text);`;

export const Divider = styled.div`
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
  margin: 14px 0;
`;

// ------------------------------------------------------------
// Kicker — small uppercase label with a red slash marker
// ------------------------------------------------------------
export const Kicker = styled.div`
  ${DISPLAY}
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  color: var(--text-dim);
  &::before {
    content: '';
    width: 22px;
    height: 3px;
    background: var(--accent);
    transform: skewX(-20deg);
  }
`;

// ------------------------------------------------------------
// Angular surfaces (clipped corners + drop shadow that follows shape)
// ------------------------------------------------------------
const angularSurface = css`
  background: linear-gradient(160deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018));
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  border: 1px solid rgba(255,255,255,0.14);
`;

export const Panel = styled.div`
  ${angularSurface}
  ${cutCorners(16)}
  padding: 18px 20px;
  filter: drop-shadow(0 10px 26px rgba(0, 0, 0, 0.45));
`;

export const PanelTitle = styled.div`
  ${DISPLAY}
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 0.82rem;
  letter-spacing: 0.2em;
  color: var(--text);
  margin: 0 0 12px;
  &::before {
    content: '';
    width: 18px;
    height: 3px;
    background: linear-gradient(90deg, var(--accent), var(--accent-2));
    transform: skewX(-20deg);
    flex-shrink: 0;
  }
`;

// ------------------------------------------------------------
// Buttons
// ------------------------------------------------------------
type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export const Button = styled.button.withConfig(forwardFilter('variant', 'size', 'block'))<{ variant?: ButtonVariant; size?: ButtonSize; block?: boolean }>`
  ${DISPLAY}
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 4px;
  padding: 9px 18px;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: transform 0.1s ease, background 0.15s ease, border-color 0.15s ease, color 0.15s ease, filter 0.15s ease;

  ${(p) => p.size === 'sm' && 'padding: 5px 12px; font-size: 0.68rem; letter-spacing: 0.12em;'}
  ${(p) => p.size === 'lg' && 'padding: 13px 28px; font-size: 0.95rem;'}
  ${(p) => p.block && 'width: 100%;'}

  ${(p) =>
    p.variant === 'primary' &&
    css`
      ${cutCorners(10)}
      background: linear-gradient(120deg, #ff4655, #d92e3e);
      border: 1px solid rgba(255, 70, 85, 0.7);
      color: #fff;
      filter: drop-shadow(0 6px 16px rgba(255, 70, 85, 0.28));
      &:hover:not(:disabled) {
        filter: drop-shadow(0 8px 22px rgba(255, 70, 85, 0.45)) brightness(1.12);
        transform: translateY(-1px);
      }
    `}
  ${(p) =>
    p.variant === 'ghost' &&
    css`
      background: transparent;
      border: 1px solid rgba(255,255,255,0.14);
      color: var(--text-dim);
      ${cutCorners(8)}
      &:hover:not(:disabled) {
        color: var(--accent);
        border-color: rgba(255, 70, 85, 0.55);
      }
    `}
  ${(p) =>
    p.variant === 'danger' &&
    css`
      ${cutCorners(8)}
      background: rgba(255, 70, 85, 0.09);
      border: 1px solid rgba(255, 70, 85, 0.4);
      color: #ff8a94;
      &:hover:not(:disabled) {
        background: rgba(255, 70, 85, 0.18);
        border-color: rgba(255, 70, 85, 0.65);
      }
    `}
  ${(p) =>
    (!p.variant || p.variant === 'default') &&
    css`
      ${cutCorners(8)}
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.14);
      color: var(--text);
      &:hover:not(:disabled) {
        background: rgba(255,255,255,0.09);
        border-color: rgba(255, 70, 85, 0.55);
        transform: translateY(-1px);
      }
    `}

  &:active:not(:disabled) { transform: translateY(0) scale(0.97); }
  &:disabled { opacity: 0.38; cursor: not-allowed; }
`;

// ------------------------------------------------------------
// Chips
// ------------------------------------------------------------
type ChipTone = 'default' | 'good' | 'warn' | 'offline' | 'epic';
export const Chip = styled.span.withConfig(forwardFilter('tone'))<{ tone?: ChipTone }>`
  ${DISPLAY}
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 12px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.14);
  color: var(--text-dim);
  clip-path: polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 7px 100%, 0 calc(100% - 7px));
  ${(p) =>
    p.tone === 'good' &&
    css`color: var(--good); border-color: rgba(69,212,131,0.4); background: rgba(69,212,131,0.08);`}
  ${(p) =>
    p.tone === 'warn' &&
    css`color: var(--warn); border-color: rgba(255,209,102,0.4); background: rgba(255,209,102,0.08);`}
  ${(p) =>
    p.tone === 'offline' &&
    css`color: var(--bad); border-color: rgba(255,107,129,0.4); background: rgba(255,107,129,0.08);`}
  ${(p) =>
    p.tone === 'epic' &&
    css`color: var(--epic); border-color: rgba(192,107,255,0.45); background: rgba(192,107,255,0.08); box-shadow: 0 0 14px rgba(192,107,255,0.12);`}
`;

// ------------------------------------------------------------
// Stat bars / tracks (sharp, with a moving shine)
// ------------------------------------------------------------
export const StatBar = styled.div`display: flex; flex-direction: column; gap: 3px;`;

export const LabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-dim);
`;

export const Track = styled.div.withConfig(forwardFilter('h'))<{ h?: number }>`
  height: ${(p) => p.h ?? 10}px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 3px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.55);
`;

const fillSheen = keyframes`
  0% { transform: translateX(-60%); }
  60%, 100% { transform: translateX(120%); }
`;

export const Fill = styled.div.withConfig(forwardFilter('pct', 'color'))<{ pct: number; color?: string }>`
  width: ${(p) => p.pct}%;
  height: 100%;
  border-radius: 2px;
  background: ${(p) => p.color ?? 'var(--accent)'};
  transition: width 0.35s ease;
  position: relative;
  box-shadow: inset 0 -1px 0 rgba(0,0,0,0.25);
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(100deg, transparent 30%, rgba(255,255,255,0.35) 50%, transparent 70%);
    animation: ${fillSheen} 2.2s ease-in-out infinite;
  }
`;

// ------------------------------------------------------------
// Forms
// ------------------------------------------------------------
export const Input = styled.input`
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255,255,255,0.14);
  color: var(--text);
  border-radius: 4px;
  padding: 10px 14px;
  font-size: 0.9rem;
  outline: none;
  width: 100%;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  &::placeholder { color: rgba(141, 151, 172, 0.55); }
  &:focus {
    border-color: rgba(255, 70, 85, 0.75);
    box-shadow: 0 0 0 3px rgba(255, 70, 85, 0.16);
  }
`;

// ------------------------------------------------------------
// Feedback
// ------------------------------------------------------------
export const Spinner = styled.span`
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255,255,255,0.15);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: glass-spin 0.8s linear infinite;
  display: inline-block;
`;

export const Toast = styled.div`
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  ${angularSurface}
  ${cutCorners(12)}
  padding: 12px 24px;
  color: var(--text);
  border-color: rgba(255,70,85,0.6);
  z-index: 200;
  animation: glass-toast 0.25s ease;
  filter: drop-shadow(0 10px 30px rgba(0,0,0,0.6));
`;

// ------------------------------------------------------------
// Tabs (angular underline style)
// ------------------------------------------------------------
export const Tabs = styled.div`
  display: flex;
  gap: 2px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.1);
`;

export const Tab = styled.button.withConfig(forwardFilter('active'))<{ active?: boolean }>`
  ${DISPLAY}
  padding: 9px 16px;
  border: none;
  border-bottom: 3px solid transparent;
  background: transparent;
  color: var(--text-dim);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  transition: all 0.15s ease;
  clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
  ${(p) =>
    p.active &&
    css`
      color: var(--accent);
      border-bottom-color: var(--accent);
      background: linear-gradient(180deg, rgba(255,70,85,0.12), transparent 70%);
    `}
  &:hover { color: var(--text); border-bottom-color: rgba(255,70,85,0.5); }
`;

export const EmptyState = styled.div`
  text-align: center;
  color: var(--text-dim);
  padding: 40px 20px;
  border: 1px dashed rgba(255,255,255,0.2);
  border-radius: 6px;
  background: rgba(255,255,255,0.02);
`;

export const UpgradeRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  &:last-child { border-bottom: none; }
`;

export const DevZone = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  padding-top: 12px;
  border-top: 1px dashed rgba(255,255,255,0.18);
  max-width: 460px;
  width: 100%;
  justify-content: center;
`;

// ------------------------------------------------------------
// Overlays / modals
// ------------------------------------------------------------
export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(5, 7, 12, 0.8);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

export const OverlayCard = styled.div`
  ${angularSurface}
  ${cutCorners(18)}
  padding: 34px;
  max-width: 460px;
  width: calc(100% - 40px);
  display: flex;
  flex-direction: column;
  gap: 14px;
  text-align: center;
  animation: glass-pop 0.22s ease;
  border-top: 3px solid var(--accent);
  filter: drop-shadow(0 20px 60px rgba(0, 0, 0, 0.6));
`;

export const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(5, 7, 12, 0.78);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 90;
  padding: 20px;
`;

export const Modal = styled.div`
  ${angularSurface}
  border-radius: 6px;
  border-top: 3px solid var(--accent);
  max-width: 720px;
  width: 100%;
  max-height: 82vh;
  overflow-y: auto;
  padding: 20px;
  animation: glass-pop 0.2s ease;
  filter: drop-shadow(0 20px 60px rgba(0, 0, 0, 0.6));
`;

// ------------------------------------------------------------
// Menu shell — left nav rail + hero main area (game menu layout)
// ------------------------------------------------------------
export const MenuShell = styled.div`
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
`;

// Centered full-screen container (intro / countdown / fallbacks)
export const MenuScreen = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 24px;
  overflow-y: auto;
`;

export const NavRail = styled.div`
  width: 292px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 26px 16px 20px;
  background: rgba(7, 9, 14, 0.72);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  border-right: 1px solid rgba(255,255,255,0.1);
  overflow-y: auto;
  position: relative;
  z-index: 2;
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 3px;
    height: 100%;
    background: linear-gradient(180deg, var(--accent), var(--accent-2), transparent);
    opacity: 0.9;
  }
`;

export const NavItem = styled.button.withConfig(forwardFilter('active'))<{ active?: boolean }>`
  ${DISPLAY}
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  text-align: left;
  padding: 13px 16px;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  color: var(--text-dim);
  background: transparent;
  border: 1px solid transparent;
  border-radius: 4px;
  cursor: pointer;
  position: relative;
  transition: all 0.14s ease;
  clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
  &::before {
    content: '';
    position: absolute;
    left: 0;
    top: 14%;
    bottom: 14%;
    width: 3px;
    background: var(--accent);
    transform: skewX(-14deg);
    opacity: 0;
    transition: opacity 0.14s ease;
  }
  ${(p) =>
    p.active &&
    css`
      color: #fff;
      background: linear-gradient(90deg, rgba(255, 70, 85, 0.18), rgba(255, 70, 85, 0.03));
      border-color: rgba(255, 70, 85, 0.4);
      &::before { opacity: 1; }
    `}
  &:hover:not(:disabled) {
    color: #fff;
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255,255,255,0.16);
    transform: translateX(2px);
    &::before { opacity: 1; }
  }
`;

export const NavIcon = styled.span`
  font-size: 1.1rem;
  width: 22px;
  text-align: center;
  flex-shrink: 0;
`;

export const MenuMain = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 40px 32px;
  overflow-y: auto;
  position: relative;
`;

export const HeroTitle = styled.div`
  ${DISPLAY}
  font-size: clamp(2.6rem, 6.5vw, 4.6rem);
  line-height: 0.92;
  letter-spacing: 0.02em;
  text-align: center;
  color: #fff;
  filter: drop-shadow(0 8px 30px rgba(0, 0, 0, 0.6));
`;

export const HeroAccent = styled.span`
  background: linear-gradient(100deg, var(--accent), var(--accent-2));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

export const HeroTagline = styled.div`
  ${DISPLAY}
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.34em;
  color: var(--text-dim);
  text-align: center;
  text-transform: uppercase;
`;

export const StatPill = styled.div`
  ${DISPLAY}
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding: 9px 18px;
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  color: var(--text-dim);
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 4px;
  text-align: center;
  min-width: 88px;
  b {
    color: var(--text);
    font-size: 0.95rem;
    font-weight: 700;
    letter-spacing: 0.05em;
  }
`;

// ------------------------------------------------------------
// Sub-screen header — consistent game-menu page header
// ------------------------------------------------------------
export const ScreenHead = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 22px;
  flex-wrap: wrap;
`;

export const ScreenTitle = styled.div`
  ${DISPLAY}
  font-size: clamp(1.7rem, 3.4vw, 2.4rem);
  letter-spacing: 0.06em;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 14px;
  filter: drop-shadow(0 6px 20px rgba(0, 0, 0, 0.5));
  &::before {
    content: '';
    width: 6px;
    height: 1.2em;
    background: linear-gradient(180deg, var(--accent), var(--accent-2));
    transform: skewX(-12deg);
    flex-shrink: 0;
  }
`;

// ------------------------------------------------------------
// Two-column layout + mode cards (Play) + stat cards (Profile)
// ------------------------------------------------------------
export const TwoCol = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
  margin-top: 16px;
  @media (max-width: 920px) { grid-template-columns: 1fr; }
`;

export const ModeGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
`;

export const ModeCard = styled.div`
  ${angularSurface}
  ${cutCorners(16)}
  border-radius: 4px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  filter: drop-shadow(0 10px 26px rgba(0, 0, 0, 0.45));
  transition: transform 0.16s ease, border-color 0.16s ease;
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--accent), var(--accent-2));
  }
  &:hover { transform: translateY(-3px); border-color: rgba(255, 70, 85, 0.5); }
`;

export const ModeIcon = styled.div`
  width: 46px;
  height: 46px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  background: linear-gradient(150deg, rgba(255,70,85,0.18), rgba(255,70,85,0.02));
  border: 1px solid rgba(255,70,85,0.4);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);
`;

export const ModeTitle = styled.div`
  ${DISPLAY}
  font-size: 1.15rem;
  letter-spacing: 0.14em;
  color: #fff;
`;

export const ModeDesc = styled.div`
  font-size: 0.78rem;
  color: var(--text-dim);
  line-height: 1.55;
  flex: 1;
`;

export const StatCardRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
`;

export const StatCard = styled.div`
  ${angularSurface}
  ${cutCorners(12)}
  border-radius: 4px;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  border-left: 3px solid var(--accent);
  filter: drop-shadow(0 8px 22px rgba(0, 0, 0, 0.4));
  b {
    font-family: 'Rajdhani', sans-serif;
    font-size: 1.5rem;
    font-weight: 700;
    color: #fff;
    line-height: 1;
    letter-spacing: 0.03em;
  }
`;

export const SlotGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  @media (max-width: 700px) { grid-template-columns: 1fr; }
`;

// ------------------------------------------------------------
// Logo / brand
// ------------------------------------------------------------
export const Logo = styled.div`
  ${DISPLAY}
  font-size: 2.3rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #fff;
  text-align: center;
  line-height: 0.9;
  filter: drop-shadow(0 0 22px rgba(255, 70, 85, 0.3));
  span.red { color: var(--accent); }
  small {
    display: block;
    font-size: 0.68rem;
    font-family: 'Chakra Petch', sans-serif;
    color: var(--text-dim);
    font-weight: 500;
    letter-spacing: 0.34em;
    text-transform: uppercase;
    margin-top: 9px;
  }
`;

// ------------------------------------------------------------
// Top bar
// ------------------------------------------------------------
export const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  background: rgba(8, 10, 16, 0.82);
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: inset 3px 0 0 var(--accent), 0 6px 24px rgba(0, 0, 0, 0.4);
`;

export const Brand = styled.div`
  ${DISPLAY}
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  cursor: pointer;
  color: #fff;
  &::before {
    content: '';
    width: 20px;
    height: 3px;
    background: linear-gradient(90deg, var(--accent), var(--accent-2));
    transform: skewX(-20deg);
  }
  &:hover { color: var(--accent); }
`;

export const Stats = styled.div`
  display: flex;
  gap: 10px;
  align-items: center;
  font-size: 0.85rem;
  flex-wrap: wrap;
`;

// ------------------------------------------------------------
// Item cards
// ------------------------------------------------------------
export const ItemGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 14px;
`;

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic';
const rarityColors: Record<Rarity, string> = {
  common: '#9aa5b1',
  uncommon: 'var(--good)',
  rare: 'var(--rare)',
  epic: 'var(--epic)',
};

export const ItemCard = styled.div.withConfig(forwardFilter('rarity', 'clickable', 'selected'))<{ rarity?: Rarity; clickable?: boolean; selected?: boolean }>`
  ${angularSurface}
  ${cutCorners(14)}
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.16s ease;
  position: relative;
  border-left: 4px solid ${(p) => (p.rarity ? rarityColors[p.rarity] : 'transparent')};
  border-radius: 4px;
  filter: drop-shadow(0 8px 22px rgba(0, 0, 0, 0.4));
  ${(p) => p.clickable && 'cursor: pointer;'}
  ${(p) =>
    p.selected &&
    css`border-left-color: var(--accent); border-color: rgba(255,70,85,0.6); filter: drop-shadow(0 0 18px rgba(255,70,85,0.25));`}
  &:hover {
    transform: translateY(-2px);
    border-left-color: var(--accent);
    border-color: rgba(255, 70, 85, 0.5);
    filter: drop-shadow(0 14px 30px rgba(0, 0, 0, 0.5));
  }
`;

export const ItemHead = styled.div`display: flex; align-items: center; gap: 10px;`;
export const ItemIcon = styled.div<{ size?: number }>`
  width: ${(p) => p.size ?? 42}px;
  height: ${(p) => p.size ?? 42}px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${(p) => (p.size ? '1.1rem' : '1.4rem')};
  background: linear-gradient(150deg, rgba(255,255,255,0.09), rgba(255,255,255,0.02));
  border: 1px solid rgba(255,255,255,0.14);
  flex-shrink: 0;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);
`;
export const ItemName = styled.div`
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  line-height: 1.1;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;
export const ItemDesc = styled.div`font-size: 0.78rem; color: var(--text-dim); flex: 1; line-height: 1.45;`;
export const ItemFooter = styled.div`display: flex; justify-content: space-between; align-items: center; margin-top: auto; gap: 8px;`;
export const Price = styled.span`
  color: var(--warn);
  font-weight: 700;
  font-size: 0.82rem;
  font-family: 'Rajdhani', sans-serif;
  letter-spacing: 0.05em;
`;
export const OwnedBadge = styled.span`color: var(--good); font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;`;

// ------------------------------------------------------------
// Build editor
// ------------------------------------------------------------
export const BuildLayout = styled.div`
  display: grid;
  grid-template-columns: 240px 1fr 290px;
  gap: 16px;
  align-items: start;
  @media (max-width: 1000px) { grid-template-columns: 1fr; }
`;

export const SlotList = styled.div`display: flex; flex-direction: column; gap: 10px;`;

export const SlotCard = styled.button`
  background: rgba(255,255,255,0.035);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 4px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  width: 100%;
  color: var(--text);
  position: relative;
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
  &:hover {
    border-color: rgba(255, 70, 85, 0.6);
    background: rgba(255,70,85,0.05);
    transform: translateX(2px);
  }
`;

export const SlotLabel = styled.div`
  ${DISPLAY}
  font-size: 0.62rem;
  letter-spacing: 0.16em;
  color: var(--text-dim);
  font-weight: 600;
`;
export const SlotItem = styled.div`
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;
export const SlotEmpty = styled.div`color: var(--text-dim); font-style: italic; font-size: 0.82rem;`;

export const StatBlock = styled.div`display: flex; flex-direction: column; gap: 10px;`;

export const PresetTab = styled.button.withConfig(forwardFilter('active'))<{ active?: boolean }>`
  padding: 10px 14px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.03);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.12s ease;
  text-align: left;
  color: var(--text);
  flex: 1;
  font-family: 'Rajdhani', sans-serif;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  ${(p) =>
    p.active &&
    css`
      border-color: rgba(255, 70, 85, 0.6);
      background: linear-gradient(90deg, rgba(255,70,85,0.14), rgba(255,70,85,0.03));
      box-shadow: inset 3px 0 0 var(--accent);
    `}
  &:hover { border-color: var(--accent-2); }
`;

// ------------------------------------------------------------
// Combat arena
// ------------------------------------------------------------
export const Arena = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  max-width: 1100px;
  margin: 0 auto;
  width: 100%;
  padding: 0 18px 18px;
`;

export const ArenaTop = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  gap: 10px;
  flex-wrap: wrap;
`;

// Face-to-face arena: the enemy faces you across the field — enemy team on
// the far side (top), your team on the near side (bottom), VS between them.
// Each side tilts toward the center so the two teams literally face each other.
export const Battlefield = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 8px;
  flex: 1;
  min-height: 0;
  position: relative;
  perspective: 900px;
  &::before {
    content: 'VS';
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    font-family: 'Rajdhani', sans-serif;
    font-size: 2.6rem;
    font-weight: 700;
    color: rgba(255, 70, 85, 0.4);
    letter-spacing: 0.1em;
    z-index: 1;
    pointer-events: none;
    text-shadow: 0 0 30px rgba(255, 70, 85, 0.5);
  }
`;

export const TeamCol = styled.div.withConfig(forwardFilter('facing'))<{ facing?: 'top' | 'bottom' }>`
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
  min-height: 0;
  flex: 1 1 0;
  padding: 2px;
  // Far side (enemy) leans back, near side (yours) leans up — facing each other.
  ${(p) => p.facing === 'top' && css`transform: perspective(700px) rotateX(11deg); transform-origin: top center;`}
  ${(p) => p.facing === 'bottom' && css`transform: perspective(700px) rotateX(-11deg); transform-origin: bottom center;`}
`;

export const TeamHead = styled.div.withConfig(forwardFilter('tone'))<{ tone?: 'enemy' | 'ally' }>`
  ${DISPLAY}
  font-size: 0.7rem;
  letter-spacing: 0.24em;
  color: var(--text-dim);
  text-align: center;
  font-weight: 600;
  padding: 2px 0 6px;
  ${(p) => p.tone === 'enemy' && css`color: var(--bad);`}
  ${(p) => p.tone === 'ally' && css`color: var(--accent-2);`}
`;

export const CombatantCard = styled.div.withConfig(forwardFilter('acting', 'dead', 'targetable', 'allyTarget'))<{ acting?: boolean; dead?: boolean; targetable?: boolean; allyTarget?: boolean }>`
  ${angularSurface}
  ${cutCorners(14)}
  padding: 12px;
  display: flex;
  gap: 12px;
  align-items: center;
  transition: all 0.15s ease;
  border-radius: 4px;
  filter: drop-shadow(0 8px 22px rgba(0, 0, 0, 0.4));
  ${(p) =>
    p.acting &&
    css`border-color: rgba(255,70,85,0.8); filter: drop-shadow(0 0 16px rgba(255,70,85,0.3)); box-shadow: inset 3px 0 0 var(--accent);`}
  ${(p) => p.dead && 'opacity: 0.35; filter: grayscale(0.9);'}
  ${(p) => p.targetable && 'cursor: pointer;'}
  ${(p) => p.targetable && css`&:hover { border-color: var(--bad); transform: translateY(-2px); filter: drop-shadow(0 0 14px rgba(255,107,129,0.35)); }`}
  ${(p) => p.allyTarget && 'cursor: pointer;'}
  ${(p) => p.allyTarget && css`&:hover { border-color: var(--good); transform: translateY(-2px); }`}
`;

export const Shape = styled.div.withConfig(forwardFilter('variant', 'color'))<{ variant: 'circle' | 'square' | 'triangle' | 'diamond'; color: string }>`
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  color: rgba(0, 0, 0, 0.7);
  font-size: 0.8rem;
  font-family: 'Rajdhani', sans-serif;
  background: ${(p) => p.color};
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.25);
  border: 2px solid rgba(255,255,255,0.28);
  ${(p) => p.variant === 'circle' && 'border-radius: 50%;'}
  ${(p) => p.variant === 'square' && 'border-radius: 6px;'}
  ${(p) => p.variant === 'triangle' && css`clip-path: polygon(50% 0, 100% 100%, 0 100%); border-radius: 0; border: none;`}
  ${(p) => p.variant === 'diamond' && css`transform: rotate(45deg); border-radius: 4px; & > span { transform: rotate(-45deg); }`}
`;

export const CbInfo = styled.div`flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0;`;
export const CbName = styled.div`
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 0.95rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
export const CbEffects = styled.div`display: flex; gap: 4px; flex-wrap: wrap; min-height: 16px;`;

export const FxBadge = styled.span.withConfig(forwardFilter('ready'))<{ ready?: boolean }>`
  font-size: 0.66rem;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 3px;
  padding: 1px 6px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--text-dim);
  ${(p) => p.ready && css`color: var(--epic); border-color: rgba(192,107,255,0.55); box-shadow: 0 0 10px rgba(192,107,255,0.2);`}
`;

export const CbSide = styled.div`display: flex; flex-direction: column; gap: 4px; width: 110px; flex-shrink: 0;`;

export const UltPips = styled.div`display: flex; gap: 3px; justify-content: flex-end;`;
export const Pip = styled.span.withConfig(forwardFilter('on'))<{ on?: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  transform: rotate(45deg);
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.16);
  transition: all 0.2s ease;
  ${(p) => p.on && css`background: var(--epic); border-color: var(--epic); box-shadow: 0 0 8px rgba(192,107,255,0.9);`}
`;

// ------------------------------------------------------------
// Ability bar
// ------------------------------------------------------------
export const AbilityBar = styled.div`
  display: flex;
  gap: 10px;
  padding: 12px 0;
  flex-wrap: wrap;
  align-items: center;
`;

export const AbilityButton = styled.button.withConfig(forwardFilter('ultimate', 'selected'))<{ ultimate?: boolean; selected?: boolean }>`
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.14);
  color: var(--text);
  border-radius: 4px;
  padding: 10px 14px;
  min-width: 128px;
  text-align: left;
  cursor: pointer;
  transition: all 0.12s ease;
  display: flex;
  flex-direction: column;
  gap: 2px;
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
  ${(p) => p.ultimate && css`border-color: rgba(192,107,255,0.55); background: rgba(192,107,255,0.06);`}
  ${(p) => p.selected && css`border-color: var(--accent); background: rgba(255,70,85,0.1); box-shadow: inset 3px 0 0 var(--accent);`}
  &:hover:not(:disabled) { border-color: var(--accent); transform: translateY(-1px); }
  &:disabled { opacity: 0.38; cursor: not-allowed; }
`;

export const AbName = styled.span`
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;
export const AbMeta = styled.span.withConfig(forwardFilter('ready'))<{ ready?: boolean }>`
  font-size: 0.64rem;
  color: var(--text-dim);
  letter-spacing: 0.03em;
  ${(p) => p.ready && 'color: var(--epic);'}
`;

export const LogBox = styled.div`
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 4px;
  padding: 12px;
  height: 150px;
  overflow-y: auto;
  font-size: 0.76rem;
  font-family: Consolas, monospace;
  line-height: 1.5;
  color: #b9c4d4;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.45);
`;

export const LogLine = styled.div.withConfig(forwardFilter('round', 'damage'))<{ round?: boolean; damage?: boolean }>`
  ${(p) => p.round && css`color: var(--accent-2); font-weight: 700;`}
  ${(p) => p.damage && 'color: #ffd0d5;'}
`;

// ------------------------------------------------------------
// App shell + back button
// ------------------------------------------------------------
export const AppShell = styled.div`flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative;`;

export const BackButton = styled(Button).attrs({ variant: 'ghost' as const })``;

export const FlexFill = styled.div`flex: 1; display: flex; flex-direction: column; min-height: 0;`;
