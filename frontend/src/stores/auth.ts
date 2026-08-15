import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Session } from '@supabase/supabase-js';
import { authEnabled, supabase } from '@/api/supabase';

/** Supabase phrases its failures for developers; these are the ones learners will actually hit. */
function readableError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'That email and password do not match.';
  if (/already registered/i.test(message))
    return 'That email already has an account. Sign in instead.';
  if (/password should be at least/i.test(message))
    return 'Password must be at least 6 characters.';
  if (/rate limit/i.test(message)) return 'Too many attempts. Wait a minute and try again.';
  return message;
}

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null);
  const ready = ref(false);
  const pending = ref(false);
  const error = ref<string | null>(null);
  /** Set after a sign-up that Supabase wants confirmed by email before it issues a session. */
  const notice = ref<string | null>(null);

  const user = computed(() => session.value?.user ?? null);
  const email = computed(() => user.value?.email ?? null);
  const signedIn = computed(() => session.value !== null);

  /**
   * Resolves once the persisted session (if any) has been restored, so the first
   * API call of the page load already carries a token instead of racing it.
   */
  async function init() {
    if (!supabase) {
      ready.value = true;
      return;
    }

    const { data } = await supabase.auth.getSession();
    session.value = data.session;
    ready.value = true;

    supabase.auth.onAuthStateChange((_event, next) => {
      session.value = next;
    });
  }

  async function run(action: () => Promise<{ error: { message: string } | null }>) {
    pending.value = true;
    error.value = null;
    notice.value = null;
    try {
      const result = await action();
      if (result.error) {
        error.value = readableError(result.error.message);
        return false;
      }
      return true;
    } finally {
      pending.value = false;
    }
  }

  async function signIn(emailInput: string, password: string) {
    const client = supabase;
    if (!client) return false;
    return run(() => client.auth.signInWithPassword({ email: emailInput, password }));
  }

  async function signUp(emailInput: string, password: string) {
    const client = supabase;
    if (!client) return false;

    const ok = await run(async () => {
      const { data, error: signUpError } = await client.auth.signUp({
        email: emailInput,
        password,
      });
      // No session back means the project requires email confirmation first.
      if (!signUpError && !data.session) {
        notice.value = 'Check your inbox to confirm the address, then sign in.';
      }
      return { error: signUpError };
    });
    return ok;
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    session.value = null;
  }

  async function accessToken(): Promise<string | null> {
    if (!supabase || !session.value) return null;
    // getSession refreshes an expired token rather than handing back a stale one.
    const { data } = await supabase.auth.getSession();
    session.value = data.session;
    return data.session?.access_token ?? null;
  }

  return {
    session,
    ready,
    pending,
    error,
    notice,
    user,
    email,
    signedIn,
    authEnabled,
    init,
    signIn,
    signUp,
    signOut,
    accessToken,
  };
});
