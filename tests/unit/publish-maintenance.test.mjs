import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyReviews,applyDiscoveries} from '../../scripts/publish-maintenance.mjs';
import {fingerprint} from '../../scripts/resource-review.mjs';

const resource={id:'local-test',directoryId:'brent',name:'Local group',category:'Social connection and activities',description:'A local group.',who:'Adults',access:'Contact the organiser.',check:'Ask about costs.',url:'https://example.org/group',sourceUrl:'https://example.org/group',sourceOwner:'Provider',lastChecked:'2026-09-18',nextReview:'2026-12-18'};
const catalogue={directories:[{id:'brent',name:'Brent'}],resources:[resource]};
const reviewed={id:resource.id,status:'no_change_found',summary:'The programme and joining information were read; current places are not confirmed.',checkedFields:['name','description','access'],sources:[{url:resource.sourceUrl,ownerType:'provider',retrieval:'page',note:'Current provider programme page read.'}],findings:[],fingerprint:fingerprint(resource)};

test('successful evidence updates the real date and monthly deadline without inventing a human review',()=>{
 const before=JSON.stringify(catalogue),result=applyReviews(catalogue,{day:'2026-10-30',results:[reviewed]},{today:'2026-10-30'});
 assert.equal(result.catalogue.resources[0].lastChecked,'2026-10-30');assert.equal(result.catalogue.resources[0].nextReview,'2026-11-27');
 assert.equal(result.catalogue.resources[0].sourceCheck.method,'automated');assert.equal(JSON.stringify(catalogue),before);
 const again=applyReviews(result.catalogue,{day:'2026-10-30',results:[reviewed]},{today:'2026-10-30'});assert.equal(again.audit.applied.length,0);
});
test('failed checks do not refresh dates; stale or older corrections cannot overwrite newer edits',()=>{
 const failed={...reviewed,status:'unable_to_verify',checkedFields:[],sources:[],failureReason:'Source could not be read.'};
 assert.deepEqual(applyReviews(catalogue,{day:'2026-10-30',results:[failed]},{today:'2026-10-30'}).catalogue,catalogue);
 const edited=structuredClone(catalogue);edited.resources[0].access='A new contact route.';
 assert.deepEqual(applyReviews(edited,{day:'2026-10-30',results:[reviewed]},{today:'2026-10-30'}).catalogue,edited);
 assert.throws(()=>applyReviews(catalogue,{day:'2026-10-27',results:[reviewed]},{today:'2026-10-30'}),/Refresh/);
 const historic=applyReviews(catalogue,{day:'2026-10-27',results:[reviewed]},{today:'2026-10-30',datesOnly:true});assert.equal(historic.catalogue.resources[0].lastChecked,'2026-10-27');
});
test('only checked correction fields with readable page evidence are applied',()=>{
 const change={...reviewed,status:'changes_found',findings:[{field:'access',currentValue:resource.access,proposedValue:'Use the joining form.',sourceUrl:resource.sourceUrl,reason:'The provider publishes the form.',evidence:'The current joining page asks people to use its form.'}]};
 assert.equal(applyReviews(catalogue,{day:'2026-10-30',results:[change]},{today:'2026-10-30'}).catalogue.resources[0].access,'Use the joining form.');
 const indexed=structuredClone(change);indexed.sources[0].retrieval='official_indexed';assert.throws(()=>applyReviews(catalogue,{day:'2026-10-30',results:[indexed]},{today:'2026-10-30'}),/readable/);
});
test('new discoveries publish once with source dates and do not replace existing records',()=>{
 const candidate={id:'new-candidate',status:'proposed',sourceCheckedOn:'2026-10-30',resource:{...resource,name:'Another group',url:'https://example.org/another',sourceUrl:'https://example.org/another',coverage:'Brent'},checkedFields:['name','description','access','coverage'],sources:[{url:'https://example.org/another',ownerType:'provider',retrieval:'page',note:'Read official programme.'}],limitations:'Costs and places not confirmed.'};
 const state={schemaVersion:1,candidates:[candidate]},result=applyDiscoveries(catalogue,state,{today:'2026-10-30'});
 assert.equal(result.catalogue.resources.length,2);assert.deepEqual(result.catalogue.resources[0],resource);assert.equal(result.catalogue.resources[1].nextReview,'2026-11-27');
 assert.equal(applyDiscoveries(result.catalogue,state,{today:'2026-10-30'}).audit.applied.length,0);
 assert.equal(applyDiscoveries(catalogue,state,{today:'2026-10-31'}).catalogue.resources.length,1);
});
