import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button, MenuScreen, Panel } from '../ui/glass';

// ------------------------------------------------------------
// App-level error boundary.
//
// Without one, ANY render crash unmounts the whole tree and the player sees a
// silent white screen (\"the screen is not loading\") with zero feedback. This
// boundary catches those crashes and shows a recoverable card instead — the
// error is logged, and the player can keep playing.
// ------------------------------------------------------------
interface Props {
  children: ReactNode;
  onReset?: () => void;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[error-boundary] render crashed:', error, info.componentStack);
  }

  private reset = (): void => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render(): ReactNode {
    if (this.state.error) {
      return (
        <MenuScreen>
          <Panel style={{ maxWidth: 480, width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3>Something went wrong</h3>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', lineHeight: 1.55, wordBreak: 'break-word' }}>
              {this.state.error.message || String(this.state.error)}
            </p>
            <p style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>
              Your progress is saved. Try reloading if this keeps happening.
            </p>
            <Button variant="primary" onClick={this.reset}>
              Reload
            </Button>
          </Panel>
        </MenuScreen>
      );
    }
    return this.props.children;
  }
}
