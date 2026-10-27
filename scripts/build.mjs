import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';

const root=path.resolve(import.meta.dirname,'..'),out=path.join(root,'dist');
const read=async p=>fs.readFile(path.join(root,p),'utf8');
const settings=JSON.parse(await read('config/site.json'));
const directory=JSON.parse(await read('data/directory.json'));
let commit=process.env.CF_PAGES_COMMIT_SHA||process.env.GITHUB_SHA||'local';
if(commit==='local'){try{commit=execFileSync('git',['rev-parse','--verify','HEAD'],{cwd:root,stdio:['ignore','pipe','ignore']}).toString().trim();}catch{}}
const release='community-navigator@'+commit;
await fs.rm(out,{recursive:true,force:true});await fs.cp(path.join(root,'public'),out,{recursive:true});
await fs.copyFile(path.join(root,'data/directory.json'),path.join(out,'assets/directory.json'));
const moduleSource=async p=>(await read(p)).replace(/^import .*?;\n/gm,'').replace(/\bexport /g,'');
const core='window.CNWLNavigatorCore=(()=>{\n'+await moduleSource('navigator/shared.mjs')+'\n'+await moduleSource('navigator/retrieve.mjs')+'\nreturn {RELEASE,AREAS,NEEDS,AUDIENCES,PREFERENCES,PRACTICAL_NEEDS,practicalNeeds,practicalResourceNeeds,fold,sensitiveInput,urgentSafetyInput,localIntent,normaliseIntent,indexResource,searchDirectory};\n})();';
let template=await read('site/template.html');
function fill(tag,id,value){const re=new RegExp('(<'+tag+'\\b[^>]*\\bid="'+id+'"[^>]*>)[\\s\\S]*?(</'+tag+'>)','g');let count=0;template=template.replace(re,(_all,open,close)=>{count++;return open+value+close;});if(count!==1)throw new Error('Expected one '+id+', got '+count);}
fill('script','navigator-core',core);fill('script','navigator-ui',await read('site/navigator-ui.js'));fill('script','service-directory',await read('site/directory.js'));fill('script','needs-search-engine',await read('site/needs-search.js'));
fill('style','navigator-design',await read('site/navigator.css'));fill('style','needs-search-design',await read('site/needs-search.css'));
fill('script','public-resources',JSON.stringify({directories:directory.directories,areaDownloads:directory.areaDownloads,directoryRelease:directory.directoryRelease}));
fill('span','directory-coverage',directory.resources.length+' resources');
fill('button','browse-all-areas','Or browse all '+directory.resources.length+' listings →');
template=template.replace('</head>','<style id="support-dashboard-design">'+await read('site/support-dashboard.css')+'</style></head>');
fill('script','navigator-config',JSON.stringify({endpoint:settings.apiPath,release:'community-navigator-v18-2026-10-25'}));
const ingestOrigin=new URL(settings.sentry.dsn).origin;
template=template.replace("script-src 'unsafe-inline'","script-src 'self' 'unsafe-inline'").replace(/connect-src 'self' https:\/\/discharge-community-navigator-dev[^;]+/,"connect-src 'self' "+ingestOrigin);
template=template.replace('</head>','<meta name="application-name" content="Community Navigator"><script src="/assets/monitoring.js?v='+encodeURIComponent(commit)+'"></script></head>');
template=template.replace('The site does not use a call database, built-in visitor tracking or an account sign-in.','The site does not use a call database, visitor tracking or an account sign-in. It sends technical fault reports to Sentry; search text and form entries are excluded.');
template=template.replace('The AI and hosting provider processes requests under its own data arrangements.','The AI and hosting provider processes requests under its own data arrangements. Sentry receives limited technical error information, without search text, form entries or session recordings.');
await build({entryPoints:[path.join(root,'site/monitoring.js')],outfile:path.join(out,'assets/monitoring.js'),bundle:true,minify:false,format:'iife',target:'es2022',sourcemap:false,legalComments:'inline',define:{__DTP_MONITORING_CONFIG__:JSON.stringify({...settings.sentry,release})}});
template=template.replace('</head>','<style>'+await read('site/resource-suggestions.css')+'</style></head>');
template=template.replace('</body>','<script>'+await read('site/resource-suggestions.js')+'</script></body>');
await fs.writeFile(path.join(out,'index.html'),template);
await fs.writeFile(path.join(out,'_routes.json'),JSON.stringify({version:1,include:['/api/*'],exclude:[]}));
await fs.writeFile(path.join(out,'build-info.json'),JSON.stringify({release,commit,resources:directory.resources.length}));
console.log(JSON.stringify({release,resources:directory.resources.length,output:'dist'}));
