import type { EthicalQuality, Severity, Stage } from '@dd/shared';

/**
 * Domain value → styling. Components read from these maps instead of branching on domain
 * values inline, which keeps them declarative and keeps colour decisions in one file.
 */

export const severityStyles: Record<Severity, { text: string; bg: string; ring: string }> = {
  Critical: {
    text: 'text-sev-critical',
    bg: 'bg-sev-critical/10',
    ring: 'ring-sev-critical/30',
  },
  High: {
    text: 'text-sev-high',
    bg: 'bg-sev-high/10',
    ring: 'ring-sev-high/30',
  },
  Medium: {
    text: 'text-sev-medium',
    bg: 'bg-sev-medium/10',
    ring: 'ring-sev-medium/30',
  },
};

export const qualityStyles: Record<EthicalQuality, { text: string; bg: string; ring: string }> = {
  good: {
    text: 'text-quality-good',
    bg: 'bg-quality-good/10',
    ring: 'ring-quality-good/30',
  },
  neutral: {
    text: 'text-quality-neutral',
    bg: 'bg-quality-neutral/10',
    ring: 'ring-quality-neutral/30',
  },
  bad: {
    text: 'text-quality-bad',
    bg: 'bg-quality-bad/10',
    ring: 'ring-quality-bad/30',
  },
};

/** Human labels for the consequence panel. Deliberately not judgemental in tone. */
export const qualityLabels: Record<EthicalQuality, string> = {
  good: 'Defensible call',
  neutral: 'Mixed outcome',
  bad: 'Costly call',
};

export const stageOrder: Stage[] = ['brief', 'investigate', 'quiz', 'debrief'];

export const stageLabels: Record<Stage, string> = {
  brief: 'Incident brief',
  investigate: 'Investigate',
  quiz: 'Findings',
  debrief: 'Debrief',
};

/**
 * Which stages the learner may navigate to.
 *
 * Only the debrief is gated, and only on whether the quiz is finished. An earlier version
 * compared against the run's reported `stage`, which deadlocked the flow: a learner who had
 * read the code but not yet answered anything reported stage `investigate`, so the guard
 * refused them the quiz — the one place they could go to make progress.
 *
 * This matches ADR 0005: the brief, the repository and the questions are all freely
 * revisitable; the debrief is the answer, so it waits until the work is done.
 */
export function stageReachable(target: Stage, quizComplete: boolean): boolean {
  return target !== 'debrief' || quizComplete;
}
