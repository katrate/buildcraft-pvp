import type { Combatant } from '../../../shared/src/types';
import { EFFECT_META } from '../../../shared/src/game-data/effects';
import { maxUsesFor } from '../../../shared/src/engine/combat';
import { ULTIMATE_CHARGE_MAX } from '../../../shared/src/constants';
import { StatBar } from './StatBar';
import { CbEffects, CbInfo, CbName, CbSide, CombatantCard, FxBadge, Pip, Shape, UltPips } from '../ui/glass';

export function shapeVariant(c: Combatant): 'circle' | 'square' | 'triangle' | 'diamond' {
  // Bots/NPCs are squares/triangles/diamonds; player-controlled are circles.
  if (!c.isBot) return 'circle';
  const name = c.name.toLowerCase();
  if (name.includes('brute') || name.includes('warden')) return 'diamond';
  if (name.includes('raider')) return 'triangle';
  return 'square';
}

export function CombatCard(props: {
  c: Combatant;
  isActing?: boolean;
  targetMode?: 'enemy' | 'ally' | null;
  onTarget?: (id: string) => void;
}) {
  const { c, isActing, targetMode, onTarget } = props;
  const dead = !c.alive;
  const shape = shapeVariant(c);
  const hpColor = c.hp / c.maxHp > 0.5 ? 'var(--good)' : c.hp / c.maxHp > 0.25 ? 'var(--warn)' : 'var(--bad)';
  const teamColor = c.teamId === 0 ? '#4dd0e1' : '#ff9f43';

  const totalUsesLeft = Object.values(c.usesLeft).reduce((a, b) => a + b, 0);
  const totalUsesMax = (c.build?.actives ?? []).reduce((a, p) => a + maxUsesFor(p, c.build!), 0);

  return (
    <CombatantCard
      acting={isActing}
      dead={dead}
      targetable={targetMode === 'enemy'}
      allyTarget={targetMode === 'ally'}
      onClick={targetMode && !dead ? () => onTarget?.(c.id) : undefined}
      title={dead ? `${c.name} — eliminated` : c.name}
    >
      <Shape variant={shape} color={dead ? '#3a4354' : teamColor}>
        <span>{dead ? '✕' : c.isBot ? '' : c.name[0]}</span>
      </Shape>
      <CbInfo>
        <CbName>{c.name}</CbName>
        <CbEffects>
          {c.effects.map((e) => (
            <FxBadge
              key={e.uid}
              title={`${e.displayName}${e.duration > 0 ? ` (${e.duration} turns)` : ''}${e.amount ? ` — ${e.amount}` : ''}`}
            >
              {e.icon}
              {e.amount ? Math.round(e.amount) : ''}
            </FxBadge>
          ))}
          {totalUsesMax > 0 && !dead && (
            <FxBadge title="Ability uses remaining this match">
              🔁 {totalUsesLeft}/{totalUsesMax}
            </FxBadge>
          )}
          {c.ultimate && (
            <FxBadge ready={c.ultimate.charge >= ULTIMATE_CHARGE_MAX} title="Ultimate charge">
              ✦ {c.ultimate.charge}/{ULTIMATE_CHARGE_MAX}
            </FxBadge>
          )}
        </CbEffects>
      </CbInfo>
      <CbSide>
        <StatBar label="HP" value={c.hp} max={c.maxHp} color={hpColor} height={8} />
        {c.ultimate && (
          <UltPips title="Ultimate charge (fills each round and on kills)">
            {Array.from({ length: ULTIMATE_CHARGE_MAX }).map((_, i) => (
              <Pip key={i} on={i < c.ultimate!.charge} />
            ))}
          </UltPips>
        )}
      </CbSide>
    </CombatantCard>
  );
}
