import { useState } from 'react';
import { usePlayer, getActivePreset } from '../state/store';
import { signOut } from '../state/auth';
import { useWsStatus } from '../services/ws';
import {
  isRankedUnlocked,
  maxRankedUpgradeFor,
  progressToNextLevel,
  rankForRating,
  rankStatusText,
} from '../../../shared/src/progression';
import { ratingToNextBand, tierForRating } from '../../../shared/src/rating';
import { RANKED_UNLOCK_LEVEL } from '../../../shared/src/constants';
import { RankBar } from '../components/RankBar';
import { I, type IconName } from '../ui/icons';
import {
  Avatar,
  Button,
  Chip,
  Divider,
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
  Panel,
  PanelTitle,
  RailUser,
  Row,
  StatCard,
  StatCardRow,
  Tiny,
  Track,
  TwoCol,
} from '../ui/glass';

export type Screen =
  | 'menu'
  | 'play'
  | 'build'
  | 'inventory'
  | 'store'
  | 'combat-practice'
  | 'combat-online';

const ITEMS: { id: Screen; label: string; icon: IconName; sub: string }[] = [
  { id: 'play', label: 'Play', icon: 'swordCross', sub: 'Practice · PvP' },
  { id: 'build', label: 'Build', icon: 'wrench', sub: 'Power Presets' },
  { id: 'inventory', label: 'Inventory', icon: 'backpack', sub: 'Your collection' },
  { id: 'store', label: 'Store', icon: 'cart', sub: 'Powers & gear' },
];

// The two ranked ladders are independent — each has its own rank, games and
// stat-upgrade pool. Both are shown in the Ranked Ladders panel below.
const FORMATS: { id: '1v1' | '5v5'; label: string }[] = [
  { id: '1v1', label: '1v1' },
  { id: '5v5', label: '5v5' },
];

export function MainMenu(props: { onNavigate: (s: Screen) => void }) {
  const player = usePlayer();
  const status = useWsStatus();
  const [signingOut, setSigningOut] = useState(false);
  const rankedUnlocked = isRankedUnlocked(player.level);
  const rank1v1 = rankForRating(player.ranks['1v1'].rating);
  const rank5v5 = rankForRating(player.ranks['5v5'].rating);
  const rankLine = rankedUnlocked
    ? `1v1 ${rank1v1.name.toUpperCase()} · 5v5 ${rank5v5.name.toUpperCase()}`
    : `LOCKED @${RANKED_UNLOCK_LEVEL}`;
  const active = getActivePreset();

  async function handleSignOut(): Promise<void> {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      // If sign-out fails (e.g. network), re-enable the button — on success
      // the app unmounts this screen anyway.
      setSigningOut(false);
    }
  }

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

        {/* Player identity + session */}
        <RailUser>
          <Avatar>{(player.name || '?')[0]}</Avatar>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {player.name}
            </div>
            <Tiny style={{ letterSpacing: '0.14em' }}>LEVEL {player.level}</Tiny>
          </div>
        </RailUser>
        <Chip tone={status === 'connected' ? 'good' : status === 'connecting' ? 'warn' : 'offline'} style={{ justifyContent: 'center' }}>
          {status === 'connected' ? '● server online' : status === 'connecting' ? '○ connecting…' : '○ server offline'}
        </Chip>
        <Button variant="danger" size="sm" block disabled={signingOut} onClick={handleSignOut}>
          <I n="logout" /> {signingOut ? 'Signing out…' : 'Sign out'}
        </Button>
      </NavRail>

      {/* ============ HERO + CAREER MAIN ============ */}
      <MenuMain>
        <Kicker>Multiplayer · Turn-based · Buildcraft</Kicker>

        <HeroTitle>
          BUILD YOUR
          <br />
          <HeroAccent>FIGHTER</HeroAccent>
        </HeroTitle>

        <HeroTagline>Build · Test · Fight · Earn · Experiment</HeroTagline>

        {/* Career stat cards */}
        <div style={{ width: '100%', maxWidth: 860 }}>
          <StatCardRow>
            <StatCard>
              <Tiny>Level</Tiny>
              <b>{player.level}</b>
              <Tiny>{Math.round(progressToNextLevel(player.level, player.xp) * 100)}% to next</Tiny>
            </StatCard>
            <StatCard>
              <Tiny>Wins</Tiny>
              <b style={{ color: 'var(--good)' }}>{player.record.wins}</b>
            </StatCard>
            <StatCard>
              <Tiny>Losses</Tiny>
              <b style={{ color: 'var(--bad)' }}>{player.record.losses}</b>
            </StatCard>
            <StatCard>
              <Tiny>Matches</Tiny>
              <b>{player.record.matches}</b>
            </StatCard>
            <StatCard>
              <Tiny>Ranked</Tiny>
              <b style={rankedUnlocked ? { color: rank5v5.color } : { color: 'var(--text-dim)' }}>
                {rankedUnlocked ? rank5v5.name.toUpperCase() : 'Locked'}
              </b>
            </StatCard>
          </StatCardRow>
        </div>

        {/* Ranked ladders + career details */}
        <div style={{ width: '100%', maxWidth: 860 }}>
          <TwoCol>
            <Panel>
              <PanelTitle>Ranked Ladders</PanelTitle>
              {rankedUnlocked ? (
                FORMATS.map((f) => {
                  const r = player.ranks[f.id];
                  const band = rankForRating(r.rating);
                  return (
                    <div key={f.id} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                        <Chip style={{ color: band.color }}>{f.label}</Chip>
                        <span
                          style={{
                            fontFamily: "'Rajdhani', sans-serif",
                            fontWeight: 700,
                            fontSize: '1.35rem',
                            color: band.color,
                            textTransform: 'uppercase',
                            letterSpacing: '0.06em',
                          }}
                        >
                          {band.name.toUpperCase()}
                        </span>
                      </div>
                      <Tiny>{rankStatusText(r)}</Tiny>
                      <div style={{ margin: '8px 0' }}>
                        <RankBar format={f.id} rank={r} />
                      </div>
                      <Tiny>
                        {r.games} match{r.games === 1 ? '' : 'es'} · upgrade ceiling{' '}
                        <b style={{ color: 'var(--text)' }}>{maxRankedUpgradeFor(tierForRating(r.rating))}</b> levels per stat
                      </Tiny>
                      {ratingToNextBand(r.rating) === null && (
                        <Tiny style={{ display: 'block', marginTop: 4, color: band.color }}>
                          <I n="star" /> Top rank reached
                        </Tiny>
                      )}
                    </div>
                  );
                })
              ) : (
                <>
                  <div
                    style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontWeight: 700,
                      fontSize: '1.3rem',
                      color: 'var(--warn)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    <I n="lock" /> Locked
                  </div>
                  <Tiny>
                    Reach Level {RANKED_UNLOCK_LEVEL} to unlock ranked play, ranked stat upgrades and both
                    competitive ladders (1v1 &amp; 5v5).
                  </Tiny>
                </>
              )}
            </Panel>

            <Panel>
              <PanelTitle>Career</PanelTitle>
              <Row between>
                <Tiny style={{ color: 'var(--text)', letterSpacing: '0.14em' }}>
                  Level {player.level} → {player.level + 1}
                </Tiny>
                <Tiny>{Math.round(progressToNextLevel(player.level, player.xp) * 100)}%</Tiny>
              </Row>
              <Track h={10}>
                <Fill pct={progressToNextLevel(player.level, player.xp) * 100} color="var(--accent)" />
              </Track>
              <Tiny style={{ display: 'block', marginTop: 6 }}>
                {player.xp} XP banked · {rankLine}
              </Tiny>
              <Divider />
              <Row between>
                <div>
                  <Tiny>Favorite preset</Tiny>
                  <div
                    style={{
                      fontFamily: "'Rajdhani', sans-serif",
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    {active.name}
                  </div>
                </div>
                <Button onClick={() => props.onNavigate('build')}>Edit preset →</Button>
              </Row>
              <Divider />
              <Tiny style={{ display: 'block', marginBottom: 6 }}>
                Coins{' '}
                <b style={{ color: 'var(--warn)' }}>
                  <I n="coins" /> {player.coins}
                </b>
              </Tiny>
              <Tiny style={{ display: 'block' }}>
                Player ID: <code>{player.playerId}</code>
              </Tiny>
            </Panel>
          </TwoCol>
        </div>
      </MenuMain>
    </MenuShell>
  );
}
