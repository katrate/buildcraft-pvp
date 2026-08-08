import { useEffect, useState } from 'react';
import { usePlayer, getActivePreset, ownsItem, addFriend, removeFriend } from '../state/store';
import {
  useParty,
  createParty,
  inviteFriend,
  inviteByName,
  acceptInvite,
  declineInvite,
  leaveParty,
  kickMember,
  queueParty,
  setReady,
} from '../state/party';
import { CustomPanel } from '../components/CustomPanel';
import { sendMessage, subscribeMessages, useWsStatus, connectSocket } from '../services/ws';
import { MATCHMAKING_BOT_FILL_WAIT_MS, RANKED_UNLOCK_LEVEL, RANKED_WINDOW_WIDEN_AFTER_MS } from '../../../shared/src/constants';
import { isRankedUnlocked, rankForRating, rankStatusText } from '../../../shared/src/progression';
import { RATING_BANDS, tierForRating } from '../../../shared/src/rating';
import type { PvpMode } from '../../../shared/src/types';
import { BackButton } from '../components/BackButton';
import { Button, Chip, Col, Divider, Input, Panel, PanelTitle, P, Row, Screen, Spinner, Tiny, UpgradeRow } from '../ui/glass';

export function Play(props: {
  onStartPractice: () => void;
  onBack: () => void;
}) {
  const player = usePlayer();
  const status = useWsStatus();
  const { party, invites, lastLookup } = useParty();
  const [queue, setQueue] = useState<null | { teamSize: 1 | 2 | 5; count: number; mode: PvpMode; queuedSince: number }>(null);
  const [friendName, setFriendName] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const activePreset = getActivePreset();
  const ranked = rankForRating(player.rank.rating);
  const partySize = party ? party.members.length : 0;
  const inParty = partySize > 0;

  // Live clock for the queue wait timer (ticked while queued).
  const inQueue = queue !== null;
  useEffect(() => {
    if (!inQueue) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [inQueue]);

  // Subscribe to queue updates + friend lookup results while on this screen
  // (the party store keeps the server's copy of our build fresh automatically).
  useEffect(() => {
    const unsub = subscribeMessages((msg) => {
      if (msg.type === 'queue_left') {
        setQueue(null); // party broken up / pulled out — stop showing "searching…"
        return;
      }
      if (msg.type === 'queue_update') {
        if (msg.queued === 0) {
          setQueue(null); // we were pulled out (e.g. leader cancelled the party queue)
          return;
        }
        setQueue((q) => {
          const queuedSince = msg.queuedSince ?? q?.queuedSince ?? Date.now();
          if (q && q.teamSize === msg.teamSize && q.mode === msg.mode) {
            return { teamSize: msg.teamSize, count: msg.queued, mode: msg.mode, queuedSince };
          }
          // We were queued by the party leader — adopt whatever queue we're in.
          if (!q && inParty) return { teamSize: msg.teamSize, count: msg.queued, mode: msg.mode, queuedSince };
          return q;
        });
      }
      if (msg.type === 'player_lookup_result' && msg.online) {
        addFriend({ playerId: msg.playerId, name: msg.name });
      }
    });
    return () => {
      unsub();
      // Pull the whole party out of the queue when leaving this screen while queued.
      sendMessage({ type: 'leave_queue', playerId: player.playerId, partyId: party?.partyId ?? undefined });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player.playerId, party?.partyId]);

  function joinQueue(teamSize: 1 | 2 | 5, mode: PvpMode): void {
    connectSocket();
    if (inParty) {
      setQueue({ teamSize, count: 0, mode, queuedSince: Date.now() });
      queueParty(teamSize, mode);
      return;
    }
    setQueue({ teamSize, count: 0, mode, queuedSince: Date.now() });
    sendMessage({
      type: 'join_queue',
      playerId: player.playerId,
      name: player.name,
      teamSize,
      mode,
      preset: activePreset,
      initiativeUpgrade: player.initiativeUpgrade,
      rankedUpgrades: player.rankedUpgrades,
      rating: player.rank.rating,
    });
  }

  function leaveQueue(): void {
    setQueue(null);
    sendMessage({ type: 'leave_queue', playerId: player.playerId, partyId: party?.partyId ?? undefined });
  }

  function addFriendByName(): void {
    const name = friendName.trim();
    if (!name) return;
    connectSocket();
    sendMessage({ type: 'player_lookup', name });
    setFriendName('');
  }

  const leaderTier = party ? tierForRating(player.rank.rating) : 0;
  const leaderBand = party ? RATING_BANDS[leaderTier] : null;
  const unreadyMembers = party ? party.members.filter((m) => !m.ready) : [];
  const allReady = unreadyMembers.length === 0;
  const unreadyNames = unreadyMembers.map((m) => m.name).join(', ');

  return (
    <Screen>
      <Row between>
        <h1 style={{ margin: 0 }}>Play</h1>
        <BackButton onBack={props.onBack} />
      </Row>

      <Row wrap style={{ alignItems: 'stretch' }}>
        {/* PRACTICE */}
        <Panel style={{ flex: 1 }}>
          <PanelTitle>Practice — 1v1 vs NPC</PanelTitle>
          <P style={{ margin: '0 0 12px' }}>
            Fight a single NPC to test builds, warm up, or earn coins and XP without queueing.
            Your real build, normal rewards, no upgrades to buy.
          </P>
          <Button variant="primary" size="lg" onClick={props.onStartPractice}>
            ⚔ Practice (1v1 vs NPC)
          </Button>
          <Tiny style={{ display: 'block', marginTop: 10 }}>
            Uses your active preset at full stats — a safe sandbox to try new builds.
          </Tiny>
        </Panel>

        {/* UNRANKED / RANKED */}
        <Panel style={{ flex: 1 }}>
          <PanelTitle>Unranked PvP</PanelTitle>
          <P style={{ margin: '0 0 12px' }}>
            Server-authoritative, normalized stats. Test your build against real players — 1v1, 2v2, or 5v5.
            Empty slots fill with <b>real players</b> from the queue; bots only appear if no one joins after
            ~{Math.round(MATCHMAKING_BOT_FILL_WAIT_MS / 1000)}s.
          </P>

          {queue ? (
            (() => {
              const elapsed = Math.max(0, Math.floor((now - queue.queuedSince) / 1000));
              const waitMs = Math.max(0, RANKED_WINDOW_WIDEN_AFTER_MS - (now - queue.queuedSince));
              const widenIn = Math.ceil(waitMs / 1000);
              const widened = waitMs === 0;
              return (
                <Col style={{ textAlign: 'center', padding: '12px 0' }}>
                  <Row center gap={10}>
                    <Spinner />
                    <b>
                      In queue for {queue.mode === 'ranked' ? 'RANKED' : 'unranked'} {queue.teamSize}v{queue.teamSize}…{inParty ? ` (party of ${partySize})` : ''}
                    </b>
                  </Row>
                  <Tiny>
                    {queue.mode === 'ranked'
                      ? `${queue.count} player${queue.count === 1 ? '' : 's'} waiting — searching ${elapsed}s${widened ? '… window widened to ±2 (no bots)' : `… widening to ±2 in ${widenIn}s`}`
                      : queue.count >= queue.teamSize * 2
                        ? `Matchmaking — ${queue.count} players ready!`
                        : `${queue.count} player${queue.count === 1 ? '' : 's'} waiting — searching ${elapsed}s… real players fill the empty slots; bots only if none join after ~${Math.round(MATCHMAKING_BOT_FILL_WAIT_MS / 1000)}s`}
                  </Tiny>
                  <Button variant="danger" onClick={leaveQueue}>Cancel</Button>
                </Col>
              );
            })()
          ) : (
            <Row wrap>
              {([1, 2, 5] as const).map((ts) => {
                const tooBig = inParty && partySize > ts;
                const notReady = inParty && !allReady;
                return (
                  <Button
                    key={ts}
                    size="lg"
                    disabled={status !== 'connected' || tooBig || notReady}
                    title={
                      status !== 'connected'
                        ? 'Server offline — start it with npm run dev'
                        : tooBig
                          ? `Party of ${partySize} doesn't fit ${ts}v${ts} — pick a bigger team size`
                          : notReady
                            ? `Waiting for ${unreadyNames} to ready up…`
                            : inParty
                              ? `Queue your whole party (${partySize}) for unranked ${ts}v${ts}`
                              : `Join ${ts}v${ts} unranked queue`
                    }
                    onClick={() => joinQueue(ts, 'unranked')}
                  >
                    {ts}v{ts}
                  </Button>
                );
              })}
            </Row>
          )}
          {status !== 'connected' && (
            <Tiny style={{ display: 'block', marginTop: 8 }}>
              Server offline. PvP and custom matches need the server running (<code>npm run dev</code>).
              You can still practice against the NPC.
            </Tiny>
          )}

          <Divider />
          <Row between style={{ alignItems: 'flex-start' }}>
            <Col gap={8}>
              <Tiny>Ranked PvP</Tiny>
              {isRankedUnlocked(player.level) ? (
                <>
                  <div style={{ fontWeight: 700, color: ranked.color }}>
                    {ranked.name.toUpperCase()} · {rankStatusText(player.rank)}
                  </div>
                  <Tiny>
                    Win to gain RP, lose to drop. No bots — you face players within ±1 rank, widening to ±2
                    after ~{Math.round(RANKED_WINDOW_WIDEN_AFTER_MS / 1000)}s of waiting.
                    {inParty && leaderBand
                      ? ` Ranked party rule: everyone within ±1 rank of the leader (${leaderBand.name}).`
                      : ''}
                  </Tiny>
                  <Row wrap>
                    {([1, 2] as const).map((ts) => {
                      const needsExact = inParty && partySize !== ts;
                      const tooBig = inParty && partySize > 2;
                      const notReady = inParty && !allReady;
                      return (
                        <Button
                          key={ts}
                          size="lg"
                          variant="primary"
                          disabled={status !== 'connected' || needsExact || tooBig || notReady}
                          title={
                            status !== 'connected'
                              ? 'Server offline'
                              : tooBig
                                ? 'Ranked is 1v1 or 2v2 — a party of 3+ cannot queue ranked'
                                : notReady
                                  ? `Waiting for ${unreadyNames} to ready up…`
                                  : needsExact
                                    ? `Ranked needs the whole party in the match — party of ${partySize} queues ranked ${partySize}v${partySize}`
                                    : inParty
                                      ? `Queue your whole party (${partySize}) for ranked ${ts}v${ts}`
                                      : `Join ranked ${ts}v${ts}`
                          }
                          onClick={() => joinQueue(ts, 'ranked')}
                        >
                          Ranked {ts}v{ts}
                        </Button>
                      );
                    })}
                  </Row>
                </>
              ) : (
                <>
                  <div style={{ fontWeight: 700, color: 'var(--warn)' }}>🔒 LOCKED — reach Level {RANKED_UNLOCK_LEVEL}</div>
                  <Tiny>
                    You are Level {player.level}. Earn XP in practice & unranked — levels keep climbing
                    forever, ranked unlocks at {RANKED_UNLOCK_LEVEL}. Or use the{' '}
                    <b>⚡ Instantly Unlock Ranked</b> dev button on the main menu to test ranked now.
                  </Tiny>
                </>
              )}
            </Col>
            <Chip>Lv {player.level} · unlocks {RANKED_UNLOCK_LEVEL}</Chip>
          </Row>
        </Panel>
      </Row>

      {/* CUSTOM MATCH */}
      <CustomPanel />

      {/* PARTY & FRIENDS */}
      <Panel style={{ marginTop: 16 }}>
        <Row between>
          <PanelTitle style={{ margin: 0 }}>🎮 Party & Friends</PanelTitle>
          <Tiny>
            {status === 'connected' ? '● online — friends can be invited by name' : '○ server offline — parties need the server'}
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
                default — you only need to toggle this off to pause the party.
              </Tiny>
            )}
            <Tiny>
              Queue buttons above queue your <b>whole party</b> together once everyone is ready. Ranked parties
              need everyone within ±1 rank of the leader; the enemy team is matched around the leader's rank.
              Empty slots in your team fill with <b>real players</b> from the queue (bots only as a fallback).
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
            style={{ flex: 1, maxWidth: 320 }}
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
                  <Button
                    onClick={() => inviteFriend(f.playerId)}
                    title="Invite to your party (creates one if needed; friend must be online)"
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

      {/* BUILD REMINDER */}
      <Panel style={{ marginTop: 16 }}>
        <Row between>
          <div>
            <Tiny>Active preset</Tiny>
            <div style={{ fontWeight: 700 }}>{activePreset.name}</div>
          </div>
          <Tiny>
            {Object.values(activePreset.slots).filter(Boolean).length} / 9 slots filled ·{' '}
            {ownsItem('powers', 'fire_bolt') ? 'starter kit ready' : 'visit the Store'}
          </Tiny>
        </Row>
      </Panel>
    </Screen>
  );
}
