import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {emptyState,prepare,record,summary,duplicate,normaliseUrl,localDay,report} from './runner.mjs';

const catalogue = {
  directories:Array.from({length:10},(_,i)=>({id:'area-'+i,name:'Area '+i})),
  resources:Array.from({length:10},(_,i)=>Array.from({length:20},(_,j)=>({id:`existing-${i}-${j}`,directoryId:'area-'+i,category:'Category '+String(j).padStart(2,'0'),name:`Existing ${i} ${j}`,url:`https://example.org/existing/${i}/${j}`}))).flat()
};
const dayAfter = days => new Date(Date.UTC(2026,9,31+days)).toISOString().slice(0,10);
const result = cell => ({key:cell.key,outcome:'completed',queries:[cell.directoryId+' '+cell.category+' support'],summary:'A bounded search of public sources found no eligible new listing.',candidates:[]});
const candidate = (cell,i) => ({resource:{name:'Community group '+i,directoryId:cell.directoryId,category:cell.category,description:'A regular local activity.',who:'Adults in the stated area.',access:'Contact the organiser to ask about joining.',check:'Costs are not published; ask the organiser.',coverage:'The selected local area is explicitly covered.',url:`https://provider.example/groups/${i}`,sourceUrl:`https://provider.example/groups/${i}`,sourceOwner:'Example provider'},checkedFields:['name','description','access','coverage'],sources:[{url:`https://provider.example/groups/${i}`,ownerType:'provider',retrieval:'page',note:'Provider programme and joining information read.'}],evidence:'The provider describes this activity, its joining route and its area.',limitations:'Current places, costs and accessibility were not confirmed.'});

test('two areas and three categories each rotate across all 200 combinations in 35 days',()=>{
  let state=emptyState();const seen=new Set();
  for(let d=0;d<35;d++){
    const plan=prepare(catalogue,state,dayAfter(d));
    assert.equal(new Set(plan.cells.map(c=>c.directoryId)).size,2);
    assert.equal(plan.cells.length,6);
    for(const cell of plan.cells)seen.add(cell.key);
    state=record(catalogue,state,plan,plan.cells.map(result),dayAfter(d)).state;
    assert.equal(prepare(catalogue,state,dayAfter(d)).cells.length,0);
  }
  assert.equal(seen.size,200);assert.equal(summary(catalogue,state,dayAfter(34)).combinationsAttempted,200);
});
test('thin categories come first; new areas and categories enter the rotation without resetting progress',()=>{
  const thin=structuredClone(catalogue);thin.resources=thin.resources.filter(r=>!(r.directoryId==='area-0'&&r.category==='Category 19'));
  let plan=prepare(thin,emptyState(),dayAfter(0));assert.equal(plan.cells[0].category,'Category 19');
  const state=record(thin,emptyState(),plan,[result(plan.cells[0])],dayAfter(0)).state;
  const grown=structuredClone(thin);grown.directories.push({id:'new-area',name:'New area'});grown.resources.push({id:'new',directoryId:'area-0',category:'New category',name:'Existing new category',url:'https://example.org/new'});
  plan=prepare(grown,state,dayAfter(1));assert.ok(plan.cells.some(c=>c.category==='New category'));
  assert.equal(Object.keys(state.cells).length,1);assert.equal(summary(grown,state).totalCombinations,231);
});
test('partial runs preserve work, stay in two areas and stop at the daily search budget',()=>{
  let state=emptyState(),plan=prepare(catalogue,state,dayAfter(0));
  const stale=plan;state=record(catalogue,state,plan,[result(plan.cells[0])],dayAfter(0)).state;
  assert.throws(()=>record(catalogue,state,stale,[result(stale.cells[1])],dayAfter(0)),/Stale/);
  plan=prepare(catalogue,state,dayAfter(0));assert.equal(plan.cells.length,5);
  state=record(catalogue,state,plan,plan.cells.map(result),dayAfter(0)).state;
  assert.equal(prepare(catalogue,state,dayAfter(0)).cells.length,0);assert.equal(state.days[dayAfter(0)].cells.length,6);
});
test('four new candidates per day; duplicates across catalogue and previous suggestions are skipped',()=>{
  const initial=emptyState(),plan=prepare(catalogue,initial,dayAfter(0));
  const proposed=plan.cells.map((cell,i)=>({...result(cell),candidates:i<4?[candidate(cell,i)]:[]}));
  const state=record(catalogue,initial,plan,proposed,dayAfter(0)).state;
  assert.equal(state.candidates.length,4);assert.equal(summary(catalogue,state).pendingCandidates,4);
  assert.ok(report(catalogue,state).includes('have not been added to the public directory'));
  const tooMany=structuredClone(proposed);tooMany[4].candidates=[candidate(plan.cells[4],4)];
  assert.throws(()=>record(catalogue,initial,plan,tooMany,dayAfter(0)),/Daily/);assert.equal(initial.candidates.length,0);
  const duplicateResource={...candidate(plan.cells[0],0),resource:{...candidate(plan.cells[0],0).resource,name:catalogue.resources[0].name,url:catalogue.resources[0].url}};
  const skipped=record(catalogue,initial,plan,[{...result(plan.cells[0]),candidates:[duplicateResource]}],dayAfter(0));
  assert.equal(skipped.state.candidates.length,0);assert.equal(skipped.run.skippedCandidates.length,1);
  assert.equal(normaliseUrl('https://www.example.org/group/?tracking=yes#join'),'example.org/group');
  assert.equal(duplicate(candidate(plan.cells[0],0).resource,{...candidate(plan.cells[0],0).resource,url:'http://www.provider.example/groups/0/?q=1'}),true);
});
test('changed catalogue, wrong day, missing state and unplanned cells cannot be recorded',()=>{
  const state=emptyState(),plan=prepare(catalogue,state,dayAfter(0));
  const changed=structuredClone(catalogue);changed.resources[0].name='New name';
  assert.throws(()=>record(changed,state,plan,[result(plan.cells[0])],dayAfter(0)),/Stale/);
  assert.throws(()=>record(catalogue,state,plan,[result(plan.cells[0])],dayAfter(1)),/Stale/);
  assert.throws(()=>prepare(catalogue,undefined),/Missing/);
  assert.throws(()=>record(catalogue,state,plan,[{...result(plan.cells[0]),key:'invented'}],dayAfter(0)),/Unplanned/);
  assert.equal(localDay(new Date('2026-07-01T23:30:00Z')),'2026-07-02');
});
test('a candidate needs readable official evidence, accurate scope and no invented public verification dates',()=>{
  const state=emptyState(),plan=prepare(catalogue,state,dayAfter(0)),cell=plan.cells[0];
  for(const alter of [c=>{c.sources[0].retrieval='official_indexed';},c=>{c.resource.directoryId='elsewhere';},c=>{c.resource.lastChecked=dayAfter(0);},c=>{c.resource.url='http://127.0.0.1/';},c=>{c.checkedFields=[];}]){
    const c=candidate(cell,0);alter(c);assert.throws(()=>record(catalogue,state,plan,[{...result(cell),candidates:[c]}],dayAfter(0)));
  }
  const before=JSON.stringify(catalogue);record(catalogue,state,plan,[{...result(cell),candidates:[candidate(cell,0)]}],dayAfter(0));assert.equal(JSON.stringify(catalogue),before);assert.equal(state.candidates.length,0);
});
test('CLI fails on missing progress, cannot reinitialise and does not edit unrelated review state',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'navigator-discovery-test-'));
  try {
    const cat=path.join(dir,'catalogue.json'),state=path.join(dir,'state'),reviews=path.join(dir,'review-state.json');
    fs.writeFileSync(cat,JSON.stringify(catalogue));fs.writeFileSync(reviews,'40 completed checks');
    const run=(...args)=>spawnSync(process.execPath,[path.join(import.meta.dirname,'runner.mjs'),...args,'--catalogue',cat,'--state-dir',state],{encoding:'utf8'});
    assert.notEqual(run('prepare','--output',path.join(dir,'plan.json')).status,0);
    assert.equal(run('initialise').status,0);assert.notEqual(run('initialise').status,0);
    const saved=fs.readFileSync(path.join(state,'state.json'),'utf8');
    assert.equal(run('prepare','--output',path.join(dir,'plan.json')).status,0);
    assert.equal(run('summary').status,0);assert.equal(fs.readFileSync(path.join(state,'state.json'),'utf8'),saved);
    assert.equal(fs.readFileSync(reviews,'utf8'),'40 completed checks');
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
