import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { readFileSync, writeFileSync } from "node:fs";

// Local-only test/preview launcher. Secrets are captured, never printed or saved.
const status = spawnSync("node_modules/.bin/supabase", ["status", "--output", "json"], { encoding: "utf8" });
if (status.status !== 0) throw new Error("Start local Supabase before running Match.");
const config = JSON.parse(status.stdout);
const url = config.API_URL;
const key = config.PUBLISHABLE_KEY ?? config.ANON_KEY;
const secret = config.SECRET_KEY ?? config.SERVICE_ROLE_KEY;
if (!url || !key || !secret || !["127.0.0.1", "localhost"].includes(new URL(url).hostname)) throw new Error("Match launcher requires a local Supabase URL and server key.");
const loading = process.argv.includes("--load");
const testing = process.argv.includes("--test") || loading;
const port = testing ? "3005" : "3006";
const configure = spawnSync("docker", ["exec", "supabase_db_debug-duel", "psql", "-U", "supabase_admin", "-d", "postgres", "-c", "update _realtime.tenants set private_only=true where external_id='realtime-dev';"], { encoding: "utf8", timeout: 10000 });
if (configure.status !== 0) throw new Error("Cannot enforce private-only on the local Realtime tenant.");
const origin = `http://localhost:${port}`;
try {
  const response = await fetch(origin, { signal: AbortSignal.timeout(1000) });
  if (response) throw new Error("Selected Match port is already in use; stop that server first.");
} catch (error) { if (error.message?.includes("already in use")) throw error; }
const env = {
  ...process.env, NEXT_PUBLIC_SITE_URL: origin, NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key, SUPABASE_SECRET_KEY: secret,
  GUEST_SESSION_SECRET: randomBytes(32).toString("hex"), RATE_LIMIT_HASH_SECRET: randomBytes(32).toString("hex"), COMMAND_RECEIPT_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
  PLAYWRIGHT_BASE_URL: origin, LOCAL_MATCH_E2E: "1", NEXT_DIST_DIR: testing ? ".next-match-test" : ".next-match-local",
};
const generatedFiles = ["next-env.d.ts", "tsconfig.json"];
const before = new Map(generatedFiles.map(path => [path, readFileSync(path, "utf8")]));
const afterStartup = new Map();
if (testing) {
  console.log("Building isolated local production server for Match tests.");
  const build = spawnSync("node_modules/.bin/next", ["build", "--webpack"], { env, encoding: "utf8", timeout: 180000 });
  if (build.status !== 0) {
    for (const path of generatedFiles) writeFileSync(path, before.get(path));
    throw new Error("Isolated Match production build failed.");
  }
}
const server = spawn("node_modules/.bin/next", testing ? ["start", "--port", port, "--hostname", "127.0.0.1"] : ["dev", "--webpack", "--port", port, "--hostname", "127.0.0.1"], { env, stdio: ["ignore", "pipe", "pipe"] });
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
  for (let attempt = 0; attempt < 90 && !interrupted; attempt++) {
    if (server.exitCode !== null) throw new Error("Match server stopped before startup. " + startupLog);
    try { ready = (await fetch(origin + "/login", { signal: AbortSignal.timeout(1000) })).ok; } catch { /* startup */ }
    if (ready) {
      try { ready = (await fetch(origin + "/api/health", { signal: AbortSignal.timeout(1000) })).ok; } catch { ready = false; }
    }
    if (ready) break;
    await delay(500);
  }
  if (!ready) throw new Error("Match server or its one-second Cron did not become ready. Check local Supabase and engine health.");
  for (const path of generatedFiles) afterStartup.set(path, readFileSync(path, "utf8"));
  if (testing) {
    const tests = loading
      ? spawn(process.execPath, ["scripts/test-load-local.mjs"], { env, stdio: ["ignore", "pipe", "pipe"] })
      : spawn("node_modules/.bin/playwright", ["test", "tests/e2e/foundation.spec.ts", "tests/e2e/match.local.spec.ts", "--project=desktop", "--workers=1", ...process.argv.slice(2).filter(arg => arg !== "--test")], { env, stdio: ["ignore", "pipe", "pipe"] });
    // Playwright failure logs can include cookie headers; redact before relaying.
    const relay = stream => {
      let pending = "";
      stream.on("data", chunk => {
        pending += chunk.toString();
        const lines = pending.split("\n"); pending = lines.pop() ?? "";
        for (const line of lines) process.stdout.write(safeLog(line) + "\n");
      });
      stream.on("end", () => { if (pending) process.stdout.write(safeLog(pending)); });
    };
    function safeLog(value) {
      return value.replace(/^(\s*-\s*)(cookie|authorization|set-cookie):.*$/i, "$1$2: [redacted]")
        .replace(/\/invite\/[A-Za-z0-9_-]{43}/g, "/invite/[redacted]")
        .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted-jwt]")
        .replaceAll(secret, "[redacted-server-key]");
    }
    relay(tests.stdout); relay(tests.stderr);
    process.exitCode = await new Promise((resolve, reject) => { tests.once("exit", code => resolve(code ?? 1)); tests.once("error", reject); });
  } else {
    console.log(`Local Match preview ready: ${origin}/play`);
    console.log("Uses local test data; .env.local and the hosted project are unchanged. Stop with Ctrl+C.");
    await new Promise(resolve => server.once("exit", resolve));
  }
} finally {
  stop();
  for (const path of generatedFiles) {
    if (afterStartup.has(path) && readFileSync(path, "utf8") === afterStartup.get(path)) writeFileSync(path, before.get(path));
  }
}
