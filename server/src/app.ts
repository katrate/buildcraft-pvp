import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import type { ClientMessage, QueueRequest } from '../../shared/src/types';
import { RATING_BANDS, tierForRating } from '../../shared/src/rating';
import { MatchManager } from './matches';
import { MatchmakingQueue } from './queue';
import { PartyManager } from './party';
import { CustomLobbyManager } from './custom';
import { validatePreset } from './validation';

export interface GameServer {
  httpServer: http.Server;
  wss: WebSocketServer;
  matches: MatchManager;
  queue: MatchmakingQueue;
  partyManager: PartyManager;
  customManager: CustomLobbyManager;
  port: number;
  close: () => Promise<void>;
}

export function startGameServer(port = 8787, opts?: { botThinkMs?: number; botFillWaitMs?: number; rankWidenAfterMs?: number; matchCountdownMs?: number }): Promise<GameServer> {
  const matches = new MatchManager(opts?.botThinkMs ?? 1100, opts?.matchCountdownMs);

  const httpServer = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/health') {
      res.end(JSON.stringify({ ok: true, server: 'buildcraft-pvp', time: Date.now() }));
      return;
    }
    res.end(JSON.stringify({ ok: true, name: 'BuildCraft PvP server', port }));
  });

  const wss = new WebSocketServer({ server: httpServer });
  const queue = new MatchmakingQueue(matches, opts?.botFillWaitMs, opts?.rankWidenAfterMs);
  const partyManager = new PartyManager(queue);
  const customManager = new CustomLobbyManager(partyManager);

  // playerId -> active socket
  const sockets = new Map<string, WebSocket>();

  wss.on('connection', (ws) => {
    let boundPlayerId: string | null = null;

    const send = (msg: unknown) => {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
    };

    ws.on('message', (raw) => {
      let msg: ClientMessage;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        send({ type: 'error', message: 'Invalid message.' });
        return;
      }

      switch (msg.type) {
        case 'hello': {
          boundPlayerId = msg.playerId;
          partyManager.register(msg.playerId, msg.name.slice(0, 24), ws);
          break;
        }
        case 'create_party': {
          if (customManager.lobbyOf(msg.playerId)) {
            send({ type: 'error', message: 'Leave your custom lobby before creating a party.' });
            break;
          }
          const pv = validatePreset(msg.preset);
          if (!pv.valid) {
            send({ type: 'error', message: pv.error ?? 'Invalid preset.' });
            break;
          }
          const party = partyManager.createParty(msg.playerId, {
            preset: msg.preset,
            initiativeUpgrade: msg.initiativeUpgrade,
            rankedUpgrades: msg.rankedUpgrades,
            rating: msg.rating,
          });
          if (party) {
            partyManager.broadcastInfo(party);
          }
          break;
        }
        case 'party_invite': {
          const res = partyManager.invite(msg.playerId, msg.targetName, msg.targetPlayerId);
          if (!res.ok) send({ type: 'error', message: res.error ?? 'Invite failed.' });
          break;
        }
        case 'party_accept': {
          if (customManager.lobbyOf(msg.playerId)) {
            send({ type: 'error', message: 'Leave your custom lobby before joining a party.' });
            break;
          }
          const pv = validatePreset(msg.preset);
          if (!pv.valid) {
            send({ type: 'error', message: pv.error ?? 'Invalid preset.' });
            break;
          }
          const ok = partyManager.accept(msg.playerId, msg.partyId, {
            preset: msg.preset,
            initiativeUpgrade: msg.initiativeUpgrade,
            rankedUpgrades: msg.rankedUpgrades,
            rating: msg.rating,
          });
          if (!ok) send({ type: 'error', message: 'Could not join the party (invite expired?).' });
          break;
        }
        case 'party_decline': {
          partyManager.decline(msg.playerId, msg.partyId);
          break;
        }
        case 'party_leave': {
          partyManager.leave(msg.playerId);
          break;
        }
        case 'party_kick': {
          const res = partyManager.kick(msg.playerId, msg.partyId, msg.targetId);
          if (!res.ok) send({ type: 'error', message: res.error ?? 'Kick failed.' });
          break;
        }
        case 'party_setup': {
          const pv = validatePreset(msg.preset);
          if (!pv.valid) {
            send({ type: 'error', message: pv.error ?? 'Invalid preset.' });
            break;
          }
          partyManager.setSetup(msg.playerId, {
            preset: msg.preset,
            initiativeUpgrade: msg.initiativeUpgrade,
            rankedUpgrades: msg.rankedUpgrades,
            rating: msg.rating,
          });
          break;
        }
        case 'party_set_ready': {
          partyManager.setReady(msg.playerId, !!msg.ready);
          break;
        }
        case 'player_lookup': {
          const found = partyManager.findByName(msg.name);
          send({
            type: 'player_lookup_result',
            name: msg.name,
            playerId: found?.playerId ?? '',
            online: !!found,
          });
          break;
        }
        case 'custom_create': {
          if (partyManager.isInParty(msg.playerId)) {
            send({ type: 'error', message: 'Leave your party before creating a custom lobby.' });
            break;
          }
          if (queue.isQueued(msg.playerId)) {
            send({ type: 'error', message: 'Leave the queue before creating a custom lobby.' });
            break;
          }
          const pv = validatePreset(msg.preset);
          if (!pv.valid) {
            send({ type: 'error', message: pv.error ?? 'Invalid preset.' });
            break;
          }
          const lobby = customManager.create(msg.playerId, {
            preset: msg.preset,
            initiativeUpgrade: msg.initiativeUpgrade,
            rankedUpgrades: msg.rankedUpgrades,
            rating: msg.rating,
          });
          if (lobby) customManager.broadcast(customManager.getLobby(lobby.lobbyId)!);
          break;
        }
        case 'custom_invite': {
          const res = customManager.invite(msg.playerId, msg.targetName, msg.targetPlayerId);
          if (!res.ok) send({ type: 'error', message: res.error ?? 'Invite failed.' });
          break;
        }
        case 'custom_accept': {
          if (partyManager.isInParty(msg.playerId)) {
            send({ type: 'error', message: 'Leave your party before joining a custom lobby.' });
            break;
          }
          if (queue.isQueued(msg.playerId)) {
            send({ type: 'error', message: 'Leave the queue before joining a custom lobby.' });
            break;
          }
          const pv = validatePreset(msg.preset);
          if (!pv.valid) {
            send({ type: 'error', message: pv.error ?? 'Invalid preset.' });
            break;
          }
          const ok = customManager.accept(msg.playerId, msg.lobbyId, {
            preset: msg.preset,
            initiativeUpgrade: msg.initiativeUpgrade,
            rankedUpgrades: msg.rankedUpgrades,
            rating: msg.rating,
          });
          if (!ok) send({ type: 'error', message: 'Could not join the lobby (invite expired?).' });
          break;
        }
        case 'custom_decline': {
          customManager.decline(msg.playerId, msg.lobbyId);
          break;
        }
        case 'custom_leave': {
          customManager.leave(msg.playerId);
          break;
        }
        case 'custom_kick': {
          const res = customManager.kick(msg.playerId, msg.lobbyId, msg.targetId);
          if (!res.ok) send({ type: 'error', message: res.error ?? 'Kick failed.' });
          break;
        }
        case 'custom_team': {
          const res = customManager.setTeam(msg.playerId, msg.lobbyId, msg.targetId, msg.team);
          if (!res.ok) send({ type: 'error', message: res.error ?? 'Team assign failed.' });
          break;
        }
        case 'custom_norm': {
          const res = customManager.setNorm(msg.playerId, msg.lobbyId, msg.norm);
          if (!res.ok) send({ type: 'error', message: res.error ?? 'Normalization change failed.' });
          break;
        }
        case 'custom_setup': {
          const pv = validatePreset(msg.preset);
          if (!pv.valid) {
            send({ type: 'error', message: pv.error ?? 'Invalid preset.' });
            break;
          }
          customManager.setSetup(msg.playerId, {
            preset: msg.preset,
            initiativeUpgrade: msg.initiativeUpgrade,
            rankedUpgrades: msg.rankedUpgrades,
            rating: msg.rating,
          });
          break;
        }
        case 'custom_start': {
          const lobby = customManager.getLobby(msg.lobbyId);
          if (!lobby) {
            send({ type: 'error', message: 'Lobby not found.' });
            break;
          }
          if (lobby.leaderId !== msg.playerId) {
            send({ type: 'error', message: 'Only the lobby leader can start the match.' });
            break;
          }
          const members = [...lobby.members.values()];
          const team0 = members.filter((m) => m.team === 0);
          const team1 = members.filter((m) => m.team === 1);
          if (members.length < 2 || team0.length < 1 || team1.length < 1) {
            send({ type: 'error', message: 'Custom matches need at least one player on each team.' });
            break;
          }
          for (const m of members) {
            if (!partyManager.socketOf(m.playerId)) {
              send({ type: 'error', message: `${m.name} is offline — they cannot play.` });
              break;
            }
            if (!m.setup?.preset?.slots) {
              send({ type: 'error', message: `${m.name} has not submitted a build — ask them to open the Play screen.` });
              break;
            }
            if (matches.getMatchIdByPlayer(m.playerId)) {
              send({ type: 'error', message: `${m.name} is in a match.` });
              break;
            }
          }
          // Re-validate after the per-member loop (a break above may have fired).
          const stillValid = members.every(
            (m) => partyManager.socketOf(m.playerId) && m.setup?.preset?.slots && !matches.getMatchIdByPlayer(m.playerId),
          );
          if (!stillValid) break;
          const ordered = [...team0, ...team1].map((m) => ({
            playerId: m.playerId,
            name: m.name,
            ws: partyManager.socketOf(m.playerId)!,
            preset: m.setup!.preset,
            initiativeUpgrade: 0, // custom is fully normalized — no initiative spend
            rankedUpgrades: {},
            rating: m.setup!.rating ?? 1000,
          }));
          const teams: number[][] = [
            team0.map((_, i) => i),
            team1.map((_, i) => team0.length + i),
          ];
          customManager.disband(msg.lobbyId);
          console.log(`[custom] ${msg.playerId} started a ${team0.length}v${team1.length} custom match (norm: ${lobby.norm})`);
          matches.createMatch(ordered, 5, 'custom', teams, { fillBots: false, customNorm: lobby.norm });
          break;
        }
        case 'join_queue': {
          const req = msg as QueueRequest;
          if (customManager.lobbyOf(req.playerId)) {
            send({ type: 'error', message: 'Leave your custom lobby before joining a queue.' });
            return;
          }
          const validation = validatePreset(req.preset);
          if (!validation.valid) {
            send({ type: 'error', message: validation.error ?? 'Invalid preset.' });
            return;
          }
          if (![1, 2, 5].includes(req.teamSize)) {
            send({ type: 'error', message: 'Invalid team size.' });
            return;
          }
          const mode = req.mode ?? 'unranked';
          if (mode !== 'unranked' && mode !== 'ranked') {
            send({ type: 'error', message: 'Invalid match mode.' });
            return;
          }
          // Ranked is competitive: 5v5 ONLY (no 1v1/2v2), and it never fills
          // with bots — every slot must be a real player within the rank window.
          if (mode === 'ranked' && req.teamSize !== 5) {
            send({ type: 'error', message: 'Ranked is 5v5 only.' });
            return;
          }
          if (matches.getMatchIdByPlayer(req.playerId)) {
            matches.reconnect(req.playerId, ws);
            return;
          }
          boundPlayerId = req.playerId;

          // ---------------- party queue (leader queues for everyone) ----------------
          if (req.partyId) {
            const party = partyManager.getParty(req.partyId);
            if (!party || !party.members.has(req.playerId)) {
              send({ type: 'error', message: 'Party not found — leave and rejoin the party.' });
              return;
            }
            // Re-queueing: drop any stale copy of this party unit first so it can
            // never accumulate duplicate members or split across teams.
            queue.leaveParty(req.partyId);
            // Refresh the leader's stored setup with the freshest data from this request.
            partyManager.setSetup(req.playerId, {
              preset: req.preset,
              initiativeUpgrade: req.initiativeUpgrade,
              rankedUpgrades: req.rankedUpgrades,
              rating: req.rating,
            });
            const members = [...party.members.values()];
            const creator = party.members.get(party.leaderId)!;
            const creatorTier = tierForRating(creator.setup.rating ?? 1000);
            if (mode === 'ranked' && members.length > req.teamSize) {
              send({ type: 'error', message: `Party of ${members.length} is too large for ranked ${req.teamSize}v${req.teamSize}.` });
              return;
            }
            if (mode === 'unranked' && members.length > req.teamSize) {
              send({ type: 'error', message: `Party of ${members.length} is too large for ${req.teamSize}v${req.teamSize} — pick a bigger team size.` });
              return;
            }
            if (!partyManager.allReady(party)) {
              const unready = members.filter((m) => !m.ready).map((m) => m.name);
              send({ type: 'error', message: `Waiting for ${unready.join(', ')} to ready up before matchmaking.` });
              return;
            }
            for (const m of members) {
              if (!partyManager.socketOf(m.playerId)) {
                send({ type: 'error', message: `${m.name} is offline — they cannot queue.` });
                return;
              }
              if (!m.setup?.preset?.slots) {
                send({ type: 'error', message: `${m.name} has not submitted a build — ask them to open the Play screen.` });
                return;
              }
              if (mode === 'ranked') {
                const memberTier = tierForRating(m.setup.rating ?? 1000);
                if (Math.abs(memberTier - creatorTier) > 1) {
                  send({
                    type: 'error',
                    message: `${m.name} is ${RATING_BANDS[memberTier].name} but the leader is ${RATING_BANDS[creatorTier].name} — ranked parties need everyone within ±1 rank of the leader.`,
                  });
                  return;
                }
              }
              if (matches.getMatchIdByPlayer(m.playerId)) {
                send({ type: 'error', message: `${m.name} is in a match.` });
                return;
              }
            }
            for (const m of members) {
              queue.join(mode, req.teamSize, {
                playerId: m.playerId,
                name: m.name,
                ws: partyManager.socketOf(m.playerId)!,
                preset: m.setup.preset,
                initiativeUpgrade: m.setup.initiativeUpgrade ?? 0,
                rankedUpgrades: m.setup.rankedUpgrades ?? {},
                rating: m.setup.rating ?? 1000,
                partyId: req.partyId,
                anchorTier: creatorTier,
              });
            }
            break;
          }

          // ---------------- solo queue ----------------
          sockets.set(req.playerId, ws);
          queue.join(mode, req.teamSize, {
            playerId: req.playerId,
            name: req.name,
            ws,
            preset: req.preset,
            initiativeUpgrade: Math.max(0, Math.floor(req.initiativeUpgrade ?? 0)),
            rankedUpgrades: {
              attack: Math.max(0, Math.floor(req.rankedUpgrades?.attack ?? 0)),
              defense: Math.max(0, Math.floor(req.rankedUpgrades?.defense ?? 0)),
            },
            rating: Math.max(0, Math.min(9999, Math.round(req.rating ?? 1000))),
          });
          send({
            type: 'queue_update',
            queued: queue.size(mode, req.teamSize),
            teamSize: req.teamSize,
            mode,
            minPlayers: req.teamSize,
            queuedSince: queue.oldestSince(mode, req.teamSize),
          });
          break;
        }
        case 'leave_queue': {
          if (msg.partyId) queue.leaveParty(msg.partyId);
          else queue.leave(msg.playerId);
          break;
        }
        case 'player_action': {
          matches.onAction(msg.matchId, msg.playerId, msg.action);
          break;
        }
        case 'rejoin': {
          const ok = matches.reconnect(msg.playerId, ws);
          if (!ok) send({ type: 'error', message: 'No active match found.' });
          else sockets.set(msg.playerId, ws);
          break;
        }
      }
    });

    ws.on('close', () => {
      if (boundPlayerId) {
        queue.leave(boundPlayerId);
        matches.handleDisconnect(boundPlayerId, ws);
        partyManager.unregister(boundPlayerId, ws);
        // V1: a disconnected player leaves their party + custom lobby
        // (both are session-scoped).
        partyManager.leave(boundPlayerId);
        customManager.leave(boundPlayerId);
        if (sockets.get(boundPlayerId) === ws) sockets.delete(boundPlayerId);
      }
    });

    ws.on('error', () => {
      /* ignore socket errors */
    });

    send({ type: 'welcome', serverTime: Date.now(), ping: 0 });
  });

  return new Promise((resolve) => {
    httpServer.listen(port, () => {
      const address = httpServer.address();
      const actualPort = typeof address === 'object' && address ? address.port : port;
      console.log(`[server] BuildCraft PvP listening on ws://0.0.0.0:${actualPort}`);
      resolve({
        httpServer,
        wss,
        matches,
        queue,
        partyManager,
        customManager,
        port: actualPort,
        close: () =>
          new Promise<void>((done) => {
            queue.shutdown();
            for (const ws of wss.clients) ws.close();
            wss.close();
            httpServer.close(() => done());
          }),
      });
    });
  });
}
