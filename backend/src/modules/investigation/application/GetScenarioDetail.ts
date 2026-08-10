import type { ScenarioDetailResponse, QuestionView } from '@dd/shared';
import type { AnswerKey, ScenarioCatalog } from '../../catalog/index.js';
import { Investigation } from '../domain/Investigation.js';
import { SCORING } from '../domain/Score.js';
import { NotFoundError } from './errors.js';
import type { InvestigationRepository } from './ports.js';
import { toInvestigationState } from './toState.js';

/**
 * Builds the workspace payload for one case.
 *
 * Every gated field is fetched only after the corresponding rule has already said yes. The
 * gating is not "fetch everything then strip" — unrevealed secrets are never loaded at all,
 * so there is no sanitization step to forget.
 */
export class GetScenarioDetail {
  constructor(
    private readonly catalog: ScenarioCatalog,
    private readonly answerKey: AnswerKey,
    private readonly investigations: InvestigationRepository,
  ) {}

  async execute(learnerId: string, scenarioId: number): Promise<ScenarioDetailResponse> {
    const content = await this.catalog.findById(scenarioId);
    if (!content) throw new NotFoundError('Scenario');

    // Opening a case starts the run. This is also what makes `state` non-null here while
    // the dashboard summary may still show null for cases never opened.
    let run = await this.investigations.find(learnerId, scenarioId);
    if (!run) {
      run = Investigation.start(learnerId, scenarioId);
      await this.investigations.save(run);
    }

    const totalQuestions = content.questions.length;

    // --- gated content ------------------------------------------------------
    const vulnerableLines = run.canRevealVulnerableLines()
      ? await this.answerKey.vulnerableLines(scenarioId)
      : {};

    const debrief = run.isQuizComplete(totalQuestions)
      ? await this.answerKey.debrief(scenarioId)
      : null;

    const ethicalOutcome =
      run.ethicalChoiceId !== null
        ? await this.answerKey.ethicalOutcome(run.ethicalChoiceId)
        : null;

    const questions: QuestionView[] = await Promise.all(
      content.questions.map(async (q) => {
        const solved = run.hasSolved(q.id);
        return {
          id: q.id,
          kind: q.kind,
          prompt: q.prompt,
          options: q.options,
          orderIndex: q.orderIndex,
          hintsTotal: q.hintsTotal,
          hintsRevealed: await this.answerKey.revealedHints(q.id, run.hintsRevealedFor(q.id)),
          solved,
          explanation: solved ? await this.answerKey.explanationFor(q.id) : null,
        };
      }),
    );

    return {
      id: content.id,
      slug: content.slug,
      title: content.title,
      summary: content.summary,
      severity: content.severity,
      tags: content.tags,
      estimatedMinutes: content.estimatedMinutes,
      language: content.language,
      brief: content.brief,
      files: content.files.map((f) => ({
        id: f.id,
        path: f.path,
        language: f.language,
        code: f.code,
        recentlyChanged: f.recentlyChanged,
        vulnerableLines: vulnerableLines[f.path] ?? [],
      })),
      questions,
      ethicalChoices: content.ethicalChoices.map((c) => ({ id: c.id, text: c.text })),
      debrief,
      ethicalOutcome,
      scoring: {
        base: SCORING.base,
        hintPenalty: SCORING.hintPenalty,
        wrongAttemptPenalty: SCORING.wrongAttemptPenalty,
        floor: SCORING.floor,
      },
      state: toInvestigationState(run, totalQuestions),
    };
  }
}
