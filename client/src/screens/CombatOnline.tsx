import { usePlayer } from '../state/store';
import { sendMessage, useWsStatus, connectSocket } from '../services/ws';
import { CombatArena } from '../components/CombatArena';
import { getCurrentCombatant, isMyTurn } from '../../../shared/src/engine/combat';
import type { MatchRewards, MatchState, PlayerResult } from '../../../shared/src/types';
import { Button, Chip, FlexFill, MutedBlock, Overlay, OverlayCard, Row, Tiny } from '../ui/glass';
import { I } from '../ui/icons';

export interface OnlineMatchInfo {
  match: MatchState;
  yourCombatantIds: string[];
  yourTeam: number;
}

export interface OnlineEndInfo {
  result: PlayerResult;
  rewards: MatchRewards;
  winnerTeam: number;
  leveledUp: boolean;
  rankDelta?: number;
}

export function CombatOnline(props: {
  matchInfo: OnlineMatchInfo;
  endInfo: OnlineEndInfo | null;
  onExit: () => void;
}) {
  const player = usePlayer();
  const status = useWsStatus();
  const { matchInfo, endInfo } = props;

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
    // Server restores the match on rejoin
    setTimeout(() => sendMessage({ type: 'rejoin', playerId: player.playerId }), 250);
  }

  return (
    <FlexFill>
      <CombatArena
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

      {endInfo && (
        <Overlay>
          <OverlayCard>
            <h2
              style={{
                color: endInfo.result === 'victory' ? 'var(--good)' : endInfo.result === 'draw' ? 'var(--warn)' : 'var(--bad)',
              }}
            >
              {endInfo.result === 'victory' ? 'VICTORY!' : endInfo.result === 'draw' ? 'DRAW' : 'DEFEAT'}
            </h2>
            <Row center gap={16}>
              <Chip tone="good">+{endInfo.rewards.xp} XP</Chip>
              <Chip tone="warn">+{endInfo.rewards.coins} coins</Chip>
              {endInfo.rankDelta !== undefined && endInfo.rankDelta !== 0 && (
                <Chip tone={endInfo.rankDelta > 0 ? 'good' : 'offline'}>
                  {endInfo.rankDelta > 0 ? '▲' : '▼'} {Math.abs(endInfo.rankDelta)} RP
                </Chip>
              )}
            </Row>
            {endInfo.rewards.breakdown && (
              <MutedBlock>
                <div>
                  Coins: {endInfo.rewards.breakdown.baseCoins} base +{' '}
                  {endInfo.rewards.breakdown.killCoins} kills + {endInfo.rewards.breakdown.roundCoins} rounds =
                  +{endInfo.rewards.coins}
                </div>
                <div>
                  XP: {endInfo.rewards.breakdown.baseXp} base + {endInfo.rewards.breakdown.killXp} kills +{' '}
                  {endInfo.rewards.breakdown.roundXp} rounds = +{endInfo.rewards.xp}
                </div>
                {endInfo.rankDelta !== undefined && (
                  <div>
                    RP: {endInfo.rankDelta > 0 ? `+${endInfo.rankDelta}` : endInfo.rankDelta} (ELO — depends on
                    your and your opponent's rating)
                  </div>
                )}
              </MutedBlock>
            )}
            {endInfo.leveledUp && (
              <Chip tone="warn">
                <I n="partyPopper" /> Level up!
              </Chip>
            )}
            <Tiny>
              {matchInfo.match.mode === 'ranked'
                ? 'Ranked rewards are server-computed; RP updates with each result.'
                : 'Unranked rewards come from the server — your build, not your grind, decides the fight.'}
            </Tiny>
            <Button variant="primary" size="lg" onClick={props.onExit}>
              Back to Menu
            </Button>
          </OverlayCard>
        </Overlay>
      )}
    </FlexFill>
  );
}
