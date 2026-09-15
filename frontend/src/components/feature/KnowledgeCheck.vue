<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { BookOpenCheck, Lock, ShieldCheck } from 'lucide-vue-next';
import type { AttemptResult, KnowledgeTestResponse } from '@dd/shared';
import AttemptReview from '@/components/feature/AttemptReview.vue';
import BaseBadge from '@/components/ui/BaseBadge.vue';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import ProgressBar from '@/components/ui/ProgressBar.vue';

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

const letter = (index: number) => String.fromCharCode(65 + index);
</script>

<template>
  <BaseCard as="section" class="flex flex-col gap-5 p-5 sm:p-6">
    <header class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="flex items-center gap-2 text-sm font-semibold">
        <BookOpenCheck class="size-4 text-primary" aria-hidden="true" />
        {{ test.title }}
      </h2>
      <BaseBadge v-if="view === 'taking'">Attempt {{ test.attemptNumber }}</BaseBadge>
    </header>

    <!-- Locked: the server sent no questions at all, so there is nothing here to hide.
         The test asks what the platform taught, which means closing a case first. -->
    <template v-if="view === 'locked'">
      <div
        class="flex flex-col items-center gap-4 rounded-[var(--dd-radius)] bg-elevated/60 px-6 py-10 text-center"
      >
        <span class="grid size-12 place-items-center rounded-full bg-surface ring-1 ring-border">
          <Lock class="size-5 text-muted" aria-hidden="true" />
        </span>
        <div>
          <p class="font-medium">
            Close {{ casesOwed }} more {{ casesOwed === 1 ? 'case' : 'cases' }} to unlock this
          </p>
          <p class="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-muted">
            The post-test measures what you take away from the platform, so it comes after the
            casework — ideally after all {{ eligibility.casesTotal }}.
          </p>
        </div>

        <div class="w-full max-w-xs">
          <ProgressBar :value="eligibility.casesCompleted" :max="eligibility.casesTotal" />
          <p class="mt-2 text-xs text-muted">
            {{ eligibility.casesCompleted }} of {{ eligibility.casesTotal }} cases closed
          </p>
        </div>

        <RouterLink to="/">
          <BaseButton variant="secondary" size="sm">Open a case</BaseButton>
        </RouterLink>
      </div>
    </template>

    <AttemptReview
      v-else-if="view === 'result' && attempt"
      :attempt="attempt"
      :history="test.history"
      :busy="busy"
      @retake="startRetake"
    />

    <!-- Not sat yet. The questions stay behind a deliberate click so that a learner
         does not start the test by accident while scrolling the page. -->
    <template v-else-if="view === 'intro'">
      <div class="flex flex-col items-start gap-4 rounded-[var(--dd-radius)] bg-elevated/60 p-6">
        <span class="grid size-12 place-items-center rounded-full bg-surface ring-1 ring-border">
          <ShieldCheck class="size-5 text-primary" aria-hidden="true" />
        </span>
        <div>
          <p class="font-medium">
            {{ test.questions.length }} questions · every principle of the Code
          </p>
          <p class="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">
            No hints, and a sitting is submitted whole. It measures what you take away from the
            platform, so answer from your own judgement.
          </p>
        </div>
        <BaseButton :disabled="busy" @click="started = true">Start the knowledge check</BaseButton>
      </div>
    </template>

    <template v-else>
      <div>
        <p class="mb-1.5 text-xs text-muted">
          {{ answeredCount }} of {{ test.questions.length }} answered
        </p>
        <ProgressBar :value="answeredCount" :max="test.questions.length" />
      </div>

      <ol class="flex flex-col gap-3">
        <li
          v-for="(question, index) in test.questions"
          :key="question.id"
          class="rounded-[var(--dd-radius)] bg-elevated/40 p-4 ring-1 ring-border sm:p-5"
        >
          <div class="flex items-start gap-3">
            <span
              class="grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold transition"
              :class="
                answers[question.id]
                  ? 'bg-primary text-primary-contrast'
                  : 'bg-surface text-muted ring-1 ring-border'
              "
              aria-hidden="true"
            >
              {{ index + 1 }}
            </span>
            <p class="flex-1 font-medium text-pretty">{{ question.prompt }}</p>
          </div>

          <fieldset class="mt-4 flex flex-col gap-2 sm:pl-9" :disabled="busy">
            <legend class="sr-only">Question {{ index + 1 }}</legend>
            <label
              v-for="(option, optionIndex) in question.options"
              :key="option.id"
              class="group flex cursor-pointer items-start gap-3 rounded-[var(--dd-radius-sm)] bg-surface px-3 py-2.5 text-sm ring-1 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primary"
              :class="
                answers[question.id] === option.id
                  ? 'ring-2 ring-primary'
                  : 'ring-border hover:bg-elevated/60 hover:ring-primary/40'
              "
            >
              <input
                v-model="answers[question.id]"
                type="radio"
                :name="`kt-${question.id}`"
                :value="option.id"
                class="sr-only"
              />
              <span
                class="mt-px grid size-5 shrink-0 place-items-center rounded-full text-[0.6875rem] font-semibold transition"
                :class="
                  answers[question.id] === option.id
                    ? 'bg-primary text-primary-contrast'
                    : 'bg-elevated text-muted group-hover:text-text'
                "
                aria-hidden="true"
              >
                {{ letter(optionIndex) }}
              </span>
              <span class="flex-1 leading-relaxed">{{ option.text }}</span>
            </label>
          </fieldset>
        </li>
      </ol>

      <!-- The submit control follows the learner down a long test rather than
           waiting at the bottom of it. -->
      <div
        class="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 sm:sticky sm:bottom-0 sm:-mx-6 sm:-mb-6 sm:rounded-b-[var(--dd-radius)] sm:bg-surface/95 sm:px-6 sm:pb-5 sm:backdrop-blur"
      >
        <p class="text-xs text-muted">
          A sitting is submitted whole and cannot be edited afterwards.
        </p>
        <BaseButton :disabled="!complete || busy" @click="emit('submit', answers)">
          Submit the knowledge check
        </BaseButton>
      </div>
    </template>
  </BaseCard>
</template>
