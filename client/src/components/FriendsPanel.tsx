import { useEffect, useState } from 'react';
import { usePlayer } from '../state/store';
import {
  acceptFriendRequest,
  cancelFriendRequest,
  clearFriendNotice,
  declineFriendRequest,
  refreshPresence,
  removeFriend,
  sendFriendRequest,
  useFriends,
} from '../state/friends';
import { inviteFriend } from '../state/party';
import { socketOpen } from '../services/ws';
import { Button, Chip, Col, Divider, Input, Row, Tiny, UpgradeRow } from '../ui/glass';

/**
 * Friends — fully Supabase-driven. Add players by username (no "must be
 * online" requirement anymore), see incoming/outgoing requests, and remove
 * friends. Live online/offline dots come from server presence, refreshed on
 * mount and every few seconds. Party invites still need the friend online
 * (parties are live sessions) — the Invite button is disabled while offline.
 */
export function FriendsPanel() {
  const player = usePlayer();
  const { incoming, outgoing, loading, notice, online } = useFriends();
  const [friendName, setFriendName] = useState('');
  const [busy, setBusy] = useState(false);

  // Keep the online/offline dots fresh: query on mount, then poll while the
  // panel is open (skipping while the socket is down — the mount query covers
  // freshness after a reconnect). Re-queries whenever the friend list changes.
  useEffect(() => {
    refreshPresence();
    const t = setInterval(() => {
      if (socketOpen()) refreshPresence();
    }, 10_000);
    return () => clearInterval(t);
  }, [player.friends.length]);

  // Transient feedback — the notice auto-clears after 5s so it never lingers.
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(clearFriendNotice, 5000);
    return () => clearTimeout(t);
  }, [notice]);

  async function add(): Promise<void> {
    const name = friendName.trim();
    if (!name || busy) return;
    setBusy(true);
    const ok = await sendFriendRequest(name);
    setBusy(false);
    if (ok) setFriendName('');
  }

  return (
    <Col gap={6}>
      <Divider />
      <Row gap={8}>
        <Input
          placeholder="Add friend by username…"
          maxLength={24}
          value={friendName}
          onChange={(e) => setFriendName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void add()}
          style={{ flex: 1 }}
        />
        <Button disabled={busy || !friendName.trim()} onClick={() => void add()}>
          Send request
        </Button>
      </Row>
      {notice && (
        <Tiny style={{ display: 'block', color: notice.ok ? 'var(--good)' : 'var(--bad)' }}>{notice.text}</Tiny>
      )}

      {incoming.length > 0 && (
        <div>
          <Tiny style={{ letterSpacing: '0.14em', marginBottom: 4, display: 'block' }}>INCOMING REQUESTS</Tiny>
          {incoming.map((r) => (
            <UpgradeRow key={r.id}>
              <div>
                <b>{r.sender_name}</b>
                <Tiny style={{ marginLeft: 8 }}>wants to be your friend</Tiny>
              </div>
              <Row gap={8}>
                <Button variant="primary" size="sm" onClick={() => void acceptFriendRequest(r.id)}>
                  Accept
                </Button>
                <Button variant="ghost" size="sm" onClick={() => void declineFriendRequest(r.id)}>
                  Decline
                </Button>
              </Row>
            </UpgradeRow>
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <div>
          <Tiny style={{ letterSpacing: '0.14em', marginBottom: 4, display: 'block' }}>OUTGOING REQUESTS</Tiny>
          {outgoing.map((r) => (
            <UpgradeRow key={r.id}>
              <div>
                <b>{r.receiver_name}</b>
                <Tiny style={{ marginLeft: 8 }}>request pending</Tiny>
              </div>
              <Button variant="ghost" size="sm" onClick={() => void cancelFriendRequest(r.id)}>
                Cancel
              </Button>
            </UpgradeRow>
          ))}
        </div>
      )}

      <Tiny style={{ letterSpacing: '0.14em', marginTop: 4, display: 'block' }}>FRIENDS</Tiny>
      {loading ? (
        <Tiny>Loading friends…</Tiny>
      ) : player.friends.length === 0 ? (
        <Tiny>
          No friends yet — search a username above. Requests and friends sync to your account, so the
          other player doesn't need to be online.
        </Tiny>
      ) : (
        <Col gap={6}>
          {player.friends.map((f) => {
            // null = the server hasn't answered yet — never imply offline.
            const isOnline = online?.includes(f.playerId) ?? false;
            return (
              <UpgradeRow key={f.playerId}>
                <div>
                  <b>{f.name}</b>
                  {online === null ? (
                    <Chip style={{ marginLeft: 8 }}>…</Chip>
                  ) : (
                    <Chip tone={isOnline ? 'good' : 'offline'} style={{ marginLeft: 8 }}>
                      {isOnline ? '● online' : '○ offline'}
                    </Chip>
                  )}
                </div>
                <Row gap={8}>
                  <Button size="sm" disabled={online !== null && !isOnline} onClick={() => inviteFriend(f.playerId)}>
                    Invite
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => void removeFriend(f.playerId)}>
                    Remove
                  </Button>
                </Row>
              </UpgradeRow>
            );
          })}
        </Col>
      )}
    </Col>
  );
}
