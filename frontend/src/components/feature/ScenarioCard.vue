<script setup lang="ts">
import { computed } from 'vue';
import { ArrowRight, CheckCircle2, Clock, Lightbulb } from 'lucide-vue-next';
import type { ScenarioSummary } from '@dd/shared';
import BaseBadge from '@/components/ui/BaseBadge.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import SeverityBadge from '@/components/ui/SeverityBadge.vue';

const props = defineProps<{ scenario: ScenarioSummary }>();
const emit = defineEmits<{ open: [id: number] }>();

const solved = computed(() => props.scenario.state?.completed === true);
const started = computed(() => props.scenario.state !== null && !solved.value);

const actionLabel = computed(() => {
  if (solved.value) return 'Review case';
  return started.value ? 'Resume investigation' : 'Open case';
});
</script>

<template>
  <BaseCard as="article" interactive class="flex flex-col gap-4 p-5">
    <header class="flex items-start justify-between gap-3">
      <div>
        <h3 class="font-semibold text-balance">{{ scenario.title }}</h3>
        <p class="mt-1 text-sm text-muted">{{ scenario.summary }}</p>
      </div>
      <SeverityBadge :severity="scenario.severity" />
    </header>

    <div class="flex flex-wrap items-center gap-2">
      <BaseBadge v-for="tag in scenario.tags" :key="tag">{{ tag }}</BaseBadge>
    </div>

    <footer class="mt-auto flex items-center justify-between gap-3 border-t border-border pt-4">
      <div class="flex items-center gap-4 text-xs text-muted">
        <span class="inline-flex items-center gap-1">
          <Clock class="size-3.5" aria-hidden="true" />
          {{ scenario.estimatedMinutes }} min
        </span>
        <span v-if="solved" class="inline-flex items-center gap-1 text-quality-good">
          <CheckCircle2 class="size-3.5" aria-hidden="true" />
          Solved · {{ scenario.state?.score }}
        </span>
        <span v-else-if="started" class="inline-flex items-center gap-1">
          <Lightbulb class="size-3.5" aria-hidden="true" />
          {{ scenario.state?.hintsUsed }} hints used
        </span>
      </div>

      <BaseButton
        size="sm"
        :variant="solved ? 'secondary' : 'primary'"
        @click="emit('open', scenario.id)"
      >
        {{ actionLabel }}
        <ArrowRight class="size-4" aria-hidden="true" />
      </BaseButton>
    </footer>
  </BaseCard>
</template>
