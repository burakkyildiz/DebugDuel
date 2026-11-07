import { afterEach, expect, it, vi } from 'vitest';
vi.mock('server-only',()=>({}));
import { observed } from '@/lib/security/telemetry';
import { failure } from '@/lib/security/http';
afterEach(()=>vi.restoreAllMocks());
it('logs only a bounded summary and correlates failure with its response ID',async()=>{
  const log=vi.spyOn(console,'info').mockImplementation(()=>{});
  const response=await observed('match.answer',async()=>failure('ROUND_CLOSED',409,'sensitive-invite-and-password'));
  const body=await response.json();
  const entry=JSON.parse(log.mock.calls[0][0]);
  expect(entry).toMatchObject({event:'api_request',operation:'match.answer',status:409,code:'ROUND_CLOSED',requestId:body.requestId});
  expect(response.headers.get('X-Request-ID')).toBe(body.requestId);
  expect(Object.keys(entry).sort()).toEqual(['code','durationMs','event','operation','requestId','status']);
  expect(JSON.stringify(entry)).not.toContain('sensitive');
});
it('does not log unexpected provider error content',async()=>{
  const log=vi.spyOn(console,'info').mockImplementation(()=>{});
  await observed('health',async()=>Response.json({error:{code:'private-token/secret',message:'private-message'}},{status:503}));
  expect(JSON.stringify(log.mock.calls)).not.toContain('private');
});
