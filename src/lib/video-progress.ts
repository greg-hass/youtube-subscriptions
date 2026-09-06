const STORAGE_KEY = "video-playback-progress";

export interface VideoProgress {
	currentTime: number;
	duration: number;
	updatedAt: number;
	// Retained for progress records saved by the former Continue Watching view.
	removedAt?: number;
}

type VideoProgressStore = Record<string, VideoProgress>;
let cachedRaw: string | null | undefined;
let cachedStore: VideoProgressStore = {};

function readProgressStore(): VideoProgressStore {
	try {
		const rawValue = localStorage.getItem(STORAGE_KEY);
		if (rawValue === cachedRaw) return cachedStore;
		const parsedValue = rawValue ? JSON.parse(rawValue) : {};
		cachedStore = parsedValue &&
			typeof parsedValue === "object" &&
			!Array.isArray(parsedValue)
			? parsedValue
			: {};
		cachedRaw = rawValue;
		return cachedStore;
	} catch {
		return {};
	}
}

function writeProgressStore(store: VideoProgressStore) {
	const rawValue = JSON.stringify(store);
	localStorage.setItem(STORAGE_KEY, rawValue);
	cachedRaw = rawValue;
	cachedStore = store;
	window.dispatchEvent(new Event("video-progress-changed"));
}

export function getVideoProgress(videoId: string): VideoProgress | null {
	const progress = readProgressStore()[videoId];
	if (
		!progress ||
		typeof progress.currentTime !== "number" ||
		typeof progress.duration !== "number" ||
		progress.currentTime <= 0 ||
		progress.duration <= 0
	) {
		return null;
	}

	return progress;
}

export function getVideoProgressPercent(videoId: string): number {
	const progress = getVideoProgress(videoId);
	if (!progress) return 0;

	return Math.min(
		100,
		Math.max(0, (progress.currentTime / progress.duration) * 100),
	);
}

export function clearVideoProgress(videoId: string) {
	const store = { ...readProgressStore() };
	delete store[videoId];
	writeProgressStore(store);
}

export function saveVideoProgress(
	videoId: string,
	currentTime: number,
	duration: number,
) {
	if (
		!Number.isFinite(currentTime) ||
		!Number.isFinite(duration) ||
		duration <= 0
	)
		return;

	const store = { ...readProgressStore() };
	store[videoId] = {
		currentTime: Math.max(0, currentTime),
		duration,
		updatedAt: Date.now(),
	};
	writeProgressStore(store);
}
