import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sanitiseEvent,filterEnvelope,DATA_COLLECTION} from '../../site/monitoring-privacy.mjs';
const context={origin:'https://dtp.lxportal.space',release:'discharge-project@test',environment:'test'};
const event=()=>({event_id:'a'.repeat(32),timestamp:123,message:'private search',user:{email:'synthetic@example.test'},request:{url:'https://dtp.lxportal.space/?private=yes',data:'private form'},breadcrumbs:[{message:'private breadcrumb'}],extra:{private:'data'},contexts:{trace:{trace_id:'secret'}},tags:{arbitrary:'private'},exception:{values:[{type:'TypeError',value:'synthetic@example.test 1234567890',stacktrace:{frames:[{filename:'https://dtp.lxportal.space/index.html?private=yes#person',lineno:42,colno:8,function:'private search',vars:{private:'data'},context_line:'private source'},{filename:'https://external.test/private.js',lineno:1,colno:2}]}}]}});
test('monitoring sends only fixed error text and own-origin numeric stack locations',()=>{
 const safe=sanitiseEvent(event(),context),body=JSON.stringify(safe);
 assert.equal(safe.exception.values[0].value,'Application error');assert.equal(safe.sdk.settings.infer_ip,'never');assert.equal(safe.release,context.release);
 assert.deepEqual(safe.exception.values[0].stacktrace.frames,[{filename:context.origin+'/index.html',lineno:42,colno:8,in_app:true}]);
 assert.doesNotMatch(body,/private|synthetic@example|1234567890|external|breadcrumbs|request|context_line/);
 assert.deepEqual(Object.keys(safe.tags),['app','dtp_code','dtp_sanitized']);
});
test('foreign and malformed global errors are discarded',()=>{
 const foreign=event();foreign.exception.values[0].stacktrace.frames=[{filename:'https://extension.test/content.js'}];assert.equal(sanitiseEvent(foreign,context),null);assert.equal(sanitiseEvent(null,context),null);
});
test('transport rejects bypassed events, sessions, traces, logs, replay and attachments',()=>{
 const safe=sanitiseEvent(event(),context);
 const result=filterEnvelope([{trace:{private:'data'},event_id:'bad'},[[{type:'event'},safe],[{type:'event'},event()],[{type:'attachment'},'private'],[{type:'session'},{}],[{type:'transaction'},{}],[{type:'log'},{}],[{type:'replay_event'},{}]]],context);
 assert.equal(result[1].length,1);assert.equal(result[0].trace,undefined);assert.equal(result[1][0][1].sdk.settings.infer_ip,'never');
 assert.equal(filterEnvelope([{},[[{type:'event'},event()]]],context),null);
});
test('all SDK data collection is explicitly disabled',()=>{
 assert.equal(DATA_COLLECTION.userInfo,false);assert.equal(DATA_COLLECTION.cookies,false);assert.equal(DATA_COLLECTION.httpHeaders,false);assert.equal(DATA_COLLECTION.urlQueryParams,false);assert.equal(DATA_COLLECTION.frameContextLines,0);assert.deepEqual(DATA_COLLECTION.httpBodies,[]);
});
