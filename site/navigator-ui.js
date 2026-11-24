/* AI interprets a request; every displayed service comes from the local directory. */
(()=>{'use strict';
 const core=window.CNWLNavigatorCore,$=id=>document.getElementById(id),form=$('directory-search-form'),search=$('service-search'),area=$('area');
 if(!core||!form)return;
 const config=JSON.parse($('navigator-config').textContent);
 const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const client=window.crypto?.randomUUID?.()||Array.from(window.crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('').replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/,'$1-$2-$3-$4-$5');
 let generation=0,controller=null,last=null,catalog=null,shownMore=0;
 let localSearchArea='';
 const localOnly=$('local-search-only');
 // Remember only the search preference. Never store the words someone types.
 try{localOnly.checked=sessionStorage.getItem('navigator-local-search')==='on';}catch{}
 function showSearchPrivacy(){
  $('search-data-note').textContent=localOnly.checked?'Your search stays in this tab.':'Search sends your words to Cloudflare.';
 }
 showSearchPrivacy();
 localOnly.addEventListener('change',()=>{
  stop();clearResults();showSearchPrivacy();
  try{
   if(localOnly.checked)sessionStorage.setItem('navigator-local-search','on');
   else sessionStorage.removeItem('navigator-local-search');
  }catch{}
 });
 const status=text=>{$('navigator-status').textContent=text;};
 const choices=()=>({area:area.value,audience:$('audience').value,topic:$('topic').value});
 function stop(){generation++;controller?.abort();controller=null;$('navigator-submit').disabled=false;form.removeAttribute('aria-busy');}
 function clearResults(){last=null;shownMore=0;$('navigator-results').hidden=true;$('navigator-cards').replaceChildren();$('navigator-more-list').replaceChildren();$('navigator-more').open=false;status('');}
 function link(url,label,cls){const a=make('a',label,cls);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
 function definition(dl,label,value){if(value){dl.append(make('dt',label),make('dd',value));}}
 function card(hit){
  const r=catalog.resources.find(r=>r.id===hit.id);if(!r)return null;
  const article=make('article',undefined,'navigator-card');article.dataset.resourceId=r.id;
  const dir=catalog.directories.find(d=>d.id===r.directoryId);
  const where=r.national?'National ('+(r.coverage||'check service area').replace(/\.$/,'')+')':(dir?.name||'Check service area');
  article.append(make('h3',r.name),make('p',where,'navigator-where'));
  const reasons=[];if(last.result.area&&r.directoryId===last.result.area)reasons.push(last.result.areaLabel);
  reasons.push(...hit.matchedNeeds.slice(0,2).map(id=>core.NEEDS[id].label));
  if(hit.keywordHits.length)reasons.push(hit.keywordHits.slice(0,2).join(', '));
  if(hit.audienceHits.length)reasons.push(hit.audienceHits.map(id=>core.AUDIENCES[id]).join(', '));
  if(reasons.length)article.append(make('p','Matches your search for '+[...new Set(reasons)].join(', ')+'.','navigator-match'));
  const pending=core.unresolvedSourceNotice(r);
  if(pending)article.append(make('p',pending,'source-unconfirmed'));
  else{const next=make('p',undefined,'navigator-next');next.append(make('strong','Next step: '),document.createTextNode(r.nextStep||r.access||'Contact the service to check how to join.'));article.append(next);}
  const links=make('div',undefined,'navigator-contact');
  const url=pending?r.unconfirmedContact?.url:r.url,label=pending?r.unconfirmedContact?.label:'Visit website';
  if(/^https:\/\//.test(url||'')){const a=link(url,label,'button secondary');a.setAttribute('aria-label',label+' for '+r.name+' (opens in a new tab)');links.append(a);}
  if(!pending&&r.phone){const a=make('a','Call '+r.phone,'navigator-phone');a.href='tel:'+r.phone.replace(/[^+0-9]/g,'');a.setAttribute('aria-label','Call '+r.phone+' — '+r.name);links.append(a);}
  article.append(links);
  const details=make('details'),summary=make('summary',pending?'Previously listed details':'Joining details and source');summary.setAttribute('aria-label',summary.textContent+' for '+r.name);details.append(summary,make('p',r.description));
  const dl=make('dl');definition(dl,'Where it helps',r.coverage||dir?.name);definition(dl,'Who it is for',r.who);definition(dl,'How to make contact',r.access);definition(dl,'Costs and things to check',r.check);details.append(dl);
  if(!pending&&/^https:\/\//.test(r.sourceUrl||''))details.append(link(r.sourceUrl,'Source: '+(r.sourceOwner||'provider website')));
  article.append(make('p',(pending?'Last confirmed source check: ':'Last source check: ')+r.lastChecked+(r.sourceCheck?.method==='automated'?' (automated).':'.'),'navigator-checked'));

  if(r.sourceCheck?.method==='automated')details.append(make('p','Source information was checked automatically. Confirm current availability and joining details with the service.'));
  article.append(details);return article;
 }
 function renderMore(){
  if(!last)return;const hits=last.result.more.slice(shownMore,shownMore+9);shownMore+=hits.length;
  for(const hit of hits){const node=card(hit);if(node)$('navigator-more-list').append(node);}
  $('navigator-more-button').hidden=shownMore>=last.result.more.length;
  $('navigator-more-button').textContent='Show '+Math.min(9,last.result.more.length-shownMore)+' more';
 }
 function render(){
  if(!last)return;
  last.result=core.searchDirectory(window.CNWLResourceDirectory.getSearchCatalog(),last.intent,choices(),last.query);const result=last.result;
  $('directory-explorer').hidden=true;$('support-start').hidden=true;$('view-matches').hidden=false;
  $('navigator-results').hidden=false;$('navigator-more-list').replaceChildren();shownMore=0;$('navigator-more').open=false;
  const labels=last.intent.needs.map(id=>core.NEEDS[id].label.toLowerCase());
  $('nd-ai-link').hidden=!(last.intent.audiences.includes('neurodivergent')||$('audience').value==='neurodivergent');
  $('navigator-result-heading').textContent=result.count?'A few places to start':'No close matches yet';
  const scope=result.area?' in '+result.areaLabel:' across local and wider services';
  const needs=labels.length?' for '+labels.join(', '):'';
  $('navigator-result-summary').textContent='We found '+result.count+' '+(result.count===1?'match':'matches')+needs+scope+'.';
  const prefs=$('navigator-preferences');prefs.replaceChildren();
  for(const id of last.intent.preferences)prefs.append(make('span',core.PREFERENCES[id],'navigator-preference'));
  prefs.hidden=!last.intent.preferences.length;
  $('navigator-cards').replaceChildren(...result.top.map(card).filter(Boolean));
  const note=$('navigator-route-note');note.replaceChildren();note.hidden=true;
  if(last.intent.needs.includes('housing')||last.intent.needs.includes('supported-housing')){
   note.hidden=false;
   note.append(make('strong',result.urgent?'Need somewhere safe tonight?':'Housing routes'));
   note.append(make('p',result.urgent?'Contact the council’s homelessness team. If the office is closed, ask for its out-of-hours service. These results are contact routes; they do not show available beds.':'Providers and councils check access and eligibility. These results are contact routes; they do not show available homes.'));
   if(result.urgent){const r=catalog.resources.find(r=>r.id==='wider-council-homeless-help');if(r)note.append(link(r.url,'Find the council’s homelessness contact'));}
  }
  const empty=$('navigator-empty');empty.hidden=!!result.count;
  empty.textContent='Try fewer details, a different area or another support icon. Start again clears every choice.';
  const missing=$('navigator-missing');missing.hidden=!result.missingNeeds.length;
  missing.textContent=result.missingNeeds.length?'No close match for '+result.missingNeeds.map(n=>core.NEEDS[n].label.toLowerCase()).join(', ')+' with these choices. Try another area or browse the directory.':'';
  const clarify=$('navigator-clarify');clarify.hidden=!!result.area||!last.intent.needs.some(n=>['housing','food','meet','sport','outdoors','arts','faith'].includes(n));
  $('navigator-more').hidden=!result.more.length;$('navigator-more-summary').textContent='See '+result.more.length+' more '+(result.more.length===1?'match':'matches');
  $('navigator-limits').textContent='Check the service’s joining details, coverage and current availability. The caller can help find information; the service decides access.'+(last.intent.preferences.includes('online')?' Online or text contact is preferred where it is recorded; check each service’s contact options.':'');
  status(result.count?'Showing '+result.top.length+' of '+result.count+' '+(result.count===1?'match.':'matches.'):'No close matches with these choices.');
 }
 async function navigate(){
  const query=search.value.trim();stop();clearResults();
  if(query.length<3){status('Describe what would help, using at least three letters.');search.focus();return;}
  if(core.sensitiveInput(query)){status('Please remove personal information. Use only the support needed and a borough — no names, addresses, dates of birth, NHS numbers or contact details.');search.focus();return;}
  if(core.urgentSafetyInput(query)){status('This Navigator cannot respond to an urgent safety concern. Open Get urgent help for immediate support routes.');$('navigator-safety').hidden=false;return;}
  $('navigator-safety').hidden=true;
  const id=++generation;controller=new AbortController();const currentController=controller;
  form.setAttribute('aria-busy','true');$('navigator-submit').disabled=true;status('Looking for a few useful starting points…');
  let timeout;
  try{
   catalog=await window.CNWLResourceDirectory.getData();if(!catalog)throw new Error('directory');
   for(const r of catalog.resources)r.navigatorIndex||=core.indexResource(r);
   let intent;
   try{
    timeout=setTimeout(()=>currentController.abort(),12000);
    const response=await fetch(config.endpoint,{method:'POST',mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',headers:{'Content-Type':'application/json','X-Navigator-Client':client},body:JSON.stringify({query}),signal:currentController.signal});
    const payload=await response.json();
    if(!response.ok){if(payload.error==='personal_information')throw new Error('personal_information');if(payload.error==='urgent_support')throw new Error('urgent_support');throw new Error('provider');}
    if(payload.release!==core.RELEASE||payload.mode!=='ai')throw new Error('invalid');
    intent=core.normaliseIntent(payload.intent,query);
   }catch(error){
    if(id!==generation)return;
    if(['personal_information','urgent_support'].includes(error.message))throw error;
    window.DTPMonitoring?.captureCode('navigator_unavailable');
    intent=core.localIntent(query);
    if(!intent.needs.length&&!intent.keywords.length){
     const words=core.fold(query).split(' ').filter(x=>x.length>2&&!['the','and','need','help','with','find','some','looking','please','want','for','support','group','groups','someone'].includes(x));intent.keywords=words.slice(0,6);intent.specific=true;
    }
   }finally{clearTimeout(timeout);}
   if(id!==generation)return;
   if(intent.outOfScope){status('This Navigator finds community groups and practical support. Try a support need such as housing advice, benefits or meeting people. For treatment questions, contact your care team.');return;}
   last={intent,query,result:null};
   if(!area.value&&intent.area)window.CNWLResourceDirectory.setInferredArea(intent.area);
   render();
   $('navigator-result-heading').focus({preventScroll:true});$('navigator-results').scrollIntoView({block:'start',behavior:'auto'});
  }catch(error){if(id===generation){if(error.message!=='personal_information')window.DTPMonitoring?.captureCode('directory_unavailable');status(error.message==='personal_information'?'Please remove personal information and describe only the support needed and borough.':'The directory is unavailable. Please try again, or use the printable directories below.');}}
  finally{clearTimeout(timeout);if(id===generation){form.removeAttribute('aria-busy');$('navigator-submit').disabled=false;controller=null;}}
 }
 function searchInBrowser(){
  stop();clearResults();$('navigator-safety').hidden=true;
  const directory=window.CNWLResourceDirectory;
  const query=search.value.trim();
  const placeClause=query.match(/^(.*?)\s+(?:in|near|around|within|across)\s+(.+)$/i);
  const place=core.fold(placeClause?placeClause[2]:query).replace(/\s*&\s*/g,' and ');
  const areaId=Object.keys(core.AREAS).find(id=>core.fold(core.AREAS[id])===place);
  if(areaId&&(!area.value||area.value===localSearchArea||area.value===areaId)){
   search.value=placeClause?placeClause[1].trim():'';
   localSearchArea=areaId;directory.setInferredArea(areaId);
  }else if(!query&&!area.value&&!$('topic').value&&!$('audience').value&&document.querySelector('[data-activity="all"]')?.getAttribute('aria-pressed')==='true'){
   directory.setInferredArea('all');
  }
  directory.search();
 }
 area.addEventListener('change',()=>{localSearchArea='';});
 function runSearch(){if(localOnly.checked)searchInBrowser();else navigate();}
 form.addEventListener('submit',event=>{event.preventDefault();event.stopImmediatePropagation();runSearch();},true);
 search.addEventListener('input',event=>{event.stopImmediatePropagation();stop();clearResults();$('navigator-safety').hidden=true;},true);
 search.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();form.requestSubmit();}});
 function resetNavigator(){stop();clearResults();localSearchArea='';window.CNWLResourceDirectory.reset();$('navigator-safety').hidden=true;search.focus({preventScroll:true});$('support-heading').scrollIntoView({block:'start',behavior:'auto'});}
 $('navigator-reset').addEventListener('click',resetNavigator);$('navigator-clear-results').addEventListener('click',resetNavigator);
 $('navigator-edit').addEventListener('click',()=>{search.focus();search.scrollIntoView({block:'center',behavior:'auto'});});
 $('clear-filters').addEventListener('click',()=>{stop();clearResults();$('navigator-safety').hidden=true;});
 document.addEventListener('directorychoiceschange',event=>{
  if(last){stop();render();return;}
  $('directory-explorer').hidden=!event.detail.started;
  $('support-start').hidden=event.detail.started;
  $('view-matches').hidden=!event.detail.started;
 });
 $('view-matches').addEventListener('click',()=>{
  const heading=$(last?'navigator-result-heading':'resource-results-heading');
  heading.focus({preventScroll:true});heading.scrollIntoView({block:'start'});
 });
 $('navigator-choose-area').addEventListener('click',()=>{area.focus();area.scrollIntoView({block:'center'});});
 $('navigator-more').addEventListener('toggle',()=>{if($('navigator-more').open&&shownMore===0)renderMore();});
 $('navigator-more-button').addEventListener('click',renderMore);
 window.CNWLNavigatorUI={active:()=>!!last,clear(){stop();clearResults();$('navigator-safety').hidden=true;},example(value){stop();search.value=value;clearResults();search.focus();runSearch();}};
})();
