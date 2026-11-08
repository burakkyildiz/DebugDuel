import { randomUUID } from "node:crypto";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

test.skip(process.env.LOCAL_AUTH_E2E !== "1", "Run pnpm test:auth:local against local Supabase and Mailpit.");
test.use({ trace: "off", screenshot: "off", video: "off", actionTimeout: 10000 });

async function emailLink(request: APIRequestContext, email: string, kind: "signup" | "recovery") {
  let id: string | undefined;
  await expect.poll(async () => {
    const response = await request.get(`http://127.0.0.1:54324/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);
    const data = await response.json();
    id = data.messages?.find((message: { ID: string; Subject: string }) => kind === "recovery" ? /reset/i.test(message.Subject) : /confirm/i.test(message.Subject))?.ID;
    return Boolean(id);
  }, { timeout: 15000 }).toBe(true);
  const message = await (await request.get(`http://127.0.0.1:54324/api/v1/message/${id}`)).json();
  const hrefs = String(message.HTML ?? "").matchAll(/href=["']([^"']+)["']/g);
  for (const [, raw] of hrefs) {
    const value = raw.replaceAll("&amp;", "&");
    const url = new URL(value);
    if (url.origin === new URL(process.env.PLAYWRIGHT_BASE_URL!).origin && url.pathname === "/auth/callback" && url.searchParams.has("token_hash") && url.searchParams.get("type") === (kind === "signup" ? "email" : "recovery")) return value;
    if (["127.0.0.1", "localhost"].includes(url.hostname) && url.pathname === "/auth/v1/verify" && url.searchParams.get("type") === kind) return value;
  }
  throw new Error("Expected local verification link was not found.");
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login/email");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}

async function logout(page: Page) {
  const origin = new URL(page.url()).origin;
  const [response] = await Promise.all([
    page.waitForResponse(response => response.request().method() === "POST" && new URL(response.url()).pathname === "/api/auth/logout"),
    page.waitForRequest(request => request.isNavigationRequest() && request.resourceType() === "document" && request.url() === origin + "/"),
    page.getByRole("button", { name: "Sign out", exact: true }).click(),
  ]);
  expect(response.status()).toBe(200);
  await expect(page).toHaveURL(origin + "/");
  await expect(page.getByRole("link", { name: "Log in", exact: true })).toBeVisible();
  // A fresh request, including after the second login/logout, must be unauthenticated.
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login\?next=/);
  await expect(page.getByRole("heading", { name: "Your next rival awaits." })).toBeVisible();
}

test("real local signup, confirmation, profile, refresh, logout and password recovery", async ({ page, request }) => {
  test.setTimeout(90000);
  const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
  const email = `dd-auth-${suffix}@example.test`;
  const password = `Initial-${randomUUID()}!`;
  const replacement = `Updated-${randomUUID()}!`;
  const username = `phase2_${suffix}`;
  await page.goto("/signup");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resend confirmation email" })).toBeVisible();
  // Simulate opening the email in another browser: no PKCE verifier survives.
  await page.context().clearCookies();
  await page.goto(await emailLink(request, email, "signup"));
  await expect(page.getByLabel("Username", { exact: true })).toBeVisible();
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Display name", { exact: true }).fill("Local Auth Test");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Profile updated." })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(username);
  await logout(page);
  await login(page, email, password);
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(username);
  await logout(page);
  await page.goto("/forgot-password");
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("heading", { name: "Check your inbox" })).toBeVisible();
  await page.context().clearCookies();
  await page.goto(await emailLink(request, email, "recovery"));
  await expect(page.getByRole("heading", { name: "Choose a new password." })).toBeVisible();
  await page.getByLabel("Password", { exact: true }).fill(replacement);
  await page.getByRole("button", { name: "Save new password" }).click();
  await expect(page).toHaveURL(/\/login\?updated=1/);
  await login(page, email, password);
  await expect(page.getByRole("alert").filter({ hasText: "We couldn’t sign you in." })).toBeVisible();
  await login(page, email, replacement);
  await expect(page.getByLabel("Username", { exact: true })).toHaveValue(username);
});
