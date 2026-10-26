/* Area and activity explorer. Search choices stay only in the open page. */
(()=>{'use strict';
 const $=id=>document.getElementById(id),area=$('area'),topic=$('topic'),search=$('service-search'),audience=$('audience');
 const metadata=JSON.parse($('public-resources').textContent),engine=window.CNWLNeedsSearch;
 const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
 const paths={
  all:'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  move:'M9 4l3-1 3 2M9 9l3-3 3 4 4 1M12 7l-1 6-4 6M11 13l5 2 1 6',
  meet:'M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 11a2.5 2.5 0 1 0 0-5M3 20v-3a6 6 0 0 1 12 0v3M17 14a4 4 0 0 1 4 4v2',
  create:'M9 18V5l11-2v13M9 8l11-2M9 18c0 2-6 4-6 1s6-4 6-1zM20 16c0 2-6 4-6 1s6-4 6-1z',
  outdoors:'M12 21v-8M12 16l-4-4M12 17l4-4M5 13C1 8 6 3 11 4c3-5 11-1 9 5 5 5-2 10-6 7-4 3-10 1-9-3z',
  learn:'M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2zM12 6v15',
  practical:'M3 11l9-8 9 8M5 10v11h14V10M10 21v-7h4v7',
  housing:'M3 11l9-8 9 8M5 10v11h14V10M10 21v-7h4v7',
  money:'M3 7h18v13H3zM3 7V4h15v3M16 12h5v5h-5zM17 14.5h.1',
  legal:'M12 3v18M7 21h10M4 6h16M5 6l-3 7h6L5 6zm14 0-3 7h6l-3-7zM2 13c0 4 6 4 6 0m8 0c0 4 6 4 6 0',
  addictions:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM5 5l4 4m6 6 4 4M19 5l-4 4m-6 6-4 4',
  relax:'M12 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM8 10l4-2 4 2 3 4M8 10l-3 4M9 13l-5 5 8 3 8-3-5-5M8 18h8M12 9v6',
  therapy:'M3 4h14v10H9l-5 4v-4H3V4zM17 8h4v12h-3l-4 2v-4h-3M7 8h6M7 11h4',
  peers:'M8 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm9 2a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20v-4a6 6 0 0 1 10-4m1 9v-4a5 5 0 0 1 10 0v4M7 15l3 3 3-3m-3-3v6',
  food:'M5 3v6M8 3v6M11 3v6M5 7h6M8 9v12M18 3c-4 5-4 9 0 9V3zM18 12v9',
  health:'M12 21S2 14 2 8c0-6 8-7 10-1 2-6 10-5 10 1 0 6-10 13-10 13zM7 12h3l2-4 2 7 2-3h3',
  carers:'M9 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM3 21v-5a6 6 0 0 1 10-4M17 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM13 21v-3a4 4 0 0 1 8 0v3',
  access:'M13 4a1.5 1.5 0 1 0 0-.1M12 8v6h6l3 6M12 10H8M10 13a5 5 0 1 0 6 6',
  faith:'M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z',
  everyone:'M12 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21v-4a6 6 0 0 1 12 0v4M5 7a2.5 2.5 0 0 0 0 5M3 15a4 4 0 0 0-2 4M19 7a2.5 2.5 0 0 1 0 5M21 15a4 4 0 0 1 2 4',
  women:'M12 3a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM12 15v7M8 19h8',
  men:'M10 9a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM14 10l7-7M15 3h6v6',
  neurodivergent:'M12 12c-3-5-5-6-7-5-5 2-5 8 0 10 2 1 4 0 7-5 3-5 5-6 7-5 5 2 5 8 0 10-2 1-4 0-7-5z',
  disabled:'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM6 10l6 1 6-1M12 11v4m0 0-3 4m3-4 3 4',
  lgbtq:'M2 20v-5a10 10 0 0 1 20 0v5M6 20v-5a6 6 0 0 1 12 0v5M10 20v-5a2 2 0 0 1 4 0v5',
  trans:'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM12 17v6M9 20h6M16 8l6-6M17 2h5v5M8 8 2 2M2 7V2h5M2 9l7-7',
  'culture-faith':'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2c-6 5-6 15 0 20 6-5 6-15 0-20z',
  older:'M8 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM2 21v-4a6 6 0 0 1 10-4M18 13a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM18 15v3l2 1',
  'young-adults':'M9 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM3 21v-4a6 6 0 0 1 12 0v4M18 2l1.2 3.8L23 7l-3.8 1.2L18 12l-1.2-3.8L13 7l3.8-1.2z',
  'pregnancy-parents':'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 3c4 0 3 5 0 4M8 11h.1M16 11h.1M8 15q4 4 8 0',
  relationships:'M12 21S2 15 2 9c0-6 8-7 10-1 2-6 10-5 10 1 0 6-10 12-10 12zM8 11l4 4 4-4',
  'audience-carers':'M12 12S6 8 6 5c0-3 4-4 6-1 2-3 6-2 6 1 0 3-6 7-6 7zM2 16l5-3 5 2h3a2 2 0 0 1 0 4h-5M2 20l5-1 8 3 7-6a2 2 0 0 0-3-2l-3 3',
 };
 const groups=[
  {id:'all',label:'All support',categories:null},
  {id:'housing',label:'Housing',categories:['Housing and homelessness'],includeNational:true},
  {id:'money',label:'Benefits & money',categories:['Money and benefits'],includeNational:true},
  {id:'food',label:'Food & essentials',categories:['Food and essentials'],includeNational:true},
  {id:'legal',label:'Legal advice',categories:['Legal advice and rights'],includeNational:true},
  {id:'addictions',label:'Alcohol & drugs',categories:['Alcohol and drug support'],includeNational:true},
  {id:'relax',label:'Yoga & relaxation',facets:['yoga','wellbeing'],includeNational:true},
  {id:'therapy',label:'Talking therapies',facets:['talking-therapies'],includeNational:true},
  {id:'peers',label:'Peer support',facets:['peer-support'],includeNational:true},
  {id:'move',label:'Sport & movement',categories:['Sport and movement']},
  {id:'meet',label:'Meet people',categories:['Social connection and activities','Culture, identity and belonging']},
  {id:'create',label:'Arts & music',categories:['Arts and creativity']},
  {id:'outdoors',label:'Outdoors',categories:['Nature and outdoors']},
  {id:'learn',label:'Learn & volunteer',categories:['Learning, work and volunteering']},
  {id:'practical',label:'Practical help',categories:['Food and essentials','Housing and homelessness','Money and benefits','Voice and advocacy','Legal advice and rights','Local service directories']},
  {id:'health',label:'Health & wellbeing',categories:['Mental health and wellbeing','Physical health and care','Alcohol and drug support','Urgent help','Safety and abuse support']},
  {id:'carers',label:'Carers & family',categories:['Carers and family']},
  {id:'access',label:'Disability & access',categories:['Disability and neurodiversity']},
  {id:'faith',label:'Faith & belief',categories:['Faith and belief communities']},
 ];
 // Facets describe an explicitly listed activity, across different broad categories.
 // Do not turn a mention in eligibility or a referral note into an offered service.
 function supportFacets(r){
  const own=[r.name,r.description,...(r.tags||[])].join(' '),facets=new Set(r.facets||[]);
  if(/\byoga\b/i.test(own))facets.add('yoga');
  if(/\b(?:meditation|mindfulness|tai chi|qi ?gong|relaxation|breathwork)\b/i.test(own))facets.add('wellbeing');
  if(/\b(?:counselling|counseling|talking therap(?:y|ies)|psychotherapy|psychotherapist(?:s)?|therapist directory)\b/i.test(own))facets.add('talking-therapies');
  if(/\b(?:peer[ -](?:support|led|mentoring)|mutual (?:aid|support))\b/i.test(own))facets.add('peer-support');
  return [...facets];
 }
 const matchesGroup=(r,g)=>!g||(!g.categories||g.categories.includes(r.category))&&(!g.facets||g.facets.some(f=>(r.supportFacets||[]).includes(f)));
 const audiences=[['women','Women'],['men','Men'],['neurodivergent','Neurodivergent people'],['disabled','Disabled people / access'],['lgbtq','LGBTQ+ people'],['trans','Trans & non-binary people'],['culture-faith','Cultural & faith communities'],['older','Older people'],['young-adults','Young adults'],['pregnancy-parents','Pregnancy & new parents'],['relationships','Relationships & families'],['carers','Carers']];
 for(const [id,label] of audiences)audience.append(new Option(label,id));
 let data=null,loading=null,shown=12,filtered=[],pendingArea=metadata.directories.find(d=>location.hash==='#area-'+d.id)?.id||'',activity='all';
 for(const d of metadata.directories)area.append(new Option(d.name,d.id));
 const normalise=value=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('en-GB');
 const date=value=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return 'Not recorded';return new Date(value+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});};
 function icon(key,cls){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.7');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');if(cls)svg.setAttribute('class',cls);const p=document.createElementNS(svg.namespaceURI,'path');p.setAttribute('d',paths[key]||paths.all);svg.append(p);return svg;}
 const audienceTrigger=$('support-for-toggle'),audienceDialog=$('support-for-dialog');
 const hospitalTrigger=$('after-hospital-toggle'),hospitalDialog=$('after-hospital-dialog');
 const hospitalChoices=[
  ['home','practical','Help at home','Everyday tasks and aftercare','Help at home after hospital and aftercare rights'],
  ['essentials','money','Money and essentials','Benefits, food and household items','Money and essentials after hospital'],
  ['medicines','health','Medicines support','Help from a pharmacist','Help understanding medicines after hospital'],
  ['travel','move','Getting to appointments','Travel help and costs','Help with travel to appointments'],
  ['connection','meet','People and connection','Company, groups and peer support','Meet people and peer support'],
  ['carers','carers','Support for carers','Help and a back-up plan','Carer support and a back-up care plan']
 ];
 const hospitalButtons=hospitalChoices.map(([id,key,label,detail,query])=>{
  const b=make('button',undefined,'after-hospital-choice');b.type='button';b.dataset.hospitalChoice=id;b.setAttribute('aria-label',label);
  b.append(icon(key,'after-hospital-icon'),make('strong',label),make('span',detail));
  b.addEventListener('click',()=>{
   window.CNWLNavigatorUI?.clear();clearTimeout(timer);
   search.value=query;activity='all';topic.value='';audience.value='';shown=12;render();
   hospitalDialog.close('choice');
  });
  $('after-hospital-choices').append(b);return b;
 });
 hospitalTrigger.addEventListener('click',()=>{hospitalDialog.returnValue='';hospitalDialog.showModal();hospitalTrigger.setAttribute('aria-expanded','true');hospitalButtons[0].focus({preventScroll:true});});
 $('after-hospital-close').addEventListener('click',()=>hospitalDialog.close());
 hospitalDialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const first=$('after-hospital-close'),last=hospitalButtons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
 hospitalDialog.addEventListener('close',()=>{hospitalTrigger.setAttribute('aria-expanded','false');if(hospitalDialog.returnValue==='choice')showResults();else hospitalTrigger.focus({preventScroll:true});});
 hospitalDialog.addEventListener('click',event=>{if(event.target!==hospitalDialog)return;const r=hospitalDialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)hospitalDialog.close();});
 window.addEventListener('hashchange',()=>{if(hospitalDialog.open)hospitalDialog.close();});

 const activityButtons=groups.map(g=>{const b=make('button',undefined,'activity-choice');b.type='button';b.dataset.activity=g.id;b.setAttribute('aria-pressed',String(g.id===activity));b.disabled=true;b.append(icon(g.id,'activity-icon'),make('span',g.label));b.addEventListener('click',()=>{activity=g.id;if(g.id==='all'&&!area.value)area.value='all';topic.value='';shown=12;render();});$('activity-choices').insertBefore(b,audienceTrigger);return b;});
 audienceTrigger.prepend(icon('everyone','activity-icon'));
 // Optional group choices use the same local filter as the previous select.
 // Symbols accompany text; no personal details or identity choices are stored.
 const audienceButtons=[['','Everyone'],...audiences].map(([id,label])=>{
  const b=make('button',undefined,'audience-choice');b.type='button';b.dataset.audience=id;b.setAttribute('aria-pressed',String(!id));b.setAttribute('aria-label',label);
  b.append(icon(id==='carers'?'audience-carers':id||'everyone','audience-icon'),make('span',label));
  b.addEventListener('click',()=>{audience.value=id;if(!id&&!area.value)area.value='all';clearTimeout(timer);audience.dispatchEvent(new Event('change',{bubbles:true}));audienceDialog.close();});
  $('audience-choices').append(b);return b;
 });
 audienceTrigger.addEventListener('click',()=>{audienceDialog.showModal();audienceTrigger.setAttribute('aria-expanded','true');audienceButtons.find(b=>b.dataset.audience===audience.value)?.focus({preventScroll:true});});
 $('support-for-close').addEventListener('click',()=>audienceDialog.close());
 audienceDialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const first=$('support-for-close'),last=audienceButtons.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});
 audienceDialog.addEventListener('close',()=>{audienceTrigger.setAttribute('aria-expanded','false');audienceTrigger.focus({preventScroll:true});});
 audienceDialog.addEventListener('click',event=>{if(event.target!==audienceDialog)return;const r=audienceDialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)audienceDialog.close();});
 window.addEventListener('hashchange',()=>{if(audienceDialog.open)audienceDialog.close();});
 const areaButtons=[...document.querySelectorAll('#support button[data-area]')];
 const shapes=[...document.querySelectorAll('[data-map-shape]')];
 for(const b of areaButtons){
  b.addEventListener('click',()=>chooseArea(b.dataset.area));
  const highlight=on=>shapes.find(p=>p.dataset.mapShape===b.dataset.area)?.classList.toggle('is-hovered',on);
  b.addEventListener('mouseenter',()=>highlight(true));b.addEventListener('mouseleave',()=>highlight(false));b.addEventListener('focus',()=>highlight(true));b.addEventListener('blur',()=>highlight(false));
 }
 // The native button labels and the borough shapes choose the same area.
 $('borough-map').addEventListener('click',event=>{const id=event.target.closest('[data-map-shape]')?.dataset.mapShape;if(id&&data)chooseArea(id);});
 function groupFor(category){return groups.find(g=>g.categories?.includes(category))||groups[0];}
 function definition(dl,label,value){if(value)dl.append(make('dt',label),make('dd',value));}
 function resourceCard(r){
  const card=make('article',undefined,'resource-card'),heading=make('h3',r.name),dir=data.directories.find(d=>d.id===r.directoryId),badge=make('span',undefined,'resource-category-icon');badge.setAttribute('aria-hidden','true');badge.append(icon(groupFor(r.category).id));card.append(badge);
  card.append(make('p',[r.category,r.national?'National · '+(r.coverage||'Check service area'):dir?.name].filter(Boolean).join(' · '),'category'),heading,make('p',r.description));
  if(r.nextStep){const step=make('p',undefined,'resource-next-step');step.append(make('strong','Next step: '),document.createTextNode(r.nextStep));card.append(step);}
  const links=make('div',undefined,'contact-links');
  if(/^https?:\/\//.test(r.url||'')){const a=make('a','Website ↗','website-link');a.href=r.url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label','Website ↗ for '+r.name+' (opens in a new tab)');links.append(a);}
  if(r.phone){const a=make('a',r.phone,'phone-link');a.href='tel:'+r.phone.replace(/[^+0-9]/g,'');a.setAttribute('aria-label','Call '+r.name+' on '+r.phone);links.append(a);}
  card.append(links);
  const details=make('details'),summary=make('summary','Joining details');summary.setAttribute('aria-label','Joining details for '+r.name);details.append(summary);
  const dl=make('dl');definition(dl,'Where it helps',r.coverage);definition(dl,'Who it is for',r.who);definition(dl,'How to join or make contact',r.access);definition(dl,'Costs and things to check',r.check);details.append(dl);
  if(/^https?:\/\//.test(r.sourceUrl||'')){const p=make('p'),a=make('a','Source: '+(r.sourceOwner||'provider website'));a.href=r.sourceUrl;a.target='_blank';a.rel='noopener noreferrer';p.append(a);details.append(p);}
  details.append(make('p','Information checked: '+date(r.lastChecked)+'.','checked'));
  const now=new Date(),today=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
  if(r.nextReview&&r.nextReview<today)details.append(make('p','Review due — check current details with the service.','review-due'));
  card.append(details);return card;
 }
 function terms(){return engine.parse(search.value);}
 function withNational(query){return query.needIds.length>0||groups.find(g=>g.id===activity)?.includeNational||['Housing and homelessness','Money and benefits','Food and essentials','Legal advice and rights'].includes(topic.value);}
 function matches(r,query,ignoreArea=false){
  const g=groups.find(g=>g.id===activity)||groups[0];
  const sameArea=ignoreArea||!area.value||area.value==='all'||r.directoryId===area.value;
  const nationalMatch=withNational(query)&&r.national&&r.directoryId==='wider-support';
  return (sameArea||nationalMatch)&&matchesGroup(r,g)&&(!topic.value||r.category===topic.value)&&(!audience.value||(r.audiences||[]).includes(audience.value))&&engine.match(r,query,r.searchIndex);
 }
 function guidance(query,dir){
  const panel=$('need-guidance');panel.replaceChildren();panel.hidden=!query.needIds.length;
  if(panel.hidden)return;
  const id=query.needIds[0];let title=engine.labels[id],body=window.CNWLNavigatorCore.PRACTICAL_NEEDS[id]?.guidance||'',links=[];
  if(id==='housing'){
   title=query.urgent?'Need somewhere to stay?':'Help with housing';
   body=query.longTerm?'Council and housing-association applications are longer-term routes. If there is nowhere safe to stay tonight, contact the council’s homelessness team.':'If there is nowhere safe to stay tonight, contact the council’s homelessness team. Ask for its out-of-hours service if the office is closed.';
   const local=dir&&data.resources.find(r=>r.directoryId===dir.id&&r.category==='Housing and homelessness'&&/council|housing options|homelessness help|housing and homelessness/i.test(r.name));
   links=[local||data.resources.find(r=>r.id==='wider-council-homeless-help'),data.resources.find(r=>r.id==='shelter')];
  }else if(id==='supported-housing'){
   body='Explore housing with support with your care team or adult social care. The provider will check needs, access and any costs.';links=[data.resources.find(r=>r.id==='wider-rethink-supported-housing')];
  }else if(id==='legal'){
   body='Find a legal adviser or a free advice clinic. Each service checks which problems it can help with and whether you meet its criteria.';links=[data.resources.find(r=>r.id==='wider-civil-legal-advice'),data.resources.find(r=>r.id==='wider-law-centres-finder')];
  }else if(id==='benefits'){
   body='An adviser or benefits calculator can help you check possible support. You do not need to know which benefit to ask about first.';links=[data.resources.find(r=>r.id==='wider-citizens-advice'),data.resources.find(r=>r.id==='turn2us')];
  }else if(id==='debt'){
   body='Start with a free debt adviser. They can explain options based on the person’s situation.';links=[data.resources.find(r=>r.id==='stepchange'),data.resources.find(r=>r.id==='wider-national-debtline')];
  }else if(id==='food'){
   body='Ask how to get emergency food or a foodbank voucher. The route can vary; the caller can help find the right contact.';links=[data.resources.find(r=>r.id==='wider-help-through-hardship')];
  }else if(id==='meet')body='Choose one activity that feels manageable. Ask the group about the next session, cost and whether someone can come along.';
  if(id==='carers')body='Find support for you as a carer, as well as help for the person you support.';
  panel.append(make('h3',title),make('p',body));
  if(links.some(Boolean)){const row=make('div',undefined,'need-guidance-links');for(const r of links.filter(Boolean)){const a=make('a',r.name+' ↗');a.href=r.url;a.target='_blank';a.rel='noopener noreferrer';row.append(a);}panel.append(row);}
  if(id==='housing'||id==='supported-housing')panel.append(make('p','These are contact routes, not live housing vacancies.','small-note'));
 }
 function syncChoices(words){
  const counts=Object.fromEntries(data.directories.map(d=>[d.id,0]));
  for(const r of data.resources)if(matches(r,engine.parse(''),true))counts[r.directoryId]++;
  for(const b of areaButtons){const id=b.dataset.area,count=counts[id]||0,selected=area.value===id;const name=data.directories.find(d=>d.id===id).name;
   b.setAttribute('aria-pressed',String(selected));b.removeAttribute('aria-label');const countLabel=b.querySelector('.map-place-count,.area-count');countLabel.removeAttribute('aria-hidden');countLabel.textContent=' '+count+' '+(count===1?'listing':'listings');
  }
  for(const p of shapes){p.classList.toggle('is-selected',p.dataset.mapShape===area.value);p.classList.toggle('no-matches',!counts[p.dataset.mapShape]);}
  for(const b of activityButtons)b.setAttribute('aria-pressed',String(b.dataset.activity===activity&&!topic.value));
  const audienceLabel=audiences.find(a=>a[0]===audience.value)?.[1]||'Everyone';
  for(const b of audienceButtons)b.setAttribute('aria-pressed',String(b.dataset.audience===audience.value));
  audienceTrigger.dataset.selected=String(!!audience.value);audienceTrigger.setAttribute('aria-label','Support for: '+audienceLabel+'. Choose a group');
  $('audience-selection').hidden=!audience.value;$('audience-selection-label').textContent='Support for: '+audienceLabel;
  topic.options[0].textContent=activity==='all'?'All types':'All in this choice';
 }
 function selectedChoices(){
  const choices=[];
  function add(kind,label,clear){const b=make('button',label+' ×','selected-filter');b.type='button';b.setAttribute('aria-label',label+' × — remove '+kind+' filter');b.addEventListener('click',()=>{clearTimeout(timer);clear();pendingArea=area.value;shown=12;areaChanged();$('resource-results-heading').focus({preventScroll:true});});choices.push(b);}
  const dir=data.directories.find(d=>d.id===area.value);
  if(dir)add('area',dir.name,()=>area.value='all');
  if(activity!=='all')add('activity',groups.find(g=>g.id===activity).label,()=>activity='all');
  if(topic.value)add('type',topic.value,()=>topic.value='');
  if(audience.value)add('community',audiences.find(a=>a[0]===audience.value)[1],()=>audience.value='');
  if(search.value.trim())add('search','“'+search.value.trim()+'”',()=>search.value='');
  $('selected-directory-filters').replaceChildren(...choices);$('selected-directory-filters').hidden=!choices.length;
  $('clear-filters').disabled=!choices.length;
 }
 function render(){
  if(!data)return;
  const words=terms(),started=!!(area.value||words.raw||activity!=='all'||topic.value||audience.value),dir=data.directories.find(d=>d.id===area.value),name=dir?.name||'all areas';
  syncChoices(words);selectedChoices();guidance(words,dir);$('directory-start').hidden=started;$('directory-call-note').hidden=!started;
  document.dispatchEvent(new CustomEvent('directorychoiceschange',{detail:{started}}));
  const widerCount=data.resources.filter(r=>r.directoryId==='wider-support'&&matches(r,words,true)&&!(withNational(words)&&r.national)).length;
  $('wider-results-hint').hidden=!dir||dir.id==='wider-support'||!widerCount;
  $('matching-wider-support').textContent='Explore '+widerCount+' more wider '+(widerCount===1?'option':'options')+' →';
  $('area-intro').replaceChildren();if(started)$('area-intro').append(make('p',dir?.name||'Across all areas'));
  const shortcut=hospitalChoices.find(choice=>choice[4]===words.raw);
  const label=shortcut?.[2]||topic.value||(words.label?words.label:(activity==='all'?'Groups, activities and support':groups.find(g=>g.id===activity).label));
  $('resource-results-heading').textContent=started?label:'Your local possibilities';
  if(!started){$('search-interpretation').hidden=true;filtered=[];$('resource-list').replaceChildren();$('directory-empty').hidden=true;$('more-resources').hidden=true;$('directory-print-note').hidden=true;$('resource-count').textContent='Search above, choose an area, or browse all listings.';return;}
  filtered=data.resources.filter(r=>matches(r,words)).sort((a,b)=>engine.score(b,words,b.searchIndex,area.value)-engine.score(a,words,a.searchIndex,area.value));
  $('resource-list').replaceChildren(...filtered.slice(0,shown).map(resourceCard));
  const count=Math.min(shown,filtered.length);
  const audienceLabel=audiences.find(a=>a[0]===audience.value)?.[1];
  const national=dir&&dir.id!=='wider-support'&&withNational(words)?filtered.filter(r=>r.directoryId==='wider-support'&&r.national).length:0;
  const scope=national?(filtered.length-national)+' local in '+name+' + '+national+' national options':filtered.length+' '+(filtered.length===1?'listing':'listings')+' in '+name;
  $('resource-count').textContent=scope+(audienceLabel?' · '+audienceLabel:'')+(words.raw?' matching “'+search.value.trim()+'”':'')+'.'+(filtered.length>count?' Showing '+count+'.':'');
  $('search-interpretation').hidden=!words.needIds.length;
  $('search-interpretation').textContent=shortcut?'Support after hospital. Closest matches first.':words.needIds.length?'Showing help for '+words.needIds.map(id=>engine.labels[id].toLowerCase()).join(' and ')+'. Closest matches first.':'';

  $('directory-empty').hidden=!!filtered.length;$('directory-call-note').hidden=!filtered.length;
  $('more-resources').hidden=shown>=filtered.length;$('more-resources').textContent='Show '+Math.min(12,filtered.length-shown)+' more listings';
  $('directory-print-note').textContent='Printing includes the '+count+' '+(count===1?'listing':'listings')+' shown. Choose “Show more listings” to include more.';$('directory-print-note').hidden=!count;
 }
 function areaChanged(){
  if(!data)return;shown=12;
  const dir=data.directories.find(d=>d.id===area.value);$('area-download').replaceChildren();
  if(dir){const original=$('dl-'+data.areaDownloads[dir.id]);if(original){const a=original.cloneNode(true);a.removeAttribute('id');a.querySelector('span').textContent='Download the '+dir.name+' directory';const detail=make('details');detail.append(make('summary','Printable '+dir.name+' directory'),a);$('area-download').append(detail);}}
  render();
 }
 function chooseArea(id){if(!data)return;area.value=id;area.dispatchEvent(new Event('change',{bubbles:true}));}
 async function load(){
  if(data)return;if(loading)return loading;
  $('resource-count').textContent='Loading the directory…';$('directory-loading-error').hidden=true;$('resource-list').setAttribute('aria-busy','true');
  loading=(async()=>{try{
   const value=JSON.parse(await window.CNWLAssets.text('assets/directory.json'));if(!Array.isArray(value.resources)||!Array.isArray(value.directories))throw new Error('The directory is incomplete.');
   const synonyms={'Sport and movement':'sports exercise fitness gyms clubs groups beginners active physical activity','Nature and outdoors':'outdoor outdoors gardens gardening walking walks green spaces','Arts and creativity':'arts art craft crafts creative music singing dance hobbies','Social connection and activities':'social groups friendship hobbies loneliness meet company','Faith and belief communities':'faith belief religion worship spiritual spirituality'};
   for(const r of value.resources){
    r.supportFacets=supportFacets(r);
    const resourceWords=[r.name,r.description,...(r.tags||[])].join(' ');
    const aliases=(/citizens advice/i.test(r.name)?'cab citizens advice bureau ':'')+((r.audiences||[]).includes('neurodivergent')?'neurodiversity neurodivergent ':'')+(/board[ -]?games?/i.test(resourceWords)?'boardgame boardgames board game board games tabletop games gaming ':'')+(/mosque|masjid/i.test(resourceWords)?'mosque mosques masjid muslim islam ':'')+(/church|christian/i.test(resourceWords)?'church churches christian ':'')+(/synagogue|jewish/i.test(resourceWords)?'synagogue synagogues jewish ':'')+(/gurdwara|gurudwara|sikh/i.test(resourceWords)?'gurdwara gurdwaras gurudwara gurudwaras sikh ':'')+(/temple|mandir/i.test(resourceWords)?'temple temples mandir mandirs ':'')+(/quaker/i.test(resourceWords)?'quaker quakers society of friends ':'')+(/humanist/i.test(resourceWords)?'humanist humanists humanism ':'')+(/caf[eé]/i.test(resourceWords)?'cafe cafes coffee shop ':'')+(/\bclubs?\b/i.test(resourceWords)?'club clubs social club social clubs ':'');
    r.searchText=normalise([r.name,r.category,r.description,r.who,r.access,r.check,aliases,synonyms[r.category]||'',...(r.audiences||[]).map(id=>audiences.find(a=>a[0]===id)?.[1]||id),...(r.tags||[])].join(' '));r.searchTokens=new Set(r.searchText.split(/[^a-z0-9]+/).filter(Boolean));
   }
   for(const r of value.resources)r.searchIndex=engine.index(r);
   data=value;area.value=pendingArea;
   topic.replaceChildren(new Option('All types',''));for(const cat of [...new Set(data.resources.map(r=>r.category))].sort())topic.append(new Option(cat,cat));
   for(const n of [area,topic,search,audience,audienceTrigger,hospitalTrigger,$('clear-filters'),$('browse-all-areas'),...activityButtons,...areaButtons])n.disabled=false;
   $('browse-all-areas').textContent='Or browse all '+data.resources.length+' listings →';$('directory-coverage').textContent=data.resources.length+' resources';
   areaChanged();
  }catch(error){$('resource-count').textContent='The directory could not be loaded.';$('directory-loading-error').hidden=false;console.error('Directory load failed:',error);}
  finally{$('resource-list').removeAttribute('aria-busy');loading=null;}})();return loading;
 }
 const maybeLoad=()=>{if(location.hash==='#support'||$('support').classList.contains('active'))load();};
 window.CNWLResourceDirectory={async getData(){await load();return data;},getSearchCatalog(){const group=groups.find(g=>g.id===activity);return data?{...data,resources:data.resources.filter(r=>matchesGroup(r,group))}:data;},setInferredArea(id){pendingArea=id;area.value=id;areaChanged();},search(){clearTimeout(timer);shown=12;render();showResults();},reset(){reset();},setArea(id){pendingArea=metadata.directories.some(d=>d.id===id)?id:'';area.value=pendingArea;if(data){search.value='';topic.value='';activity='all';audience.value='';areaChanged();}}};
 area.addEventListener('change',()=>{pendingArea=area.value;areaChanged();});
 topic.addEventListener('change',()=>{activity='all';shown=12;render();});
 audience.addEventListener('change',()=>{shown=12;render();});
 $('audience-clear').addEventListener('click',()=>{audience.value='';audience.dispatchEvent(new Event('change',{bubbles:true}));audienceTrigger.focus({preventScroll:true});});
 let timer;search.addEventListener('input',()=>{clearTimeout(timer);timer=setTimeout(()=>{shown=12;render();},180);});
 function showResults(){const h=$('resource-results-heading');h.focus({preventScroll:true});h.scrollIntoView({block:'start',behavior:'auto'});}
 $('directory-search-form').addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);shown=12;render();showResults();});
 function reset(all=false){clearTimeout(timer);topic.value='';activity='all';audience.value='';search.value='';area.value=all?'all':'';pendingArea=area.value;areaChanged();search.focus({preventScroll:true});}
 $('clear-filters').addEventListener('click',()=>reset(true));$('empty-reset').addEventListener('click',()=>reset(true));
 $('empty-wider').addEventListener('click',()=>{search.value='';chooseArea('wider-support');showResults();});
 $('matching-wider-support').addEventListener('click',()=>{chooseArea('wider-support');showResults();});
 $('browse-all-areas').addEventListener('click',()=>{chooseArea('all');showResults();});
 for(const button of document.querySelectorAll('[data-search-example]'))button.addEventListener('click',()=>{if(window.CNWLNavigatorUI?.active()){window.CNWLNavigatorUI.example(button.dataset.searchExample);return;}clearTimeout(timer);search.value=button.dataset.searchExample;activity='all';topic.value='';shown=12;render();showResults();});
 $('directory-retry').addEventListener('click',load);
 $('more-resources').addEventListener('click',()=>{const index=shown;shown+=12;render();const next=$('resource-list').children[index];if(next){next.tabIndex=-1;next.focus();}});
 window.addEventListener('hashchange',maybeLoad);maybeLoad();
})();
