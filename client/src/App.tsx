import { useCallback, useEffect, useRef, useState } from 'react';
import { Login } from './screens/Login';
import { MainMenu, type Screen } from './screens/MainMenu';
import { Play } from './screens/Play';
import { Build } from './screens/Build';
import { Inventory } from './screens/Inventory';
import { Store } from './screens/Store';
import { CombatPractice } from './screens/CombatPractice';
import { CombatOnline, type OnlineMatchInfo } from './screens/CombatOnline';
import { MatchSummary, type MatchSummaryData } from './screens/MatchSummary';
import { CountdownScreen } from './screens/Countdown';
import { usePlayer, getState, grantRewards, recordMatch, applyRankDelta, defaultState } from './state/store';
import { useAuth } from './state/auth';
import { useQueue, getQueue, setQueue, clearQueue, leaveQueue } from './state/queue';
import { connectSocket, sendMessage, subscribeMessages, useWsStatus } from './services/ws';
import { AppShell, Brand, Button, Chip, MenuScreen, Muted, Panel, QueueFloater, Spinner, Stats, Tiny, Toast, TopBar } from './ui/glass';
import { I } from './ui/icons';

type AppScreen = Screen | 'countdown' | 'summary';

type CountdownMode = 'unranked' | 'ranked' | 'custom';

interface MatchCountdown {
  matchId: string;
  mode: CountdownMode;
  teamSize: 1 | 2 | 5;
  countdownMs: number;
  teamA?: number;
  teamB?: number;
}

export function App() {
  const player = usePlayer();
  const auth = useAuth();
  const [screen, setScreen] = useState<AppScreen>('menu');
  const [onlineMatch, setOnlineMatch] = useState<OnlineMatchInfo | null>(null);
  const [summary, setSummary] = useState<MatchSummaryData | null>(null);
  const [countdown, setCountdown] = useState<MatchCountdown | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const queue = useQueue();
  const [now, setNow] = useState(() => Date.now());
  const wsStatus = useWsStatus();
  // Which account we already asked to rejoin — once per session per account.
  const rejoinedFor = useRef<string | null>(null);

  // Keep a live socket for the whole session
  useEffect(() => {
    connectSocket();
  }, []);

  // Resume a match left mid-game: closing/reloading the tab NEVER abandons
  // the match (the server keeps it and skips your turns until you return).
  // The moment the socket is connected and the account is known, ask the
  // server if there's an active match — it answers with match_start or
  // match_found (rejoin) or a silent rejoin_result:false.
  useEffect(() => {
    if (
      wsStatus === 'connected' &&
      auth.status === 'signed-in' &&
      auth.hydrated &&
      player.playerId &&
      rejoinedFor.current !== player.playerId
    ) {
      rejoinedFor.current = player.playerId;
      sendMessage({ type: 'rejoin', playerId: player.playerId });
    }
  }, [wsStatus, auth.status, auth.hydrated, player.playerId]);

  // When a different account signs in (or you sign out & back in), land on the
  // main menu instead of whatever screen the previous player was on.
  useEffect(() => {
    setScreen('menu');
    setOnlineMatch(null);
    setSummary(null);
    setCountdown(null);
  }, [player.playerId]);

  // If the socket drops while queued, the server already pulled us out of the
  // queue — clear the timer so it never shows a dead "Searching…" state.
  useEffect(() => {
    if (wsStatus === 'disconnected') clearQueue();
  }, [wsStatus]);

  // Live clock for the floating queue timer (ticked while queued).
  useEffect(() => {
    if (!queue) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [queue]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Server messages drive the online match lifecycle
  useEffect(() => {
    return subscribeMessages((msg) => {
      switch (msg.type) {
        case 'queue_update':
          // The queue is global — it keeps searching no matter which screen we
          // are on. queued === 0 means the server pulled us out.
          if (msg.queued === 0) {
            clearQueue();
            break;
          }
          {
            const q = getQueue();
            if (!q) {
              setQueue({ teamSize: msg.teamSize, mode: msg.mode, count: msg.queued, queuedSince: msg.queuedSince ?? Date.now() });
            } else if (q.teamSize === msg.teamSize && q.mode === msg.mode) {
              setQueue({ ...q, count: msg.queued, queuedSince: msg.queuedSince ?? q.queuedSince });
            }
          }
          break;
        case 'queue_left':
          clearQueue();
          break;
        case 'match_found':
          // Match formed — stop searching and show the loading/countdown screen
          // until the server sends match_start (it fires when the countdown ends).
          clearQueue();
          setCountdown({
            matchId: msg.matchId,
            mode: msg.mode,
            teamSize: msg.teamSize,
            countdownMs: msg.countdownMs,
            teamA: msg.teamA,
            teamB: msg.teamB,
          });
          setScreen('countdown');
          break;
        case 'match_start':
          setCountdown(null);
          setOnlineMatch({
            match: msg.match,
            yourCombatantIds: msg.yourCombatantIds,
            yourTeam: msg.yourTeam,
            turnDeadline: msg.turnDeadline ?? null,
            surrenderVotes: msg.surrenderVotes ?? {},
            afk: msg.afk ?? {},
            notice: msg.notice ?? null,
          });
          setSummary(null);
          setScreen('combat-online');
          break;
        case 'match_state':
          setOnlineMatch((prev) =>
            prev
              ? {
                  ...prev,
                  match: msg.match,
                  turnDeadline: msg.turnDeadline ?? null,
                  surrenderVotes: msg.surrenderVotes ?? prev.surrenderVotes ?? {},
                  afk: msg.afk ?? prev.afk ?? {},
                  notice: msg.notice ?? null,
                }
              : prev,
          );
          break;
        case 'rejoin_result':
          // No active match — silently stay wherever we are.
          break;
        case 'match_end': {
          // Snapshot pre-grant progress so the stats screen can animate the
          // XP / RP bars from the old position to the new one. EVERYTHING here
          // is defensive: the WebSocket dispatcher catches listener errors, so
          // any throw would leave the player stuck on the ended arena with NO
          // visible error. Build the summary payload FIRST (pure, can't throw),
          // then apply rewards inside a guard — and ALWAYS show the summary.
          const before = getState();
          const format = msg.teamSize === 1 ? '1v1' : '5v5';
          const ratingFrom =
            before.ranks && before.ranks[format]
              ? before.ranks[format].rating
              : defaultState().ranks[format].rating;
          // Summary is derived from the server payload — never crashes.
          setSummary({
            result: msg.result,
            winnerTeam: msg.winnerTeam,
            myTeam: msg.yourTeam,
            mode: msg.mode,
            rewards: msg.rewards,
            rankDelta: msg.rankDelta,
            rankFormat: msg.rankDelta !== undefined ? format : undefined,
            stats: msg.stats ?? [], // a stale server may omit stats — never crash the screen
            levelFrom: before.level,
            xpFrom: before.xp,
            ratingFrom: msg.rankDelta !== undefined ? ratingFrom : undefined,
          });
          // Rewards are a best-effort side effect; a failure here must never
          // hide the result screen.
          try {
            grantRewards(msg.rewards);
            // Ranked ladders are per-format: a 1v1 match updates the 1v1 rank,
            // a 5v5 match updates the 5v5 rank.
            if (msg.rankDelta !== undefined) applyRankDelta(msg.rankDelta, format);
            recordMatch(msg.result);
          } catch (e) {
            console.error('[match_end] reward application failed:', e);
          }
          setScreen('summary');
          break;
        }
        case 'error':
          setToast(msg.message);
          break;
      }
    });
  }, []);

  const navigate = useCallback((s: Screen) => {
    setScreen(s);
    if (s !== 'combat-online') {
      // keep the last match around so re-entry via rejoin works, but clear results
      setSummary(null);
    }
  }, []);

  const startPractice = useCallback(() => {
    setScreen('combat-practice');
  }, []);

  const exitToMenu = useCallback(() => {
    setOnlineMatch(null);
    setSummary(null);
    setCountdown(null);
    navigate('menu');
  }, [navigate]);

  // ------------------------------------------------------------
  // ACCOUNT GATE — accounts are mandatory (no anonymous/dev mode).
  // Login screen until signed in, then a loading screen while the profile
  // hydrates. If the client keys are missing, show a setup screen.
  // ------------------------------------------------------------
  if (auth.unconfigured) {
    return (
      <MenuScreen>
        <Panel style={{ maxWidth: 460, width: '100%', textAlign: 'center' }}>
          <h3>Supabase is not configured</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            Accounts are required, but the client keys are missing. Copy{' '}
            <code>client/.env.example</code> to <code>client/.env</code>, fill in your
            project URL and anon key, then refresh.
          </p>
        </Panel>
      </MenuScreen>
    );
  }
  if (auth.status === 'unknown') {
    return (
      <MenuScreen>
        <Muted>Loading account…</Muted>
      </MenuScreen>
    );
  }
  if (auth.status === 'signed-out') {
    return <Login />;
  }
  if (!auth.hydrated) {
    return (
      <MenuScreen>
        <Spinner />
        <Muted>Loading your fighter…</Muted>
      </MenuScreen>
    );
  }

  return (
    <AppShell>
      {screen !== 'menu' && screen !== 'combat-practice' && screen !== 'combat-online' && screen !== 'countdown' && screen !== 'summary' && (
        <TopBar>
          <Brand onClick={() => navigate('menu')}>BuildCraft PVP</Brand>
          <Stats>
            <Chip>Lv {player.level}</Chip>
            <Chip tone="warn">
              <I n="coins" /> {player.coins}
            </Chip>
            <Chip>{player.name}</Chip>
          </Stats>
        </TopBar>
      )}

      {screen === 'menu' && <MainMenu onNavigate={navigate} />}
      {screen === 'play' && <Play onStartPractice={startPractice} onBack={() => navigate('menu')} />}
      {screen === 'build' && <Build onBack={() => navigate('menu')} />}
      {screen === 'inventory' && <Inventory onEditBuild={() => navigate('build')} onBack={() => navigate('menu')} />}
      {screen === 'store' && <Store onBack={() => navigate('menu')} />}
      {screen === 'combat-practice' && <CombatPractice onExit={() => navigate('play')} />}
      {screen === 'countdown' && countdown && (
        <CountdownScreen
          mode={countdown.mode}
          teamSize={countdown.teamSize}
          countdownMs={countdown.countdownMs}
          teamA={countdown.teamA}
          teamB={countdown.teamB}
          onAbort={() => navigate('menu')}
        />
      )}
      {screen === 'combat-online' && onlineMatch && (
        <CombatOnline matchInfo={onlineMatch} />
      )}
      {screen === 'combat-online' && !onlineMatch && (
        <MenuScreen>
          <Muted>Waiting for match…</Muted>
        </MenuScreen>
      )}
      {screen === 'summary' && summary && <MatchSummary {...summary} onExit={exitToMenu} />}

      {/* Floating matchmaking timer — visible on top of every screen while queued */}
      {queue && (
        <QueueFloater>
          <Spinner />
          <b>
            Searching {queue.teamSize}v{queue.teamSize} · {queue.mode.toUpperCase()}
          </b>
          <Tiny>
            {Math.max(0, Math.floor((now - queue.queuedSince) / 1000))}s · {queue.count} in queue
          </Tiny>
          <Button variant="danger" size="sm" onClick={leaveQueue}>
            Cancel
          </Button>
        </QueueFloater>
      )}

      {toast && <Toast>{toast}</Toast>}
    </AppShell>
  );
}
