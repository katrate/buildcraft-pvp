import { usePlayer, getActivePreset, resetAll } from '../state/store';
import { progressToNextLevel, isRankedUnlocked, rankForRating, rankStatusText, maxRankedUpgradeFor } from '../../../shared/src/progression';
import { tierForRating, ratingToNextBand } from '../../../shared/src/rating';
import { RANKED_UNLOCK_LEVEL } from '../../../shared/src/constants';
import { StatBar } from '../components/StatBar';
import { RankBar } from '../components/RankBar';
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

const FORMATS: { id: '1v1' | '5v5'; label: string }[] = [
  { id: '1v1', label: '1v1' },
  { id: '5v5', label: '5v5' },
];

export function Profile(props: { onNavigate: (s: 'menu' | 'build') => void }) {
  const player = usePlayer();
  const active = getActivePreset();
  const rankedUnlocked = isRankedUnlocked(player.level);
  const rank = rankForRating(player.ranks['5v5'].rating);

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
        {/* Ranked status — both ladders */}
        <Panel>
          <PanelTitle>Ranked PvP</PanelTitle>
          {rankedUnlocked ? (
            <>
              <Tiny style={{ display: 'block', marginBottom: 8 }}>
                Two independent ladders — <b>1v1</b> and <b>5v5</b> — each with its own rank and its own
                stat-upgrade pool.
              </Tiny>
              {FORMATS.map((f) => {
                const r = player.ranks[f.id];
                const band = rankForRating(r.rating);
                return (
                  <div key={f.id} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                      <Chip style={{ color: band.color }}>{f.label}</Chip>
                      <span style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '1.5rem', color: band.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        {band.name.toUpperCase()}
                      </span>
                    </div>
                    <Tiny>{rankStatusText(r)}</Tiny>
                    <div style={{ margin: '8px 0' }}>
                      <RankBar format={f.id} rank={r} />
                    </div>
                    <Tiny style={{ display: 'block' }}>
                      {r.games} match{r.games === 1 ? '' : 'es'} · upgrade ceiling:{' '}
                      <b style={{ color: 'var(--text)' }}>{maxRankedUpgradeFor(tierForRating(r.rating))}</b> levels per stat
                    </Tiny>
                    {ratingToNextBand(r.rating) === null && (
                      <Tiny style={{ display: 'block', marginTop: 4, color: band.color }}>
                        ★ Top rank reached
                      </Tiny>
                    )}
                  </div>
                );
              })}
            </>
          ) : (
            <>
              <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '1.4rem', color: 'var(--warn)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                🔒 Locked
              </div>
              <Tiny style={{ display: 'block' }}>
                Reach Level {RANKED_UNLOCK_LEVEL} to unlock ranked play, ranked stat upgrades and both
                competitive ladders (1v1 &amp; 5v5).
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
