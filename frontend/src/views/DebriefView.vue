<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Home } from 'lucide-vue-next';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import DebriefPanel from '@/components/feature/DebriefPanel.vue';
import EthicalDecision from '@/components/feature/EthicalDecision.vue';
import { ApiError } from '@/api/client';
import { useProgressStore } from '@/stores/progress';
import { useScenariosStore } from '@/stores/scenarios';

const router = useRouter();
const scenarios = useScenariosStore();
const progress = useProgressStore();

const scenario = computed(() => scenarios.current);
const busy = ref(false);
const error = ref<string | null>(null);

async function choose(choiceId: number) {
  busy.value = true;
  error.value = null;
  try {
    await scenarios.submitEthicalChoice(choiceId);
    await progress.fetch();
  } catch (e) {
    error.value = e instanceof ApiError ? e.message : 'Could not record that decision.';
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div v-if="scenario" class="flex flex-col gap-5">
    <BaseCard class="flex flex-wrap items-center justify-between gap-4 p-5">
      <div>
        <p class="text-xs font-medium tracking-wide text-muted uppercase">Final score</p>
        <p class="mt-1 text-3xl font-semibold tabular-nums">{{ scenario.state.score }}</p>
      </div>
      <dl class="flex gap-6 text-sm">
        <div>
          <dt class="text-muted">Hints used</dt>
          <dd class="font-medium tabular-nums">{{ scenario.state.hintsUsed }}</dd>
        </div>
        <div>
          <dt class="text-muted">Wrong attempts</dt>
          <dd class="font-medium tabular-nums">{{ scenario.state.wrongAttempts }}</dd>
        </div>
      </dl>
    </BaseCard>

    <DebriefPanel v-if="scenario.debrief" :debrief="scenario.debrief" />

    <p v-if="error" class="text-sm text-sev-critical">{{ error }}</p>

    <EthicalDecision
      :choices="scenario.ethicalChoices"
      :outcome="scenario.ethicalOutcome"
      :busy="busy"
      @choose="choose"
    />

    <div v-if="scenario.state.completed" class="flex justify-end">
      <BaseButton variant="secondary" @click="router.push('/')">
        <Home class="size-4" aria-hidden="true" />
        Back to open cases
      </BaseButton>
    </div>
  </div>
</template>
