export async function onRequestGet(context){
 try{return await context.env.NAVIGATOR_API.fetch('https://navigator.internal/health');}
 catch{return Response.json({status:'unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
