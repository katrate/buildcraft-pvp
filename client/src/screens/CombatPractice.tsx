import { useEffect, useMemo, useRef, useState } from 'react';
import { usePlayer } from '../state/store';
import { CombatArena } from '../components/CombatArena';
import { MatchSummary, type MatchSummaryData } from './MatchSummary';
import { createPracticeMatch, playerCombatantInput } from '../../../shared/src/engine/practice';
import {
  applyAction,
  collectCombatStats,
  getCurrentCombatant,
  isMyTurn,
  roundsSurvived,
} from '../../../shared/src/engine/combat';
import { chooseBotAction } from '../../../shared/src/engine/ai';
import { computeRewards } from '../../../shared/src/rewards';
import { BOT_THINK_MS } from '../../../shared/src/constants';
import type { MatchState } from '../../../shared/src/types';
import { Button, Chip, FlexFill, Muted, Row } from '../ui/glass';
import { I } from '../ui/icons';

export function CombatPractice(props: { onExit: () => void }) {
  const player = usePlayer();
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<MatchState | null>(null);
  const [summaryData, setSummaryData] = useState<MatchSummaryData | null>(null);
  const appliedRef = useRef(false);

  const myCombatantId = useMemo(() => `p_${player.playerId}`, [player.playerId]);

  // Create the match once per entry / retry
  useEffect(() => {
    const match = createPracticeMatch(
      `practice_${Date.now()}_${nonce}`,
      playerCombatantInput({
        playerId: player.playerId,
        name: player.name,
        preset: player.presets.find((p) => p.id === player.activePresetId) ?? player.presets[0],
      }),
    );
    appliedRef.current = false;
    setSummaryData(null);
    setState(match);
  }, [nonce]);

  // Drive bot turns
  useEffect(() => {
    if (!state || state.phase === 'MATCH_END') return;
    const current = getCurrentCombatant(state);
    if (!current || !current.isBot || !isMyTurn(state, current.id)) return;
    const timer = setTimeout(() => {
      setState((prev) => {
        if (!prev || prev.phase === 'MATCH_END') return prev;
        const cur = getCurrentCombatant(prev);
        if (!cur || !cur.isBot || !isMyTurn(prev, cur.id)) return prev;
        // engine mutates in place — spread so React re-renders
        return { ...applyAction(prev, chooseBotAction(prev, cur.id)) };
      });
    }, BOT_THINK_MS);
    return () => clearTimeout(timer);
  }, [state]);

  // Hand off to the stats screen once when the match ends. Practice is a pure
  // training sandbox: NO coins, NO XP, NO rank, NO record changes — nothing is
  // granted (computeRewards('practice') returns zeros, and we never call
  // grantRewards, so an NPC farm can never inflate the economy or progression).
  useEffect(() => {
    if (!state || state.phase !== 'MATCH_END' || appliedRef.current) return;
    appliedRef.current = true;
    const myCombatant = state.combatants[myCombatantId];
    const rewards = computeRewards(state.winnerTeam === 0 ? 'victory' : state.winnerTeam === -1 ? 'draw' : 'defeat', 'practice', {
      roundsSurvived: roundsSurvived(state),
      kills: myCombatant?.kills ?? 0,
    });
    setSummaryData({
      result: rewards.result,
      winnerTeam: state.winnerTeam ?? -1,
      myTeam: 0,
      mode: 'practice',
      rewards,
      stats: collectCombatStats(state),
      levelFrom: player.level,
      xpFrom: player.xp,
    });
  }, [state, myCombatantId]);

  if (summaryData) {
    return (
      <MatchSummary
        {...summaryData}
        onExit={props.onExit}
        onRematch={() => {
          setSummaryData(null);
          setState(null); // show "Preparing the arena…" until the new match is built
          setNonce((n) => n + 1);
        }}
      />
    );
  }

  if (!state) {
    return (
      <FlexFill>
        <Muted style={{ padding: 24 }}>Preparing the arena…</Muted>
      </FlexFill>
    );
  }

  const npc = Object.values(state.combatants).find((c) => c.isBot);

  return (
    <FlexFill>
      <CombatArena
        state={state}
        myCombatantId={myCombatantId}
        canAct={state.phase !== 'MATCH_END'}
        onAction={(action) =>
          setState((prev) => (prev ? { ...applyAction(prev, action) } : prev))
        }
        headerRight={
          <Row gap={8}>
            <Chip tone="good">Practice — 1v1</Chip>
            <Chip>vs {npc?.name ?? 'NPC'}</Chip>
            <Button variant="ghost" onClick={props.onExit}>
              <I n="close" /> Leave
            </Button>
          </Row>
        }
      />
    </FlexFill>
  );
}
