const fs = require('fs');
const path = require('path');

const clientDir = path.join(__dirname, '..', 'node_modules', '.prisma', 'client');
const indexFile = path.join(clientDir, 'index.js');
const defaultFile = path.join(clientDir, 'default.js');

if (!fs.existsSync(indexFile)) {
  console.warn('[prisma:ensure-client] Skipped: generated Prisma client was not found.');
  process.exit(0);
}

if (fs.existsSync(defaultFile)) {
  console.log('[prisma:ensure-client] Prisma default client entry already exists.');
  process.exit(0);
}

fs.mkdirSync(clientDir, { recursive: true });
fs.writeFileSync(defaultFile, "module.exports = require('./index');\n", 'utf8');
console.log('[prisma:ensure-client] Restored missing Prisma default client entry.');
