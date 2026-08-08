import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { MatchState, PlayerAction, PowerDefinition } from '../../../shared/src/types';
import { computeDamage, effectiveDefense, getTurnActions } from '../../../shared/src/engine/combat';
import { CombatCard } from './CombatCard';
import {
  AbilityBar,
  AbilityButton,
  AbMeta,
  AbName,
  Arena,
  ArenaTop,
  Battlefield,
  Button,
  Chip,
  LogBox,
  LogLine,
  Muted,
  Row,
  TeamCol,
  TeamHead,
  Tiny,
} from '../ui/glass';

type Pending =
  | { type: 'USE_ABILITY'; powerId: string; rule: string }
  | { type: 'BASIC_ATTACK' };

interface Props {
  state: MatchState;
  myCombatantId: string;
  canAct: boolean;
  disabled?: boolean;
  onAction: (action: PlayerAction) => void;
  headerRight?: ReactNode;
  footer?: ReactNode;
}

export function CombatArena({ state, myCombatantId, canAct, disabled, onAction, headerRight, footer }: Props) {
  const [pending, setPending] = useState<Pending | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const myCombatant = state.combatants[myCombatantId];
  const myTurn = canAct && myCombatant?.alive;

  const actions = useMemo(
    () => (myCombatant ? getTurnActions(state, myCombatant.id) : []),
    [state, myCombatantId, myCombatant?.id, state.round, state.phase],
  );

  // Face-to-face: the enemy team is always the far side (top); my team is the
  // near side (bottom). Single source of truth for "which team is mine".
  const myTeamId = myCombatant?.teamId ?? 0;

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [state.logSeq]);

  const teams = useMemo(() => {
    const t: { teamId: number; members: string[] }[] = [];
    for (let i = 0; i < state.teamCount; i += 1) {
      t.push({
        teamId: i,
        members: Object.values(state.combatants)
          .filter((c) => c.teamId === i)
          .sort((a, b) => a.id.localeCompare(b.id))
          .map((c) => c.id),
      });
    }
    // Face-to-face: enemy team(s) on the far side (top), your team on the
    // near side (bottom). My team is always rendered last.
    return [...t].sort((a, b) => (a.teamId === myTeamId ? 1 : 0) - (b.teamId === myTeamId ? 1 : 0));
  }, [state.combatants, state.teamCount, myTeamId]);

  const current = state.currentCombatantId ? state.combatants[state.currentCombatantId] : null;

  // Rough damage preview for a power, computed against the weakest living enemy.
  function estimateDmg(power: PowerDefinition): number | null {
    if (!myCombatant) return null;
    if (!power.attack) return null;
    const enemies = Object.values(state.combatants).filter((c) => c.alive && c.teamId !== myCombatant.teamId);
    if (enemies.length === 0) return null;
    const weakest = enemies.reduce((a, b) => (effectiveDefense(a) <= effectiveDefense(b) ? a : b));
    return computeDamage(myCombatant, weakest, power);
  }

  function fireAbility(power: PowerDefinition): void {
    if (pending?.type === 'USE_ABILITY' && pending.powerId === power.id) {
      setPending(null);
      return;
    }
    if (power.targetRule === 'self' || power.targetRule === 'all-enemies' || power.targetRule === 'all-allies' || power.targetRule === 'none') {
      onAction({ type: 'USE_ABILITY', powerId: power.id });
      setPending(null);
      return;
    }
    setPending({ type: 'USE_ABILITY', powerId: power.id, rule: power.targetRule });
  }

  function targetModeFor(teamId: number): 'enemy' | 'ally' | null {
    if (!pending || !myTurn) return null;
    if (!myCombatant) return null;
    if (pending.type === 'BASIC_ATTACK') return teamId === myCombatant.teamId ? null : 'enemy';
    return pending.rule === 'enemy' ? (teamId === myCombatant.teamId ? null : 'enemy') : pending.rule === 'ally' ? (teamId === myCombatant.teamId ? 'ally' : null) : null;
  }

  function pickTarget(targetId: string): void {
    if (!pending) return;
    if (pending.type === 'BASIC_ATTACK') {
      onAction({ type: 'BASIC_ATTACK', targetId });
    } else {
      onAction({ type: 'USE_ABILITY', powerId: pending.powerId, targetId });
    }
    setPending(null);
  }

  const logLines = state.log.slice(-45);

  return (
    <Arena>
      <ArenaTop>
        <Row gap={8}>
          <Chip tone="warn">Round {state.round}</Chip>
          <Chip>
            {current ? (
              <>
                Turn: {current.name}
                {myTurn && ' — YOUR TURN'}
              </>
            ) : (
              '—'
            )}
          </Chip>
        </Row>
        {headerRight}
      </ArenaTop>

      <Battlefield>
        {teams.map((team) => {
          const isMine = team.teamId === myTeamId;
          return (
            <TeamCol key={team.teamId} facing={isMine ? 'bottom' : 'top'}>
              <TeamHead tone={isMine ? 'ally' : 'enemy'}>
                {isMine ? 'YOUR TEAM' : 'ENEMY TEAM'}
              </TeamHead>
              {team.members.map((cid) => {
                const c = state.combatants[cid];
                const targetMode = targetModeFor(team.teamId);
                return (
                  <CombatCard
                    key={cid}
                    c={c}
                    isAlly={isMine}
                    isActing={state.currentCombatantId === cid}
                    targetMode={targetMode}
                    onTarget={pickTarget}
                  />
                );
              })}
            </TeamCol>
          );
        })}
      </Battlefield>

      <AbilityBar>
        {myCombatant && (
          <>
            <AbilityButton
              selected={pending?.type === 'BASIC_ATTACK'}
              disabled={!myTurn || !!disabled}
              onClick={() =>
                pending?.type === 'BASIC_ATTACK'
                  ? setPending(null)
                  : setPending({ type: 'BASIC_ATTACK' })
              }
            >
              <AbName>⚔ Basic Attack</AbName>
              <AbMeta>always available · choose a target</AbMeta>
            </AbilityButton>
            {actions.map((a) => {
              const dmg = estimateDmg(a.power);
              const meta = a.isUltimate
                ? `ULTIMATE · ${a.reason}`
                : a.usable
                  ? `${dmg ? `≈${dmg} dmg · ` : ''}${a.maxUses > 0 ? `${a.usesLeft} use${a.usesLeft === 1 ? '' : 's'} left` : 'free'}`
                  : a.reason;
              return (
                <AbilityButton
                  key={a.power.id}
                  ultimate={a.isUltimate}
                  selected={pending?.type === 'USE_ABILITY' && pending.powerId === a.power.id}
                  disabled={!myTurn || !!disabled || !a.usable}
                  onClick={() => fireAbility(a.power)}
                  title={a.power.description}
                >
                  <AbName>{a.power.name}</AbName>
                  <AbMeta ready={!!(a.isUltimate && a.usable)}>{meta}</AbMeta>
                </AbilityButton>
              );
            })}
            <Button
              variant="ghost"
              disabled={!myTurn || !!disabled}
              onClick={() => {
                setPending(null);
                onAction({ type: 'END_TURN' });
              }}
            >
              End Turn ▶
            </Button>
          </>
        )}
      </AbilityBar>

      {myTurn && pending && (
        <Tiny style={{ padding: '0 0 6px' }}>
          {pending.type === 'BASIC_ATTACK'
            ? 'Select an enemy to attack…'
            : 'Select a target (or click the ability again to cancel)…'}
        </Tiny>
      )}

      {footer}

      <LogBox ref={logRef}>
        {logLines.length === 0 && <Muted>Combat log is empty…</Muted>}
        {logLines.map((l) => (
          <LogLine
            key={l.seq}
            round={l.text.startsWith('— Round')}
            damage={l.text.includes('takes') || l.text.includes('eliminated')}
          >
            <Muted>R{l.round}</Muted> {l.text}
          </LogLine>
        ))}
      </LogBox>
    </Arena>
  );
}
