import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import worker from '../../navigator/worker.mjs';
import {searchDirectory} from '../../navigator/retrieve.mjs';
import {normaliseIntent} from '../../navigator/shared.mjs';
import {onRequest} from '../../functions/api/navigate.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../../data/directory.json',import.meta.url)));
const cases=JSON.parse(fs.readFileSync(new URL('../fixtures/caller-scenarios.json',import.meta.url))).cases;
const interpretations=JSON.parse(fs.readFileSync(new URL('../fixtures/recorded-ai-interpretations.json',import.meta.url)));
for(const scenario of cases)test('search relevance: '+scenario.id,()=>{
 const recorded=interpretations.find(x=>x.id===scenario.id);assert.equal(recorded.status,200);
 const found=searchDirectory(catalog,normaliseIntent(recorded.payload.intent,scenario.query),{area:scenario.selectedArea},scenario.query);
 const ids=found.top.map(x=>x.id);assert.ok(scenario.expectedAnyResourceIds.some(id=>ids.includes(id)),JSON.stringify(ids));
 for(const excluded of scenario.excludeResourceIds)assert.ok(!ids.includes(excluded));
 assert.equal(new Set(ids).size,ids.length);
});
const origin='https://dtp.lxportal.space';
const request=(query,headers={})=>new Request(origin+'/navigate',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Navigator-Client':'00000000-0000-0000-0000-000000000001',...headers},body:JSON.stringify({query})});
test('Worker rejects personal information before inference',async()=>{
 let calls=0;const env={AI:{run(){calls++;throw Error('must not run');}}};
 for(const query of ['NHS number 123 456 7890 needs housing','someone@example.test needs support','DOB 01/02/1990'])assert.equal((await worker.fetch(request(query),env)).status,422);
 assert.equal(calls,0);
});
test('Worker limits origins, content type, size and methods',async()=>{
 assert.equal((await worker.fetch(request('housing',{Origin:'https://untrusted.test'}),{})).status,403);
 assert.equal((await worker.fetch(request('housing',{'Content-Type':'text/plain'}),{})).status,415);
 assert.equal((await worker.fetch(request('x'.repeat(3000)),{})).status,400);
 assert.equal((await worker.fetch(new Request(origin+'/navigate',{headers:{Origin:origin}}),{})).status,405);
});
test('rate limits prevent inference and provider failures expose no details',async()=>{
 const limited={CLIENT_LIMIT:{limit:async()=>({success:false})}};
 assert.equal((await worker.fetch(request('Housing in Brent'),limited)).status,429);
 const env={CLIENT_LIMIT:{limit:async()=>({success:true})},TOTAL_LIMIT:{limit:async()=>({success:true})},AI:{run:async()=>{throw Error('private provider body');}}};
 const response=await worker.fetch(request('Housing in Brent'),env);assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'unavailable'});
});
test('same-origin Pages proxy forwards only to the service binding',async()=>{
 let forwarded;const response=await onRequest({request:request('Housing in Brent'),env:{NAVIGATOR_API:{fetch:async r=>{forwarded=r;return Response.json({ok:true});}}}});
 assert.equal(response.status,200);assert.equal(forwarded.url,'https://navigator.internal/navigate');assert.equal((await forwarded.json()).query,'Housing in Brent');
 assert.equal((await onRequest({request:request('Housing',{Origin:'https://untrusted.test'}),env:{}})).status,403);
 assert.equal((await onRequest({request:request('Housing'),env:{}})).status,503);
});
