<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md';
    disabled?: boolean;
    type?: 'button' | 'submit';
  }>(),
  { variant: 'primary', size: 'md', disabled: false, type: 'button' },
);

const variants = {
  primary: 'bg-primary text-primary-contrast hover:opacity-90',
  secondary: 'bg-elevated text-text ring-1 ring-border hover:bg-border/60',
  ghost: 'text-muted hover:text-text hover:bg-elevated',
} as const;

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
} as const;
</script>

<template>
  <button
    :type="type"
    :disabled="disabled"
    class="inline-flex items-center justify-center gap-2 rounded-[var(--dd-radius-sm)] font-medium transition disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    :class="[variants[variant], sizes[size]]"
  >
    <slot />
  </button>
</template>
