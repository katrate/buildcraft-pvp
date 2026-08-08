import { useCallback, useEffect, useState } from 'react';
import { Login } from './screens/Login';
import { MainMenu, type Screen } from './screens/MainMenu';
import { Play } from './screens/Play';
import { Build } from './screens/Build';
import { Inventory } from './screens/Inventory';
import { Store } from './screens/Store';
import { Profile } from './screens/Profile';
import { CombatPractice } from './screens/CombatPractice';
import { CombatOnline, type OnlineEndInfo, type OnlineMatchInfo } from './screens/CombatOnline';
import { CountdownScreen } from './screens/Countdown';
import { usePlayer, grantRewards, recordMatch, applyRankDelta } from './state/store';
import { useAuth } from './state/auth';
import { useQueue, getQueue, setQueue, clearQueue, leaveQueue } from './state/queue';
import { connectSocket, subscribeMessages, useWsStatus } from './services/ws';
import { AppShell, Brand, Button, Chip, MenuScreen, Muted, QueueFloater, Spinner, Stats, Tiny, Toast, TopBar } from './ui/glass';

type AppScreen = Screen | 'countdown';

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
  const [endInfo, setEndInfo] = useState<OnlineEndInfo | null>(null);
  const [countdown, setCountdown] = useState<MatchCountdown | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const queue = useQueue();
  const [now, setNow] = useState(() => Date.now());
  const wsStatus = useWsStatus();

  // Keep a live socket for the whole session
  useEffect(() => {
    connectSocket();
  }, []);

  // When a different account signs in (or you sign out & back in), land on the
  // main menu instead of whatever screen the previous player was on.
  useEffect(() => {
    setScreen('menu');
    setOnlineMatch(null);
    setEndInfo(null);
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
          setOnlineMatch({ match: msg.match, yourCombatantIds: msg.yourCombatantIds, yourTeam: msg.yourTeam });
          setEndInfo(null);
          setScreen('combat-online');
          break;
        case 'match_state':
          setOnlineMatch((prev) => (prev ? { ...prev, match: msg.match } : prev));
          break;
        case 'match_end': {
          const leveled = grantRewards(msg.rewards);
          // Ranked ladders are per-format: a 1v1 match updates the 1v1 rank,
          // a 5v5 match updates the 5v5 rank.
          if (msg.rankDelta !== undefined) {
            applyRankDelta(msg.rankDelta, msg.teamSize === 1 ? '1v1' : '5v5');
          }
          setEndInfo({
            result: msg.result,
            rewards: msg.rewards,
            winnerTeam: msg.winnerTeam,
            leveledUp: leveled.leveledUp,
            rankDelta: msg.rankDelta,
          });
          recordMatch(msg.result);
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
      setEndInfo(null);
    }
  }, []);

  const startPractice = useCallback(() => {
    setScreen('combat-practice');
  }, []);

  const exitOnline = useCallback(() => {
    setOnlineMatch(null);
    setEndInfo(null);
    setCountdown(null);
    navigate('play');
  }, [navigate]);

  // ------------------------------------------------------------
  // ACCOUNT GATE — mandatory when Supabase is configured.
  //  - dev mode (no env vars): straight into the game (localStorage saves)
  //  - account mode: login screen until signed in, then a loading screen
  //    while the profile hydrates.
  // ------------------------------------------------------------
  if (auth.devMode) {
    // dev mode — no gate
  } else if (auth.status === 'unknown') {
    return (
      <MenuScreen>
        <Muted>Loading account…</Muted>
      </MenuScreen>
    );
  } else if (auth.status === 'signed-out') {
    return <Login />;
  } else if (!auth.hydrated) {
    return (
      <MenuScreen>
        <Spinner />
        <Muted>Loading your fighter…</Muted>
      </MenuScreen>
    );
  }

  return (
    <AppShell>
      {screen !== 'menu' && screen !== 'combat-practice' && screen !== 'combat-online' && screen !== 'countdown' && (
        <TopBar>
          <Brand onClick={() => navigate('menu')}>BuildCraft PVP</Brand>
          <Stats>
            {auth.devMode && <Chip tone="warn">dev mode</Chip>}
            <Chip>Lv {player.level}</Chip>
            <Chip tone="warn">🪙 {player.coins}</Chip>
            <Chip>{player.name}</Chip>
          </Stats>
        </TopBar>
      )}

      {screen === 'menu' && <MainMenu onNavigate={navigate} />}
      {screen === 'play' && <Play onStartPractice={startPractice} onBack={() => navigate('menu')} />}
      {screen === 'build' && <Build onBack={() => navigate('menu')} />}
      {screen === 'inventory' && <Inventory onEditBuild={() => navigate('build')} onBack={() => navigate('menu')} />}
      {screen === 'store' && <Store onBack={() => navigate('menu')} />}
      {screen === 'profile' && <Profile onNavigate={navigate} />}
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
        <CombatOnline matchInfo={onlineMatch} endInfo={endInfo} onExit={exitOnline} />
      )}
      {screen === 'combat-online' && !onlineMatch && (
        <MenuScreen>
          <Muted>Waiting for match…</Muted>
        </MenuScreen>
      )}

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
