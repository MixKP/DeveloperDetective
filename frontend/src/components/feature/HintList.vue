<script setup lang="ts">
import { computed } from 'vue';
import { Lightbulb } from 'lucide-vue-next';
import BaseButton from '@/components/ui/BaseButton.vue';

const props = defineProps<{
  revealed: string[];
  total: number;
  penalty: number;
  disabled: boolean;
}>();
const emit = defineEmits<{ reveal: [] }>();

const remaining = computed(() => props.total - props.revealed.length);
</script>

<template>
  <div v-if="total > 0" class="flex flex-col gap-2">
    <TransitionGroup name="hint">
      <p
        v-for="(hint, index) in revealed"
        :key="index"
        class="flex gap-2 rounded-[var(--dd-radius-sm)] bg-elevated px-3 py-2 text-sm text-muted"
      >
        <Lightbulb class="mt-0.5 size-3.5 shrink-0 text-sev-high" aria-hidden="true" />
        <span
          ><span class="font-medium">Hint {{ index + 1 }}.</span> {{ hint }}</span
        >
      </p>
    </TransitionGroup>

    <BaseButton
      v-if="remaining > 0"
      variant="ghost"
      size="sm"
      :disabled="disabled"
      class="self-start"
      @click="emit('reveal')"
    >
      <Lightbulb class="size-4" aria-hidden="true" />
      <!-- The cost is stated before the click, not after. The penalty comes from the API
           so this never drifts from the actual scoring rule. -->
      Reveal a hint (−{{ penalty }} points, {{ remaining }} left)
    </BaseButton>

    <p v-else class="text-xs text-muted">No hints left for this question.</p>
  </div>
</template>

<style scoped>
.hint-enter-active {
  transition:
    opacity 200ms ease,
    transform 200ms ease;
}
.hint-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
