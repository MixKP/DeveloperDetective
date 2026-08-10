import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

/**
 * Transport-level failure. Platform is generic plumbing and is forbidden by ESLint from
 * importing domain modules, so it cannot know what a `RuleViolation` is — nor should it.
 * Each module's interface layer translates its own domain errors into this type, which is
 * exactly the mapping job the interface layer exists to do.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string) => new HttpError(400, 'VALIDATION_ERROR', message);
export const notFound = (message: string) => new HttpError(404, 'NOT_FOUND', message);

/** One error envelope for every failure, so the client has a single shape to handle. */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  // Express detects an error handler by arity. Dropping this unused fourth parameter
  // would silently turn it into ordinary middleware and errors would fall through.
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'The request body or parameters were not valid.',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }

  // Unexpected failures never leak a stack trace or a driver message to the client.
  console.error('Unhandled error:', error);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on the server.' },
  });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No such endpoint.' } });
}
