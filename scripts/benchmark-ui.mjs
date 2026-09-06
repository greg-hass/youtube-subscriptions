// Run against a production build: node scripts/benchmark-ui.mjs [output.json] [runs]
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { chromium } from '@playwright/test';

const outputFile = process.argv[2] || 'output/performance/ui.json';
await mkdir(dirname(outputFile), { recursive: true });
const runs = Number(process.argv[3] || 5);
const dist = resolve('dist');
if (process.argv.includes('--verify')) {
  const assets = resolve(dist, 'assets');
  const chunks = (await readdir(assets)).filter(file => file.endsWith('.js'));
  const bytes = (await Promise.all(chunks.map(async file => (await stat(resolve(assets, file))).size))).reduce((sum, size) => sum + size, 0);
  assert.ok(bytes <= 700_000, `Built JavaScript exceeds the 700 kB budget: ${bytes} bytes`);
}
const now = Date.now();
const subscriptions = Array.from({ length: 200 }, (_, i) => ({
  id: `UC${String(i).padStart(22, '0')}`, title: `Performance channel ${i}`,
  thumbnail: '', addedAt: now - i,
}));
const videos = Array.from({ length: 3000 }, (_, i) => ({
  id: `perf_video_${i}`, title: `Performance video ${i}`, description: 'A deterministic performance fixture.',
  channelId: subscriptions[i % subscriptions.length].id,
  channelTitle: subscriptions[i % subscriptions.length].title,
  thumbnail: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="180"/%3E',
  publishedAt: new Date(now - i * 60_000).toISOString(), isShort: false,
}));
const lastUpdated = new Date(now).toISOString();
const feed = { videos, lastUpdated, totalChannels: subscriptions.length, totalVideos: videos.length };
const status = { state: 'idle', current: 200, total: 200, videos: videos.length, errors: 0, lastUpdated, cacheUpdatedAt: lastUpdated, failedChannels: [] };
const sync = { subscriptions, settings: {}, watchedVideos: [], redirects: {}, subscriptionTombstones: [], syncRevision: 1 };
const progress = Object.fromEntries(videos.slice(0, 1000).map(video => [video.id, { currentTime: 30, duration: 120, updatedAt: now }]));
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = resolve(dist, `.${pathname === '/' ? '/index.html' : pathname}`);
    if (!file.startsWith(`${dist}/`)) { res.writeHead(403).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const results = [];
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const getMetrics = async (page, cdp) => ({
  ...Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(metric => [metric.name, metric.value])),
  storage: await page.evaluate(() => structuredClone(window.__storageMetrics)),
});
const difference = (before, after) => ({
  scriptMs: (after.ScriptDuration - before.ScriptDuration) * 1000,
  taskMs: (after.TaskDuration - before.TaskDuration) * 1000,
  storageReads: after.storage.reads - before.storage.reads,
  storageBytesRead: after.storage.bytesRead - before.storage.bytesRead,
  jsonParses: after.storage.parses - before.storage.parses,
  jsonBytesParsed: after.storage.bytesParsed - before.storage.bytesParsed,
});

try {
  for (let run = 0; run < runs; run++) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const requests = { feed: 0, status: 0, feedBytes: 0 };
    await page.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname;
      let json = { success: true };
      if (path === '/api/sync') json = sync;
      if (path === '/api/videos') { json = feed; requests.feed++; requests.feedBytes += Buffer.byteLength(JSON.stringify(feed)); }
      if (path === '/api/videos/status') { json = status; requests.status++; }
      if (path === '/api/health') json = { status: 'ok', subscriptions: 200 };
      await route.fulfill({ json });
    });
    await page.addInitScript(({ favorites, progress }) => {
      localStorage.setItem('favorite-video-ids', JSON.stringify(favorites.map(video => video.id)));
      localStorage.setItem('favorite-videos', JSON.stringify(favorites));
      localStorage.setItem('video-playback-progress', JSON.stringify(progress));
      const knownValues = new Set([
        localStorage.getItem('favorite-video-ids'), localStorage.getItem('favorite-videos'), localStorage.getItem('video-playback-progress'),
      ]);
      const keys = new Set(['favorite-video-ids', 'favorite-videos', 'video-playback-progress']);
      const metrics = window.__storageMetrics = { reads: 0, bytesRead: 0, parses: 0, bytesParsed: 0 };
      const getItem = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) {
        const value = getItem.call(this, key);
        if (keys.has(key)) { metrics.reads++; metrics.bytesRead += value?.length || 0; knownValues.add(value); }
        return value;
      };
      const parse = JSON.parse;
      JSON.parse = function (value, ...args) {
        if (knownValues.has(value)) { metrics.parses++; metrics.bytesParsed += value?.length || 0; }
        return parse.call(this, value, ...args);
      };
    }, { favorites: videos.slice(0, 500), progress });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await cdp.send('Performance.enable');
    const start = performance.now();
    await page.goto(origin);
    await page.getByTestId('video-card').first().waitFor();
    await settle(page);
    const initial = await getMetrics(page, cdp);
    const loadMs = performance.now() - start;
    const card = page.getByTestId('video-card').first();
    await card.getByRole('button', { name: 'Remove video from favorites' }).click();
    await card.getByRole('button', { name: 'Add video to favorites' }).waitFor();
    await settle(page);
    const favorite = await getMetrics(page, cdp);
    await page.getByPlaceholder('Search videos, channels, and favourites...').fill('Performance');
    await settle(page);
    const search = await getMetrics(page, cdp);
    const result = {
      run: run + 1, loadMs,
      initial: { scriptMs: initial.ScriptDuration * 1000, taskMs: initial.TaskDuration * 1000, ...initial.storage },
      favorite: difference(initial, favorite), search: difference(favorite, search),
    };
    if (run === 0) {
      await page.getByPlaceholder('Search videos, channels, and favourites...').fill('');
      await settle(page);
      const idleStart = { ...requests };
      const idleMetrics = await getMetrics(page, cdp);
      await page.waitForTimeout(12_000);
      result.idle12s = {
        feedRequests: requests.feed - idleStart.feed, statusRequests: requests.status - idleStart.status,
        feedBytes: requests.feedBytes - idleStart.feedBytes,
        ...difference(idleMetrics, await getMetrics(page, cdp)),
      };
    }
    assert.deepEqual(errors, [], 'Browser runtime errors');
    if (process.argv.includes('--verify')) {
      assert.equal(result.search.jsonParses, 0, 'Search must reuse decoded browser storage');
      if (result.idle12s) assert.equal(result.idle12s.feedRequests, 0, 'Unchanged idle feeds must not be downloaded again');
    }
    results.push(result);
    console.log(JSON.stringify(result));
    await context.close();
  }
  await writeFile(outputFile, JSON.stringify({ fixture: { channels: 200, videos: 3000, favorites: 500, progress: 1000, cpuThrottle: 4, viewport: '1440x900' }, results }, null, 2) + '\n');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
