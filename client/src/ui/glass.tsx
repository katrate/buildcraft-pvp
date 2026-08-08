// ============================================================
// BuildCraft PvP — glass UI primitives (styled-components)
//
// Every visual element of the app is a React component here.
// No plain CSS classes: screens import these and compose them.
// ============================================================
import styled, { createGlobalStyle, css } from 'styled-components';

// styled-components v6 forwards unknown props to the DOM; filter the typed
// props so booleans/numbers never leak as invalid HTML attributes.
const forwardFilter = <T extends string>(...names: T[]) => ({
  shouldForwardProp: (prop: PropertyKey) => !names.includes(prop as T),
});

// ------------------------------------------------------------
// Global styles: CSS variables (legacy names kept), animated
// aurora background, scrollbars, font smoothing.
// ------------------------------------------------------------
export const GlobalStyle = createGlobalStyle`
  :root {
    --bg: #070b14;
    --bg-soft: #0c1220;
    --panel: rgba(255,255,255,0.055);
    --panel-2: rgba(255,255,255,0.09);
    --border: rgba(255,255,255,0.10);
    --text: #eaf0fb;
    --text-dim: #93a2bd;
    --accent: #ff9f43;
    --accent-2: #4dd0e1;
    --good: #45d483;
    --bad: #ff5d6c;
    --warn: #ffd166;
    --rare: #5aa7ff;
    --epic: #c77dff;
    --radius: 16px;
    --shadow: 0 12px 40px rgba(0,0,0,0.45);
  }

  * { box-sizing: border-box; }

  html, body, #root { height: 100%; margin: 0; }

  /* #root must be a flex column so AppShell's flex: 1 actually fills the viewport */
  #root { display: flex; flex-direction: column; }

  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow: hidden;
  }

  /* ambient aurora orbs behind everything */
  body::before, body::after {
    content: '';
    position: fixed;
    z-index: -2;
    width: 55vmax;
    height: 55vmax;
    border-radius: 50%;
    filter: blur(90px);
    pointer-events: none;
  }
  body::before {
    top: -22vmax;
    right: -18vmax;
    background: radial-gradient(circle, rgba(77,208,225,0.16), transparent 65%);
    animation: aurora-a 22s ease-in-out infinite alternate;
  }
  body::after {
    bottom: -24vmax;
    left: -16vmax;
    background: radial-gradient(circle, rgba(255,159,67,0.14), transparent 65%);
    animation: aurora-b 26s ease-in-out infinite alternate;
  }
  @keyframes aurora-a { from { transform: translate(0,0) scale(1); } to { transform: translate(-6vmax, 4vmax) scale(1.15); } }
  @keyframes aurora-b { from { transform: translate(0,0) scale(1.1); } to { transform: translate(5vmax, -3vmax) scale(0.95); } }

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
    background: rgba(255,255,255,0.14);
    border-radius: 99px;
    border: 2px solid transparent;
    background-clip: content-box;
  }
  ::-webkit-scrollbar-thumb:hover { background-color: rgba(255,255,255,0.24); background-clip: content-box; }

  button { font-family: inherit; }
  input, textarea { font-family: inherit; }
  h1, h2, h3 { margin: 0 0 10px; font-weight: 800; letter-spacing: -0.01em; }
  h1 { font-size: 1.6rem; }
  h2 { font-size: 1.25rem; }
  h3 { font-size: 1.05rem; }
  code { background: rgba(255,255,255,0.08); padding: 1px 6px; border-radius: 6px; font-size: 0.85em; }
`;

// ------------------------------------------------------------
// Layout
// ------------------------------------------------------------
export const Screen = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  max-width: 1180px;
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
export const Tiny = styled.span`font-size: 0.75rem; color: var(--text-dim);`;
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
  line-height: 1.5;
  margin: 0;
`;
export const B = styled.b`color: var(--text);`;

export const Divider = styled.div`
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent);
  margin: 14px 0;
`;

// ------------------------------------------------------------
// Glass surfaces
// ------------------------------------------------------------
const glassSurface = css`
  background: linear-gradient(160deg, rgba(255,255,255,0.085), rgba(255,255,255,0.03));
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow:
    0 12px 40px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255,255,255,0.08);
`;

export const Panel = styled.div`
  ${glassSurface}
  border-radius: 18px;
  padding: 18px;
`;

export const PanelTitle = styled.div`
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-dim);
  margin: 0 0 12px;
`;

// ------------------------------------------------------------
// Buttons
// ------------------------------------------------------------
type ButtonVariant = 'default' | 'primary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export const Button = styled.button.withConfig(forwardFilter('variant', 'size', 'block'))<{ variant?: ButtonVariant; size?: ButtonSize; block?: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 12px;
  padding: 10px 18px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
  transition: transform 0.08s ease, background 0.15s ease, border-color 0.15s ease, box-shadow 0.2s ease, color 0.15s ease;

  ${(p) => p.size === 'sm' && 'padding: 6px 12px; font-size: 0.78rem; border-radius: 9px;'}
  ${(p) => p.size === 'lg' && 'padding: 14px 26px; font-size: 1.05rem; border-radius: 14px;'}
  ${(p) => p.block && 'width: 100%;'}

  ${(p) =>
    p.variant === 'primary' &&
    css`
      background: linear-gradient(135deg, #ff9f43, #ff7847);
      border: 1px solid rgba(255, 159, 67, 0.6);
      color: #1a1206;
      box-shadow: 0 6px 24px rgba(255, 159, 67, 0.28);
      &:hover:not(:disabled) {
        background: linear-gradient(135deg, #ffab57, #ff8550);
        box-shadow: 0 8px 30px rgba(255, 159, 67, 0.42);
        transform: translateY(-1px);
      }
    `}
  ${(p) =>
    p.variant === 'ghost' &&
    css`
      background: transparent;
      border: 1px solid rgba(255,255,255,0.12);
      color: var(--text-dim);
      &:hover:not(:disabled) { color: var(--text); border-color: rgba(255,255,255,0.28); }
    `}
  ${(p) =>
    p.variant === 'danger' &&
    css`
      background: rgba(255, 93, 108, 0.10);
      border: 1px solid rgba(255, 93, 108, 0.35);
      color: #ff8b95;
      &:hover:not(:disabled) { background: rgba(255, 93, 108, 0.18); }
    `}
  ${(p) =>
    (!p.variant || p.variant === 'default') &&
    css`
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.12);
      color: var(--text);
      &:hover:not(:disabled) {
        background: rgba(255,255,255,0.12);
        border-color: rgba(255,255,255,0.24);
        transform: translateY(-1px);
      }
    `}

  &:active:not(:disabled) { transform: translateY(0) scale(0.98); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

// ------------------------------------------------------------
// Chips
// ------------------------------------------------------------
type ChipTone = 'default' | 'good' | 'warn' | 'offline' | 'epic';
export const Chip = styled.span.withConfig(forwardFilter('tone'))<{ tone?: ChipTone }>`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 12px;
  border-radius: 99px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-dim);
  ${(p) =>
    p.tone === 'good' &&
    css`color: var(--good); border-color: rgba(69,212,131,0.35); background: rgba(69,212,131,0.08); box-shadow: 0 0 14px rgba(69,212,131,0.12);`}
  ${(p) =>
    p.tone === 'warn' &&
    css`color: var(--warn); border-color: rgba(255,209,102,0.35); background: rgba(255,209,102,0.08); box-shadow: 0 0 14px rgba(255,209,102,0.12);`}
  ${(p) =>
    p.tone === 'offline' &&
    css`color: var(--bad); border-color: rgba(255,93,108,0.35); background: rgba(255,93,108,0.08);`}
  ${(p) =>
    p.tone === 'epic' &&
    css`color: var(--epic); border-color: rgba(199,125,255,0.4); background: rgba(199,125,255,0.08); box-shadow: 0 0 14px rgba(199,125,255,0.15);`}
`;

// ------------------------------------------------------------
// Stat bars / tracks
// ------------------------------------------------------------
export const StatBar = styled.div`display: flex; flex-direction: column; gap: 3px;`;

export const LabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 0.72rem;
  color: var(--text-dim);
`;

export const Track = styled.div.withConfig(forwardFilter('h'))<{ h?: number }>`
  height: ${(p) => p.h ?? 10}px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 99px;
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.5);
`;

export const Fill = styled.div.withConfig(forwardFilter('pct', 'color'))<{ pct: number; color?: string }>`
  width: ${(p) => p.pct}%;
  height: 100%;
  border-radius: 99px;
  background: ${(p) => p.color ?? 'var(--accent)'};
  transition: width 0.35s ease;
  box-shadow: 0 0 10px ${(p) => p.color ?? 'var(--accent)'}66;
`;

// ------------------------------------------------------------
// Forms
// ------------------------------------------------------------
export const Input = styled.input`
  background: rgba(0, 0, 0, 0.30);
  border: 1px solid rgba(255,255,255,0.12);
  color: var(--text);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 0.95rem;
  outline: none;
  width: 100%;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  &:focus {
    border-color: rgba(255, 159, 67, 0.6);
    box-shadow: 0 0 0 3px rgba(255, 159, 67, 0.15);
  }
  &::placeholder { color: rgba(147, 162, 189, 0.6); }
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
  ${glassSurface}
  border-radius: 14px;
  padding: 12px 22px;
  color: var(--text);
  border-color: rgba(255,159,67,0.5);
  z-index: 200;
  animation: glass-toast 0.25s ease;
`;

// ------------------------------------------------------------
// Tabs
// ------------------------------------------------------------
export const Tabs = styled.div`display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; align-items: center;`;

export const Tab = styled.button.withConfig(forwardFilter('active'))<{ active?: boolean }>`
  padding: 8px 16px;
  border-radius: 99px;
  border: 1px solid rgba(255,255,255,0.12);
  background: transparent;
  color: var(--text-dim);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.15s ease;
  ${(p) =>
    p.active &&
    css`
      background: rgba(255, 159, 67, 0.12);
      color: var(--accent);
      border-color: rgba(255, 159, 67, 0.5);
      box-shadow: 0 0 16px rgba(255, 159, 67, 0.15);
    `}
  &:hover { border-color: rgba(255,255,255,0.3); color: var(--text); }
`;

export const EmptyState = styled.div`
  text-align: center;
  color: var(--text-dim);
  padding: 40px 20px;
  border: 1px dashed rgba(255,255,255,0.16);
  border-radius: 16px;
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
  border-top: 1px dashed rgba(255,255,255,0.16);
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
  background: rgba(4, 7, 13, 0.72);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
`;

export const OverlayCard = styled.div`
  ${glassSurface}
  border-radius: 22px;
  padding: 30px;
  max-width: 460px;
  width: calc(100% - 40px);
  display: flex;
  flex-direction: column;
  gap: 14px;
  text-align: center;
  animation: glass-pop 0.22s ease;
`;

export const ModalBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(4, 7, 13, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 90;
  padding: 20px;
`;

export const Modal = styled.div`
  ${glassSurface}
  border-radius: 20px;
  max-width: 720px;
  width: 100%;
  max-height: 82vh;
  overflow-y: auto;
  padding: 20px;
  animation: glass-pop 0.2s ease;
`;

// ------------------------------------------------------------
// Menu screen
// ------------------------------------------------------------
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

export const Logo = styled.div`
  font-size: 2.7rem;
  font-weight: 900;
  letter-spacing: 0.05em;
  background: linear-gradient(135deg, #ff9f43, #ffd166, #4dd0e1);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  text-align: center;
  filter: drop-shadow(0 0 24px rgba(255, 159, 67, 0.25));
  small {
    display: block;
    font-size: 0.8rem;
    color: var(--text-dim);
    font-weight: 500;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    margin-top: 8px;
  }
`;

export const MenuGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 14px;
  width: 100%;
  max-width: 640px;
`;

export const MenuButton = styled.button`
  ${glassSurface}
  padding: 26px 18px;
  font-size: 1.15rem;
  font-weight: 700;
  border-radius: 20px;
  color: var(--text);
  cursor: pointer;
  transition: all 0.18s ease;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  text-align: center;
  &:hover {
    border-color: rgba(255, 159, 67, 0.55);
    transform: translateY(-3px);
    box-shadow: 0 18px 50px rgba(0,0,0,0.5), 0 0 30px rgba(255, 159, 67, 0.15);
  }
  &:active { transform: translateY(-1px) scale(0.98); }
`;
export const MenuIcon = styled.span`font-size: 1.9rem; filter: drop-shadow(0 0 12px rgba(255,255,255,0.12));`;
export const MenuSub = styled.span`font-size: 0.72rem; color: var(--text-dim); font-weight: 500;`;

// ------------------------------------------------------------
// Top bar
// ------------------------------------------------------------
export const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background: rgba(10, 15, 26, 0.6);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  position: sticky;
  top: 0;
  z-index: 10;
`;

export const Brand = styled.div`
  font-weight: 800;
  cursor: pointer;
  background: linear-gradient(135deg, #ff9f43, #4dd0e1);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  letter-spacing: 0.02em;
`;

export const Stats = styled.div`display: flex; gap: 12px; align-items: center; font-size: 0.85rem; flex-wrap: wrap;`;

// ------------------------------------------------------------
// Item cards
// ------------------------------------------------------------
export const ItemGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 12px;
`;

type Rarity = 'common' | 'uncommon' | 'rare' | 'epic';
const rarityColors: Record<Rarity, string> = {
  common: '#9aa5b1',
  uncommon: 'var(--good)',
  rare: 'var(--rare)',
  epic: 'var(--epic)',
};

export const ItemCard = styled.div.withConfig(forwardFilter('rarity', 'clickable', 'selected'))<{ rarity?: Rarity; clickable?: boolean; selected?: boolean }>`
  ${glassSurface}
  border-radius: 16px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.16s ease;
  position: relative;
  border-left: 3px solid ${(p) => (p.rarity ? rarityColors[p.rarity] : 'transparent')};
  ${(p) => p.clickable && 'cursor: pointer;'}
  ${(p) =>
    p.selected &&
    css`border-color: rgba(255,159,67,0.6); box-shadow: 0 0 0 2px rgba(255,159,67,0.35), 0 12px 40px rgba(0,0,0,0.45);`}
  &:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 159, 67, 0.45);
    box-shadow: 0 16px 44px rgba(0, 0, 0, 0.5);
  }
`;

export const ItemHead = styled.div`display: flex; align-items: center; gap: 10px;`;
export const ItemIcon = styled.div<{ size?: number }>`
  width: ${(p) => p.size ?? 42}px;
  height: ${(p) => p.size ?? 42}px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${(p) => (p.size ? '1.1rem' : '1.4rem')};
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.12);
  flex-shrink: 0;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);
`;
export const ItemName = styled.div`font-weight: 700; font-size: 0.95rem; line-height: 1.15;`;
export const ItemDesc = styled.div`font-size: 0.8rem; color: var(--text-dim); flex: 1; line-height: 1.45;`;
export const ItemFooter = styled.div`display: flex; justify-content: space-between; align-items: center; margin-top: auto; gap: 8px;`;
export const Price = styled.span`color: var(--warn); font-weight: 700; font-size: 0.85rem;`;
export const OwnedBadge = styled.span`color: var(--good); font-size: 0.8rem; font-weight: 700;`;

// ------------------------------------------------------------
// Build editor
// ------------------------------------------------------------
export const BuildLayout = styled.div`
  display: grid;
  grid-template-columns: 250px 1fr 280px;
  gap: 16px;
  align-items: start;
  @media (max-width: 1000px) { grid-template-columns: 1fr; }
`;

export const SlotList = styled.div`display: flex; flex-direction: column; gap: 10px;`;

export const SlotCard = styled.button`
  background: rgba(255,255,255,0.04);
  border: 1px dashed rgba(255,255,255,0.18);
  border-radius: 14px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
  width: 100%;
  color: var(--text);
  &:hover { border-color: rgba(255, 159, 67, 0.6); background: rgba(255,159,67,0.05); }
`;

export const SlotLabel = styled.div`
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-dim);
  font-weight: 700;
`;
export const SlotItem = styled.div`font-weight: 700; font-size: 0.95rem;`;
export const SlotEmpty = styled.div`color: var(--text-dim); font-style: italic; font-size: 0.85rem;`;

export const StatBlock = styled.div`display: flex; flex-direction: column; gap: 10px;`;

export const PresetTab = styled.button.withConfig(forwardFilter('active'))<{ active?: boolean }>`
  padding: 10px 14px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(255,255,255,0.04);
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.12s ease;
  text-align: left;
  color: var(--text);
  flex: 1;
  ${(p) =>
    p.active &&
    css`
      border-color: rgba(255, 159, 67, 0.55);
      background: rgba(255, 159, 67, 0.10);
      box-shadow: 0 0 16px rgba(255, 159, 67, 0.12);
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

export const Battlefield = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
  flex: 1;
  min-height: 0;
  align-items: center;
`;

export const TeamCol = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  min-height: 0;
  max-height: 100%;
  padding: 2px;
`;

export const TeamHead = styled.div`
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--text-dim);
  text-align: center;
  font-weight: 700;
`;

export const CombatantCard = styled.div.withConfig(forwardFilter('acting', 'dead', 'targetable', 'allyTarget'))<{ acting?: boolean; dead?: boolean; targetable?: boolean; allyTarget?: boolean }>`
  ${glassSurface}
  border-radius: 16px;
  padding: 12px;
  display: flex;
  gap: 12px;
  align-items: center;
  transition: all 0.15s ease;
  ${(p) => p.acting && css`border-color: rgba(255,159,67,0.65); box-shadow: 0 0 0 2px rgba(255,159,67,0.25), 0 12px 40px rgba(0,0,0,0.45);`}
  ${(p) => p.dead && 'opacity: 0.35; filter: grayscale(0.85);'}
  ${(p) => p.targetable && 'cursor: pointer;'}
  ${(p) => p.targetable && css`&:hover { border-color: var(--bad); transform: translateY(-2px); }`}
  ${(p) => p.allyTarget && 'cursor: pointer;'}
  ${(p) => p.allyTarget && css`&:hover { border-color: var(--good); transform: translateY(-2px); }`}
`;

export const Shape = styled.div.withConfig(forwardFilter('variant', 'color'))<{ variant: 'circle' | 'square' | 'triangle' | 'diamond'; color: string }>`
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  color: rgba(0, 0, 0, 0.65);
  font-size: 0.8rem;
  background: ${(p) => p.color};
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.25);
  ${(p) => p.variant === 'circle' && 'border-radius: 50%;'}
  ${(p) => p.variant === 'square' && 'border-radius: 8px;'}
  ${(p) => p.variant === 'triangle' && css`clip-path: polygon(50% 0, 100% 100%, 0 100%); border-radius: 0;`}
  ${(p) => p.variant === 'diamond' && css`transform: rotate(45deg); border-radius: 6px; & > span { transform: rotate(-45deg); }`}
`;

export const CbInfo = styled.div`flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0;`;
export const CbName = styled.div`font-weight: 700; font-size: 0.85rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
export const CbEffects = styled.div`display: flex; gap: 4px; flex-wrap: wrap; min-height: 16px;`;

export const FxBadge = styled.span.withConfig(forwardFilter('ready'))<{ ready?: boolean }>`
  font-size: 0.68rem;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 8px;
  padding: 1px 6px;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: var(--text-dim);
  ${(p) => p.ready && css`color: var(--epic); border-color: rgba(199,125,255,0.5); box-shadow: 0 0 10px rgba(199,125,255,0.2);`}
`;

export const CbSide = styled.div`display: flex; flex-direction: column; gap: 4px; width: 110px; flex-shrink: 0;`;

export const UltPips = styled.div`display: flex; gap: 3px; justify-content: flex-end;`;
export const Pip = styled.span.withConfig(forwardFilter('on'))<{ on?: boolean }>`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.14);
  transition: all 0.2s ease;
  ${(p) => p.on && css`background: var(--epic); border-color: var(--epic); box-shadow: 0 0 8px rgba(199,125,255,0.8);`}
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
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.12);
  color: var(--text);
  border-radius: 14px;
  padding: 10px 14px;
  min-width: 120px;
  text-align: left;
  cursor: pointer;
  transition: all 0.12s ease;
  display: flex;
  flex-direction: column;
  gap: 2px;
  ${(p) => p.ultimate && css`border-color: rgba(199,125,255,0.5); background: rgba(199,125,255,0.07);`}
  ${(p) => p.selected && css`border-color: var(--accent); background: rgba(255,159,67,0.10); box-shadow: 0 0 0 2px rgba(255,159,67,0.3);`}
  &:hover:not(:disabled) { border-color: var(--accent); transform: translateY(-1px); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

export const AbName = styled.span`font-weight: 700; font-size: 0.85rem;`;
export const AbMeta = styled.span.withConfig(forwardFilter('ready'))<{ ready?: boolean }>`
  font-size: 0.68rem;
  color: var(--text-dim);
  ${(p) => p.ready && 'color: var(--epic);'}
`;

export const LogBox = styled.div`
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 14px;
  padding: 12px;
  height: 150px;
  overflow-y: auto;
  font-size: 0.78rem;
  font-family: Consolas, monospace;
  line-height: 1.5;
  color: #b9c4d4;
  box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.4);
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
