import { requireNode, run } from './runtime.mjs';

requireNode();
await run('npm', ['ci']);
await run('npm', ['ci', '--prefix', 'server']);
await run(process.execPath, ['node_modules/@playwright/test/cli.js', 'install', ...(process.env.CI ? ['--with-deps'] : []), 'chromium']);
await run(process.execPath, ['scripts/doctor.mjs']);
