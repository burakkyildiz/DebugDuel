import { expect, test } from "@playwright/test";

test("landing, auth navigation and honest feature states", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sharp eyes. Faster fixes." })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("home.png"), fullPage: true });
  await page.getByRole("link", { name: "Quick Practice", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Practice is getting ready." })).toBeVisible();
  await page.goto("/login");
  await page.getByRole("link", { name: "Continue with Email" }).click();
  await expect(page.getByLabel("Email address")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("autocomplete", "current-password");
});

test("protected profile redirects and invalid callbacks stay internal", async ({ page }) => {
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.getByRole("heading", { name: "Your next rival awaits." })).toBeVisible();
  await page.goto("/auth/callback?next=https://evil.test");
  await expect(page).toHaveURL(/\/login\?error=link/);
  await expect(page.getByRole("alert").filter({ hasText: "invalid or has expired" })).toBeVisible();
});

test("320px layout stays within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.goto("/login/email");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("auth rejects cross-origin mutations and unknown fields", async ({ request }) => {
  const rejected = await request.post("/api/auth/login", { headers: { Origin: "https://evil.test" }, data: { email: "a@example.com", password: "x" } });
  expect(rejected.status()).toBe(400);
  const injected = await request.post("/api/auth/login", { headers: { Origin: "http://localhost:3000" }, data: { email: "a@example.com", password: "x", xp: 100 } });
  expect(injected.status()).toBe(400);
});
