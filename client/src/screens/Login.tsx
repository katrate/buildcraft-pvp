import { useState } from 'react';
import { signIn, signUp } from '../state/auth';
import { useWsStatus } from '../services/ws';
import { Button, Chip, Col, Input, Logo, MenuScreen, Panel, Row, Tiny } from '../ui/glass';
import { I } from '../ui/icons';

type Mode = 'signin' | 'signup';

export function Login() {
  const status = useWsStatus();
  const [mode, setMode] = useState<Mode>('signin');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(): Promise<void> {
    setError(null);
    setInfo(null);
    if (!email.trim() || password.length < 6) {
      setError('Enter your email and a password of at least 6 characters.');
      return;
    }
    if (mode === 'signup' && username.trim().length < 3) {
      setError('Pick a username of at least 3 characters.');
      return;
    }
    setBusy(true);
    const res =
      mode === 'signin' ? await signIn(email, password) : await signUp(username, email, password);
    setBusy(false);
    if (!res.ok) {
      if (res.error?.startsWith('Account created')) setInfo(res.error);
      else setError(res.error ?? 'Something went wrong.');
    }
    // On success the auth state flips to signed-in and App swaps to the game.
  }

  return (
    <MenuScreen>
      <Logo>
        BUILDCRAFT PVP
        <small>Build your fighter. Prove the build.</small>
      </Logo>

      <Panel style={{ maxWidth: 430, width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Row gap={8}>
          {(['signin', 'signup'] as Mode[]).map((m) => (
            <Button
              key={m}
              variant={mode === m ? 'primary' : 'ghost'}
              onClick={() => {
                setMode(m);
                setError(null);
                setInfo(null);
              }}
              style={{ flex: 1 }}
            >
              {m === 'signin' ? 'Sign in' : 'Create account'}
            </Button>
          ))}
        </Row>

        {mode === 'signup' && (
          <Input
            placeholder="Username (shown to other players)"
            maxLength={24}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
        )}
        <Input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
          autoFocus={mode === 'signin'}
        />
        <Input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
        />

        {error && (
          <Tiny style={{ color: 'var(--bad)' }}>
            <I n="alert" /> {error}
          </Tiny>
        )}
        {info && (
          <Tiny style={{ color: 'var(--good)' }}>
            <I n="check" /> {info}
          </Tiny>
        )}

        <Button variant="primary" size="lg" disabled={busy} onClick={() => void submit()}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Enter the Arena →' : 'Create account →'}
        </Button>

        <Tiny style={{ textAlign: 'center', lineHeight: 1.6 }}>
          {mode === 'signin' ? (
            <>
              New to BuildCraft? Switch to <b>Create account</b> — your coins, builds and rank are stored
              on your account, not in this browser.
            </>
          ) : (
            <>
              Your fighter lives on your account — coins, inventory, presets and both ranked ladders
              follow you to any browser. Sign in after creating to play.
            </>
          )}
        </Tiny>
      </Panel>

      <Col gap={6} style={{ alignItems: 'center' }}>
        <Tiny>
          Server: {status === 'connected' ? 'online' : status === 'connecting' ? 'connecting…' : 'offline'} ·{' '}
          <Chip tone={status === 'connected' ? 'good' : status === 'connecting' ? 'warn' : 'offline'}>
            {status === 'connected' ? '● connected' : status === 'connecting' ? '○ connecting…' : '○ offline'}
          </Chip>
        </Tiny>
      </Col>
    </MenuScreen>
  );
}
