import { GEAR } from '../../shared/src/game-data/gear';
import { POWERS } from '../../shared/src/game-data/powers';
import { SLOTS } from '../../shared/src/constants';
import type { Preset, SlotId } from '../../shared/src/types';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// Validate a preset before it is used to build combatants.
// The server only accepts items that exist in the data definitions and
// that fit their slot's expectations.
export function validatePreset(preset: Preset): ValidationResult {
  if (!preset || typeof preset !== 'object') return { valid: false, error: 'Invalid preset.' };
  if (!preset.name || preset.name.length > 24) return { valid: false, error: 'Preset name must be 1-24 characters.' };

  for (const slotDef of SLOTS) {
    const itemId = preset.slots?.[slotDef.id];
    if (!itemId) continue;

    const gear = GEAR[itemId];
    const power = POWERS[itemId];

    if (slotDef.accepts === 'gear') {
      if (!gear) return { valid: false, error: `Unknown gear "${itemId}" in ${slotDef.label}.` };
      // Gear is slot-specific: a sword cannot be equipped in the armor or
      // utility slot.
      if (gear.slot !== slotDef.id) {
        return { valid: false, error: `"${gear.name}" is ${gear.slot} gear and cannot go in ${slotDef.label}.` };
      }
    } else {
      if (!power) return { valid: false, error: `Unknown power "${itemId}" in ${slotDef.label}.` };
      // Slot groups: core/actives/passives/ultimate
      const allowedKind =
        slotDef.id === 'core' ? 'core'
        : slotDef.id === 'active1' || slotDef.id === 'active2' ? 'active'
        : slotDef.id === 'passive1' || slotDef.id === 'passive2' ? 'passive'
        : 'ultimate';
      if (power.powerKind !== allowedKind) {
        return { valid: false, error: `"${power.name}" cannot go in ${slotDef.label}.` };
      }
    }
  }
  return { valid: true };
}

export function validateSlotId(id: string): id is SlotId {
  return SLOTS.some((s) => s.id === id);
}
