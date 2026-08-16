<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowRight } from 'lucide-vue-next';
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

function goToQuiz() {
  if (scenario.value) {
    void router.push({ name: 'quiz', params: { id: scenario.value.id } });
  }
}
</script>

<template>
  <div v-if="scenario" class="flex flex-col gap-4">
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
        :previous-code="activeFile.previousCode"
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
