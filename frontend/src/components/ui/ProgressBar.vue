<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{ value: number; max?: number; label?: string }>(), {
  max: 100,
  label: undefined,
});

const percent = computed(() => Math.max(0, Math.min(100, (props.value / props.max) * 100)));
</script>

<template>
  <div>
    <div v-if="label" class="mb-1 flex justify-between text-xs text-muted">
      <span>{{ label }}</span>
      <span>{{ value }}</span>
    </div>
    <div
      class="h-1.5 w-full overflow-hidden rounded-full bg-elevated"
      role="progressbar"
      :aria-valuenow="value"
      :aria-valuemin="0"
      :aria-valuemax="max"
      :aria-label="label"
    >
      <div
        class="h-full rounded-full bg-primary transition-[width] duration-500"
        :style="{ width: `${percent}%` }"
      />
    </div>
  </div>
</template>
