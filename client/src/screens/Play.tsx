import { useEffect, useState } from 'react';
import { usePlayer, getActivePreset } from '../state/store';
import { useParty, queueParty } from '../state/party';
import { useQueue, setQueue, leaveQueue } from '../state/queue';
import { CustomPanel } from '../components/CustomPanel';
import { PartyPanel } from '../components/PartyPanel';
import { sendMessage, useWsStatus, connectSocket } from '../services/ws';
import { MATCHMAKING_BOT_FILL_WAIT_MS, RANKED_UNLOCK_LEVEL, RANKED_WINDOW_WIDEN_AFTER_MS } from '../../../shared/src/constants';
import { isRankedUnlocked, rankForRating, rankStatusText } from '../../../shared/src/progression';
import { RATING_BANDS, tierForRating } from '../../../shared/src/rating';
import type { PvpMode } from '../../../shared/src/types';
import { BackButton } from '../components/BackButton';
import { I } from '../ui/icons';
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
  // The queue is global (client/src/state/queue.ts) — it survives navigation,
  // and the floating timer on top of every screen shows its status.
  const queue = useQueue();
  const [now, setNow] = useState(() => Date.now());
  const activePreset = getActivePreset();
  const ranked = rankForRating(player.ranks['5v5'].rating);
  const partySize = party ? party.members.length : 0;
  const inParty = partySize > 0;
  const inQueue = queue !== null;

  // Live clock for the queue wait timer (ticked while queued).
  useEffect(() => {
    if (!inQueue) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [inQueue]);

  function joinQueue(teamSize: 1 | 2 | 5, mode: PvpMode): void {
    connectSocket();
    // Each ranked format has its OWN ladder (separate rating + upgrades), so
    // the queue payload carries that format's pool. Unranked ignores both.
    const format: '1v1' | '5v5' = teamSize === 1 ? '1v1' : '5v5';
    const rankedUpgrades = player.rankedUpgrades[format];
    const rating = player.ranks[format].rating;
    setQueue({ teamSize, count: 0, mode, queuedSince: Date.now() });
    if (inParty) {
      queueParty(teamSize, mode);
      return;
    }
    sendMessage({
      type: 'join_queue',
      playerId: player.playerId,
      name: player.name,
      teamSize,
      mode,
      preset: activePreset,
      initiativeUpgrade: player.initiativeUpgrade,
      rankedUpgrades,
      rating,
    });
  }

  // Parties queue the 5v5 ladder — the ±1 rank rule anchors on the leader's
  // 5v5 rank.
  const leaderTier = party ? tierForRating(player.ranks['5v5'].rating) : 0;
  const leaderBand = party ? RATING_BANDS[leaderTier] : null;
  const unreadyMembers = party ? party.members.filter((m) => !m.ready) : [];
  const allReady = unreadyMembers.length === 0;
  // Ranked is 5v5 only — any party up to 5 fits (empty slots fill with real
  // players), so only a party of 6+ is too big for ranked.
  const rankedTooBig = inParty && partySize > 5;
  const rankedNotReady = inParty && !allReady;

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
          <Chip>Preset · {activePreset.name}</Chip>
          <BackButton onBack={props.onBack} />
        </Row>
      </ScreenHead>

      <ModeGrid>
        {/* ============ PRACTICE ============ */}
        <ModeCard>
          <ModeIcon>
            <I n="boxingGlove" size={28} />
          </ModeIcon>
          <ModeTitle>Practice</ModeTitle>
          <ModeDesc>
            Fight a single NPC to test builds and warm up — no queue, and no coins or XP. A pure
            sandbox for experimenting with your build before you take it into PvP.
          </ModeDesc>
          <Button variant="primary" size="lg" onClick={props.onStartPractice}>
            <I n="swordCross" /> Fight NPC
          </Button>
          <Tiny>Uses your active preset at full stats — practice pays nothing.</Tiny>
        </ModeCard>

        {/* ============ UNRANKED ============ */}
        <ModeCard>
          <ModeIcon>
            <I n="swordCross" size={28} />
          </ModeIcon>
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
          <ModeIcon>
            <I n="trophy" size={28} />
          </ModeIcon>
          <ModeTitle>Ranked</ModeTitle>
          {isRankedUnlocked(player.level) ? (
            <>
              <ModeDesc>
                <span style={{ color: ranked.color, fontWeight: 700 }}>{ranked.name.toUpperCase()}</span> ·{' '}
                {rankStatusText(player.ranks['5v5'])}. Ranked has <b>two ladders</b>: <b>1v1</b> (solo) and{' '}
                <b>5v5</b> (parties up to 5) — each with its <b>own rank</b> and its <b>own stat upgrades</b>.
                Real players only, no bots, so a 5v5 needs 10 players in your rank window. Win to gain RP,
                lose to drop. You face players within ±1 rank, widening to ±2 after ~
                {Math.round(RANKED_WINDOW_WIDEN_AFTER_MS / 1000)}s of waiting.
                {inParty && leaderBand
                  ? ` Parties queue the 5v5 ladder: everyone within ±1 rank of the leader (${leaderBand.name}); empty slots fill with real players.`
                  : ''}
              </ModeDesc>
              {queueStatus('ranked') ?? (
                <Row wrap>
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={status !== 'connected' || inParty || (inQueue && queue.mode !== 'ranked')}
                    onClick={() => joinQueue(1, 'ranked')}
                  >
                    Ranked 1v1
                  </Button>
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={status !== 'connected' || rankedTooBig || rankedNotReady || (inQueue && queue.mode !== 'ranked')}
                    onClick={() => joinQueue(5, 'ranked')}
                  >
                    Ranked 5v5
                  </Button>
                </Row>
              )}
            </>
          ) : (
            <>
              <ModeDesc>
                <span style={{ color: 'var(--warn)', fontWeight: 700 }}>
                  <I n="lock" /> LOCKED
                </span>{' '}
                — reach Level {RANKED_UNLOCK_LEVEL} to unlock ranked play and ranked stat upgrades. You are
                Level {player.level}. Earn XP in practice & unranked — levels keep climbing forever.
              </ModeDesc>
              <Button variant="primary" size="lg" disabled>
                <I n="lock" /> Locked · Level {RANKED_UNLOCK_LEVEL} required
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
