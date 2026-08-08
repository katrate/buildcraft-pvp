import { usePlayer, setDevUnlockRanked } from '../state/store';
import { useWsStatus } from '../services/ws';
import { isRankedUnlocked, progressToNextLevel, rankForRating } from '../../../shared/src/progression';
import { RANKED_UNLOCK_LEVEL } from '../../../shared/src/constants';
import { RankBar } from '../components/RankBar';
import { I, type IconName } from '../ui/icons';
import {
  Button,
  Chip,
  DevZone,
  Fill,
  HeroAccent,
  HeroTagline,
  HeroTitle,
  Kicker,
  Logo,
  MenuMain,
  MenuShell,
  NavIcon,
  NavItem,
  NavRail,
  StatPill,
  Tiny,
  Track,
} from '../ui/glass';

export type Screen =
  | 'menu'
  | 'play'
  | 'build'
  | 'inventory'
  | 'store'
  | 'profile'
  | 'combat-practice'
  | 'combat-online';

const ITEMS: { id: Screen; label: string; icon: IconName; sub: string }[] = [
  { id: 'play', label: 'Play', icon: 'swordCross', sub: 'Practice · PvP' },
  { id: 'build', label: 'Build', icon: 'wrench', sub: 'Power Presets' },
  { id: 'inventory', label: 'Inventory', icon: 'backpack', sub: 'Your collection' },
  { id: 'store', label: 'Store', icon: 'cart', sub: 'Powers & gear' },
  { id: 'profile', label: 'Profile', icon: 'account', sub: 'Stats & record' },
];

export function MainMenu(props: { onNavigate: (s: Screen) => void }) {
  const player = usePlayer();
  const status = useWsStatus();
  // The two ranked ladders are independent — show both, compactly.
  const rank1v1 = rankForRating(player.ranks['1v1'].rating);
  const rank5v5 = rankForRating(player.ranks['5v5'].rating);
  const rankLine = isRankedUnlocked(player.level)
    ? `1v1 ${rank1v1.name.toUpperCase()} · 5v5 ${rank5v5.name.toUpperCase()}`
    : `LOCKED @${RANKED_UNLOCK_LEVEL}`;
  const rankPill = isRankedUnlocked(player.level)
    ? `${rank1v1.name.toUpperCase()} 1v1 · ${rank5v5.name.toUpperCase()} 5v5`
    : '—';

  return (
    <MenuShell>
      {/* ============ LEFT NAV RAIL ============ */}
      <NavRail>
        <Logo style={{ margin: '6px 6px 20px' }}>
          BUILD<span className="red">CRAFT</span>
          <small>PvP</small>
        </Logo>

        {ITEMS.map((item) => (
          <NavItem key={item.id} onClick={() => props.onNavigate(item.id)}>
            <NavIcon>
              <I n={item.icon} size={20} />
            </NavIcon>
            <span>
              {item.label}
              <Tiny style={{ display: 'block', letterSpacing: '0.12em', marginTop: 2 }}>
                {item.sub}
              </Tiny>
            </span>
          </NavItem>
        ))}

        <div style={{ flex: 1 }} />

        {/* Rail footer — quick stats */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Chip tone={status === 'connected' ? 'good' : status === 'connecting' ? 'warn' : 'offline'}>
            {status === 'connected' ? '● server online' : status === 'connecting' ? '○ connecting…' : '○ server offline'}
          </Chip>
          <Tiny style={{ letterSpacing: '0.1em' }}>
            LV {player.level} · RANKED {rankLine}
          </Tiny>
          <Button
            variant="ghost"
            size="sm"
            onClick={setDevUnlockRanked}
            title="Dev tool — instantly reach the ranked-unlock threshold (never lowers your level)"
          >
            <I n="lightningBolt" /> Instantly Unlock Ranked
            {!isRankedUnlocked(player.level) ? ` (Level ${RANKED_UNLOCK_LEVEL})` : <><I n="check" /> unlocked</>}
          </Button>
        </div>
      </NavRail>

      {/* ============ HERO MAIN ============ */}
      <MenuMain>
        <Kicker>Multiplayer · Turn-based · Buildcraft</Kicker>

        <HeroTitle>
          BUILD YOUR
          <br />
          <HeroAccent>FIGHTER</HeroAccent>
        </HeroTitle>

        <HeroTagline>Build · Test · Fight · Earn · Experiment</HeroTagline>

        {/* Player quick stats */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 8 }}>
          <StatPill>
            LEVEL
            <b>{player.level}</b>
          </StatPill>
          <StatPill>
            <span style={{ color: 'var(--warn)' }}>COINS</span>
            <b>
              <I n="coins" /> {player.coins}
            </b>
          </StatPill>
          <StatPill>
            RECORD
            <b>
              {player.record.wins}W · {player.record.losses}L
            </b>
          </StatPill>
          <StatPill>
            RANK
            <b style={isRankedUnlocked(player.level) ? { color: rank5v5.color } : { color: 'var(--text-dim)' }}>
              {rankPill}
            </b>
          </StatPill>
        </div>

        {/* XP bar */}
        <div style={{ maxWidth: 560, width: '100%', marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <Tiny style={{ letterSpacing: '0.16em', color: 'var(--text)' }}>
              Level {player.level} → {player.level + 1}
            </Tiny>
            {!isRankedUnlocked(player.level) && (
              <Tiny>Ranked unlocks at level {RANKED_UNLOCK_LEVEL}</Tiny>
            )}
          </div>
          <Track h={10}>
            <Fill pct={progressToNextLevel(player.level, player.xp) * 100} color="var(--accent)" />
          </Track>
          <Tiny style={{ display: 'block', marginTop: 6, textAlign: 'right' }}>
            {Math.round(progressToNextLevel(player.level, player.xp) * 100)}% ·{' '}
            {isRankedUnlocked(player.level) ? rankLine : 'keep fighting to unlock ranked'}
          </Tiny>
        </div>

        {/* Rank (RR) progress — one bar per ladder, same style as the XP bar */}
        {isRankedUnlocked(player.level) && (
          <div style={{ maxWidth: 560, width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <Tiny style={{ letterSpacing: '0.16em', color: 'var(--text)' }}>RANK PROGRESS</Tiny>
              <Tiny>climb each ladder</Tiny>
            </div>
            {(['1v1', '5v5'] as const).map((f) => (
              <div key={f} style={{ marginBottom: 10 }}>
                <RankBar format={f} rank={player.ranks[f]} />
              </div>
            ))}
          </div>
        )}

        <DevZone>
          <Tiny>Dev tools</Tiny>
        </DevZone>
      </MenuMain>
    </MenuShell>
  );
}
