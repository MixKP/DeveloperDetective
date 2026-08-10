import { z } from 'zod';

/** Incident severity, used for card styling and sorting. */
export const severitySchema = z.enum(['Critical', 'High', 'Medium']);
export type Severity = z.infer<typeof severitySchema>;

/**
 * The three kinds of investigation question.
 * `locate` is special: solving one unlocks vulnerable-line highlighting for the scenario.
 */
export const questionKindSchema = z.enum(['locate', 'explain', 'solve']);
export type QuestionKind = z.infer<typeof questionKindSchema>;

/** How defensible an ethical response is. Never sent before the learner has chosen. */
export const ethicalQualitySchema = z.enum(['good', 'neutral', 'bad']);
export type EthicalQuality = z.infer<typeof ethicalQualitySchema>;

/** The narrative stage machine. The server is the authority on which stage a learner is in. */
export const stageSchema = z.enum(['brief', 'investigate', 'quiz', 'debrief']);
export type Stage = z.infer<typeof stageSchema>;

/**
 * Learner identifier: a client-generated UUID held in localStorage.
 *
 * This is a pseudonymous progress key, NOT authentication. Anyone presenting a given
 * UUID gets that UUID's progress. Acceptable here because the data is non-sensitive
 * (quiz scores, no PII). Do not extend it into an auth mechanism.
 */
export const learnerIdSchema = z.string().uuid();
export type LearnerId = z.infer<typeof learnerIdSchema>;

/** Numeric path params arrive as strings; coerce and constrain in one place. */
export const idParamSchema = z.coerce.number().int().positive();
