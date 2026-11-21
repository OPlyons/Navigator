import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {localIntent,normaliseIntent} from '../../navigator/shared.mjs';
import {searchDirectory} from '../../navigator/retrieve.mjs';
import {classifySuggestion,validateSuggestion} from '../../navigator/suggestions.mjs';

const catalog=JSON.parse(readFileSync(new URL('../../data/directory.json',import.meta.url)));
const byId=new Map(catalog.resources.map(r=>[r.id,r]));
for(const [area,query] of [
 ['barnet','Benefits in Barnet'],['islington','Carer support in Islington'],
 ['hammersmith-fulham','Benefits in H&F'],['hounslow','Carer support in Hounslow'],
 ['richmond-upon-thames','Benefits in Richmond upon Thames']
])test('search and suggestion sorting recognise '+area,()=>{
 const local=localIntent(query);
 assert.equal(local.area,area);
 // Inference must not redirect someone away from the area they actually named.
 const intent=normaliseIntent({...local,area:'brent'},query);
 const matches=searchDirectory(catalog,intent,{},query);
 assert.equal(matches.area,area);
 assert.ok(matches.top.some(hit=>byId.get(hit.id)?.directoryId===area),'Expected a relevant local service');
 for(const hit of matches.top)assert.ok([area,'wider-support'].includes(byId.get(hit.id).directoryId));
 const suggestion={name:'Example local advice service',website:'https://example.org/support',description:query+'. Community support for residents.',area:'',agreed:true};
 assert.deepEqual(classifySuggestion(null,suggestion).areas,[area]);
 assert.equal(validateSuggestion({...suggestion,area}).value.area,area);
});
