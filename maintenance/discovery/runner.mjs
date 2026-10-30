/** Bounded discovery proposals. Never writes the published catalogue or existing review progress. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const root = path.resolve(import.meta.dirname, '../..');
export const settings = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'settings.json'), 'utf8'));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = message => { throw new Error(message); };
const clean = (value, max = 1800) => typeof value === 'string' && value.trim() && value.length <= max;
const fold = value => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const key = (area, category) => JSON.stringify([area, category]);
export const localDay = (now = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone:settings.timezone, year:'numeric', month:'2-digit', day:'2-digit'}).format(now);
const validDay = day => /^\d{4}-\d{2}-\d{2}$/.test(day) && !Number.isNaN(Date.parse(day)) && new Date(day).toISOString().slice(0,10) === day;
export function publicUrl(value) {
  try {
    if (typeof value !== 'string' || /[\s<>\\]/.test(value)) return false;
    const u = new URL(value);
    return ['http:', 'https:'].includes(u.protocol) && !u.username && !u.password && (!u.port || ['80','443'].includes(u.port)) && u.hostname.includes('.') && !/^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(u.hostname) && !u.hostname.endsWith('.local') && !u.hostname.startsWith('[');
  } catch { return false; }
}
export function normaliseUrl(value) {
  if (!publicUrl(value)) fail('Use a public web URL');
  const u = new URL(value);
  return u.hostname.toLowerCase().replace(/^www\./, '') + u.pathname.replace(/\/+$/, '');
}
export function duplicate(a, b) {
  const sameArea = a.directoryId === b.directoryId;
  const sameName = fold(a.name) === fold(b.name);
  const sameUrl = normaliseUrl(a.url) === normaliseUrl(b.url);
  return (sameArea && (sameName || sameUrl)) || ((a.national || b.national || a.directoryId === 'wider-support' || b.directoryId === 'wider-support') && sameName && sameUrl);
}
export const emptyState = () => ({schemaVersion:1, updatedOn:null, cells:{}, days:{}, candidates:[]});
function validateState(state) {
  if (state?.schemaVersion !== 1 || !state.cells || !state.days || !Array.isArray(state.candidates)) fail('Missing or invalid discovery state; never restart an existing sequence');
  if (state.updatedOn !== null && !validDay(state.updatedOn)) fail('Invalid saved discovery date');
  const ids = new Set();
  for (const candidate of state.candidates) {
    if (!clean(candidate.id) || ids.has(candidate.id) || !['proposed','rejected','added','already_in_directory'].includes(candidate.status) || !candidate.resource) fail('Invalid saved candidate');
    ids.add(candidate.id);
  }
  for (const [day, record] of Object.entries(state.days)) {
    if (!validDay(day) || !Array.isArray(record.cells) || !Array.isArray(record.candidateIds) || new Set(record.cells).size !== record.cells.length || new Set(record.candidateIds).size !== record.candidateIds.length || record.cells.length > settings.areasPerDay * settings.categoriesPerAreaPerDay || record.candidateIds.length > settings.candidatesPerDay) fail('Invalid saved discovery budget');
    const areas = new Map();
    for (const value of record.cells) { const [area] = JSON.parse(value); areas.set(area, (areas.get(area) || 0) + 1); }
    if (areas.size > settings.areasPerDay || [...areas.values()].some(count => count > settings.categoriesPerAreaPerDay) || record.candidateIds.some(id => !ids.has(id))) fail('Invalid saved discovery scope');
  }
  for (const cell of Object.values(state.cells)) if (!validDay(cell.lastAttempt) || !['completed','unable_to_search'].includes(cell.outcome)) fail('Invalid saved discovery cell');
}
function catalogueCells(catalogue) {
  if (!Array.isArray(catalogue.directories) || !Array.isArray(catalogue.resources)) fail('Invalid current catalogue');
  const areas = catalogue.directories.map(d => d.id);
  if (new Set(areas).size !== areas.length || areas.some(a => !clean(a))) fail('Invalid area IDs');
  const categories = [...new Set(catalogue.resources.map(r => r.category))].sort();
  if (!areas.length || !categories.length || categories.some(c => !clean(c))) fail('No discovery scope');
  return areas.flatMap(area => categories.map(category => ({key:key(area, category), directoryId:area, category, existingCount:catalogue.resources.filter(r => r.directoryId === area && r.category === category).length})));
}
export function prepare(catalogue, state, day = localDay()) {
  validateState(state);
  if (!validDay(day) || (state.updatedOn && state.updatedOn > day)) fail('Invalid discovery date');
  const all = catalogueCells(catalogue), today = state.days[day] || {cells:[],candidateIds:[]}, done = new Set(today.cells);
  const previouslySelected = [...new Set(today.cells.map(value => JSON.parse(value)[0]))];
  const areaLast = area => all.filter(c => c.directoryId === area).map(c => state.cells[c.key]?.lastAttempt || '').sort().at(-1) || '';
  const areas = catalogue.directories.map(d => d.id).sort((a,b) => areaLast(a).localeCompare(areaLast(b)));
  const selected = [...previouslySelected, ...areas.filter(a => !previouslySelected.includes(a))].slice(0, settings.areasPerDay);
  const cells = selected.flatMap(area => {
    const remaining = settings.categoriesPerAreaPerDay - today.cells.filter(value => JSON.parse(value)[0] === area).length;
    return all.filter(c => c.directoryId === area && !done.has(c.key)).sort((a,b) => (state.cells[a.key]?.lastAttempt || '').localeCompare(state.cells[b.key]?.lastAttempt || '') || a.existingCount - b.existingCount || a.category.localeCompare(b.category)).slice(0, Math.max(0, remaining));
  });
  return {schemaVersion:1, day, stateDigest:hash(state), catalogueDigest:hash(catalogue), remainingCandidates:Math.max(0,settings.candidatesPerDay - today.candidateIds.length), cells};
}
function validateSource(source) {
  if (!publicUrl(source?.url) || !['provider','nhs','council','official_network'].includes(source.ownerType) || !['page','official_indexed'].includes(source.retrieval) || !clean(source.note,1000)) fail('Invalid official source evidence');
}
function validateCandidate(candidate, cell) {
  const r = candidate?.resource;
  for (const field of ['name','directoryId','category','description','who','access','check','url','sourceUrl','sourceOwner','coverage']) if (!clean(r?.[field])) fail('Incomplete candidate: ' + field);
  if (r.directoryId !== cell.directoryId || r.category !== cell.category || !publicUrl(r.url) || !publicUrl(r.sourceUrl)) fail('Candidate outside planned scope or invalid URL');
  if (r.national && r.directoryId !== 'wider-support') fail('National services belong in wider support');
  if (['lastChecked','nextReview','verificationStatus'].some(field => field in r)) fail('Source research must not invent public or human verification dates');
  if (!Array.isArray(candidate.sources) || !candidate.sources.length || candidate.sources.length > settings.sourcePagesPerCandidate || !clean(candidate.evidence) || !clean(candidate.limitations)) fail('Candidate needs bounded evidence and limitations');
  candidate.sources.forEach(validateSource);
  if (!candidate.sources.some(s => s.url === r.sourceUrl && s.retrieval === 'page')) fail('A readable official source is required for a new resource');
  if (!Array.isArray(candidate.checkedFields) || !['name','description','access','coverage'].every(f => candidate.checkedFields.includes(f))) fail('Candidate needs evidence for its name, activity, access and area');
}
export function record(catalogue, original, plan, results, day = localDay()) {
  validateState(original);
  if (plan?.schemaVersion !== 1 || plan.day !== day || hash(original) !== plan.stateDigest || hash(catalogue) !== plan.catalogueDigest) fail('Stale plan, changed catalogue/state or changed day; reload and prepare');
  if (!Array.isArray(results) || !results.length || new Set(results.map(r => r.key)).size !== results.length) fail('Provide distinct completed search results');
  const fresh = prepare(catalogue,original,day), allowed = new Map(fresh.cells.map(c => [c.key,c]));
  const planned = new Map(plan.cells.map(c => [c.key,c]));
  const state = structuredClone(original), today = state.days[day] ||= {cells:[],candidateIds:[]};
  const skipped = [], added = [];
  for (const result of results) {
    const cell = allowed.get(result.key);
    if (!cell || hash(cell) !== hash(planned.get(result.key))) fail('Unplanned or over-budget search cell');
    if (!['completed','unable_to_search'].includes(result.outcome) || !clean(result.summary) || !Array.isArray(result.queries) || !result.queries.length || result.queries.length > settings.searchesPerCell || result.queries.some(q => !clean(q,500)) || !Array.isArray(result.candidates) || result.candidates.length > settings.candidatesPerCell || (result.outcome === 'unable_to_search' && result.candidates.length)) fail('Incomplete or unbounded search result');
    for (const candidate of result.candidates) {
      validateCandidate(candidate,cell);
      const r = candidate.resource;
      if (catalogue.resources.some(existing => duplicate(existing,r)) || state.candidates.some(existing => duplicate(existing.resource,r))) { skipped.push({key:cell.key,name:r.name,reason:'Existing listing or previously considered candidate'}); continue; }
      if (today.candidateIds.length >= settings.candidatesPerDay) fail('Daily new-resource proposal limit reached');
      const id = 'discovery-' + hash([r.directoryId,fold(r.name),normaliseUrl(r.url)]).slice(0,20);
      state.candidates.push({id,status:'proposed',firstSeen:day,sourceCheckedOn:day,resource:structuredClone(candidate.resource),sources:structuredClone(candidate.sources),checkedFields:[...candidate.checkedFields],evidence:candidate.evidence,limitations:candidate.limitations});
      today.candidateIds.push(id); added.push(id);
    }
    today.cells.push(cell.key);
    state.cells[cell.key] = {directoryId:cell.directoryId,category:cell.category,lastAttempt:day,outcome:result.outcome};
  }
  state.updatedOn = day;
  validateState(state);
  return {state,run:{schemaVersion:1,day,results:structuredClone(results),newCandidateIds:added,skippedCandidates:skipped}};
}
export function summary(catalogue,state,day=localDay()) {
  validateState(state);
  const all = catalogueCells(catalogue), pending = state.candidates.filter(c => c.status === 'proposed');
  return {asOf:day,lastRecordedSearch:state.updatedOn,totalCombinations:all.length,combinationsAttempted:all.filter(c => state.cells[c.key]).length,pendingCandidates:pending.length,nowInDirectory:pending.filter(c => catalogue.resources.some(r => duplicate(r,c.resource))).map(c => c.id),days:Object.entries(state.days).map(([day,v]) => ({day,cells:v.cells.length,newCandidates:v.candidateIds.length})),limits:{areasPerDay:settings.areasPerDay,categoriesPerAreaPerDay:settings.categoriesPerAreaPerDay,candidatesPerDay:settings.candidatesPerDay}};
}
const md = value => String(value ?? '').replace(/[\r\n]+/g,' ').replace(/[\\`*_{}\[\]<>|]/g,'\\$&');
export function report(catalogue,state,day=localDay()) {
  const s = summary(catalogue,state,day), lines = ['# New resource suggestions','',`Last saved search: ${s.lastRecordedSearch || 'Not started'}. ${s.combinationsAttempted} of ${s.totalCombinations} area/category combinations attempted.`,`${s.pendingCandidates} resources await publication. Search coverage is limited, not exhaustive.`,'','Candidates are public-source research only. They have not been added to the public directory. Eligible additions publish automatically after the normal quality checks; uncertain cases remain flagged. Existing listing reviews have their own progress and limits.',''];
  for (const c of state.candidates.filter(c => c.status === 'proposed')) {
    const r = c.resource;
    lines.push(`## ${md(r.name)} — ${md(r.directoryId)}`,`Candidate: ${c.id}. Source checked: ${c.sourceCheckedOn}.`, `Category: ${md(r.category)}`,`- What it offers: ${md(r.description)}`,`- Who: ${md(r.who)}`,`- Access: ${md(r.access)}`,`- Costs/checks: ${md(r.check)}`,`- Coverage: ${md(r.coverage)}`,`- Website: <${r.url}>`,`- Evidence: ${md(c.evidence)}`,`- Limitations: ${md(c.limitations)}`, ...c.sources.map(source => `- Source: <${source.url}> — ${md(source.note)}`),'');
  }
  if (!s.pendingCandidates) lines.push('No new resources awaiting publication.');
  return lines.join('\n') + '\n';
}
const readJson = file => JSON.parse(fs.readFileSync(file,'utf8'));
function writeJson(file,value) { fs.mkdirSync(path.dirname(file),{recursive:true}); fs.writeFileSync(file+'.tmp',JSON.stringify(value,null,2)+'\n'); fs.renameSync(file+'.tmp',file); }
export function cli(argv) {
  const [command,...args] = argv, options = {};
  for (let i=0;i<args.length;i+=2) { if (!['--catalogue','--state-dir','--output','--plan','--results'].includes(args[i]) || !args[i+1]) fail('Expected a supported --option value'); options[args[i].slice(2)] = args[i+1]; }
  const dir = path.resolve(options['state-dir'] || path.join(root,'maintenance/discovery-data')), file = path.join(dir,'state.json');
  const catalogue = readJson(options.catalogue || path.join(root,'data/directory.json'));
  if (command === 'initialise') {
    if (fs.existsSync(file)) fail('Discovery state exists; never reset it');
    const state = emptyState(); writeJson(file,state); writeJson(path.join(dir,'summary.json'),summary(catalogue,state)); fs.writeFileSync(path.join(dir,'CANDIDATES.md'),report(catalogue,state)); return;
  }
  const state = readJson(file);
  if (command === 'prepare') { if (!options.output) fail('--output required'); const plan = prepare(catalogue,state); writeJson(options.output,plan); console.log(JSON.stringify({day:plan.day,cells:plan.cells.length,candidatesRemaining:plan.remainingCandidates,output:options.output})); }
  else if (command === 'summary') { const data = summary(catalogue,state); if (options.output) writeJson(options.output,data); else console.log(JSON.stringify(data,null,2)); }
  else if (command === 'record') {
    if (!options.plan || !options.results) fail('--plan and --results required');
    const result = record(catalogue,state,readJson(options.plan),readJson(options.results)), runFile = path.join(dir,'runs',result.run.day+'.json');
    const previous = fs.existsSync(runFile) ? readJson(runFile) : {results:[],newCandidateIds:[],skippedCandidates:[]};
    const run = {...result.run,results:[...previous.results,...result.run.results],newCandidateIds:[...previous.newCandidateIds,...result.run.newCandidateIds],skippedCandidates:[...previous.skippedCandidates,...result.run.skippedCandidates]};
    if (new Set(run.results.map(r=>r.key)).size !== run.results.length) fail('Repeated saved search; reload current branch');
    writeJson(runFile,run); writeJson(path.join(dir,'summary.json'),summary(catalogue,result.state)); fs.writeFileSync(path.join(dir,'CANDIDATES.md'),report(catalogue,result.state)); writeJson(file,result.state);
    console.log(JSON.stringify({savedCells:result.run.results.length,newCandidates:result.run.newCandidateIds.length,skipped:result.run.skippedCandidates.length}));
  } else fail('Use prepare, record, summary or initialise');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) { try { cli(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; } }
