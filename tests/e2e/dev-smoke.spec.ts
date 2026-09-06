import { test, expect, qa } from "./fixtures";

test("development server transforms modules and authenticates with the real API", async ({ page }) => {
	await page.addInitScript(token => localStorage.setItem("mytube.serverApiToken", token), qa.token);
	await page.goto("/");
	await expect(page.getByText("QA seeded video", { exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Add video to favorites" }).click();
	await expect(page.getByRole("button", { name: "Remove video from favorites" })).toBeVisible();
});
