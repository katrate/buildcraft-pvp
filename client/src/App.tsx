import { useCallback, useEffect, useState } from 'react';
import { Intro } from './screens/Intro';
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
import { connectSocket, subscribeMessages } from './services/ws';
import { AppShell, Brand, Chip, MenuScreen, Muted, Stats, Toast, TopBar } from './ui/glass';

type AppScreen = Screen | 'intro' | 'countdown';

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
  const [screen, setScreen] = useState<AppScreen>(player.name ? 'menu' : 'intro');
  const [onlineMatch, setOnlineMatch] = useState<OnlineMatchInfo | null>(null);
  const [endInfo, setEndInfo] = useState<OnlineEndInfo | null>(null);
  const [countdown, setCountdown] = useState<MatchCountdown | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Keep a live socket for the whole session
  useEffect(() => {
    connectSocket();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Server messages drive the online match lifecycle
  useEffect(() => {
    return subscribeMessages((msg) => {
      switch (msg.type) {
        case 'match_found':
          // Match formed — show the loading/countdown screen until the server
          // sends match_start (it fires exactly when the countdown ends).
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
          if (msg.rankDelta !== undefined) applyRankDelta(msg.rankDelta);
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

  if (screen === 'intro') return <Intro onEnter={() => setScreen('menu')} />;

  return (
    <AppShell>
      {screen !== 'menu' && screen !== 'combat-practice' && screen !== 'combat-online' && screen !== 'countdown' && (
        <TopBar>
          <Brand onClick={() => navigate('menu')}>BuildCraft PVP</Brand>
          <Stats>
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

      {toast && <Toast>{toast}</Toast>}
    </AppShell>
  );
}
