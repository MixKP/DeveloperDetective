<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { CheckCircle2, FolderOpen, Lightbulb, Target } from 'lucide-vue-next';
import KnowledgeCheck from '@/components/feature/KnowledgeCheck.vue';
import ScenarioCard from '@/components/feature/ScenarioCard.vue';
import StatTile from '@/components/ui/StatTile.vue';
import { useKnowledgeTestStore } from '@/stores/knowledgeTest';
import { useProgressStore } from '@/stores/progress';
import { useScenariosStore } from '@/stores/scenarios';

const router = useRouter();
const scenarios = useScenariosStore();
const progress = useProgressStore();
const knowledgeTest = useKnowledgeTestStore();

onMounted(() => {
  void Promise.allSettled([scenarios.fetchList(), progress.fetch(), knowledgeTest.fetch()]);
});

function openCase(id: number) {
  void router.push({ name: 'brief', params: { id } });
}

async function submitKnowledgeCheck(answers: Record<number, string>) {
  try {
    await knowledgeTest.submit(answers);
  } catch {
    // The store holds the message, and a refused submission has already refreshed
    // the attempt it was refused for.
  }
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
      <!-- `scenarios.loading` also covers the detail fetch the guard runs on click.
           Gate the placeholder on there being nothing to show instead, or opening a
           case would blank the very list it was opened from. -->
      <p v-if="scenarios.loading && scenarios.list.length === 0" class="text-sm text-muted">
        Loading cases…
      </p>

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

    <!-- The post-test belongs to the learner, not to any one case, so it sits here
         rather than at the end of a debrief. It arrives locked and says so. -->
    <div v-if="knowledgeTest.test" class="flex flex-col gap-3">
      <p v-if="knowledgeTest.error" class="text-sm text-sev-critical">{{ knowledgeTest.error }}</p>
      <KnowledgeCheck
        :test="knowledgeTest.test"
        :attempt="knowledgeTest.attempt"
        :busy="knowledgeTest.submitting"
        @submit="submitKnowledgeCheck"
      />
    </div>
  </div>
</template>
