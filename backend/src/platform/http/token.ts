import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

/**
 * Verifies a Supabase access token and returns the subject claim — the user's
 * UUID, which is what the rest of the app knows as the learner id.
 *
 * Throws for anything it does not trust; the caller decides the HTTP shape.
 */
export type VerifyToken = (token: string) => Promise<string>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface TokenVerifierConfig {
  /** Legacy shared secret (HS256). Projects created before asymmetric keys use this. */
  jwtSecret?: string;
  /** Project URL, e.g. https://<ref>.supabase.co — used to fetch the JWKS for asymmetric keys. */
  supabaseUrl?: string;
}

/**
 * Returns undefined when neither credential is configured. That is not an error:
 * it means the deployment runs anonymous-only, and the learner-id middleware
 * simply never accepts a bearer token.
 */
export function createTokenVerifier({
  jwtSecret,
  supabaseUrl,
}: TokenVerifierConfig): VerifyToken | undefined {
  let key: Uint8Array | JWTVerifyGetKey;

  if (jwtSecret) {
    key = new TextEncoder().encode(jwtSecret);
  } else if (supabaseUrl) {
    key = createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', supabaseUrl));
  } else {
    return undefined;
  }

  return async (token) => {
    const { payload } = await jwtVerify(token, key, { audience: 'authenticated' });

    const sub = payload.sub;
    if (typeof sub !== 'string' || !UUID_RE.test(sub)) {
      throw new Error('Token has no usable subject claim.');
    }
    return sub;
  };
}
