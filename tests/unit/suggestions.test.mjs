import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import worker from '../../navigator/worker.mjs';
import {validateSuggestion,classifySuggestion,publicWebsite} from '../../navigator/suggestions.mjs';
import {onRequest} from '../../functions/api/suggest-resource.js';
const origin='https://navigator.lxportal.space';
const sample={name:'Example board games club',website:'https://example.org/clubs?tracking=unwanted#top',description:'A weekly board games club in Brent for beginners.',area:'brent',websiteTrap:'',agreed:true};
const request=(body=sample,headers={})=>new Request('https://navigator.internal/suggest-resource',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.1',...headers},body:JSON.stringify(body)});
function environment(run=async()=>({response:{category:'Social connection and activities',needs:['meet']}})){
 const db=new DatabaseSync(':memory:');db.exec(fs.readFileSync(new URL('../../navigator/migrations/0001_resource_suggestions.sql',import.meta.url),'utf8'));
 const storage={prepare(sql){
  const statement=db.prepare(sql);
  return {bind(...values){return {
   async first(){return statement.get(...values)||null;},
   async run(){const value=statement.run(...values);return {success:true,meta:{changes:Number(value.changes)}};}
  };}};
 }};
 return {db,env:{SUBMISSION_LIMIT:{limit:async()=>({success:true})},AI:{run},SUGGESTIONS_DB:storage}};
}
test('suggestions validate public resource information and strip URL queries without fetching them',()=>{
 assert.equal(validateSuggestion(sample).value.website,'https://example.org/clubs');
 for(const website of ['http://example.org','https://127.0.0.1/','https://[::1]/','https://a.local/','https://user:pass@example.org/','https://example.org:444/'])assert.equal(publicWebsite(website),null,website);
 for(const change of [{description:'My name is Test, NHS number 123 456 7890'},{agreed:false},{name:'x'},{websiteTrap:'spam'},{area:'invented'},{description:'x'.repeat(801)}])assert.ok(validateSuggestion({...sample,...change}).error);
});
test('areas are explicit, selected areas override text and AI cannot invent audiences or free text',()=>{
 const item={...sample,area:'',description:'Yoga in Brent and Harrow, available across the UK.'};
 assert.deepEqual(classifySuggestion({category:'invented',needs:['sport','invented'],areas:['surrey'],audiences:['women']},item),{category:'Sport and movement',needs:['sport'],tags:['Sport and movement'],areas:['brent','harrow','wider-support'],needsAreaReview:false,needsCategoryReview:false});
 assert.deepEqual(classifySuggestion(null,{...item,area:'camden'}).areas,['camden']);
 const unknown=classifySuggestion(null,{name:'New resource',description:'A useful community initiative.',area:''});assert.equal(unknown.needsAreaReview,true);assert.equal(unknown.category,null);
});
test('a suggestion is saved privately, AI sorted and deduplicated without publishing it',async()=>{
 let calls=0;const {db,env}=environment(async()=>{calls++;return {response:{category:'Social connection and activities',needs:['meet']}};});
 const first=await worker.fetch(request(),env);assert.equal(first.status,201);const receipt=await first.json();assert.equal(receipt.status,'pending_review');assert.equal(receipt.sortingMode,'ai');assert.ok(!('description' in receipt));
 const row=db.prepare('SELECT * FROM resource_suggestions').get();assert.equal(row.website,'https://example.org/clubs');assert.equal(row.status,'pending');assert.equal(row.sorting_mode,'ai');assert.equal(JSON.parse(row.classification_json).category,'Social connection and activities');
 const second=await worker.fetch(request(),env);assert.equal(second.status,200);assert.equal((await second.json()).id,receipt.id);assert.equal(calls,1);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM resource_suggestions').get().n,1);
 db.prepare("UPDATE resource_suggestions SET status = 'added'").run();const reviewed=await worker.fetch(request(),env);assert.equal((await reviewed.json()).status,'reviewed');assert.equal(calls,1);db.close();
});
test('failed or invalid AI still leaves a saved suggestion with basic sorting',async()=>{
 for(const run of [async()=>{throw Error('private model output');},async()=>({response:{category:'invented',needs:['fake']}})]){
  const {db,env}=environment(run);const r=await worker.fetch(request(),env);assert.equal(r.status,201);assert.equal((await r.json()).sortingMode,'rules');assert.equal(db.prepare('SELECT status FROM resource_suggestions').get().status,'pending');db.close();
 }
});
test('invalid requests, personal information, rate limits and missing storage never call AI',async()=>{
 let calls=0;const {db,env}=environment(async()=>{calls++;});
 assert.equal((await worker.fetch(request(sample,{Origin:'https://evil.test'}),env)).status,403);
 assert.equal((await worker.fetch(request(sample,{'Content-Type':'text/plain'}),env)).status,415);
 assert.equal((await worker.fetch(request({...sample,description:'My name is Example and my email is test@example.org'}),env)).status,422);
 assert.equal((await worker.fetch(request({...sample,description:'x'.repeat(7000)}),env)).status,400);
 assert.equal((await worker.fetch(new Request('https://navigator.internal/suggest-resource'),env)).status,405);
 assert.equal((await worker.fetch(request(),{...env,SUGGESTIONS_DB:null})).status,503);
 env.SUBMISSION_LIMIT.limit=async()=>({success:false});assert.equal((await worker.fetch(request(),env)).status,429);assert.equal(calls,0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM resource_suggestions').get().n,0);db.close();
});
test('the daily storage ceiling stops new inference and preserves earlier records',async()=>{
 let calls=0;const {db,env}=environment(async()=>{calls++;});
 const now=new Date().toISOString();const insert=db.prepare("INSERT INTO resource_suggestions(id,fingerprint,created_at,submission_day,name,website,description,classification_json,sorting_mode,status) VALUES(?,?,?,?,?,?,?,?,'rules','pending')");
 for(let i=0;i<100;i++)insert.run('id'+i,'fp'+i,now,now.slice(0,10),'Example','https://example.org','Example public resource','{}');
 assert.equal((await worker.fetch(request(),env)).status,429);assert.equal(calls,0);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM resource_suggestions').get().n,100);db.close();
});
test('Pages suggestion proxy rejects external callers and has no public read route',async()=>{
 let forwarded;
 const r=await onRequest({request:new Request(origin+'/api/suggest-resource',request()),env:{NAVIGATOR_API:{fetch:async r=>{forwarded=r;return Response.json({ok:true});}}}});assert.equal(r.status,200);assert.equal(forwarded.url,'https://navigator.internal/suggest-resource');assert.equal(forwarded.headers.get('CF-Connecting-IP'),'192.0.2.1');
 assert.equal((await onRequest({request:new Request(origin+'/api/suggest-resource'),env:{}})).status,405);
 assert.equal((await onRequest({request:new Request(origin+'/api/suggest-resource',request(sample,{Origin:'https://evil.test'})),env:{}})).status,403);
});
