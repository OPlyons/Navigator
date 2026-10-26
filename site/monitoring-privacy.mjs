/* No arbitrary messages, request data or browser state cross this boundary. */
export const ERROR_CODES=Object.freeze({javascript_error:'Application error',navigator_unavailable:'Community Navigator temporarily unavailable',directory_unavailable:'Support directory temporarily unavailable',monitoring_check:'Community Navigator monitoring check'});
export const DATA_COLLECTION=Object.freeze({userInfo:false,cookies:false,httpHeaders:false,httpBodies:[],urlQueryParams:false,graphQL:{document:false,variables:false},genAI:{inputs:false,outputs:false},mcp:{inputs:false,outputs:false},databaseQueryData:false,queues:false,stackFrameVariables:false,frameContextLines:0});
const errorTypes=new Set(['Error','TypeError','ReferenceError','RangeError','SyntaxError','URIError','AggregateError','UnhandledRejection']);
const safeNumber=v=>Number.isInteger(v)&&v>=0&&v<10000000?v:undefined;
export function sanitiseEvent(event,context){
 try{
  if(!event||typeof event!=='object')return null;
  const code=Object.hasOwn(ERROR_CODES,event.tags?.dtp_code)?event.tags.dtp_code:'javascript_error';
  const rawValues=Array.isArray(event.exception?.values)?event.exception.values:[];
  let anyOriginalFrames=false;
  const values=rawValues.slice(0,3).map(value=>{
   const originalFrames=Array.isArray(value.stacktrace?.frames)?value.stacktrace.frames:[];anyOriginalFrames||=originalFrames.length>0;
   const frames=originalFrames.slice(-25).flatMap(frame=>{
    try{const url=new URL(frame.filename,context.origin);if(url.origin!==context.origin||!['/','/index.html','/assets/monitoring.js'].includes(url.pathname))return [];return [{filename:url.origin+url.pathname,lineno:safeNumber(frame.lineno),colno:safeNumber(frame.colno),in_app:true}];}catch{return [];}
   });
   return {type:errorTypes.has(value.type)?value.type:'Error',value:ERROR_CODES[code],...(frames.length?{stacktrace:{frames}}:{})};
  });
  if(code==='javascript_error'&&anyOriginalFrames&&!values.some(v=>v.stacktrace?.frames?.length))return null;
  if(!values.length)values.push({type:'Error',value:ERROR_CODES[code]});
  return {event_id:/^[a-f0-9]{32}$/i.test(event.event_id||'')?event.event_id:undefined,timestamp:typeof event.timestamp==='number'&&Number.isFinite(event.timestamp)?event.timestamp:Date.now()/1000,platform:'javascript',level:'error',release:context.release,environment:context.environment,tags:{app:'community-navigator',dtp_code:code,dtp_sanitized:'1'},exception:{values},sdk:{name:'sentry.javascript.browser',version:'11.9.0',settings:{infer_ip:'never'}}};
 }catch{return null;}
}
export function filterEnvelope(envelope,context){
 try{
  const items=Array.isArray(envelope?.[1])?envelope[1]:[];
  const safeItems=items.flatMap(item=>{const [header,payload]=item;if(header?.type!=='event'||payload?.tags?.app!=='community-navigator'||payload.tags.dtp_sanitized!=='1'||!Object.hasOwn(ERROR_CODES,payload.tags.dtp_code))return [];const safe=sanitiseEvent(payload,context);return safe?[[{type:'event'},safe]]:[];});
  if(!safeItems.length)return null;
  return [{event_id:safeItems[0][1].event_id,sent_at:new Date().toISOString()},safeItems];
 }catch{return null;}
}
