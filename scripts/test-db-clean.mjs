// Disposable local PostgreSQL only. Never resets the developer or hosted DB.
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, cpSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const root = resolve(import.meta.dirname, "..");
const cli = join(root, "node_modules/.bin/supabase");
const workdir = mkdtempSync(join(tmpdir(), "debug-duel-clean-"));
const projectId = `debug-duel-clean-${randomUUID().slice(0, 8)}`;
let cleanupFailed = false;
function run(args, showOutput = false) {
  const result = spawnSync(cli, [...args, "--workdir", workdir], {
    cwd: root, encoding: "utf8", timeout: 180_000, maxBuffer: 8 * 1024 * 1024,
  });
  // Startup output can contain generated local API keys; never relay it.
  if (showOutput) {
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
  }
  return result;
}
try {
  mkdirSync(join(workdir, "supabase"));
  const config = readFileSync(join(root, "supabase/config.toml"), "utf8")
    .replace(/^project_id = "[^"]+"$/m, `project_id = "${projectId}"`)
    .replace(/543(\d\d)/g, "553$1");
  if (!config.includes(`project_id = "${projectId}"`)) throw new Error("Could not isolate the test project ID.");
  writeFileSync(join(workdir, "supabase/config.toml"), config);
  for (const path of ["migrations", "tests", "templates", "seed.sql"]) {
    cpSync(join(root, "supabase", path), join(workdir, "supabase", path), { recursive: true });
  }
  console.log(`Starting disposable local DB ${projectId} on port 55322.`);
  const start = run(["start", "--exclude", "gotrue,realtime,storage-api,imgproxy,kong,mailpit,postgrest,postgres-meta,studio,edge-runtime,logflare,vector,supavisor"]);
  if (start.error || start.status !== 0) {
    // Do not dump initialization logs: they may include generated credentials.
    throw new Error(`Clean DB initialization failed (exit ${start.status}); check Docker availability and port 55322.`);
  }
  console.log("Fresh migrations and seed applied. Running pgTAP.");
  const test = run(["test", "db", "--local"], true);
  if (test.error || test.status !== 0) throw new Error("Clean DB pgTAP failed.");
  console.log("Reapplying seed to verify idempotency.");
  const seed = run(["db", "query", "--local", "--file", join(workdir, "supabase/seed.sql")], true);
  if (seed.error || seed.status !== 0) throw new Error("Seed replay failed.");
  const replay = run(["test", "db", "--local"], true);
  if (replay.error || replay.status !== 0) throw new Error("Seed replay changed DB invariants.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  // Only resources belonging to this random, newly created local ID are removed.
  const stop = run(["stop", "--project-id", projectId, "--no-backup"]);
  cleanupFailed = Boolean(stop.error || stop.status !== 0);
  if (cleanupFailed) {
    console.error(`Disposable DB cleanup failed; stop only ${projectId} manually. Workspace: ${workdir}`);
    process.exitCode = 1;
  } else {
    rmSync(workdir, { recursive: true, force: true });
    console.log("Disposable DB removed; developer DB preserved.");
  }
}
