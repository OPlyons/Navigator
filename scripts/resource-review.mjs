/** Bounded directory maintenance. Never edits the public directory or its checked dates. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const root=path.resolve(import.meta.dirname,'..');
export const settings=JSON.parse(fs.readFileSync(path.join(root,'maintenance/settings.json'),'utf8'));
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const clone=value=>structuredClone(value);
const fail=message=>{throw new Error(message);};
const clean=(value,max=3000)=>typeof value==='string'&&value.trim()&&value.length<=max;
const fields=settings.reviewFields;
export function localDay(now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:settings.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export function validDay(day){return /^\d{4}-\d{2}-\d{2}$/.test(day)&&!Number.isNaN(Date.parse(day))&&new Date(day).toISOString().slice(0,10)===day;}
const addDays=(day,days)=>{const d=new Date(day+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10);};
export function publicUrl(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password&&(!u.port||['80','443'].includes(u.port))&&u.hostname.includes('.')&&!/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname)&&!u.hostname.endsWith('.local')&&!u.hostname.startsWith('[');}catch{return false;}}
export function fingerprint(resource){return hash(Object.fromEntries(['id','directoryId','category','sourceUrl','sourceOwner',...fields].map(key=>[key,resource[key]??''])));}
export function emptyState(){return {schemaVersion:1,updatedOn:null,entries:{},days:{},queue:[]};}
function validateState(state){
 if(state?.schemaVersion!==1||!state.entries||!state.days||!Array.isArray(state.queue))fail('Unsupported or incomplete review state');
 for(const [day,v] of Object.entries(state.days))if(!validDay(day)||!Array.isArray(v.regular)||!Array.isArray(v.retry)||new Set([...v.regular,...v.retry]).size!==v.regular.length+v.retry.length||v.regular.length>settings.regularPerDay||v.retry.length>settings.retriesPerDay)fail('Invalid saved daily budget');
}

export function prepare(resources,state,day=localDay()){
 validateState(state);if(!validDay(day))fail('Use a valid YYYY-MM-DD review date');
 const ids=new Set(resources.map(r=>r.id));if(ids.size!==resources.length)fail('Duplicate resource IDs');
 const today=state.days[day]||{regular:[],retry:[]},done=new Set([...today.regular,...today.retry]),cutoff=addDays(day,-settings.reviewEveryDays);
 const due=resources.filter(r=>{const e=state.entries[r.id];return !done.has(r.id)&&(!e?.lastRegularAttempt||e.lastRegularAttempt<=cutoff||e.fingerprint!==fingerprint(r));}).sort((a,b)=>(state.entries[a.id]?.lastRegularAttempt||'').localeCompare(state.entries[b.id]?.lastRegularAttempt||'')||a.id.localeCompare(b.id));
 const regular=due.slice(0,Math.max(0,Math.min(settings.regularPerBatch,settings.regularPerDay-today.regular.length)));
 const chosen=new Set(regular.map(r=>r.id));
 const retry=resources.filter(r=>{const e=state.entries[r.id];return !done.has(r.id)&&!chosen.has(r.id)&&e?.nextRetry&&e.nextRetry<=day&&e.lastRegularAttempt>cutoff;}).sort((a,b)=>state.entries[a.id].nextRetry.localeCompare(state.entries[b.id].nextRetry)||a.id.localeCompare(b.id)).slice(0,Math.max(0,Math.min(settings.retriesPerBatch,settings.retriesPerDay-today.retry.length)));
 const entries=[...regular.map(r=>({kind:'regular',resource:r})),...retry.map(r=>({kind:'retry',resource:r}))].map(({kind,resource})=>({kind,id:resource.id,fingerprint:fingerprint(resource),resource,previous:state.entries[resource.id]||null}));
 return {schemaVersion:1,day,stateDigest:hash(state),catalogueCount:resources.length,entries};
}

export function validateResult(result,planned){
 if(result?.id!==planned.id||!['no_change_found','changes_found','unable_to_verify'].includes(result.status))fail('Invalid result identity or status');
 if(!clean(result.summary,1800)||!Array.isArray(result.sources)||result.sources.length>8||!Array.isArray(result.checkedFields)||result.checkedFields.some(f=>!fields.includes(f))||!Array.isArray(result.findings)||result.findings.length>12)fail('Incomplete evidence for '+result.id);
 for(const source of result.sources){if(!publicUrl(source.url)||!['provider','nhs','council','official_network'].includes(source.ownerType)||!['page','official_indexed','link_only','failed'].includes(source.retrieval)||!clean(source.note,1000))fail('Invalid source evidence for '+result.id);}
 const read=result.sources.filter(s=>['page','official_indexed'].includes(s.retrieval));
 if(result.status!=='unable_to_verify'&&(!read.length||!result.checkedFields.includes('name')||!result.checkedFields.some(f=>['description','who','access'].includes(f))))fail('A working link alone cannot verify a listing');
 if(result.status==='changes_found'&&!result.findings.length)fail('Changes need evidence-backed findings');
 if(result.status!=='changes_found'&&result.findings.length)fail('Findings must use changes_found');
 if(result.status==='unable_to_verify'&&!clean(result.failureReason,500))fail('Unavailable evidence needs a reason');
 for(const finding of result.findings){
  if(!fields.includes(finding.field)||finding.currentValue!==(planned.resource[finding.field]??'')||!clean(finding.proposedValue)||finding.proposedValue===finding.currentValue||!clean(finding.reason,1200)||!clean(finding.evidence,1200)||!read.some(s=>s.url===finding.sourceUrl))fail('Unsupported or stale suggested correction for '+result.id);
  if(finding.field==='url'&&!publicUrl(finding.proposedValue))fail('Suggested links must be public web URLs');
  if(finding.priority&&!['normal','urgent'].includes(finding.priority))fail('Invalid finding priority');
 }
 return read.length>0;
}

export function reconcileQueue(state,resources,day){
 const lookup=new Map(resources.map(r=>[r.id,r]));
 for(const item of state.queue.filter(q=>q.status==='open')){
  const r=lookup.get(item.resourceId);
  if(!r){item.status='removed_from_directory';item.closedOn=day;continue;}
  if(item.kind==='change'&&(r[item.field]??'')!==item.currentValue){item.status=(r[item.field]??'')===item.proposedValue?'applied':'superseded';item.closedOn=day;}
 }
}
export function record(resources,original,plan,results){
 validateState(original);if(!validDay(plan?.day)||plan.schemaVersion!==1||hash(original)!==plan.stateDigest)fail('Review state changed; reload and prepare a fresh plan');
 if(!Array.isArray(results)||!results.length)fail('At least one completed result is required');
 const allowed=prepare(resources,original,plan.day),allowedEntries=new Map(allowed.entries.map(e=>[e.id,e]));
 const planned=new Map(plan.entries.map(e=>[e.id,e]));
 if(new Set(results.map(r=>r.id)).size!==results.length)fail('Duplicate result IDs');
 for(const result of results){const entry=planned.get(result.id),fresh=allowedEntries.get(result.id);if(!entry||!fresh||entry.fingerprint!==fresh.fingerprint||fingerprint(entry.resource)!==entry.fingerprint||entry.kind!==fresh.kind)fail('Stale, unplanned or over-budget resource: '+result.id);validateResult(result,entry);}
 const state=clone(original);reconcileQueue(state,resources,plan.day);
 const today=state.days[plan.day]||={regular:[],retry:[]};
 for(const result of results){
  const entry=planned.get(result.id),old=state.entries[result.id]||{},read=result.sources.some(s=>['page','official_indexed'].includes(s.retrieval));
  const retryCount=entry.kind==='regular'?0:(old.retryCount||0)+1,failed=result.status==='unable_to_verify';
  state.entries[result.id]={...old,name:entry.resource.name,area:entry.resource.directoryId,fingerprint:entry.fingerprint,lastAttempt:plan.day,lastRegularAttempt:entry.kind==='regular'?plan.day:old.lastRegularAttempt,lastSourceRead:read?plan.day:old.lastSourceRead||null,lastOutcome:result.status,lastSummary:result.summary,checkedFields:result.checkedFields,consecutiveFailures:failed?(old.consecutiveFailures||0)+1:0,retryCount:failed?retryCount:0,nextRetry:failed&&retryCount<settings.retryAfterDays.length?addDays(plan.day,settings.retryAfterDays[retryCount]):null};
  today[entry.kind].push(result.id);
  const openFailure=state.queue.find(q=>q.resourceId===result.id&&q.kind==='verification'&&q.status==='open');
  if(!failed&&openFailure){openFailure.status='source_access_restored';openFailure.closedOn=plan.day;}
  const incoming=result.findings.map(f=>({kind:'change',resourceId:result.id,name:entry.resource.name,area:entry.resource.directoryId,...f}));
  if(failed)incoming.push({kind:'verification',resourceId:result.id,name:entry.resource.name,area:entry.resource.directoryId,reason:result.failureReason,sourceUrl:entry.resource.sourceUrl,priority:'normal'});
  for(const item of incoming){
   const key=hash(item.kind==='verification'?[item.resourceId,'verification']:[item.resourceId,item.field,item.currentValue,item.proposedValue,item.sourceUrl]);
   const existing=state.queue.find(q=>q.key===key&&q.status==='open');
   if(existing){existing.lastSeen=plan.day;existing.occurrences++;existing.reason=item.reason;}
   else state.queue.push({...item,key,status:'open',firstSeen:plan.day,lastSeen:plan.day,occurrences:1});
  }
 }
 state.updatedOn=plan.day;
 return {state,run:{schemaVersion:1,day:plan.day,catalogueCount:resources.length,results:results.map(r=>({...r,kind:planned.get(r.id).kind,fingerprint:planned.get(r.id).fingerprint}))}};
}

const md=value=>String(value??'').replace(/[\r\n]+/g,' ').replace(/[\\`*_{}\[\]<>|]/g,'\\$&');
export function summary(resources,state,day=localDay()){
 validateState(state);if(!validDay(day))fail('Invalid summary date');
 const current=clone(state);reconcileQueue(current,resources,day);
 const entries=resources.map(r=>current.entries[r.id]).filter(Boolean),cutoff=addDays(day,-settings.reviewEveryDays),week=addDays(day,-7);
 return {asOf:day,total:resources.length,attempted:entries.length,attemptedInLast28Days:entries.filter(e=>e.lastRegularAttempt>cutoff).length,sourceReadInLast28Days:entries.filter(e=>e.lastSourceRead>cutoff).length,lastRecordedRun:current.updatedOn,openChanges:current.queue.filter(q=>q.kind==='change'&&q.status==='open'),unableToVerify:current.queue.filter(q=>q.kind==='verification'&&q.status==='open'),recentResolved:current.queue.filter(q=>q.status!=='open'&&q.closedOn>=week),runsInLast7Days:Object.entries(current.days).filter(([d])=>d>=week&&d<=day).map(([day,v])=>({day,regular:v.regular.length,retries:v.retry.length}))};
}
export function reportMarkdown(resources,state,day=localDay()){
 const s=summary(resources,state,day),lines=['# Directory review queue','',`Updated: ${day}. ${s.attemptedInLast28Days} of ${s.total} listings attempted in the last 28 days.`,`${s.sourceReadInLast28Days} listings had provider or official source content read in that period.`,`Last recorded run: ${s.lastRecordedRun||'Not started'}.`,'','Automated source checks do not confirm availability or replace a person reviewing important changes. The live directory and its information-checked dates remain unchanged.','','## Suggested corrections',''];
 if(!s.openChanges.length)lines.push('No suggested corrections awaiting review.');
 for(const q of s.openChanges.sort((a,b)=>(a.priority==='urgent'?-1:0)-(b.priority==='urgent'?-1:0)||a.name.localeCompare(b.name))){lines.push(`### ${md(q.name)} — ${md(q.area)}`,`Field: **${md(q.field)}**${q.priority==='urgent'?' · **Priority review**':''}`,`- Current: ${md(q.currentValue)}`,`- Suggested: ${md(q.proposedValue)}`,`- Why: ${md(q.reason)}`,`- Evidence summary: ${md(q.evidence)}`,`- Source: <${q.sourceUrl}>`,`- First found: ${q.firstSeen}; last seen: ${q.lastSeen}.`,'');}
 lines.push('','## Could not verify','');if(!s.unableToVerify.length)lines.push('No unresolved source-access problems.');
 for(const q of s.unableToVerify)lines.push(`- **${md(q.name)}** (${md(q.area)}): ${md(q.reason)} [Source](<${q.sourceUrl}>). Last attempt: ${q.lastSeen}.`);
 return lines.join('\n')+'\n';
}

function readJson(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch(e){if(e.code==='ENOENT'&&fallback!==undefined)return fallback;throw e;}}
function writeJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const temp=file+'.tmp';fs.writeFileSync(temp,JSON.stringify(value,null,2)+'\n');fs.renameSync(temp,file);}
export function cli(argv){
 const [command,...args]=argv,options={};for(let i=0;i<args.length;i+=2){if(!args[i].startsWith('--')||!args[i+1])fail('Expected --option value');options[args[i].slice(2)]=args[i+1];}
 const dir=path.resolve(options['state-dir']||path.join(root,'maintenance/review-data')),stateFile=path.join(dir,'state.json');
 const resources=readJson(options.catalogue||path.join(root,'data/directory.json')).resources,state=command==='initialise'?emptyState():readJson(stateFile),day=options.date||localDay();
 if(command==='prepare'){if(!options.output)fail('--output is required');const plan=prepare(resources,state,day);writeJson(options.output,plan);console.log(JSON.stringify({day:plan.day,regular:plan.entries.filter(e=>e.kind==='regular').length,retries:plan.entries.filter(e=>e.kind==='retry').length,output:options.output}));}
 else if(command==='record'){
  if(!options.plan||!options.results)fail('--plan and --results are required');
  const plan=readJson(options.plan),result=record(resources,state,plan,readJson(options.results)),runFile=path.join(dir,'runs',plan.day+'.json');
  const previous=readJson(runFile,{schemaVersion:1,day:plan.day,results:[]}),merged={...result.run,results:[...previous.results,...result.run.results]};
  if(new Set(merged.results.map(r=>r.id)).size!==merged.results.length)fail('Duplicate saved result; reload the latest branch state');
  writeJson(runFile,merged);writeJson(stateFile,result.state);writeJson(path.join(dir,'summary.json'),summary(resources,result.state,plan.day));fs.writeFileSync(path.join(dir,'REVIEW.md'),reportMarkdown(resources,result.state,plan.day));
  console.log(JSON.stringify({saved:result.run.results.length,day:plan.day,reviewFile:path.join(dir,'REVIEW.md')}));
 }else if(command==='summary'){const s=summary(resources,state,day);if(options.output)writeJson(options.output,s);else console.log(JSON.stringify(s,null,2));}
 else if(command==='initialise'){if(fs.existsSync(stateFile))fail('Review state already exists; do not reset it');writeJson(stateFile,state);writeJson(path.join(dir,'summary.json'),summary(resources,state,day));fs.writeFileSync(path.join(dir,'REVIEW.md'),reportMarkdown(resources,state,day));console.log('Initial review records created. No resources have been marked checked.');}
 else fail('Use prepare, record, summary or initialise');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{cli(process.argv.slice(2));}catch(e){console.error(e.message);process.exitCode=1;}}
