import { NPC_TEMPLATES } from '../game-data/npcs';
import type { CombatBuild, MatchState } from '../types';
import { computeStats } from './stats';
import { createMatch, type CombatantInput, type TeamInput } from './combat';

// ------------------------------------------------------------
// Practice mode — a 1v1 fight against a single NPC.
// Unlike the old offline waves there is no stat scaling and no
// offline-only boost: the NPC fights at base stats, so practice
// is a fair sandbox for testing a build. Rewards are normal
// (XP + coins), exactly like unranked.
// ------------------------------------------------------------

export const PRACTICE_NPC_ID = 'warlock';

export function practiceEnemyInput(): CombatantInput {
  const tpl = NPC_TEMPLATES[PRACTICE_NPC_ID];
  const build: CombatBuild = computeStats(tpl.preset);
  return {
    id: `bot_practice_${tpl.id}`,
    name: tpl.name,
    playerId: null,
    isBot: true,
    build,
  };
}

export function createPracticeMatch(matchId: string, playerInput: CombatantInput): MatchState {
  const teams: TeamInput[] = [
    { teamId: 0, combatants: [playerInput] },
    { teamId: 1, combatants: [practiceEnemyInput()] },
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
