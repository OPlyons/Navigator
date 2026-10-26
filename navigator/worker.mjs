import {RELEASE,AREAS,AUDIENCES,intentSchema,buildPrompt,normaliseIntent,sensitiveInput,urgentSafetyInput} from './shared.mjs';

const DEFAULT_ORIGINS=['https://navigator.lxportal.space','https://cnwl-community-navigator.pages.dev','https://dtp.lxportal.space','https://cnwl-discharge-project.pages.dev'];
function headers(origin){return {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Vary':'Origin',...(origin?{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, X-Navigator-Client','Access-Control-Max-Age':'600'}:{})};}
function json(value,status=200,origin='',extra={}){return new Response(JSON.stringify(value),{status,headers:{...headers(origin),...extra}});}
async function boundedJson(request){
 if(Number(request.headers.get('Content-Length')||0)>2048)throw new Error('large');
 if(!request.body)throw new Error('body');
 const reader=request.body.getReader(),parts=[];let size=0;
 try{while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>2048){await reader.cancel();throw new Error('large');}parts.push(value);}}
 finally{reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of parts){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return JSON.parse(new TextDecoder().decode(bytes));
}
/** @satisfies {ExportedHandler<Env>} */
export default {
 async fetch(request,env){
  const url=new URL(request.url),origin=request.headers.get('Origin')||'';
  if(url.pathname==='/health'&&request.method==='GET')return json({release:RELEASE,provider:'Cloudflare Workers AI',searchStorage:false});
  if(url.pathname!=='/navigate')return json({error:'not_found'},404);
  const allowed=[...DEFAULT_ORIGINS,...String(env.PREVIEW_ORIGIN||'').split(',').filter(Boolean)];
  if(!allowed.includes(origin))return json({error:'origin'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:headers(origin)});
  if(request.method!=='POST')return json({error:'method'},405,origin,{Allow:'POST, OPTIONS'});
  if(!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))return json({error:'content_type'},415,origin);
  let body;try{body=await boundedJson(request);}catch{return json({error:'invalid_request'},400,origin);}
  if(!body||typeof body.query!=='string'||body.query.trim().length<3||body.query.length>400)return json({error:'query_length'},400,origin);
  const query=body.query.trim();
  if(sensitiveInput(query))return json({error:'personal_information'},422,origin);
  if(urgentSafetyInput(query))return json({error:'urgent_support'},422,origin);
  const client=request.headers.get('X-Navigator-Client')||'';
  if(!/^[a-f0-9-]{36}$/i.test(client))return json({error:'client'},400,origin);
  try{
   const clientLimit=await env.CLIENT_LIMIT.limit({key:client});
   if(!clientLimit.success)return json({error:'busy'},429,origin,{'Retry-After':'60'});
   const totalLimit=await env.TOTAL_LIMIT.limit({key:'navigator'});
   if(!totalLimit.success)return json({error:'busy'},429,origin,{'Retry-After':'60'});
   // Only one bounded inference. No tools, web browsing, conversation history or content logging.
   const result=await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast',{
    messages:[{role:'system',content:buildPrompt()},{role:'user',content:query}],
    max_tokens:360,temperature:0,response_format:{type:'json_schema',json_schema:intentSchema}
   },{signal:AbortSignal.any([request.signal,AbortSignal.timeout(10000)])});
   let value=result.response??result.choices?.[0]?.message?.content;
   if(typeof value==='string')value=JSON.parse(value);
   const intent=normaliseIntent(value,query);
   return json({release:RELEASE,mode:'ai',intent},200,origin);
  }catch{
   // Errors contain no prompt or provider payload. The page falls back to local search.
   return json({error:'unavailable'},503,origin);
  }
 }
};
