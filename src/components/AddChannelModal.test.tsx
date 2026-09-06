import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement, Fragment } from "react";
import type { YouTubeChannel } from "../types/youtube";
import { AddChannelModal } from "./AddChannelModal";

const DEFAULT_CHANNELS = [
	{
		id: "UC1234567890123456789012",
		title: "Linux Tech Channel",
		description: "Linux tutorials and reviews",
		thumbnail: "https://example.com/channel.jpg",
	},
	{
		id: "UC2222222222222222222222",
		title: "Kernel Notes",
		description: "Deep dives into operating systems",
		thumbnail: "https://example.com/kernel.jpg",
	},
];

function installCustomFetchMock(results: YouTubeChannel[] = DEFAULT_CHANNELS) {
	vi.stubGlobal("fetch", vi.fn((url: string | URL | Request) =>
		Promise.resolve(String(url).startsWith("/api/channel-search")
			? { ok: true, json: async () => ({ results }) }
			: { ok: false, status: 404 }),
	));
}

function install429FetchMock() {
	vi.stubGlobal(
		"fetch",
		vi.fn(() => Promise.resolve({ ok: false, status: 429 })),
	);
}

async function searchFor(query: string) {
	fireEvent.change(screen.getByLabelText("YouTube Channel"), {
		target: { value: query },
	});
	fireEvent.click(screen.getByRole("button", { name: "Search channels" }));
	await waitFor(() => {
		expect(fetch).toHaveBeenCalledWith(
			`/api/channel-search?q=${encodeURIComponent(query)}`,
			expect.objectContaining({ signal: expect.any(AbortSignal) }),
		);
	});
}

function clickPreview(channelName: string) {
	fireEvent.click(
		screen.getByRole("button", {
			name: (accessibleName: string) =>
				accessibleName.toLowerCase().includes(channelName.toLowerCase()),
		}),
	);
}

function renderModal(props: {
	onClose?: () => void;
	onAdd?: (channel: YouTubeChannel) => void | Promise<void>;
	existingSubscriptions?: YouTubeChannel[];
} = {}) {
	return render(
		createElement(AddChannelModal, {
			isOpen: true,
			onClose: props.onClose ?? vi.fn(),
			onAdd: props.onAdd ?? vi.fn(),
			existingSubscriptions: props.existingSubscriptions,
		}),
	);
}

describe("AddChannelModal", () => {
	beforeEach(() => installCustomFetchMock());
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("shows a preview before adding a searched channel", async () => {
		const onAdd = vi.fn();
		const onClose = vi.fn();
		renderModal({ onAdd, onClose });
		expect(screen.getByLabelText("YouTube Channel")).toHaveFocus();
		await searchFor("the linux tech channel");
		clickPreview("linux tech channel");
		const preview = screen.getByText("Channel Preview").closest("section")!;
		expect(within(preview).getByText("Linux Tech Channel")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "Dismiss" })).toBeInTheDocument();
		fireEvent.click(screen.getByRole("button", { name: "Add" }));
		await waitFor(() => {
			expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({
				id: "UC1234567890123456789012",
				title: "Linux Tech Channel",
			}));
		});
		expect(onClose).not.toHaveBeenCalled();
		expect(screen.queryByText("Channel Preview")).not.toBeInTheDocument();
	});

	it("filters existing subscriptions out of keyword search results", async () => {
		renderModal({
			existingSubscriptions: [
				{
					id: "UC1234567890123456789012",
					title: "Linux Tech Channel",
					description: "",
					thumbnail: "",
				},
			],
		});
		await searchFor("linux tech");
		expect(screen.queryByText("Linux Tech Channel")).not.toBeInTheDocument();
	});

	it("filters canonical results matching an unresolved handle subscription", async () => {
		installCustomFetchMock([
			{
				id: "UC1234567890123456789012",
				title: "Linux Tech Channel",
				description: "Linux tutorials and reviews",
				thumbnail: "https://example.com/channel.jpg",
				customUrl: "/@linux_tech",
			},
		]);
		renderModal({
			existingSubscriptions: [
				{
					id: "handle_linux_tech",
					title: "@linux_tech",
					description: "",
					thumbnail: "",
				},
			],
		});

		await searchFor("linux tech");
		expect(screen.queryByText("Linux Tech Channel")).not.toBeInTheDocument();
	});

	it("shows a direct handle as already subscribed when its canonical result matches", async () => {
		installCustomFetchMock([
			{
				id: "UC1234567890123456789012",
				title: "Linux Tech Channel",
				description: "Linux tutorials and reviews",
				thumbnail: "https://example.com/channel.jpg",
				customUrl: "/@linux_tech",
			},
		]);
		renderModal({
			existingSubscriptions: [
				{
					id: "handle_linux_tech",
					title: "@linux_tech",
					description: "",
					thumbnail: "",
				},
			],
		});

		fireEvent.change(screen.getByLabelText("YouTube Channel"), {
			target: { value: "@linux_tech" },
		});
		fireEvent.click(screen.getByRole("button", { name: "Search channels" }));

		const duplicateButton = await screen.findByRole("button", {
			name: "Added",
		});
		expect(duplicateButton).toBeDisabled();
	});

	it("waits for Enter or Search instead of requesting while the user types", async () => {
		renderModal();
		const input = screen.getByLabelText("YouTube Channel");

		for (const value of ["yo", "you", "yout", "youtu", "youtube"]) {
			fireEvent.change(input, { target: { value } });
		}

		expect(fetch).not.toHaveBeenCalled();
		expect(screen.queryByText(/no channels found/i)).not.toBeInTheDocument();

		fireEvent.keyDown(input, { key: "Enter" });
		await waitFor(() => {
			expect(fetch).toHaveBeenCalledTimes(1);
			expect(fetch).toHaveBeenCalledWith(
				"/api/channel-search?q=youtube",
				expect.objectContaining({ signal: expect.any(AbortSignal) }),
			);
		});
	});

	it("sends natural-language search phrases to the backend unchanged", async () => {
		installCustomFetchMock([
			{
				id: "UC3333333333333333333333",
				title: "Workshop Companion",
				description: "Woodworking plans, tools, and shop projects",
				thumbnail: "https://example.com/workshop.jpg",
				customUrl: "/@workshopcompanion",
				subscriberCount: "250000",
			},
		]);
		renderModal();
		await searchFor("the best woodworking channels");
		expect(await screen.findByText("Workshop Companion")).toBeInTheDocument();
		expect(fetch).toHaveBeenCalledTimes(1);
		clickPreview("workshop companion");
		const preview = screen.getByText("Channel Preview").closest("section")!;
		expect(within(preview).getByText("250,000 subscribers")).toBeInTheDocument();
		expect(within(preview).getByText("/@workshopcompanion")).toBeInTheDocument();
	});

	it('surfaces an authentication-required message on 401 instead of "no channels found"', async () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
		renderModal();
		await searchFor("the best woodworking channels");
		expect(await screen.findByText(/authentication required/i)).toBeInTheDocument();
		expect(await screen.findByText(/set your server api token in settings/i)).toBeInTheDocument();
		expect(screen.queryByText(/no channels found/i)).not.toBeInTheDocument();
		expect(consoleError).not.toHaveBeenCalled();
	});

	it("explains channel-search throttling without blaming the connection", async () => {
		install429FetchMock();
		renderModal();
		await searchFor("Northern Ireland traveller");

		expect(await screen.findByText("Too many searches")).toBeInTheDocument();
		expect(screen.getByText("Wait a minute, then try again.")).toBeInTheDocument();
		expect(screen.queryByText(/check your connection/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/no channels found/i)).not.toBeInTheDocument();
	});

	it("surfaces throttling for direct handles instead of claiming there are no results", async () => {
		install429FetchMock();
		renderModal();
		await searchFor("@northernirelandtraveller");

		expect(await screen.findByText("Too many searches")).toBeInTheDocument();
		expect(screen.queryByText(/no channels found/i)).not.toBeInTheDocument();
	});

	it("keeps network failures contained and shows a retryable search error", async () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
		renderModal();
		await searchFor("woodworking channels");

		expect(
			await screen.findByText(/search unavailable.*check your connection/i),
		).toBeInTheDocument();
		expect(screen.queryByText(/no channels found/i)).not.toBeInTheDocument();
		expect(consoleError).toHaveBeenCalledOnce();
		consoleError.mockRestore();
	});

	it("keeps the preview open and reports an add failure without escaping the click handler", async () => {
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		const onAdd = vi.fn(() => Promise.reject(new Error("Server unavailable")));
		renderModal({ onAdd });
		await searchFor("linux tech");
		clickPreview("linux tech channel");

		fireEvent.click(screen.getByRole("button", { name: "Add" }));

		expect(
			await screen.findByText("Failed to add channel. Please try again."),
		).toBeInTheDocument();
		expect(screen.getByText("Channel Preview")).toBeInTheDocument();
		expect(consoleError).toHaveBeenCalledOnce();
		consoleError.mockRestore();
	});

	it("keeps the supported formats card collapsed until the toggle is tapped", () => {
		renderModal();

		const toggle = screen.getByRole("button", { name: "Supported formats" });
		expect(toggle).toHaveAttribute("aria-expanded", "false");
		expect(screen.queryByText("Channel ID")).not.toBeInTheDocument();

		fireEvent.click(toggle);
		expect(toggle).toHaveAttribute("aria-expanded", "true");
		expect(screen.getByText("Channel ID")).toBeInTheDocument();
	});

	it("contains keyboard focus and restores the opener when closed", async () => {
		const onClose = vi.fn();
		const { rerender } = render(
			createElement(
				Fragment,
				null,
				createElement("button", { type: "button" }, "Open Add Channel"),
				createElement(AddChannelModal, {
					isOpen: false,
					onClose,
					onAdd: vi.fn(),
				}),
			),
		);
		const opener = screen.getByRole("button", { name: "Open Add Channel" });
		opener.focus();

		rerender(
			createElement(
				Fragment,
				null,
				createElement("button", { type: "button" }, "Open Add Channel"),
				createElement(AddChannelModal, {
					isOpen: true,
					onClose,
					onAdd: vi.fn(),
				}),
			),
		);

		const dialog = await screen.findByRole("dialog", { name: "Add Channel" });
		const input = screen.getByLabelText("YouTube Channel");
		const focusableElements = Array.from(
			dialog.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
			),
		);
		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];

		expect(input).toHaveFocus();

		firstElement.focus();
		fireEvent.keyDown(firstElement, { key: "Tab", shiftKey: true });
		expect(lastElement).toHaveFocus();

		fireEvent.keyDown(lastElement, { key: "Tab" });
		expect(firstElement).toHaveFocus();

		fireEvent.keyDown(input, { key: "Escape" });
		expect(onClose).toHaveBeenCalledOnce();

		rerender(
			createElement(
				Fragment,
				null,
				createElement("button", { type: "button" }, "Open Add Channel"),
				createElement(AddChannelModal, {
					isOpen: false,
					onClose,
					onAdd: vi.fn(),
				}),
			),
		);
		expect(opener).toHaveFocus();
	});
});
