import type { GearDefinition, PowerDefinition } from '../../../shared/src/types';
import { EFFECT_META } from '../../../shared/src/game-data/effects';
import {
  Button,
  ItemCard as GlassCard,
  ItemDesc,
  ItemFooter,
  ItemHead,
  ItemIcon,
  ItemName,
  OwnedBadge,
  Price,
  Tiny,
} from '../ui/glass';

const ICONS: Record<string, string> = {
  // powers
  flame_core: '🔥', stone_core: '🪨', gale_core: '💨',
  fire_bolt: '🔥', shield: '🛡', poison: '☠', berserk: '😤', slow: '🐌', heal: '💚',
  thunder_bolt: '⚡', fireball: '💥', rally: '📯', team_heal: '✨', vampiric_strike: '🩸',
  counter: '↩', regeneration: '💚', burning_soul: '🔥', thorns: '🌵', swift: '💨', vitality: '❤️',
  inferno: '🌋', iron_bulwark: '🛡', mass_renewal: '🌟', overclock: '⚙️',
  // gear
  iron_sword: '🗡', light_blade: '⚔', war_hammer: '🔨',
  leather_armor: '🧥', light_armor: '🛡', heavy_armor: '🪖',
  energy_core: '🔋', speed_module: '🏃', life_amulet: '📿', reactive_shield: '🔰',
};

export function itemIcon(item: PowerDefinition | GearDefinition): string {
  return ICONS[item.id] ?? (item.kind === 'power' ? '⚔' : '🎒');
}

export function itemStatsLine(item: PowerDefinition | GearDefinition): string {
  if (item.kind === 'gear') {
    const parts = Object.entries(item.stats)
      .map(([k, v]) => `${v! > 0 ? '+' : ''}${v} ${k.replace('maxHp', 'HP').replace('maxEnergy', 'Energy')}`)
      .filter(Boolean);
    if (item.bonusAbilityUses) parts.push(`+${item.bonusAbilityUses} use${item.bonusAbilityUses === 1 ? '' : 's'} to all actives`);
    const fx = (item.effects ?? []).map((e) => `+${EFFECT_META[e.kind].label} ${e.amount}`);
    return [...parts, ...fx].join(' · ');
  }
  const parts: string[] = [];
  if (item.powerKind === 'core' || item.powerKind === 'passive') {
    if (item.statBonus) {
      for (const [k, v] of Object.entries(item.statBonus)) {
        if (v) parts.push(`${v! > 0 ? '+' : ''}${v} ${k.replace('maxHp', 'HP').replace('maxEnergy', 'Energy')}`);
      }
    }
    for (const e of item.effects ?? []) parts.push(`${EFFECT_META[e.kind].label} ${e.amount}`);
  } else {
    if (item.baseDamage) parts.push(`${item.baseDamage}x dmg`);
    if (item.flatDamage) parts.push(`+${item.flatDamage}`);
    if (item.healAmount) parts.push(`+${item.healAmount} HP`);
    if (item.powerKind === 'ultimate') parts.push('charges per round / kill');
    else if (item.uses !== undefined) parts.push(`${item.uses} use${item.uses === 1 ? '' : 's'} per match`);
  }
  return parts.join(' · ');
}

export function ItemCard(props: {
  item: PowerDefinition | GearDefinition;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  badge?: string;
  selected?: boolean;
  onClick?: () => void;
}) {
  const { item, actionLabel, onAction, actionDisabled, badge, selected, onClick } = props;
  return (
    <GlassCard rarity={item.rarity} clickable={!!onClick} selected={selected} onClick={onClick}>
      <ItemHead>
        <ItemIcon>{itemIcon(item)}</ItemIcon>
        <div>
          <ItemName>{item.name}</ItemName>
          <Tiny>
            {item.kind === 'power' ? item.powerKind : item.slot} · {item.rarity}
          </Tiny>
        </div>
      </ItemHead>
      <ItemDesc>{item.description}</ItemDesc>
      <Tiny style={{ minHeight: 14 }}>{itemStatsLine(item)}</Tiny>
      <ItemFooter>
        {badge ? (
          <OwnedBadge>{badge}</OwnedBadge>
        ) : (
          <Price>{item.price} coins</Price>
        )}
        {actionLabel && onAction && (
          <Button
            variant="primary"
            disabled={actionDisabled}
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
          >
            {actionLabel}
          </Button>
        )}
      </ItemFooter>
    </GlassCard>
  );
}
