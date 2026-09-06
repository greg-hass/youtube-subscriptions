import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { expect, test, qa } from "./fixtures";

const require = createRequire(import.meta.url);
const { createSqliteStore } = require("../../server/sqlite-store");

test("real API auth, watched persistence, backup, and feed-version refresh", async ({ page, request }) => {
	test.setTimeout(60_000);
	const initialStore = createSqliteStore({ databaseFile: qa.databaseFile });
	await initialStore.init({ defaultData: {}, defaultVideoCache: {} });
	try {
		await initialStore.writeData(qa.seedData);
		await initialStore.writeVideoCache(qa.seedCache);
	} finally { initialStore.close(); }
	await page.goto("/");
	await expect(page.getByTestId("auth-required")).toBeVisible();
	await page.getByLabel("Server API token", { exact: true }).fill(qa.token);
	await page.getByRole("button", { name: "Connect to server" }).click();
	await expect(page.getByText("QA seeded video", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Mark video as watched" }).click();
	const headers = { Authorization: `Bearer ${qa.token}` };
	await expect.poll(async () => (await (await request.get("/api/sync", { headers })).json()).watchedVideos).toContain("qa-video-01");
	await page.reload();
	await expect(page.getByTestId("video-watched-indicator")).toBeVisible();
	await page.getByRole("button", { name: "Settings", exact: true }).click();
	const downloadPromise = page.waitForEvent("download");
	await page.getByRole("button", { name: "Download Backup" }).click();
	const download = await downloadPromise;
	const backup = await readFile((await download.path())!, "utf8");
	expect(backup).toContain("qa-video-01");
	expect(backup).not.toContain(qa.token);
	await page.keyboard.press("Escape");
	await page.getByRole("button", { name: "Mark video as unwatched" }).click();
	await expect.poll(async () => (await (await request.get("/api/sync", { headers })).json()).watchedVideos).toEqual([]);
	await page.getByRole("button", { name: "Settings", exact: true }).click();
	await page.getByTestId('settings-modal-body').locator('input[type="file"]').setInputFiles({ name: "qa-backup.json", mimeType: "application/json", buffer: Buffer.from(backup) });
	await page.getByRole("button", { name: /Confirm restore/ }).click();
	await expect(page.getByText(/Backup restored:/)).toBeVisible();
	await expect.poll(async () => (await (await request.get("/api/sync", { headers })).json()).watchedVideos).toContain("qa-video-01");
	await page.keyboard.press("Escape");

	// Simulate the persistence boundary of a backfill, without contacting YouTube.
	const store = createSqliteStore({ databaseFile: qa.databaseFile });
	await store.init({ defaultData: {}, defaultVideoCache: {} });
	try {
		const cache = await store.readVideoCache({});
		await store.writeVideoCache({ ...cache, lastUpdated: new Date(Date.now() + 1000).toISOString(), videos: [{ ...cache.videos[0], id: "qa-video-02", title: "QA backfill arrived" }, ...cache.videos] });
		await expect(page.getByText("QA backfill arrived", { exact: true })).toBeVisible({ timeout: 12_000 });
		await store.writeVideoCache({ videos: [], lastUpdated: null, totalChannels: 1, totalVideos: 0, channelRefreshes: {} });
		await expect(page.getByText("QA backfill arrived", { exact: true })).not.toBeVisible({ timeout: 12_000 });
	} finally {
		store.close();
	}
});
