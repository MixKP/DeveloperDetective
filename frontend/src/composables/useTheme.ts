import { computed, ref } from 'vue';

export type ThemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'dd.theme';

const preference = ref<ThemePreference>(read());
const systemPrefersDark = ref(false);

function read(): ThemePreference {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'system';
}

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
