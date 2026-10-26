/* Common-needs search, entirely in the browser. No query is stored or sent. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.CNWLNeedsSearch=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const fold=v=>String(v||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('en-GB').replace(/[’']/g,'');
 const corrections={accomodation:'accommodation',accomadation:'accommodation',accomodationn:'accommodation',homless:'homeless',homlessness:'homelessness',benifits:'benefits',benifit:'benefit',benfits:'benefits',solictor:'solicitor',solictors:'solicitors',somewere:'somewhere',somwhere:'somewhere',refferal:'referral',referal:'referral'};
 const tokens=v=>(fold(v).match(/[a-z0-9]+/g)||[]).map(t=>corrections[t]||t);
 const filler=new Set(('a an and are as at be been being but by can could do does for from get getting give had has have help helps helping how i id im in into is it its just like look looking me might more my need needs needing of on or our please person people someone somebody service user users patient client the their them they this to us want wants was we what when where which with would you your').split(' '));
 const labels={housing:'Housing and somewhere to stay','supported-housing':'Housing with support',legal:'Legal advice and rights',benefits:'Benefits and money',debt:'Debt and bills',food:'Food and essentials',meet:'Meeting people'};
 const categoryNeeds={
  'Housing and homelessness':['housing'],
  'Legal advice and rights':['legal'],
  'Money and benefits':['benefits'],
  'Food and essentials':['food'],
  'Social connection and activities':['meet'],
  'Culture, identity and belonging':['meet']
 };
 function parse(raw){
  const all=tokens(raw),normal=all.join(' '),positive=normal.replace(/\b(?:not|no longer) homeless\b/g,'').replace(/\b(?:dont|do not) (?:need|want) (?:legal advice|housing help)\b/g,'');
  let ids=[];
  const housing=/\b(?:homeless\w*|accommodation|shelter|housing|sofa surf\w*|rough sleep\w*)\b|\bsleep(?:ing)? (?:rough|outside|on the streets?)\b|\b(?:somewhere|nowhere|place) (?:safe )?(?:to )?(?:stay|sleep|live)\b|\bno (?:safe )?(?:home|place to stay)\b|\b(?:evict\w*|possession|rent arrears|kicked out)\b|\b(?:losing|lose|lost) (?:my |their |your |the )?(?:home|flat|house)\b/.test(positive);
  const supported=/\b(?:supported|sheltered|supportive) (?:housing|accommodation)|\bhousing with support|\bextra care housing/.test(positive);
  if(housing||supported)ids.push(supported?'supported-housing':'housing');
  if(/\b(?:legal|lawyer\w*|solicitor\w*|legal aid|court|tribunal|discrimination|rights)\b/.test(positive))ids.push('legal');
  if(/\b(?:benefits?|pip|esa|universal credit|pension credit|allowance|welfare)\b|\b(?:money to live|help with money|no income)\b/.test(positive))ids.push('benefits');
  if(/\b(?:debts?|creditors?|bailiffs?|bills?|arrears)\b|\b(?:cant|cannot|unable to) pay\b|\bowe money\b/.test(positive))ids.push('debt');
  if(/\b(?:food ?banks?|food|hungry|hunger)\b|\b(?:nothing|enough) to eat\b/.test(positive))ids.push('food');
  if(/\b(?:lonely|loneliness|isolated|isolation)\b|\b(?:meet people|make friends|find friends|social club|someone to talk to)\b/.test(positive))ids.push('meet');
  const eviction=/\b(?:evict\w*|possession|kicked out|rent arrears)\b|\b(?:losing|lose) (?:my |their |your |the )?(?:home|flat|house)\b/.test(positive);
  const urgent=housing&&(/\b(?:tonight|nowhere|rough|outside|streets?|kicked out)\b/.test(positive)||/\bsomewhere (?:safe )?to (?:stay|sleep)\b/.test(positive));
  const longTerm=/\b(?:council housing|housing register|housing association|social housing|waiting list)\b/.test(positive);
  if(eviction&&!ids.includes('legal'))ids.push('legal');
  const words=all.filter(t=>!filler.has(t));
  return {raw:String(raw||'').trim(),normal,words,needIds:[...new Set(ids)],label:ids.length===1?labels[ids[0]]:ids.length?ids.map(id=>labels[id]).join(' + '):'',urgent:urgent&&!longTerm,eviction,longTerm};
 }
 function index(r){
  const own=[r.name,r.description,...(r.tags||[])].join(' '),extra=[];
  if((r.supportFacets||[]).some(f=>['yoga','wellbeing'].includes(f)))extra.push('holistic wellbeing mind body');
  if((r.supportFacets||[]).includes('talking-therapies'))extra.push('talking therapy talking therapies counselling counseling psychotherapy');
  if((r.supportFacets||[]).includes('peer-support'))extra.push('peer support peer led lived experience mutual support');
  if(/citizens advice/i.test(r.name))extra.push('cab citizens advice bureau');
  if(/board[ -]?games?/i.test(own))extra.push('boardgame boardgames board game board games tabletop gaming');
  for(const [pattern,aliases] of [[/mosque|masjid/i,'mosque mosques masjid muslim islam'],[/church|christian/i,'church churches christian'],[/synagogue|jewish/i,'synagogue synagogues jewish'],[/gurdwara|gurudwara|sikh/i,'gurdwara gurdwaras gurudwara gurudwaras sikh'],[/temple|mandir/i,'temple temples mandir mandirs'],[/quaker/i,'quaker quakers society of friends'],[/humanist/i,'humanist humanists humanism'],[/caf[eé]/i,'cafe cafes coffee shop'],[/\bclubs?\b/i,'club clubs social club social clubs']])if(pattern.test(own))extra.push(aliases);
  const aliases={'Sport and movement':'sports exercise fitness gyms beginners active physical activity','Nature and outdoors':'outdoors gardens gardening walking walks green spaces','Arts and creativity':'arts art craft crafts creative music singing dance hobbies','Social connection and activities':'social friendship loneliness meet company','Faith and belief communities':'faith belief religion worship spiritual spirituality','Disability and neurodiversity':'neurodiversity neurodivergent disability disabled'};
  const text=tokens([r.searchText||'',r.name,r.category,r.description,r.who,r.access,r.check,r.coverage,r.nextStep,...(r.tags||[]),...extra,aliases[r.category]||''].join(' ')).join(' ');
  const needs=new Set([...(r.needs||[]),...(categoryNeeds[r.category]||[])]);
  if(/\b(?:supported|sheltered) (?:housing|accommodation)|\bhousing with support\b/.test(fold(own)))needs.add('supported-housing');
  if(/\b(?:legal|law centre|lawyer|solicitor)\b/.test(fold(own)))needs.add('legal');
  if(r.category==='Money and benefits'&&/\b(?:debt|arrears|bills|creditor|budget)\b/.test(text))needs.add('debt');
  return {text,tokens:new Set(text.split(' ')),name:tokens(r.name).join(' '),needs};
 }
 const leading={housing:['wider-council-homeless-help','shelter','wider-homeless-england'],legal:['wider-civil-legal-advice','wider-law-centres-finder','wider-lawworks-clinic-finder','wider-find-legal-aid-adviser'],benefits:['wider-citizens-advice','turn2us','wider-help-to-claim'],debt:['stepchange','wider-national-debtline','wider-citizens-advice'],food:['wider-help-through-hardship'],'supported-housing':['wider-rethink-supported-housing','wider-housingcare-older-housing'],meet:[]};
 const wordMatch=(item,word)=>word.length<=2?item.tokens.has(word):item.text.includes(word);
 function match(r,q,item){
  if(!q.raw)return true;
  if(q.urgent&&r.housingRoute==='long-term')return false;
  if(q.needIds.length)return q.needIds.some(id=>item.needs.has(id));
  return q.words.length>0&&q.words.every(w=>wordMatch(item,w));
 }
 function score(r,q,item,area){
  if(!q.raw)return 0;
  let value=q.words.reduce((s,w)=>s+(wordMatch(item,w)?10:0)+(item.name.includes(w)?25:0),0);
  if(item.name===q.normal)value+=1000;
  if(q.words.length&&q.words.every(w=>item.name.includes(w)))value+=250;
  if(area&&r.directoryId===area)value+=150;
  for(const id of q.needIds){if(item.needs.has(id))value+=90;const order=(leading[id]||[]).indexOf(r.id);if(order>=0)value+=500-order*50;}
  if(q.needIds.includes('housing')&&area&&r.directoryId===area&&/council|housing options|homelessness help/i.test(r.name))value+=650;
  if(q.urgent&&(r.needs||[]).includes('emergency-housing'))value+=200;
  if(q.eviction&&r.id==='wider-housing-loss-prevention')value+=900;
  if(q.longTerm&&['wider-council-housing-register','wider-housing-association-homes'].includes(r.id))value+=1000;
  return value;
 }
 return {parse,index,match,score,labels};
});
