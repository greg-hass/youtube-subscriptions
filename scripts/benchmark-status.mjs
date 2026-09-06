// Measures real HTTP status requests against a disposable SQLite database.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
const outputFile = process.argv[2] || 'output/performance/status.json';
await mkdir(dirname(outputFile), { recursive: true });
const require = createRequire(import.meta.url);
const { createSqliteStore } = require('../server/sqlite-store');
const { createFeedAggregator } = require('../server/feed-aggregator');
const { createApp } = require('../server/app-factory');
const directory = await mkdtemp(join(tmpdir(), 'mytube-status-benchmark-'));
const store = createSqliteStore({ databaseFile: join(directory, 'test.sqlite'), legacyDataFile: join(directory, 'missing.json'), legacyVideosFile: join(directory, 'missing-videos.json') });
const defaultData = { subscriptions: [], watchedVideos: [], settings: {}, redirects: {} };
const defaultVideoCache = { videos: [], lastUpdated: null, channelRefreshes: {} };
let server;
try {
  await store.init({ defaultData, defaultVideoCache });
  const subscriptions = Array.from({ length: 200 }, (_, i) => ({ id: `UC${String(i).padStart(22, '0')}`, title: `Channel ${i}`, addedAt: i }));
  await store.writeData({ ...defaultData, subscriptions });
  const videos = Array.from({ length: 5000 }, (_, i) => ({ id: `video_${i}`, channelId: subscriptions[i % 200].id, title: `Video ${i}`, description: 'A sizeable archived video description. '.repeat(20), publishedAt: new Date(Date.now() - i * 60_000).toISOString(), thumbnail: '' }));
  await store.writeVideoCache({ videos, lastUpdated: new Date().toISOString(), channelRefreshes: Object.fromEntries(subscriptions.map(sub => [sub.id, { lastFetchedAt: new Date().toISOString() }])) });
  let fullCacheReads = 0;
  const readVideoCache = store.readVideoCache;
  store.readVideoCache = (...args) => { fullCacheReads++; return readVideoCache(...args); };
  const feedAggregator = createFeedAggregator(store);
  const { app } = createApp({ appStore: store, feedAggregator, config: { apiKey: 'benchmark-token', defaultData, defaultVideoCache } });
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/api/videos/status`;
  const samples = [];
  for (let i = 0; i < 35; i++) {
    const started = performance.now();
    const response = await fetch(url, { headers: { Authorization: 'Bearer benchmark-token' } });
    const json = await response.json();
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(json.activeChannels));
    if (i >= 5) samples.push(performance.now() - started);
  }
  samples.sort((a, b) => a - b);
  const result = { channels: 200, videos: 5000, requests: 35, measuredRequests: 30, fullCacheReads, medianMs: samples[Math.floor(samples.length / 2)], p95Ms: samples[Math.floor(samples.length * 0.95)] };
  console.log(JSON.stringify(result));
  if (process.argv.includes('--verify')) assert.equal(fullCacheReads, 0, 'Status requests must not reconstruct the video cache');
  await writeFile(outputFile, JSON.stringify(result, null, 2) + '\n');
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  store.close();
  await rm(directory, { recursive: true, force: true });
}
