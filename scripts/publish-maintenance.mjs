/** Apply source evidence to the catalogue. GitHub CI and the normal deployment remain required. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {fingerprint,validateResult,localDay,validDay,settings} from './resource-review.mjs';
import {duplicate} from '../maintenance/discovery/runner.mjs';

const fail=message=>{throw new Error(message);};
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const addDays=(day,days)=>{const date=new Date(day+'T12:00:00Z');date.setUTCDate(date.getUTCDate()+days);return date.toISOString().slice(0,10);};
const metadata=(day,fields,notes,sources)=>({date:day,method:'automated',checkedFields:[...new Set(fields)],notes,evidenceUrls:[...new Set(sources.map(s=>s.url))]});
export function applyReviews(catalogue,run,{datesOnly=false,today=localDay()}={}){
 if(!validDay(run?.day)||run.day>today||!Array.isArray(run.results))fail('Invalid source-check run');
 if(!datesOnly&&run.day!==today)fail('Refresh source evidence before publishing old corrections');
 const output=structuredClone(catalogue),applied=[],skipped=[];
 for(const result of run.results){
  const resource=output.resources.find(r=>r.id===result.id);
  if(!resource||fingerprint(resource)!==result.fingerprint){skipped.push({id:result.id,reason:'Resource changed since research'});continue;}
  validateResult(result,{id:result.id,resource});
  if(result.status==='unable_to_verify'){skipped.push({id:result.id,reason:'No reliable source check; date unchanged'});continue;}
  const before=structuredClone(resource),read=result.sources.filter(s=>['page','official_indexed'].includes(s.retrieval));
  if(!datesOnly){
   for(const finding of result.findings){
    if(!result.checkedFields.includes(finding.field))fail('Correction field was not checked');
    if(!result.sources.some(s=>s.url===finding.sourceUrl&&s.retrieval==='page'))fail('Automatic corrections need readable primary-source evidence');
    resource[finding.field]=finding.proposedValue;
   }
  }
  if(!resource.lastChecked||resource.lastChecked<=run.day){
   resource.lastChecked=run.day;resource.nextReview=addDays(run.day,settings.reviewEveryDays);
   resource.sourceCheck=metadata(run.day,result.checkedFields,result.summary,read);
   resource.verificationStatus='Automated source check; current availability not confirmed';
  }
  if(hash(before)!==hash(resource))applied.push({id:resource.id,checkedOn:run.day,fields:datesOnly?[]:result.findings.map(f=>f.field),beforeFingerprint:fingerprint(before),afterFingerprint:fingerprint(resource)});
 }
 return {catalogue:output,audit:{schemaVersion:1,kind:datesOnly?'recorded_source_dates':'source_reviews',sourceDay:run.day,applied,skipped}};
}
export function applyDiscoveries(catalogue,state,{today=localDay()}={}){
 if(state?.schemaVersion!==1||!Array.isArray(state.candidates))fail('Invalid discovery state');
 const output=structuredClone(catalogue),applied=[],skipped=[];
 const areas=new Set(output.directories.map(d=>d.id)),categories=new Set(output.resources.map(r=>r.category));
 for(const candidate of state.candidates.filter(c=>c.status==='proposed')){
  const r=candidate.resource;
  if(output.resources.some(existing=>duplicate(existing,r))){skipped.push({id:candidate.id,reason:'Already represented in current directory'});continue;}
  if(candidate.sourceCheckedOn!==today){skipped.push({id:candidate.id,reason:'Refresh older source evidence before publishing'});continue;}
  if(!areas.has(r.directoryId)||!categories.has(r.category)||!candidate.sources?.some(s=>s.url===r.sourceUrl&&s.retrieval==='page'))fail('Unsupported area, category or official page');
  for(const field of ['name','description','who','access','check','sourceOwner','coverage','url','sourceUrl'])if(typeof r[field]!=='string'||!r[field].trim())fail('Incomplete discovered resource');
  if(r.national&&r.directoryId!=='wider-support')fail('National service must use Wider support');
  const id=r.directoryId+'-discovered-'+hash([r.name,r.url]).slice(0,12);
  if(output.resources.some(existing=>existing.id===id))fail('Conflicting discovered resource ID');
  const samples=output.resources.filter(existing=>existing.category===r.category),picture=samples.find(existing=>existing.picture)?.picture||'help';
  const resource={id,directoryId:r.directoryId,name:r.name,category:r.category,description:r.description,who:r.who,access:r.access,check:r.check,coverage:r.coverage,url:r.url,sourceUrl:r.sourceUrl,sourceOwner:r.sourceOwner,phone:r.phone||'',picture,tags:[r.name,r.category],audiences:[],lastChecked:today,nextReview:addDays(today,settings.reviewEveryDays),verificationStatus:'Automated source check; current availability not confirmed',sourceCheck:metadata(today,candidate.checkedFields,candidate.limitations,candidate.sources)};
  if(r.national)resource.national=true;
  output.resources.push(resource);applied.push({candidateId:candidate.id,resourceId:id,checkedOn:today});
 }
 return {catalogue:output,audit:{schemaVersion:1,kind:'new_resources',sourceDay:today,applied,skipped}};
}
function write(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
export function cli(argv){
 const [command,...args]=argv,options={};for(let i=0;i<args.length;i+=2){if(!['--catalogue','--input','--audit','--dates-only'].includes(args[i])||!args[i+1])fail('Unsupported option');options[args[i].slice(2)]=args[i+1];}
 if(!options.input||!options.audit)fail('--input and --audit are required');
 const file=options.catalogue||path.resolve(import.meta.dirname,'../data/directory.json'),catalogue=JSON.parse(fs.readFileSync(file,'utf8')),input=JSON.parse(fs.readFileSync(options.input,'utf8'));
 const result=command==='reviews'?applyReviews(catalogue,input,{datesOnly:options['dates-only']==='true'}):command==='discoveries'?applyDiscoveries(catalogue,input):fail('Use reviews or discoveries');
 write(file,result.catalogue);write(options.audit,result.audit);console.log(JSON.stringify({applied:result.audit.applied.length,skipped:result.audit.skipped.length}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{cli(process.argv.slice(2));}catch(error){console.error(error.message);process.exitCode=1;}}
