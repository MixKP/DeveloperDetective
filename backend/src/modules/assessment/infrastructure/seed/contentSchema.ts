import { z } from 'zod';

const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  // Required on every option, including the right one: a learner who answers
  // wrongly is owed the name of the principle they missed, and one who answers
  // correctly is owed the name of the one they applied.
  feedback: z.string().min(1),
});

const principleSchema = z.enum([
  'public',
  'client-and-employer',
  'product',
  'judgement',
  'management',
  'profession',
  'colleagues',
  'self',
]);

const questionSchema = z
  .object({
    principle: z.enum([
      'public',
      'client-and-employer',
      'product',
      'judgement',
      'management',
      'profession',
      'colleagues',
      'self',
    ]),
    clause: z.string().min(1),
    prompt: z.string().min(1),
    options: z.array(optionSchema).min(2),
    correctOption: z.string().min(1),
    explanation: z.string().min(1),
  })
  .refine((q) => q.options.some((o) => o.id === q.correctOption), {
    message: 'correctOption must match one of the option ids',
    path: ['correctOption'],
  })
  .refine((q) => new Set(q.options.map((o) => o.id)).size === q.options.length, {
    message: 'option ids must be unique',
    path: ['options'],
  });

export const knowledgeTestContentSchema = z
  .object({
    slug: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/, 'slug must be lowercase kebab-case'),
    variant: z.enum(['pre', 'post']),
    title: z.string().min(1),
    description: z.string().min(1),
    /**
     * How many questions one sitting asks. The bank is deliberately larger, so a
     * retake can deal a different hand (ADR 0010); a test that omits this asks
     * everything it has, which is the old behaviour.
     */
    questionsPerAttempt: z.number().int().positive().optional(),
    /** What to revise, per principle. Shown only after a sitting missed one. */
    guidance: z.record(principleSchema, z.string().min(1)).default({}),
    questions: z.array(questionSchema).min(1),
  })
  .refine((t) => (t.questionsPerAttempt ?? t.questions.length) <= t.questions.length, {
    message: 'questionsPerAttempt asks for more questions than the test has',
    path: ['questionsPerAttempt'],
  })
  // Guidance is what a wrong answer is answered with, so every principle the test
  // can mark wrong has to have some.
  .refine((t) => t.questions.every((q) => t.guidance[q.principle] !== undefined), {
    message: 'every principle a question covers needs guidance authored for it',
    path: ['guidance'],
  })
  // Drafting a bank one question at a time tends to park the right answer in the
  // same slot every time, which a learner can exploit without reading anything.
  .refine(
    (t) =>
      t.questions.length < 4 ||
      new Set(t.questions.map((q) => q.options.findIndex((o) => o.id === q.correctOption))).size >
        1,
    {
      message: 'the correct answer sits in the same position in every question',
      path: ['questions'],
    },
  );

export type KnowledgeTestContentInput = z.infer<typeof knowledgeTestContentSchema>;
