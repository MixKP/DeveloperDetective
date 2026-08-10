<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import { Fingerprint } from 'lucide-vue-next';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';
</script>

<template>
  <div class="min-h-dvh">
    <header class="border-b border-border bg-surface">
      <div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <RouterLink to="/" class="inline-flex items-center gap-2 font-semibold">
          <Fingerprint class="size-5 text-primary" aria-hidden="true" />
          Developer Detective
        </RouterLink>
        <div class="flex items-center gap-3">
          <p class="hidden text-xs text-muted sm:block">
            You are the engineer on call — not the attacker.
          </p>
          <ThemeToggle />
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-8">
      <RouterView v-slot="{ Component }">
        <Transition name="stage" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
/* Motion stays subtle: a short cross-fade between stages, nothing more. */
.stage-enter-active,
.stage-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}
.stage-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.stage-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
