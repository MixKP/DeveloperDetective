<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowRight } from 'lucide-vue-next';
import BaseButton from '@/components/ui/BaseButton.vue';
import ProgressBar from '@/components/ui/ProgressBar.vue';
import QuizQuestion from '@/components/feature/QuizQuestion.vue';
import { ApiError } from '@/api/client';
import { useScenariosStore } from '@/stores/scenarios';

const router = useRouter();
const scenarios = useScenariosStore();

const scenario = computed(() => scenarios.current);
const busy = ref(false);
const message = ref<string | null>(null);

/** Wrong options stay marked so the learner can see what they have already ruled out. */
const wrongByQuestion = reactive<Record<number, string[]>>({});

const questions = computed(() =>
  [...(scenario.value?.questions ?? [])].sort((a, b) => a.orderIndex - b.orderIndex),
);
const solvedCount = computed(() => questions.value.filter((q) => q.solved).length);
const allSolved = computed(() => scenario.value?.state.quizComplete === true);

async function submit(questionId: number, optionId: string) {
  busy.value = true;
  message.value = null;
  try {
    const result = await scenarios.answer(questionId, optionId);
    if (!result.correct) {
      wrongByQuestion[questionId] = [...(wrongByQuestion[questionId] ?? []), optionId];
      message.value = 'Not quite. Look again at what the code actually does.';
    } else if (result.justUnlockedVulnerableLines) {
      message.value = 'Correct — the vulnerable lines are now highlighted in the code viewer.';
    }
  } catch (error) {
    message.value = error instanceof ApiError ? error.message : 'Could not submit that answer.';
  } finally {
    busy.value = false;
  }
}

async function reveal(questionId: number) {
  busy.value = true;
  try {
    await scenarios.requestHint(questionId);
  } catch (error) {
    message.value = error instanceof ApiError ? error.message : 'Could not reveal a hint.';
  } finally {
    busy.value = false;
  }
}

function goToDebrief() {
  if (scenario.value) {
    void router.push({ name: 'debrief', params: { id: scenario.value.id } });
  }
}
</script>

<template>
  <div v-if="scenario" class="flex flex-col gap-5">
    <ProgressBar
      :value="solvedCount"
      :max="questions.length"
      :label="`${solvedCount} of ${questions.length} findings confirmed`"
    />

    <p
      v-if="message"
      class="rounded-[var(--dd-radius-sm)] bg-elevated px-3 py-2 text-sm text-muted"
      role="status"
    >
      {{ message }}
    </p>

    <QuizQuestion
      v-for="(question, index) in questions"
      :key="question.id"
      :question="question"
      :scoring="scenario.scoring"
      :index="index"
      :busy="busy"
      :wrong-option-ids="wrongByQuestion[question.id] ?? []"
      @submit="submit(question.id, $event)"
      @hint="reveal(question.id)"
    />

    <div v-if="allSolved" class="flex justify-end">
      <BaseButton @click="goToDebrief">
        Read the debrief
        <ArrowRight class="size-4" aria-hidden="true" />
      </BaseButton>
    </div>
  </div>
</template>
