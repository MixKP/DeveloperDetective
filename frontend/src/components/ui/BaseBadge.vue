<script setup lang="ts">
/**
 * A neutral pill. Domain-coloured variants (severity, ethical quality) compose this and
 * pass token classes in, so colour decisions stay in design/theme.ts.
 */
withDefaults(defineProps<{ tone?: 'neutral' | 'custom' }>(), { tone: 'neutral' });
</script>

<template>
  <span
    class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1"
    :class="tone === 'neutral' ? 'bg-elevated text-muted ring-border' : ''"
  >
    <slot />
  </span>
</template>
