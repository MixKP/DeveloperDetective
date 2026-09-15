import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { AttemptResult, KnowledgeTestResponse, TestEligibility } from '@dd/shared';
import { api, ApiError } from '@/api/client';

export const useKnowledgeTestStore = defineStore('knowledgeTest', () => {
  const test = ref<KnowledgeTestResponse | null>(null);
  const loading = ref(false);
  const submitting = ref(false);
  const error = ref<string | null>(null);

  const attempt = computed<AttemptResult | null>(() => test.value?.attempt ?? null);
  const taken = computed(() => attempt.value !== null);
  const eligibility = computed<TestEligibility | null>(() => test.value?.eligibility ?? null);
  /** Locked means the server withheld the questions, not that the client is hiding them. */
  const locked = computed(() => eligibility.value !== null && !eligibility.value.eligible);

  /**
   * Cached once the test is open, re-fetched while it is locked: closing a case is what
   * opens it, and that happens in a different part of the app entirely.
   */
  async function fetch(force = false) {
    if (!force && test.value && !locked.value) return;
    loading.value = true;
    error.value = null;
    try {
      test.value = await api.getKnowledgeTest('post');
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : 'Could not load the knowledge check.';
    } finally {
      loading.value = false;
    }
  }

  async function submit(answers: Record<number, string>) {
    const current = test.value;
    if (!current) return;

    submitting.value = true;
    error.value = null;
    try {
      const result = await api.submitAttempt('post', {
        responses: current.questions.map((question) => ({
          questionId: question.id,
          optionId: answers[question.id] ?? '',
        })),
      });
      current.attempt = result.attempt;
      // The sitting just recorded belongs in the record too. Built from the response
      // rather than re-fetched: it is the same data the server would send back.
      current.history = [
        ...current.history,
        {
          attemptNumber: result.attempt.attemptNumber,
          score: result.attempt.score,
          total: result.attempt.total,
          submittedAt: result.attempt.submittedAt,
        },
      ];
    } catch (e) {
      const message = e instanceof ApiError ? e.message : 'Could not record your answers.';
      // A refused submission usually means another tab already recorded one, so the
      // authoritative attempt is on the server rather than in this tab's state. The
      // message is set after that refetch, which clears the error on its way in.
      if (e instanceof ApiError && e.code === 'RULE_VIOLATION') await fetch(true);
      error.value = message;
      throw e;
    } finally {
      submitting.value = false;
    }
  }

  /**
   * A retake: the server deals the next sitting from the same bank, so all the
   * client has to do is ask for the test again (ADR 0010).
   */
  async function retake() {
    await fetch(true);
  }

  /** The attempt belongs to a learner, not to the browser. */
  function reset() {
    test.value = null;
    error.value = null;
  }

  return {
    test,
    attempt,
    taken,
    eligibility,
    locked,
    loading,
    submitting,
    error,
    fetch,
    submit,
    retake,
    reset,
  };
});
