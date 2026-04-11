const path = require('path');
const { spawn } = require('child_process');
const dotenv = require('dotenv');

const projectRoot = path.join(__dirname, '..');
const envPath = path.join(projectRoot, '.env');

dotenv.config({ path: envPath });

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error(
    '[prisma:direct] Usage: node scripts/run-prisma-direct.cjs <prisma args...>',
  );
  process.exit(1);
}

const directUrl = process.env.DIRECT_URL?.trim();

if (!directUrl) {
  console.error(
    '[prisma:direct] DIRECT_URL is required in erp-backend/.env for migration-safe Prisma commands.',
  );
  process.exit(1);
}

const env = {
  ...process.env,
  DATABASE_URL: directUrl,
};

console.log('[prisma:direct] Using DIRECT_URL for Prisma command.');

const prismaBin = path.join(projectRoot, 'node_modules', '.bin', 'prisma.cmd');
const child = spawn('cmd.exe', ['/c', prismaBin, ...args], {
  cwd: projectRoot,
  env,
  stdio: 'inherit',
  shell: false,
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});

child.on('error', (error) => {
  console.error('[prisma:direct] Failed to start Prisma CLI.', error);
  process.exit(1);
});
