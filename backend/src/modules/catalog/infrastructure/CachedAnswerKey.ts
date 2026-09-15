import type { ContentCache } from '../../../platform/cache/ContentCache.js';
import type { AnswerKey } from '../application/ports.js';
import type { AnswerVerdict, DebriefContent, EthicalOutcomeContent } from '../domain/readModels.js';

/**
 * The answer key, memoised. The key is authored content like everything else here,
 * and it is read on every answer, every hint and every debrief — but it is cached
 * behind the same port, so nothing gains a way to ask it a question it would not
 * have answered before: a verdict for an option a learner has actually chosen.
 */
export class CachedAnswerKey implements AnswerKey {
  constructor(
    private readonly inner: AnswerKey,
    private readonly cache: ContentCache,
  ) {}

  checkAnswer(questionId: number, optionId: string): Promise<AnswerVerdict | null> {
    return this.cache.get(`answer:${questionId}:${optionId}`, () =>
      this.inner.checkAnswer(questionId, optionId),
    );
  }

  hintAt(questionId: number, index: number): Promise<string | null> {
    return this.cache.get(`hint:${questionId}:${index}`, () =>
      this.inner.hintAt(questionId, index),
    );
  }

  revealedHints(questionId: number, count: number): Promise<string[]> {
    return this.cache.get(`hints:${questionId}:${count}`, () =>
      this.inner.revealedHints(questionId, count),
    );
  }

  explanationFor(questionId: number): Promise<string | null> {
    return this.cache.get(`explanation:${questionId}`, () => this.inner.explanationFor(questionId));
  }

  vulnerableLines(scenarioId: number): Promise<Record<string, number[]>> {
    return this.cache.get(`lines:${scenarioId}`, () => this.inner.vulnerableLines(scenarioId));
  }

  debrief(scenarioId: number): Promise<DebriefContent | null> {
    return this.cache.get(`debrief:${scenarioId}`, () => this.inner.debrief(scenarioId));
  }

  ethicalOutcome(choiceId: number): Promise<EthicalOutcomeContent | null> {
    return this.cache.get(`outcome:${choiceId}`, () => this.inner.ethicalOutcome(choiceId));
  }
}
