<script setup lang="ts">
import { computed, ref } from 'vue';
import { CheckCircle2, XCircle } from 'lucide-vue-next';
import type { QuestionView, ScoringInfo } from '@dd/shared';
import BaseBadge from '@/components/ui/BaseBadge.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import HintList from './HintList.vue';

const props = defineProps<{
  question: QuestionView;
  scoring: ScoringInfo;
  index: number;
  busy: boolean;
  wrongOptionIds: string[];
}>();
const emit = defineEmits<{ submit: [optionId: string]; hint: [] }>();

const selected = ref<string | null>(null);

const kindLabels = {
  locate: 'Locate',
  explain: 'Explain',
  solve: 'Solve',
} as const;

const canSubmit = computed(() => selected.value !== null && !props.busy && !props.question.solved);

function submit() {
  if (selected.value) emit('submit', selected.value);
}
</script>

<template>
  <BaseCard as="article" class="flex flex-col gap-4 p-5">
    <header class="flex items-start justify-between gap-3">
      <div>
        <div class="flex items-center gap-2">
          <BaseBadge>{{ kindLabels[question.kind] }}</BaseBadge>
          <span class="text-xs text-muted">Question {{ index + 1 }}</span>
        </div>
        <p class="mt-2 font-medium text-balance">{{ question.prompt }}</p>
      </div>
      <CheckCircle2
        v-if="question.solved"
        class="size-5 shrink-0 text-quality-good"
        aria-label="Solved"
      />
    </header>

    <fieldset class="flex flex-col gap-2" :disabled="question.solved || busy">
      <label
        v-for="option in question.options"
        :key="option.id"
        class="flex cursor-pointer items-start gap-3 rounded-[var(--dd-radius-sm)] px-3 py-2 text-sm ring-1 transition"
        :class="[
          wrongOptionIds.includes(option.id)
            ? 'ring-sev-critical/40 bg-sev-critical/5 text-muted'
            : 'ring-border hover:ring-primary/40',
          selected === option.id ? 'ring-primary' : '',
          question.solved ? 'cursor-default opacity-70' : '',
        ]"
      >
        <input
          v-model="selected"
          type="radio"
          :name="`q-${question.id}`"
          :value="option.id"
          class="mt-0.5 accent-primary"
        />
        <span class="flex-1">{{ option.text }}</span>
        <XCircle
          v-if="wrongOptionIds.includes(option.id)"
          class="mt-0.5 size-4 shrink-0 text-sev-critical"
          aria-label="Incorrect"
        />
      </label>
    </fieldset>

    <!-- Shown only once solved: the API does not send an explanation for an open question,
         so there is nothing here to reveal early even from devtools. -->
    <p
      v-if="question.solved && question.explanation"
      class="rounded-[var(--dd-radius-sm)] bg-quality-good/10 px-3 py-2 text-sm text-quality-good"
    >
      {{ question.explanation }}
    </p>

    <template v-if="!question.solved">
      <HintList
        :revealed="question.hintsRevealed"
        :total="question.hintsTotal"
        :penalty="scoring.hintPenalty"
        :disabled="busy"
        @reveal="emit('hint')"
      />

      <div class="flex items-center justify-between gap-3 border-t border-border pt-4">
        <p class="text-xs text-muted">
          A wrong answer costs {{ scoring.wrongAttemptPenalty }} points.
        </p>
        <BaseButton size="sm" :disabled="!canSubmit" @click="submit">Submit answer</BaseButton>
      </div>
    </template>
  </BaseCard>
</template>
