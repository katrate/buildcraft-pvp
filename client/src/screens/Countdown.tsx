import { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { Button, Chip, Col, MenuScreen, Row, Spinner } from '../ui/glass';

// ------------------------------------------------------------
// CountdownScreen — the \"match found!\" loading screen shown for
// MATCH_COUNTDOWN_MS before the server starts the arena.
// The server is authoritative; we only display the countdown.
// ------------------------------------------------------------

const pop = keyframes`
  0% { opacity: 0; transform: translateY(18px) scale(0.8); }
  60% { opacity: 1; transform: translateY(-6px) scale(1.12); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
`;

const BigNumber = styled.div<{ key: number }>`
  font-size: 6rem;
  font-weight: 900;
  line-height: 1;
  background: linear-gradient(135deg, #ff9f43, #ffd166);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 30px rgba(255, 159, 67, 0.35));
  animation: ${pop} 0.4s ease;
`;

const BigCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 34px 54px;
  border-radius: 26px;
  background: linear-gradient(160deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03));
  backdrop-filter: blur(22px) saturate(160%);
  -webkit-backdrop-filter: blur(22px) saturate(160%);
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 18px 60px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255,255,255,0.09);
  animation: ${pop} 0.25s ease;
`;

const ReadyText = styled.div`
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--text);
  animation: ${pulse} 1.4s ease-in-out infinite;
`;

export function CountdownScreen(props: {
  mode: 'unranked' | 'ranked' | 'custom';
  teamSize: 1 | 2 | 5;
  countdownMs: number;
  teamA?: number;
  teamB?: number;
  onAbort: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 100), 100);
    return () => clearInterval(t);
  }, []);

  const remaining = Math.max(0, Math.ceil((props.countdownMs - elapsed) / 1000));
  const modeLabel = props.mode === 'ranked' ? 'RANKED' : props.mode === 'custom' ? 'CUSTOM' : 'UNRANKED';
  const vs =
    props.mode === 'custom' && props.teamA !== undefined && props.teamB !== undefined
      ? `${props.teamA}v${props.teamB}`
      : `${props.teamSize}v${props.teamSize}`;
  // Escape hatch: if the server never sends match_start (e.g. it died mid-
  // countdown), don't leave the player stuck on this screen forever.
  const stuck = elapsed > props.countdownMs + 8000;

  return (
    <MenuScreen>
      <div style={{ fontSize: '1.3rem', fontWeight: 800, letterSpacing: '0.14em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
        Match found!
      </div>
      <Row gap={10}>
        <Chip tone="good">🏆 {modeLabel}</Chip>
        <Chip>{vs}</Chip>
      </Row>
      <BigCard>
        {stuck ? (
          <Col gap={12}>
            <div style={{ fontWeight: 700, color: 'var(--warn)' }}>⚠️ Connection lost</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              The server never started the arena. The match may have been cancelled.
            </div>
            <Button variant="primary" onClick={props.onAbort}>
              Back to Menu
            </Button>
          </Col>
        ) : remaining > 0 ? (
          <>
            <BigNumber key={remaining}>{remaining}</BigNumber>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              starting in
            </div>
          </>
        ) : (
          <Row gap={12}>
            <Spinner />
            <ReadyText>Entering the arena…</ReadyText>
          </Row>
        )}
      </BigCard>
      {!stuck && (
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', maxWidth: 420, textAlign: 'center', lineHeight: 1.5 }}>
          Both teams are locked in. The server starts the fight when the countdown ends —
          no need to click anything.
        </div>
      )}
    </MenuScreen>
  );
}
