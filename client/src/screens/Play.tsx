import { useEffect, useState } from 'react';
import { usePlayer, getActivePreset } from '../state/store';
import { useParty, queueParty } from '../state/party';
import { CustomPanel } from '../components/CustomPanel';
import { PartyPanel } from '../components/PartyPanel';
import { sendMessage, subscribeMessages, useWsStatus, connectSocket } from '../services/ws';
import { MATCHMAKING_BOT_FILL_WAIT_MS, RANKED_UNLOCK_LEVEL, RANKED_WINDOW_WIDEN_AFTER_MS } from '../../../shared/src/constants';
import { isRankedUnlocked, rankForRating, rankStatusText } from '../../../shared/src/progression';
import { RATING_BANDS, tierForRating } from '../../../shared/src/rating';
import type { PvpMode } from '../../../shared/src/types';
import { BackButton } from '../components/BackButton';
import {
  Button,
  Chip,
  Col,
  Kicker,
  ModeCard,
  ModeDesc,
  ModeGrid,
  ModeIcon,
  ModeTitle,
  Panel,
  Row,
  Screen,
  ScreenHead,
  ScreenTitle,
  Spinner,
  Tiny,
  TwoCol,
} from '../ui/glass';

export function Play(props: {
  onStartPractice: () => void;
  onBack: () => void;
}) {
  const player = usePlayer();
  const status = useWsStatus();
  const { party } = useParty();
  const [queue, setQueue] = useState<null | { teamSize: 1 | 2 | 5; count: number; mode: PvpMode; queuedSince: number }>(null);
  const [now, setNow] = useState(() => Date.now());
  const activePreset = getActivePreset();
  const ranked = rankForRating(player.rank.rating);
  const partySize = party ? party.members.length : 0;
  const inParty = partySize > 0;
  const inQueue = queue !== null;

  // Live clock for the queue wait timer (ticked while queued).
  useEffect(() => {
    if (!inQueue) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [inQueue]);

  // Subscribe to queue updates while on this screen.
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
          if (!q && inParty) return { teamSize: msg.teamSize, count: msg.queued, mode: msg.mode, queuedSince };
          return q;
        });
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

  const leaderTier = party ? tierForRating(player.rank.rating) : 0;
  const leaderBand = party ? RATING_BANDS[leaderTier] : null;
  const unreadyMembers = party ? party.members.filter((m) => !m.ready) : [];
  const allReady = unreadyMembers.length === 0;
  const unreadyNames = unreadyMembers.map((m) => m.name).join(', ');

  // Queue status block shown inside the mode card the player queued in.
  function queueStatus(mode: PvpMode) {
    if (!queue || queue.mode !== mode) return null;
    const elapsed = Math.max(0, Math.floor((now - queue.queuedSince) / 1000));
    const waitMs = Math.max(0, RANKED_WINDOW_WIDEN_AFTER_MS - (now - queue.queuedSince));
    const widenIn = Math.ceil(waitMs / 1000);
    const widened = waitMs === 0;
    return (
      <Col style={{ textAlign: 'center', padding: '8px 0', gap: 10 }}>
        <Row center gap={10}>
          <Spinner />
          <b>
            Searching {queue.teamSize}v{queue.teamSize}…{inParty ? ` (party of ${partySize})` : ''}
          </b>
        </Row>
        <Tiny>
          {mode === 'ranked'
            ? `${queue.count} player${queue.count === 1 ? '' : 's'} waiting — ${elapsed}s${widened ? ' · window widened to ±2 (no bots)' : ` · widening to ±2 in ${widenIn}s`}`
            : `${queue.count} player${queue.count === 1 ? '' : 's'} waiting — ${elapsed}s · bots only if none join after ~${Math.round(MATCHMAKING_BOT_FILL_WAIT_MS / 1000)}s`}
        </Tiny>
        <Button variant="danger" size="sm" onClick={leaveQueue}>Cancel</Button>
      </Col>
    );
  }

  return (
    <Screen>
      <ScreenHead>
        <div>
          <Kicker>Choose your battlefield</Kicker>
          <ScreenTitle>Play</ScreenTitle>
        </div>
        <Row>
          <Chip title="Active preset">Preset · {activePreset.name}</Chip>
          <BackButton onBack={props.onBack} />
        </Row>
      </ScreenHead>

      <ModeGrid>
        {/* ============ PRACTICE ============ */}
        <ModeCard>
          <ModeIcon>🥊</ModeIcon>
          <ModeTitle>Practice</ModeTitle>
          <ModeDesc>
            Fight a single NPC to test builds, warm up, or earn coins and XP without queueing. Your real
            build, normal rewards, no upgrades to buy.
          </ModeDesc>
          <Button variant="primary" size="lg" onClick={props.onStartPractice}>
            ⚔ Fight NPC
          </Button>
          <Tiny>Uses your active preset at full stats — a safe sandbox for new builds.</Tiny>
        </ModeCard>

        {/* ============ UNRANKED ============ */}
        <ModeCard>
          <ModeIcon>⚔</ModeIcon>
          <ModeTitle>Unranked</ModeTitle>
          <ModeDesc>
            Server-authoritative, normalized stats. Test your build against real players — empty slots fill
            with <b>real players</b> from the queue; bots only if no one joins after ~
            {Math.round(MATCHMAKING_BOT_FILL_WAIT_MS / 1000)}s.
          </ModeDesc>
          {queueStatus('unranked') ?? (
            <>
              <Row wrap>
                {([1, 2, 5] as const).map((ts) => {
                  const tooBig = inParty && partySize > ts;
                  const notReady = inParty && !allReady;
                  return (
                    <Button
                      key={ts}
                      size="lg"
                      disabled={status !== 'connected' || tooBig || notReady || (inQueue && queue.mode !== 'unranked')}
                      title={
                        status !== 'connected'
                          ? 'Server offline — start it with npm run dev'
                          : inQueue && queue.mode !== 'unranked'
                            ? 'Already in the ranked queue — cancel first'
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
              {status !== 'connected' && (
                <Tiny style={{ display: 'block', marginTop: 4 }}>
                  Server offline — PvP needs it running (<code>npm run dev</code>). Practice still works.
                </Tiny>
              )}
            </>
          )}
        </ModeCard>

        {/* ============ RANKED ============ */}
        <ModeCard>
          <ModeIcon>🏆</ModeIcon>
          <ModeTitle>Ranked</ModeTitle>
          {isRankedUnlocked(player.level) ? (
            <>
              <ModeDesc>
                <span style={{ color: ranked.color, fontWeight: 700 }}>{ranked.name.toUpperCase()}</span> ·{' '}
                {rankStatusText(player.rank)}. Win to gain RP, lose to drop. No bots — you face players
                within ±1 rank, widening to ±2 after ~{Math.round(RANKED_WINDOW_WIDEN_AFTER_MS / 1000)}s of
                waiting.
                {inParty && leaderBand ? ` Ranked party rule: everyone within ±1 rank of the leader (${leaderBand.name}).` : ''}
              </ModeDesc>
              {queueStatus('ranked') ?? (
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
                        disabled={status !== 'connected' || needsExact || tooBig || notReady || (inQueue && queue.mode !== 'ranked')}
                        title={
                          status !== 'connected'
                            ? 'Server offline'
                            : inQueue && queue.mode !== 'ranked'
                              ? 'Already in the unranked queue — cancel first'
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
              )}
            </>
          ) : (
            <>
              <ModeDesc>
                <span style={{ color: 'var(--warn)', fontWeight: 700 }}>🔒 LOCKED</span> — reach Level{' '}
                {RANKED_UNLOCK_LEVEL} to unlock ranked play and ranked stat upgrades. You are Level{' '}
                {player.level}. Earn XP in practice & unranked — levels keep climbing forever.
              </ModeDesc>
              <Button variant="primary" size="lg" disabled title={`Reach Level ${RANKED_UNLOCK_LEVEL} to unlock ranked`}>
                🔒 Locked · Level {RANKED_UNLOCK_LEVEL} required
              </Button>
            </>
          )}
        </ModeCard>
      </ModeGrid>

      {/* ============ CUSTOM + PARTY ============ */}
      <TwoCol>
        <CustomPanel />
        <PartyPanel />
      </TwoCol>

      {/* ============ ACTIVE PRESET BAR ============ */}
      <Panel style={{ marginTop: 16 }}>
        <Row between>
          <div>
            <Kicker style={{ marginBottom: 4 }}>Active preset</Kicker>
            <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {activePreset.name}
            </div>
          </div>
          <Tiny style={{ textAlign: 'right' }}>
            {Object.values(activePreset.slots).filter(Boolean).length} / 9 slots filled · edit in the
            Build section
          </Tiny>
        </Row>
      </Panel>
    </Screen>
  );
}
