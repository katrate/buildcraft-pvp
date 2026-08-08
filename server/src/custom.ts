import { WebSocket } from 'ws';
import type {
  CustomLobbyInfo,
  CustomMemberData,
  CustomNorm,
  PartySetup,
  ServerMessage,
} from '../../shared/src/types';
import type { PartyManager } from './party';

// ------------------------------------------------------------
// CustomLobbyManager
//
// Custom matches are friend lobbies with NO matchmaking rules:
//   - 1v1 .. 5v5, any uneven split (a 2v5 is allowed)
//   - no bots — every slot is a real player (up to 10)
//   - stats are fully normalized; the leader picks the norm level
//     (unranked 'standard' or a rank budget: iron..supreme)
//   - the leader assigns players to Team A / Team B, then starts
//
// Presence is shared with the PartyManager (online registry + invites
// by name). A player can be in a party OR a custom lobby, never both
// (enforced by app.ts) — and cannot be queued while in a lobby.
// ------------------------------------------------------------

const MAX_LOBBY = 10; // 5v5

interface CustomLobby {
  id: string;
  leaderId: string;
  norm: CustomNorm;
  members: Map<string, CustomMemberData>;
  invites: Map<string, { fromId: string; fromName: string }>;
}

const NORMS: CustomNorm[] = [
  'standard', 'iron', 'bronze', 'silver', 'gold', 'platinum', 'diamond', 'divine', 'supreme',
];

export class CustomLobbyManager {
  private lobbies = new Map<string, CustomLobby>();
  private lobbyByPlayer = new Map<string, string>();

  constructor(private party: PartyManager) {}

  // ---------------- lookup ----------------

  lobbyOf(playerId: string): CustomLobby | undefined {
    const id = this.lobbyByPlayer.get(playerId);
    return id ? this.lobbies.get(id) : undefined;
  }

  getLobby(lobbyId: string): CustomLobby | undefined {
    return this.lobbies.get(lobbyId);
  }

  // ---------------- lifecycle ----------------

  create(playerId: string, setup: PartySetup): CustomLobbyInfo | null {
    const existing = this.lobbyOf(playerId);
    if (existing) return this.info(existing);
    const name = this.party.nameOf(playerId) ?? playerId;
    const lobby: CustomLobby = {
      id: `custom_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      leaderId: playerId,
      norm: 'standard',
      members: new Map(),
      invites: new Map(),
    };
    lobby.members.set(playerId, { playerId, name, isLeader: true, team: 0, setup });
    this.lobbies.set(lobby.id, lobby);
    this.lobbyByPlayer.set(playerId, lobby.id);
    return this.info(lobby);
  }

  invite(fromId: string, targetName?: string, targetPlayerId?: string): { ok: boolean; error?: string } {
    const lobby = this.lobbyOf(fromId);
    if (!lobby) return { ok: false, error: 'You are not in a custom lobby.' };
    const from = lobby.members.get(fromId);
    let target: { playerId: string; name: string; ws: WebSocket } | undefined;
    if (targetPlayerId) {
      const name = this.party.nameOf(targetPlayerId);
      const ws = this.party.socketOf(targetPlayerId);
      if (name && ws) target = { playerId: targetPlayerId, name, ws };
    } else if (targetName) {
      const found = this.party.findByName(targetName);
      if (found) target = { playerId: found.playerId, name: found.name, ws: found.ws };
    }
    if (!target) return { ok: false, error: `"${targetName ?? targetPlayerId}" is not online.` };
    if (target.playerId === fromId) return { ok: false, error: 'You cannot invite yourself.' };
    if (this.lobbyByPlayer.has(target.playerId)) return { ok: false, error: `${target.name} is already in a lobby.` };
    if (lobby.members.size >= MAX_LOBBY) return { ok: false, error: `A custom lobby can hold up to ${MAX_LOBBY} players.` };
    lobby.invites.set(target.playerId, { fromId, fromName: from?.name ?? 'Someone' });
    this.send(target.ws, { type: 'custom_invite', lobbyId: lobby.id, fromId, fromName: from?.name ?? 'Someone' });
    return { ok: true };
  }

  accept(playerId: string, lobbyId: string, setup: PartySetup): boolean {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return false;
    const invite = lobby.invites.get(playerId);
    if (!invite) return false;
    const name = this.party.nameOf(playerId);
    if (!name) return false;
    if (lobby.members.size >= MAX_LOBBY) return false;
    lobby.invites.delete(playerId);
    // New members start on Team A; the leader can move them.
    lobby.members.set(playerId, { playerId, name, isLeader: false, team: 0, setup });
    this.lobbyByPlayer.set(playerId, lobbyId);
    this.broadcast(lobby);
    return true;
  }

  decline(playerId: string, lobbyId: string): void {
    this.lobbies.get(lobbyId)?.invites.delete(playerId);
  }

  leave(playerId: string): void {
    const lobby = this.lobbyOf(playerId);
    if (!lobby) return;
    lobby.members.delete(playerId);
    this.lobbyByPlayer.delete(playerId);
    if (lobby.members.size === 0) {
      this.lobbies.delete(lobby.id);
      return;
    }
    if (lobby.leaderId === playerId) {
      // Leadership transfers to the first remaining member (oldest join).
      const next = [...lobby.members.values()][0];
      lobby.leaderId = next.playerId;
      next.isLeader = true;
    }
    this.broadcast(lobby);
  }

  kick(leaderId: string, lobbyId: string, targetId: string): { ok: boolean; error?: string } {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return { ok: false, error: 'Lobby not found.' };
    if (lobby.leaderId !== leaderId) return { ok: false, error: 'Only the leader can kick players.' };
    if (targetId === leaderId) return { ok: false, error: 'The leader cannot kick themselves.' };
    if (!lobby.members.has(targetId)) return { ok: false, error: 'Not a member.' };
    lobby.members.delete(targetId);
    this.lobbyByPlayer.delete(targetId);
    const kickedWs = this.party.socketOf(targetId);
    if (kickedWs) this.send(kickedWs, { type: 'custom_disbanded', lobbyId });
    if (lobby.members.size === 0) {
      this.lobbies.delete(lobbyId);
      return { ok: true };
    }
    this.broadcast(lobby);
    return { ok: true };
  }

  setTeam(leaderId: string, lobbyId: string, targetId: string, team: 0 | 1): { ok: boolean; error?: string } {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return { ok: false, error: 'Lobby not found.' };
    if (lobby.leaderId !== leaderId) return { ok: false, error: 'Only the leader can assign teams.' };
    const member = lobby.members.get(targetId);
    if (!member) return { ok: false, error: 'Not a member.' };
    member.team = team;
    this.broadcast(lobby);
    return { ok: true };
  }

  setNorm(leaderId: string, lobbyId: string, norm: CustomNorm): { ok: boolean; error?: string } {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return { ok: false, error: 'Lobby not found.' };
    if (lobby.leaderId !== leaderId) return { ok: false, error: 'Only the leader can change normalization.' };
    if (!NORMS.includes(norm)) return { ok: false, error: 'Unknown normalization.' };
    lobby.norm = norm;
    this.broadcast(lobby);
    return { ok: true };
  }

  setSetup(playerId: string, setup: PartySetup): void {
    const lobby = this.lobbyOf(playerId);
    const member = lobby?.members.get(playerId);
    if (member) member.setup = setup;
  }

  /** Remove the lobby entirely (e.g. the match started). */
  disband(lobbyId: string): void {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby) return;
    this.lobbies.delete(lobbyId);
    for (const m of lobby.members.values()) this.lobbyByPlayer.delete(m.playerId);
    for (const m of lobby.members.values()) {
      this.send(this.party.socketOf(m.playerId), { type: 'custom_disbanded', lobbyId });
    }
  }

  // ---------------- info / broadcast ----------------

  info(lobby: CustomLobby): CustomLobbyInfo {
    return {
      lobbyId: lobby.id,
      leaderId: lobby.leaderId,
      norm: lobby.norm,
      members: [...lobby.members.values()].map((m) => ({
        playerId: m.playerId,
        name: m.name,
        isLeader: m.isLeader,
        team: m.team,
      })),
    };
  }

  broadcast(lobby: CustomLobby): void {
    const info = this.info(lobby);
    const msg: ServerMessage = { type: 'custom_update', lobby: info };
    for (const m of info.members) {
      this.send(this.party.socketOf(m.playerId), msg);
    }
  }

  private send(ws: WebSocket | null, msg: ServerMessage): void {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }
}
