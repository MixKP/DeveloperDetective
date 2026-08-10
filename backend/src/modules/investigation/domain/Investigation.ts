import { RuleViolation } from './errors.js';
import { Score } from './Score.js';

/**
 * The domain defines its own vocabulary rather than importing the HTTP contract from
 * @dd/shared. That import is a lint error by design: the wire format is allowed to change
 * without dragging the business rules along with it, and the interface layer does the
 * mapping between the two.
 */
export type QuestionKind = 'locate' | 'explain' | 'solve';
export type Stage = 'brief' | 'investigate' | 'quiz' | 'debrief';

export interface InvestigationSnapshot {
  learnerId: string;
  scenarioId: number;
  solvedQuestionIds: number[];
  /** questionId → how many hints this learner has revealed for it. */
  revealedHints: Record<number, number>;
  wrongAttempts: number;
  vulnerableLinesUnlocked: boolean;
  ethicalChoiceId: number | null;
  completed: boolean;
  startedAt: Date;
  completedAt: Date | null;
}

/**
 * A learner's run through one scenario. Every rule in the product lives here, which is what
 * makes the rules testable with no database, no HTTP, and no Supabase account.
 *
 * Persisted as a single row, so the whole aggregate loads and saves atomically.
 */
export class Investigation {
  readonly learnerId: string;
  readonly scenarioId: number;
  readonly startedAt: Date;

  /** Set and Map rather than the snapshot's array and record: membership is the only query. */
  private readonly solved: Set<number>;
  private readonly hints: Map<number, number>;
  private wrongAttemptCount: number;
  private unlockedVulnerableLines: boolean;
  private chosenEthicalChoiceId: number | null;
  private isCompleted: boolean;
  private finishedAt: Date | null;

  /** The only way in, so `toSnapshot` below is its exact inverse and stays easy to check. */
  private constructor(snapshot: InvestigationSnapshot) {
    this.learnerId = snapshot.learnerId;
    this.scenarioId = snapshot.scenarioId;
    this.startedAt = snapshot.startedAt;
    this.solved = new Set(snapshot.solvedQuestionIds);
    this.hints = new Map(
      Object.entries(snapshot.revealedHints).map(([questionId, count]) => [
        Number(questionId),
        count,
      ]),
    );
    this.wrongAttemptCount = snapshot.wrongAttempts;
    this.unlockedVulnerableLines = snapshot.vulnerableLinesUnlocked;
    this.chosenEthicalChoiceId = snapshot.ethicalChoiceId;
    this.isCompleted = snapshot.completed;
    this.finishedAt = snapshot.completedAt;
  }

  static start(learnerId: string, scenarioId: number, now: Date = new Date()): Investigation {
    return new Investigation({
      learnerId,
      scenarioId,
      solvedQuestionIds: [],
      revealedHints: {},
      wrongAttempts: 0,
      vulnerableLinesUnlocked: false,
      ethicalChoiceId: null,
      completed: false,
      startedAt: now,
      completedAt: null,
    });
  }

  /** Rebuild from persistence. The repository is the only legitimate caller. */
  static fromSnapshot(snapshot: InvestigationSnapshot): Investigation {
    return new Investigation(snapshot);
  }

  toSnapshot(): InvestigationSnapshot {
    return {
      learnerId: this.learnerId,
      scenarioId: this.scenarioId,
      solvedQuestionIds: [...this.solved],
      revealedHints: Object.fromEntries(this.hints),
      wrongAttempts: this.wrongAttemptCount,
      vulnerableLinesUnlocked: this.unlockedVulnerableLines,
      ethicalChoiceId: this.chosenEthicalChoiceId,
      completed: this.isCompleted,
      startedAt: this.startedAt,
      completedAt: this.finishedAt,
    };
  }

  // --- reads -----------------------------------------------------------------

  get hintsUsed(): number {
    let total = 0;
    for (const count of this.hints.values()) total += count;
    return total;
  }

  get wrongAttempts(): number {
    return this.wrongAttemptCount;
  }

  get score(): Score {
    return Score.derive(this.hintsUsed, this.wrongAttemptCount);
  }

  get solvedQuestionIds(): number[] {
    return [...this.solved];
  }

  get ethicalChoiceId(): number | null {
    return this.chosenEthicalChoiceId;
  }

  get completed(): boolean {
    return this.isCompleted;
  }

  get completedAt(): Date | null {
    return this.finishedAt;
  }

  hintsRevealedFor(questionId: number): number {
    return this.hints.get(questionId) ?? 0;
  }

  hasSolved(questionId: number): boolean {
    return this.solved.has(questionId);
  }

  /**
   * The progressive-reveal gate. False until a `locate` question has been answered
   * correctly, at which point the code viewer may highlight the vulnerable lines.
   *
   * This is stored state rather than something recomputed from the catalog, so answering
   * the reveal question never requires investigation to ask another module about question
   * kinds after the fact.
   */
  canRevealVulnerableLines(): boolean {
    return this.unlockedVulnerableLines;
  }

  isQuizComplete(totalQuestions: number): boolean {
    return totalQuestions > 0 && this.solved.size >= totalQuestions;
  }

  /**
   * The furthest stage this learner may navigate to. The router guard mirrors it for UX,
   * but this is the authority.
   *
   * `brief` never appears here: a run only exists once the learner has opened the case, and
   * the brief is always reachable anyway. The gate that actually matters is `debrief`,
   * which stays locked until every question is solved.
   */
  stage(totalQuestions: number): Stage {
    if (this.isCompleted || this.isQuizComplete(totalQuestions)) return 'debrief';
    if (this.solved.size > 0 || this.hintsUsed > 0 || this.wrongAttemptCount > 0) return 'quiz';
    return 'investigate';
  }

  // --- writes ----------------------------------------------------------------

  /**
   * Reveal the next hint for a question and return its zero-based index.
   * The caller supplies how many hints exist, since the question bank belongs to catalog.
   */
  revealHint(questionId: number, totalHintsForQuestion: number): number {
    if (this.solved.has(questionId)) {
      throw new RuleViolation(
        'HINTS_EXHAUSTED_FOR_SOLVED_QUESTION',
        'This question is already solved; a hint would only cost points.',
      );
    }
    const alreadyRevealed = this.hints.get(questionId) ?? 0;
    if (alreadyRevealed >= totalHintsForQuestion) {
      throw new RuleViolation('NO_MORE_HINTS', 'Every hint for this question has been revealed.');
    }
    this.hints.set(questionId, alreadyRevealed + 1);
    return alreadyRevealed;
  }

  /**
   * Record the outcome of an answer. A correct `locate` answer is what unlocks
   * vulnerable-line highlighting for the whole scenario.
   */
  recordAnswer(questionId: number, kind: QuestionKind, correct: boolean): void {
    if (this.solved.has(questionId)) {
      throw new RuleViolation(
        'QUESTION_ALREADY_SOLVED',
        'This question has already been answered correctly.',
      );
    }
    if (!correct) {
      this.wrongAttemptCount += 1;
      return;
    }
    this.solved.add(questionId);
    if (kind === 'locate') {
      this.unlockedVulnerableLines = true;
    }
  }

  /** The ethical decision closes the case, so it cannot be made before the quiz is done. */
  submitEthicalChoice(choiceId: number, totalQuestions: number): void {
    if (!this.isQuizComplete(totalQuestions)) {
      throw new RuleViolation(
        'QUIZ_NOT_COMPLETE',
        'The ethical decision comes after the investigation, not before it.',
      );
    }
    if (this.chosenEthicalChoiceId !== null) {
      throw new RuleViolation(
        'ETHICAL_CHOICE_ALREADY_MADE',
        'An ethical decision has already been recorded and cannot be retaken.',
      );
    }
    this.chosenEthicalChoiceId = choiceId;
  }

  complete(totalQuestions: number, now: Date = new Date()): void {
    if (!this.isQuizComplete(totalQuestions)) {
      throw new RuleViolation('QUIZ_NOT_COMPLETE', 'Every question must be solved first.');
    }
    if (this.chosenEthicalChoiceId === null) {
      throw new RuleViolation(
        'ETHICAL_CHOICE_REQUIRED',
        'A case is only closed once its ethical decision has been made.',
      );
    }
    if (this.isCompleted) return; // idempotent: re-submitting completion is harmless
    this.isCompleted = true;
    this.finishedAt = now;
  }
}
