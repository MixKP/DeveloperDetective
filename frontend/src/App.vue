<script setup lang="ts">
import { watch } from 'vue';
import { RouterLink, RouterView, useRouter } from 'vue-router';
import { Fingerprint } from 'lucide-vue-next';
import BaseButton from '@/components/ui/BaseButton.vue';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';
import { useAuthStore } from '@/stores/auth';
import { useProgressStore } from '@/stores/progress';
import { useScenariosStore } from '@/stores/scenarios';

const router = useRouter();
const auth = useAuthStore();
const scenarios = useScenariosStore();
const progress = useProgressStore();

// Signing in or out swaps the learner id, so everything already fetched belongs
// to somebody else. Drop it and start again from the dashboard.
watch(
  () => auth.user?.id ?? null,
  (next, previous) => {
    if (next === previous) return;
    scenarios.current = null;
    scenarios.list = [];
    void router.push({ name: 'dashboard' });
    void progress.fetch();
  },
);

async function signOut() {
  await auth.signOut();
}
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
          <template v-if="auth.authEnabled">
            <span v-if="auth.email" class="hidden text-xs text-muted md:block">{{
              auth.email
            }}</span>
            <BaseButton v-if="auth.signedIn" variant="ghost" size="sm" @click="signOut">
              Sign out
            </BaseButton>
            <RouterLink v-else to="/auth">
              <BaseButton variant="secondary" size="sm">Sign in</BaseButton>
            </RouterLink>
          </template>
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
