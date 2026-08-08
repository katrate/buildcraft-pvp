import { useState } from 'react';
import { usePlayer } from '../state/store';
import { sendMessage, useWsStatus, connectSocket } from '../services/ws';
import { CombatArena } from '../components/CombatArena';
import { getCurrentCombatant, isMyTurn } from '../../../shared/src/engine/combat';
import type { MatchState } from '../../../shared/src/types';
import { Button, Chip, FlexFill, Row, Tiny } from '../ui/glass';
import { I } from '../ui/icons';

export interface OnlineMatchInfo {
  match: MatchState;
  yourCombatantIds: string[];
  yourTeam: number;
}

export function CombatOnline(props: { matchInfo: OnlineMatchInfo; onExit: () => void }) {
  const player = usePlayer();
  const status = useWsStatus();
  const { matchInfo } = props;
  // Bumped on reconnect so the arena remounts — a fresh state after a long
  // disconnect must not replay a burst of stale damage/effect popups.
  const [epoch, setEpoch] = useState(0);

  const myCombatantId = matchInfo.yourCombatantIds[0] ?? '';
  const myTurn = isMyTurn(matchInfo.match, myCombatantId);
  const current = getCurrentCombatant(matchInfo.match);
  const connected = status === 'connected';
  const botsOnMyTeam = Object.values(matchInfo.match.combatants).filter(
    (c) => c.teamId === matchInfo.yourTeam && c.isBot,
  ).length;
  const botsOnEnemyTeam = Object.values(matchInfo.match.combatants).filter(
    (c) => c.teamId !== matchInfo.yourTeam && c.isBot,
  ).length;

  function reconnect(): void {
    connectSocket();
    // Server restores the match on rejoin; remount the arena so the fresh
    // state doesn't replay a burst of stale popups.
    setEpoch((e) => e + 1);
    setTimeout(() => sendMessage({ type: 'rejoin', playerId: player.playerId }), 250);
  }

  return (
    <FlexFill>
      <CombatArena
        key={epoch}
        state={matchInfo.match}
        myCombatantId={myCombatantId}
        canAct={myTurn && connected}
        disabled={!connected}
        onAction={(action) => sendMessage({ type: 'player_action', matchId: matchInfo.match.id, playerId: player.playerId, action })}
        headerRight={
          <Row gap={8}>
            <Chip tone={matchInfo.match.mode === 'ranked' ? 'good' : 'default'}>
              {matchInfo.match.mode === 'ranked' ? (
                <><I n="trophy" /> RANKED</>
              ) : matchInfo.match.mode === 'custom' ? (
                <><I n="handshake" /> CUSTOM</>
              ) : (
                'UNRANKED'
              )}
            </Chip>
            {(botsOnMyTeam > 0 || botsOnEnemyTeam > 0) && (
              <Chip title="Teams are partially filled with bots to start the match">
                <I n="robot" /> {botsOnMyTeam} bot{botsOnMyTeam === 1 ? '' : 's'} on your team{botsOnEnemyTeam > 0 ? ` · ${botsOnEnemyTeam} on theirs` : ''}
              </Chip>
            )}
            <Chip tone={connected ? 'good' : 'offline'}>
              {connected ? '● server' : '○ disconnected'}
            </Chip>
            <Button variant="ghost" onClick={props.onExit}>
              <I n="close" /> Leave
            </Button>
          </Row>
        }
        footer={
          !connected ? (
            <Row gap={10} style={{ padding: '8px 0' }}>
              <Chip tone="offline">Connection lost — the match pauses for your turn only if you reconnect.</Chip>
              <Button variant="primary" onClick={reconnect}>
                Reconnect
              </Button>
            </Row>
          ) : current?.isBot ? (
            <Tiny style={{ padding: '6px 0' }}>Bots are thinking…</Tiny>
          ) : !myTurn ? (
            <Tiny style={{ padding: '6px 0' }}>Waiting for {current?.name}…</Tiny>
          ) : null
        }
      />
    </FlexFill>
  );
}
