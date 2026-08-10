<script setup lang="ts">
import { computed } from 'vue';
import { Moon, Sun } from 'lucide-vue-next';
import { useTheme } from '@/composables/useTheme';

const { isDark, toggle } = useTheme();

// Branch on the RESOLVED theme, not on the stored preference. With preference `system` on a
// dark OS the page renders dark, so labelling the button from the preference alone would
// announce "switch to dark theme" while the click actually switches to light — an aria-label
// that states the opposite of what the control does.
const label = computed(() => (isDark.value ? 'Switch to light theme' : 'Switch to dark theme'));
</script>

<template>
  <button
    type="button"
    class="rounded-[var(--dd-radius-sm)] p-2 text-muted transition hover:bg-elevated hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    :title="label"
    :aria-label="label"
    @click="toggle"
  >
    <Moon v-if="isDark" class="size-4" aria-hidden="true" />
    <Sun v-else class="size-4" aria-hidden="true" />
  </button>
</template>
