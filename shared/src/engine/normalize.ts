import { NORMALIZATION_BRACKETS, UNRANKED_REFERENCE_LEVEL } from '../constants';
import type { BuildStats, StatId } from '../types';

// ------------------------------------------------------------
// Unranked normalization.
//
// Raw build stats are re-based toward UNRANKED_REFERENCE_LEVEL.
// The relative SHAPE of the build is preserved (a glass cannon stays
// a glass cannon) but total power is bounded so grinding doesn't win.
//
// normalized = floor + (raw - floor) * (refLevel / 20), clamped to [floor, ceiling]
// ------------------------------------------------------------
export function normalizeUnranked(raw: BuildStats): BuildStats {
  const t = UNRANKED_REFERENCE_LEVEL / 20; // 0.5
  const out = {} as BuildStats;
  for (const stat of Object.keys(NORMALIZATION_BRACKETS) as StatId[]) {
    const { floor, ceiling } = NORMALIZATION_BRACKETS[stat];
    const value = floor + (raw[stat] - floor) * t;
    out[stat] = Math.round(Math.min(ceiling, Math.max(floor, value)));
  }
  return out;
}

// Initiative upgrade is added AFTER normalization — the coin-bought
// initiative is never normalized in unranked.
export function applyInitiativeUpgrade(normalized: BuildStats, upgradeLevel: number): BuildStats {
  return { ...normalized, initiative: normalized.initiative + upgradeLevel };
}
