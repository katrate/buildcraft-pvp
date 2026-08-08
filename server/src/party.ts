import { WebSocket } from 'ws';
import type {
  PartyInfo,
  PartyMemberData,
  PartySetup,
  ServerMessage,
} from '../../shared/src/types';
import type { MatchmakingQueue } from './queue';

// ------------------------------------------------------------
// PartyManager
//
// V1 parties are session-scoped (no accounts): a player is "online"
// while their WebSocket is connected. The manager tracks:
//   - online players (id -> name + socket), for invites by name
//   - parties (leader + members), each member carrying the setup they
//     submitted (preset, upgrades, rating) so the leader can queue the
//     WHOLE party in one click.
//   - pending invites
//
// Ranked rule (enforced by app.ts at queue time): every party member
// must be within ±1 rank band of the party creator, and the enemy team
// is matched around the creator's rank.
// ------------------------------------------------------------

interface OnlinePlayer {
  playerId: string;
  name: string;
  ws: WebSocket;
}

interface Party {
  id: string;
  leaderId: string;
  members: Map<string, PartyMemberData>;
  invites: Map<string, { fromId: string; fromName: string }>;
  createdAt: number;
}

export class PartyManager {
  private online = new Map<string, OnlinePlayer>();
  private parties = new Map<string, Party>();
  private partyByPlayer = new Map<string, string>();

  constructor(private queue: MatchmakingQueue) {}

  // ---------------- presence ----------------

  register(playerId: string, name: string, ws: WebSocket): void {
    this.online.set(playerId, { playerId, name, ws });
  }

  unregister(playerId: string, ws: WebSocket): void {
    if (this.online.get(playerId)?.ws === ws) this.online.delete(playerId);
  }

  isOnline(playerId: string): boolean {
    return this.online.has(playerId);
  }

  socketOf(playerId: string): WebSocket | null {
    return this.online.get(playerId)?.ws ?? null;
  }

  nameOf(playerId: string): string | undefined {
    return this.online.get(playerId)?.name;
  }

  findByName(name: string): OnlinePlayer | undefined {
    const q = name.trim().toLowerCase();
    if (!q) return undefined;
    for (const p of this.online.values()) {
      if (p.name.toLowerCase() === q) return p;
    }
    return undefined;
  }

  /** Which of the given player ids are currently connected (friend presence). */
  onlineSubset(ids: string[]): string[] {
    return ids.filter((id) => this.online.has(id));
  }

  // ---------------- parties ----------------

  getPartyOf(playerId: string): Party | undefined {
    const id = this.partyByPlayer.get(playerId);
    return id ? this.parties.get(id) : undefined;
  }

  getParty(partyId: string): Party | undefined {
    return this.parties.get(partyId);
  }

  isInParty(playerId: string): boolean {
    return this.partyByPlayer.has(playerId);
  }

  createParty(playerId: string, setup: PartySetup): PartyInfo | null {
    if (this.partyByPlayer.has(playerId)) {
      // Already in a party — just report it back.
      const existing = this.getPartyOf(playerId)!;
      return this.info(existing);
    }
    const name = this.online.get(playerId)?.name ?? playerId;
    const party: Party = {
      id: `party_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      leaderId: playerId,
      members: new Map(),
      invites: new Map(),
      createdAt: Date.now(),
    };
    party.members.set(playerId, { playerId, name, isLeader: true, ready: true, setup });
    this.parties.set(party.id, party);
    this.partyByPlayer.set(playerId, party.id);
    return this.info(party);
  }

  invite(fromId: string, targetName?: string, targetPlayerId?: string): { ok: boolean; error?: string } {
    const party = this.getPartyOf(fromId);
    if (!party) return { ok: false, error: 'You are not in a party.' };
    const from = party.members.get(fromId);
    const target = targetPlayerId ? this.online.get(targetPlayerId) : targetName ? this.findByName(targetName) : undefined;
    if (!target) return { ok: false, error: `"${targetName ?? targetPlayerId}" is not online.` };
    if (target.playerId === fromId) return { ok: false, error: 'You cannot invite yourself.' };
    if (this.partyByPlayer.has(target.playerId)) return { ok: false, error: `${target.name} is already in a party.` };
    if (party.members.size >= 5) return { ok: false, error: 'A party can hold up to 5 players.' };
    party.invites.set(target.playerId, { fromId, fromName: from?.name ?? 'Someone' });
    this.send(target.ws, { type: 'party_invite', partyId: party.id, fromId, fromName: from?.name ?? 'Someone' });
    return { ok: true };
  }

  accept(playerId: string, partyId: string, setup: PartySetup): boolean {
    const party = this.parties.get(partyId);
    if (!party) return false;
    const invite = party.invites.get(playerId);
    if (!invite) return false;
    const player = this.online.get(playerId);
    if (!player) return false;
    if (party.members.size >= 5) return false;
    party.invites.delete(playerId);
    party.members.set(playerId, { playerId, name: player.name, isLeader: false, ready: true, setup });
    this.partyByPlayer.set(playerId, partyId);
    this.broadcast(party);
    return true;
  }

  decline(playerId: string, partyId: string): void {
    const party = this.parties.get(partyId);
    party?.invites.delete(playerId);
  }

  leave(playerId: string): void {
    const party = this.getPartyOf(playerId);
    if (!party) return;
    party.members.delete(playerId);
    this.partyByPlayer.delete(playerId);
    // A party in the queue is a unit — pull the whole party out when anyone leaves.
    this.queue.leaveParty(party.id);
    if (party.members.size === 0) {
      this.parties.delete(party.id);
      return;
    }
    if (party.leaderId === playerId) {
      // Leadership transfers to the first remaining member (oldest join).
      const next = [...party.members.values()][0];
      party.leaderId = next.playerId;
      next.isLeader = true;
    }
    this.broadcast(party);
  }

  kick(leaderId: string, partyId: string, targetId: string): { ok: boolean; error?: string } {
    const party = this.parties.get(partyId);
    if (!party) return { ok: false, error: 'Party not found.' };
    if (party.leaderId !== leaderId) return { ok: false, error: 'Only the leader can kick members.' };
    if (targetId === leaderId) return { ok: false, error: 'The leader cannot kick themselves.' };
    if (!party.members.has(targetId)) return { ok: false, error: 'Not a member.' };
    party.members.delete(targetId);
    this.partyByPlayer.delete(targetId);
    this.queue.leaveParty(partyId);
    // Tell the kicked player they are out.
    const kickedWs = this.online.get(targetId)?.ws;
    if (kickedWs) this.send(kickedWs, { type: 'party_disbanded', partyId });
    if (party.members.size === 0) {
      this.parties.delete(partyId);
      return { ok: true };
    }
    this.broadcast(party);
    return { ok: true };
  }

  setSetup(playerId: string, setup: PartySetup): void {
    const party = this.getPartyOf(playerId);
    const member = party?.members.get(playerId);
    if (member) member.setup = setup;
  }

  /**
   * Ready check: everyone must be ready (default true) before the leader can
   * queue. Toggling UNready while the party is in the queue pulls the whole
   * party out (a party is one indivisible unit).
   */
  setReady(playerId: string, ready: boolean): void {
    const party = this.getPartyOf(playerId);
    const member = party?.members.get(playerId);
    if (!party || !member || member.ready === ready) return;
    member.ready = ready;
    if (!ready) this.queue.leaveParty(party.id);
    this.broadcast(party);
  }

  /** True when every member has readied up. */
  allReady(party: Party): boolean {
    return [...party.members.values()].every((m) => m.ready);
  }

  // ---------------- helpers ----------------

  info(party: Party): PartyInfo {
    return {
      partyId: party.id,
      leaderId: party.leaderId,
      members: [...party.members.values()].map((m) => ({ playerId: m.playerId, name: m.name, isLeader: m.isLeader, ready: m.ready })),
    };
  }

  broadcast(party: Party): void {
    this.broadcastInfo(this.info(party));
  }

  /** Send the current party snapshot to every member (by playerId). */
  broadcastInfo(info: PartyInfo): void {
    const msg: ServerMessage = { type: 'party_update', party: info };
    for (const m of info.members) {
      const ws = this.online.get(m.playerId)?.ws;
      if (ws) this.send(ws, msg);
    }
  }

  private send(ws: WebSocket | null, msg: ServerMessage): void {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }
}
