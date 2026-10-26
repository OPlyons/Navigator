/* Local/CI static preview. AI requests use a local unavailable response unless a test intercepts them. */
import http from 'node:http';import fs from 'node:fs/promises';import path from 'node:path';
const root=path.resolve(import.meta.dirname,'../dist'),port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.ico':'image/x-icon','.pdf':'application/pdf','.docx':'application/vnd.openxmlformats-officedocument.wordprocessingml.document'};
http.createServer(async(req,res)=>{
 if(req.url?.startsWith('/api/')){res.writeHead(req.url.startsWith('/api/health')?200:503,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({error:'unavailable',environment:'local'}));return;}
 try{const url=new URL(req.url,'http://localhost'),name=decodeURIComponent(url.pathname);const file=path.resolve(root,'.'+(name==='/'?'/index.html':name));if(!file.startsWith(root+path.sep))throw new Error('path');const data=await fs.readFile(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});res.end(data);}catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'0.0.0.0',()=>console.log('Preview listening on '+port));
