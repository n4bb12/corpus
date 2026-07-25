import { expect, test } from "@playwright/test"

test("auth routes render focused panels", async ({ page }) => {
	await page.goto("/sign-in")
	await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
	await expect(
		page.getByRole("button", { name: "Continue with Google" }),
	).toBeVisible()

	await page.goto("/sign-up")
	await expect(
		page.getByRole("heading", { name: "Create account" }),
	).toBeVisible()
})
