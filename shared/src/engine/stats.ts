import { BASE_STATS, INITIATIVE_UPGRADE, RANKED_UPGRADE } from '../constants';
import type { BuildStats, CombatBuild, CustomNorm, EffectSpec, MatchMode, PowerDefinition, Preset, RankedUpgrades, StatId } from '../types';
import { getGear } from '../game-data/gear';
import { getPower } from '../game-data/powers';
import { normalizeUnranked } from './normalize';
import { RANKS, maxRankedUpgradeFor } from '../progression';

// Custom-match normalization: each rank name maps to a RATING_BANDS tier,
// whose stat budget (maxRankedUpgradeFor) is applied to the normalized base.
export const CUSTOM_NORM_TIERS: Record<Exclude<CustomNorm, 'standard'>, number> = {
  bronze: 0,
  silver: 1,
  gold: 2,
  platinum: 3,
  diamond: 4,
};

// ------------------------------------------------------------
// Resolve a preset into combat stats + build info.
// ------------------------------------------------------------
export function computeStats(preset: Preset): CombatBuild {
  const stats: BuildStats = { ...BASE_STATS };
  const startingEffects: EffectSpec[] = [];
  let core: PowerDefinition | null = null;
  const actives: PowerDefinition[] = [];
  const passives: PowerDefinition[] = [];
  let ultimate: PowerDefinition | null = null;
  let bonusAbilityUses = 0;

  const applyStats = (add: Partial<BuildStats>) => {
    for (const [k, v] of Object.entries(add)) {
      stats[k as keyof BuildStats] += v ?? 0;
    }
  };

  for (const [slot, itemId] of Object.entries(preset.slots)) {
    if (!itemId) continue;
    const gear = getGear(itemId);
    if (gear) {
      applyStats(gear.stats);
      bonusAbilityUses += gear.bonusAbilityUses ?? 0;
      // Clone effect specs — never share references with the global data definitions
      if (gear.effects) startingEffects.push(...gear.effects.map((e) => ({ ...e })));
      continue;
    }
    const power = getPower(itemId);
    if (!power) continue;
    if (power.statBonus) applyStats(power.statBonus);
    if (power.powerKind === 'core') {
      core = power;
    } else if (power.powerKind === 'active') {
      actives.push(power);
    } else if (power.powerKind === 'passive') {
      passives.push(power);
      if (power.effects) startingEffects.push(...power.effects.map((e) => ({ ...e })));
    } else if (power.powerKind === 'ultimate') {
      ultimate = power;
    }
  }

  // Sanity floors.
  stats.maxHp = Math.max(1, Math.round(stats.maxHp));
  stats.attack = Math.max(1, stats.attack);
  stats.defense = Math.max(0, stats.defense);
  stats.initiative = Math.max(1, stats.initiative);

  return { stats, actives, passives, core, ultimate, startingEffects, bonusAbilityUses };
}

// ------------------------------------------------------------
// PvP builds. `initiativeUpgrade` (coin-bought) applies in unranked
// and ranked and is deliberately NOT normalized in unranked.
// `rankedUpgrades` apply ONLY in ranked matches.
// `customNorm` applies ONLY in custom matches: everyone is normalized
// to the unranked reference, then the chosen rank's stat budget is
// added — so a Bronze lobby and a Diamond lobby differ in power, but
// everyone inside one lobby is equal (no initiative upgrade in custom).
// ------------------------------------------------------------
export interface PvpExtras {
  initiativeUpgrade?: number;
  rankedUpgrades?: Partial<RankedUpgrades>;
  customNorm?: CustomNorm;
}

export function computePvpBuild(preset: Preset, mode: MatchMode, extras?: PvpExtras): CombatBuild {
  if (mode === 'ranked') {
    const build = computeStats(preset);
    const ru = extras?.rankedUpgrades ?? {};
    build.stats.maxHp += Math.round((ru.maxHp ?? 0) * (RANKED_UPGRADE.gains.maxHp ?? 0));
    build.stats.attack += (ru.attack ?? 0) * (RANKED_UPGRADE.gains.attack ?? 0);
    build.stats.defense += (ru.defense ?? 0) * (RANKED_UPGRADE.gains.defense ?? 0);
    build.stats.initiative += extras?.initiativeUpgrade ?? 0;
    build.stats.maxHp = Math.round(build.stats.maxHp);
    return build;
  }
  const build = computeStats(preset);
  build.stats = normalizeUnranked(build.stats);
  if (mode === 'custom' && extras?.customNorm && extras.customNorm !== 'standard') {
    const tier = CUSTOM_NORM_TIERS[extras.customNorm];
    const levels = maxRankedUpgradeFor(tier);
    build.stats.maxHp += Math.round(levels * (RANKED_UPGRADE.gains.maxHp ?? 0));
    build.stats.attack += levels * (RANKED_UPGRADE.gains.attack ?? 0);
    build.stats.defense += levels * (RANKED_UPGRADE.gains.defense ?? 0);
  } else if (mode !== 'custom') {
    // unranked: the coin-bought initiative upgrade is never normalized.
    build.stats.initiative += extras?.initiativeUpgrade ?? 0;
  }
  return build;
}

// ------------------------------------------------------------
// Ranked upgrade helpers
// ------------------------------------------------------------
export function rankedUpgradeCost(stat: StatId, currentLevel: number): number {
  return RANKED_UPGRADE.baseCost + currentLevel * RANKED_UPGRADE.costStep;
}

export function initiativeUpgradeCost(currentLevel: number): number {
  return INITIATIVE_UPGRADE.baseCost + currentLevel * INITIATIVE_UPGRADE.costStep;
}

// Max upgrade level a player's rank tier allows (per stat).
export function rankedUpgradeCeiling(tier: number): number {
  const rank = RANKS[Math.max(0, Math.min(RANKS.length - 1, tier))];
  return rank?.maxUpgradeLevel ?? 0;
}

export function totalRankedLevels(upgrades: Partial<RankedUpgrades>): number {
  return (upgrades.maxHp ?? 0) + (upgrades.attack ?? 0) + (upgrades.defense ?? 0);
}
