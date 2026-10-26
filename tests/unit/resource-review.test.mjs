import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyState,prepare,record,summary,reportMarkdown,publicUrl,localDay,validateResult} from '../../scripts/resource-review.mjs';

const resources=Array.from({length:878},(_,i)=>({id:'test-'+String(i).padStart(4,'0'),name:'Example community group '+i,directoryId:'brent',category:'Social connection and activities',sourceUrl:'https://example.org/groups/'+i,url:'https://example.org/groups/'+i,description:'A community group.',who:'Adults',access:'Contact the group.',check:'Check session costs.',phone:'',lastChecked:'2026-10-01',nextReview:'2027-01-01'}));
const ok=entry=>({id:entry.id,status:'no_change_found',summary:'The provider page still describes this group and its contact route.',checkedFields:['name','description','access'],sources:[{url:entry.resource.sourceUrl,ownerType:'provider',retrieval:'page',note:'Provider programme page read.'}],findings:[]});
const unavailable=entry=>({...ok(entry),status:'unable_to_verify',summary:'The source could not be read.',checkedFields:[],sources:[{url:entry.resource.sourceUrl,ownerType:'provider',retrieval:'failed',note:'Request returned 503.'}],failureReason:'Source temporarily unavailable.'});
const dayAfter=days=>new Date(Date.UTC(2026,9,26+days)).toISOString().slice(0,10);

test('review batches cover 878 listings in 28 days with at most 32 regular checks per day',()=>{
 let state=emptyState();const seen=new Set();
 for(let d=0;d<28;d++)for(let batch=0;batch<4;batch++){
  const plan=prepare(resources,state,dayAfter(d));assert.ok(plan.entries.length<=8);
  if(!plan.entries.length)continue;
  for(const e of plan.entries){assert.ok(!seen.has(e.id),'Repeated before completing the first cycle');seen.add(e.id);}
  state=record(resources,state,plan,plan.entries.map(ok)).state;
 }
 assert.equal(seen.size,878);assert.equal(summary(resources,state,dayAfter(27)).attemptedInLast28Days,878);
 assert.equal(prepare(resources,state,dayAfter(28)).entries.length,8);
});
test('partial runs resume and the persisted daily cap prevents duplicate or excess work',()=>{
 let state=emptyState(),plan=prepare(resources,state,'2026-10-26');
 state=record(resources,state,plan,plan.entries.slice(0,3).map(ok)).state;
 assert.throws(()=>record(resources,state,plan,[ok(plan.entries[3])]),/state changed/);
 for(let i=0;i<4;i++){plan=prepare(resources,state,'2026-10-26');state=record(resources,state,plan,plan.entries.map(ok)).state;}
 assert.equal(state.days['2026-10-26'].regular.length,32);assert.equal(prepare(resources,state,'2026-10-26').entries.length,0);
 assert.equal(prepare(resources,state,'2026-10-28').entries[0].id,'test-0032');
});
test('failed sources retry separately and never become verified because a URL responds',()=>{
 let state=emptyState(),plan=prepare(resources,state,'2026-10-26');
 const entry=plan.entries[0];state=record(resources,state,plan,[unavailable(entry)]).state;
 assert.equal(state.entries[entry.id].lastSourceRead,null);assert.equal(state.entries[entry.id].nextRetry,'2026-10-27');
 plan=prepare(resources,state,'2026-10-27');const retry=plan.entries.find(e=>e.id===entry.id);assert.equal(retry.kind,'retry');
 state=record(resources,state,plan,[unavailable(retry)]).state;assert.equal(state.entries[entry.id].nextRetry,'2026-10-30');
 plan=prepare(resources,state,'2026-10-30');state=record(resources,state,plan,[ok(plan.entries.find(e=>e.id===entry.id))]).state;
 assert.equal(state.entries[entry.id].nextRetry,null);assert.equal(summary(resources,state,'2026-10-30').unableToVerify.length,0);
 const linkOnly={...ok(entry),sources:[{url:entry.resource.sourceUrl,ownerType:'provider',retrieval:'link_only',note:'HTTP 200 only.'}]};
 assert.throws(()=>validateResult(linkOnly,entry),/working link alone/);
});
test('corrections need source evidence, matching current values and an unchanged resource',()=>{
 const state=emptyState(),plan=prepare(resources,state,'2026-10-26'),entry=plan.entries[0];
 const change={...ok(entry),status:'changes_found',summary:'The provider now publishes a joining cost.',findings:[{field:'check',currentValue:entry.resource.check,proposedValue:'Sessions cost £5; ask about concessions.',reason:'Published price differs from the listing.',sourceUrl:entry.resource.sourceUrl,evidence:'The provider lists a £5 session price.',priority:'normal'}]};
 const before=JSON.stringify(resources);const result=record(resources,state,plan,[change]);assert.equal(JSON.stringify(resources),before);assert.equal(result.state.queue[0].status,'open');
 assert.ok(reportMarkdown(resources,result.state,'2026-10-26').includes('Suggested: Sessions cost £5'));
 assert.throws(()=>record(resources,state,plan,[{...change,findings:[{...change.findings[0],currentValue:'Incorrect current text'}]}]),/Unsupported or stale/);
 assert.throws(()=>record(resources,state,plan,[{...change,findings:[{...change.findings[0],sourceUrl:'https://other.example/no-evidence'}]}]),/Unsupported or stale/);
 const altered=structuredClone(resources);altered[0].access='A new route.';assert.throws(()=>record(altered,state,plan,[change]),/Stale/);
 const tampered=structuredClone(plan);tampered.entries[0].resource.name='Changed in plan only';assert.throws(()=>record(resources,state,tampered,[change]),/Stale/);
 const approved=structuredClone(resources);approved[0].check=change.findings[0].proposedValue;assert.equal(summary(approved,result.state,'2026-10-27').openChanges.length,0);assert.equal(summary(approved,result.state,'2026-10-27').recentResolved[0].status,'applied');
});
test('duplicate and invented result IDs are rejected; evidence cannot silently change public review dates',()=>{
 const state=emptyState(),plan=prepare(resources,state,'2026-10-26'),r=ok(plan.entries[0]);
 assert.throws(()=>record(resources,state,plan,[r,r]),/Duplicate/);assert.throws(()=>record(resources,state,plan,[{...r,id:'not-selected'}]),/unplanned/);
 const changed=record(resources,state,plan,[r]).state;assert.equal(resources[0].lastChecked,'2026-10-01');assert.equal(resources[0].nextReview,'2027-01-01');assert.equal(changed.entries[r.id].lastSourceRead,'2026-10-26');
});
test('review dates use London time and saved evidence only permits public web URLs',()=>{
 assert.equal(localDay(new Date('2026-07-01T23:30:00Z')),'2026-07-02');
 for(const url of ['http://localhost/check','http://127.0.0.1/','http://192.168.0.1/','https://user:pass@example.org/','javascript:alert(1)','file:///tmp/test','https://[::1]/'])assert.equal(publicUrl(url),false,url);
 assert.equal(publicUrl('https://www.nhs.uk/nhs-services/'),true);assert.throws(()=>prepare(resources,emptyState(),'2026-02-30'),/valid/);
});
