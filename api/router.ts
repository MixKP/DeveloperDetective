import type { IncomingMessage, ServerResponse } from 'node:http';
import { createAppFromEnv } from '../backend/src/app.js';

const { app } = createAppFromEnv({ maxConnections: 1 });

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
