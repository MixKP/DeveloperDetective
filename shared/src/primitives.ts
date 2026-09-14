import { z } from 'zod';

export const severitySchema = z.enum(['Critical', 'High', 'Medium']);
export type Severity = z.infer<typeof severitySchema>;

export const questionKindSchema = z.enum(['locate', 'explain', 'solve']);
export type QuestionKind = z.infer<typeof questionKindSchema>;

export const ethicalQualitySchema = z.enum(['good', 'neutral', 'bad']);
export type EthicalQuality = z.infer<typeof ethicalQualitySchema>;

export const stageSchema = z.enum(['brief', 'investigate', 'quiz', 'debrief']);
export type Stage = z.infer<typeof stageSchema>;

export const idParamSchema = z.coerce.number().int().positive();

export const testVariantSchema = z.enum(['pre', 'post']);
export type TestVariant = z.infer<typeof testVariantSchema>;

export const ethicsPrincipleSchema = z.enum([
  'public',
  'client-and-employer',
  'product',
  'judgement',
  'management',
  'profession',
  'colleagues',
  'self',
]);
export type EthicsPrinciple = z.infer<typeof ethicsPrincipleSchema>;
