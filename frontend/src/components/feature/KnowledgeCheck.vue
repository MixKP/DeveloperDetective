<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { BookOpenCheck, CheckCircle2, Lock, RotateCcw, XCircle } from 'lucide-vue-next';
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
const emit = defineEmits<{ submit: [answers: Record<number, string>]; retake: [] }>();

const answers = ref<Record<number, string>>({});

const eligibility = computed(() => props.test.eligibility);
const casesOwed = computed(() =>
  Math.max(eligibility.value.casesRequired - eligibility.value.casesCompleted, 0),
);

const answeredCount = computed(
  () => props.test.questions.filter((question) => answers.value[question.id]).length,
);
const complete = computed(() => answeredCount.value === props.test.questions.length);

/**
 * The page holds two things at once: the result of the last sitting, and the draw
 * for the next one. Which to show is the learner's choice rather than something
 * derivable — a reload after a sitting must land on the result, and the retake
 * button is the only thing that opens the next set of questions.
 */
const started = ref(false);
const retaking = ref(false);

const view = computed(() => {
  if (!eligibility.value.eligible) return 'locked';
  if (props.attempt && !retaking.value) return 'result';
  return started.value || retaking.value ? 'taking' : 'intro';
});

function startRetake() {
  answers.value = {};
  retaking.value = true;
  emit('retake');
}

// A submitted sitting becomes the result on screen, and closes the retake it was.
// Keyed on the number rather than the object: re-fetching the test hands over an
// equal-but-new attempt, which is not a new sitting.
watch(
  () => props.attempt?.attemptNumber ?? 0,
  () => {
    retaking.value = false;
    started.value = false;
  },
);

// The fresh draw landing mid-retake clears anything typed against the old one.
watch(
  () => props.test.attemptNumber,
  () => {
    answers.value = {};
  },
);

const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
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

    <!-- Locked: the server sent no questions at all, so there is nothing here to hide.
         The test asks what the platform taught, which means closing a case first. -->
    <template v-if="view === 'locked'">
      <div class="flex items-start gap-3">
        <Lock class="mt-0.5 size-4 shrink-0 text-muted" aria-hidden="true" />
        <div class="flex-1">
          <p class="text-sm">
            Close
            {{ casesOwed }}
            more {{ casesOwed === 1 ? 'case' : 'cases' }} to unlock this. It measures what you take
            away from the platform, so it comes after the casework — ideally after all
            {{ eligibility.casesTotal }}.
          </p>
          <p class="mt-3 text-xs text-muted">
            {{ eligibility.casesCompleted }} of {{ eligibility.casesTotal }} cases closed
          </p>
          <ProgressBar
            class="mt-2"
            :value="eligibility.casesCompleted"
            :max="eligibility.casesTotal"
          />
        </div>
      </div>
    </template>

    <!-- The sitting just finished: the score, what to revise, and the feedback for
         every option that was actually chosen. -->
    <template v-else-if="view === 'result' && attempt">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="text-xs font-medium tracking-wide text-muted uppercase">
            Attempt {{ attempt.attemptNumber }}
          </p>
          <p class="mt-1 text-3xl font-semibold tabular-nums">
            {{ attempt.score }}<span class="text-lg text-muted">/{{ attempt.total }}</span>
          </p>
        </div>
        <div class="min-w-48 flex-1">
          <ProgressBar :value="attempt.score" :max="attempt.total" />
        </div>
      </div>

      <!-- What to do next, grouped by principle: two wrong answers about one
           principle are one gap, and the gap is the thing worth revising. -->
      <div class="rounded-[var(--dd-radius-sm)] bg-elevated px-4 py-3">
        <p class="text-sm">{{ attempt.summary.verdict }}</p>

        <dl v-if="attempt.summary.missed.length > 0" class="mt-3 flex flex-col gap-3">
          <div v-for="gap in attempt.summary.missed" :key="gap.principle">
            <dt class="flex flex-wrap items-center gap-2 text-sm font-medium">
              <BaseBadge>{{ principleLabels[gap.principle] }}</BaseBadge>
              <span class="text-xs text-muted">
                {{ gap.questionIds.length }}
                {{ gap.questionIds.length === 1 ? 'answer' : 'answers' }} missed
              </span>
            </dt>
            <dd class="mt-1 text-sm text-muted">{{ gap.guidance }}</dd>
          </div>
        </dl>

        <div
          v-if="attempt.summary.mastered.length > 0"
          class="mt-3 flex flex-wrap items-center gap-2"
        >
          <span class="text-xs text-muted">Held:</span>
          <BaseBadge v-for="principle in attempt.summary.mastered" :key="principle">
            {{ principleLabels[principle] }}
          </BaseBadge>
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
                <BaseBadge>{{ principleLabels[answer.principle] }}</BaseBadge>
              </div>
              <p class="mt-1.5 text-sm font-medium text-balance">{{ answer.prompt }}</p>
              <p class="mt-1 text-sm text-muted">You chose: {{ answer.selectedText }}</p>
              <p class="mt-2 text-sm">{{ answer.feedback }}</p>
              <p v-if="!answer.correct" class="mt-2 text-sm text-muted">
                {{ answer.explanation }}
              </p>
            </div>
          </div>
        </li>
      </ol>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <p v-if="test.history.length > 1" class="text-xs text-muted">
          <span v-for="(record, index) in test.history" :key="record.attemptNumber">
            <span v-if="index > 0"> · </span>
            #{{ record.attemptNumber }} {{ record.score }}/{{ record.total }} ({{
              dateOf(record.submittedAt)
            }})
          </span>
        </p>
        <BaseButton class="ml-auto" variant="secondary" :disabled="busy" @click="startRetake">
          <RotateCcw class="size-4" aria-hidden="true" />
          Sit it again with different questions
        </BaseButton>
      </div>
    </template>

    <!-- Not sat yet. The questions stay hidden behind a deliberate click so that a
         learner does not start the test by accident while scrolling the page. -->
    <template v-else-if="view === 'intro'">
      <p class="text-sm text-muted">
        No hints, and a sitting is submitted whole — this measures what you take away from the
        platform, so answer from your own judgement. You can sit it again afterwards, and the retake
        draws different questions.
      </p>
      <BaseButton class="self-start" :disabled="busy" @click="started = true">
        Start the knowledge check
      </BaseButton>
    </template>

    <template v-else>
      <p class="text-xs text-muted">
        Attempt {{ test.attemptNumber }} · {{ test.questions.length }} questions, one per principle
        of the Code.
      </p>

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
          {{ answeredCount }} of {{ test.questions.length }} answered. This sitting is submitted
          whole and cannot be edited afterwards.
        </p>
        <BaseButton :disabled="!complete || busy" @click="emit('submit', answers)">
          Submit the knowledge check
        </BaseButton>
      </div>
    </template>
  </BaseCard>
</template>
