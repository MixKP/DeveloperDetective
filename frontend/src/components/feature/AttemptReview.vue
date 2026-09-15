<script setup lang="ts">
import { computed } from 'vue';
import { CheckCircle2, RotateCcw, Sparkles, Target, XCircle } from 'lucide-vue-next';
import type { AttemptRecord, AttemptResult } from '@dd/shared';
import BaseBadge from '@/components/ui/BaseBadge.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import { principleLabels } from '@/design/theme';

const props = defineProps<{
  attempt: AttemptResult;
  history: AttemptRecord[];
  busy: boolean;
}>();
const emit = defineEmits<{ retake: [] }>();

const percent = computed(() =>
  props.attempt.total === 0 ? 0 : (props.attempt.score / props.attempt.total) * 100,
);
/** A clean sheet is the one result worth colouring; everything else stays neutral. */
const perfect = computed(() => props.attempt.score === props.attempt.total);

const best = computed(() =>
  props.history.reduce((top, record) => Math.max(top, record.score), props.attempt.score),
);

const letter = (index: number) => String.fromCharCode(65 + index);
const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- The score, as one thing to look at rather than a number in a row of them. -->
    <div
      class="flex flex-wrap items-center gap-5 rounded-[var(--dd-radius)] px-5 py-4 ring-1"
      :class="perfect ? 'bg-quality-good/5 ring-quality-good/30' : 'bg-elevated ring-border'"
    >
      <div class="relative grid size-24 shrink-0 place-items-center">
        <svg viewBox="0 0 36 36" class="size-24 -rotate-90" aria-hidden="true">
          <circle cx="18" cy="18" r="16" fill="none" stroke-width="2.5" class="stroke-border" />
          <circle
            cx="18"
            cy="18"
            r="16"
            fill="none"
            stroke-width="2.5"
            stroke-linecap="round"
            :stroke-dasharray="`${percent} 100`"
            pathLength="100"
            class="transition-[stroke-dasharray] duration-700"
            :class="perfect ? 'stroke-quality-good' : 'stroke-primary'"
          />
        </svg>
        <p class="absolute text-center">
          <span class="block text-2xl leading-none font-semibold tabular-nums">
            {{ attempt.score }}
          </span>
          <span class="text-xs text-muted tabular-nums">of {{ attempt.total }}</span>
        </p>
      </div>

      <div class="min-w-56 flex-1">
        <div class="flex flex-wrap items-center gap-2">
          <BaseBadge>Attempt {{ attempt.attemptNumber }}</BaseBadge>
          <span class="text-xs text-muted">{{ dateOf(attempt.submittedAt) }}</span>
          <span v-if="history.length > 1" class="text-xs text-muted">· best {{ best }}</span>
        </div>
        <p class="mt-2 text-sm leading-relaxed">{{ attempt.summary.verdict }}</p>
      </div>

      <BaseButton class="shrink-0" :disabled="busy" @click="emit('retake')">
        <RotateCcw class="size-4" aria-hidden="true" />
        Sit it again
      </BaseButton>
    </div>

    <!-- What to revise, grouped by principle: two wrong answers about one principle
         are one gap, and the gap is the thing worth working on. -->
    <section v-if="attempt.summary.missed.length > 0">
      <h3 class="flex items-center gap-2 text-sm font-semibold">
        <Target class="size-4 text-primary" aria-hidden="true" />
        Work on this before the next sitting
      </h3>
      <ul class="mt-3 flex flex-col gap-2">
        <li
          v-for="gap in attempt.summary.missed"
          :key="gap.principle"
          class="rounded-[var(--dd-radius-sm)] border-l-2 border-sev-critical/50 bg-elevated/60 py-3 pr-4 pl-4"
        >
          <div class="flex flex-wrap items-center gap-2">
            <span class="text-sm font-medium">{{ principleLabels[gap.principle] }}</span>
            <span class="text-xs text-muted">
              {{ gap.questionIds.length }}
              {{ gap.questionIds.length === 1 ? 'answer' : 'answers' }} missed
            </span>
          </div>
          <p class="mt-1.5 text-sm leading-relaxed text-muted">{{ gap.guidance }}</p>
        </li>
      </ul>
    </section>

    <section v-if="attempt.summary.mastered.length > 0" class="flex flex-wrap items-center gap-2">
      <Sparkles class="size-4 shrink-0 text-quality-good" aria-hidden="true" />
      <span class="text-xs text-muted">Held:</span>
      <BaseBadge v-for="principle in attempt.summary.mastered" :key="principle">
        {{ principleLabels[principle] }}
      </BaseBadge>
    </section>

    <!-- Every question, with the feedback for the option that was actually chosen. -->
    <section>
      <h3 class="text-sm font-semibold">Answer by answer</h3>
      <ol class="mt-3 flex flex-col gap-2">
        <li
          v-for="(answer, index) in attempt.answers"
          :key="answer.questionId"
          class="rounded-[var(--dd-radius-sm)] p-4 ring-1"
          :class="
            answer.correct
              ? 'bg-quality-good/5 ring-quality-good/25'
              : 'bg-sev-critical/5 ring-sev-critical/25'
          "
        >
          <div class="flex items-start gap-3">
            <span
              class="grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold"
              :class="
                answer.correct
                  ? 'bg-quality-good/15 text-quality-good'
                  : 'bg-sev-critical/15 text-sev-critical'
              "
              aria-hidden="true"
            >
              {{ letter(index) }}
            </span>

            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <BaseBadge>{{ principleLabels[answer.principle] }}</BaseBadge>
                <span
                  class="inline-flex items-center gap-1 text-xs font-medium"
                  :class="answer.correct ? 'text-quality-good' : 'text-sev-critical'"
                >
                  <CheckCircle2 v-if="answer.correct" class="size-3.5" aria-hidden="true" />
                  <XCircle v-else class="size-3.5" aria-hidden="true" />
                  {{ answer.correct ? 'Correct' : 'Missed' }}
                </span>
              </div>

              <p class="mt-2 text-sm font-medium text-pretty">{{ answer.prompt }}</p>
              <p class="mt-1 text-sm text-muted">You chose: {{ answer.selectedText }}</p>
              <p class="mt-2 text-sm leading-relaxed">{{ answer.feedback }}</p>
              <p v-if="!answer.correct" class="mt-2 text-sm leading-relaxed text-muted">
                {{ answer.explanation }}
              </p>
            </div>
          </div>
        </li>
      </ol>
    </section>

    <!-- Every sitting, so improvement is visible rather than remembered. -->
    <section v-if="history.length > 1" class="border-t border-border pt-4">
      <h3 class="text-xs font-medium tracking-wide text-muted uppercase">Your sittings</h3>
      <ol class="mt-3 flex flex-wrap gap-2">
        <li
          v-for="record in history"
          :key="record.attemptNumber"
          class="w-36 rounded-[var(--dd-radius-sm)] bg-elevated px-3 py-2"
          :class="record.attemptNumber === attempt.attemptNumber ? 'ring-1 ring-primary/40' : ''"
        >
          <p class="text-xs text-muted">
            #{{ record.attemptNumber }} · {{ dateOf(record.submittedAt) }}
          </p>
          <p class="mt-0.5 text-sm font-semibold tabular-nums">
            {{ record.score }}<span class="text-xs text-muted">/{{ record.total }}</span>
          </p>
          <div class="mt-1.5 h-1 overflow-hidden rounded-full bg-border">
            <div
              class="h-full rounded-full bg-primary"
              :style="{ width: `${(record.score / record.total) * 100}%` }"
            />
          </div>
        </li>
      </ol>
    </section>
  </div>
</template>
