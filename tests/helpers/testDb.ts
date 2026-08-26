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
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
