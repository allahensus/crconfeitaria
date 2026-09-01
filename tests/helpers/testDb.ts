import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { prisma } from '@/lib/prisma';

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

if (!TEST_DATABASE_URL) {
  throw new Error(
    'TEST_DATABASE_URL is not set. Add it to .env: the same connection as DATABASE_URL, with ?schema=test appended.'
  );
}

// Must use Supabase's pooler host (like DATABASE_URL), not the direct
// "db.<ref>.supabase.co" host: the direct host is IPv6-only, which fails with
// Prisma error P1001 ("Can't reach database server") on IPv4-only runners
// like GitHub Actions. See .env.example for the exact connection format.

export async function resetTestDatabase() {
  await prisma.$disconnect();

  // Drop and recreate the isolated "test" Postgres schema. Uses --url directly,
  // bypassing schema.prisma's datasource entirely -- no .env exposure risk here.
  execSync(`npx prisma db execute --url "${TEST_DATABASE_URL}" --stdin`, {
    input: 'DROP SCHEMA IF EXISTS test CASCADE;\nCREATE SCHEMA test;\n',
    stdio: ['pipe', 'inherit', 'inherit'],
  });

  // prisma db push has no --url flag; it only reads schema.prisma's env() reference,
  // which the Prisma CLI resolves via its own .env loading (confirmed to take
  // precedence over an explicitly-passed child-process env override). So we
  // temporarily rename .env out of the way to force the CLI to use the override below.
  const envPath = path.join(process.cwd(), '.env');
  const envBackupPath = path.join(process.cwd(), '.env.bak-during-test-reset');

  // Self-heal: a previous run may have crashed between the rename below and its
  // finally-restore, stranding the real .env as envBackupPath.
  if (!fs.existsSync(envPath) && fs.existsSync(envBackupPath)) {
    fs.renameSync(envBackupPath, envPath);
  }

  const hadEnv = fs.existsSync(envPath);
  if (hadEnv) {
    fs.renameSync(envPath, envBackupPath);
  }

  try {
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL },
      stdio: 'inherit',
    });
  } finally {
    if (hadEnv) {
      fs.renameSync(envBackupPath, envPath);
    }
  }
}
