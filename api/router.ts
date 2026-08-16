import type { IncomingMessage, ServerResponse } from 'node:http';
import { createAppFromEnv } from '../backend/src/app.js';

// No pool size here on purpose. Capping it at one looked right for serverless, but
// this deploys behind Supabase's transaction pooler, which is what actually rations
// Postgres — and a single client connection queues every other request in the
// instance behind whichever query is stuck. Observed in production: one aborted
// request held the connection and the next two calls hung for 60s each.
const { app } = createAppFromEnv();

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  if ((req.url ?? '').startsWith('/api/router')) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        error: {
          code: 'ROUTING_ERROR',
          message: 'The rewrite did not preserve the original request path.',
        },
      }),
    );
    return;
  }

  (app as unknown as (a: IncomingMessage, b: ServerResponse) => void)(req, res);
}
