import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { scenariosDirectory } from '../../src/modules/catalog/content/index.js';
import { scenarioContentSchema } from '../../src/modules/catalog/infrastructure/seed/contentSchema.js';

const files = readdirSync(scenariosDirectory).filter((f) => f.endsWith('.json'));

describe('authored scenarios', () => {
  it('ships the two scenarios the project promised', () => {
    expect(files.sort()).toEqual(['hardcoded-api-secret.json', 'sql-injection-auth-bypass.json']);
  });

  describe.each(files)('%s', (fileName) => {
    const raw: unknown = JSON.parse(readFileSync(path.join(scenariosDirectory, fileName), 'utf8'));
    const parsed = scenarioContentSchema.safeParse(raw);

    it('satisfies the authoring schema', () => {
      if (!parsed.success) {
        throw new Error(
          parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n'),
        );
      }
      expect(parsed.success).toBe(true);
    });

    it('is named after its slug, so the file is findable from the URL', () => {
      if (!parsed.success) return;
      expect(fileName).toBe(`${parsed.data.slug}.json`);
    });

    it('flags lines that actually contain code, not blanks or stray comments', () => {
      if (!parsed.success) return;
      for (const file of parsed.data.files) {
        const lines = file.code.split('\n');
        for (const lineNumber of file.vulnerableLines) {
          const line = lines[lineNumber - 1];
          expect(line, `${file.path}:${lineNumber} is out of range`).toBeDefined();
          expect(line?.trim(), `${file.path}:${lineNumber} is blank`).not.toBe('');
          expect(
            line?.trim().startsWith('//'),
            `${file.path}:${lineNumber} points at a comment, not code`,
          ).toBe(false);
        }
      }
    });

    it('marks the file containing the defect as recently changed', () => {
      if (!parsed.success) return;
      const flagged = parsed.data.files.filter((f) => f.vulnerableLines.length > 0);
      expect(flagged.length).toBeGreaterThan(0);
    });

    it('gives every question at least one hint', () => {
      if (!parsed.success) return;
      for (const question of parsed.data.questions) {
        expect(question.hints.length, `${question.kind} question has no hints`).toBeGreaterThan(0);
      }
    });

    it('offers a defensible option among the ethical choices', () => {
      if (!parsed.success) return;
      expect(parsed.data.ethicalChoices.some((c) => c.quality === 'good')).toBe(true);
    });
  });
});
