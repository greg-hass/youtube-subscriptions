import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";

if (!process.env.MYTUBE_QA_MANIFEST) {
	throw new Error("Run npm run test:e2e so tests own an isolated build, API, and database.");
}
const run = JSON.parse(readFileSync(process.env.MYTUBE_QA_MANIFEST, "utf8"));
export default defineConfig({
	testDir: "./tests/e2e",
	fullyParallel: true,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 1 : 0,
	reporter: [[process.env.CI ? "github" : "list"], ["html", { outputFolder: `${process.env.MYTUBE_QA_OUTPUT}/report`, open: "never" }]],
	outputDir: `${process.env.MYTUBE_QA_OUTPUT}/playwright`,
	use: {
		baseURL: run.url,
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	projects: run.mode === "dev" ? [
		{ name: "dev", testMatch: "dev-smoke.spec.ts", use: { ...devices["Desktop Chrome"] } },
	] : [
		{ name: "chromium", testMatch: "remediation.spec.ts", use: { ...devices["Desktop Chrome"] } },
		{ name: "real-stack", testMatch: "real-stack.spec.ts", workers: 1, use: { ...devices["Desktop Chrome"] } },
	],
});
