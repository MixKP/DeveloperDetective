<script setup lang="ts">
import type { Component } from 'vue';
import BaseCard from './BaseCard.vue';

defineProps<{
  label: string;
  value: string | number;
  icon?: Component;
  hint?: string;
}>();
</script>

<template>
  <BaseCard class="p-4">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-xs font-medium tracking-wide text-muted uppercase">{{ label }}</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums">{{ value }}</p>
        <p v-if="hint" class="mt-0.5 text-xs text-muted">{{ hint }}</p>
      </div>
      <component :is="icon" v-if="icon" class="size-5 shrink-0 text-muted" aria-hidden="true" />
    </div>
  </BaseCard>
</template>
