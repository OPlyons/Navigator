import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
const root=path.resolve(import.meta.dirname,'../..'),read=p=>fs.readFileSync(path.join(root,p));
test('original directory identities and branding assets are preserved during evidenced updates',()=>{
 const hashes=JSON.parse(read('tests/fixtures/asset-sha256.json'));
 for(const [file,hash] of Object.entries(hashes))if(file!=='assets/directory.json')assert.equal(createHash('sha256').update(read('dist/'+file)).digest('hex'),hash,file);
 const baseline=JSON.parse(read('tests/fixtures/directory-baseline.json')),directory=JSON.parse(read('dist/assets/directory.json'));
 assert.equal(createHash('sha256').update(JSON.stringify(directory.resources.slice(0,baseline.recordCount).map(r=>r.id))).digest('hex'),baseline.resourceIdsSha256);
 assert.deepEqual(directory,JSON.parse(read('data/directory.json')));
 assert.equal(JSON.parse(read('dist/build-info.json')).resources,directory.resources.length);
});
test('every area PDF is built from the current catalogue with all local listings',()=>{
 const directory=JSON.parse(read('data/directory.json')),manifest=JSON.parse(read('dist/assets/directory-pdfs.json'));
 assert.equal(manifest.catalogueSha256,createHash('sha256').update(read('data/directory.json')).digest('hex'));
 assert.deepEqual(Object.keys(manifest.files),Object.keys(directory.areaDownloads));
 for(const [area,filename] of Object.entries(directory.areaDownloads)){
  const entry=manifest.files[area],pdf=read('dist/assets/'+filename);
  assert.equal(entry.filename,filename);
  assert.deepEqual([...entry.ids].sort(),directory.resources.filter(r=>r.directoryId===area).map(r=>r.id).sort());
  assert.equal(entry.count,entry.ids.length);
  assert.equal(pdf.subarray(0,5).toString(),'%PDF-');
  assert.equal(createHash('sha256').update(pdf).digest('hex'),entry.sha256);
 }
});
test('added resources have unique identities, working access information and dated primary sources',()=>{
 const directory=JSON.parse(read('data/directory.json')),baseline=JSON.parse(read('tests/fixtures/directory-baseline.json'));
 const areas=new Set(directory.directories.map(d=>d.id)),ids=new Set();
 for(const r of directory.resources){assert.ok(!ids.has(r.id),'Duplicate '+r.id);ids.add(r.id);assert.ok(areas.has(r.directoryId),r.id);}
 for(const r of directory.resources){assert.match(r.lastChecked,/^\d{4}-\d{2}-\d{2}$/);assert.ok(r.nextReview>r.lastChecked,r.id);assert.equal((Date.parse(r.nextReview)-Date.parse(r.lastChecked))/86400000,28,r.id+' monthly review deadline');}
 for(const r of directory.resources.slice(baseline.recordCount)){
  for(const field of ['name','category','description','who','access','check','sourceOwner'])assert.ok(typeof r[field]==='string'&&r[field].trim(),r.id+' '+field);
  assert.ok(new URL(r.sourceUrl).protocol==='https:',r.id);assert.ok(new URL(r.url).protocol==='https:',r.id);
  assert.match(r.lastChecked,/^\d{4}-\d{2}-\d{2}$/);assert.ok(r.nextReview>r.lastChecked,r.id);
  if(r.national)assert.ok(r.directoryId==='wider-support'&&r.coverage,r.id);
 }
});
test('public build uses same-origin API, limited monitoring and restricted indexing',()=>{
 const html=read('dist/index.html').toString();assert.ok(html.includes('"endpoint":"/api/navigate"'));assert.ok(html.includes('/assets/monitoring.js'));
 assert.doesNotMatch(html,/discharge-community-navigator-dev\.oscar/);assert.ok(read('dist/_headers').toString().includes('noindex, nofollow'));assert.ok(read('dist/robots.txt').toString().includes('Disallow: /'));
 assert.deepEqual(JSON.parse(read('dist/_routes.json')),{version:1,include:['/api/*'],exclude:[]});
 assert.ok(!fs.existsSync(path.join(root,'dist/assets/monitoring.js.map')));
 assert.ok(!fs.existsSync(path.join(root,'dist/maintenance')),'Maintenance records must stay outside the public website');
});
