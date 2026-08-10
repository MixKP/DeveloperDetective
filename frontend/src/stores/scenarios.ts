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

  /**
   * Runs a fetch with the loading flag and the error message wired up. Only the two loaders
   * use it: the mutations below surface their failures through the component that called
   * them, so a wrong answer must not paint the whole screen with an error banner.
   */
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

  /** The mutations below all act on the loaded scenario, and none of them can create one. */
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

    // Gated content only ever arrives with the detail payload, so any answer that opens a
    // gate leaves the cached payload stale:
    //
    //  - an unlock means the code viewer is still showing empty highlights
    //  - finishing the quiz means `debrief` is still null, and the debrief screen would
    //    render nothing at all — the entire payoff of the case
    //
    // The router guard cannot save us here: fetchDetail early-returns for the scenario
    // already loaded, so navigating to the debrief would reuse this stale payload.
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
