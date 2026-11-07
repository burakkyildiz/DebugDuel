import { beforeEach, expect, it, vi } from 'vitest';
vi.mock('server-only',()=>({}));
const state=vi.hoisted(()=>({admit:vi.fn(),read:vi.fn(),rpc:vi.fn()}));
vi.mock('@/lib/security/public-read',()=>({admitPublicRead:state.admit,PublicReadLimited:class extends Error{}}));
vi.mock('@/lib/progression/server',()=>({InvalidCursor:class extends Error{},parsePageLimit:()=>({success:true,data:25}),readLeaderboard:state.read}));
vi.mock('@/lib/supabase/server',()=>({createClient:async()=>({rpc:state.rpc})}));
import { PublicReadLimited } from '@/lib/security/public-read';
import { GET as health } from '@/app/api/health/route';
import { GET as leaderboard } from '@/app/api/leaderboard/route';
beforeEach(()=>{vi.spyOn(console,'info').mockImplementation(()=>{});state.admit.mockReset();state.read.mockReset();state.rpc.mockReset();});
it('returns retry guidance before reading protected resources on a limited network',async()=>{
  state.admit.mockRejectedValue(new PublicReadLimited()); state.read.mockRejectedValue(new PublicReadLimited());
  for(const route of [health,leaderboard]) {
    const response=await route(new Request('http://localhost/api/resource'));
    expect(response.status).toBe(429);expect(response.headers.get('Retry-After')).toBe('60');
    expect((await response.json()).error.code).toBe('RATE_LIMITED');
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  }
  expect(state.rpc).not.toHaveBeenCalled();
});
it('does not claim healthy when admission storage is unavailable',async()=>{
  state.admit.mockRejectedValue(new Error('private database detail'));
  const response=await health(new Request('http://localhost/api/health'));
  expect(response.status).toBe(503);expect(await response.json()).toEqual({ready:false,lastSuccessfulTickAt:null});
  expect(state.rpc).not.toHaveBeenCalled();
});
