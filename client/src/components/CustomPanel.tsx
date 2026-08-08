import { useEffect, useState } from 'react';
import { usePlayer, addFriend, removeFriend } from '../state/store';
import {
  useCustom,
  createCustomLobby,
  inviteCustomByName,
  inviteCustomFriend,
  acceptCustom,
  declineCustom,
  leaveCustomLobby,
  kickCustomMember,
  setCustomTeam,
  setCustomNorm,
  startCustomMatch,
} from '../state/custom';
import { sendMessage, subscribeMessages, useWsStatus } from '../services/ws';
import type { CustomNorm } from '../../../shared/src/types';
import { Button, Chip, Col, Divider, Input, Panel, PanelTitle, P, Row, Tiny, UpgradeRow } from '../ui/glass';

const NORMS: { value: CustomNorm; label: string; hint: string }[] = [
  { value: 'standard', label: 'Standard (unranked)', hint: 'Normalized like unranked — no stat budgets' },
  { value: 'bronze', label: 'Bronze budget', hint: 'Normalized to Bronze-level stats' },
  { value: 'silver', label: 'Silver budget', hint: 'Normalized to Silver-level stats' },
  { value: 'gold', label: 'Gold budget', hint: 'Normalized to Gold-level stats' },
  { value: 'platinum', label: 'Platinum budget', hint: 'Normalized to Platinum-level stats' },
  { value: 'diamond', label: 'Diamond budget', hint: 'Normalized to Diamond-level stats' },
];

const NORM_LABEL: Record<CustomNorm, string> = Object.fromEntries(
  NORMS.map((n) => [n.value, n.label.replace(' (unranked)', '')]),
) as Record<CustomNorm, string>;

export function CustomPanel() {
  const player = usePlayer();
  const status = useWsStatus();
  const { lobby, invites } = useCustom();
  const [friendName, setFriendName] = useState('');

  const inLobby = lobby !== null;
  const leaderId = lobby?.leaderId ?? '';
  const isLeader = inLobby && lobby!.leaderId === player.playerId;
  const team0 = lobby ? lobby.members.filter((m) => m.team === 0) : [];
  const team1 = lobby ? lobby.members.filter((m) => m.team === 1) : [];
  const canStart = !!lobby && lobby.members.length >= 2 && team0.length >= 1 && team1.length >= 1;

  // Lookups initiated here (invite-by-name) are resolved here too, so this
  // panel never depends on another screen being mounted to add the friend.
  useEffect(() => {
    return subscribeMessages((msg) => {
      if (msg.type === 'player_lookup_result' && msg.online) {
        addFriend({ playerId: msg.playerId, name: msg.name });
      }
    });
  }, []);

  function invite(): void {
    const name = friendName.trim();
    if (!name) return;
    sendMessage({ type: 'player_lookup', name });
    setFriendName('');
  }

  return (
    <Panel>
      <Row between>
        <PanelTitle style={{ margin: 0 }}>Custom Match (friends)</PanelTitle>
        <Tiny>
          {inLobby ? '● in a lobby — queueing is paused' : 'No rules, any team sizes'}
        </Tiny>
      </Row>

      {invites.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {invites.map((inv) => (
            <UpgradeRow key={inv.lobbyId}>
              <div>
                <b>{inv.fromName}</b> invited you to a custom match
              </div>
              <Row gap={8}>
                <Button variant="primary" onClick={() => acceptCustom(inv.lobbyId)}>Join</Button>
                <Button onClick={() => declineCustom(inv.lobbyId)}>Decline</Button>
              </Row>
            </UpgradeRow>
          ))}
        </div>
      )}

      {!inLobby ? (
        <Col gap={6}>
          <P style={{ margin: '0 0 6px' }}>
            Create a lobby to fight friends with <b>any rules</b>: 1v1 up to 5v5, uneven teams like{' '}
            <b>2v5</b>, no bots. All stats are normalized — the leader can pick the rank budget so everyone
            fights at the same power level.
          </P>
          <Button
            variant="primary"
            style={{ alignSelf: 'flex-start' }}
            disabled={status !== 'connected' || player.friends.length === 0 && !friendName.trim()}
            onClick={createCustomLobby}
          >
            Create Lobby
          </Button>
          <Tiny>Invite friends below — the invite button creates a lobby if you don't have one.</Tiny>
        </Col>
      ) : (
        <Col gap={8}>
          <Row wrap gap={8}>
            <Chip tone="good">Team A: {team0.length}</Chip>
            <Chip>Team B: {team1.length}</Chip>
            <Chip>Total {lobby!.members.length}/10</Chip>
            <Chip>Norm: {NORM_LABEL[lobby!.norm]}</Chip>
          </Row>

          {/* Normalization (leader) */}
          {isLeader ? (
            <div>
              <Tiny style={{ display: 'block', marginBottom: 4 }}>Normalization level:</Tiny>
              <Row wrap gap={6}>
                {NORMS.map((n) => (
                  <Button
                    key={n.value}
                    size="sm"
                    variant={lobby!.norm === n.value ? 'primary' : 'default'}
                    title={n.hint}
                    onClick={() => setCustomNorm(n.value)}
                  >
                    {n.label}
                  </Button>
                ))}
              </Row>
            </div>
          ) : (
            <Tiny>Normalization: {NORM_LABEL[lobby!.norm]} (set by the leader)</Tiny>
          )}

          <Divider style={{ margin: '6px 0' }} />

          {/* Teams */}
          {([0, 1] as const).map((team) => (
            <div key={team}>
              <Tiny style={{ display: 'block', marginBottom: 4 }}>
                {team === 0 ? '🟦 Team A' : '🟥 Team B'}
              </Tiny>
              {lobby!.members.filter((m) => m.team === team).map((m) => (
                <UpgradeRow key={m.playerId}>
                  <div>
                    <b>{m.name}</b>
                    {m.isLeader && <Chip tone="good" style={{ marginLeft: 8 }}>leader</Chip>}
                    {m.playerId === player.playerId && <Tiny style={{ marginLeft: 8 }}>you</Tiny>}
                  </div>
                  <Row gap={8}>
                    {isLeader && !m.isLeader && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={team === 0}
                          onClick={() => setCustomTeam(m.playerId, 0)}
                        >
                          ← A
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={team === 1}
                          onClick={() => setCustomTeam(m.playerId, 1)}
                        >
                          B →
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => kickCustomMember(m.playerId)}>
                          Kick
                        </Button>
                      </>
                    )}
                  </Row>
                </UpgradeRow>
              ))}
              {lobby!.members.filter((m) => m.team === team).length === 0 && (
                <Tiny>Empty — {isLeader ? 'move players here or invite friends' : 'waiting for players'}.</Tiny>
              )}
            </div>
          ))}

          {isLeader ? (
            <>
              <Button
                variant="primary"
                size="lg"
                disabled={!canStart}
                title={canStart ? 'Start the match (stats normalized to the chosen budget)' : 'Need at least one player on each team'}
                onClick={() => startCustomMatch()}
              >
                Start Match ▶
              </Button>
              <Button variant="danger" onClick={leaveCustomLobby}>Leave Lobby</Button>
            </>
          ) : (
            <Button variant="danger" onClick={leaveCustomLobby}>Leave Lobby</Button>
          )}
        </Col>
      )}

      <Divider />
      <Row gap={8} style={{ marginBottom: 8 }}>
        <Input
          placeholder="Friend's pilot name (must be online)"
          value={friendName}
          onChange={(e) => setFriendName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') invite();
          }}
          style={{ flex: 1, maxWidth: 320 }}
        />
        <Button onClick={invite}>Invite friend</Button>
      </Row>
      {player.friends.length === 0 ? (
        <Tiny>No friends yet — add a pilot name above (they must be online in the same server).</Tiny>
      ) : (
        <Col gap={6}>
          {player.friends.map((f) => (
            <UpgradeRow key={f.playerId}>
              <div>
                <b>{f.name}</b>
                <Tiny style={{ marginLeft: 8 }}>friend</Tiny>
              </div>
              <Row gap={8}>
                <Button
                  onClick={() => inviteCustomFriend(f.playerId)}
                  title="Invite to your custom lobby (creates one if needed; friend must be online)"
                >
                  Invite
                </Button>
                <Button variant="ghost" onClick={() => removeFriend(f.playerId)}>Remove</Button>
              </Row>
            </UpgradeRow>
          ))}
        </Col>
      )}
    </Panel>
  );
}
