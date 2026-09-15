<script setup lang="ts">
import { onMounted } from 'vue';
import KnowledgeCheck from '@/components/feature/KnowledgeCheck.vue';
import { useKnowledgeTestStore } from '@/stores/knowledgeTest';

const knowledgeTest = useKnowledgeTestStore();

// Refetched on every visit while the test is locked, since closing a case is what
// opens it and that happens on the other side of the app.
onMounted(() => {
  void knowledgeTest.fetch();
});

async function submit(answers: Record<number, string>) {
  try {
    await knowledgeTest.submit(answers);
  } catch {
    // The store holds the message, and a refused submission has already refreshed
    // the attempt it was refused for.
  }
}

function retake() {
  void knowledgeTest.retake();
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <section>
      <h1 class="text-xl font-semibold">Ethics post-test</h1>
      <p class="mt-1 text-sm text-muted">
        One question per principle of the Code, drawn from a larger bank. It belongs to you rather
        than to any one case, which is why it lives here instead of at the end of a debrief — and
        you can sit it again, against different questions, whenever you want to.
      </p>
    </section>

    <p v-if="knowledgeTest.error" class="text-sm text-sev-critical">{{ knowledgeTest.error }}</p>

    <p v-if="knowledgeTest.loading && !knowledgeTest.test" class="text-sm text-muted">
      Loading the post-test…
    </p>

    <KnowledgeCheck
      v-if="knowledgeTest.test"
      :test="knowledgeTest.test"
      :attempt="knowledgeTest.attempt"
      :busy="knowledgeTest.submitting || knowledgeTest.loading"
      @submit="submit"
      @retake="retake"
    />
  </div>
</template>
