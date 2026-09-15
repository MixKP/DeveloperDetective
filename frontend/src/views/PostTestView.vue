<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { BookOpenCheck } from 'lucide-vue-next';
import KnowledgeCheck from '@/components/feature/KnowledgeCheck.vue';
import { useKnowledgeTestStore } from '@/stores/knowledgeTest';

const knowledgeTest = useKnowledgeTestStore();

// Refetched on every visit while the test is locked, since closing a case is what
// opens it and that happens on the other side of the app.
onMounted(() => {
  void knowledgeTest.fetch();
});

const history = computed(() => knowledgeTest.test?.history ?? []);
const best = computed(() => history.value.reduce((top, record) => Math.max(top, record.score), 0));
const outOf = computed(() => history.value.at(-1)?.total ?? 0);

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
  <div class="flex flex-col gap-6">
    <section class="flex flex-wrap items-end justify-between gap-4">
      <div class="flex items-start gap-3">
        <span
          class="grid size-10 shrink-0 place-items-center rounded-[var(--dd-radius-sm)] bg-primary/10"
        >
          <BookOpenCheck class="size-5 text-primary" aria-hidden="true" />
        </span>
        <div>
          <h1 class="text-xl font-semibold">Ethics post-test</h1>
          <p class="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
            Ten questions across the eight principles of the Code, drawn from a larger bank. It
            belongs to you rather than to any one case, which is why it lives here instead of at the
            end of a debrief — and you can sit it again, against different questions, whenever you
            want to.
          </p>
        </div>
      </div>

      <!-- The record, where a learner expects to find it: at the top of the page,
           not at the bottom of the last result. -->
      <dl v-if="history.length > 0" class="flex gap-6 text-sm">
        <div>
          <dt class="text-xs font-medium tracking-wide text-muted uppercase">Sittings</dt>
          <dd class="mt-0.5 text-2xl font-semibold tabular-nums">{{ history.length }}</dd>
        </div>
        <div>
          <dt class="text-xs font-medium tracking-wide text-muted uppercase">Best</dt>
          <dd class="mt-0.5 text-2xl font-semibold tabular-nums">
            {{ best }}<span class="text-base text-muted">/{{ outOf }}</span>
          </dd>
        </div>
      </dl>
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
