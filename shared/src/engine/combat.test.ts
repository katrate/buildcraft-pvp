import { describe, expect, it } from 'vitest';
import type { MatchState, Preset } from '../types';
import { MAX_ROUNDS, ULTIMATE_CHARGE_MAX } from '../constants';
import { chooseBotAction } from './ai';
import {
  applyAction,
  computeDamage,
  computeTurnOrder,
  createMatch,
  getTurnActions,
  isMyTurn,
} from './combat';
import { computeStats } from './stats';

function mkPreset(slots: Record<string, string | null>): Preset {
  return { id: 'p', name: 'p', createdAt: 0, slots };
}

function mkMatch(extraActiveA: string | null = null): MatchState {
  const slotsA: Record<string, string | null> = { active1: extraActiveA ?? 'fire_bolt', weapon: 'iron_sword' };
  const a = {
    id: 'p1', name: 'Player', playerId: 'u1', isBot: false,
    build: computeStats(mkPreset(slotsA)),
  };
  const b = {
    id: 'p2', name: 'Enemy', playerId: 'u2', isBot: false,
    build: computeStats(mkPreset({ active1: 'fire_bolt', weapon: 'iron_sword' })),
  };
  return createMatch({ id: 'm1', mode: 'unranked', teams: [{ teamId: 0, combatants: [a] }, { teamId: 1, combatants: [b] }] });
}

describe('damage calculation', () => {
  it('damage = power attack + caster attack - defender defense', () => {
    const s = mkMatch();
    const atk = s.combatants.p1;
    const def = s.combatants.p2;
    // caster attack = 20 base + 3 iron sword = 23; defender defense = 5
    const dmg = computeDamage(atk, def, { attack: 30 });
    expect(dmg).toBe(30 + 23 - 5);
  });

  it('defense reduces incoming damage', () => {
    const s = mkMatch();
    const glass = s.combatants.p2; // defense 5
    const tank = { ...s.combatants.p2, defense: 12 };
    const dmgGlass = computeDamage(s.combatants.p1, glass, { attack: 30 });
    const dmgTank = computeDamage(s.combatants.p1, tank, { attack: 30 });
    expect(dmgTank).toBeLessThan(dmgGlass);
    expect(dmgTank).toBe(30 + 23 - 12);
  });

  it('never deals less than 1 damage', () => {
    const s = mkMatch();
    const def = { ...s.combatants.p2, defense: 9999 };
    expect(computeDamage(s.combatants.p1, def, { attack: 30 })).toBe(1);
  });

  it('a basic attack is caster attack minus defense', () => {
    const s = mkMatch();
    const atk = s.combatants.p1; // attack 23
    const def = s.combatants.p2; // defense 5
    expect(computeDamage(atk, def, {})).toBe(23 - 5);
  });
});

describe('turn order & initiative', () => {
  it('higher initiative acts first', () => {
    const s = mkMatch();
    s.combatants.p1.initiative = 15;
    expect(computeTurnOrder(s)[0]).toBe('p1');
    s.combatants.p1.initiative = 5;
    expect(computeTurnOrder(s)[0]).toBe('p2');
  });

  it('slow debuff lowers initiative ordering', () => {
    const s = mkMatch();
    s.combatants.p2.effects.push({
      uid: 'f1', kind: 'slow', amount: 0.6, duration: 2, sourceId: 'p1', displayName: 'Slow', icon: '🐌',
    });
    expect(computeTurnOrder(s)[0]).toBe('p1');
  });

  it('tiebreak is deterministic', () => {
    const s = mkMatch();
    const order = computeTurnOrder(s);
    expect(order).toEqual(order);
    expect(order.length).toBe(2);
  });
});

describe('actions', () => {
  it('fire bolt consumes a use and damages the target', () => {
    const s = mkMatch();
    expect(isMyTurn(s, 'p1')).toBe(true);
    expect(s.combatants.p1.usesLeft.fire_bolt).toBe(3);
    const before = s.combatants.p2.hp;
    applyAction(s, { type: 'USE_ABILITY', powerId: 'fire_bolt', targetId: 'p2' });
    expect(s.combatants.p1.usesLeft.fire_bolt).toBe(2);
    expect(s.combatants.p2.hp).toBe(before - computeDamage(s.combatants.p1, s.combatants.p2, { attack: 30 }));
    expect(s.combatants.p2.alive).toBe(true);
  });

  it('cannot cast with zero uses left (no energy system)', () => {
    const s = mkMatch();
    s.combatants.p1.usesLeft = { fire_bolt: 0 };
    applyAction(s, { type: 'USE_ABILITY', powerId: 'fire_bolt', targetId: 'p2' });
    expect(s.combatants.p1.usesLeft.fire_bolt).toBe(0); // nothing consumed
    expect(s.combatants.p2.hp).toBe(200);
  });

  it('basic attack damages target', () => {
    const s = mkMatch();
    const before = s.combatants.p2.hp;
    applyAction(s, { type: 'BASIC_ATTACK', targetId: 'p2' });
    expect(s.combatants.p2.hp).toBeLessThan(before);
  });

  it('basic attack with no valid target does nothing', () => {
    const s = mkMatch();
    const before = s.combatants.p1.hp;
    applyAction(s, { type: 'BASIC_ATTACK', targetId: 'p1' }); // can't attack self
    expect(s.combatants.p1.hp).toBe(before);
  });

  it('ignores client-supplied damage values (server-authoritative)', () => {
    const s = mkMatch();
    const before = s.combatants.p2.hp;
    applyAction(s, { type: 'BASIC_ATTACK', targetId: 'p2', damage: 999999 } as never);
    expect(s.combatants.p2.hp).toBe(before - computeDamage(s.combatants.p1, s.combatants.p2, {}));
    expect(s.combatants.p2.hp).toBeGreaterThan(0);
  });

  it('end turn advances to the next combatant', () => {
    const s = mkMatch();
    applyAction(s, { type: 'END_TURN' });
    expect(isMyTurn(s, 'p2')).toBe(true);
  });

  it('shield absorbs damage before HP', () => {
    const s = mkMatch();
    // fire bolt deals 48 (30 + 23 attack - 5 defense); a 60 shield absorbs it all
    s.combatants.p2.effects.push({
      uid: 's1', kind: 'shield', amount: 60, duration: 0, sourceId: 'p1', displayName: 'Shield', icon: '🛡',
    });
    const before = s.combatants.p2.hp;
    applyAction(s, { type: 'USE_ABILITY', powerId: 'fire_bolt', targetId: 'p2' });
    expect(s.combatants.p2.hp).toBe(before);
  });

  it('shield partially absorbs when it is smaller than the hit', () => {
    const s = mkMatch();
    s.combatants.p2.effects.push({
      uid: 's1', kind: 'shield', amount: 20, duration: 0, sourceId: 'p1', displayName: 'Shield', icon: '🛡',
    });
    const before = s.combatants.p2.hp;
    applyAction(s, { type: 'USE_ABILITY', powerId: 'fire_bolt', targetId: 'p2' });
    // 48 damage: 20 absorbed, 28 leaks through to HP
    expect(s.combatants.p2.hp).toBe(before - (48 - 20));
  });

  it('counter retaliates against the attacker', () => {
    const s = mkMatch();
    s.combatants.p2.effects.push({
      uid: 'c1', kind: 'counter', amount: 12, duration: 0, sourceId: 'p1', displayName: 'Counter', icon: '↩',
    });
    const atkBefore = s.combatants.p1.hp;
    applyAction(s, { type: 'BASIC_ATTACK', targetId: 'p2' });
    expect(s.combatants.p1.hp).toBe(atkBefore - 12);
  });

  it('poison deals damage over time at the start of the victim turn', () => {
    const s = mkMatch('poison');
    applyAction(s, { type: 'USE_ABILITY', powerId: 'poison', targetId: 'p2' });
    // The DoT ticked on p2's turn start (applyAction advances through it)
    const castDmg = computeDamage(s.combatants.p1, s.combatants.p2, { attack: 15 });
    expect(s.combatants.p2.hp).toBe(200 - castDmg - 8);
    expect(s.combatants.p2.effects.some((e) => e.kind === 'poison')).toBe(true);
    const log = s.log.map((l) => l.text).join('\n');
    expect(log).toContain('takes 8 damage over time');
  });

  it('stun skips the victim turn', () => {
    const s = mkMatch('thunder_bolt');
    applyAction(s, { type: 'USE_ABILITY', powerId: 'thunder_bolt', targetId: 'p2' });
    expect(s.combatants.p2.effects.some((e) => e.kind === 'stun')).toBe(false); // consumed
    const log = s.log.map((l) => l.text).join('\n');
    expect(log).toContain('stunned and skips');
    expect(isMyTurn(s, 'p1')).toBe(true); // p2's turn was skipped
  });

  it('stun still skips a turn when the victim already acted this round (slower caster)', () => {
    // p2 is faster (speed module) so they act before the stunner in round 1
    const s = createMatch({
      id: 'm3', mode: 'unranked',
      teams: [
        { teamId: 0, combatants: [{ id: 'p1', name: 'Player', playerId: 'u1', isBot: false, build: computeStats(mkPreset({ active1: 'thunder_bolt' })) }] },
        { teamId: 1, combatants: [{ id: 'p2', name: 'Enemy', playerId: 'u2', isBot: false, build: computeStats(mkPreset({ weapon: 'iron_sword', utility: 'speed_module' })) }] },
      ],
    });
    expect(isMyTurn(s, 'p2')).toBe(true);
    applyAction(s, { type: 'END_TURN' }); // p2 already acted this round
    applyAction(s, { type: 'USE_ABILITY', powerId: 'thunder_bolt', targetId: 'p2' }); // p1 stuns p2
    // Round 2 begins: p2 should still be stunned and skip their turn
    expect(isMyTurn(s, 'p1')).toBe(true);
    const log = s.log.map((l) => l.text).join('\n');
    expect(log).toContain('stunned and skips');
  });

  it('heal restores HP', () => {
    const s = mkMatch('heal');
    s.combatants.p1.hp = 40;
    applyAction(s, { type: 'USE_ABILITY', powerId: 'heal', targetId: 'p1' });
    expect(s.combatants.p1.hp).toBe(80);
  });

  it('abilities are limited to their per-match uses', () => {
    const s = mkMatch('shield'); // shield has 2 uses
    expect(s.combatants.p1.usesLeft.shield).toBe(2);
    applyAction(s, { type: 'USE_ABILITY', powerId: 'shield', targetId: 'p1' });
    expect(s.combatants.p1.usesLeft.shield).toBe(1);
    // p2 acts, round advances back to p1
    applyAction(s, { type: 'BASIC_ATTACK', targetId: 'p1' });
    expect(s.round).toBe(2);
    expect(isMyTurn(s, 'p1')).toBe(true);
    applyAction(s, { type: 'USE_ABILITY', powerId: 'shield', targetId: 'p1' });
    expect(s.combatants.p1.usesLeft.shield).toBe(0);
    const actions = getTurnActions(s, 'p1');
    const shield = actions.find((a) => a.power.id === 'shield');
    expect(shield?.usable).toBe(false);
  });

  it('AoE fireball hits all enemies', () => {
    const m = createMatch({
      id: 'm2', mode: 'practice',
      teams: [
        { teamId: 0, combatants: [{ id: 'p1', name: 'Player', playerId: 'u1', isBot: false, build: computeStats(mkPreset({ active1: 'fireball' })) }] },
        {
          teamId: 1,
          combatants: [
            { id: 'p2', name: 'E1', playerId: null, isBot: true, build: computeStats(mkPreset({ weapon: 'iron_sword' })) },
            { id: 'p3', name: 'E2', playerId: null, isBot: true, build: computeStats(mkPreset({ weapon: 'iron_sword' })) },
          ],
        },
      ],
    });
    const h2 = m.combatants.p2.hp;
    const h3 = m.combatants.p3.hp;
    applyAction(m, { type: 'USE_ABILITY', powerId: 'fireball' });
    expect(m.combatants.p2.hp).toBeLessThan(h2);
    expect(m.combatants.p3.hp).toBeLessThan(h3);
  });

  it('ultimate requires 5 charges, fires on all enemies, and resets', () => {
    const s = mkMatch();
    s.combatants.p1.build = {
      ...s.combatants.p1.build!,
      actives: [],
      ultimate: { id: 'inferno', name: 'Inferno', description: 'x', kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: 400, rarity: 'epic', attack: 70, targetRule: 'all-enemies' },
    };
    s.combatants.p1.ultimate = { id: 'inferno', charge: ULTIMATE_CHARGE_MAX };
    const before = s.combatants.p2.hp;
    applyAction(s, { type: 'USE_ABILITY', powerId: 'inferno' });
    const expected = computeDamage(s.combatants.p1, s.combatants.p2, { attack: 70 });
    expect(s.combatants.p2.hp).toBe(before - expected);
    expect(s.combatants.p2.alive).toBe(true); // target survives -> no kill credit
    expect(s.combatants.p1.ultimate?.charge).toBe(0); // reset after firing
  });

  it('ultimate cannot fire before 5 charges', () => {
    const s = mkMatch();
    s.combatants.p1.build = {
      ...s.combatants.p1.build!,
      actives: [],
      ultimate: { id: 'inferno', name: 'Inferno', description: 'x', kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: 400, rarity: 'epic', attack: 70, targetRule: 'all-enemies' },
    };
    s.combatants.p1.ultimate = { id: 'inferno', charge: 4 };
    applyAction(s, { type: 'USE_ABILITY', powerId: 'inferno' });
    expect(s.combatants.p1.ultimate?.charge).toBe(4); // unchanged
    expect(s.combatants.p2.hp).toBe(200);
    expect(isMyTurn(s, 'p1')).toBe(true); // fizzled — turn not consumed
  });
});

describe('ultimate charge', () => {
  it('gains +1 charge at the start of each round', () => {
    const s = mkMatch('fire_bolt');
    s.combatants.p1.build = { ...s.combatants.p1.build!, actives: [], ultimate: { id: 'inferno', name: 'Inferno', description: 'x', kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: 400, rarity: 'epic', attack: 70, targetRule: 'all-enemies' } };
    s.combatants.p1.ultimate = { id: 'inferno', charge: 0 };
    expect(s.combatants.p1.ultimate?.charge).toBe(0);
    // each completed round grants +1 at the next round start
    applyAction(s, { type: 'END_TURN' }); // p1 ends
    applyAction(s, { type: 'END_TURN' }); // p2 ends -> round 2
    expect(s.round).toBe(2);
    expect(s.combatants.p1.ultimate?.charge).toBe(1);
    applyAction(s, { type: 'END_TURN' }); // p1 ends
    applyAction(s, { type: 'END_TURN' }); // p2 ends -> round 3
    expect(s.round).toBe(3);
    expect(s.combatants.p1.ultimate?.charge).toBe(2);
  });

  it('gains +1 charge per kill', () => {
    const s = mkMatch();
    s.combatants.p1.build = { ...s.combatants.p1.build!, actives: [], ultimate: { id: 'inferno', name: 'Inferno', description: 'x', kind: 'power', powerKind: 'ultimate', slot: 'ultimate', price: 400, rarity: 'epic', attack: 70, targetRule: 'all-enemies' } };
    s.combatants.p1.ultimate = { id: 'inferno', charge: 0 };
    s.combatants.p2.hp = 5;
    applyAction(s, { type: 'BASIC_ATTACK', targetId: 'p2' }); // lethal
    expect(s.combatants.p2.alive).toBe(false);
    expect(s.combatants.p1.ultimate?.charge).toBe(1);
    const log = s.log.map((l) => l.text).join('\n');
    expect(log).toContain('scores a kill');
  });
});

describe('win conditions', () => {
  it('match ends when an opponent is eliminated', () => {
    const s = mkMatch();
    s.combatants.p2.hp = 10;
    applyAction(s, { type: 'USE_ABILITY', powerId: 'fire_bolt', targetId: 'p2' });
    expect(s.combatants.p2.alive).toBe(false);
    expect(s.phase).toBe('MATCH_END');
    expect(s.winnerTeam).toBe(0);
  });

  it('time limit ends stalemates and awards the HP leader', () => {
    const s = mkMatch();
    // Simulate a long match past the cap with one team ahead on HP
    s.round = MAX_ROUNDS + 1;
    s.combatants.p1.hp = 90;
    s.combatants.p2.hp = 40;
    applyAction(s, { type: 'END_TURN' });
    expect(s.phase).toBe('MATCH_END');
    expect(s.winnerTeam).toBe(0); // team 0 has more HP remaining
    const log = s.log.map((l) => l.text).join('\n');
    expect(log).toContain('Time limit reached');
  });

  it('time limit can declare a draw when HP is tied', () => {
    const s = mkMatch();
    s.round = MAX_ROUNDS + 1;
    s.combatants.p1.hp = 50;
    s.combatants.p2.hp = 50;
    applyAction(s, { type: 'END_TURN' });
    expect(s.phase).toBe('MATCH_END');
    expect(s.winnerTeam).toBe(-1);
  });
});

describe('bot AI', () => {
  it('basic attacks the lowest-hp enemy when no abilities are usable', () => {
    const s = mkMatch();
    s.combatants.p2.hp = 30;
    s.combatants.p1.usesLeft = { fire_bolt: 0 }; // no usable actives
    const action = chooseBotAction(s, 'p1');
    expect(action.type).toBe('BASIC_ATTACK');
    if (action.type === 'BASIC_ATTACK') expect(action.targetId).toBe('p2');
  });

  it('uses defensive powers when low on HP', () => {
    const s = mkMatch();
    s.combatants.p1.build = computeStats(mkPreset({ active1: 'shield' }));
    s.combatants.p1.usesLeft = { shield: 2 };
    s.combatants.p1.hp = Math.floor(s.combatants.p1.maxHp * 0.3);
    const action = chooseBotAction(s, 'p1');
    expect(action.type).toBe('USE_ABILITY');
    if (action.type === 'USE_ABILITY') expect(action.powerId).toBe('shield');
  });
});
