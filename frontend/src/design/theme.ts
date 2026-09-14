import type { EthicalQuality, EthicsPrinciple, Severity, Stage } from '@dd/shared';

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

export function stageReachable(target: Stage, quizComplete: boolean): boolean {
  return target !== 'debrief' || quizComplete;
}

/**
 * The eight principles of the IEEE-CS/ACM Software Engineering Code of Ethics, in
 * the Code's own order — the number is part of the label because the feedback text
 * refers to principles by number.
 */
export const principleLabels: Record<EthicsPrinciple, string> = {
  public: '1. Public',
  'client-and-employer': '2. Client and Employer',
  product: '3. Product',
  judgement: '4. Judgement',
  management: '5. Management',
  profession: '6. Profession',
  colleagues: '7. Colleagues',
  self: '8. Self',
};
