import { createAppFromEnv } from './app.js';

const { app, env, close } = createAppFromEnv();

const server = app.listen(env.API_PORT, () => {
  console.warn(`API listening on :${env.API_PORT}`);
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    server.close(() => {
      void close().finally(() => process.exit(0));
    });

    server.closeAllConnections();
  });
}
