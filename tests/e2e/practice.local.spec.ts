import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { test, expect, type APIRequestContext } from "@playwright/test";

test.skip(process.env.LOCAL_PRACTICE_E2E !== "1", "Run pnpm test:practice:local against real local Supabase.");
test.use({ trace: "off", screenshot: "off", video: "off" });
const catalog: { code: string; correct_line: number }[] = JSON.parse(readFileSync("supabase/questions/catalog.json", "utf8"));
const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3002";
function options(body: unknown = {}, key = randomUUID()) { return { headers: { Origin: origin, "Idempotency-Key": key }, data: body }; }
async function start(request: APIRequestContext, key = randomUUID()) {
  expect((await request.post("/api/practice/guest", options())).ok()).toBe(true);
  const response = await request.post("/api/practice/sessions", options({}, key));
  expect(response.status()).toBe(200);
  return response.json();
}
function correctLine(code: string) {
  const question = catalog.find(q => q.code === code);
  expect(question).toBeTruthy();
  return question!.correct_line;
}

test("guest selects by keyboard, survives refresh, sees solution and starts next question", async ({ page, context }, testInfo) => {
  await page.goto("/practice");
  const created = page.waitForResponse(r => r.url().endsWith("/api/practice/sessions") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Start Practice", exact: true }).click();
  const response = await created;
  expect(response.status()).toBe(200);
  const active = await response.json();
  expect(active.solution).toBeNull();
  expect(Object.keys(active.question).sort()).toEqual(["code", "language", "lineCount", "prompt", "title"]);
  expect(Date.parse(active.endsAt) - Date.parse(active.startsAt)).toBe(45000);
  const cookie = (await context.cookies()).find(c => c.name === "dd_practice_guest");
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.sameSite).toBe("Lax");
  expect(await page.evaluate(() => document.cookie)).not.toContain("dd_practice_guest");
  await page.reload();
  await expect(page.getByRole("heading", { name: active.question.title, exact: true })).toBeVisible();
  const restored = await (await context.request.get(`/api/practice/sessions/${active.sessionId}`)).json();
  expect(restored.endsAt).toBe(active.endsAt);
  const line = correctLine(active.question.code);
  await page.getByLabel("Line 1", { exact: true }).focus();
  await page.keyboard.press("Space");
  for (let index = 1; index < line; index++) await page.keyboard.press("ArrowDown");
  await expect(page.getByLabel(`Line ${line}`, { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Submit Answer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "You found the bug." })).toBeFocused();
  await page.reload();
  await expect(page.getByRole("heading", { name: "You found the bug." })).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath("practice-solution.png"), fullPage: true });
  await page.getByRole("button", { name: "Next Question", exact: true }).click();
  await expect(page.getByRole("button", { name: "Submit Answer", exact: true })).toBeVisible();
  await expect(page).not.toHaveURL(new RegExp(active.sessionId));
});

test("two guests remain isolated, strict bodies and early reveal are rejected", async ({ context, browser }) => {
  const a = await start(context.request);
  const b = await browser.newContext({ baseURL: origin });
  try {
    await b.request.post("/api/practice/guest", options());
    expect((await b.request.get(`/api/practice/sessions/${a.sessionId}`)).status()).toBe(404);
    for (const suffix of ["answer", "reveal"]) expect((await b.request.post(`/api/practice/sessions/${a.sessionId}/${suffix}`, options(suffix === "answer" ? { selectedLine: 1 } : {}))).status()).toBe(404);
    expect((await context.request.post(`/api/practice/sessions/${a.sessionId}/reveal`, options())).status()).toBe(409);
    expect((await context.request.post(`/api/practice/sessions/${a.sessionId}/answer`, options({ selectedLine: 1, isCorrect: true }))).status()).toBe(400);
    expect((await context.request.post(`/api/practice/sessions/${a.sessionId}/answer`, options({ selectedLine: 999 }))).status()).toBe(422);
    const crossOrigin = await context.request.post("/api/practice/guest", { headers: { Origin: "https://other.invalid" }, data: {} });
    expect(crossOrigin.status()).toBe(400);
    const oversized = await context.request.post("/api/practice/sessions", options({ padding: "x".repeat(5000) }));
    expect(oversized.status()).toBe(400);
    const wrong = correctLine(a.question.code) === 1 ? 2 : 1;
    const resolved = await context.request.post(`/api/practice/sessions/${a.sessionId}/answer`, options({ selectedLine: wrong }));
    expect((await resolved.json()).solution.isCorrect).toBe(false);
    expect((await b.request.get(`/api/practice/sessions/${a.sessionId}`)).status()).toBe(404);
  } finally { await b.close(); }
});

test("20 concurrent starts and answer retries have one result; conflicting bodies cannot replace it", async ({ context }) => {
  await context.request.post("/api/practice/guest", options());
  const startKey = randomUUID();
  const starts = await Promise.all(Array.from({ length: 20 }, () => context.request.post("/api/practice/sessions", options({}, startKey))));
  const states = await Promise.all(starts.map(async r => { expect(r.status()).toBe(200); return r.json(); }));
  expect(new Set(states.map(s => s.sessionId)).size).toBe(1);
  const state = states[0];
  const key = randomUUID();
  const line = correctLine(state.question.code);
  const answers = await Promise.all(Array.from({ length: 20 }, () => context.request.post(`/api/practice/sessions/${state.sessionId}/answer`, options({ selectedLine: line }, key))));
  for (const answer of answers) {
    expect(answer.status()).toBe(200);
    expect((await answer.json()).solution.isCorrect).toBe(true);
  }
  const conflict = await context.request.post(`/api/practice/sessions/${state.sessionId}/answer`, options({ selectedLine: line === 1 ? 2 : 1 }, key));
  expect((await conflict.json()).error.code).toBe("IDEMPOTENCY_CONFLICT");
  const again = await context.request.post(`/api/practice/sessions/${state.sessionId}/answer`, options({ selectedLine: line }));
  expect((await again.json()).error.code).toBe("ALREADY_SUBMITTED");
});

test("a committed answer with a lost HTTP response can be retried safely", async ({ page }) => {
  await page.goto("/practice");
  const created = page.waitForResponse(r => r.url().endsWith("/api/practice/sessions") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Start Practice", exact: true }).click();
  const state = await (await created).json();
  const keys: string[] = [];
  await page.route("**/api/practice/sessions/*/answer", async route => {
    keys.push(route.request().headers()["idempotency-key"]);
    if (keys.length === 1) { await route.fetch(); await route.abort("failed"); }
    else await route.continue();
  });
  await page.getByLabel(`Line ${correctLine(state.question.code)}`, { exact: true }).check();
  await page.getByRole("button", { name: "Submit Answer", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Retry request", exact: true }).click();
  await expect(page.getByRole("heading", { name: "You found the bug." })).toBeVisible();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
});

test("real 45 second timeout reveals the solution without resetting time", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "The real deadline is exercised once; mobile answer flow is covered separately.");
  test.setTimeout(70000);
  await page.goto("/practice");
  const created = page.waitForResponse(r => r.url().endsWith("/api/practice/sessions") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Start Practice", exact: true }).click();
  const state = await (await created).json();
  await expect(page.getByRole("heading", { name: "Time is up. Here is the fix." })).toBeVisible({ timeout: 55000 });
  expect((await context.request.post(`/api/practice/sessions/${state.sessionId}/answer`, options({ selectedLine: 1 }))).status()).toBe(409);
});

test("verified account can Practice before onboarding with no XP or statistics change", async ({ page, context }) => {
  test.setTimeout(45000);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname)) throw new Error("Account fixtures require local Supabase.");
  // Synthetic local fixture; actual password login/JWT and Practice authorization follow.
  const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const email = `dd-practice-${randomUUID()}@example.test`;
  const password = `Local-${randomUUID()}!`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(error).toBeNull();
  await page.goto("/login/email");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/(profile|onboarding)$/);
  await page.goto("/practice");
  const created = page.waitForResponse(r => r.url().endsWith("/api/practice/sessions") && r.request().method() === "POST");
  await page.getByRole("button", { name: "Start Practice", exact: true }).click();
  const active = await (await created).json();
  expect(active.identity).toBe("account");
  await page.getByLabel(`Line ${correctLine(active.question.code)}`, { exact: true }).check();
  await page.getByRole("button", { name: "Submit Answer", exact: true }).click();
  await expect(page.getByRole("heading", { name: "You found the bug." })).toBeVisible();
  const viewer = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  expect((await viewer.auth.signInWithPassword({ email, password })).error).toBeNull();
  const own = await viewer.from("profiles").select("xp,wins,losses,draws,matches_played,correct_answers,onboarding_completed_at").eq("id", data.user!.id).single();
  expect(own.data).toEqual({ xp: 0, wins: 0, losses: 0, draws: 0, matches_played: 0, correct_answers: 0, onboarding_completed_at: null });
  const stranger = await admin.auth.admin.createUser({ email: `dd-practice-${randomUUID()}@example.test`, password, email_confirm: true });
  const outsider = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  await outsider.auth.signInWithPassword({ email: stranger.data.user!.email!, password });
  const forbidden = await outsider.rpc("practice_account", { p_action: "get", p_session_id: active.sessionId });
  expect(forbidden.error?.message).toBe("SESSION_UNAVAILABLE");
  const cookies = await context.cookies();
  expect(cookies.some(c => c.name.startsWith("sb-"))).toBe(true);
});
