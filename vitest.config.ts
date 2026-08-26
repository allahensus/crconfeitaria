import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 20000,
    // resetTestDatabase() now does a network round-trip to the Supabase Postgres
    // instance (schema drop/recreate + `prisma db push`) instead of a fast local
    // SQLite file reset -- each `db push` alone routinely takes 12-18s, so the
    // previous 30s hook timeout was occasionally too tight under normal network
    // variance. Give it real headroom.
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
