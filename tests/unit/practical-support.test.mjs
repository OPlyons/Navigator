import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as core from '../../navigator/shared.mjs';
import {searchDirectory} from '../../navigator/retrieve.mjs';

const catalog=JSON.parse(fs.readFileSync(new URL('../../data/directory.json',import.meta.url)));
// Exercise the shipped browser bundle so script order and shared matching are covered.
const html=fs.readFileSync(new URL('../../dist/index.html',import.meta.url),'utf8');
const context=vm.createContext({window:{}});
for(const match of html.matchAll(/<script id="(navigator-core|needs-search-engine)">([\s\S]*?)<\/script>/g))vm.runInContext(match[2],context);
const engine=context.window.CNWLNeedsSearch;
const scenarios=[
 ['I have no fridge','wider-reuse-household-essentials','household'],
 ['I cannot afford a bed','wider-reuse-household-essentials','household'],
 ['I have no data for my phone','wider-national-databank','digital'],
 ['My benefits stopped in hospital','wider-benefits-after-hospital','hospital-benefits'],
 ['I need help understanding my medicines after hospital','wider-discharge-medicines','medicines'],
 ['I struggle to wash and dress after hospital','wider-reablement-after-hospital','home-help'],
 ['Help getting to my hospital appointment','wider-healthcare-travel-costs','travel'],
 ['What about section 117 aftercare','wider-section-117-aftercare','aftercare'],
 ['Extra help with energy while recovering','wider-priority-services-register','energy-support'],
 ['A back-up care plan if my carer is ill','wider-carers-contingency-plan','carer-plan']
];
for(const [query,id,need] of scenarios)test('practical support in both searches: '+query,()=>{
 const parsed=engine.parse(query);
 assert.ok(parsed.needIds.includes(need));
 const local=catalog.resources.map(r=>({r,x:engine.index(r)})).filter(({r,x})=>engine.match(r,parsed,x)).sort((a,b)=>engine.score(b.r,parsed,b.x,'brent')-engine.score(a.r,parsed,a.x,'brent'));
 assert.ok(local.slice(0,3).some(({r})=>r.id===id),local.slice(0,3).map(({r})=>r.id).join(', '));
 // A broad model classification must not lose the explicit practical need.
 const intent=core.normaliseIntent({...core.localIntent(query),needs:['health'],keywords:['settling in'],specific:true},query);
 assert.equal(intent.needs[0],need);
 const found=searchDirectory(catalog,intent,{area:'brent'},query);
 assert.ok(found.top.some(r=>r.id===id),JSON.stringify(found.top));
 assert.ok(searchDirectory(catalog,core.localIntent(query),{area:'brent'},query).top.some(r=>r.id===id));
});
test('food searches do not mistake a furniture or data provider for food support',()=>{
 for(const id of ['wider-reuse-household-essentials','wider-national-databank']){
  const r=catalog.resources.find(r=>r.id===id);
  assert.equal(engine.match(r,engine.parse('I need a foodbank'),engine.index(r)),false);
  const found=searchDirectory(catalog,core.localIntent('I need a foodbank'),{},'I need a foodbank');
  assert.ok(![...found.top,...found.more].some(x=>x.id===id));
 }
});
test('medicine service matching preserves clinical and personal-information boundaries',()=>{
 const raw='Should I double my tablets?';
 assert.equal(core.normaliseIntent({...core.localIntent(raw),outOfScope:true},raw).outOfScope,true);
 assert.equal(core.sensitiveInput('My name is Example and I need help with medicine'),true);
 assert.match(core.buildPrompt(),/clinical treatment\/medication instructions/);
});
