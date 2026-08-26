import path from 'path';
import dotenv from 'dotenv';

// Vitest/Vite does NOT auto-load .env into process.env for plain (non-VITE_-prefixed)
// keys in Node test mode -- confirmed empirically for this project's config (vitest
// 4.1.11): a throwaway test reading process.env.DIRECT_URL / process.env.ROOT_DOMAIN
// (neither ever set elsewhere) came back `undefined` even with both present in .env.
// So we load .env explicitly here, ourselves, before anything else runs.
dotenv.config({ path: path.join(process.cwd(), '.env') });

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    'TEST_DATABASE_URL is not set. Add it to .env: the same connection as DATABASE_URL, ' +
      'with ?schema=test appended, e.g. postgresql://...supabase.co:5432/postgres?schema=test'
  );
}

// Guard against a misconfigured TEST_DATABASE_URL that points at the real "public"
// schema (e.g. a copy-paste of DATABASE_URL missing the ?schema=test suffix). That
// wouldn't touch "public" data directly, but it would silently defeat schema
// isolation for the `db push` step in resetTestDatabase(). Fail loudly, before any
// test runs, rather than let it slide.
if (!process.env.TEST_DATABASE_URL.includes('schema=test')) {
  throw new Error(
    'TEST_DATABASE_URL must include "schema=test" to stay isolated from the production ' +
      '"public" schema. Got: ' +
      process.env.TEST_DATABASE_URL.replace(/:[^:@]+@/, ':[REDACTED]@')
  );
}

// Point the app's Prisma client at the isolated "test" Postgres schema for the
// duration of the test run, never at the real DATABASE_URL/DIRECT_URL (which point
// at the "public" schema holding live business data).
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DIRECT_URL = process.env.TEST_DATABASE_URL;
