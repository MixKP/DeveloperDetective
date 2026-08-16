#!/usr/bin/env node
/**
 * Connects with DATABASE_URL and reports whether it works, printing nothing that
 * could leak the credential — host and port only, never the password.
 *
 * Against the value Vercel actually holds:
 *
 *   vercel env pull .env.vercel --environment production
 *   node --env-file=.env.vercel scripts/check-db.mjs
 *
 * `.env.vercel` is covered by the `.env.*` rule in .gitignore. Delete it when done.
 */
import postgres from 'postgres';

const url = process.env.DATABASE_URL;

if (!url) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

let parsed;
try {
  parsed = new URL(url);
} catch {
  console.error('✗ Not a URL at all. DATABASE_URL must be the whole connection string,');
  console.error('  starting with postgresql:// — not just the password.');
  process.exit(1);
}

const port = parsed.port || '(default)';
const pooler = parsed.hostname.includes('pooler.supabase.com');

console.log(`host     ${parsed.hostname}`);
console.log(`port     ${port}`);
console.log(`user     ${decodeURIComponent(parsed.username)}`);
console.log(`database ${parsed.pathname.slice(1) || '(none)'}`);
console.log(`password ${parsed.password ? `set, ${parsed.password.length} chars` : 'MISSING'}`);
console.log('');

if (!pooler) {
  console.log('⚠ Not a pooler host. Vercel cannot reach the direct connection: it is');
  console.log('  IPv6-only, and the request hangs rather than failing.');
}
if (pooler && port !== '6543') {
  console.log('⚠ Pooler host but not port 6543. Serverless needs the transaction pooler.');
}

const sql = postgres(url, { prepare: false, max: 1, connect_timeout: 15 });
try {
  const [row] = await sql`select current_user as who`;
  console.log(`✓ Connected as ${row.who}.`);

  // A fresh project has no schema yet, and that is not a connection problem.
  // The existence check has to be its own statement: Postgres resolves every
  // table named in a query at parse time, so a CASE guard around the count
  // still fails with 42P01 when the table is missing.
  const [{ present }] = await sql`select to_regclass('public.scenarios') is not null as present`;
  if (!present) {
    console.log('  No scenarios table yet — run the migrations and the seed.');
  } else {
    const [{ n }] = await sql`select count(*)::int as n from scenarios`;
    console.log(`  scenarios table has ${n} row(s).`);
  }
} catch (error) {
  const code = error.code ?? '';
  const hint =
    {
      '28P01': 'Wrong password. Reset it in the Supabase dashboard and paste the new one.',
      28000: 'Wrong user. On the pooler it must be postgres.<project-ref>, with the dot.',
      '3D000': 'Wrong database name. The URL should end in /postgres.',
      ENOTFOUND: 'Host does not resolve. Check the region part of the pooler hostname.',
      ETIMEDOUT: 'Connection timed out — the usual sign of the IPv6-only direct host.',
    }[code] ?? '';
  console.error(`✗ ${code} ${error.message}`);
  if (hint) console.error(`  → ${hint}`);
  process.exitCode = 1;
} finally {
  await sql.end({ timeout: 5 });
}
