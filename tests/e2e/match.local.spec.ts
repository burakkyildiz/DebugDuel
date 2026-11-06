import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { test, expect, type Browser, type BrowserContext, type Page, type APIRequestContext } from "@playwright/test";

test.skip(process.env.LOCAL_MATCH_E2E !== "1", "Run pnpm test:match:local against real local Supabase and Realtime.");
test.use({ trace: "off", screenshot: "off", video: "off" });
const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3005";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const catalog: { code: string; correct_line: number }[] = JSON.parse(readFileSync("supabase/questions/catalog.json", "utf8"));
const headers = (key = randomUUID()) => ({ Origin: origin, "Idempotency-Key": key });
const post = (request: APIRequestContext, path: string, body: object = {}, key = randomUUID()) => request.post(path, { headers: headers(key), data: body });
function publicClient() { return createClient(url, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } }); }
async function fixture(browser: Browser, onboarded = true, mobile = false) {
  if (!["localhost", "127.0.0.1"].includes(new URL(url).hostname)) throw new Error("Local test fixtures only.");
  const admin = createClient(url, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const suffix = randomUUID().replaceAll("-", "").slice(0, 10);
  const email = `dd-match-${suffix}@example.test`;
  const password = `Local-${randomUUID()}!`;
  const result = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  expect(result.error).toBeNull();
  const context = await browser.newContext({ baseURL: origin, viewport: mobile ? { width: 375, height: 812 } : { width: 1280, height: 900 } });
  const page = await context.newPage();
  async function login() {
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
  }
  if (onboarded) {
    await page.goto("/login/email"); await login(); await expect(page).toHaveURL(/\/profile$/);
    const response = await context.request.patch("/api/me/profile", { headers: { Origin: origin }, data: { username: `duel_${suffix}`, displayName: "Local Duel Test", avatarSeed: "violet" } });
    expect(response.status()).toBe(200);
  }
  return { context, page, email, password, login, username: `duel_${suffix}`, id: result.data.user!.id };
}
async function createRoom(a: { context: BrowserContext }) {
  const response = await post(a.context.request, "/api/matches");
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.inviteUrl).toMatch(/\/invite\/[A-Za-z0-9_-]{43}$/);
  return data as { matchId: string; inviteUrl: string };
}
async function joinRoom(b: { context: BrowserContext; page: Page }, inviteUrl: string) {
  await b.page.goto(inviteUrl);
  await expect(b.page).toHaveURL(origin + "/invite");
  const response = await post(b.context.request, "/api/invites/redeem");
  expect(response.status()).toBe(200);
  return response.json();
}
async function state(context: BrowserContext, id: string) {
  const response = await context.request.get(`/api/matches/${id}/state`);
  expect(response.status()).toBe(200);
  return response.json();
}
async function subscribe(client: ReturnType<typeof publicClient>, id: string, privateChannel = true) {
  const channel = client.channel(`match:${id}`, { config: { private: privateChannel } });
  const status = await new Promise<string>(resolve => {
    const timer = setTimeout(() => resolve("TEST_TIMEOUT"), 12000);
    channel.on("broadcast", { event: "match_updated" }, () => {}).subscribe(value => {
      if (["SUBSCRIBED", "CHANNEL_ERROR", "TIMED_OUT"].includes(value)) { clearTimeout(timer); resolve(value); }
    });
  });
  return { status, channel };
}

test("invite survives sign-in and onboarding; two browsers complete three real private-channel rounds", async ({ browser }, testInfo) => {
  test.setTimeout(120000);
  const a = await fixture(browser);
  const b = await fixture(browser, false, true);
  try {
    await a.page.goto("/play");
    await a.page.getByRole("button", { name: "Create private room", exact: true }).click();
    await expect(a.page).toHaveURL(/\/match\/[a-f0-9-]+$/);
    const matchId = a.page.url().split("/").at(-1)!;
    const invite = a.page.getByRole("textbox", { name: "Invite a friend", exact: true });
    await expect(invite).toHaveValue(/\/invite\//);
    const inviteUrl = await invite.inputValue();
    // Hold a background heartbeat open: an explicit Ready click still has to execute.
    let releaseHeartbeat!: () => void;
    const heartbeatGate = new Promise<void>(resolve => { releaseHeartbeat = resolve; });
    await a.page.route("**/api/matches/*/heartbeat", async route => { await heartbeatGate; await route.continue(); });
    await a.page.waitForRequest(request => request.url().endsWith("/heartbeat"), { timeout: 7000 });
    try {
      await a.page.getByRole("button", { name: "Ready", exact: true }).click();
      await expect.poll(async () => (await state(a.context, matchId)).players.find((p: { id: string }) => p.id === a.id).ready).toBe(true);
    } finally { releaseHeartbeat(); await a.page.unrouteAll({ behavior: "wait" }); }
    await b.page.goto(inviteUrl);
    await expect(b.page).toHaveURL(origin + "/invite");
    expect((await state(a.context, matchId)).players).toHaveLength(1);
    const capability = (await b.context.cookies()).find(cookie => cookie.name === "dd_pending_invite");
    expect(capability?.httpOnly).toBe(true);
    expect(await b.page.evaluate(() => document.cookie)).not.toContain("dd_pending_invite");
    await b.page.getByRole("link", { name: "Sign in", exact: true }).click();
    await b.page.getByRole("link", { name: "Continue with Email", exact: true }).click();
    await b.login();
    await expect(b.page).toHaveURL(origin + "/invite");
    await b.page.getByRole("link", { name: "Complete profile", exact: true }).click();
    await b.page.getByLabel("Username", { exact: true }).fill(b.username);
    await b.page.getByLabel("Display name", { exact: true }).fill("Local Duel B");
    await b.page.getByRole("button", { name: "Save profile", exact: true }).click();
    await expect(b.page).toHaveURL(origin + "/invite");
    await b.page.getByRole("button", { name: "Join Match", exact: true }).click();
    await expect(b.page).toHaveURL(origin + `/match/${matchId}`);
    await expect(a.page.getByRole("heading", { name: `@${b.username}`, exact: true })).toBeVisible();
    await expect(a.page.getByRole("status").filter({ hasText: "Live connection" })).toBeVisible({ timeout: 15000 });
    await expect(b.page.getByRole("status").filter({ hasText: "Live connection" })).toBeVisible({ timeout: 15000 });
    await expect(a.page.getByRole("button", { name: "Not ready", exact: true })).toBeVisible();
    expect((await state(a.context, matchId)).players.find((p: { id: string }) => p.id === a.id).ready).toBe(true);
    expect((await state(a.context, matchId)).players.find((p: { id: string }) => p.id === b.id).ready).toBe(false);
    expect((await state(a.context, matchId)).status).toBe("waiting");
    await b.page.getByRole("button", { name: "Ready", exact: true }).click();
    const countdown = await state(a.context, matchId);
    expect(countdown.question).toBeNull();
    expect(countdown.solution).toBeNull();
    await expect(a.page.getByRole("button", { name: "Submit Answer", exact: true })).toBeVisible({ timeout: 15000 });
    await expect(b.page.getByRole("button", { name: "Submit Answer", exact: true })).toBeVisible({ timeout: 15000 });
    const sa = await state(a.context, matchId); const sb = await state(b.context, matchId);
    expect(sa.question).toEqual(sb.question); expect(sa.round).toEqual(sb.round);
    const correct = catalog.find(q => q.code === sa.question.code)!.correct_line;
    await a.page.getByLabel(`Line ${correct === 1 ? 2 : 1}`, { exact: true }).check();
    await a.page.getByRole("button", { name: "Submit Answer", exact: true }).click();
    await expect(a.page.getByText("Answer submitted. Waiting for your rival…", { exact: true })).toBeVisible();
    expect((await state(b.context, matchId)).self.selectedLine).toBeNull();
    expect((await state(b.context, matchId)).solution).toBeNull();
    await a.page.reload();
    await expect(a.page.getByText("Answer submitted. Waiting for your rival…", { exact: true })).toBeVisible();
    expect((await state(a.context, matchId)).round.endsAt).toBe(sa.round.endsAt);
    await b.page.getByLabel(`Line ${correct}`, { exact: true }).check();
    await b.page.getByRole("button", { name: "Submit Answer", exact: true }).click();
    await expect(b.page.getByRole("heading", { name: "You won this round.", exact: true })).toBeVisible();
    await expect(a.page.getByRole("heading", { name: "Your rival won this round.", exact: true })).toBeVisible();
    await expect(a.page.getByText("Why? See explanation", { exact: true })).toHaveCount(0);
    await expect(a.page.getByRole("heading", { name: "Previous rounds", exact: true })).toHaveCount(0);
    const resolvedOne = await state(a.context, matchId);
    expect(resolvedOne.status).toBe("between_rounds");
    expect(resolvedOne.rounds[1].question).toBeNull();
    expect(resolvedOne.rounds[2].question).toBeNull();
    expect(resolvedOne.nextStartsAt).not.toBeNull();
    for (const number of [2, 3]) {
      await expect.poll(async () => { const data = await state(a.context, matchId); return data.status === "playing" && data.round.number === number; }, { timeout: 25000 }).toBe(true);
      await expect(a.page.getByRole("button", { name: "Submit Answer", exact: true })).toBeVisible();
      await expect(b.page.getByRole("button", { name: "Submit Answer", exact: true })).toBeVisible();
      await expect(a.page.getByText("Why? See explanation", { exact: true })).toHaveCount(0);
      await expect(a.page.getByRole("heading", { name: "Previous rounds", exact: true })).toHaveCount(0);
      const next = await state(a.context, matchId); const same = await state(b.context, matchId);
      expect(next.round).toEqual(same.round); expect(next.question).toEqual(same.question);
      expect(next.self.selectedLine).toBeNull(); expect(same.self.selectedLine).toBeNull();
      expect(next.question.difficulty).toBe(number === 2 ? "medium" : "hard");
      const correctLine = catalog.find(q => q.code === next.question.code)!.correct_line;
      const wrong = correctLine === 1 ? 2 : 1;
      await a.page.getByLabel(`Line ${number === 2 ? wrong : correctLine}`, { exact: true }).check();
      await a.page.getByRole("button", { name: "Submit Answer", exact: true }).click();
      if (number === 2) {
        await b.page.getByLabel(`Line ${wrong}`, { exact: true }).check();
        await b.page.getByRole("button", { name: "Submit Answer", exact: true }).click();
        await expect(a.page.getByRole("heading", { name: "No winner this round.", exact: true })).toBeVisible();
      }
    }
    await expect(a.page.getByRole("heading", { name: "Match complete", exact: true })).toBeVisible();
    await expect(b.page.getByRole("heading", { name: "Match complete", exact: true })).toBeVisible();
    const finalA = await state(a.context, matchId); const finalB = await state(b.context, matchId);
    expect(finalA.players).toEqual(finalB.players); expect(finalA.status).toBe("finished");
    expect(finalA.rounds.every((r: { status: string }) => r.status === "resolved")).toBe(true);
    expect(new Set(finalA.rounds.map((r: { question: { code: string } }) => r.question.code)).size).toBe(3);
    const highest = Math.max(...finalA.players.map((p: { score: number }) => p.score));
    if (finalA.winnerId) expect(finalA.players.find((p: { id: string }) => p.id === finalA.winnerId).score).toBe(highest);
    else expect(finalA.players[0].score).toBe(finalA.players[1].score);
    await expect(a.page.getByRole("heading", { name: "Round results", exact: true })).toBeVisible();
    await expect(a.page.getByText("Why? See explanation", { exact: true })).toBeVisible();
    await expect(a.page.getByRole("heading", { name: "Previous rounds", exact: true })).toBeVisible();
    await b.page.setViewportSize({ width: 320, height: 812 });
    expect(await b.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await b.page.screenshot({ path: testInfo.outputPath("match-result-mobile.png"), fullPage: true });
    const client = publicClient(); await client.auth.signInWithPassword({ email: b.email, password: b.password });
    const profile = await client.from("profiles").select("xp,matches_played").eq("id", b.id).single();
    const expectedXp = 30 + (finalB.winnerId === b.id ? 30 : finalB.winnerId ? 0 : 15);
    expect(finalB.progress).toEqual({ xpEarned: expectedXp, totalXp: expectedXp, dailyLimit: false });
    expect(profile.data).toEqual({ xp: expectedXp, matches_played: 1 });
    await expect(b.page.getByText("XP earned", { exact: false })).toContainText("+" + expectedXp);

    const ownHistory = await b.context.request.get("/api/me/history?limit=1");
    expect(ownHistory.status()).toBe(200);
    expect((await ownHistory.json()).items[0]).toMatchObject({ match_id: matchId, xp_earned: expectedXp });
    const publicPage = await b.context.request.get("/api/leaderboard?limit=1");
    expect(publicPage.status()).toBe(200);
    const firstPage = await publicPage.json();
    expect(firstPage.items[0]).not.toHaveProperty("id");
    expect(firstPage.nextCursor).toBeTruthy();
    const nextPage = await b.context.request.get("/api/leaderboard?limit=1&cursor=" + encodeURIComponent(firstPage.nextCursor));
    expect(nextPage.status()).toBe(200);
    const nextPlayer = (await nextPage.json()).items[0];
    expect(nextPlayer.rank).toBe(2);
    expect(nextPlayer.username).not.toBe(firstPage.items[0].username);

    await b.page.getByRole("link", { name: "View match history" }).click();
    await expect(b.page.getByRole("row").filter({ hasText: a.username })).toBeVisible();
    await b.page.getByRole("link", { name: "View result" }).click();
    await expect(b.page).toHaveURL(origin + "/match/" + matchId + "/results");
    await b.page.getByRole("button", { name: "Play again" }).click();
    await expect(b.page).toHaveURL(/\/match\/[a-f0-9-]+$/);
    expect(b.page.url()).not.toContain(matchId);
    await expect(b.page.getByRole("textbox", { name: "Invite a friend" })).toBeVisible();
    await client.auth.signOut();
  } finally { await a.context.close(); await b.context.close(); }
});

test("parallel create/join/ready/answers, third-party HTTP/Realtime denial and safe retries", async ({ browser }) => {
  test.setTimeout(90000);
  const a = await fixture(browser); const b = await fixture(browser); const c = await fixture(browser);
  const clients: ReturnType<typeof publicClient>[] = [];
  try {
    const key = randomUUID();
    const created = await Promise.all(Array.from({ length: 20 }, () => post(a.context.request, "/api/matches", {}, key)));
    const rooms = await Promise.all(created.map(async r => { expect(r.status()).toBe(200); return r.json(); }));
    expect(new Set(rooms.map(r => r.matchId)).size).toBe(1);
    expect(new Set(rooms.map(r => r.inviteUrl)).size).toBe(1);
    const room = rooms[0];
    await b.page.goto(room.inviteUrl); await c.page.goto(room.inviteUrl);
    const joins = await Promise.all([post(b.context.request, "/api/invites/redeem"), post(c.context.request, "/api/invites/redeem")]);
    expect(joins.map(r => r.status()).sort()).toEqual([200, 409]);
    const rival = joins[0].status() === 200 ? b : c;
    const outsider = rival === b ? c : b;
    expect((await outsider.context.request.get(`/api/matches/${room.matchId}/state`)).status()).toBe(404);
    expect((await post(outsider.context.request, `/api/matches/${room.matchId}/ready`, { ready: true })).status()).toBe(404);
    await outsider.page.goto(`/match/${room.matchId}`);
    await expect(outsider.page.getByRole("heading", { name: "This line leads nowhere." })).toBeVisible();
    const outsiderClient = publicClient(); clients.push(outsiderClient);
    await outsiderClient.auth.signInWithPassword({ email: outsider.email, password: outsider.password });
    const denied = await subscribe(outsiderClient, room.matchId);
    expect(denied.status).not.toBe("SUBSCRIBED");
    await outsiderClient.removeChannel(denied.channel);
    const ownerClient = publicClient(); clients.push(ownerClient);
    await ownerClient.auth.signInWithPassword({ email: a.email, password: a.password });
    const authorized = await subscribe(ownerClient, room.matchId);
    expect(authorized.status).toBe("SUBSCRIBED");
    await authorized.channel.send({ type: "broadcast", event: "match_updated", payload: { stateVersion: 999999, winnerId: outsider.id } });
    expect((await state(a.context, room.matchId)).winnerId).toBeNull();
    const publicChannel = await subscribe(ownerClient, room.matchId, false);
    expect(publicChannel.status).not.toBe("SUBSCRIBED");
    await ownerClient.removeChannel(publicChannel.channel);
    const ready = await Promise.all([post(a.context.request, `/api/matches/${room.matchId}/ready`, { ready: true }), post(rival.context.request, `/api/matches/${room.matchId}/ready`, { ready: true })]);
    expect(ready.every(r => r.status() === 200)).toBe(true);
    const countdown = await state(a.context, room.matchId);
    await expect.poll(async () => {
      await post(a.context.request, `/api/matches/${room.matchId}/sync`);
      return (await state(a.context, room.matchId)).status;
    }, { timeout: 12000 }).toBe("playing");
    const active = await state(a.context, room.matchId);
    expect(active.round.id).toBe(countdown.round.id);
    const line = catalog.find(q => q.code === active.question.code)!.correct_line;
    const answerKeys = [randomUUID(), randomUUID()];
    const responses = await Promise.all([post(a.context.request, `/api/matches/${room.matchId}/answers`, { roundId: active.round.id, selectedLine: line }, answerKeys[0]), post(rival.context.request, `/api/matches/${room.matchId}/answers`, { roundId: active.round.id, selectedLine: line }, answerKeys[1])]);
    expect(responses.map(r => r.status()).sort()).toEqual([200, 409]);
    const winIndex = responses[0].status() === 200 ? 0 : 1;
    const winner = winIndex === 0 ? a : rival;
    const final = await state(winner.context, room.matchId);
    expect(final.solution.answers.filter((entry: { isCorrect: boolean }) => entry.isCorrect)).toHaveLength(1);
    expect(final.players.filter((p: { score: number }) => p.score > 0)).toHaveLength(1);
    const repeats = await Promise.all(Array.from({ length: 20 }, () => post(winner.context.request, `/api/matches/${room.matchId}/answers`, { roundId: active.round.id, selectedLine: line }, answerKeys[winIndex])));
    expect(repeats.every(r => r.status() === 200)).toBe(true);
    const after = await state(a.context, room.matchId); expect(after.players).toEqual(final.players);
    expect((await post(winner.context.request, `/api/matches/${room.matchId}/answers`, { roundId: active.round.id, selectedLine: line === 1 ? 2 : 1 }, answerKeys[winIndex])).status()).toBe(409);
  } finally { for (const client of clients) await client.removeAllChannels(); for (const value of [a, b, c]) await value.context.close(); }
});

test("three actual 45-second deadlines finish a zero-zero draw with WebSockets blocked", async ({ browser }) => {
  test.setTimeout(210000);
  const a = await fixture(browser); const b = await fixture(browser);
  try {
    await a.context.routeWebSocket(/realtime\/v1\/websocket/, ws => ws.close());
    await b.context.routeWebSocket(/realtime\/v1\/websocket/, ws => ws.close());
    const room = await createRoom(a); await joinRoom(b, room.inviteUrl);
    await a.page.goto(`/match/${room.matchId}`); await b.page.goto(`/match/${room.matchId}`);
    await a.page.getByRole("button", { name: "Ready", exact: true }).click();
    await b.page.getByRole("button", { name: "Ready", exact: true }).click();
    for (const number of [1, 2, 3]) {
      await expect.poll(async () => { const data = await state(a.context, room.matchId); return data.round.number === number && data.status === "playing"; }, { timeout: 25000 }).toBe(true);
      const started = await state(a.context, room.matchId);
      expect(Date.parse(started.round.endsAt)-Date.parse(started.round.startsAt)).toBe(45000);
      await expect.poll(async () => { const data = await state(a.context, room.matchId); return data.rounds[number-1].status; }, { timeout: 55000, intervals: [1000] }).toBe("resolved");
    }
    await expect(a.page.getByRole("heading", { name: "Draw", exact: true })).toBeVisible({ timeout: 5000 });
    await expect(b.page.getByRole("heading", { name: "Draw", exact: true })).toBeVisible();
    const final = await state(a.context, room.matchId);
    expect(final.status).toBe("finished"); expect(final.endedReason).toBe("completed");
    expect(final.rounds.every((r: { endReason: string; solution: { answers: unknown[] } }) => r.endReason === "timeout" && r.solution.answers.length === 0)).toBe(true);
    expect(final.players.every((p: { score: number }) => p.score === 0)).toBe(true);
  } finally { await a.context.close(); await b.context.close(); }
});

test("real Cron aborts after both browser contexts close without any sync or heartbeat", async ({ browser }) => {
  test.setTimeout(55000);
  const a = await fixture(browser); const b = await fixture(browser);
  const room = await createRoom(a); await joinRoom(b, room.inviteUrl);
  await post(a.context.request, `/api/matches/${room.matchId}/ready`, { ready: true });
  await post(b.context.request, `/api/matches/${room.matchId}/ready`, { ready: true });
  expect((await state(a.context, room.matchId)).status).toBe("countdown");
  await a.context.close(); await b.context.close();
  const observer = publicClient();
  expect((await observer.auth.signInWithPassword({ email: a.email, password: a.password })).error).toBeNull();
  // A participant direct SELECT cannot invoke the advance engine: only the installed Cron can finish it.
  await expect.poll(async () => {
    const response = await observer.from("matches").select("status,ended_reason").eq("id", room.matchId).single();
    expect(response.error).toBeNull(); return response.data;
  }, { timeout: 40000, intervals: [1000] }).toEqual({ status: "aborted", ended_reason: "both_disconnected" });
  const seats = await observer.from("match_players").select("is_active,result").eq("match_id", room.matchId);
  expect(seats.data).toHaveLength(2); expect(seats.data?.every(p => !p.is_active && p.result === "aborted")).toBe(true);
  await observer.auth.signOut();
});

test("short offline refresh preserves an answer; a later closed rival forfeits after 30 seconds", async ({ browser }) => {
  test.setTimeout(70000);
  const a = await fixture(browser); const b = await fixture(browser);
  try {
    const room = await createRoom(a); await joinRoom(b, room.inviteUrl);
    await a.page.goto(`/match/${room.matchId}`); await b.page.goto(`/match/${room.matchId}`);
    await a.page.getByRole("button", { name: "Ready", exact: true }).click(); await b.page.getByRole("button", { name: "Ready", exact: true }).click();
    await expect(b.page.getByRole("button", { name: "Submit Answer", exact: true })).toBeVisible({ timeout: 12000 });
    const active = await state(b.context, room.matchId); const correct = catalog.find(q => q.code === active.question.code)!.correct_line; const wrong = correct === 1 ? 2 : 1;
    await b.page.getByLabel(`Line ${wrong}`, { exact: true }).check(); await b.page.getByRole("button", { name: "Submit Answer", exact: true }).click();
    await expect(b.page.getByText("Answer submitted. Waiting for your rival…", { exact: true })).toBeVisible();
    await b.context.setOffline(true);
    await new Promise(resolve => setTimeout(resolve, 7000));
    await b.context.setOffline(false); await b.page.reload();
    await expect(b.page.getByText("Answer submitted. Waiting for your rival…", { exact: true })).toBeVisible();
    const recovered = await state(b.context, room.matchId);
    expect(recovered.round.endsAt).toBe(active.round.endsAt); expect(recovered.self.selectedLine).toBe(wrong); expect(recovered.status).toBe("playing");
    // Confirm a real fresh heartbeat before closing the rival permanently.
    await expect.poll(async () => Date.parse((await state(b.context, room.matchId)).players.find((p: { id: string }) => p.id === b.id).lastSeenAt), { timeout: 8000 }).toBeGreaterThan(Date.parse(active.serverNow));
    await b.context.close();
    await expect(a.page.getByRole("heading", { name: "You won!", exact: true })).toBeVisible({ timeout: 40000 });
    await expect(a.page.getByText(`No connection update was received from @${b.username} for at least 30 seconds while you remained connected. You win by forfeit, regardless of the score.`, { exact: true })).toBeVisible();
    const final = await state(a.context, room.matchId); expect(final.outcome).toBe("forfeit"); expect(final.endedReason).toBe("connection_lost"); expect(final.winnerId).toBe(a.id);
  } finally { await a.context.close(); await b.context.close(); }
});
