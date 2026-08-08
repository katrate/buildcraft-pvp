import { useEffect, useState } from 'react';
import type { JSX } from 'react';
import styled from 'styled-components';
import { usePlayer } from '../state/store';
import { findMvp } from '../../../shared/src/engine/combat';
import { bandForRating, progressInBand, ratingToNextBand } from '../../../shared/src/rating';
import { progressToNextLevel, xpToNextLevel } from '../../../shared/src/progression';
import type { CombatStats, MatchMode, MatchRewards, PlayerResult, RankedFormat } from '../../../shared/src/types';
import { Button, Chip, Divider, Panel, Tiny } from '../ui/glass';
import { I } from '../ui/icons';

// ------------------------------------------------------------
// Post-match stats screen — shown after EVERY match (online and
// practice). Both team leaderboards (KDA, damage, healing, potions,
// ultimates), game + team MVP highlights, animated XP / RP bars,
// rewards breakdown, and exit / rematch actions.
// ------------------------------------------------------------

export interface MatchSummaryData {
  result: PlayerResult;
  winnerTeam: number;
  myTeam: number;
  mode: MatchMode;
  rewards: MatchRewards;
  rankDelta?: number;
  rankFormat?: RankedFormat;
  stats: CombatStats[];
  levelFrom: number;
  xpFrom: number;
  ratingFrom?: number; // rating BEFORE the match's delta was applied (ranked only)
}

// ------------------------------------------------------------
// Local primitives
// ------------------------------------------------------------

const Page = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 28px;
  max-width: 1080px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const Hero = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0 4px;
`;

const HeroTitle = styled.div<{ tone: string }>`
  font-family: 'Rajdhani', 'Segoe UI', system-ui, sans-serif;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  line-height: 0.95;
  font-size: clamp(2.4rem, 7vw, 4.2rem);
  color: ${(p) => p.tone};
  filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.55));
`;

const HeroSub = styled.div`
  font-family: 'Rajdhani', 'Segoe UI', system-ui, sans-serif;
  font-weight: 600;
  font-size: 0.78rem;
  letter-spacing: 0.3em;
  text-transform: uppercase;
  color: var(--text-dim);
`;

const RewardsRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const RewardChip = styled.div<{ color: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 1.25rem;
  letter-spacing: 0.04em;
  color: ${(p) => p.color};
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid ${(p) => p.color}44;
  border-radius: 4px;
  clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
  svg { font-size: 1.2rem; }
`;

const Breakdown = styled.div`
  text-align: center;
  color: var(--text-dim);
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  line-height: 1.5;
`;

const ProgressGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
  @media (max-width: 780px) { grid-template-columns: 1fr; }
`;

const Track = styled.div`
  height: 14px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.55);
`;

const FillBar = styled.div<{ w: number; color: string }>`
  width: ${(p) => p.w}%;
  height: 100%;
  background: ${(p) => p.color};
  border-radius: 2px;
  transition: width 1.15s cubic-bezier(0.22, 1, 0.36, 1);
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.25);
`;

const BarLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text);
`;

const SectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  .t {
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 0.8rem;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: var(--text);
    display: flex;
    align-items: center;
    gap: 8px;
    &::before {
      content: '';
      width: 18px;
      height: 3px;
      background: linear-gradient(90deg, var(--accent), var(--accent-2));
      transform: skewX(-20deg);
    }
  }
`;

const MvpBanner = styled.div<{ color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 18px;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 1.02rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${(p) => p.color};
  background: linear-gradient(150deg, ${(p) => p.color}1f, rgba(255, 255, 255, 0.02));
  border: 1px solid ${(p) => p.color}55;
  border-radius: 4px;
  clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px));
  svg { font-size: 1.4rem; }
  .det { color: var(--text-dim); font-weight: 600; font-size: 0.78rem; letter-spacing: 0.05em; }
`;

const LeaderGrid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
  align-items: start;
  @media (max-width: 880px) { grid-template-columns: 1fr; }
`;

const Table = styled.div`
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.025);
`;

const TableHead = styled.div<{ tone: string }>`
  display: grid;
  grid-template-columns: minmax(120px, 1.4fr) repeat(6, 46px);
  gap: 4px;
  align-items: center;
  padding: 8px 12px;
  font-family: 'Rajdhani', sans-serif;
  font-weight: 700;
  font-size: 0.62rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${(p) => p.tone};
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  min-width: 520px;
  span { text-align: right; }
  .p { text-align: left; }
`;

const ScoreRow = styled.div<{ hot: boolean; dead: boolean }>`
  display: grid;
  grid-template-columns: minmax(120px, 1.4fr) repeat(6, 46px);
  gap: 4px;
  align-items: center;
  padding: 9px 12px;
  font-size: 0.82rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  min-width: 520px;
  transition: background 0.15s ease;
  opacity: ${(p) => (p.dead ? 0.45 : 1)};
  ${(p) => p.hot && 'background: linear-gradient(90deg, rgba(199,167,109,0.14), transparent 70%);'}
  &:last-child { border-bottom: none; }
  &:hover { background: rgba(255, 255, 255, 0.035); }
  .n { text-align: right; color: var(--text-dim); font-variant-numeric: tabular-nums; }
  .kd { text-align: right; font-variant-numeric: tabular-nums; color: var(--text); }
  .kd b { color: var(--good); }
  .kd i { color: var(--bad); font-style: normal; }
`;

const PName = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  .nm {
    font-family: 'Rajdhani', sans-serif;
    font-weight: 700;
    font-size: 0.88rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .tag { font-size: 0.58rem; letter-spacing: 0.1em; color: var(--text-dim); border: 1px solid rgba(255,255,255,0.14); padding: 1px 5px; border-radius: 3px; }
  .you { color: var(--accent-2); border-color: rgba(111,165,173,0.5); }
  .mvp { color: var(--warn); border-color: rgba(199,167,109,0.6); }
`;

const Actions = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 6px 0 18px;
`;

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function useCountUp(target: number, dur = 900): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, dur]);
  return v;
}

function AnimatedFill({ from, to, color, delay = 60 }: { from: number; to: number; color: string; delay?: number }): JSX.Element {
  // The bar starts at the PRE-match progress and grows to the POST-match
  // progress — so the fill and the % text always agree. (Level-ups / band
  // changes pass from=0 so the bar simply fills the new bar.)
  const [w, setW] = useState(from);
  useEffect(() => {
    const id = setTimeout(() => setW(to), delay);
    return () => clearTimeout(id);
  }, [to, delay]);
  return <FillBar w={w} color={color} />;
}

const RESULT_TONE: Record<PlayerResult, string> = {
  victory: 'var(--good)',
  draw: 'var(--warn)',
  defeat: 'var(--bad)',
};

const RESULT_TEXT: Record<PlayerResult, string> = {
  victory: 'VICTORY',
  draw: 'DRAW',
  defeat: 'DEFEAT',
};

// ------------------------------------------------------------
// Screen
// ------------------------------------------------------------

export function MatchSummary(props: MatchSummaryData & { onExit: () => void; onRematch?: () => void }): JSX.Element {
  const player = usePlayer();
  // Defensive: a stale server (or a crashed engine) must never blank the whole
  // app. Default missing stats to an empty list and missing breakdown to null.
  const stats = props.stats ?? [];
  const rewards = props.rewards ?? {
    result: props.result,
    xp: 0,
    coins: 0,
    roundsSurvived: 0,
    breakdown: undefined,
  };

  const xpAni = useCountUp(rewards.xp);
  const coinAni = useCountUp(rewards.coins);
  const rpAni = useCountUp(Math.abs(props.rankDelta ?? 0));

  const mvp = findMvp(stats);
  const teamCounts = [0, 1].map((teamId) => stats.filter((s) => s.teamId === teamId).length);
  const teams = [0, 1].map((teamId) => stats.filter((s) => s.teamId === teamId).sort((a, b) => b.score - a.score));
  const teamMvp = teams.map((t) => (t.length ? t[0] : null));

  // XP progress (animated bar): fill grows from the pre-match position to the
  // post-match position — the bar and the % text below it always agree. When
  // the player leveled up the old bar was full, so start from 0 on the new bar.
  const leveledUp = player.level > props.levelFrom;
  const xpTo = progressToNextLevel(player.level, player.xp);
  const xpFrom = props.levelFrom === player.level ? progressToNextLevel(props.levelFrom, props.xpFrom) : 0;

  // Rank progress (ranked only).
  const rankRating =
    props.rankFormat && player.ranks && player.ranks[props.rankFormat]
      ? player.ranks[props.rankFormat].rating
      : 0;
  const rankBand = props.rankFormat && rankRating > 0 ? bandForRating(rankRating) : null;
  const ratingTo = rankRating;
  const rpTo = props.rankFormat ? progressInBand(ratingTo) : 0;
  // If the match promoted/demoted the player into a different band, the old
  // band's progress is meaningless — start the new band from 0.
  const rpFrom =
    !props.rankFormat || props.ratingFrom === undefined || !rankBand
      ? 0
      : bandForRating(props.ratingFrom).id === rankBand.id
        ? progressInBand(props.ratingFrom)
        : 0;

  const myStats = stats.find((s) => s.playerId === player.playerId);

  return (
    <Page>
      <Hero>
        <HeroTitle tone={RESULT_TONE[props.result]}>{RESULT_TEXT[props.result]}</HeroTitle>
        <HeroSub>
          {props.winnerTeam === -1 ? 'Arena draw' : props.winnerTeam === props.myTeam ? 'Your team wins' : 'Enemy team wins'} ·{' '}
          {props.mode.toUpperCase()} · {teamCounts[0]}v{teamCounts[1]} · Round {rewards.roundsSurvived + 1}
        </HeroSub>
      </Hero>

      <RewardsRow>
        <RewardChip color="var(--accent-2)">
          <I n="star" /> +{xpAni} XP
        </RewardChip>
        <RewardChip color="var(--warn)">
          <I n="coins" /> +{coinAni} coins
        </RewardChip>
        {props.rankDelta !== undefined && (
          <RewardChip color={props.rankDelta >= 0 ? 'var(--good)' : 'var(--bad)'}>
            <I n="trophy" /> {props.rankDelta >= 0 ? '+' : '−'}
            {rpAni} RP
          </RewardChip>
        )}
      </RewardsRow>
      {rewards.breakdown && rewards.coins + rewards.xp > 0 && (
        <Breakdown>
          Coins: {rewards.breakdown.baseCoins} base + {rewards.breakdown.killCoins} kills + {rewards.breakdown.roundCoins} rounds = +{rewards.coins} ·{' '}
          XP: {rewards.breakdown.baseXp} base + {rewards.breakdown.killXp} kills + {rewards.breakdown.roundXp} rounds = +{rewards.xp}
        </Breakdown>
      )}

      <ProgressGrid>
        <Panel style={{ gridColumn: props.rankFormat ? undefined : '1 / -1' }}>
          <BarLabel>
            <span>Level {leveledUp ? `${props.levelFrom} → ${player.level}` : props.levelFrom}</span>
            {leveledUp ? (
              <Chip tone="warn"><I n="starFourPoints" /> Level up!</Chip>
            ) : (
              <Tiny>+{rewards.xp} XP</Tiny>
            )}
          </BarLabel>
          <Track>
            <AnimatedFill from={xpFrom * 100} to={xpTo * 100} color="var(--accent-2)" />
          </Track>
          <BarLabel style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
            <span>{player.xp} / {xpToNextLevel(player.level)} XP</span>
            <span>{Math.round(xpTo * 100)}% · Lv {player.level + 1}</span>
          </BarLabel>
        </Panel>

        {rankBand && props.rankFormat && (
          <Panel>
            <BarLabel>
              <span style={{ color: rankBand.color }}>{rankBand.name}</span>
              {props.rankDelta !== undefined && props.rankDelta !== 0 && (
                <Tiny>{props.rankDelta > 0 ? '▲' : '▼'} {Math.abs(props.rankDelta)} RP</Tiny>
              )}
            </BarLabel>
            <Track>
              <AnimatedFill from={rpFrom * 100} to={rpTo * 100} color={rankBand.color} delay={220} />
            </Track>
            <BarLabel style={{ fontSize: '0.66rem', color: 'var(--text-dim)' }}>
              <span>{ratingTo} RP</span>
              <span>{Math.round(rpTo * 100)}% · {ratingToNextBand(ratingTo) === null ? 'MAX RANK' : 'NEXT RANK'}</span>
            </BarLabel>
          </Panel>
        )}
      </ProgressGrid>

      {mvp && (
        <MvpBanner color="var(--warn)">
          <I n="crown" />
          Game MVP — {mvp.name}
          <span className="det">
            {mvp.kills}/{mvp.deaths}/{mvp.assists} KDA · {mvp.damageDealt.toLocaleString()} dmg · {mvp.healingDone.toLocaleString()} heal
          </span>
        </MvpBanner>
      )}

      <LeaderGrid>
        {teams.map((teamRows, ti) => {
          const isMine = ti === props.myTeam;
          const top = teamMvp[ti];
          return (
            <div key={ti}>
              <SectionHead>
                <div className="t">{isMine ? 'Your team' : 'Enemy team'}</div>
                {top && (
                  <Chip tone={isMine ? 'default' : 'offline'}>
                    <I n="star" /> {isMine ? 'Team top' : 'Enemy top'}: {top.name}
                  </Chip>
                )}
              </SectionHead>
              <Table>
                <TableHead tone={isMine ? 'var(--accent-2)' : 'var(--bad)'}>
                  <span className="p">Player</span>
                  <span>K/D/A</span>
                  <span>DMG</span>
                  <span>TAKEN</span>
                  <span>HEAL</span>
                  <span>POTS</span>
                  <span>ULT</span>
                </TableHead>
                {teamRows.map((s) => {
                  const isMvp = mvp?.combatantId === s.combatantId;
                  const isTop = top?.combatantId === s.combatantId;
                  return (
                    <ScoreRow key={s.combatantId} hot={isMvp || isTop} dead={!s.alive}>
                      <PName>
                        <span className={`nm ${s.isBot ? '' : ''}`}>{s.name}</span>
                        {s.isBot && <span className="tag">BOT</span>}
                        {s.playerId === player.playerId && <span className="tag you">YOU</span>}
                        {isMvp && <span className="tag mvp"><I n="crown" /> MVP</span>}
                      </PName>
                      <span className="kd">
                        <b>{s.kills}</b>/<i>{s.deaths}</i>/{s.assists}
                      </span>
                      <span className="n">{s.damageDealt.toLocaleString()}</span>
                      <span className="n">{s.damageTaken.toLocaleString()}</span>
                      <span className="n">{s.healingDone.toLocaleString()}</span>
                      <span className="n">{s.potionsUsed}</span>
                      <span className="n">{s.ultimatesUsed}</span>
                    </ScoreRow>
                  );
                })}
              </Table>
            </div>
          );
        })}
      </LeaderGrid>

      {myStats && (
        <>
          <Divider />
          <Tiny style={{ textAlign: 'center' }}>
            {myStats.name}: {myStats.kills}/{myStats.deaths}/{myStats.assists} KDA — you dealt{' '}
            {myStats.damageDealt.toLocaleString()} damage, took {myStats.damageTaken.toLocaleString()}.
          </Tiny>
        </>
      )}

      <Actions>
        <Button variant="primary" size="lg" onClick={props.onExit}>
          <I n="arrowLeft" /> Back to Menu
        </Button>
        {props.onRematch && (
          <Button variant="ghost" size="lg" onClick={props.onRematch}>
            <I n="swordCross" /> Fight Again
          </Button>
        )}
      </Actions>
    </Page>
  );
}
