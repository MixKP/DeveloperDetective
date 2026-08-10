import { computed, ref } from 'vue';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'dd.theme';

const preference = ref<ThemePreference>(read());
/** Tracks the OS setting so `system` stays live if the user changes it mid-session. */
const systemPrefersDark = ref(false);

function read(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

/**
 * `system` removes the attribute entirely rather than resolving the OS preference and
 * writing it back. Keeping the attribute off means the `prefers-color-scheme` rules in
 * tokens.css stay live, so the page follows the OS if the user changes it while the tab is
 * open — which a resolved-and-frozen value would not.
 */
function apply(value: ThemePreference) {
  const root = document.documentElement;
  if (value === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', value);
}

const media = window.matchMedia('(prefers-color-scheme: dark)');
systemPrefersDark.value = media.matches;
media.addEventListener('change', (event) => {
  systemPrefersDark.value = event.matches;
});

apply(preference.value);

/**
 * What the user is actually looking at, as opposed to what they asked for. Components must
 * label themselves from this, not from `preference`.
 */
const isDark = computed(
  () => preference.value === 'dark' || (preference.value === 'system' && systemPrefersDark.value),
);

export function useTheme() {
  function set(value: ThemePreference) {
    preference.value = value;
    apply(value);
    if (value === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, value);
  }

  function toggle() {
    set(isDark.value ? 'light' : 'dark');
  }

  return { preference, isDark, set, toggle };
}
