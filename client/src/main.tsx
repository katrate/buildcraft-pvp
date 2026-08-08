import { createRoot } from 'react-dom/client';
import { App } from './App';
import { GlobalStyle } from './ui/glass';
import { ErrorBoundary } from './components/ErrorBoundary';

createRoot(document.getElementById('root')!).render(
  <>
    <GlobalStyle />
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </>,
);
