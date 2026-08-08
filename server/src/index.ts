import { startGameServer } from './app';
import { supabaseConfigured } from './db';

const PORT = Number(process.env.PORT) || 8787;

if (!supabaseConfigured()) {
  console.warn(
    '[server] ⚠ SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are missing from .env. ' +
      'Accounts are mandatory, so every connection will be REJECTED. ' +
      'Add the service role key to .env and restart to accept players.',
  );
}

const server = await startGameServer(PORT);

// Graceful shutdown
process.on('SIGINT', () => {
  void server.close().then(() => process.exit(0));
});
