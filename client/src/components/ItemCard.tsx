import type { GearDefinition, PotionDefinition, PowerDefinition } from '../../../shared/src/types';
import { EFFECT_META } from '../../../shared/src/game-data/effects';
import { I, type IconName } from '../ui/icons';
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

// Material icons per item id (kept in sync with shared/src/game-data/*).
const ICONS: Record<string, IconName> = {
  // powers
  flame_core: 'fire', stone_core: 'cubeOutline', gale_core: 'weatherWindy',
  fire_bolt: 'fire', shield: 'shield', poison: 'skull', berserk: 'emoticonAngry', slow: 'snail', heal: 'heart',
  thunder_bolt: 'lightningBolt', fireball: 'meteor', rally: 'bullhorn', team_heal: 'heartMultiple', vampiric_strike: 'waterDrop',
  counter: 'reply', regeneration: 'heartPulse', burning_soul: 'fire', thorns: 'cactus', swift: 'weatherWindy', vitality: 'heart',
  inferno: 'volcano', iron_bulwark: 'shield', mass_renewal: 'star', overclock: 'cog',
  // gear
  iron_sword: 'sword', light_blade: 'swordCross', war_hammer: 'hammer',
  leather_armor: 'tshirtCrew', light_armor: 'shieldOutline', heavy_armor: 'shield',
  energy_core: 'battery', speed_module: 'run', life_amulet: 'necklace', reactive_shield: 'shieldRefresh',
  // potions
  minor_healing_potion: 'testTube', healing_potion: 'flaskRoundBottom', greater_healing_potion: 'bottleTonicPlus', elixir_of_life: 'bottleTonic',
  shield_potion: 'shieldPlus', rage_potion: 'chiliMild', stone_potion: 'cubeOutline', haste_potion: 'weatherWindy',
};

export function itemIcon(item: PowerDefinition | GearDefinition | PotionDefinition): IconName {
  if (item.kind === 'potion') return ICONS[item.id] ?? 'flaskRoundBottom';
  return ICONS[item.id] ?? (item.kind === 'power' ? 'swordCross' : 'backpack');
}

export function itemStatsLine(item: PowerDefinition | GearDefinition | PotionDefinition): string {
  if (item.kind === 'potion') {
    const parts: string[] = [];
    if (item.healAmount) parts.push(`+${item.healAmount} HP`);
    for (const e of item.effects ?? []) {
      parts.push(`${EFFECT_META[e.kind].label} ${e.amount}${e.duration > 0 ? ` ×${e.duration} turns` : ''}`);
    }
    if (item.ultimateCharge) parts.push(`+${item.ultimateCharge} ult charge`);
    parts.push(`${item.uses} use${item.uses === 1 ? '' : 's'} per match`);
    return parts.join(' · ');
  }
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
    if (item.attack) parts.push(`${item.attack} dmg + your Attack`);
    if (item.healAmount) parts.push(`+${item.healAmount} HP`);
    const dot = (item.effects ?? []).find((e) => e.kind === 'poison' || e.kind === 'burn');
    if (dot) parts.push(`${dot.amount} DoT × ${dot.duration}`);
    if (item.powerKind === 'ultimate') parts.push('charges per round / kill');
    else if (item.uses !== undefined) parts.push(`${item.uses} use${item.uses === 1 ? '' : 's'} per match`);
  }
  return parts.join(' · ');
}

export function ItemCard(props: {
  item: PowerDefinition | GearDefinition | PotionDefinition;
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
        <ItemIcon>
          <I n={itemIcon(item)} size={26} />
        </ItemIcon>
        <div>
          <ItemName>{item.name}</ItemName>
          <Tiny>
            {item.kind === 'power' ? item.powerKind : item.kind === 'gear' ? item.slot : 'potion'} · {item.rarity}
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
