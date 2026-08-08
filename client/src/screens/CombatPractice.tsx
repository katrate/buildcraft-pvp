import { useEffect, useMemo, useRef, useState } from 'react';
import { usePlayer, grantRewards } from '../state/store';
import { CombatArena } from '../components/CombatArena';
import { createPracticeMatch, playerCombatantInput } from '../../../shared/src/engine/practice';
import { applyAction, getCurrentCombatant, isMyTurn, roundsSurvived } from '../../../shared/src/engine/combat';
import { chooseBotAction } from '../../../shared/src/engine/ai';
import { computeRewards } from '../../../shared/src/rewards';
import { BOT_THINK_MS } from '../../../shared/src/constants';
import type { MatchRewards, MatchState } from '../../../shared/src/types';
import { Button, Chip, FlexFill, Muted, Overlay, OverlayCard, Row } from '../ui/glass';
import { I } from '../ui/icons';

export function CombatPractice(props: { onExit: () => void }) {
  const player = usePlayer();
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<MatchState | null>(null);
  const [result, setResult] = useState<MatchRewards | null>(null);
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
    setResult(null);
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

  // Apply rewards once when the match ends
  useEffect(() => {
    if (!state || state.phase !== 'MATCH_END' || appliedRef.current) return;
    appliedRef.current = true;
    const myCombatant = state.combatants[myCombatantId];
    const rewards = computeRewards(state.winnerTeam === 0 ? 'victory' : state.winnerTeam === -1 ? 'draw' : 'defeat', 'practice', {
      roundsSurvived: roundsSurvived(state),
      kills: myCombatant?.kills ?? 0,
    });
    // Practice is a solo sandbox — it pays coins/XP but does NOT touch the
    // PvP win/loss record (an NPC farm must never inflate your profile).
    grantRewards(rewards);
    setResult(rewards);
  }, [state, myCombatantId]);

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

      {result && (
        <Overlay>
          <OverlayCard>
            <h2 style={{ color: result.result === 'victory' ? 'var(--good)' : result.result === 'draw' ? 'var(--warn)' : 'var(--bad)' }}>
              {result.result === 'victory' ? 'VICTORY!' : result.result === 'draw' ? 'DRAW' : 'DEFEAT'}
            </h2>
            <Row center gap={16}>
              <Chip tone="good">+{result.xp} XP</Chip>
              <Chip tone="warn">+{result.coins} coins</Chip>
            </Row>
            <Button variant="primary" size="lg" onClick={() => setNonce((n) => n + 1)}>
              Fight Again
            </Button>
            <Button variant="ghost" onClick={props.onExit}>
              Back to Menu
            </Button>
          </OverlayCard>
        </Overlay>
      )}
    </FlexFill>
  );
}
