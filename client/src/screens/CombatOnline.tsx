import { useEffect, useRef, useState } from 'react';
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
  turnDeadline?: number | null;
  surrenderVotes?: Record<number, number>;
  afk?: Record<string, boolean>;
  notice?: { combatantId: string; text: string } | null;
}

export function CombatOnline(props: { matchInfo: OnlineMatchInfo }) {
  const player = usePlayer();
  const status = useWsStatus();
  const { matchInfo } = props;
  // Bumped on reconnect so the arena remounts — a fresh state after a long
  // disconnect must not replay a burst of stale damage/effect popups.
  const [epoch, setEpoch] = useState(0);
  const [confirmSurrender, setConfirmSurrender] = useState(false);
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);
  const afkReturnSent = useRef(false);
  const noticeTimer = useRef<number | null>(null);

  const myCombatantId = matchInfo.yourCombatantIds[0] ?? '';
  const myTurn = isMyTurn(matchInfo.match, myCombatantId);
  const current = getCurrentCombatant(matchInfo.match);
  const connected = status === 'connected';
  const myAfk = !!matchInfo.afk?.[myCombatantId];
  const mySurrenderVotes = matchInfo.surrenderVotes?.[matchInfo.yourTeam] ?? 0;
  const myTeamReal = Object.values(matchInfo.match.combatants).filter(
    (c) => c.teamId === matchInfo.yourTeam && !c.isBot,
  ).length;
  const botsOnMyTeam = Object.values(matchInfo.match.combatants).filter(
    (c) => c.teamId === matchInfo.yourTeam && c.isBot,
  ).length;
  const botsOnEnemyTeam = Object.values(matchInfo.match.combatants).filter(
    (c) => c.teamId !== matchInfo.yourTeam && c.isBot,
  ).length;

  // Transient server notices (turn skipped / AFK / surrender votes) — auto-dismiss.
  useEffect(() => {
    if (matchInfo.notice) {
      setNoticeMsg(matchInfo.notice.text);
      if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
      noticeTimer.current = window.setTimeout(() => setNoticeMsg(null), 4000);
    }
  }, [matchInfo.notice]);

  useEffect(() => () => {
    if (noticeTimer.current) window.clearTimeout(noticeTimer.current);
  }, []);

  // Re-arm the "I'm back" button whenever the mute lifts.
  useEffect(() => {
    if (!myAfk) afkReturnSent.current = false;
  }, [myAfk]);

  function reconnect(): void {
    connectSocket();
    // Server restores the match on rejoin; remount the arena so the fresh
    // state doesn't replay a burst of stale popups.
    setEpoch((e) => e + 1);
    setConfirmSurrender(false);
    setTimeout(() => sendMessage({ type: 'rejoin', playerId: player.playerId }), 250);
  }

  function returnFromAfk(): void {
    if (afkReturnSent.current) return;
    afkReturnSent.current = true;
    sendMessage({ type: 'afk_return', playerId: player.playerId });
  }

  function surrender(): void {
    setConfirmSurrender(false);
    sendMessage({ type: 'surrender', playerId: player.playerId });
  }

  return (
    <FlexFill>
      <CombatArena
        key={epoch}
        state={matchInfo.match}
        myCombatantId={myCombatantId}
        canAct={myTurn && connected}
        disabled={!connected}
        turnDeadline={matchInfo.turnDeadline ?? null}
        afk={matchInfo.afk ?? {}}
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
              <Chip>
                <I n="robot" /> {botsOnMyTeam} bot{botsOnMyTeam === 1 ? '' : 's'} on your team{botsOnEnemyTeam > 0 ? ` · ${botsOnEnemyTeam} on theirs` : ''}
              </Chip>
            )}
            {mySurrenderVotes > 0 && (
              <Chip tone="warn">
                <I n="flagVariant" /> Surrender {mySurrenderVotes}/{myTeamReal}
              </Chip>
            )}
            {!confirmSurrender ? (
              <Button variant="danger" onClick={() => setConfirmSurrender(true)} disabled={!connected}>
                <I n="flagVariant" /> Surrender
              </Button>
            ) : (
              <>
                <Chip tone="warn">Surrender the match?</Chip>
                <Button variant="danger" size="sm" onClick={surrender}>
                  <I n="check" /> Yes
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmSurrender(false)}>
                  Cancel
                </Button>
              </>
            )}
            <Chip tone={connected ? 'good' : 'offline'}>
              {connected ? '● server' : '○ disconnected'}
            </Chip>
          </Row>
        }
        footer={
          !connected ? (
            <Row gap={10} style={{ padding: '8px 0' }}>
              <Chip tone="offline">Connection lost — your match continues; reconnect to get back in.</Chip>
              <Button variant="primary" onClick={reconnect}>
                Reconnect
              </Button>
            </Row>
          ) : myAfk ? (
            <Row gap={10} style={{ padding: '8px 0' }}>
              <Chip tone="offline">
                <I n="accountClock" /> You went AFK — your turns are being skipped. Click back in to rejoin the fight.
              </Chip>
              <Button variant="primary" onClick={returnFromAfk}>
                I'm back
              </Button>
            </Row>
          ) : noticeMsg ? (
            <Chip tone="warn" style={{ padding: '6px 0' }}>{noticeMsg}</Chip>
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
