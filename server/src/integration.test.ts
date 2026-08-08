import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import { startGameServer, type GameServer } from './app';
import type { MatchState, PvpMode, Preset, ServerMessage } from '../../shared/src/types';

const TEST_PRESET: Preset = {
  id: 'test',
  name: 'Tester',
  createdAt: 0,
  slots: {
    core: 'flame_core',
    active1: 'fire_bolt',
    active2: 'shield',
    weapon: 'iron_sword',
    armor: 'leather_armor',
    utility: 'speed_module',
  },
};

class TestClient {
  ws: WebSocket;
  playerId: string;
  messages: ServerMessage[] = [];
  match: MatchState | null = null;
  yourIds: string[] = [];
  rating = 1000;
  private opened: Promise<void>;

  constructor(url: string, playerId: string) {
    this.playerId = playerId;
    this.ws = new WebSocket(url);
    this.opened = new Promise((resolve) => {
      this.ws.on('open', resolve);
    });
    this.ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString()) as ServerMessage;
      this.messages.push(msg);
      this.handle(msg);
    });
  }

  ready(): Promise<void> {
    return this.opened;
  }

  private send(msg: unknown): void {
    this.ws.send(JSON.stringify(msg));
  }

  hello(): void {
    this.send({ type: 'hello', playerId: this.playerId, name: this.playerId });
  }

  createParty(): void {
    this.send({ type: 'create_party', playerId: this.playerId, preset: TEST_PRESET, initiativeUpgrade: 0, rankedUpgrades: {}, rating: this.rating });
  }

  inviteTo(targetPlayerId: string): void {
    this.send({ type: 'party_invite', playerId: this.playerId, targetPlayerId });
  }

  acceptParty(partyId: string): void {
    this.send({ type: 'party_accept', playerId: this.playerId, partyId, preset: TEST_PRESET, initiativeUpgrade: 0, rankedUpgrades: {}, rating: this.rating });
  }

  setReady(ready: boolean): void {
    const partyId = this.partyId();
    if (partyId) this.send({ type: 'party_set_ready', playerId: this.playerId, partyId, ready });
  }

  createCustomLobby(): void {
    this.send({ type: 'custom_create', playerId: this.playerId, preset: TEST_PRESET, initiativeUpgrade: 0, rankedUpgrades: {}, rating: this.rating });
  }

  inviteCustomTo(targetPlayerId: string): void {
    this.send({ type: 'custom_invite', playerId: this.playerId, targetPlayerId });
  }

  acceptCustom(lobbyId: string): void {
    this.send({ type: 'custom_accept', playerId: this.playerId, lobbyId, preset: TEST_PRESET, initiativeUpgrade: 0, rankedUpgrades: {}, rating: this.rating });
  }

  lobbyId(): string | null {
    const u = this.messages.find((m): m is Extract<ServerMessage, { type: 'custom_update' }> => m.type === 'custom_update');
    return u ? u.lobby.lobbyId : null;
  }

  setCustomTeam(targetId: string, team: 0 | 1): void {
    const id = this.lobbyId();
    if (id) this.send({ type: 'custom_team', playerId: this.playerId, lobbyId: id, targetId, team });
  }

  setCustomNorm(
    norm: 'standard' | 'iron' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'divine' | 'supreme',
  ): void {
    const id = this.lobbyId();
    if (id) this.send({ type: 'custom_norm', playerId: this.playerId, lobbyId: id, norm });
  }

  startCustom(): void {
    const id = this.lobbyId();
    if (id) this.send({ type: 'custom_start', playerId: this.playerId, lobbyId: id });
  }

  leaveCustom(lobbyId: string): void {
    this.send({ type: 'custom_leave', playerId: this.playerId, lobbyId });
  }

  leaveParty(): void {
    const id = this.partyId();
    if (id) this.send({ type: 'party_leave', playerId: this.playerId, partyId: id });
  }

  partyId(): string | null {
    const u = this.messages.find((m): m is Extract<ServerMessage, { type: 'party_update' }> => m.type === 'party_update');
    return u ? u.party.partyId : null;
  }

  join(teamSize: 1 | 2 | 5, preset: Preset, opts?: { mode?: PvpMode; initiativeUpgrade?: number; rankedUpgrades?: { attack: number; defense: number }; rating?: number; partyId?: string }): void {
    this.send({
      type: 'join_queue',
      playerId: this.playerId,
      name: this.playerId,
      teamSize,
      mode: opts?.mode ?? 'unranked',
      preset,
      initiativeUpgrade: opts?.initiativeUpgrade,
      rankedUpgrades: opts?.rankedUpgrades,
      rating: opts?.rating,
      partyId: opts?.partyId,
    });
  }

  private handle(msg: ServerMessage): void {
    if (msg.type === 'match_start') {
      this.match = msg.match;
      this.yourIds = msg.yourCombatantIds;
    } else if (msg.type === 'match_state') {
      this.match = msg.match;
    }
    if (this.match && this.shouldAutoAct()) this.autoAct();
  }

  private shouldAutoAct(): boolean {
    const s = this.match;
    if (!s || s.phase === 'MATCH_END') return false;
    const me = this.yourIds[0];
    if (!me || s.currentCombatantId !== me) return false;
    return s.phase === 'TURN_START' || s.phase === 'PLAYER_ACTION';
  }

  private autoAct(): void {
    const s = this.match!;
    const me = this.yourIds[0];
    const enemies = Object.values(s.combatants).filter((c) => c.alive && c.teamId !== s.combatants[me].teamId);
    if (enemies.length > 0) {
      this.send({ type: 'player_action', matchId: s.id, playerId: this.playerId, action: { type: 'BASIC_ATTACK', targetId: enemies[0].id } });
    } else {
      this.send({ type: 'player_action', matchId: s.id, playerId: this.playerId, action: { type: 'END_TURN' } });
    }
  }

  async waitFor(pred: (msgs: ServerMessage[]) => boolean, timeoutMs = 20000): Promise<void> {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (pred(this.messages)) return;
      await new Promise((r) => setTimeout(r, 30));
    }
    throw new Error(`Timed out waiting for condition. Messages: ${JSON.stringify(this.messages.map((m) => m.type))}`);
  }

  close(): void {
    this.ws.close();
  }
}

describe('multiplayer integration', () => {
  let server: GameServer | null = null;

  afterEach(async () => {
    if (server) await server.close();
    server = null;
  });

  it('matches two players, plays a full 1v1, and pays out server-computed rewards', async () => {
    server = await startGameServer(0, { allowUnauthenticated: true, botThinkMs: 5, botFillWaitMs: 2000, matchCountdownMs: 5 });
    const url = `ws://127.0.0.1:${server.port}`;
    const alice = new TestClient(url, 'alice');
    const bob = new TestClient(url, 'bob');
    await Promise.all([alice.ready(), bob.ready()]);

    alice.join(1, TEST_PRESET);
    bob.join(1, TEST_PRESET);

    await Promise.all([
      alice.waitFor((m) => m.some((x) => x.type === 'match_start')),
      bob.waitFor((m) => m.some((x) => x.type === 'match_start')),
    ]);

    await Promise.all([
      alice.waitFor((m) => m.some((x) => x.type === 'match_end'), 30000),
      bob.waitFor((m) => m.some((x) => x.type === 'match_end'), 30000),
    ]);

    const endA = alice.messages.find((m): m is Extract<ServerMessage, { type: 'match_end' }> => m.type === 'match_end');
    const endB = bob.messages.find((m): m is Extract<ServerMessage, { type: 'match_end' }> => m.type === 'match_end');
    expect(endA).toBeDefined();
    expect(endB).toBeDefined();

    if (endA!.result === 'draw') {
      expect(endB!.result).toBe('draw');
    } else {
      // One wins, one loses — opposite results in a 1v1
      expect(endA!.result).not.toBe(endB!.result);
      expect([endA!.result, endB!.result].sort()).toEqual(['defeat', 'victory']);
      // Server computed rewards: victory pays more
      const winner = endA!.result === 'victory' ? endA! : endB!;
      const loser = endA!.result === 'victory' ? endB! : endA!;
      expect(winner.rewards.coins).toBeGreaterThan(loser.rewards.coins);
      expect(winner.rewards.xp).toBeGreaterThan(loser.rewards.xp);
    }
    alice.close();
    bob.close();
  });

  it('fills 2v2 teams with bots and completes a match', async () => {
    server = await startGameServer(0, { allowUnauthenticated: true, botThinkMs: 5, botFillWaitMs: 2000, matchCountdownMs: 5 });
    const url = `ws://127.0.0.1:${server.port}`;
    const a = new TestClient(url, 'aa');
    const b = new TestClient(url, 'bb');
    await Promise.all([a.ready(), b.ready()]);
    a.join(2, TEST_PRESET);
    b.join(2, TEST_PRESET);
    await Promise.all([
      a.waitFor((m) => m.some((x) => x.type === 'match_start'), 30000),
      b.waitFor((m) => m.some((x) => x.type === 'match_start'), 30000),
    ]);
    // 2v2 with bots: 4 combatants on the board
    expect(Object.keys(a.match!.combatants).length).toBe(4);
    await Promise.all([
      a.waitFor((m) => m.some((x) => x.type === 'match_end'), 60000),
      b.waitFor((m) => m.some((x) => x.type === 'match_end'), 60000),
    ]);
    a.close();
    b.close();
  }, 90000);

  it('starts a 5v5 match with bot-filled teams for just two players', async () => {
    server = await startGameServer(0, { allowUnauthenticated: true, botThinkMs: 5, botFillWaitMs: 2000, matchCountdownMs: 5 });
    const url = `ws://127.0.0.1:${server.port}`;
    const a = new TestClient(url, 'x5a');
    const b = new TestClient(url, 'x5b');
    await Promise.all([a.ready(), b.ready()]);
    a.join(5, TEST_PRESET);
    b.join(5, TEST_PRESET);
    await Promise.all([
      a.waitFor((m) => m.some((x) => x.type === 'match_start'), 30000),
      b.waitFor((m) => m.some((x) => x.type === 'match_start'), 30000),
    ]);
    // 5v5: 10 combatants, 8 of them bots
    expect(Object.keys(a.match!.combatants).length).toBe(10);
    await Promise.all([
      a.waitFor((m) => m.some((x) => x.type === 'match_end'), 90000),
      b.waitFor((m) => m.some((x) => x.type === 'match_end'), 90000),
    ]);
    a.close();
    b.close();
  }, 120000);

  it('applies the initiative upgrade on top of unranked normalization', async () => {
    server = await startGameServer(0, { allowUnauthenticated: true, botThinkMs: 5, botFillWaitMs: 2000, matchCountdownMs: 5 });
    const url = `ws://127.0.0.1:${server.port}`;
    const a = new TestClient(url, 'init_a');
    const b = new TestClient(url, 'init_b');
    await Promise.all([a.ready(), b.ready()]);
    a.join(1, TEST_PRESET, { initiativeUpgrade: 9 });
    b.join(1, TEST_PRESET, { initiativeUpgrade: 0 });
    await Promise.all([
      a.waitFor((m) => m.some((x) => x.type === 'match_start')),
      b.waitFor((m) => m.some((x) => x.type === 'match_start')),
    ]);
    const meA = Object.values(a.match!.combatants).find((c) => !c.isBot && c.playerId === 'init_a')!;
    const meB = Object.values(b.match!.combatants).find((c) => !c.isBot && c.playerId === 'init_b')!;
    // normalized initiative base is identical for both; the +9 upgrade must put A ahead
    expect(meA.initiative).toBe(meB.initiative + 9);
    // and the normalization brackets still apply to the base (initiative <= 20 + 9)
    expect(meA.initiative).toBeLessThanOrEqual(29);
    a.close();
    b.close();
  });

  it('runs a ranked 5v5, pays ranked rewards, and reports rank deltas', async () => {
    server = await startGameServer(0, { allowUnauthenticated: true, botThinkMs: 5, botFillWaitMs: 2000, matchCountdownMs: 5 });
    const url = `ws://127.0.0.1:${server.port}`;
    const clients = Array.from({ length: 10 }, (_, i) => new TestClient(url, `rk5_${i}`));
    await Promise.all(clients.map((c) => c.ready()));

    for (const c of clients) c.join(5, TEST_PRESET, { mode: 'ranked' });

    await Promise.all(clients.map((c) => c.waitFor((m) => m.some((x) => x.type === 'match_start'), 20000)));
    expect(clients[0].match!.mode).toBe('ranked');
    // 10 real players, zero bots on the ranked board.
    expect(Object.keys(clients[0].match!.combatants).length).toBe(10);
    expect(Object.values(clients[0].match!.combatants).filter((c) => c.isBot).length).toBe(0);

    await Promise.all(clients.map((c) => c.waitFor((m) => m.some((x) => x.type === 'match_end'), 90000)));
    const ends = clients.map((c) => c.messages.find((m): m is Extract<ServerMessage, { type: 'match_end' }> => m.type === 'match_end')!);
    for (const e of ends) expect(e.rankDelta).toBeDefined();
    if (ends.some((e) => e.result !== 'draw')) {
      // Equal ratings (all default 1000): every player's delta is exactly ±16 (0 on a draw).
      for (const e of ends) expect([-16, 0, 16]).toContain(e.rankDelta);
      expect(ends.reduce((sum, e) => sum + (e.rankDelta ?? 0), 0)).toBe(0);
      const winner = ends.find((e) => e.result === 'victory')!;
      const loser = ends.find((e) => e.result === 'defeat')!;
      expect(winner.rankDelta).toBe(16);
      expect(loser.rankDelta).toBe(-16);
      // The winner also earned more coins/xp via the result base.
      expect(winner.rewards.coins).toBeGreaterThan(loser.rewards.coins);
      expect(winner.rewards.xp).toBeGreaterThan(loser.rewards.xp);
    }
    // ranked pays more than unranked
    expect(ends[0].rewards.coins).toBeGreaterThanOrEqual(40);
    for (const c of clients) c.close();
  }, 120000);

  it('runs a ranked 1v1 on its own ladder (solo only, no bots)', async () => {
    server = await startGameServer(0, { allowUnauthenticated: true, botThinkMs: 5, botFillWaitMs: 2000, matchCountdownMs: 5 });
    const url = `ws://127.0.0.1:${server.port}`;
    const alice = new TestClient(url, 'r1_a');
    const bob = new TestClient(url, 'r1_b');
    await Promise.all([alice.ready(), bob.ready()]);

    alice.join(1, TEST_PRESET, { mode: 'ranked' });
    bob.join(1, TEST_PRESET, { mode: 'ranked' });

    await Promise.all([
      alice.waitFor((m) => m.some((x) => x.type === 'match_start'), 15000),
      bob.waitFor((m) => m.some((x) => x.type === 'match_start'), 15000),
    ]);
    expect(alice.match!.mode).toBe('ranked');
    // 1v1 board: exactly 2 real players, no bots.
    expect(Object.keys(alice.match!.combatants).length).toBe(2);
    expect(Object.values(alice.match!.combatants).filter((c) => c.isBot).length).toBe(0);

    await Promise.all([
      alice.waitFor((m) => m.some((x) => x.type === 'match_end'), 40000),
      bob.waitFor((m) => m.some((x) => x.type === 'match_end'), 40000),
    ]);
    const endA = alice.messages.find((m): m is Extract<ServerMessage, { type: 'match_end' }> => m.type === 'match_end')!;
    const endB = bob.messages.find((m): m is Extract<ServerMessage, { type: 'match_end' }> => m.type === 'match_end')!;
    // The 1v1 ladder delta arrives tagged with teamSize 1 so the client can
    // apply it to the 1v1 rank (never the 5v5 rank).
    expect(endA.teamSize).toBe(1);
    expect(endB.teamSize).toBe(1);
    expect(endA.rankDelta).toBeDefined();
    expect(endB.rankDelta).toBeDefined();
    expect([-16, 0, 16]).toContain(endA.rankDelta);
    expect(endA.rankDelta).toBe(-(endB.rankDelta ?? 0));
    expect(endA.rewards.coins).toBeGreaterThanOrEqual(40);
    alice.close();
    bob.close();
  }, 60000);

  it('ranks an upset fairly: the underdog gains big, the favorite loses small', async () => {
    // Ratings must stay within the ±1 rank window (5 Gold at 1400 vs 5 Silver at 1200).
    // Determinism: gold units queue FIRST, and partitionTeams is DFS "try team A
    // first", so the 5 gold solos fill team A and the 5 silver solos team B —
    // favs[0] and dogs[0] are therefore always on opposite teams.
    server = await startGameServer(0, { allowUnauthenticated: true, botThinkMs: 5, botFillWaitMs: 2000, matchCountdownMs: 5 });
    const url = `ws://127.0.0.1:${server.port}`;
    const favs = Array.from({ length: 5 }, (_, i) => new TestClient(url, `fav_${i}`));
    const dogs = Array.from({ length: 5 }, (_, i) => new TestClient(url, `dog_${i}`));
    await Promise.all([...favs, ...dogs].map((c) => c.ready()));
    for (const c of favs) c.join(5, TEST_PRESET, { mode: 'ranked', rating: 1400 });
    for (const c of dogs) c.join(5, TEST_PRESET, { mode: 'ranked', rating: 1200 });
    await Promise.all([...favs, ...dogs].map((c) => c.waitFor((m) => m.some((x) => x.type === 'match_start'), 20000)));
    await Promise.all([...favs, ...dogs].map((c) => c.waitFor((m) => m.some((x) => x.type === 'match_end'), 90000)));
    const endFav = favs[0].messages.find((m): m is Extract<ServerMessage, { type: 'match_end' }> => m.type === 'match_end')!;
    const endDog = dogs[0].messages.find((m): m is Extract<ServerMessage, { type: 'match_end' }> => m.type === 'match_end')!;
    if (endFav.result === 'victory' && endDog.result === 'defeat') {
      // Favorite (1400 avg) beat underdog (1200 avg): expected ~0.76 -> gains ~8, dog loses ~8
      expect(endFav.rankDelta).toBeGreaterThanOrEqual(5);
      expect(endFav.rankDelta).toBeLessThanOrEqual(12);
      expect(endDog.rankDelta).toBeGreaterThanOrEqual(-12);
      expect(endDog.rankDelta).toBeLessThanOrEqual(-5);
    } else if (endFav.result === 'defeat' && endDog.result === 'victory') {
      // Upset: underdog expected ~0.24 -> wins big ~+24, favorite loses ~-24
      expect(endDog.rankDelta).toBeGreaterThan(15);
      expect(endFav.rankDelta).toBeLessThan(-15);
    } else {
      // Draw with unequal ratings: each side's delta is the other's negation.
      expect(endFav.rankDelta).toBe(-(endDog.rankDelta ?? 0));
    }
    for (const c of [...favs, ...dogs]) c.close();
  }, 120000);

  it('ranked matchmaking respects the ±1 rank window (5v5)', async () => {
    server = await startGameServer(0, { allowUnauthenticated: true, botThinkMs: 5, botFillWaitMs: 1500, matchCountdownMs: 5 });
    const url = `ws://127.0.0.1:${server.port}`;
    const golds = Array.from({ length: 5 }, (_, i) => new TestClient(url, `goldw${i}`)); // rating 1400 -> Gold (tier 3)
    const bronzes = Array.from({ length: 5 }, (_, i) => new TestClient(url, `bronz${i}`)); // rating 1000 -> Bronze (tier 1)
    await Promise.all([...golds, ...bronzes].map((c) => c.ready()));
    for (const c of golds) c.join(5, TEST_PRESET, { mode: 'ranked', rating: 1400 });
    for (const c of bronzes) c.join(5, TEST_PRESET, { mode: 'ranked', rating: 1000 });
    // Two bands apart: they must NOT match — a 5v5 needs 10 players inside one ±1 window.
    await new Promise((r) => setTimeout(r, 2500));
    for (const c of [...golds, ...bronzes]) expect(c.messages.some((m) => m.type === 'match_start')).toBe(false);

    // 5 Silver players (1200 -> tier 2) bridge the gap: the lower window
    // (bronze+silver) wins the tie, so Bronze+Silver match and Gold waits.
    const silvers = Array.from({ length: 5 }, (_, i) => new TestClient(url, `silvr${i}`));
    await Promise.all(silvers.map((c) => c.ready()));
    for (const c of silvers) c.join(5, TEST_PRESET, { mode: 'ranked', rating: 1200 });
    await Promise.all([...bronzes, ...silvers].map((c) => c.waitFor((m) => m.some((x) => x.type === 'match_start'), 15000)));
    await new Promise((r) => setTimeout(r, 600));
    for (const c of golds) expect(c.messages.some((m) => m.type === 'match_start')).toBe(false); // gold still waits
    for (const c of [...golds, ...bronzes, ...silvers]) c.close();
  }, 30000);

  it('widens the rank window after a long wait so sparse ranks still match (5v5)', async () => {
    // Short widen threshold for the test (2.5s instead of 60s).
    server = await startGameServer(0, { allowUnauthenticated: true, botThinkMs: 5, botFillWaitMs: 2000, rankWidenAfterMs: 2500, matchCountdownMs: 5 });
    const url = `ws://127.0.0.1:${server.port}`;
    const golds = Array.from({ length: 5 }, (_, i) => new TestClient(url, `goldw2_${i}`)); // rating 1400 -> Gold (tier 3)
    const bronzes = Array.from({ length: 5 }, (_, i) => new TestClient(url, `bronz2_${i}`)); // rating 1000 -> Bronze (tier 1)
    await Promise.all([...golds, ...bronzes].map((c) => c.ready()));
    for (const c of golds) c.join(5, TEST_PRESET, { mode: 'ranked', rating: 1400 });
    for (const c of bronzes) c.join(5, TEST_PRESET, { mode: 'ranked', rating: 1000 });
    // Two bands apart: blocked at ±1 while the wait is short.
    await new Promise((r) => setTimeout(r, 1200));
    for (const c of [...golds, ...bronzes]) expect(c.messages.some((m) => m.type === 'match_start')).toBe(false);
    // Once the widen threshold passes, the ±2 window opens and all 10 match.
    await Promise.all([...golds, ...bronzes].map((c) => c.waitFor((m) => m.some((x) => x.type === 'match_start'), 15000)));
    for (const c of [...golds, ...bronzes]) c.close();
  }, 30000);

  it('queues a party of 2 for unranked 2v2 together on the same team', async () => {
    server = await startGameServer(0, { allowUnauthenticated: true, botThinkMs: 5, botFillWaitMs: 2000, matchCountdownMs: 5 });
    const url = `ws://127.0.0.1:${server.port}`;
    const leader = new TestClient(url, 'pl_a');
    const member = new TestClient(url, 'pm_a');
    const opp = new TestClient(url, 'po_a');
    await Promise.all([leader.ready(), member.ready(), opp.ready()]);
    leader.hello();
    member.hello();
    leader.createParty();
    await leader.waitFor((m) => m.some((x) => x.type === 'party_update'));
    const partyId = leader.partyId()!;
    leader.inviteTo('pm_a');
    await member.waitFor((m) => m.some((x) => x.type === 'party_invite'));
    member.acceptParty(partyId);
    await member.waitFor((m) => m.some((x) => x.type === 'party_update'));

    // The leader queues the WHOLE party; a solo opponent fills the other side + bots.
    leader.join(2, TEST_PRESET, { mode: 'unranked', partyId });
    opp.join(2, TEST_PRESET);
    await Promise.all([
      leader.waitFor((m) => m.some((x) => x.type === 'match_start'), 20000),
      member.waitFor((m) => m.some((x) => x.type === 'match_start'), 20000),
      opp.waitFor((m) => m.some((x) => x.type === 'match_start'), 20000),
    ]);

    const ld = leader.messages.find((m): m is Extract<ServerMessage, { type: 'match_start' }> => m.type === 'match_start')!;
    const md = member.messages.find((m): m is Extract<ServerMessage, { type: 'match_start' }> => m.type === 'match_start')!;
    const od = opp.messages.find((m): m is Extract<ServerMessage, { type: 'match_start' }> => m.type === 'match_start')!;
    expect(ld.yourTeam).toBe(md.yourTeam); // party members share a team
    expect(ld.yourTeam).not.toBe(od.yourTeam); // opponent on the other side
    // party(2) + solo(1) = 3 real players -> 1 bot fills the 4th 2v2 slot
    expect(Object.keys(leader.match!.combatants).length).toBe(4);
    expect(Object.values(leader.match!.combatants).filter((c) => c.isBot).length).toBe(1);
    leader.close();
    member.close();
    opp.close();
  }, 30000);

  it('queues a party of 3 for unranked 5v5 and bot-fills the other 7 slots', async () => {
    server = await startGameServer(0, { allowUnauthenticated: true, botThinkMs: 5, botFillWaitMs: 1500, matchCountdownMs: 5 });
    const url = `ws://127.0.0.1:${server.port}`;
    const leader = new TestClient(url, 'pl5');
    const m1 = new TestClient(url, 'pm5a');
    const m2 = new TestClient(url, 'pm5b');
    await Promise.all([leader.ready(), m1.ready(), m2.ready()]);
    leader.hello();
    m1.hello();
    m2.hello();
    leader.createParty();
    await leader.waitFor((m) => m.some((x) => x.type === 'party_update'));
    const partyId = leader.partyId()!;
    leader.inviteTo('pm5a');
    leader.inviteTo('pm5b');
    await m1.waitFor((m) => m.some((x) => x.type === 'party_invite'));
    await m2.waitFor((m) => m.some((x) => x.type === 'party_invite'));
    m1.acceptParty(partyId);
    m2.acceptParty(partyId);
    await m1.waitFor((m) => m.some((x) => x.type === 'party_update'));
    await m2.waitFor((m) => m.some((x) => x.type === 'party_update'));

    leader.join(5, TEST_PRESET, { mode: 'unranked', partyId });
    await Promise.all([
      leader.waitFor((m) => m.some((x) => x.type === 'match_start'), 25000),
      m1.waitFor((m) => m.some((x) => x.type === 'match_start'), 25000),
      m2.waitFor((m) => m.some((x) => x.type === 'match_start'), 25000),
    ]);
    const ld = leader.messages.find((m): m is Extract<ServerMessage, { type: 'match_start' }> => m.type === 'match_start')!;
    const m1d = m1.messages.find((m): m is Extract<ServerMessage, { type: 'match_start' }> => m.type === 'match_start')!;
    const m2d = m2.messages.find((m): m is Extract<ServerMessage, { type: 'match_start' }> => m.type === 'match_start' )!;
    expect(ld.yourTeam).toBe(m1d.yourTeam);
    expect(ld.yourTeam).toBe(m2d.yourTeam);
    expect(Object.keys(leader.match!.combatants).length).toBe(10); // 3 real + 7 bots
    expect(Object.values(leader.match!.combatants).filter((c) => c.isBot).length).toBe(7);
    leader.close();
    m1.close();
    m2.close();
  }, 40000);

  it('rejects a ranked party whose member is 2 rank bands from the leader', async () => {
    server = await startGameServer(0, { allowUnauthenticated: true, botThinkMs: 5, botFillWaitMs: 2000, matchCountdownMs: 5 });
    const url = `ws://127.0.0.1:${server.port}`;
    const leader = new TestClient(url, 'plr'); // bronze (1000)
    const member = new TestClient(url, 'pmr');
    await Promise.all([leader.ready(), member.ready()]);
    leader.hello();
    member.hello();
    leader.createParty();
    await leader.waitFor((m) => m.some((x) => x.type === 'party_update'));
    const partyId = leader.partyId()!;
    member.rating = 1400; // gold — two bands above bronze
    leader.inviteTo('pmr');
    await member.waitFor((m) => m.some((x) => x.type === 'party_invite'));
    member.acceptParty(partyId);
    await member.waitFor((m) => m.some((x) => x.type === 'party_update'));

    leader.join(5, TEST_PRESET, { mode: 'ranked', partyId });
    await leader.waitFor((m) => m.some((x) => x.type === 'error'));
    const err = leader.messages.find((m): m is Extract<ServerMessage, { type: 'error' }> => m.type === 'error');
    expect(err!.message).toContain('±1');
    // Nothing was queued.
    await new Promise((r) => setTimeout(r, 800));
    expect(leader.messages.some((m) => m.type === 'match_start')).toBe(false);
    leader.close();
    member.close();
  }, 30000);

  it('queues a ranked 5v5 party and matches opponents around the leader rank', async () => {
    server = await startGameServer(0, { allowUnauthenticated: true, botThinkMs: 5, botFillWaitMs: 2000, matchCountdownMs: 5 });
    const url = `ws://127.0.0.1:${server.port}`;
    const leader = new TestClient(url, 'plq');
    const member = new TestClient(url, 'pmq');
    const solos = Array.from({ length: 8 }, (_, i) => new TestClient(url, `poq_${i}`));
    await Promise.all([leader.ready(), member.ready(), ...solos.map((c) => c.ready())]);
    leader.hello();
    member.hello();
    leader.createParty();
    await leader.waitFor((m) => m.some((x) => x.type === 'party_update'));
    const partyId = leader.partyId()!;
    leader.inviteTo('pmq');
    await member.waitFor((m) => m.some((x) => x.type === 'party_invite'));
    member.acceptParty(partyId);
    await member.waitFor((m) => m.some((x) => x.type === 'party_update'));

    // Party of 2 queues ranked 5v5; 8 solos fill the remaining 8 slots (all real, no bots).
    leader.join(5, TEST_PRESET, { mode: 'ranked', partyId });
    for (const c of solos) c.join(5, TEST_PRESET, { mode: 'ranked', rating: 1000 });
    await Promise.all([leader, member, ...solos].map((c) => c.waitFor((m) => m.some((x) => x.type === 'match_start'), 20000)));
    const ld = leader.messages.find((m): m is Extract<ServerMessage, { type: 'match_start' }> => m.type === 'match_start')!;
    const md = member.messages.find((m): m is Extract<ServerMessage, { type: 'match_start' }> => m.type === 'match_start')!;
    expect(ld.yourTeam).toBe(md.yourTeam); // party on one team
    // Solos fill the party's empty slots on the same team, and form the enemy team.
    const soloTeams = solos.map((c) => c.messages.find((m): m is Extract<ServerMessage, { type: 'match_start' }> => m.type === 'match_start')!.yourTeam);
    expect(soloTeams.some((t) => t === ld.yourTeam)).toBe(true);
    expect(soloTeams.some((t) => t !== ld.yourTeam)).toBe(true);
    // 10 real players, zero bots on the ranked board.
    expect(Object.keys(leader.match!.combatants).length).toBe(10);
    expect(Object.values(leader.match!.combatants).filter((c) => !c.isBot).length).toBe(10);
    for (const c of [leader, member, ...solos]) c.close();
  }, 30000);

  it('keeps waiting for real players when someone new joins during the search window', async () => {
    server = await startGameServer(0, { allowUnauthenticated: true, botThinkMs: 5, botFillWaitMs: 3000, matchCountdownMs: 5 });
    const url = `ws://127.0.0.1:${server.port}`;
    const first = new TestClient(url, 'first');
    await first.ready();
    first.join(2, TEST_PRESET);

    // One player alone must NOT trigger a 2v2 match (queue keeps searching)
    await new Promise((r) => setTimeout(r, 1200));
    expect(first.messages.some((m) => m.type === 'match_start')).toBe(false);

    // A second real player joins inside the search window -> match starts with 2 real players
    const second = new TestClient(url, 'second');
    await second.ready();
    second.join(2, TEST_PRESET);
    await Promise.all([
      first.waitFor((m) => m.some((x) => x.type === 'match_start'), 15000),
      second.waitFor((m) => m.some((x) => x.type === 'match_start'), 15000),
    ]);
    expect(Object.keys(first.match!.combatants).length).toBe(4); // 2v2 full board
    expect(Object.values(first.match!.combatants).filter((c) => c.isBot).length).toBe(2); // 2 real + 2 bots
    first.close();
    second.close();
  }, 30000);

  it('blocks party matchmaking until every member readies up (ready check)', async () => {
    server = await startGameServer(0, { allowUnauthenticated: true, botThinkMs: 5, botFillWaitMs: 1500, matchCountdownMs: 5 });
    const url = `ws://127.0.0.1:${server.port}`;
    const leader = new TestClient(url, 'rr_l');
    const member = new TestClient(url, 'rr_m');
    await Promise.all([leader.ready(), member.ready()]);
    leader.hello();
    member.hello();
    leader.createParty();
    await leader.waitFor((m) => m.some((x) => x.type === 'party_update'));
    const partyId = leader.partyId()!;
    leader.inviteTo('rr_m');
    await member.waitFor((m) => m.some((x) => x.type === 'party_invite'));
    member.acceptParty(partyId);
    await member.waitFor((m) => m.some((x) => x.type === 'party_update'));

    // Member opts out of the ready check -> leader cannot queue.
    member.setReady(false);
    await leader.waitFor(
      (m) =>
        m.some(
          (x) =>
            x.type === 'party_update' &&
            x.party.members.find((mm) => mm.playerId === 'rr_m')?.ready === false,
        ),
    );
    leader.join(2, TEST_PRESET, { mode: 'unranked', partyId });
    await leader.waitFor((m) => m.some((x) => x.type === 'error' && x.message.includes('ready')));
    await new Promise((r) => setTimeout(r, 800));
    expect(leader.messages.some((m) => m.type === 'match_start')).toBe(false);

    // Member readies up -> the party can queue and a match forms.
    member.setReady(true);
    await leader.waitFor(
      (m) =>
        m.some(
          (x) =>
            x.type === 'party_update' &&
            x.party.members.find((mm) => mm.playerId === 'rr_m')?.ready === true,
        ),
    );
    leader.join(2, TEST_PRESET, { mode: 'unranked', partyId });
    await Promise.all([
      leader.waitFor((m) => m.some((x) => x.type === 'match_start'), 15000),
      member.waitFor((m) => m.some((x) => x.type === 'match_start'), 15000),
    ]);
    expect(leader.yourIds.length).toBeGreaterThan(0);
    leader.close();
    member.close();
  }, 30000);

  it('fills a party\'s empty slots with real players, not bots', async () => {
    server = await startGameServer(0, { allowUnauthenticated: true, botThinkMs: 5, botFillWaitMs: 2000, matchCountdownMs: 5 });
    const url = `ws://127.0.0.1:${server.port}`;
    const leader = new TestClient(url, 'rf_l');
    const member = new TestClient(url, 'rf_m');
    const solo1 = new TestClient(url, 'rf_s1');
    const solo2 = new TestClient(url, 'rf_s2');
    await Promise.all([leader.ready(), member.ready(), solo1.ready(), solo2.ready()]);
    leader.hello();
    member.hello();
    leader.createParty();
    await leader.waitFor((m) => m.some((x) => x.type === 'party_update'));
    const partyId = leader.partyId()!;
    leader.inviteTo('rf_m');
    await member.waitFor((m) => m.some((x) => x.type === 'party_invite'));
    member.acceptParty(partyId);
    await member.waitFor((m) => m.some((x) => x.type === 'party_update'));

    // Party of 2 queues 5v5; two solos queue right after -> the solos fill the
    // party's empty slots (same team) instead of the party facing bot slots.
    leader.join(5, TEST_PRESET, { mode: 'unranked', partyId });
    solo1.join(5, TEST_PRESET);
    solo2.join(5, TEST_PRESET);
    await Promise.all([
      leader.waitFor((m) => m.some((x) => x.type === 'match_start'), 15000),
      member.waitFor((m) => m.some((x) => x.type === 'match_start'), 15000),
      solo1.waitFor((m) => m.some((x) => x.type === 'match_start'), 15000),
      solo2.waitFor((m) => m.some((x) => x.type === 'match_start'), 15000),
    ]);
    const ld = leader.messages.find((m): m is Extract<ServerMessage, { type: 'match_start' }> => m.type === 'match_start')!;
    const md = member.messages.find((m): m is Extract<ServerMessage, { type: 'match_start' }> => m.type === 'match_start')!;
    const s1d = solo1.messages.find((m): m is Extract<ServerMessage, { type: 'match_start' }> => m.type === 'match_start')!;
    const s2d = solo2.messages.find((m): m is Extract<ServerMessage, { type: 'match_start' }> => m.type === 'match_start' )!;
    // All four real players ended up on the party's team (party + its filled slots).
    expect(ld.yourTeam).toBe(md.yourTeam);
    expect(s1d.yourTeam).toBe(md.yourTeam);
    expect(s2d.yourTeam).toBe(md.yourTeam);
    // 4 real players + 6 bots on the 5v5 board.
    expect(Object.keys(leader.match!.combatants).length).toBe(10);
    expect(Object.values(leader.match!.combatants).filter((c) => !c.isBot).length).toBe(4);
    leader.close();
    member.close();
    solo1.close();
    solo2.close();
  }, 30000);

  it('pulls the whole party out of the queue when a member readies down mid-queue', async () => {
    server = await startGameServer(0, { allowUnauthenticated: true, botThinkMs: 5, botFillWaitMs: 5000, matchCountdownMs: 5 });
    const url = `ws://127.0.0.1:${server.port}`;
    const leader = new TestClient(url, 'rq_l');
    const member = new TestClient(url, 'rq_m');
    await Promise.all([leader.ready(), member.ready()]);
    leader.hello();
    member.hello();
    leader.createParty();
    await leader.waitFor((m) => m.some((x) => x.type === 'party_update'));
    const partyId = leader.partyId()!;
    leader.inviteTo('rq_m');
    await member.waitFor((m) => m.some((x) => x.type === 'party_invite'));
    member.acceptParty(partyId);
    await member.waitFor((m) => m.some((x) => x.type === 'party_update'));

    // Party queues 5v5 (needs 10 — will NOT match within the test window).
    leader.join(5, TEST_PRESET, { mode: 'unranked', partyId });
    await member.waitFor((m) => m.some((x) => x.type === 'queue_update'));

    // Member readies down while queued -> the whole party is pulled out and
    // everyone is told they left the queue (even though the queue may still
    // have other players, the removed members must clear their UI).
    member.setReady(false);
    await Promise.all([
      leader.waitFor((m) => m.some((x) => x.type === 'queue_left')),
      member.waitFor((m) => m.some((x) => x.type === 'queue_left')),
    ]);
    // No match can form while the party is unready.
    await new Promise((r) => setTimeout(r, 1200));
    expect(leader.messages.some((m) => m.type === 'match_start')).toBe(false);
    expect(member.messages.some((m) => m.type === 'match_start')).toBe(false);
    leader.close();
    member.close();
  }, 30000);

  it('sends a match-found countdown before the arena starts', async () => {
    server = await startGameServer(0, { allowUnauthenticated: true, botThinkMs: 5, botFillWaitMs: 1000, matchCountdownMs: 300 });
    const url = `ws://127.0.0.1:${server.port}`;
    const a = new TestClient(url, 'cd_a');
    const b = new TestClient(url, 'cd_b');
    await Promise.all([a.ready(), b.ready()]);
    a.join(1, TEST_PRESET);
    b.join(1, TEST_PRESET);

    await Promise.all([
      a.waitFor((m) => m.some((x) => x.type === 'match_found')),
      b.waitFor((m) => m.some((x) => x.type === 'match_found')),
    ]);
    const found = a.messages.find((m): m is Extract<ServerMessage, { type: 'match_found' }> => m.type === 'match_found')!;
    expect(found.mode).toBe('unranked');
    expect(found.teamSize).toBe(1);
    expect(found.countdownMs).toBe(300);
    const foundAt = Date.now();

    // The arena must NOT start before the countdown elapses.
    await new Promise((r) => setTimeout(r, 100));
    expect(a.messages.some((m) => m.type === 'match_start')).toBe(false);
    expect(a.messages.some((m) => m.type === 'match_state')).toBe(false);

    await Promise.all([
      a.waitFor((m) => m.some((x) => x.type === 'match_start'), 10000),
      b.waitFor((m) => m.some((x) => x.type === 'match_start'), 10000),
    ]);
    // match_found arrives strictly before match_start.
    expect(a.messages.findIndex((m) => m.type === 'match_found')).toBeLessThan(a.messages.findIndex((m) => m.type === 'match_start'));
    expect(Date.now() - foundAt).toBeGreaterThanOrEqual(250);
    a.close();
    b.close();
  }, 30000);

  it('plays an uneven custom 2v1 lobby match: no bots, normalized to the chosen rank', async () => {
    server = await startGameServer(0, { allowUnauthenticated: true, botThinkMs: 5, botFillWaitMs: 2000, matchCountdownMs: 5 });
    const url = `ws://127.0.0.1:${server.port}`;
    const leader = new TestClient(url, 'cu_l');
    const m1 = new TestClient(url, 'cu_m1');
    const m2 = new TestClient(url, 'cu_m2');
    await Promise.all([leader.ready(), m1.ready(), m2.ready()]);
    leader.hello();
    m1.hello();
    m2.hello();
    leader.createCustomLobby();
    await leader.waitFor((m) => m.some((x) => x.type === 'custom_update'));
    const lobbyId = leader.lobbyId()!;
    leader.inviteCustomTo('cu_m1');
    leader.inviteCustomTo('cu_m2');
    await m1.waitFor((m) => m.some((x) => x.type === 'custom_invite'));
    await m2.waitFor((m) => m.some((x) => x.type === 'custom_invite'));
    m1.acceptCustom(lobbyId);
    m2.acceptCustom(lobbyId);
    await m1.waitFor((m) => m.some((x) => x.type === 'custom_update'));
    await m2.waitFor((m) => m.some((x) => x.type === 'custom_update'));

    // Leader + m1 on Team A, m2 on Team B (2v1), gold normalization.
    leader.setCustomTeam('cu_m2', 1);
    leader.setCustomNorm('gold');
    await leader.waitFor(
      (m) =>
        m.some(
          (x) =>
            x.type === 'custom_update' &&
            x.lobby.norm === 'gold' &&
            x.lobby.members.find((mm) => mm.playerId === 'cu_m2')?.team === 1,
        ),
    );
    leader.startCustom();
    await Promise.all([
      leader.waitFor((m) => m.some((x) => x.type === 'match_start'), 15000),
      m1.waitFor((m) => m.some((x) => x.type === 'match_start'), 15000),
      m2.waitFor((m) => m.some((x) => x.type === 'match_start'), 15000),
    ]);

    const ld = leader.messages.find((m): m is Extract<ServerMessage, { type: 'match_start' }> => m.type === 'match_start')!;
    const m1d = m1.messages.find((m): m is Extract<ServerMessage, { type: 'match_start' }> => m.type === 'match_start')!;
    const m2d = m2.messages.find((m): m is Extract<ServerMessage, { type: 'match_start' }> => m.type === 'match_start')!;
    expect(ld.yourTeam).toBe(m1d.yourTeam);
    expect(ld.yourTeam).not.toBe(m2d.yourTeam);
    expect(leader.match!.mode).toBe('custom');
    // Uneven 2v1 board, every slot a real player.
    expect(Object.keys(leader.match!.combatants).length).toBe(3);
    expect(Object.values(leader.match!.combatants).filter((c) => c.isBot).length).toBe(0);
    // The countdown carried the real team sizes.
    const found = leader.messages.find((m): m is Extract<ServerMessage, { type: 'match_found' }> => m.type === 'match_found')!;
    expect(found.mode).toBe('custom');
    expect(found.teamA).toBe(2);
    expect(found.teamB).toBe(1);
    // Gold budget: both players use the same preset, so their normalized+
    // budget stats are identical (and above the unranked reference).
    const meL = Object.values(leader.match!.combatants).find((c) => c.playerId === 'cu_l')!;
    const meM2 = Object.values(leader.match!.combatants).find((c) => c.playerId === 'cu_m2')!;
    expect(meL.maxHp).toBe(meM2.maxHp);
    expect(meL.initiative).toBe(meM2.initiative);
    // Gold budget: attack is raised over the normalized base (HP has no budget).
    expect(meL.attack).toBe(meM2.attack);
    expect(meL.attack).toBeGreaterThan(20); // gold adds +18 attack over normalized base
    leader.close();
    m1.close();
    m2.close();
  }, 30000);

  it('enforces custom lobby rules: leader-only start, party & queue conflicts', async () => {
    server = await startGameServer(0, { allowUnauthenticated: true, botThinkMs: 5, botFillWaitMs: 2000, matchCountdownMs: 5 });
    const url = `ws://127.0.0.1:${server.port}`;
    const leader = new TestClient(url, 'cx_l');
    const member = new TestClient(url, 'cx_m');
    await Promise.all([leader.ready(), member.ready()]);
    leader.hello();
    member.hello();

    // A party member cannot create a custom lobby.
    leader.createParty();
    await leader.waitFor((m) => m.some((x) => x.type === 'party_update'));
    leader.createCustomLobby();
    await leader.waitFor((m) => m.some((x) => x.type === 'error' && x.message.includes('party')));
    leader.leaveParty();
    await new Promise((r) => setTimeout(r, 300));

    // Create a lobby, invite + accept the member.
    leader.createCustomLobby();
    await leader.waitFor((m) => m.some((x) => x.type === 'custom_update'));
    const lobbyId = leader.lobbyId()!;
    leader.inviteCustomTo('cx_m');
    await member.waitFor((m) => m.some((x) => x.type === 'custom_invite'));
    member.acceptCustom(lobbyId);
    await member.waitFor((m) => m.some((x) => x.type === 'custom_update'));

    // A regular member cannot start the match.
    member.startCustom();
    await member.waitFor((m) => m.some((x) => x.type === 'error' && x.message.includes('leader')));

    // A queued player cannot create a lobby.
    member.leaveCustom(lobbyId);
    await new Promise((r) => setTimeout(r, 300));
    member.join(1, TEST_PRESET);
    await member.waitFor((m) => m.some((x) => x.type === 'queue_update'));
    member.createCustomLobby();
    await member.waitFor((m) => m.some((x) => x.type === 'error' && x.message.includes('queue')));

    // The lobby cannot start with fewer than one player per team.
    leader.startCustom();
    await leader.waitFor((m) => m.some((x) => x.type === 'error' && x.message.includes('each team')));
    await new Promise((r) => setTimeout(r, 500));
    expect(leader.messages.some((m) => m.type === 'match_start')).toBe(false);
    leader.close();
    member.close();
  }, 30000);

  it('rejects unauthenticated sockets in strict mode (no dev fallback)', async () => {
    // No allowUnauthenticated here — this is the real (accounts-only) mode.
    server = await startGameServer(0, { botThinkMs: 5, botFillWaitMs: 2000, matchCountdownMs: 5 });
    const url = `ws://127.0.0.1:${server.port}`;

    // A tokenless hello is rejected outright.
    const anon = new TestClient(url, 'anon');
    await anon.ready();
    anon.hello();
    await anon.waitFor((m) => m.some((x) => x.type === 'error' && x.message.includes('Not signed in')));

    // Without a successful hello, an identity-bearing message (join_queue) is
    // rejected too — a client can never claim a player id it isn't authed as.
    anon.join(1, TEST_PRESET);
    await anon.waitFor((m) => m.filter((x) => x.type === 'error').length >= 2);
    const errs = anon.messages.filter((m): m is Extract<ServerMessage, { type: 'error' }> => m.type === 'error');
    expect(errs.every((e) => e.message.includes('Not signed in'))).toBe(true);
    expect(anon.messages.some((m) => m.type === 'queue_update')).toBe(false);

    // A fabricated token is rejected too.
    const imposter = new TestClient(url, 'imposter');
    await imposter.ready();
    imposter.ws.send(JSON.stringify({ type: 'hello', playerId: 'someone_else', name: 'x', accessToken: 'fake.token' }));
    await imposter.waitFor((m) => m.some((x) => x.type === 'error' && x.message.includes('Session expired')));

    anon.close();
    imposter.close();
  }, 20000);
});
