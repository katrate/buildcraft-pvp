import { createRoot } from 'react-dom/client';
import { App } from './App';
import { GlobalStyle } from './ui/glass';

createRoot(document.getElementById('root')!).render(
  <>
    <GlobalStyle />
    <App />
  </>,
);
