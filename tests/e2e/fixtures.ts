import { test as base, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

export const qa = JSON.parse(readFileSync(process.env.MYTUBE_QA_MANIFEST!, "utf8"));
export const test = base.extend<{ evidence: void }>({
	evidence: [async ({ page, request }, provide, testInfo) => {
		const events: string[] = [];
		const errors: string[] = [];
		page.on("console", message => events.push(`console ${message.type()}: ${message.text()}`));
		page.on("pageerror", error => { errors.push(error.message); events.push(`pageerror: ${error.message}`); });
		page.on("requestfailed", request => events.push(`requestfailed ${request.method()} ${request.url()}: ${request.failure()?.errorText}`));
		page.on("response", response => { if (response.status() >= 400) events.push(`HTTP ${response.status()} ${response.url()}`); });
		const response = await request.get("/api/version", { headers: { Authorization: `Bearer ${qa.token}` } });
		expect(response.status()).toBe(200);
		expect((await response.json()).buildId).toBe(qa.buildId);
		const html = await request.get("/");
		expect(await html.text()).toContain(`content="${qa.buildId}"`);
		try {
			await provide();
			expect(errors).toEqual([]);
		} finally {
			await testInfo.attach("browser-events", { body: events.join("\n"), contentType: "text/plain" });
		}
	}, { auto: true }],
});
export { expect };
