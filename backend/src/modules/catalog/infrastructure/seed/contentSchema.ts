import { z } from 'zod';

const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
});

const questionSchema = z
  .object({
    kind: z.enum(['locate', 'explain', 'solve']),
    prompt: z.string().min(1),
    options: z.array(optionSchema).min(2),
    correctOption: z.string().min(1),
    explanation: z.string().min(1),
    hints: z.array(z.string().min(1)).default([]),
  })
  .refine((q) => q.options.some((o) => o.id === q.correctOption), {
    message: 'correctOption must match one of the option ids',
    path: ['correctOption'],
  })
  .refine((q) => new Set(q.options.map((o) => o.id)).size === q.options.length, {
    message: 'option ids must be unique',
    path: ['options'],
  });

const fileSchema = z
  .object({
    path: z.string().min(1),
    language: z.string().min(1),
    code: z.string().min(1),
    vulnerableLines: z.array(z.number().int().positive()).default([]),
    previousCode: z.string().nullable().default(null),
    recentlyChanged: z.boolean().default(false),
  })
  .refine((f) => f.vulnerableLines.every((line) => line <= f.code.split('\n').length), {
    message: 'vulnerableLines points past the end of the file',
    path: ['vulnerableLines'],
  })
  // A file the deploy touched is exactly a file with a before, and the viewer decides
  // which editor to render from that. Letting the two disagree would show a learner a
  // diff for an untouched file, or hide the diff on the one the brief points at.
  .refine((f) => f.recentlyChanged === (f.previousCode !== null), {
    message: 'recentlyChanged must be true exactly when previousCode is set',
    path: ['previousCode'],
  })
  .refine((f) => f.previousCode !== f.code, {
    message: 'previousCode is identical to code, so the diff would be empty',
    path: ['previousCode'],
  });

export const scenarioContentSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, 'slug must be lowercase kebab-case'),
    title: z.string().min(1),
    summary: z.string().min(1),
    severity: z.enum(['Critical', 'High', 'Medium']),
    tags: z.array(z.string().min(1)).default([]),
    estimatedMinutes: z.number().int().positive(),
    language: z.string().min(1),
    brief: z.object({
      sender: z.string().min(1),
      senderRole: z.string().min(1),
      subject: z.string().min(1),
      receivedAt: z.string().min(1),
      body: z.string().min(1),
      objectives: z.array(z.string().min(1)).min(1),
    }),
    debrief: z.object({
      rootCause: z.string().min(1),
      businessImpact: z.string().min(1),
      remediation: z.string().min(1),
    }),
    files: z.array(fileSchema).min(1),
    questions: z.array(questionSchema).min(1),
    ethicalChoices: z
      .array(
        z.object({
          text: z.string().min(1),
          quality: z.enum(['good', 'neutral', 'bad']),
          outcome: z.string().min(1),
        }),
      )
      .min(2),
  })
  .refine((s) => s.questions.some((q) => q.kind === 'locate'), {
    message: 'a scenario needs at least one `locate` question to unlock line highlighting',
    path: ['questions'],
  })
  .refine((s) => s.files.some((f) => f.vulnerableLines.length > 0), {
    message: 'at least one file must flag vulnerable lines',
    path: ['files'],
  })
  .refine((s) => new Set(s.files.map((f) => f.path)).size === s.files.length, {
    message: 'file paths must be unique within a scenario',
    path: ['files'],
  });

export type ScenarioContentInput = z.infer<typeof scenarioContentSchema>;
