#!/usr/bin/env node
/**
 * Dev orchestrator that starts the Next.js dev server and, once ready,
 * launches the Electron shell pointed at that server.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const isWindows = process.platform === 'win32';
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const nextCli = resolve(projectRoot, 'node_modules', 'next', 'dist', 'bin', 'next');
const electronCli = resolve(projectRoot, 'node_modules', 'electron', 'cli.js');

function spawnProcess(command, args, options = {}) {
  return spawn(command, args, {
    stdio: 'inherit',
    shell: options.shell ?? isWindows,
    ...options,
  });
}

async function waitForServer(url, { timeoutMs = 60_000, retryDelayMs = 1_000 } = {}) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok) {
        return;
      }
    } catch {
      // Server not ready yet; keep polling.
    }
    await delay(retryDelayMs);
  }

  throw new Error(`Timed out waiting for dev server at ${url}`);
}

const devServer = spawnProcess(process.execPath, [nextCli, 'dev', '--turbopack'], {
  cwd: projectRoot,
  shell: false,
});
let electronProcess = null;
let shuttingDown = false;

function teardown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  if (electronProcess && !electronProcess.killed) {
    electronProcess.kill();
  }

  if (devServer && !devServer.killed) {
    devServer.kill();
  }

  process.exit(exitCode);
}

devServer.on('error', (error) => {
  console.error('Failed to start Next.js dev server:', error);
  teardown(1);
});

devServer.on('exit', (code) => {
  console.log(`Next.js dev server exited with code ${code ?? 'unknown'}`);
  teardown(code ?? 0);
});

waitForServer('http://localhost:3000')
  .then(() => {
    // Launch Electron once the dev server reports healthy.
    const electronEnv = { ...process.env };
    delete electronEnv.ELECTRON_RUN_AS_NODE;

    electronProcess = spawnProcess(process.execPath, [electronCli, '.'], {
      cwd: projectRoot,
      shell: false,
      env: {
        ...electronEnv,
        NODE_ENV: 'development',
      },
    });

    electronProcess.on('error', (error) => {
      console.error('Failed to start Electron:', error);
      teardown(1);
    });

    electronProcess.on('exit', (code) => {
      console.log(`Electron exited with code ${code ?? 'unknown'}`);
      teardown(code ?? 0);
    });
  })
  .catch((error) => {
    console.error(error.message);
    teardown(1);
  });

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => teardown(0));
}
