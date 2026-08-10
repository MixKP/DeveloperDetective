<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowRight, Mail, Target } from 'lucide-vue-next';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import { useScenariosStore } from '@/stores/scenarios';

const router = useRouter();
const scenarios = useScenariosStore();

const scenario = computed(() => scenarios.current);

const received = computed(() => {
  const raw = scenario.value?.brief.receivedAt;
  if (!raw) return '';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleString();
});

function startInvestigation() {
  if (scenario.value) {
    void router.push({ name: 'investigate', params: { id: scenario.value.id } });
  }
}
</script>

<template>
  <div v-if="scenario" class="flex flex-col gap-6">
    <BaseCard class="overflow-hidden">
      <div class="flex flex-wrap items-center gap-3 border-b border-border bg-elevated px-5 py-3">
        <Mail class="size-4 text-muted" aria-hidden="true" />
        <div class="min-w-0">
          <p class="truncate text-sm font-medium">{{ scenario.brief.subject }}</p>
          <p class="truncate text-xs text-muted">
            {{ scenario.brief.sender }} · {{ scenario.brief.senderRole }} · {{ received }}
          </p>
        </div>
      </div>
      <div class="px-5 py-5">
        <p class="text-sm leading-relaxed whitespace-pre-line">{{ scenario.brief.body }}</p>
      </div>
    </BaseCard>

    <BaseCard class="p-5">
      <h2 class="flex items-center gap-2 text-sm font-semibold">
        <Target class="size-4 text-primary" aria-hidden="true" />
        Your objectives
      </h2>
      <ol class="mt-3 flex flex-col gap-2">
        <li
          v-for="(objective, index) in scenario.brief.objectives"
          :key="objective"
          class="flex gap-3 text-sm"
        >
          <span
            class="grid size-5 shrink-0 place-items-center rounded-full bg-elevated text-xs font-medium text-muted"
          >
            {{ index + 1 }}
          </span>
          {{ objective }}
        </li>
      </ol>
    </BaseCard>

    <div class="flex justify-end">
      <BaseButton @click="startInvestigation">
        Open the repository
        <ArrowRight class="size-4" aria-hidden="true" />
      </BaseButton>
    </div>
  </div>
</template>
