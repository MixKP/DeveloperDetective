import { createAppFromEnv } from '../backend/src/app.js';

const { app } = createAppFromEnv({ maxConnections: 1 });

export default app;
