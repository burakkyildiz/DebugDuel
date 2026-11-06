// Real concurrent PostgreSQL sessions; local fixtures only, no production test clock.
import { randomUUID, createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { performance } from "node:perf_hooks";
import { setTimeout as delay } from "node:timers/promises";
const status = spawnSync("node_modules/.bin/supabase", ["status", "--output", "json"], { encoding: "utf8", timeout: 10000 });
if (status.status !== 0) throw new Error("Start local Supabase first.");
const local = JSON.parse(status.stdout);
if (!["127.0.0.1", "localhost"].includes(new URL(local.API_URL).hostname)) throw new Error("Concurrency fixtures are local only.");
const actors = Array.from({ length: 4 }, () => randomUUID());
const hashes = Array.from({ length: 2 }, () => createHash("sha256").update(randomUUID()).digest("hex"));
const containers = ["docker", "exec", "-i", "supabase_db_debug-duel", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atq"];
function query(sql) {
  const result = spawnSync(containers[0], containers.slice(1), { input: sql, encoding: "utf8", timeout: 12000 });
  if (result.status !== 0) throw new Error("Local fixture query failed (SQL details suppressed).");
  return result.stdout.trim();
}
function command(actor, action, match = "null", round = "null", line = "null", ready = "null", hash = "null") {
  return `set local role authenticated; select set_config('request.jwt.claims','${JSON.stringify({ sub: actor, role: "authenticated" })}',true); select public.match_command('${action}',${match},'${randomUUID()}',${ready},${round},${line},${hash},${action === "create" ? "encode(convert_to('opaque-local-cipher','UTF8'),'base64')" : "null"}); reset role;`;
}
const quote = value => `'${value}'`;
function lock(sql) {
  const child = spawn(containers[0], containers.slice(1), { stdio: ["pipe", "pipe", "pipe"] });
  let output = "";
  const completion = new Promise((resolve, reject) => { child.once("exit", code => code === 0 ? resolve() : reject(new Error("Local lock session failed."))); child.once("error", reject); });
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error("Lock did not become ready.")); }, 10000);
    child.stdout.on("data", chunk => { output += chunk.toString(); if (output.includes("LOCK_READY")) { clearTimeout(timer); resolve(); } });
    child.once("exit", () => { clearTimeout(timer); if (!output.includes("LOCK_READY")) reject(new Error("Lock exited before ready.")); });
  });
  child.stderr.resume();
  child.stdin.end(sql);
  return { ready, completion, child };
}
let rooms = [];
let holder;
try {
  query(`begin; ${actors.map(id => `insert into auth.users(id,email,email_confirmed_at) values('${id}','dd-lock-${id}@example.test',clock_timestamp()); insert into public.profiles(id,username,display_name,onboarding_completed_at) values('${id}','lock_${id.replaceAll("-", "").slice(0, 12)}','Local concurrency',clock_timestamp());`).join("\n")} commit;`);
  for (let i = 0; i < 2; i++) {
    const host = actors[i * 2]; const guest = actors[i * 2 + 1];
    query(`begin;${command(host, "create", "null", "null", "null", "null", quote(hashes[i]))}commit;`);
    const mid = query(`select id from public.matches where host_user_id='${host}' and status='waiting';`);
    if (!/^[a-f0-9-]{36}$/.test(mid)) throw new Error("Local room creation failed.");
    rooms.push(mid);
    query(`begin;${command(guest, "join", "null", "null", "null", "null", quote(hashes[i]))}${command(host, "ready", quote(mid), "null", "null", "true")}${command(guest, "ready", quote(mid), "null", "null", "true")}commit;`);
  }
  // Session advisory lock blocks only ticks while committing deterministic due fixtures.
  // It is released AFTER taking the first row lock, so the due room cannot race setup.
  holder = lock(`select pg_advisory_lock(hashtextextended('debug-duel:engine-tick',0));
    begin;
    with t as(select clock_timestamp()-interval '46 seconds' v) update public.match_rounds set starts_at=t.v,ends_at=t.v+interval '45 seconds' from t where match_id in (${rooms.map(quote)}) and round_number=1;
    update public.matches set next_transition_at=clock_timestamp()-interval '1 second' where id in (${rooms.map(quote)});commit;
    begin;select 1 from public.matches where id='${rooms[0]}' for update;
    select pg_advisory_unlock(hashtextextended('debug-duel:engine-tick',0));select 'LOCK_READY';select pg_sleep(2.5);commit;`);
  await holder.ready;
  const started = performance.now();
  query("select private.advance_due_matches();");
  if (performance.now() - started > 1800) throw new Error("Tick waited on a locked room instead of SKIP LOCKED.");
  const otherStatus = query(`select status from public.matches where id='${rooms[1]}';`);
  if (otherStatus !== "between_rounds") throw new Error("Unlocked due room did not advance.");
  await holder.completion; holder = undefined;
  let advanced = false;
  for (let i = 0; i < 8; i++) { if (query(`select status from public.matches where id='${rooms[0]}';`) === "between_rounds") { advanced = true; break; } await delay(300); }
  if (!advanced) throw new Error("Real Cron did not revisit the unlocked room.");
  console.log("PASS: concurrent tick skips a locked room, progresses another, and real Cron revisits it.");
  // The final round's deadline passes WHILE the answer transaction is waiting on the match lock.
  const mid = rooms[1]; const actor = actors[2];
  const rid = query(`select id from public.match_rounds where match_id='${mid}' and round_number=3;`);
  query(`begin;with t as(select clock_timestamp()-interval '44 seconds' v) update public.match_rounds set status='active',starts_at=t.v,ends_at=t.v+interval '45 seconds' from t where id='${rid}';update public.matches set status='playing',current_round_number=3,next_transition_at=(select ends_at from public.match_rounds where id='${rid}') where id='${mid}';commit;`);
  holder = lock(`begin;select 1 from public.matches where id='${mid}' for update;select 'LOCK_READY';select pg_sleep(2.5);commit;`);
  await holder.ready;
  const answer = query(`begin;${command(actor, "answer", quote(mid), quote(rid), "1")}commit;`);
  await holder.completion; holder = undefined;
  if (!answer.includes('"commandError": "ROUND_CLOSED"')) throw new Error("Late answer was not rejected using the post-lock clock.");
  if (query(`select count(*) from private.answers where round_id='${rid}';`) !== "0") throw new Error("Late answer consumed a right.");
  if (query(`select end_reason from public.match_rounds where id='${rid}';`) !== "timeout") throw new Error("Late answer rolled back its deadline transition.");
  const retried = query("begin;" + command(actor, "answer", quote(mid), quote(rid), "1") + "commit;");
  if (!retried.includes('"commandError": "ROUND_CLOSED"')) throw new Error("Final round accepted a retry.");
  const settlement = query("select count(*) || ':' || (select count(*) from private.xp_ledger where match_id=" + quote(mid) + ") from private.match_settlements where match_id=" + quote(mid) + ";");
  if (settlement !== "1:2") throw new Error("Final timeout did not settle exactly once for both participants.");
  console.log("PASS: post-lock DB clock rejects a late answer, settles the final timeout once, and preserves the result on retry.");
} finally {
  if (holder) { holder.child.kill(); await holder.completion.catch(() => {}); }
  const ids = actors.map(quote).join(",");
  // Fixture matches have no winner. A final timeout can leave settlement evidence.
  query(`begin;
    select 1 from public.matches where host_user_id in(${ids}) order by id for update;
    delete from private.xp_ledger where user_id in(${ids});
    delete from private.match_settlements where match_id in(select id from public.matches where host_user_id in(${ids}));
    delete from private.answers where user_id in(${ids});
    delete from private.round_questions where round_id in(select r.id from public.match_rounds r join public.matches m on m.id=r.match_id where m.host_user_id in(${ids}));
    delete from private.match_invites where match_id in(select id from public.matches where host_user_id in(${ids}));
    delete from public.match_rounds where match_id in(select id from public.matches where host_user_id in(${ids}));
    delete from public.match_players where user_id in(${ids});
    delete from public.matches where host_user_id in(${ids});
    delete from private.command_receipts where user_id in(${ids});
    delete from private.rate_limits where subject_hash in(${actors.map(id => quote(createHash("sha256").update("match:" + id).digest("hex"))).join(",")});
    delete from public.profiles where id in(${ids});delete from auth.users where id in(${ids});commit;`);
  console.log("Local concurrency fixtures removed.");
}
