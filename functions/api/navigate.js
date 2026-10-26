export async function onRequest(context){
 const request=context.request;
 if(request.method!=='POST')return Response.json({error:'method'},{status:405,headers:{Allow:'POST','Cache-Control':'no-store'}});
 if(request.headers.get('Origin')!==new URL(request.url).origin)return Response.json({error:'origin'},{status:403,headers:{'Cache-Control':'no-store'}});
 try{return await context.env.NAVIGATOR_API.fetch(new Request('https://navigator.internal/navigate',request));}
 catch{return Response.json({error:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
