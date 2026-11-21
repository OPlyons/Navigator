// Build static guide pages and a progressively enhanced dashboard from one source.
import fs from 'node:fs/promises';
import path from 'node:path';
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const symbols={
 benefits:'<path d="M4 7h16v12H4zM4 10h16"/><circle cx="15.5" cy="14.5" r="1"/>',
 'bank-account':'<path d="m3 8 9-5 9 5H3Zm2 12h14M7 11v6m5-6v6m5-6v6"/>',
 identification:'<rect x="2" y="5" width="20" height="14" rx="2"/><circle cx="8" cy="11" r="2"/><path d="M5 16q3-4 6 0m3-6h4m-4 4h4"/>',
 'legal-advice':'<path d="M12 3v16m-5 2h10M3 7h18M6 7l-3 6h6l-3-6Zm12 0-3 6h6l-3-6Z"/>',
 'starting-work':'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12q9 4 18 0m-9 0v3"/>',
 courses:'<path d="M12 6C9 4 6 4 3 5v13c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v13"/>'};
const icon=id=>'<span class="pg-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round">'+symbols[id]+'</svg></span>';
const routeBody=r=>'<ol class="pg-steps">'+r.steps.map(t=>'<li>'+escape(t)+'</li>').join('')+'</ol><div class="pg-links">'+r.links.map(l=>{if(new URL(l.url).protocol!=='https:')throw Error('Expected HTTPS guide link');return '<a href="'+escape(l.url)+'" target="_blank" rel="noopener noreferrer">'+escape(l.label)+'</a>'}).join('')+'</div>';
const privacy='<p class="pg-footnote">Provider links open in a new tab. Enter personal details only on the provider’s own site.</p>';
export async function buildPracticalGuides({root,out,template}){
 const data=JSON.parse(await fs.readFile(path.join(root,'config/practical-guides.json'),'utf8'));
 const {groups,guides}=data,ids=groups.flatMap(g=>g.guides);
 if(ids.length!==new Set(ids).size||ids.length!==Object.keys(guides).length)throw Error('Every guide needs one group');
 const grid=groups.map((grp,n)=>'<section class="pg-group pg-theme-'+n+'"><h3>'+escape(grp.title)+'</h3><div class="pg-pair">'+grp.guides.map(id=>'<a class="pg-tile" href="/guides/'+id+'/" data-open-guide="'+id+'">'+icon(id)+'<span>'+escape(guides[id].title)+'</span></a>').join('')+'</div></section>').join('');
 const pane=Object.entries(guides).map(([id,g])=>'<template id="pg-template-'+id+'"><p class="pg-question">'+escape(g.question)+'</p><div class="pg-options">'+g.routes.map((r,i)=>'<button type="button" data-route="'+i+'">'+escape(r.title)+'</button>').join('')+'</div>'+g.routes.map((r,i)=>'<section class="pg-route" data-content="'+i+'" hidden><h3 tabindex="-1">'+escape(r.title)+'</h3>'+routeBody(r)+'</section>').join('')+'</template>').join('');
 const launcher='<section class="pg-hub" aria-labelledby="pg-heading"><div class="pg-header"><h2 id="pg-heading">Practical guides</h2><p>Pick a guide for one next step.</p></div><div class="pg-groups">'+grid+'</div></section><dialog class="pg-drawer" id="pg-drawer" aria-labelledby="pg-title"><header class="pg-drawer-head"><div><p class="pg-kicker">Practical guide</p><h2 id="pg-title" tabindex="-1"></h2></div><button type="button" class="pg-close" aria-label="Close practical guide">Close</button></header><button type="button" class="pg-back" hidden>Back to choices</button><div class="pg-body"></div>'+privacy+'</dialog>'+pane;
 if(!template.includes('<!-- practical guides -->'))throw Error('Missing dashboard guide slot');
 for(const [id,g] of Object.entries(guides)){
  if(!/^[a-z-]+$/.test(id)||!symbols[id])throw Error('Unknown guide: '+id);
  const folder=path.join(out,'guides',id);await fs.mkdir(folder,{recursive:true});
  const page='<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+escape(g.title)+' | Community Navigator</title><link rel="icon" href="/assets/favicon-64.png"><link rel="stylesheet" href="/assets/practical-guides.css"></head><body class="pg-standalone"><main><a href="/#support">Back to Community Navigator</a><p class="pg-kicker">Practical guide</p><h1>'+escape(g.title)+'</h1><p>'+escape(g.question)+'</p>'+g.routes.map(r=>'<details><summary>'+escape(r.title)+'</summary>'+routeBody(r)+'</details>').join('')+privacy+'</main></body></html>';
  await fs.writeFile(path.join(folder,'index.html'),page);
 }
 for(const ext of ['css','js'])await fs.copyFile(path.join(root,'site/practical-guides.'+ext),path.join(out,'assets/practical-guides.'+ext));
 const css=await fs.readFile(path.join(root,'site/practical-guides.css'),'utf8');
 return template.replace('<!-- practical guides -->',launcher).replace('</head>','<style>'+css+'</style></head>').replace('</body>','<script src="/assets/practical-guides.js" defer></script></body>');
}
