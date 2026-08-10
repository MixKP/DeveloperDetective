import { ref } from 'vue';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'dd.theme';

const preference = ref<ThemePreference>(read());

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

apply(preference.value);

export function useTheme() {
  function set(value: ThemePreference) {
    preference.value = value;
    apply(value);
    if (value === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, value);
  }

  function toggle() {
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentlyDark =
      preference.value === 'dark' || (preference.value === 'system' && systemPrefersDark);
    set(currentlyDark ? 'light' : 'dark');
  }

  return { preference, set, toggle };
}
