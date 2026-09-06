import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { requireNode } from './runtime.mjs';

requireNode();
console.log(`PASS Node ${process.version}: ${process.execPath}`);
const require = createRequire(import.meta.url);
const Database = require('../server/node_modules/better-sqlite3');
const db = new Database(':memory:');
db.prepare('SELECT 1').get();
db.close();
console.log('PASS SQLite native module');
const { chromium } = await import('@playwright/test');
if (!existsSync(chromium.executablePath())) throw new Error('Chromium missing. Run npm run setup.');
console.log('PASS Chromium installed');
const docker = spawnSync('docker', ['info'], { stdio: 'ignore' });
console.log(docker.status === 0 ? 'PASS Docker available' : 'UNAVAILABLE Docker: container checks require a working Docker daemon or CI');
