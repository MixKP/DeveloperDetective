import { z } from 'zod';

const optionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  // Required on every option, including the right one: a learner who answers
  // wrongly is owed the name of the principle they missed, and one who answers
  // correctly is owed the name of the one they applied.
  feedback: z.string().min(1),
});

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
    questions: z.array(questionSchema).min(1),
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
