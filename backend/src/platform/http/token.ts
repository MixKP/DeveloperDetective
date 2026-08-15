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
  /** Legacy shared secret. Only ever used for HS256 tokens. */
  jwtSecret?: string;
  /** Project URL, e.g. https://<ref>.supabase.co — used to fetch the JWKS for asymmetric keys. */
  supabaseUrl?: string;
}

/**
 * Returns undefined when neither credential is configured. That is not an error:
 * it means the deployment runs anonymous-only, and the learner-id middleware
 * simply never accepts a bearer token.
 *
 * Configuring both is normal and preferred. Supabase issues ES256 tokens once a
 * project has asymmetric signing keys — including the local stack, which still
 * prints a JWT_SECRET it no longer signs user tokens with — so the key is chosen
 * per token from its own `alg` header rather than from configuration order.
 */
export function createTokenVerifier({
  jwtSecret,
  supabaseUrl,
}: TokenVerifierConfig): VerifyToken | undefined {
  if (!jwtSecret && !supabaseUrl) return undefined;

  const secret = jwtSecret ? new TextEncoder().encode(jwtSecret) : undefined;
  const jwks: JWTVerifyGetKey | undefined = supabaseUrl
    ? createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', supabaseUrl))
    : undefined;

  const getKey: JWTVerifyGetKey = (header, token) => {
    if (header.alg === 'HS256') {
      if (!secret) throw new Error('This token is HS256-signed but no SUPABASE_JWT_SECRET is set.');
      return Promise.resolve(secret);
    }
    if (!jwks) throw new Error('This token needs a JWKS lookup but no SUPABASE_URL is set.');
    return jwks(header, token);
  };

  return async (token) => {
    const { payload } = await jwtVerify(token, getKey, { audience: 'authenticated' });

    const sub = payload.sub;
    if (typeof sub !== 'string' || !UUID_RE.test(sub)) {
      throw new Error('Token has no usable subject claim.');
    }
    return sub;
  };
}
