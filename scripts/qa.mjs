import assert from 'node:assert/strict';
import { execFileSync, fork } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomBytes, randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { createServer as createPortProbe } from 'node:net';
import { join } from 'node:path';
import { once } from 'node:events';
import { requireNode, root, run, runtimeEnv } from './runtime.mjs';

requireNode();
const testMode = process.argv.includes('--test');
const dev = process.argv.includes('--dev');
const id = `${Date.now()}-${randomUUID().slice(0, 8)}`;
const directory = join(root, 'output/qa', id);
const cacheDirectory = join(root, 'node_modules/.cache/mytube-qa', id);
await mkdir(directory, { recursive: true, mode: 0o700 });
const revision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const dirty = !!execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim();
const token = randomBytes(24).toString('hex');
const databaseFile = join(directory, 'qa.sqlite');
const manifestPath = join(directory, 'run.json');
const buildId = `${revision.slice(0, 12)}-${dirty ? 'dirty-' : ''}${id}`;
const env = {
  ...runtimeEnv, BUILD_ID: buildId, GIT_REVISION: revision,
  MYTUBE_ENV_FILE: '', MYTUBE_DATA_DIR: directory, SQLITE_DATABASE_FILE: databaseFile,
  SERVER_API_TOKEN: token, SERVER_HOST: '127.0.0.1', PORT: '0',
  ALLOW_INSECURE_UNAUTHENTICATED_API: 'false', ALLOWED_ORIGINS: '',
  FEED_REFRESH_ENABLED: 'false', FEED_REFRESH_ON_START: 'false', BACKFILL_TRICKLE_ENABLED: 'false',
  YOUTUBE_API_KEY: '', DEEPSEEK_API_KEY: '', YOUTUBE_INNERTUBE_COOKIE: '', YOUTUBE_INNERTUBE_BEARER: '',
};
process.env.BUILD_ID = buildId;
const require = createRequire(import.meta.url);
const { createSqliteStore } = require('../server/sqlite-store');
const store = createSqliteStore({ databaseFile, legacyDataFile: join(directory, 'missing.json'), legacyVideosFile: join(directory, 'missing-videos.json') });
const thumbnail = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="180"/%3E';
const channel = { id: 'UC1234567890123456789012', title: 'QA Channel', thumbnail: '', addedAt: Date.now() };
const seedData = { subscriptions: [channel], watchedVideos: [], settings: {}, redirects: {} };
const seedCache = {
  videos: [{ id: 'qa-video-01', title: 'QA seeded video', channelId: channel.id, channelTitle: channel.title, thumbnail, description: 'Disposable QA fixture', publishedAt: new Date().toISOString() }],
  lastUpdated: new Date().toISOString(), totalChannels: 1, totalVideos: 1, channelRefreshes: {},
};
await store.init({ defaultData: seedData, defaultVideoCache: seedCache });
store.close();

let api, frontend, browser;
const log = createWriteStream(join(directory, 'server.log'));
let shutdown;
const stop = new Promise(resolve => { shutdown = resolve; });
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => shutdown());
try {
  console.log(`QA run: ${directory}\nBuild: ${buildId}`);
  const { createServer, preview } = await import('vite');
  if (!dev) await run('npm', ['run', 'build', '--', '--outDir', join(directory, 'dist'), '--sourcemap'], { env });
  api = fork(join(root, 'server/index.js'), [], { cwd: root, env, stdio: ['ignore', 'pipe', 'pipe', 'ipc'] });
  api.stdout.pipe(log, { end: false });
  api.stderr.pipe(log, { end: false });
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('API startup timed out; inspect server.log')), 20_000);
    api.once('message', message => { clearTimeout(timeout); resolve(message.port); });
    api.once('exit', code => { clearTimeout(timeout); reject(new Error(`API exited (${code}); inspect server.log`)); });
    api.once('error', error => { clearTimeout(timeout); reject(error); });
  });
  // Vite dev treats port 0 as its default port. Probe a free port and fail
  // explicitly if another process wins the race, instead of reusing a server.
  const probe = createPortProbe();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const frontendPort = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const options = { host: '127.0.0.1', port: frontendPort, strictPort: true, open: false, watch: { ignored: ['**/output/**'] }, proxy: { '/api': { target: `http://127.0.0.1:${port}`, changeOrigin: true } } };
  frontend = dev
    ? await createServer({ root, cacheDir: cacheDirectory, server: options })
    : await preview({ root, build: { outDir: join(directory, 'dist') }, preview: options });
  if (dev) await frontend.listen();
  const address = frontend.httpServer.address();
  const url = `http://127.0.0.1:${address.port}`;
  const manifest = { seedData, seedCache, id, buildId, revision, dirty, root, url, pid: process.pid, apiPid: api.pid, apiPort: port, databaseFile, token, mode: dev ? 'dev' : 'production' };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2), { mode: 0o600 });
  const version = await fetch(`${url}/api/version`, { headers: { Authorization: `Bearer ${token}` } });
  assert.equal(version.status, 200);
  assert.equal((await version.json()).buildId, buildId);
  assert.equal((await fetch(`${url}/api/healthz`)).status, 200);
  assert.equal((await fetch(`${url}/api/sync`)).status, 401);
  console.log(`Ready: ${url}\nCredentials and database: ${manifestPath}\nLogs: ${join(directory, 'server.log')}`);
  api.once('exit', () => { process.exitCode = 1; shutdown(); });
  if (testMode) {
    await run(process.execPath, ['node_modules/@playwright/test/cli.js', 'test', ...process.argv.slice(2).filter(arg => !['--test', '--dev'].includes(arg))], {
      env: { ...runtimeEnv, MYTUBE_QA_MANIFEST: manifestPath, MYTUBE_QA_OUTPUT: directory },
    });
  } else {
    if (!process.argv.includes('--no-browser')) {
      const { chromium } = await import('@playwright/test');
      browser = await chromium.launch({ headless: false });
      const context = await browser.newContext();
      await context.addInitScript(({ token, url }) => {
        if (location.origin === new URL(url).origin && !localStorage.getItem('mytube.serverApiToken')) {
          localStorage.setItem('mytube.serverApiToken', token);
        }
      }, { token, url });
      const page = await context.newPage();
      await page.goto(url);
      browser.once('disconnected', () => shutdown());
    }
    await stop;
  }
} finally {
  if (browser) await browser.close();
  if (frontend) await (dev ? frontend.close() : new Promise(resolve => frontend.httpServer.close(resolve)));
  if (api && api.exitCode === null && api.signalCode === null) {
    api.removeAllListeners('exit');
    const exited = once(api, 'exit');
    api.kill('SIGTERM');
    const timeout = setTimeout(() => api.kill('SIGKILL'), 5000);
    await exited;
    clearTimeout(timeout);
  }
  log.end();
  await rm(cacheDirectory, { recursive: true, force: true });
  console.log(`QA artifacts retained: ${directory}`);
}
