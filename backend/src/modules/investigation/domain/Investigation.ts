import { RuleViolation } from './errors.js';
import { Score } from './Score.js';

export type QuestionKind = 'locate' | 'explain' | 'solve';
export type Stage = 'brief' | 'investigate' | 'quiz' | 'debrief';

export interface InvestigationSnapshot {
  learnerId: string;
  scenarioId: number;
  solvedQuestionIds: number[];
  revealedHints: Record<number, number>;
  wrongAttempts: number;
  vulnerableLinesUnlocked: boolean;
  ethicalChoiceId: number | null;
  completed: boolean;
  startedAt: Date;
  completedAt: Date | null;
}

export class Investigation {
  readonly learnerId: string;
  readonly scenarioId: number;
  readonly startedAt: Date;

  private readonly solved: Set<number>;
  private readonly hints: Map<number, number>;
  private wrongAttemptCount: number;
  private unlockedVulnerableLines: boolean;
  private chosenEthicalChoiceId: number | null;
  private isCompleted: boolean;
  private finishedAt: Date | null;

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

  canRevealVulnerableLines(): boolean {
    return this.unlockedVulnerableLines;
  }

  isQuizComplete(totalQuestions: number): boolean {
    return totalQuestions > 0 && this.solved.size >= totalQuestions;
  }

  stage(totalQuestions: number): Stage {
    if (this.isCompleted || this.isQuizComplete(totalQuestions)) return 'debrief';
    if (this.solved.size > 0 || this.hintsUsed > 0 || this.wrongAttemptCount > 0) return 'quiz';
    return 'investigate';
  }

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
    if (this.isCompleted) return;
    this.isCompleted = true;
    this.finishedAt = now;
  }
}
