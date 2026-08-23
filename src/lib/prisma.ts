import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execSync } from 'child_process';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function ensureWriteable(filePath: string) {
  try {
    if (fs.existsSync(filePath)) {
      fs.chmodSync(filePath, 0o666);
      if (process.platform === 'win32') {
        try {
          execSync(`attrib -r "${filePath}"`, { stdio: 'ignore' });
        } catch {}
      }
    }
  } catch (e) {
    // Ignore permission check failures
  }
}

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const projectDbPath = path.join(process.cwd(), 'prisma', 'dev.db');
  ensureWriteable(projectDbPath);

  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME
  );

  if (isServerless) {
    const tmpDbPath = path.join(os.tmpdir(), 'dev.db');
    try {
      if (!fs.existsSync(tmpDbPath) && fs.existsSync(projectDbPath)) {
        fs.copyFileSync(projectDbPath, tmpDbPath);
      }
      ensureWriteable(tmpDbPath);
      return `file:${tmpDbPath}`;
    } catch (e) {
      console.error('Failed to prepare writable database in /tmp:', e);
    }
  }

  return `file:${projectDbPath}`;
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
