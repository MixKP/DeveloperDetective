import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { ScenarioDetailResponse, ScenarioSummary, Stage } from '@dd/shared';
import { api, ApiError } from '@/api/client';

export const useScenariosStore = defineStore('scenarios', () => {
  const list = ref<ScenarioSummary[]>([]);
  const current = ref<ScenarioDetailResponse | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  /**
   * The furthest stage this learner may reach, straight from the server. The router guard
   * reads it, but it is advisory here — the API refuses gated content regardless of what
   * the client believes.
   */
  const stage = computed<Stage>(() => current.value?.state.stage ?? 'brief');

  function fail(e: unknown): never {
    error.value = e instanceof ApiError ? e.message : 'Something went wrong.';
    throw e;
  }

  async function fetchList() {
    loading.value = true;
    error.value = null;
    try {
      list.value = (await api.listScenarios()).scenarios;
    } catch (e) {
      fail(e);
    } finally {
      loading.value = false;
    }
  }

  async function fetchDetail(id: number, force = false) {
    if (!force && current.value?.id === id) return;
    loading.value = true;
    error.value = null;
    try {
      current.value = await api.getScenario(id);
    } catch (e) {
      fail(e);
    } finally {
      loading.value = false;
    }
  }

  async function answer(questionId: number, optionId: string) {
    const scenario = current.value;
    if (!scenario) throw new Error('No scenario loaded');

    const result = await api.answer(scenario.id, questionId, optionId);
    scenario.state = result.state;

    const question = scenario.questions.find((q) => q.id === questionId);
    if (question && result.correct) {
      question.solved = true;
      question.explanation = result.explanation;
    }

    // Vulnerable lines only ever arrive with the detail payload, so an unlock means the
    // code viewer is now showing stale (empty) highlights until we refetch.
    if (result.justUnlockedVulnerableLines) {
      await fetchDetail(scenario.id, true);
    }
    return result;
  }

  async function requestHint(questionId: number) {
    const scenario = current.value;
    if (!scenario) throw new Error('No scenario loaded');

    const result = await api.hint(scenario.id, questionId);
    scenario.state = result.state;

    const question = scenario.questions.find((q) => q.id === questionId);
    question?.hintsRevealed.push(result.hint);
    return result;
  }

  async function submitEthicalChoice(choiceId: number) {
    const scenario = current.value;
    if (!scenario) throw new Error('No scenario loaded');

    const result = await api.submitProgress({
      scenarioId: scenario.id,
      completed: true,
      ethicalChoiceId: choiceId,
    });
    scenario.state = result.state;
    scenario.ethicalOutcome = result.ethicalOutcome;
    return result;
  }

  return {
    list,
    current,
    loading,
    error,
    stage,
    fetchList,
    fetchDetail,
    answer,
    requestHint,
    submitEthicalChoice,
  };
});
