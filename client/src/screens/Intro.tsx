import { useState } from 'react';
import { usePlayer, setName } from '../state/store';
import { useWsStatus, connectSocket, serverUrl } from '../services/ws';
import { STARTER } from '../../../shared/src/constants';
import { Button, Chip, Col, Input, Logo, MenuScreen, Panel, Tiny } from '../ui/glass';

export function Intro(props: { onEnter: () => void }) {
  const player = usePlayer();
  const status = useWsStatus();
  const [name, setNameInput] = useState('');

  function enter(): void {
    if (!name.trim()) return;
    setName(name);
    connectSocket();
    props.onEnter();
  }

  return (
    <MenuScreen>
      <Logo>
        BUILDCRAFT PVP
        <small>Build your fighter. Prove the build.</small>
      </Logo>

      <Panel style={{ maxWidth: 420, width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <h3>Enter the arena</h3>
          <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', margin: 0 }}>
            V1 has no accounts — your pilot lives in this browser. Pick a name and go.
          </p>
        </div>
        <Input
          placeholder="Pilot name"
          maxLength={24}
          value={name}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && enter()}
          autoFocus
        />
        <Button variant="primary" size="lg" disabled={!name.trim()} onClick={enter}>
          Enter the Arena →
        </Button>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textAlign: 'center' }}>
          {player.name ? `Welcome back, ${player.name}!` : `New pilots start with ${STARTER.coins} coins and a starter kit.`}
          <br />
          Server: {serverUrl()} ·{' '}
          {status === 'connected' ? (
            <Chip tone="good">connected</Chip>
          ) : status === 'connecting' ? (
            <Chip tone="warn">connecting…</Chip>
          ) : (
            <Chip tone="offline">offline</Chip>
          )}
        </div>
      </Panel>
    </MenuScreen>
  );
}
