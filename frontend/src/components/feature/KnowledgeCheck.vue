<script setup lang="ts">
import { computed, ref } from 'vue';
import { BookOpenCheck, CheckCircle2, XCircle } from 'lucide-vue-next';
import type { AttemptResult, KnowledgeTestResponse } from '@dd/shared';
import BaseBadge from '@/components/ui/BaseBadge.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import ProgressBar from '@/components/ui/ProgressBar.vue';
import { principleLabels } from '@/design/theme';

const props = defineProps<{
  test: KnowledgeTestResponse;
  attempt: AttemptResult | null;
  busy: boolean;
}>();
const emit = defineEmits<{ submit: [answers: Record<number, string>] }>();

const started = ref(false);
const answers = ref<Record<number, string>>({});

const answeredCount = computed(
  () => props.test.questions.filter((question) => answers.value[question.id]).length,
);
const complete = computed(() => answeredCount.value === props.test.questions.length);

const promptFor = (questionId: number) =>
  props.test.questions.find((question) => question.id === questionId)?.prompt ?? '';

const optionText = (questionId: number, optionId: string) =>
  props.test.questions
    .find((question) => question.id === questionId)
    ?.options.find((option) => option.id === optionId)?.text ?? '';
</script>

<template>
  <BaseCard as="section" class="flex flex-col gap-4 p-5">
    <header>
      <h2 class="flex items-center gap-2 text-sm font-semibold">
        <BookOpenCheck class="size-4 text-primary" aria-hidden="true" />
        Knowledge check · {{ test.title }}
      </h2>
      <p class="mt-1 text-sm text-muted">{{ test.description }}</p>
    </header>

    <!-- Already sat: the score and, for every question, the feedback for the option
         that was actually chosen. -->
    <template v-if="attempt">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-xs font-medium tracking-wide text-muted uppercase">Your result</p>
          <p class="mt-1 text-3xl font-semibold tabular-nums">
            {{ attempt.score }}<span class="text-lg text-muted">/{{ attempt.total }}</span>
          </p>
        </div>
        <div class="min-w-48 flex-1">
          <ProgressBar :value="attempt.score" :max="attempt.total" />
        </div>
      </div>

      <ol class="flex flex-col gap-3">
        <li
          v-for="(answer, index) in attempt.answers"
          :key="answer.questionId"
          class="rounded-[var(--dd-radius-sm)] px-4 py-3 ring-1"
          :class="
            answer.correct
              ? 'bg-quality-good/10 ring-quality-good/30'
              : 'bg-sev-critical/5 ring-sev-critical/30'
          "
        >
          <div class="flex items-start gap-3">
            <CheckCircle2
              v-if="answer.correct"
              class="mt-0.5 size-4 shrink-0 text-quality-good"
              aria-label="Correct"
            />
            <XCircle v-else class="mt-0.5 size-4 shrink-0 text-sev-critical" aria-label="Wrong" />
            <div class="flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-xs text-muted">Question {{ index + 1 }}</span>
                <BaseBadge>
                  {{ principleLabels[answer.principle] }} · clause {{ answer.clause }}
                </BaseBadge>
              </div>
              <p class="mt-1.5 text-sm font-medium text-balance">
                {{ promptFor(answer.questionId) }}
              </p>
              <p class="mt-1 text-sm text-muted">
                You chose: {{ optionText(answer.questionId, answer.selectedOption) }}
              </p>
              <p class="mt-2 text-sm">{{ answer.feedback }}</p>
              <p v-if="!answer.correct" class="mt-2 text-sm text-muted">
                {{ answer.explanation }}
              </p>
            </div>
          </div>
        </li>
      </ol>
    </template>

    <!-- Not sat yet. The questions stay hidden behind a deliberate click so that a
         learner scrolling the debrief does not start the test by accident. -->
    <template v-else-if="!started">
      <p class="text-sm text-muted">
        No hints here, and no second attempt — this measures what you take away from the platform,
        so answer from your own judgement.
      </p>
      <BaseButton class="self-start" :disabled="busy" @click="started = true">
        Start the knowledge check
      </BaseButton>
    </template>

    <template v-else>
      <ol class="flex flex-col gap-4">
        <li
          v-for="(question, index) in test.questions"
          :key="question.id"
          class="border-t border-border pt-4 first:border-0 first:pt-0"
        >
          <p class="text-xs text-muted">Question {{ index + 1 }}</p>
          <p class="mt-1 font-medium text-balance">{{ question.prompt }}</p>

          <fieldset class="mt-3 flex flex-col gap-2" :disabled="busy">
            <label
              v-for="option in question.options"
              :key="option.id"
              class="flex cursor-pointer items-start gap-3 rounded-[var(--dd-radius-sm)] px-3 py-2 text-sm ring-1 transition"
              :class="
                answers[question.id] === option.id
                  ? 'ring-primary'
                  : 'ring-border hover:ring-primary/40'
              "
            >
              <input
                v-model="answers[question.id]"
                type="radio"
                :name="`kt-${question.id}`"
                :value="option.id"
                class="mt-0.5 accent-primary"
              />
              <span class="flex-1">{{ option.text }}</span>
            </label>
          </fieldset>
        </li>
      </ol>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p class="text-xs text-muted">
          {{ answeredCount }} of {{ test.questions.length }} answered. This cannot be retaken.
        </p>
        <BaseButton :disabled="!complete || busy" @click="emit('submit', answers)">
          Submit the knowledge check
        </BaseButton>
      </div>
    </template>
  </BaseCard>
</template>
