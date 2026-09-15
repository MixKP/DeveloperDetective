/**
 * Deterministic shuffling, so a sitting looks the same every time it is loaded.
 *
 * A reload must not reorder a half-answered test, and the server must be able to
 * reconstruct the exact draw a learner was shown without storing it — both come
 * free if the order is a pure function of who is sitting and which sitting it is.
 * The randomness only has to be unpredictable to a reader, never to an attacker:
 * nothing here protects a secret, so a tiny PRNG is the right size of tool.
 */

/** FNV-1a over the joined parts. Stable across processes, unlike `hashCode`. */
export function seedFrom(...parts: (string | number)[]): number {
  let hash = 0x811c9dc5;
  for (const char of parts.join('|')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** mulberry32: one multiply-xorshift step per call, uniform enough to deal cards. */
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates over a copy: the input order never survives into the result. */
export function shuffle<T>(items: readonly T[], seed: number): T[] {
  const next = random(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
