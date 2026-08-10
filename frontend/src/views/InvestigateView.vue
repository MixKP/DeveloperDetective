<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowRight, Lock, Unlock } from 'lucide-vue-next';
import BaseButton from '@/components/ui/BaseButton.vue';
import CodeViewer from '@/components/feature/CodeViewer.vue';
import RepositoryExplorer from '@/components/feature/RepositoryExplorer.vue';
import { useScenariosStore } from '@/stores/scenarios';

const router = useRouter();
const scenarios = useScenariosStore();

const scenario = computed(() => scenarios.current);
const activePath = ref('');

watch(
  scenario,
  (value) => {
    if (!value) return;
    if (value.files.some((f) => f.path === activePath.value)) return;
    activePath.value = (value.files.find((f) => f.recentlyChanged) ?? value.files[0])?.path ?? '';
  },
  { immediate: true },
);

const activeFile = computed(() => scenario.value?.files.find((f) => f.path === activePath.value));

const unlocked = computed(() => scenario.value?.state.vulnerableLinesUnlocked === true);

function goToQuiz() {
  if (scenario.value) {
    void router.push({ name: 'quiz', params: { id: scenario.value.id } });
  }
}
</script>

<template>
  <div v-if="scenario" class="flex flex-col gap-4">
    <div class="flex items-center gap-2 rounded-[var(--dd-radius)] bg-elevated px-4 py-2.5 text-sm">
      <component
        :is="unlocked ? Unlock : Lock"
        class="size-4 shrink-0"
        :class="unlocked ? 'text-quality-good' : 'text-muted'"
        aria-hidden="true"
      />
      <p class="text-muted">
        <template v-if="unlocked">
          Line highlighting is on. The flagged lines are the ones you identified.
        </template>
        <template v-else>
          Read the code first. Highlighting unlocks once you have located the defect.
        </template>
      </p>
    </div>

    <div class="grid gap-4 lg:grid-cols-[minmax(200px,260px)_1fr]">
      <RepositoryExplorer
        :files="scenario.files"
        :active-path="activePath"
        @select="activePath = $event"
      />

      <CodeViewer
        v-if="activeFile"
        :code="activeFile.code"
        :language="activeFile.language"
        :path="activeFile.path"
        :highlight-lines="activeFile.vulnerableLines"
      />
    </div>

    <div class="flex justify-end">
      <BaseButton @click="goToQuiz">
        Report your findings
        <ArrowRight class="size-4" aria-hidden="true" />
      </BaseButton>
    </div>
  </div>
</template>
