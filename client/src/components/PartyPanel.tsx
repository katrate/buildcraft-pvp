import { useEffect, useState } from 'react';
import { usePlayer, addFriend, removeFriend } from '../state/store';
import {
  useParty,
  createParty,
  inviteFriend,
  acceptInvite,
  declineInvite,
  leaveParty,
  kickMember,
  setReady,
} from '../state/party';
import { sendMessage, subscribeMessages, useWsStatus } from '../services/ws';
import { Button, Chip, Col, Divider, Input, Panel, PanelTitle, Row, Tiny, UpgradeRow } from '../ui/glass';

export function PartyPanel() {
  const player = usePlayer();
  const status = useWsStatus();
  const { party, invites, lastLookup } = useParty();
  const [friendName, setFriendName] = useState('');

  const inParty = party !== null;
  const partySize = inParty ? party.members.length : 0;
  const unreadyMembers = inParty ? party.members.filter((m) => !m.ready) : [];
  const allReady = unreadyMembers.length === 0;
  const unreadyNames = unreadyMembers.map((m) => m.name).join(', ');

  // Friend lookups are resolved by the server on this screen.
  useEffect(() => {
    return subscribeMessages((msg) => {
      if (msg.type === 'player_lookup_result' && msg.online) {
        addFriend({ playerId: msg.playerId, name: msg.name });
      }
    });
  }, []);

  function addFriendByName(): void {
    const name = friendName.trim();
    if (!name) return;
    sendMessage({ type: 'player_lookup', name });
    setFriendName('');
  }

  return (
    <Panel>
      <Row between>
        <PanelTitle style={{ margin: 0 }}>Party & Friends</PanelTitle>
        <Tiny>
          {status === 'connected' ? '● online — invite by name' : '○ server offline — parties need the server'}
        </Tiny>
      </Row>

      {invites.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          {invites.map((inv) => (
            <UpgradeRow key={inv.partyId}>
              <div>
                <b>{inv.fromName}</b> invited you to a party
              </div>
              <Row gap={8}>
                <Button variant="primary" onClick={() => acceptInvite(inv.partyId)}>Join</Button>
                <Button onClick={() => declineInvite(inv.partyId)}>Decline</Button>
              </Row>
            </UpgradeRow>
          ))}
        </div>
      )}

      {inParty ? (
        <Col gap={6}>
          <Tiny>
            Party of {partySize}/5 · leader: {party!.members.find((m) => m.isLeader)?.name ?? '?'}
          </Tiny>
          {party!.members.map((m) => (
            <UpgradeRow key={m.playerId}>
              <div>
                <b>{m.name}</b>
                {m.isLeader && <Chip tone="good" style={{ marginLeft: 8 }}>leader</Chip>}
                {m.playerId === player.playerId && <Tiny style={{ marginLeft: 8 }}>you</Tiny>}
                <Chip
                  tone={m.ready ? 'good' : 'offline'}
                  style={{ marginLeft: 8 }}
                  title={m.ready ? 'Ready for matchmaking' : 'Not ready — matchmaking is blocked'}
                >
                  {m.ready ? '✓ ready' : '⏳ not ready'}
                </Chip>
              </div>
              <Row gap={8}>
                {m.playerId === player.playerId && (
                  <Button
                    size="sm"
                    variant={m.ready ? 'default' : 'primary'}
                    onClick={() => setReady(!m.ready)}
                  >
                    {m.ready ? 'Not ready' : 'Ready'}
                  </Button>
                )}
                {party!.leaderId === player.playerId && !m.isLeader && (
                  <Button variant="ghost" size="sm" onClick={() => kickMember(m.playerId)}>Kick</Button>
                )}
              </Row>
            </UpgradeRow>
          ))}
          {!allReady && (
            <Tiny style={{ color: 'var(--warn)' }}>
              ⏳ Waiting for {unreadyNames} to ready up before matchmaking can start. Everyone is ready by
              default — toggle off to pause the party.
            </Tiny>
          )}
          <Tiny>
            Queue buttons on the mode cards queue your <b>whole party</b> together once everyone is ready.
            Ranked is <b>5v5 with real players only</b> — everyone within ±1 rank of the leader, and parties
            under 5 fill their empty slots with real players from the queue (no bots in ranked).
          </Tiny>
          <Row gap={8}>
            <Button variant="danger" onClick={leaveParty}>Leave Party</Button>
          </Row>
        </Col>
      ) : (
        <Col gap={6}>
          <Button variant="primary" style={{ alignSelf: 'flex-start' }} onClick={createParty}>
            Create Party
          </Button>
          <Tiny>Invite friends below — the invite button creates a party if you don't have one.</Tiny>
        </Col>
      )}

      <Divider />
      <Row gap={8} style={{ marginBottom: 8 }}>
        <Input
          placeholder="Friend's pilot name (must be online)"
          value={friendName}
          onChange={(e) => setFriendName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') addFriendByName();
          }}
          style={{ flex: 1 }}
        />
        <Button onClick={addFriendByName}>Add friend</Button>
      </Row>
      {lastLookup && (
        <Tiny style={{ display: 'block', marginBottom: 6 }}>
          {lastLookup.online
            ? `✓ "${lastLookup.name}" added to friends.`
            : `✗ "${lastLookup.name}" is not online — V1 friends must be online to add.`}
        </Tiny>
      )}
      {player.friends.length === 0 ? (
        <Tiny>No friends yet — add your friend's pilot name above (they must be online in the same server).</Tiny>
      ) : (
        <Col gap={6}>
          {player.friends.map((f) => (
            <UpgradeRow key={f.playerId}>
              <div>
                <b>{f.name}</b>
                <Tiny style={{ marginLeft: 8 }}>friend</Tiny>
              </div>
              <Row gap={8}>
                <Button onClick={() => inviteFriend(f.playerId)} title="Invite to your party (creates one if needed; friend must be online)">
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
