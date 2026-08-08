import type { MatchState } from '../types';
import { computeStats } from './stats';
import { createMatch, type CombatantInput, type TeamInput } from './combat';

// ------------------------------------------------------------
// Practice mode — a 1v1 MIRROR fight against a copy of your own build.
//
// Both fighters use RAW BASE stats + ONLY the build's modifiers (gear,
// powers, potions). No coin-bought initiative upgrade, no ranked upgrades
// and no normalization are applied to either side — so practice is a pure
// sandbox: a fair, identical test of a build against itself.
// Rewards are normal (XP + coins), exactly like unranked.
// ------------------------------------------------------------

// The mirror enemy: an identical CombatBuild so the fight is perfectly even
// on paper. `build` is read-only during combat (only per-combatant state
// like hp/effects/usesLeft changes), so sharing the reference is safe.
// The id is chosen to sort AFTER player combatant ids (`p_…`) so, on equal
// initiative, the PLAYER acts first in the mirror (deterministic tiebreak).
export function mirrorEnemyInput(player: CombatantInput): CombatantInput {
  return {
    id: `z_mirror_${player.id}`,
    name: `${player.name} (Mirror)`,
    playerId: null,
    isBot: true,
    build: player.build,
  };
}

export function createPracticeMatch(matchId: string, playerInput: CombatantInput): MatchState {
  const teams: TeamInput[] = [
    { teamId: 0, combatants: [playerInput] },
    { teamId: 1, combatants: [mirrorEnemyInput(playerInput)] },
  ];
  return createMatch({ id: matchId, mode: 'practice', teams });
}

export function playerCombatantInput(player: {
  playerId: string;
  name: string;
  preset: Parameters<typeof computeStats>[0];
}): CombatantInput {
  return {
    id: `p_${player.playerId}`,
    name: player.name,
    playerId: player.playerId,
    isBot: false,
    build: computeStats(player.preset),
  };
}
