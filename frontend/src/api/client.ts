import {
  apiErrorSchema,
  answerResponseSchema,
  hintResponseSchema,
  progressResponseSchema,
  scenarioDetailResponseSchema,
  scenarioListResponseSchema,
  submitProgressResponseSchema,
  type AnswerResponse,
  type ErrorCode,
  type HintResponse,
  type ProgressResponse,
  type ScenarioDetailResponse,
  type ScenarioListResponse,
  type SubmitProgressRequest,
  type SubmitProgressResponse,
} from '@dd/shared';
import type { ZodType } from 'zod';
import { getLearnerId } from './learnerId.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Responses are parsed through the same Zod schemas the backend validates against, not
 * merely cast. A contract drift then fails loudly at the fetch boundary instead of
 * surfacing as `undefined is not an object` three components deep.
 */
async function request<T>(path: string, schema: ZodType<T>, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        'X-Learner-Id': getLearnerId(),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError('INTERNAL_ERROR', 'Could not reach the server.', 0);
  }

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    throw new ApiError(
      parsed.success ? parsed.data.error.code : 'INTERNAL_ERROR',
      parsed.success ? parsed.data.error.message : `Request failed (${response.status}).`,
      response.status,
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      'INTERNAL_ERROR',
      'The server sent an unexpected response.',
      response.status,
    );
  }
  return parsed.data;
}

export const api = {
  listScenarios: (): Promise<ScenarioListResponse> =>
    request('/scenarios', scenarioListResponseSchema),

  getScenario: (id: number): Promise<ScenarioDetailResponse> =>
    request(`/scenarios/${id}`, scenarioDetailResponseSchema),

  answer: (scenarioId: number, questionId: number, optionId: string): Promise<AnswerResponse> =>
    request(`/scenarios/${scenarioId}/questions/${questionId}/answer`, answerResponseSchema, {
      method: 'POST',
      body: JSON.stringify({ optionId }),
    }),

  /** No body: which hint comes next is server state, not a client choice. */
  hint: (scenarioId: number, questionId: number): Promise<HintResponse> =>
    request(`/scenarios/${scenarioId}/questions/${questionId}/hint`, hintResponseSchema, {
      method: 'POST',
    }),

  submitProgress: (payload: SubmitProgressRequest): Promise<SubmitProgressResponse> =>
    request('/progress', submitProgressResponseSchema, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getProgress: (): Promise<ProgressResponse> => request('/progress', progressResponseSchema),
};
