import { describe, expect, it } from 'vitest';
import { buildUnits, findRankedGroup, findRankedPartyGroup, partitionTeams, shouldStartMatch } from './queue';
import { tierForRating } from '../../shared/src/rating';

describe('shouldStartMatch', () => {
  it('starts a full real match immediately when both teams are filled', () => {
    expect(shouldStartMatch(2, 1, 0, 15000)).toBe('full');
    expect(shouldStartMatch(4, 2, 0, 15000)).toBe('full');
    expect(shouldStartMatch(10, 5, 0, 15000)).toBe('full');
  });

  it('keeps waiting for real players during the grace window', () => {
    expect(shouldStartMatch(1, 1, 5000, 15000)).toBe('wait');
    expect(shouldStartMatch(2, 2, 14999, 15000)).toBe('wait');
    expect(shouldStartMatch(5, 5, 10000, 15000)).toBe('wait');
  });

  it('bot-fills only after the queue has been idle long enough', () => {
    expect(shouldStartMatch(1, 1, 15000, 15000)).toBe('bot-fill');
    expect(shouldStartMatch(3, 2, 20000, 15000)).toBe('bot-fill');
  });

  it('never starts an empty queue', () => {
    expect(shouldStartMatch(0, 5, 999999, 15000)).toBe('wait');
  });

  it('ranked never bot-fills — it waits for full real teams', () => {
    // 1 ranked player alone waits forever, even past the idle window
    expect(shouldStartMatch(1, 1, 999999, 15000, false)).toBe('wait');
    expect(shouldStartMatch(3, 2, 999999, 15000, false)).toBe('wait');
    // full teams start instantly
    expect(shouldStartMatch(2, 1, 0, 15000, false)).toBe('full');
    expect(shouldStartMatch(4, 2, 0, 15000, false)).toBe('full');
  });
});

describe('findRankedGroup (rank window cap)', () => {
  const tiers = (ratings: number[]) => ratings.map((r) => tierForRating(r));

  it('matches players of the same rank band', () => {
    const group = findRankedGroup(tiers([1000, 1050, 1080, 1000]), 2);
    expect(group?.length).toBe(4); // 4 bronze
  });

  it('matches adjacent bands (Bronze + Silver together)', () => {
    const group = findRankedGroup(tiers([1000, 1020, 1120, 1150]), 2);
    expect(group?.length).toBe(4); // 2 bronze + 2 silver
  });

  it('blocks players two bands apart (Bronze vs Gold)', () => {
    expect(findRankedGroup(tiers([1000, 1400]), 1)).toBeNull();
    expect(findRankedGroup(tiers([1000, 1800]), 1)).toBeNull();
  });

  it('a silver player bridges bronze and gold by matching one of them', () => {
    // bronze(0) + silver(1) + gold(2), 1v1 -> picks the 2-player window; tie
    // breaks toward the lower band: bronze + silver
    const group = findRankedGroup(tiers([1000, 1200, 1400]), 1);
    expect(group?.length).toBe(2);
    const picked = (group as number[]).map((i) => [1000, 1200, 1400][i]);
    expect(picked).toEqual([1000, 1200]); // silver pairs with bronze (lower window)
  });

  it('pairs diamond players with each other or platinum', () => {
    expect(findRankedGroup(tiers([1800, 1900]), 1)?.length).toBe(2); // 2 diamond
    expect(findRankedGroup(tiers([1500, 1800]), 1)?.length).toBe(2); // platinum + diamond
  });

  it('needs a full match — 3 players cannot start a 2v2', () => {
    expect(findRankedGroup(tiers([1000, 1000, 1000]), 2)).toBeNull(); // needs 4
  });

  it('prefers the largest compatible window', () => {
    // 2 bronze + 2 silver + 2 gold: window {0,1} = 4 and {1,2} = 4; lower band wins
    const group = findRankedGroup(tiers([1000, 1020, 1120, 1150, 1320, 1350]), 2);
    expect(group?.length).toBe(4);
    const picked = (group as number[]).map((i) => tiers([1000, 1020, 1120, 1150, 1320, 1350])[i]);
    expect(picked.every((t) => t === 0 || t === 1)).toBe(true); // bronze + silver only
  });

  it('widens to ±2 bands when the window is enlarged', () => {
    // bronze(0) + gold(2): blocked at ±1, allowed at ±2
    expect(findRankedGroup(tiers([1000, 1400]), 1)).toBeNull();
    expect(findRankedGroup(tiers([1000, 1400]), 1, 2)?.length).toBe(2);
    // bronze(0) + platinum(3) = spread 3: still blocked even widened
    expect(findRankedGroup(tiers([1000, 1500]), 1, 2)).toBeNull();
    // bronze(0) + diamond(4) = spread 4: still blocked even widened
    expect(findRankedGroup(tiers([1000, 1800]), 1, 2)).toBeNull();
    // silver(1) + platinum(3) = spread 2: now allowed when widened
    expect(findRankedGroup(tiers([1100, 1500]), 1, 2)?.length).toBe(2);
  });

  it('widening still requires full teams', () => {
    // 2 bronze + 1 gold = 3 players: can't start a 2v2 even widened (needs 4)
    expect(findRankedGroup(tiers([1000, 1000, 1300]), 2, 2)).toBeNull();
    // 2 bronze + 2 gold: spread 2 fits the {0,1,2} window -> full 2v2
    expect(findRankedGroup(tiers([1000, 1020, 1300, 1320]), 2, 2)?.length).toBe(4);
  });
});

describe('party queue units', () => {
  const mkPlayer = (playerId: string, rating: number, partyId?: string, anchorTier?: number) => ({
    playerId,
    name: playerId,
    ws: null as never,
    preset: { id: 'p', name: 'p', createdAt: 0, slots: {} },
    initiativeUpgrade: 0,
    rankedUpgrades: {},
    rating,
    joinedAt: 0,
    partyId,
    anchorTier,
  });

  it('buildUnits groups party members into one unit anchored on the creator tier', () => {
    const units = buildUnits([
      mkPlayer('a', 1000, 'party1', 0),
      mkPlayer('b', 1000, 'party1', 0),
      mkPlayer('c', 1200),
    ]);
    expect(units.length).toBe(2);
    expect(units[0].id).toBe('party1');
    expect(units[0].size).toBe(2);
    expect(units[0].tier).toBe(0); // anchored on the creator's tier
    expect(units[1].id).toBe('c');
    expect(units[1].size).toBe(1);
    expect(units[1].tier).toBe(1);
  });

  it('partitionTeams never splits a party across teams', () => {
    // party of 2 + 2 solos -> 2v2: the party is one full team
    const res = partitionTeams(
      [
        { size: 2, mustPick: true, index: 0 },
        { size: 1, mustPick: false, index: 1 },
        { size: 1, mustPick: false, index: 2 },
      ],
      2,
    );
    expect(res).not.toBeNull();
    const inA = res!.a.includes(0);
    const inB = res!.b.includes(0);
    expect(inA !== inB).toBe(true);
  });

  it('partitionTeams needs exact full teams for ranked', () => {
    // party of 2 alone can't fill a 2v2
    expect(partitionTeams([{ size: 2, mustPick: true, index: 0 }], 2)).toBeNull();
  });

  it('findRankedPartyGroup anchors opponents on the party creator tier', () => {
    // bronze party (2) + 2 bronze solos -> match, party whole on one team
    const res = findRankedPartyGroup(
      [
        { id: 'p', tier: 0, size: 2, party: true },
        { id: 's1', tier: 0, size: 1, party: false },
        { id: 's2', tier: 0, size: 1, party: false },
      ],
      2,
      1,
    );
    expect(res?.unitIndices.length).toBe(3);
    const inA = res!.teamA.includes(0);
    const inB = res!.teamB.includes(0);
    expect(inA !== inB).toBe(true);
  });

  it('bronze party matches silver opponents (enemy matched around creator rank)', () => {
    const res = findRankedPartyGroup(
      [
        { id: 'p', tier: 0, size: 2, party: true },
        { id: 's1', tier: 1, size: 1, party: false },
        { id: 's2', tier: 1, size: 1, party: false },
      ],
      2,
      1,
    );
    expect(res).not.toBeNull();
  });

  it('gold opponents are out of the bronze party window (±1)', () => {
    expect(
      findRankedPartyGroup(
        [
          { id: 'p', tier: 0, size: 2, party: true },
          { id: 'g1', tier: 2, size: 1, party: false },
          { id: 'g2', tier: 2, size: 1, party: false },
        ],
        2,
        1,
      ),
    ).toBeNull();
  });

  it('two parties of 2 can face each other in a 2v2', () => {
    const res = findRankedPartyGroup(
      [
        { id: 'pA', tier: 0, size: 2, party: true },
        { id: 'pB', tier: 1, size: 2, party: true },
      ],
      2,
      1,
    );
    expect(res).not.toBeNull();
    const inA = res!.teamA.includes(0);
    const inB = res!.teamB.includes(0);
    expect(inA !== inB).toBe(true);
  });
});
