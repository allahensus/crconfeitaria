#!/usr/bin/env node
/**
 * Runs a command against a specific .env file, temporarily swapping it in for
 * the project's default .env. Needed because both the Prisma CLI and
 * @prisma/client load .env directly (ignoring any DATABASE_URL already set on
 * process.env, and ignoring .env.local), so there's no other reliable way to
 * point a one-off `prisma db push`, seed, or script at a different database.
 *
 * Usage: node scripts/with-env.js <path-to-env-file> "<command to run>"
 * Example: node scripts/with-env.js .env.production.local "npm run db:seed"
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const [, , envFileArg, command] = process.argv;

if (!envFileArg || !command) {
  console.error('Usage: node scripts/with-env.js <path-to-env-file> "<command>"');
  process.exit(1);
}

const envFile = path.resolve(process.cwd(), envFileArg);
if (!fs.existsSync(envFile)) {
  console.error(`Env file not found: ${envFile}`);
  process.exit(1);
}

const envPath = path.join(process.cwd(), '.env');
const backupPath = path.join(process.cwd(), '.env.bak-with-env');

// Self-heal: a previous run may have crashed between the rename below and its
// finally-restore, stranding the real .env as backupPath.
if (!fs.existsSync(envPath) && fs.existsSync(backupPath)) {
  fs.renameSync(backupPath, envPath);
}

const hadEnv = fs.existsSync(envPath);
if (hadEnv) fs.renameSync(envPath, backupPath);
fs.copyFileSync(envFile, envPath);

try {
  execSync(command, { stdio: 'inherit' });
} finally {
  fs.unlinkSync(envPath);
  if (hadEnv) fs.renameSync(backupPath, envPath);
}
