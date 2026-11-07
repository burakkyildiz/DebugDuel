// Bounded localhost-only HTTP/DB/Realtime load probe. Never accepts a hosted URL.
import { randomUUID, createHash, createHmac } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { setTimeout as delay } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { request } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const origin = process.env.PLAYWRIGHT_BASE_URL;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
for (const target of [origin,url]) if (!target || !['localhost','127.0.0.1'].includes(new URL(target).hostname)) throw new Error('Load probe requires localhost.');
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url,process.env.SUPABASE_SECRET_KEY,options);
const users = []; const rooms = []; const channels = []; const latencies = {};
const quote = value => `'${value}'`;
function sql(query) {
  const result = spawnSync('docker',['exec','-i','supabase_db_debug-duel','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-Atq'],{input:query,encoding:'utf8',timeout:15000});
  if (result.status !== 0) throw new Error('Local load fixture query failed (details suppressed).');
  return result.stdout.trim();
}
async function allCompleted(promises) {
  const results=await Promise.allSettled(promises);
  const failed=results.find(result=>result.status==='rejected');
  if(failed) throw failed.reason;
  return results.map(result=>result.value);
}
async function measured(name, work) {
  const start = performance.now(); const result = await work();
  (latencies[name] ??= []).push(performance.now()-start); return result;
}
async function post(user,path,body={}) {
  return measured('command',async () => {
    const response = await user.http.post(path,{headers:{Origin:origin,'Idempotency-Key':randomUUID()},data:body});
    if (response.status() !== 200) throw new Error(`Load command failed: ${response.status()}`);
    return response.json();
  });
}
async function state(user,mid) {
  return measured('state',async () => {
    const response=await user.http.get(`/api/matches/${mid}/state`);
    if(response.status()!==200) throw new Error(`Load state failed: ${response.status()}`);
    return response.json();
  });
}
const catalog = JSON.parse(readFileSync('supabase/questions/catalog.json','utf8'));
let heartbeat;
let pulse=Promise.resolve();
try {
  // Bound provisioning concurrency; this is setup, outside the timed active-game interval.
  for(let batch=0;batch<10;batch++) await allCompleted(Array.from({length:4},async()=>{
    const suffix=randomUUID().replaceAll('-','').slice(0,12);
    const email=`dd-load-${suffix}@example.test`; const password=`Local-${randomUUID()}!`;
    const created=await admin.auth.admin.createUser({email,password,email_confirm:true});
    if(created.error) throw new Error('Local load account setup failed.');
    const user={id:created.data.user.id,http:await request.newContext({baseURL:origin}),client:null}; users.push(user);
    const login=await user.http.post('/api/auth/login',{headers:{Origin:origin},data:{email,password}});
    if(login.status()!==200) throw new Error('Local load login failed.');
    const profile=await user.http.patch('/api/me/profile',{headers:{Origin:origin},data:{username:`load_${suffix}`,displayName:'Local load fixture',avatarSeed:'violet'}});
    if(profile.status()!==200) throw new Error('Local load profile setup failed.');
    const cookies=(await user.http.storageState()).cookies;
    user.client=createServerClient(url,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{cookies:{getAll:()=>cookies,setAll:()=>{}},auth:{autoRefreshToken:false}});
  }));
  // Join is setup via the same authenticated RPC. The shared localhost IP bucket
  // intentionally permits only 10 HTTP joins/minute, so no production limit bypass is added.
  for(let i=0;i<20;i++) {
    const a=users[i*2],b=users[i*2+1]; const hash=createHash('sha256').update(randomUUID()).digest('hex');
    const created=await a.client.rpc('match_command',{p_action:'create',p_key:randomUUID(),p_hash:hash,p_cipher:Buffer.from('local-load-opaque-cipher').toString('base64')});
    if(created.error) throw new Error('Load room create failed.');
    const mid=created.data.matchId; rooms.push({mid,a,b});
    const joined=await b.client.rpc('match_command',{p_action:'join',p_key:randomUUID(),p_hash:hash});
    if(joined.error) throw new Error('Load room join failed.');
  }
  await allCompleted(rooms.flatMap(({mid,a,b})=>[a,b].map(async user=>{
    const channel=user.client.channel(`match:${mid}`,{config:{private:true}}); channels.push({user,channel});
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('Load Realtime subscription timed out.')),12000);
      channel.on('broadcast',{event:'match_updated'},()=>{}).subscribe(status=>{
        if(status==='SUBSCRIBED'){clearTimeout(timer);resolve();}
        if(['CHANNEL_ERROR','TIMED_OUT'].includes(status)){clearTimeout(timer);reject(new Error('Load Realtime subscription failed.'));}
      });
    });
  })));
  let heartbeatError;
  heartbeat=setInterval(()=>{pulse=pulse.then(()=>allCompleted(rooms.flatMap(({mid,a,b})=>[a,b].map(user=>post(user,`/api/matches/${mid}/heartbeat`))))).catch(error=>{heartbeatError=error;});},5000);
  const activeStart=performance.now();
  await allCompleted(rooms.flatMap(({mid,a,b})=>[a,b].map(user=>post(user,`/api/matches/${mid}/ready`,{ready:true}))));
  for(let round=1;round<=3;round++) {
    let states;
    const deadline=Date.now()+30000;
    while(Date.now()<deadline) {
      states=await allCompleted(rooms.map(({mid,a})=>state(a,mid)));
      if(states.every(s=>s.status==='playing'&&s.round.number===round)) break;
      if(heartbeatError) throw heartbeatError;
      await delay(1000);
    }
    if(!states?.every(s=>s.status==='playing'&&s.round.number===round)) throw new Error('20 rooms did not progress together.');
    await allCompleted(rooms.flatMap(({mid,a,b},i)=>{
      const s=states[i],question=catalog.find(q=>q.code===s.question.code);
      if(!question) throw new Error('Unknown fixture question.');
      const selectedLine=question.correct_line===1?2:1;
      return [a,b].map(user=>post(user,`/api/matches/${mid}/answers`,{roundId:s.round.id,selectedLine}));
    }));
  }
  clearInterval(heartbeat); heartbeat=undefined; await pulse;
  if(heartbeatError) throw heartbeatError;
  const final=await allCompleted(rooms.map(({mid,a})=>state(a,mid)));
  if(!final.every(s=>s.status==='finished'&&s.progress?.xpEarned===35)) throw new Error('Load settlement result mismatch.');
  const ids=rooms.map(r=>quote(r.mid)).join(',');
  const totals=sql(`select (select count(*) from private.match_settlements where match_id in(${ids}))||':'||(select count(*) from private.xp_ledger where match_id in(${ids}))||':'||(select sum(xp) from public.profiles where id in(${users.map(u=>quote(u.id)).join(',')}));`);
  if(totals!=='20:40:1400') throw new Error('Load ledger is inconsistent.');
  const activeSeconds=Math.round((performance.now()-activeStart)/1000);
  // Eighty concurrent HTTP requests must share the same durable 60/minute quota.
  // Avoid straddling the fixed-window boundary during this bounded local probe.
  if(new Date().getSeconds()>54) await delay(61000-Date.now()%60000);
  const reads=await allCompleted(Array.from({length:80},()=>measured('leaderboard',()=>users[0].http.get('/api/leaderboard'))));
  const accepted=reads.filter(r=>r.status()===200).length;
  const denied=reads.filter(r=>r.status()===429&&r.headers()['retry-after']==='60').length;
  if(accepted!==60||denied!==20) throw new Error(`Concurrent HTTP quota mismatch: ${accepted} accepted / ${denied} limited.`);
  const stats=Object.fromEntries(Object.entries(latencies).map(([name,values])=>{
    values.sort((a,b)=>a-b);return [name,{count:values.length,p50Ms:Math.round(values[Math.floor(values.length*.5)]),p95Ms:Math.round(values[Math.floor(values.length*.95)]),maxMs:Math.round(values.at(-1))}];
  }));
  const report={environment:'local production build / local Supabase',rooms:20,players:40,privateChannels:channels.length,activeSeconds,settlements:20,ledgerRows:40,leaderboard:{accepted,denied},stats};
  writeFileSync(join(tmpdir(),'debug-duel-phase8-load.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
} finally {
  if(heartbeat) clearInterval(heartbeat);
  await pulse.catch(()=>{});
  await Promise.allSettled(channels.map(({user,channel})=>user.client.removeChannel(channel)));
  await Promise.allSettled(users.map(user=>user.http.dispose()));
  if(users.length) {
    const ids=users.map(u=>quote(u.id)).join(',');
    sql(`begin;select 1 from public.matches where host_user_id in(${ids}) order by id for update;
      delete from private.xp_ledger where user_id in(${ids});delete from private.match_settlements where match_id in(select id from public.matches where host_user_id in(${ids}));
      delete from private.answers where user_id in(${ids});delete from private.round_questions where round_id in(select r.id from public.match_rounds r join public.matches m on m.id=r.match_id where m.host_user_id in(${ids}));
      delete from private.match_invites where match_id in(select id from public.matches where host_user_id in(${ids}));delete from public.match_rounds where match_id in(select id from public.matches where host_user_id in(${ids}));
      delete from public.match_players where user_id in(${ids});delete from public.matches where host_user_id in(${ids});delete from private.command_receipts where user_id in(${ids});
      delete from private.rate_limits where subject_hash in(${users.map(u=>quote(createHash('sha256').update('match:'+u.id).digest('hex'))).join(',')});
      delete from private.rate_limits where subject_hash=${quote(createHmac('sha256',process.env.RATE_LIMIT_HASH_SECRET).update('public-read:unverified-network').digest('hex'))};
      delete from private.profile_write_limits where user_id in(${ids});delete from public.profiles where id in(${ids});delete from auth.users where id in(${ids});commit;`);
  }
  console.log('Local load fixtures removed.');
}
