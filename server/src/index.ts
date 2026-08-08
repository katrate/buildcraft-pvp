import { startGameServer } from './app';

const PORT = Number(process.env.PORT) || 8787;

const server = await startGameServer(PORT);

// Graceful shutdown
process.on('SIGINT', () => {
  void server.close().then(() => process.exit(0));
});
