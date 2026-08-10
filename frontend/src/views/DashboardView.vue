<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { CheckCircle2, FolderOpen, Lightbulb, Target } from 'lucide-vue-next';
import ScenarioCard from '@/components/feature/ScenarioCard.vue';
import StatTile from '@/components/ui/StatTile.vue';
import { useProgressStore } from '@/stores/progress';
import { useScenariosStore } from '@/stores/scenarios';

const router = useRouter();
const scenarios = useScenariosStore();
const progress = useProgressStore();

onMounted(() => {
  void Promise.allSettled([scenarios.fetchList(), progress.fetch()]);
});

function openCase(id: number) {
  void router.push({ name: 'brief', params: { id } });
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <section>
      <h1 class="text-xl font-semibold">Open cases</h1>
      <p class="mt-1 text-sm text-muted">
        Each case is a real incident pattern. Read the brief, inspect the repository, and report
        what you find.
      </p>
    </section>

    <section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile label="Cases solved" :value="progress.stats.casesSolved" :icon="CheckCircle2" />
      <StatTile label="Cases opened" :value="progress.stats.casesStarted" :icon="FolderOpen" />
      <StatTile
        label="Average score"
        :value="progress.stats.averageScore ?? '—'"
        :icon="Target"
        hint="Completed cases only"
      />
      <StatTile label="Hints used" :value="progress.stats.hintsUsed" :icon="Lightbulb" />
    </section>

    <section>
      <p v-if="scenarios.loading" class="text-sm text-muted">Loading cases…</p>

      <p v-else-if="scenarios.error" class="text-sm text-sev-critical">
        {{ scenarios.error }}
      </p>

      <p v-else-if="scenarios.list.length === 0" class="text-sm text-muted">
        No cases have been seeded yet.
      </p>

      <div v-else class="grid gap-4 md:grid-cols-2">
        <ScenarioCard
          v-for="scenario in scenarios.list"
          :key="scenario.id"
          :scenario="scenario"
          @open="openCase"
        />
      </div>
    </section>
  </div>
</template>
