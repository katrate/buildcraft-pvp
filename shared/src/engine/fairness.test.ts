import { describe, expect, it } from 'vitest';
import { GEAR } from '../game-data/gear';
import { BOT_PRESETS, NPC_TEMPLATES } from '../game-data/npcs';
import { POWERS } from '../game-data/powers';
import type { Preset } from '../types';
import { chooseBotAction } from './ai';
import { applyAction, computeDamage, createMatch, isMyTurn, makeCombatant } from './combat';
import { createPracticeMatch, playerCombatantInput } from './practice';
import { computePvpBuild, computeStats } from './stats';
import { normalizeUnranked } from './normalize';

function preset(slots: Record<string, string | null>): Preset {
  return { id: 'p', name: 'p', createdAt: 0, slots };
}

function allNpcPresets(): Preset[] {
  return [...Object.values(NPC_TEMPLATES).map((t) => t.preset), ...BOT_PRESETS.map((b) => b.preset)];
}

describe('fairness: NPC/bot builds never mutate shared data', () => {
  it('building every NPC and bot preset does not mutate global power or gear definitions', () => {
    const pSnapshot = new Map(Object.entries(POWERS).map(([id, p]) => [id, JSON.stringify(p)]));
    const gSnapshot = new Map(Object.entries(GEAR).map(([id, g]) => [id, JSON.stringify(g)]));
    for (const p of allNpcPresets()) computeStats(p);
    for (const [id, p] of Object.entries(POWERS)) {
      expect(JSON.stringify(p), `power ${id} was mutated`).toBe(pSnapshot.get(id));
    }
    for (const [id, g] of Object.entries(GEAR)) {
      expect(JSON.stringify(g), `gear ${id} was mutated`).toBe(gSnapshot.get(id));
    }
  });
});

describe('fairness: bots/NPCs are tuned to the new damage scale', () => {
  // A bare starter: fire bolt + iron sword, no armor → def 5, HP 200.
  const starter = makeCombatant({
    id: 'starter', name: 'Starter', playerId: 'u0', isBot: false,
    build: computeStats(preset({ active1: 'fire_bolt', weapon: 'iron_sword' })),
  });

  it('no bot or NPC power can one-shot a full-HP starter', () => {
    for (const p of allNpcPresets()) {
      const build = computeStats(p);
      const bot = makeCombatant({ id: `bot_${p.id}`, name: 'bot', playerId: null, isBot: true, build });
      for (const power of [...build.actives, ...(build.ultimate ? [build.ultimate] : [])]) {
        if ((power.attack ?? 0) <= 0) continue;
        const dmg = computeDamage(bot, starter, power);
        expect(dmg, `${p.name}: ${power.name} deals ${dmg} — must not one-shot ${starter.maxHp} HP`).toBeLessThan(
          starter.maxHp,
        );
      }
    }
  });

  it('a starter build can win practice — the NPC is tuned to be beatable', () => {
    const player = playerCombatantInput({
      playerId: 'u1', name: 'Starter',
      preset: preset({ active1: 'fire_bolt', weapon: 'iron_sword' }),
    });
    const s = createPracticeMatch('practice-fairness', player);
    // Balance guard: 1v1 can run up to MAX_ROUNDS (100) rounds = ~200 actions,
    // so the loop budget must exceed that for the timeout-win path to be reached.
    let guard = 0;
    while (s.phase !== 'MATCH_END' && guard < 250) {
      guard += 1;
      applyAction(s, chooseBotAction(s, s.currentCombatantId!));
    }
    expect(s.phase).toBe('MATCH_END');
    expect(s.winnerTeam).toBe(0); // player's team is team 0
  });
});

describe('fairness: invalid actions do not consume turns', () => {
  it('a power not in the build fizzles without ending the turn', () => {
    const s = createMatch({
      id: 'm', mode: 'unranked',
      teams: [
        { teamId: 0, combatants: [{ id: 'p1', name: 'A', playerId: 'u1', isBot: false, build: computeStats(preset({ active1: 'fire_bolt' })) }] },
        { teamId: 1, combatants: [{ id: 'p2', name: 'B', playerId: 'u2', isBot: false, build: computeStats(preset({})) }] },
      ],
    });
    applyAction(s, { type: 'USE_ABILITY', powerId: 'shield', targetId: 'p1' }); // not equipped
    expect(isMyTurn(s, 'p1')).toBe(true);
    expect(s.phase).toBe('TURN_START');
  });

  it('a no-valid-target fizzle does not consume the ability use', () => {
    const s = createMatch({
      id: 'm3', mode: 'unranked',
      teams: [
        { teamId: 0, combatants: [{ id: 'p1', name: 'A', playerId: 'u1', isBot: false, build: computeStats(preset({ active1: 'fire_bolt' })) }] },
        { teamId: 1, combatants: [{ id: 'p2', name: 'B', playerId: 'u2', isBot: false, build: computeStats(preset({})) }] },
      ],
    });
    const before = s.combatants.p1.usesLeft.fire_bolt;
    applyAction(s, { type: 'USE_ABILITY', powerId: 'fire_bolt', targetId: 'p1' }); // self is not a valid enemy target
    expect(s.combatants.p1.usesLeft.fire_bolt).toBe(before); // use NOT consumed
    expect(isMyTurn(s, 'p1')).toBe(true); // turn NOT consumed
  });

  it('an out-of-uses power fizzles without ending the turn', () => {
    const s = createMatch({
      id: 'm2', mode: 'unranked',
      teams: [
        { teamId: 0, combatants: [{ id: 'p1', name: 'A', playerId: 'u1', isBot: false, build: computeStats(preset({ active1: 'shield' })) }] },
        { teamId: 1, combatants: [{ id: 'p2', name: 'B', playerId: 'u2', isBot: false, build: computeStats(preset({})) }] },
      ],
    });
    expect(s.combatants.p1.usesLeft.shield).toBe(2);
    applyAction(s, { type: 'USE_ABILITY', powerId: 'shield', targetId: 'p1' }); // use 1
    expect(s.combatants.p1.usesLeft.shield).toBe(1);
    applyAction(s, { type: 'END_TURN' }); // p2 passes -> round 2, p1's turn
    expect(isMyTurn(s, 'p1')).toBe(true);
    applyAction(s, { type: 'USE_ABILITY', powerId: 'shield', targetId: 'p1' }); // use 2
    expect(s.combatants.p1.usesLeft.shield).toBe(0);
    applyAction(s, { type: 'END_TURN' }); // p2 passes -> round 3, p1's turn
    expect(isMyTurn(s, 'p1')).toBe(true);
    applyAction(s, { type: 'USE_ABILITY', powerId: 'shield', targetId: 'p1' }); // out of uses -> fizzle
    expect(isMyTurn(s, 'p1')).toBe(true);
  });
});

describe('fairness: PvP modes use the right stat pools', () => {
  const P = preset({ core: 'flame_core', weapon: 'war_hammer', armor: 'heavy_armor' });

  it('initiative upgrade bypasses unranked normalization', () => {
    const base = computePvpBuild(P, 'unranked', { initiativeUpgrade: 0 });
    const upgraded = computePvpBuild(P, 'unranked', { initiativeUpgrade: 12 });
    expect(upgraded.stats.initiative).toBe(base.stats.initiative + 12);
    // Other stats still normalized: both match each other
    expect(upgraded.stats.attack).toBe(base.stats.attack);
    expect(upgraded.stats.maxHp).toBe(base.stats.maxHp);
  });

  it('ranked upgrades apply only in ranked matches (attack + defense, no HP)', () => {
    const ranked = computePvpBuild(P, 'ranked', { rankedUpgrades: { attack: 3, defense: 2 } });
    const unranked = computePvpBuild(P, 'unranked', { rankedUpgrades: { attack: 3, defense: 2 } });
    const raw = computeStats(P);
    // ranked = raw + upgrades (1.5 atk / 1 def per level); HP has NO modifier.
    expect(ranked.stats.maxHp).toBe(raw.stats.maxHp);
    expect(ranked.stats.attack).toBe(raw.stats.attack + 4.5);
    expect(ranked.stats.defense).toBe(raw.stats.defense + 2);
    // unranked is normalized to the reference level — the ranked upgrades are invisible there
    expect(unranked.stats.maxHp).toBe(normalizeUnranked(raw.stats).maxHp);
  });

  it('custom matches equalize everyone to the chosen rank budget (attack/defense)', () => {
    const bronze = computePvpBuild(P, 'custom', { customNorm: 'bronze' });
    const diamond = computePvpBuild(P, 'custom', { customNorm: 'diamond' });
    const standard = computePvpBuild(P, 'custom', { customNorm: 'standard' });
    const gold = computePvpBuild(P, 'custom', { customNorm: 'gold' });
    // Diamond (tier 4, ceiling 20) > Gold (tier 2, ceiling 12) > Bronze
    // (tier 0, ceiling 5) > standard (no budget at all). Attack scales with
    // the budget; HP never does.
    expect(diamond.stats.attack).toBeGreaterThan(gold.stats.attack);
    expect(gold.stats.attack).toBeGreaterThan(bronze.stats.attack);
    expect(bronze.stats.attack).toBeGreaterThan(standard.stats.attack);
    expect(gold.stats.maxHp).toBe(standard.stats.maxHp);
    // Gold = +12 levels of the budget: +18 attack (1.5 each), +12 defense (1 each).
    expect(gold.stats.attack).toBe(standard.stats.attack + 18);
    expect(gold.stats.defense).toBe(standard.stats.defense + 12);
    // No initiative upgrade in custom (fully normalized).
    const withInit = computePvpBuild(P, 'custom', { customNorm: 'gold', initiativeUpgrade: 12 });
    expect(withInit.stats.initiative).toBe(gold.stats.initiative);
  });
});
