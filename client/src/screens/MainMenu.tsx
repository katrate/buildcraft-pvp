import { usePlayer, setDevUnlockRanked } from '../state/store';
import { useWsStatus } from '../services/ws';
import { isRankedUnlocked, progressToNextLevel } from '../../../shared/src/progression';
import { RANKED_UNLOCK_LEVEL } from '../../../shared/src/constants';
import { Button, Chip, DevZone, Fill, Logo, MenuButton, MenuGrid, MenuIcon, MenuScreen, MenuSub, Row, Track, Tiny } from '../ui/glass';

export type Screen =
  | 'menu'
  | 'play'
  | 'build'
  | 'inventory'
  | 'store'
  | 'profile'
  | 'combat-practice'
  | 'combat-online';

const ITEMS: { id: Screen; label: string; icon: string; sub: string }[] = [
  { id: 'play', label: 'Play', icon: '⚔', sub: 'Practice · PvP' },
  { id: 'build', label: 'Build', icon: '🛠', sub: 'Power Presets' },
  { id: 'inventory', label: 'Inventory', icon: '🎒', sub: 'Your collection' },
  { id: 'store', label: 'Store', icon: '🛒', sub: 'Powers & gear' },
  { id: 'profile', label: 'Profile', icon: '👤', sub: 'Stats & record' },
];

export function MainMenu(props: { onNavigate: (s: Screen) => void }) {
  const player = usePlayer();
  const status = useWsStatus();

  return (
    <MenuScreen>
      <Logo>
        BUILDCRAFT PVP
        <small>Build · Test · Fight · Earn · Experiment</small>
      </Logo>

      <Row gap={8}>
        <Chip>Lv {player.level}</Chip>
        <Chip tone="warn">🪙 {player.coins}</Chip>
        <Chip tone={status === 'connected' ? 'good' : status === 'connecting' ? 'warn' : 'offline'}>
          {status === 'connected' ? '● server online' : status === 'connecting' ? '○ connecting…' : '○ server offline'}
        </Chip>
      </Row>

      <MenuGrid>
        {ITEMS.map((item) => (
          <MenuButton key={item.id} onClick={() => props.onNavigate(item.id)}>
            <MenuIcon>{item.icon}</MenuIcon>
            {item.label}
            <MenuSub>{item.sub}</MenuSub>
          </MenuButton>
        ))}
      </MenuGrid>

      <div style={{ maxWidth: 460, width: '100%' }}>
        <Tiny style={{ marginBottom: 4, display: 'block' }}>
          Level {player.level} → {player.level + 1} · Ranked unlocks at level {RANKED_UNLOCK_LEVEL}
        </Tiny>
        <Track h={8}>
          <Fill pct={progressToNextLevel(player.level, player.xp) * 100} color="var(--accent)" />
        </Track>
      </div>

      <DevZone>
        <Tiny>Dev tools</Tiny>
        {!isRankedUnlocked(player.level) && (
          <Button variant="ghost" size="sm" onClick={setDevUnlockRanked} title="Instantly reach the ranked-unlock threshold">
            ⚡ Instantly Unlock Ranked (Level {RANKED_UNLOCK_LEVEL})
          </Button>
        )}
      </DevZone>
    </MenuScreen>
  );
}
