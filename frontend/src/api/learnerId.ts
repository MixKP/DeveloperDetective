const STORAGE_KEY = 'dd.learnerId';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getLearnerId(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && UUID_RE.test(stored)) return stored;

  const fresh = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, fresh);
  return fresh;
}
