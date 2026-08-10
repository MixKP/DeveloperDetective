import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ProgressRecord, ProgressStats } from '@dd/shared';
import { api, ApiError } from '@/api/client';

const EMPTY_STATS: ProgressStats = {
  casesSolved: 0,
  casesStarted: 0,
  averageScore: null,
  hintsUsed: 0,
};

export const useProgressStore = defineStore('progress', () => {
  const records = ref<ProgressRecord[]>([]);
  const stats = ref<ProgressStats>({ ...EMPTY_STATS });
  const loading = ref(false);
  const error = ref<string | null>(null);

  async function fetch() {
    loading.value = true;
    error.value = null;
    try {
      const result = await api.getProgress();
      records.value = result.records;
      stats.value = result.stats;
    } catch (e) {
      error.value = e instanceof ApiError ? e.message : 'Could not load your progress.';
      throw e;
    } finally {
      loading.value = false;
    }
  }

  return { records, stats, loading, error, fetch };
});
