import { usePlayer, getActivePreset, resetAll } from '../state/store';
import { progressToNextLevel, isRankedUnlocked, rankForRating, rankStatusText, maxRankedUpgradeFor } from '../../../shared/src/progression';
import { tierForRating, ratingToNextBand } from '../../../shared/src/rating';
import { RANKED_UNLOCK_LEVEL } from '../../../shared/src/constants';
import { StatBar } from '../components/StatBar';
import { BackButton } from '../components/BackButton';
import { Button, Chip, Divider, Panel, PanelTitle, Row, Screen, Tiny } from '../ui/glass';

export function Profile(props: { onNavigate: (s: 'menu' | 'build') => void }) {
  const player = usePlayer();
  const active = getActivePreset();

  return (
    <Screen>
      <Row between>
        <h1 style={{ margin: 0 }}>Profile</h1>
        <BackButton onBack={() => props.onNavigate('menu')} />
      </Row>
      <Row wrap style={{ alignItems: 'stretch' }}>
        <Panel style={{ flex: 1, maxWidth: 460 }}>
          <PanelTitle>Pilot</PanelTitle>
          <h2>{player.name}</h2>
          <StatBar
            label={`Level ${player.level}`}
            value={progressToNextLevel(player.level, player.xp) * 100}
            max={100}
            color="var(--accent)"
            height={10}
          />
          <Tiny>
            {player.xp} / {Math.round(progressToNextLevel(player.level, player.xp) * 100)}% to level {player.level + 1} · Ranked unlocks at {RANKED_UNLOCK_LEVEL}
          </Tiny>
          <Divider />
          <Row wrap>
            <Chip tone="warn">🪙 {player.coins} coins</Chip>
          </Row>
          <Tiny style={{ display: 'block', marginTop: 8 }}>
            Player ID: <code>{player.playerId}</code>
          </Tiny>
        </Panel>

        <Panel style={{ flex: 1, maxWidth: 460 }}>
          <PanelTitle>Record</PanelTitle>
          <Row wrap gap={8}>
            <Chip tone="good">{player.record.wins} wins</Chip>
            <Chip tone="offline">{player.record.losses} losses</Chip>
            <Chip>{player.record.matches} matches</Chip>
          </Row>
          <Divider />
          <Row between>
            <div>
              <Tiny>Favorite preset</Tiny>
              <div style={{ fontWeight: 700 }}>{active.name}</div>
            </div>
            <Button onClick={() => props.onNavigate('build')}>Edit →</Button>
          </Row>
          <Divider />
          <div>
            <Tiny>Ranked PvP</Tiny>
            {isRankedUnlocked(player.level) ? (
              <>
                <div style={{ fontWeight: 700, color: rankForRating(player.rank.rating).color }}>
                  {rankForRating(player.rank.rating).name.toUpperCase()}
                </div>
                <Tiny>{rankStatusText(player.rank)}</Tiny>
                <Tiny style={{ display: 'block' }}>
                  Ranked matches: {player.rank.games} · Upgrade ceiling:{' '}
                  {maxRankedUpgradeFor(tierForRating(player.rank.rating))} levels per stat
                </Tiny>
                {ratingToNextBand(player.rank.rating) !== null && (
                  <Tiny style={{ display: 'block' }}>
                    {ratingToNextBand(player.rank.rating)! - player.rank.rating} RP to next rank
                  </Tiny>
                )}
              </>
            ) : (
              <div style={{ fontWeight: 700, color: 'var(--warn)' }}>LOCKED · reach Level {RANKED_UNLOCK_LEVEL}</div>
            )}
          </div>
        </Panel>
      </Row>

      <div style={{ marginTop: 20 }}>
        <Button
          variant="danger"
          style={{ background: 'transparent' }}
          onClick={() => {
            resetAll();
            props.onNavigate('menu');
          }}
        >
          Reset local progress (dev tool)
        </Button>
      </div>
    </Screen>
  );
}
