import type { IncomingMessage, ServerResponse } from 'node:http';
import { createAppFromEnv } from '../backend/src/app.js';

const PATH_PARAM = '__path';

const { app } = createAppFromEnv({ maxConnections: 1 });

function misroutedResponse(res: ServerResponse, message: string): void {
  res.statusCode = 500;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify({ error: { code: 'ROUTING_ERROR', message } }));
}

export default function handler(req: IncomingMessage, res: ServerResponse): void {
  const requestUrl = req.url ?? '/';
  const separator = requestUrl.indexOf('?');
  const pairs = separator === -1 ? [] : requestUrl.slice(separator + 1).split('&');

  const encodedPaths = pairs
    .filter((pair) => pair.startsWith(`${PATH_PARAM}=`))
    .map((pair) => pair.slice(PATH_PARAM.length + 1));

  if (encodedPaths.length !== 1) {
    misroutedResponse(
      res,
      encodedPaths.length === 0
        ? 'The rewrite did not supply a path.'
        : 'The rewrite supplied more than one path.',
    );
    return;
  }

  const rest = pairs.filter((pair) => !pair.startsWith(`${PATH_PARAM}=`));
  res.setHeader('x-dd-received', requestUrl);

  req.url = `/api/${encodedPaths[0]}${rest.length > 0 ? `?${rest.join('&')}` : ''}`;
  res.setHeader('x-dd-rebuilt', req.url);

  (app as unknown as (a: IncomingMessage, b: ServerResponse) => void)(req, res);
}
