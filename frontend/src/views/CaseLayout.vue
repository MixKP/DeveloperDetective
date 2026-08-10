<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import SeverityBadge from '@/components/ui/SeverityBadge.vue';
import { stageLabels, stageOrder, stageReachable } from '@/design/theme';
import { useScenariosStore } from '@/stores/scenarios';

const scenarios = useScenariosStore();

// The detail is already loaded by the router guard before this layout renders.
const scenario = computed(() => scenarios.current);
const quizComplete = computed(() => scenario.value?.state.quizComplete === true);
</script>

<template>
  <div v-if="scenario" class="flex flex-col gap-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-xl font-semibold">{{ scenario.title }}</h1>
        <p class="mt-1 text-sm text-muted">{{ scenario.summary }}</p>
      </div>
      <div class="flex items-center gap-3">
        <SeverityBadge :severity="scenario.severity" />
        <span class="text-sm font-semibold tabular-nums" aria-label="Current score">
          {{ scenario.state.score }}
        </span>
      </div>
    </header>

    <nav class="flex flex-wrap gap-1 border-b border-border" aria-label="Case stages">
      <RouterLink
        v-for="stage in stageOrder"
        :key="stage"
        :to="{ name: stage, params: { id: scenario.id } }"
        class="border-b-2 px-3 py-2 text-sm transition"
        :class="
          stageReachable(stage, quizComplete)
            ? 'border-transparent text-muted hover:text-text'
            : 'pointer-events-none border-transparent text-muted/40'
        "
        :aria-disabled="!stageReachable(stage, quizComplete)"
        :title="
          stageReachable(stage, quizComplete)
            ? undefined
            : 'Solve every question to unlock the debrief'
        "
        active-class="!border-primary !text-text font-medium"
      >
        {{ stageLabels[stage] }}
      </RouterLink>
    </nav>

    <RouterView />
  </div>

  <p v-else class="text-sm text-muted">Loading case…</p>
</template>
