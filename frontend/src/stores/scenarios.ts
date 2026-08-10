import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { ScenarioDetailResponse, ScenarioSummary, Stage } from '@dd/shared';
import { api, ApiError } from '@/api/client';

export const useScenariosStore = defineStore('scenarios', () => {
  const list = ref<ScenarioSummary[]>([]);
  const current = ref<ScenarioDetailResponse | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const stage = computed<Stage>(() => current.value?.state.stage ?? 'brief');

  async function load<T>(fetch: () => Promise<T>): Promise<T> {
    loading.value = true;
    error.value = null;
    try {
      return await fetch();
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : 'Something went wrong.';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  function requireCurrent(): ScenarioDetailResponse {
    const scenario = current.value;
    if (!scenario) throw new Error('No scenario loaded');
    return scenario;
  }

  async function fetchList() {
    list.value = await load(async () => (await api.listScenarios()).scenarios);
  }

  async function fetchDetail(id: number, force = false) {
    if (!force && current.value?.id === id) return;
    current.value = await load(() => api.getScenario(id));
  }

  async function answer(questionId: number, optionId: string) {
    const scenario = requireCurrent();
    const result = await api.answer(scenario.id, questionId, optionId);
    scenario.state = result.state;

    const question = scenario.questions.find((q) => q.id === questionId);
    if (question && result.correct) {
      question.solved = true;
      question.explanation = result.explanation;
    }

    if (result.justUnlockedVulnerableLines || (result.state.quizComplete && !scenario.debrief)) {
      await fetchDetail(scenario.id, true);
    }
    return result;
  }

  async function requestHint(questionId: number) {
    const scenario = requireCurrent();
    const result = await api.hint(scenario.id, questionId);
    scenario.state = result.state;

    const question = scenario.questions.find((q) => q.id === questionId);
    question?.hintsRevealed.push(result.hint);
    return result;
  }

  async function submitEthicalChoice(choiceId: number) {
    const scenario = requireCurrent();
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
