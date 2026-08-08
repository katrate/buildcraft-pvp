import type { Combatant } from '../../../shared/src/types';
import { EFFECT_META } from '../../../shared/src/game-data/effects';
import { ULTIMATE_CHARGE_MAX } from '../../../shared/src/constants';
import { StatBar } from './StatBar';
import { I, type IconName } from '../ui/icons';
import { CbEffects, CbName, CombatantCard, FxBadge, Shape, UltPips, Pip } from '../ui/glass';

export function shapeVariant(c: Combatant): 'circle' | 'square' | 'triangle' | 'diamond' {
  // Bots/NPCs are squares/triangles/diamonds; player-controlled are circles.
  if (!c.isBot) return 'circle';
  const name = c.name.toLowerCase();
  if (name.includes('brute') || name.includes('warden')) return 'diamond';
  if (name.includes('raider')) return 'triangle';
  return 'square';
}

// Compact combatant tile for the no-scroll face-off arena. Shows the shape,
// name, HP bar, active effects (Iconify icons — they pop when they land and
// rest here until they expire), ability uses and ultimate charge.
export function CombatCard(props: {
  c: Combatant;
  isAlly?: boolean;
  isActing?: boolean;
  targetMode?: 'enemy' | 'ally' | null;
  onTarget?: (id: string) => void;
}) {
  const { c, isAlly = false, isActing, targetMode, onTarget } = props;
  const dead = !c.alive;
  const shape = shapeVariant(c);
  const hpColor = c.hp / c.maxHp > 0.5 ? 'var(--good)' : c.hp / c.maxHp > 0.25 ? 'var(--warn)' : 'var(--bad)';
  // Face-off arena: allies are cyan (near side), enemies red (far side).
  const teamColor = isAlly ? '#2dd4ff' : '#ff4655';


  return (
    <CombatantCard
      acting={isActing}
      dead={dead}
      targetable={targetMode === 'enemy'}
      allyTarget={targetMode === 'ally'}
      onClick={targetMode && !dead ? () => onTarget?.(c.id) : undefined}
    >
      <Shape variant={shape} color={dead ? '#3a4354' : teamColor} size={34}>
        <span>{dead ? <I n="close" /> : c.isBot ? '' : c.name[0]}</span>
      </Shape>
      <CbName>{c.name}</CbName>
      <StatBar label="HP" value={c.hp} max={c.maxHp} color={hpColor} height={6} />
      <CbEffects>
        {c.effects.map((e) => (
          <FxBadge key={e.uid}>
            <I n={(EFFECT_META[e.kind]?.icon ?? e.icon) as IconName} />
            {e.amount ? Math.round(e.amount) : ''}
          </FxBadge>
        ))}
        {c.ultimate && (
          <FxBadge ready={c.ultimate.charge >= ULTIMATE_CHARGE_MAX}>
            <I n="starFourPoints" /> {c.ultimate.charge}/{ULTIMATE_CHARGE_MAX}
          </FxBadge>
        )}
      </CbEffects>
      {c.ultimate && (
        <UltPips>
          {Array.from({ length: ULTIMATE_CHARGE_MAX }).map((_, i) => (
            <Pip key={i} on={i < c.ultimate!.charge} />
          ))}
        </UltPips>
      )}
    </CombatantCard>
  );
}
