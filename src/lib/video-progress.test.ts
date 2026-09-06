import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	clearVideoProgress,
	getVideoProgress,
	getVideoProgressPercent,
	saveVideoProgress,
} from "./video-progress";

describe("video progress storage", () => {
	afterEach(() => vi.restoreAllMocks());
	beforeEach(() => {
		const storage = new Map<string, string>();
		vi.stubGlobal("localStorage", {
			getItem: vi.fn((key: string) => storage.get(key) ?? null),
			setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
			removeItem: vi.fn((key: string) => storage.delete(key)),
			clear: vi.fn(() => storage.clear()),
		});
	});

	it("stores and reads resumable playback progress", () => {
		saveVideoProgress("video-1", 45, 120);

		expect(getVideoProgress("video-1")).toMatchObject({
			currentTime: 45,
			duration: 120,
		});
		expect(getVideoProgressPercent("video-1")).toBe(37.5);
	});

	it("reuses decoded history until storage changes, including writes from another tab", () => {
		localStorage.setItem("video-playback-progress", JSON.stringify({
			"video-1": { currentTime: 30, duration: 120, updatedAt: 1 },
		}));
		const parse = vi.spyOn(JSON, "parse");
		for (let index = 0; index < 20; index++) {
			expect(getVideoProgressPercent("video-1")).toBe(25);
		}
		expect(parse).toHaveBeenCalledTimes(1);
		localStorage.setItem("video-playback-progress", JSON.stringify({
			"video-1": { currentTime: 60, duration: 120, updatedAt: 2 },
		}));
		expect(getVideoProgressPercent("video-1")).toBe(50);
		expect(parse).toHaveBeenCalledTimes(2);
	});

	it("does not change cached progress when persistence fails", () => {
		saveVideoProgress("video-1", 30, 120);
		vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error("Storage full"); });
		expect(() => saveVideoProgress("video-1", 60, 120)).toThrow("Storage full");
		expect(getVideoProgress("video-1")?.currentTime).toBe(30);
		expect(() => clearVideoProgress("video-1")).toThrow("Storage full");
		expect(getVideoProgress("video-1")?.currentTime).toBe(30);
	});

	it("keeps progress until playback reports that the video ended", () => {
		saveVideoProgress("video-1", 118, 120);

		expect(getVideoProgress("video-1")).toMatchObject({
			currentTime: 118,
			duration: 120,
		});
		expect(getVideoProgressPercent("video-1")).toBeCloseTo(98.333, 2);
	});

	it("can clear one video without losing another", () => {
		saveVideoProgress("video-1", 30, 120);
		saveVideoProgress("video-2", 20, 100);

		clearVideoProgress("video-1");

		expect(getVideoProgress("video-1")).toBeNull();
		expect(getVideoProgress("video-2")).toMatchObject({ currentTime: 20 });
	});

	it("resumes legacy progress records and clears their removal flag", () => {
		localStorage.setItem(
			"video-playback-progress",
			JSON.stringify({
				"video-1": { currentTime: 30, duration: 120, updatedAt: 1, removedAt: 2 },
			}),
		);
		expect(getVideoProgress("video-1")).toMatchObject({
			currentTime: 30,
			removedAt: 2,
		});
		saveVideoProgress("video-1", 45, 120);

		expect(getVideoProgress("video-1")!.removedAt).toBeUndefined();
		expect(getVideoProgress("video-1")!.currentTime).toBe(45);
	});
});
