<script setup lang="ts">
withDefaults(defineProps<{ interactive?: boolean; as?: 'div' | 'article' | 'section' }>(), {
  interactive: false,
  as: 'div',
});
</script>

<template>
  <component
    :is="as"
    class="rounded-[var(--dd-radius)] bg-surface ring-1 ring-border"
    :class="interactive ? 'transition hover:ring-primary/40 hover:shadow-sm' : ''"
  >
    <slot />
  </component>
</template>
