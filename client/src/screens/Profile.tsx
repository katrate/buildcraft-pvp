import { usePlayer, getActivePreset, resetAll } from '../state/store';
import { progressToNextLevel, isRankedUnlocked, rankForRating, rankStatusText, maxRankedUpgradeFor } from '../../../shared/src/progression';
import { tierForRating, ratingToNextBand } from '../../../shared/src/rating';
import { RANKED_UNLOCK_LEVEL } from '../../../shared/src/constants';
import { StatBar } from '../components/StatBar';
import { BackButton } from '../components/BackButton';
import {
  Button,
  Chip,
  Divider,
  Kicker,
  Panel,
  PanelTitle,
  Row,
  Screen,
  ScreenHead,
  ScreenTitle,
  StatCard,
  StatCardRow,
  Tiny,
  TwoCol,
} from '../ui/glass';

export function Profile(props: { onNavigate: (s: 'menu' | 'build') => void }) {
  const player = usePlayer();
  const active = getActivePreset();
  const rankedUnlocked = isRankedUnlocked(player.level);
  const rank = rankForRating(player.rank.rating);

  return (
    <Screen>
      <ScreenHead>
        <div>
          <Kicker>Career & record</Kicker>
          <ScreenTitle>{player.name}</ScreenTitle>
        </div>
        <Row>
          <Chip tone="warn">🪙 {player.coins} coins</Chip>
          <BackButton onBack={() => props.onNavigate('menu')} />
        </Row>
      </ScreenHead>

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
          <b style={rankedUnlocked ? { color: rank.color } : { color: 'var(--text-dim)' }}>
            {rankedUnlocked ? rank.name.toUpperCase() : 'Locked'}
          </b>
        </StatCard>
      </StatCardRow>

      <TwoCol>
        {/* Ranked status */}
        <Panel>
          <PanelTitle>Ranked PvP</PanelTitle>
          {rankedUnlocked ? (
            <>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '1.6rem', color: rank.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {rank.name.toUpperCase()}
              </div>
              <Tiny>{rankStatusText(player.rank)}</Tiny>
              <Divider />
              <Tiny style={{ display: 'block' }}>
                Ranked matches: <b style={{ color: 'var(--text)' }}>{player.rank.games}</b> · Upgrade ceiling:{' '}
                <b style={{ color: 'var(--text)' }}>{maxRankedUpgradeFor(tierForRating(player.rank.rating))}</b> levels per stat
              </Tiny>
              {ratingToNextBand(player.rank.rating) !== null && (
                <Tiny style={{ display: 'block', marginTop: 6 }}>
                  <b style={{ color: 'var(--accent)' }}>{ratingToNextBand(player.rank.rating)! - player.rank.rating} RP</b> to next rank
                </Tiny>
              )}
            </>
          ) : (
            <>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '1.4rem', color: 'var(--warn)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                🔒 Locked
              </div>
              <Tiny style={{ display: 'block' }}>
                Reach Level {RANKED_UNLOCK_LEVEL} to unlock ranked play, ranked stat upgrades and the
                competitive ladder.
              </Tiny>
            </>
          )}
        </Panel>

        {/* Level + preset */}
        <Panel>
          <PanelTitle>Level Progress</PanelTitle>
          <StatBar
            label={`Level ${player.level}`}
            value={progressToNextLevel(player.level, player.xp) * 100}
            max={100}
            color="var(--accent)"
            height={10}
          />
          <Tiny>
            {player.xp} XP banked · {Math.round(progressToNextLevel(player.level, player.xp) * 100)}% to level {player.level + 1} — ranked
            unlocks at {RANKED_UNLOCK_LEVEL}, levels climb forever.
          </Tiny>
          <Divider />
          <Row between>
            <div>
              <Tiny>Favorite preset</Tiny>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '1.05rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {active.name}
              </div>
            </div>
            <Button onClick={() => props.onNavigate('build')}>Edit →</Button>
          </Row>
          <Divider />
          <Tiny style={{ display: 'block' }}>
            Player ID: <code>{player.playerId}</code>
          </Tiny>
        </Panel>
      </TwoCol>

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
