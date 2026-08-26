import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { prisma } from '@/lib/prisma';

export const TEST_DB_PATH = path.join(process.cwd(), 'prisma', 'test.db');
export const TEST_DATABASE_URL = `file:${TEST_DB_PATH}`;

async function unlinkWithRetry(filePath: string, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Clean up SQLite WAL and shared memory files first (they may block main file deletion)
      const walPath = `${filePath}-wal`;
      const shmPath = `${filePath}-shm`;
      if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
      if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
      // Now delete main database file
      fs.unlinkSync(filePath);
      return;
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const delay = 50 * 2 ** (attempt - 1); // 50ms, 100ms, 200ms, 400ms
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

export async function resetTestDatabase() {
  await prisma.$disconnect();
  if (fs.existsSync(TEST_DB_PATH)) {
    await unlinkWithRetry(TEST_DB_PATH);
  }

  // The Prisma CLI loads .env itself via its own internal dotenv call, and that
  // takes precedence over the DATABASE_URL env var passed into the child process
  // below. To guarantee the CLI targets the disposable test SQLite file (and never
  // the real DATABASE_URL from .env, which may point at a live database), rename
  // .env out of the way for the duration of the push and restore it no matter what.
  const envPath = path.join(process.cwd(), '.env');
  const envBackupPath = path.join(process.cwd(), '.env.bak-during-test-reset');

  // Self-heal: if a previous run crashed between the rename below and its finally
  // restore, .env would be stranded as .env.bak-during-test-reset with no real .env
  // on disk. Restore it before doing anything else so the app's config isn't lost.
  if (!fs.existsSync(envPath) && fs.existsSync(envBackupPath)) {
    fs.renameSync(envBackupPath, envPath);
  }

  const hadEnv = fs.existsSync(envPath);
  if (hadEnv) {
    fs.renameSync(envPath, envBackupPath);
  }

  try {
    execSync('npx prisma db push --skip-generate --accept-data-loss', {
      // schema.prisma declares both `url` (DATABASE_URL) and `directUrl` (DIRECT_URL).
      // Prisma's db push/migrate commands connect using directUrl when it is present, so
      // DIRECT_URL must be overridden too -- otherwise, even with DATABASE_URL pointed at
      // the disposable SQLite file, the CLI would still push against whatever real
      // DIRECT_URL happens to already be loaded in process.env (e.g. from Vite/Vitest's
      // own startup .env loading, which runs before this rename and isn't undone by it).
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL, DIRECT_URL: TEST_DATABASE_URL },
      stdio: 'inherit',
    });
  } finally {
    if (hadEnv) {
      fs.renameSync(envBackupPath, envPath);
    }
  }
}
