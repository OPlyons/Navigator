export async function onRequest(context){
 const {request,env}=context;
 const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(request.method!=='POST')return Response.json({error:'method'},{status:405,headers:{...headers,Allow:'POST'}});
 const origin=new URL(request.url).origin;
 if(request.headers.get('Origin')!==origin||!['https://navigator.lxportal.space','https://cnwl-community-navigator.pages.dev'].includes(origin))return Response.json({error:'origin'},{status:403,headers});
 try{
  // Construct a fresh request so no caller-controlled forwarding header becomes a trusted IP.
  const upstream=new Request('https://navigator.internal/suggest-resource',{method:'POST',body:request.body,duplex:'half',headers:{'Content-Type':request.headers.get('Content-Type')||'','Origin':origin,'CF-Connecting-IP':request.headers.get('CF-Connecting-IP')||''},signal:request.signal});
  return await env.NAVIGATOR_API.fetch(upstream);
 }catch{return Response.json({error:'unavailable'},{status:503,headers});}
}
