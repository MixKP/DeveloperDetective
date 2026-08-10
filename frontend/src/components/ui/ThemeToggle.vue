<script setup lang="ts">
import { computed } from 'vue';
import { Moon, Sun } from 'lucide-vue-next';
import { useTheme } from '@/composables/useTheme';

const { preference, toggle } = useTheme();

const label = computed(() =>
  preference.value === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
);
</script>

<template>
  <button
    type="button"
    class="rounded-[var(--dd-radius-sm)] p-2 text-muted transition hover:bg-elevated hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    :title="label"
    :aria-label="label"
    @click="toggle"
  >
    <Moon v-if="preference === 'dark'" class="size-4" aria-hidden="true" />
    <Sun v-else class="size-4" aria-hidden="true" />
  </button>
</template>
