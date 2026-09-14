import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { testsDirectory } from '../../src/modules/assessment/content/index.js';
import { knowledgeTestContentSchema } from '../../src/modules/assessment/infrastructure/seed/contentSchema.js';

const files = readdirSync(testsDirectory).filter((f) => f.endsWith('.json'));

const PRINCIPLES = [
  'public',
  'client-and-employer',
  'product',
  'judgement',
  'management',
  'profession',
  'colleagues',
  'self',
];

describe('authored knowledge tests', () => {
  it('ships the required post-test', () => {
    expect(files).toContain('ethics-post-test.json');
  });

  describe.each(files)('%s', (fileName) => {
    const raw: unknown = JSON.parse(readFileSync(path.join(testsDirectory, fileName), 'utf8'));
    const parsed = knowledgeTestContentSchema.safeParse(raw);

    it('satisfies the authoring schema', () => {
      if (!parsed.success) {
        throw new Error(
          parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n'),
        );
      }
      expect(parsed.success).toBe(true);
    });

    it('covers all eight principles of the Code', () => {
      if (!parsed.success) return;
      const covered = new Set(parsed.data.questions.map((q) => q.principle));
      for (const principle of PRINCIPLES) {
        expect([...covered], `no question covers "${principle}"`).toContain(principle);
      }
    });

    it('tells a wrong answer which principle it breached', () => {
      if (!parsed.success) return;
      for (const question of parsed.data.questions) {
        for (const option of question.options) {
          if (option.id === question.correctOption) continue;
          expect(
            /Principle \d|principle|clause/i.test(option.feedback),
            `${question.principle} option ${option.id} does not name a principle`,
          ).toBe(true);
        }
      }
    });

    it('does not park the correct answer in one position', () => {
      if (!parsed.success) return;
      const positions = parsed.data.questions.map((q) =>
        q.options.findIndex((o) => o.id === q.correctOption),
      );
      expect(new Set(positions).size).toBeGreaterThan(1);
    });
  });
});
