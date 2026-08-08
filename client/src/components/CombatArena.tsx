import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { EffectKind, MatchState, PlayerAction, PowerDefinition } from '../../../shared/src/types';
import { computeDamage, effectiveDefense, getTurnActions, getTurnPotions } from '../../../shared/src/engine/combat';
import { EFFECT_META } from '../../../shared/src/game-data/effects';
import { CombatCard } from './CombatCard';
import { I, type IconName } from '../ui/icons';
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
  FloatPopup,
  PotionBar,
  PotionButton,
  Row,
  TeamCol,
  TeamHead,
  TileWrap,
  Tiny,
} from '../ui/glass';

type Pending =
  | { type: 'USE_ABILITY'; powerId: string; rule: string }
  | { type: 'BASIC_ATTACK' };

// A transient floating indicator over a combatant tile — damage numbers,
// heals, effect icons, ultimate blasts, deaths. Rises and fades away.
interface Popup {
  id: number;
  combatantId: string;
  kind: 'dmg' | 'heal' | 'shield' | 'fx' | 'death' | 'ult';
  icon?: string;
  text?: string;
  color: string;
}

// Independent snapshot of the diff-relevant combatant fields. Practice mode
// mutates the live match state IN PLACE, so the arena must never keep the
// state object itself as its "previous" baseline — an in-place mutation would
// rewrite it. A fresh snapshot map keeps prev vs current truly comparable.
interface CombatSnap {
  hp: number;
  alive: boolean;
  ultCharge: number;
  effects: { uid: string; kind: EffectKind; amount: number }[];
}

function snapCombatants(state: MatchState): Record<string, CombatSnap> {
  const m: Record<string, CombatSnap> = {};
  for (const c of Object.values(state.combatants)) {
    m[c.id] = {
      hp: c.hp,
      alive: c.alive,
      ultCharge: c.ultimate?.charge ?? 0,
      effects: c.effects.map((e) => ({ uid: e.uid, kind: e.kind, amount: e.amount })),
    };
  }
  return m;
}

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
  const [popups, setPopups] = useState<Popup[]>([]);
  const popId = useRef(0);
  const prevSnap = useRef<Record<string, CombatSnap> | null>(null);
  const removeTimers = useRef<number[]>([]);
  useEffect(() => () => {
    for (const t of removeTimers.current) window.clearTimeout(t);
    removeTimers.current = [];
  }, []);
  const myCombatant = state.combatants[myCombatantId];
  const myTurn = canAct && myCombatant?.alive;

  const actions = useMemo(
    () => (myCombatant ? getTurnActions(state, myCombatant.id) : []),
    [state, myCombatantId, myCombatant?.id, state.round, state.phase],
  );
  const potions = useMemo(
    () => (myCombatant ? getTurnPotions(state, myCombatant.id) : []),
    [state, myCombatantId, myCombatant?.id, state.round, state.phase],
  );

  // Face-off: the enemy team is always the far side (top); my team is the
  // near side (bottom). Single source of truth for "which team is mine".
  const myTeamId = myCombatant?.teamId ?? 0;

  // Diff the new state against the previous one and spawn floating indicators
  // for every combatant: HP loss -> damage, HP gain -> heal, new effect uid ->
  // effect icon pop, shield absorb -> shield number, charge loss -> ultimate.
  // The resting effect icons themselves live on the tile (state.effects).
  useEffect(() => {
    const prev = prevSnap.current;
    prevSnap.current = snapCombatants(state);
    if (!prev) return;
    const fresh: Omit<Popup, 'id'>[] = [];
    for (const c of Object.values(state.combatants)) {
      const p = prev[c.id];
      if (!p) continue;
      if (p.alive && !c.alive) fresh.push({ kind: 'death', combatantId: c.id, icon: 'skull', color: '#c78b95' });
      const hp = p.hp - c.hp;
      if (hp > 0) fresh.push({ kind: 'dmg', combatantId: c.id, text: `-${hp}`, color: '#ff8a94' });
      else if (hp < 0) fresh.push({ kind: 'heal', combatantId: c.id, text: `+${-hp}`, color: '#82d3a4' });
      const oldFx = new Set(p.effects.map((e) => e.uid));
      for (const e of c.effects) {
        if (!oldFx.has(e.uid)) {
          fresh.push({
            kind: 'fx',
            combatantId: c.id,
            icon: EFFECT_META[e.kind]?.icon ?? e.icon,
            text: e.displayName,
            color: '#c9b8e8',
          });
        }
      }
      const shieldOf = (list: { kind: EffectKind; amount: number }[]) =>
        list.filter((e) => e.kind === 'shield').reduce((s, e) => s + e.amount, 0);
      const absorbed = shieldOf(p.effects) - shieldOf(c.effects);
      if (absorbed > 0) fresh.push({ kind: 'shield', combatantId: c.id, text: `-${absorbed}`, color: '#6fa5ad' });
      if (p.ultCharge > (c.ultimate?.charge ?? 0)) {
        fresh.push({ kind: 'ult', combatantId: c.id, icon: 'starFourPoints', text: 'ULTIMATE', color: '#c9b8e8' });
      }
    }
    if (fresh.length === 0) return;
    const items = fresh.map((f) => ({ ...f, id: ++popId.current }));
    setPopups((list) => [...list, ...items].slice(-80));
    for (const it of items) {
      const t = window.setTimeout(() => setPopups((list) => list.filter((x) => x.id !== it.id)), 1500);
      removeTimers.current.push(t);
    }
  }, [state]);

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
    // Face-off: enemy team(s) on the far side (top), your team on the
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

  const popupsFor = (cid: string) => popups.filter((p) => p.combatantId === cid);

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
                const tilePopups = popupsFor(cid);
                return (
                  <TileWrap key={cid}>
                    <CombatCard
                      c={c}
                      isAlly={isMine}
                      isActing={state.currentCombatantId === cid}
                      targetMode={targetMode}
                      onTarget={pickTarget}
                    />
                    {tilePopups.map((p, i) => (
                      <FloatPopup key={p.id} color={p.color} style={{ top: 2 + (i % 3) * 18 }}>
                        {p.icon && <I n={p.icon as IconName} />}
                        {p.text ?? ''}
                      </FloatPopup>
                    ))}
                  </TileWrap>
                );
              })}
            </TeamCol>
          );
        })}
      </Battlefield>

      {/* Potion bag — FREE actions: one per turn, only before you act */}
      <PotionBar>
        {potions.length > 0 ? (
          potions.map(({ potion: p, usesLeft: left, usable }) => (
            <PotionButton
              key={p.id}
              disabled={!myTurn || !!disabled || !usable}
              title={`${p.description} · FREE action — one per turn, before you act`}
              onClick={() => onAction({ type: 'USE_POTION', potionId: p.id })}
            >
              <AbName>
                <I n="flaskRoundBottom" /> {p.name}
              </AbName>
              <AbMeta>
                {usable
                  ? `${left} use${left === 1 ? '' : 's'} left · free action`
                  : left <= 0
                    ? 'Out of potions'
                    : 'Potion used this turn'}
              </AbMeta>
            </PotionButton>
          ))
        ) : myCombatant ? (
          <Tiny style={{ padding: '10px 0' }}>
            No potions in your bag — equip them in the Build Editor (free action, once per turn).
          </Tiny>
        ) : null}
      </PotionBar>

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
              <AbName>
                <I n="swordCross" /> Basic Attack
              </AbName>
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
              End Turn <I n="play" />
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
    </Arena>
  );
}
