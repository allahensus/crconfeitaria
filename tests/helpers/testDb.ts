import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { prisma } from '@/lib/prisma';

export const TEST_DB_PATH = path.join(process.cwd(), 'prisma', 'test.db');
export const TEST_DATABASE_URL = `file:${TEST_DB_PATH}`;

export async function resetTestDatabase() {
  await prisma.$disconnect();
  // Small delay to ensure OS releases file locks
  await new Promise(resolve => setTimeout(resolve, 100));
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'inherit',
  });
}
