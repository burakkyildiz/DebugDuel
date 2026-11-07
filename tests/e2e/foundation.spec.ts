import { expect, test } from "@playwright/test";

test("landing, auth navigation and honest feature states", async ({ page }, testInfo) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Sharp eyes. Faster fixes." })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("home.png"), fullPage: true });
  await page.getByRole("link", { name: "Quick Practice", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start Practice", exact: true })).toBeVisible();
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

test("per-request CSP allows hydration and keyboard navigation", async ({ page, request }) => {
  const violations: string[] = [];
  page.on("console", message => { if (message.type() === "error" && /content security policy/i.test(message.text())) violations.push(message.text()); });
  const response = await page.goto("/");
  const policy = response?.headers()["content-security-policy"] ?? "";
  const nonce = policy.match(/'nonce-([^']+)'/)?.[1];
  expect(nonce).toBeTruthy();
  const another = await request.get("/");
  expect(another.headers()["content-security-policy"]).not.toContain(`'nonce-${nonce}'`);
  expect(policy).toContain("frame-ancestors 'none'");
  expect(await page.locator("script").evaluateAll(nodes => nodes.every(node => node.nonce.length > 0))).toBe(true);
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.goto("/login/email");
  await expect(page.getByLabel("Email address")).toBeVisible();
  expect(violations).toEqual([]);
});
