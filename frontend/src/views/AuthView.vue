<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ShieldCheck } from 'lucide-vue-next';
import BaseButton from '@/components/ui/BaseButton.vue';
import BaseCard from '@/components/ui/BaseCard.vue';
import { useAuthStore } from '@/stores/auth';

const router = useRouter();
const auth = useAuthStore();

const mode = ref<'signin' | 'signup'>('signin');
const email = ref('');
const password = ref('');

const title = computed(() => (mode.value === 'signin' ? 'Sign in' : 'Create an account'));
const submitLabel = computed(() => (mode.value === 'signin' ? 'Sign in' : 'Create account'));

// A learner who is already signed in has nothing to do on this page.
watch(
  () => auth.signedIn,
  (signedIn) => {
    if (signedIn) void router.push({ name: 'dashboard' });
  },
  { immediate: true },
);

function toggleMode() {
  mode.value = mode.value === 'signin' ? 'signup' : 'signin';
  auth.error = null;
  auth.notice = null;
}

async function submit() {
  const action = mode.value === 'signin' ? auth.signIn : auth.signUp;
  await action(email.value.trim(), password.value);
}
</script>

<template>
  <div class="mx-auto max-w-md">
    <BaseCard>
      <div class="flex flex-col gap-6 p-6">
        <header class="flex flex-col gap-1">
          <ShieldCheck class="size-5 text-primary" aria-hidden="true" />
          <h1 class="text-lg font-semibold">{{ title }}</h1>
          <p class="text-sm text-muted">
            Cases are assigned to you personally, so your scores, solved cases, and hint usage
            follow you between devices. Create an account to begin.
          </p>
        </header>

        <p v-if="!auth.authEnabled" class="text-sm text-sev-critical">
          This build has no Supabase credentials configured, so accounts are unavailable.
        </p>

        <form v-else class="flex flex-col gap-4" @submit.prevent="submit">
          <label class="flex flex-col gap-1 text-sm">
            <span class="font-medium">Email</span>
            <input
              v-model="email"
              type="email"
              autocomplete="email"
              required
              class="rounded-[var(--dd-radius-sm)] bg-elevated px-3 py-2 ring-1 ring-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          </label>

          <label class="flex flex-col gap-1 text-sm">
            <span class="font-medium">Password</span>
            <input
              v-model="password"
              type="password"
              :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'"
              required
              minlength="6"
              class="rounded-[var(--dd-radius-sm)] bg-elevated px-3 py-2 ring-1 ring-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
          </label>

          <p v-if="auth.error" class="text-sm text-sev-critical">{{ auth.error }}</p>
          <p v-if="auth.notice" class="text-sm text-muted">{{ auth.notice }}</p>

          <BaseButton type="submit" :disabled="auth.pending">
            {{ auth.pending ? 'Working…' : submitLabel }}
          </BaseButton>
        </form>

        <p v-if="auth.authEnabled" class="text-sm text-muted">
          {{ mode === 'signin' ? 'No account yet?' : 'Already have an account?' }}
          <button type="button" class="font-medium text-primary underline" @click="toggleMode">
            {{ mode === 'signin' ? 'Create one' : 'Sign in' }}
          </button>
        </p>

        <RouterLink v-if="!auth.authEnabled" to="/" class="text-sm text-muted underline">
          Continue without an account
        </RouterLink>
      </div>
    </BaseCard>
  </div>
</template>
