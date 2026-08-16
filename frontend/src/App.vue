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

// Signing in or out swaps the learner id, so everything already fetched belongs to
// somebody else. Drop it, then move: signing out has to leave the app, because the
// route guard only runs on navigation and would otherwise leave a signed-out learner
// sitting on a page full of the previous account's data.
watch(
  () => auth.user?.id ?? null,
  (next, previous) => {
    if (next === previous) return;

    scenarios.current = null;
    scenarios.list = [];
    progress.reset();

    // `void` starts these but does not catch them. `progress.fetch` rethrows so its
    // callers can react, and a router push rejects whenever a guard redirects
    // elsewhere — both surface as "Uncaught (in promise)" otherwise. The store has
    // already recorded the failure in `progress.error`, which the dashboard renders.
    const ignore = () => {};

    if (next === null) {
      router.push({ name: 'auth' }).catch(ignore);
      return;
    }

    router.push({ name: 'dashboard' }).catch(ignore);

    // Refetch both, rather than leaving it to DashboardView's onMounted. Supabase
    // reports the new session through onAuthStateChange, which can land *after* the
    // dashboard has already mounted and fetched — and then the clear above wipes the
    // list it just loaded, leaving a signed-in learner staring at no cases at all.
    scenarios.fetchList().catch(ignore);
    progress.fetch().catch(ignore);
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
