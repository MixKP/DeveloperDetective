import { seedFrom, shuffle } from './shuffle.js';
import type { EthicsPrinciple } from './readModels.js';

export interface DrawCandidate {
  id: number;
  principle: EthicsPrinciple;
  orderIndex: number;
}

/**
 * Which questions one sitting asks.
 *
 * A retake that asked the same questions would measure recall of the last result
 * rather than the Code, so the draw spends unseen questions first. It also keeps
 * one question per principle for as long as the pool allows: the test reports
 * coverage of all eight, and a sitting that happened to ask four questions about
 * Principle 1 would not support that claim.
 *
 * The result is a pure function of the pool, what has been seen, and the seed, so
 * `GetKnowledgeTest` and `SubmitAttempt` derive the same sitting independently —
 * no draw has to be stored between the two requests.
 */
export class QuestionDraw {
  static select(
    pool: readonly DrawCandidate[],
    seen: ReadonlySet<number>,
    count: number,
    seed: number,
  ): number[] {
    const byPrinciple = new Map<EthicsPrinciple, DrawCandidate[]>();
    for (const candidate of [...pool].sort((a, b) => a.orderIndex - b.orderIndex)) {
      const group = byPrinciple.get(candidate.principle) ?? [];
      group.push(candidate);
      byPrinciple.set(candidate.principle, group);
    }

    // Principles are rotated as a whole, so a test shorter than the Code still
    // moves across it between sittings instead of always asking the same few.
    const groups = shuffle([...byPrinciple.values()], seed);
    const taken = new Set<number>();
    const picked: DrawCandidate[] = [];

    const take = (candidate: DrawCandidate | undefined): boolean => {
      if (!candidate || picked.length >= count) return false;
      picked.push(candidate);
      taken.add(candidate.id);
      return true;
    };

    const available = (group: readonly DrawCandidate[], freshOnly: boolean) =>
      group.filter((c) => !taken.has(c.id) && (!freshOnly || !seen.has(c.id)));

    // One unseen question per principle, then — only for the principles whose
    // questions have all been asked before — one repeat, so coverage survives a
    // learner who has been through the whole bank.
    for (const group of groups) take(available(group, true)[0]);
    for (const group of groups) {
      if (group.some((c) => taken.has(c.id))) continue;
      take(available(group, false)[0]);
    }

    // Anything still owed on a test longer than the number of principles.
    for (const freshOnly of [true, false]) {
      for (const group of groups) {
        for (const candidate of available(group, freshOnly)) {
          if (!take(candidate)) break;
        }
      }
    }

    return shuffle(picked, seed + 1).map((candidate) => candidate.id);
  }
}

/** The seed for one learner's sitting: stable per attempt, different per learner. */
export const sittingSeed = (learnerId: string, testId: number, attemptNumber: number): number =>
  seedFrom(learnerId, testId, attemptNumber);
