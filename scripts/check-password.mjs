#!/usr/bin/env node
/**
 * Answers one question, offline: is the password you are holding the password
 * Postgres actually stores for the `postgres` role?
 *
 * It never connects to anything, so the pooler cannot muddy the result — which
 * matters when the pooler is the very thing under suspicion. Reads the password
 * on stdin so it stays out of shell history:
 *
 *   printf 'password: ' && read -rs P && echo && P="$P" node scripts/check-password.mjs
 *
 * Postgres stores a SCRAM-SHA-256 verifier, not the password:
 *
 *   SCRAM-SHA-256$<iterations>:<salt>$<StoredKey>:<ServerKey>
 *
 * StoredKey is derivable from the password alone, so recomputing it and comparing
 * proves whether the password matches. The reverse is not true — the verifier
 * below reveals nothing about the password.
 */
import { pbkdf2Sync, createHmac, createHash, timingSafeEqual } from 'node:crypto';

// From `select rolpassword from pg_authid where rolname = 'postgres'`.
const ITERATIONS = 4096;
const SALT = 'QxykD2ZYOCFqizOMOBublA==';
const STORED_KEY = 'sxSNxI2bFX4cJgAQfoj+IcQeKwN1QK5ho1c39DaRqr0=';

const password = process.env.P;
if (!password) {
  console.error('Set P to the password. See the usage line at the top of this file.');
  process.exit(2);
}

const saltedPassword = pbkdf2Sync(password, Buffer.from(SALT, 'base64'), ITERATIONS, 32, 'sha256');
const clientKey = createHmac('sha256', saltedPassword).update('Client Key').digest();
const storedKey = createHash('sha256').update(clientKey).digest();

const expected = Buffer.from(STORED_KEY, 'base64');
const matches = storedKey.length === expected.length && timingSafeEqual(storedKey, expected);

console.log(`password length: ${password.length}`);
console.log('');

if (matches) {
  console.log('✓ This IS the password Postgres stores.');
  console.log('  So the 28P01 comes from the pooler, not from the credential.');
} else {
  console.log('✗ This is NOT the password Postgres stores.');
  console.log('  The dashboard reset either did not apply, or this is not the value it set.');
}
