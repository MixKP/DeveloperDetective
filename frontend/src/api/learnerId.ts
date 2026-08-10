const STORAGE_KEY = 'dd.learnerId';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * The learner's pseudonymous progress key.
 *
 * This is NOT authentication. Anyone presenting a given UUID sees that UUID's progress —
 * acceptable because the data is quiz scores with no PII attached, and it keeps the project
 * free of login plumbing that the course is not grading. Do not build auth on top of it.
 *
 * A malformed or hand-edited value is replaced rather than sent, so the API's UUID
 * validation never fires for a returning learner.
 */
export function getLearnerId(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && UUID_RE.test(stored)) return stored;

  const fresh = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, fresh);
  return fresh;
}
