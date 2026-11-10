import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { readFileSync, writeFileSync } from "node:fs";

// Local test infrastructure only; no production request can enable this runner.
const status = spawnSync("node_modules/.bin/supabase", ["status", "--output", "json"], { encoding: "utf8" });
if (status.status !== 0) throw new Error("Start local Supabase before running Auth tests.");
const config = JSON.parse(status.stdout);
const url = config.API_URL;
const key = config.PUBLISHABLE_KEY ?? config.ANON_KEY;
if (!url || !key || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)) throw new Error("Auth tests require a local Supabase URL.");

const origin = "http://localhost:3001";
const captchaReal = process.argv.includes("--captcha-real");
const captchaTest = process.argv.includes("--captcha") || captchaReal;
try {
  const response = await fetch(origin, { signal: AbortSignal.timeout(1000) });
  if (response) throw new Error("Port 3001 is already in use; stop that server first.");
} catch (error) { if (error.message?.includes("already in use")) throw error; }
const env = {
  ...process.env,
  NEXT_PUBLIC_SITE_URL: origin,
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
  GUEST_SESSION_SECRET: randomBytes(32).toString("hex"),
  PLAYWRIGHT_BASE_URL: origin,
  LOCAL_AUTH_E2E: "1",
  LOCAL_CAPTCHA_E2E: captchaTest ? "1" : "0",
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: captchaReal ? "1x00000000000000000000AA" : captchaTest ? "test-public-key" : "",
  NEXT_DIST_DIR: ".next-auth-local",
};
const generatedFiles = ["next-env.d.ts", "tsconfig.json"];
const before = new Map(generatedFiles.map(path => [path, readFileSync(path, "utf8")]));
const afterStartup = new Map();
const server = spawn("node_modules/.bin/next", ["dev", "--webpack", "--port", "3001", "--hostname", "127.0.0.1"], { env, stdio: ["ignore", "pipe", "pipe"] });
let startupLog = "";
function capture(chunk) { startupLog = (startupLog + chunk.toString()).slice(-4000); }
server.stdout.on("data", capture);
server.stderr.on("data", capture);
let interrupted = false;
function stop() { interrupted = true; server.kill("SIGTERM"); }
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
try {
  let ready = false;
  for (let attempt = 0; attempt < 60 && !interrupted; attempt++) {
    if (server.exitCode !== null) throw new Error("Auth test server stopped before becoming ready. " + startupLog);
    try { ready = (await fetch(origin + "/login", { signal: AbortSignal.timeout(1000) })).ok; } catch { /* startup */ }
    if (ready) break;
    await delay(500);
  }
  if (!ready) throw new Error("Auth test server did not become ready.");
  for (const path of generatedFiles) afterStartup.set(path, readFileSync(path, "utf8"));
  const tests = spawn("node_modules/.bin/playwright", ["test", captchaReal ? "tests/e2e/captcha-real.local.spec.ts" : captchaTest ? "tests/e2e/captcha.local.spec.ts" : "tests/e2e/auth.local.spec.ts", "--project=desktop", "--workers=1"], { env, stdio: "inherit" });
  process.exitCode = await new Promise((resolve, reject) => { tests.once("exit", code => resolve(code ?? 1)); tests.once("error", reject); });
} finally {
  stop();
  // Next.js adds paths for the isolated output directory. Restore only files
  // unchanged since startup, preserving any concurrent user edits.
  for (const path of generatedFiles) {
    if (afterStartup.has(path) && readFileSync(path, "utf8") === afterStartup.get(path)) writeFileSync(path, before.get(path));
  }
}
