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
import { getLearnerId } from '@/auth/learnerId';
import { supabase } from '@/auth/supabase';

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
 * A signed-in learner is identified by their Supabase token; everyone else falls back
 * to the anonymous UUID from ADR 0006. The backend accepts either and produces the
 * same `learnerId`, so no caller here has to care which one is in play.
 */
async function identityHeaders(): Promise<Record<string, string>> {
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) return { Authorization: `Bearer ${token}` };
  }
  return { 'X-Learner-Id': getLearnerId() };
}

async function request<T>(path: string, schema: ZodType<T>, init?: RequestInit): Promise<T> {
  const identity = await identityHeaders();

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...identity,
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
