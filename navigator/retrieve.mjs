import {AREAS,NEEDS,AUDIENCES,fold} from './shared.mjs';

const leading={housing:['wider-council-homeless-help','shelter','wider-homeless-england'],'supported-housing':['wider-rethink-supported-housing'],legal:['wider-civil-legal-advice','wider-law-centres-finder','wider-lawworks-clinic-finder'],benefits:['wider-citizens-advice','turn2us','wider-help-to-claim'],debt:['stepchange','wider-national-debtline'],food:['wider-help-through-hardship']};
const atom=w=>({womens:'woman',women:'woman',female:'woman',mens:'man',men:'man',male:'man',walking:'walk',walks:'walk',outdoors:'outdoor',exercise:'fitness',exercises:'fitness',workout:'fitness',movement:'fitness',autistic:'autism',appeals:'appeal',challenge:'appeal',challenging:'appeal',boardgames:'boardgame',games:'game',gaming:'game'}[w]||w.replace(/ies$/,'y').replace(/s$/,''));
const generic=new Set(['a','an','the','and','or','of','for','to','in','support','group','community','activity','advice','service','help']);
function wordMatch(text,term){
 if(term.length<4)return new RegExp('\\b'+term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(text);
 if(text.includes(term))return true;
 const wanted=term.split(' ').map(atom).filter(w=>w&&!generic.has(w));if(!wanted.length)return false;
 const actual=new Set(text.split(' ').map(atom));
 return wanted.every(w=>actual.has(w));
}
export function indexResource(r){
 let own=fold([r.name,r.description,...(r.tags||[])].join(' '));
 let text=fold([own,r.category,r.who,r.access,r.check,r.coverage,r.nextStep,...(r.audiences||[])].join(' '));
 if(/board ?games?/.test(text))text+=' board games boardgame tabletop';
 if(/citizens advice/.test(text))text+=' cab';
 if(/alcoholics anonymous/.test(text))text+=' aa';
 if(/narcotics anonymous/.test(text))text+=' na';
 if(/mosque|masjid/.test(text))text+=' mosque mosques masjid muslim';
 if(/church/.test(text))text+=' churches christian';
 if(/synagogue/.test(text))text+=' jewish';
 if(/gurdwara|gurudwara/.test(text))text+=' sikh';
 const needs=new Set(r.needs||[]);
 for(const [id,n] of Object.entries(NEEDS))if(n.categories.includes(r.category))needs.add(id);
 if(!/supported housing|sheltered housing|supported accommodation|housing with support/.test(text))needs.delete('supported-housing');
 for(const [id,re] of Object.entries({housing:/\b(?:housing|homeless\w*|evict\w*)\b/,legal:/\b(?:legal advice|law centre|solicitor\w*|legal aid)\b/,benefits:/\b(?:benefits|universal credit|pip|welfare rights)\b/,debt:/\b(?:debt|arrears|bills|creditor)\b/,food:/\b(?:foodbank|food bank|emergency food|community kitchen)\b/,outdoors:/\b(?:walking|walks|nature|conservation|gardening)\b/,faith:/\b(?:faith|muslim|mosque|synagogue|sikh|christian|church|worship)\b/,meet:/\b(?:social|friendship|befriending|meet up|meetup|peer support)\b/}))if(re.test(own))needs.add(id);
 return {text,own,name:fold(r.name),needs};
}
export function searchDirectory(catalog,intent,choices={},raw=''){
 const selectedArea=Object.hasOwn(AREAS,choices.area)?choices.area:'';
 const area=selectedArea||(choices.area==='all'?'':intent.area);
 const requiredAudience=Object.hasOwn(AUDIENCES,choices.audience)?choices.audience:'';
 const query=fold(raw),urgent=intent.urgency==='tonight',eviction=/\beviction|\bevicted|\bpossession|\brent arrears|\blandlord\b.*\b(?:out|leave|notice)\b/.test(query);
 const longTerm=/\bcouncil housing|\bhousing register|\bhousing association|\bwaiting list/.test(query)&&!urgent;
 const keywords=intent.keywords.filter(k=>!intent.exclude.includes(k));
 const matches=[];
 for(const r of catalog.resources){
  if(area&&r.directoryId!==area&&r.directoryId!=='wider-support')continue;
  if(requiredAudience&&!(r.audiences||[]).includes(requiredAudience))continue;
  if(choices.topic&&r.category!==choices.topic)continue;
  const x=r.navigatorIndex||indexResource(r);
  if(urgent&&r.housingRoute==='long-term')continue;
  if(intent.preferences.includes('gentle')&&/intermediate.{0,20}advanced|intermediate or above|experienced players/.test(x.text))continue;
  if(intent.exclude.some(w=>wordMatch(x.own,w)))continue;
  const matchedNeeds=intent.needs.filter(n=>x.needs.has(n));
  const keywordHits=keywords.filter(w=>wordMatch(x.text,w));
  const exactName=x.name===query||keywords.some(k=>x.name===k);
  if(intent.specific&&keywords.length&&!keywordHits.length)continue;
  if(intent.needs.length&&!matchedNeeds.length&&!exactName)continue;
  if(!intent.needs.length&&keywords.length&&!keywordHits.length)continue;
  if(!intent.needs.length&&!keywords.length)continue;
  let score=matchedNeeds.length*85+keywordHits.length*95+(area&&r.directoryId===area?160:0)+(exactName?1000:0);
  if(/\badvice\b/.test(query)&&/\badvice\b/.test(x.own))score+=150;
  for(const k of keywordHits){if(wordMatch(x.name,k))score+=160;else if(wordMatch(x.own,k))score+=85;}
  const audienceHits=intent.audiences.filter(a=>(r.audiences||[]).includes(a));score+=audienceHits.length*180;
  for(const need of matchedNeeds){const order=(leading[need]||[]).indexOf(r.id);if(order>=0)score+=350-order*45;}
  if(area&&r.directoryId===area&&intent.needs.includes('housing')&&r.category==='Housing and homelessness'&&(/council|borough of/.test(fold(r.sourceOwner))||/council|housing options|homelessness help|housing and homelessness/.test(x.name)))score+=850;
  if(eviction&&r.id==='wider-housing-loss-prevention')score+=1300;
  if(longTerm&&['wider-council-housing-register','wider-housing-association-homes'].includes(r.id))score+=1100;
  if(intent.needs.includes('benefits')&&area&&r.directoryId===area&&/citizens advice/.test(x.name))score+=450;
  if(/\bpip\b/.test(query)&&/\b(?:refused|refusal|appeal|challenge|decision)\b/.test(query)&&['wider-advicenow-pip-challenge','wider-benefit-appeal-guidance'].includes(r.id))score+=1200;
  if(intent.needs.includes('housing')&&/\b(?:veteran|armed forces|ex forces)\b/.test(query)&&r.id==='wider-op-fortitude')score+=1400;
  if(intent.needs.includes('housing')&&intent.audiences.includes('lgbtq')&&r.id==='wider-akt-housing'&&intent.audiences.includes('young-adults'))score+=1400;
  if(intent.needs.includes('supported-housing')&&x.needs.has('supported-housing'))score+=500;
  const matchedPreferences=[];
  if(intent.preferences.includes('online')&&/\b(?:online|webchat|web chat|email|e mail|textphone|text message|bsl|video call)\b/.test(fold(r.access))&&!/\b(?:no online|no email|telephone only|phone only)\b/.test(fold(r.access))){score+=90;matchedPreferences.push('online');}
  if(intent.preferences.includes('free')&&/\b(?:free|no charge|no cost|pay what you can|donation)\b/.test(fold([r.check,r.access].join(' ')))){score+=50;matchedPreferences.push('free');}
  if(intent.preferences.includes('gentle')&&/\b(?:gentle|beginner|beginners|slow|quiet|easy|low impact)\b/.test(x.text)){score+=60;matchedPreferences.push('gentle');}
  if(intent.preferences.includes('dropin')&&/\b(?:drop in|dropin|no booking|no referral|without a referral|no voucher)\b/.test(fold(r.access))){score+=220;matchedPreferences.push('dropin');}
  matches.push({id:r.id,score,matchedNeeds,keywordHits,audienceHits,matchedPreferences});
 }
 matches.sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 const chosen=[];
 const family=hit=>{const r=catalog.resources.find(r=>r.id===hit.id);if(/citizens advice/.test(fold(r.name)))return 'citizens-advice';if(r.id==='wider-council-homeless-help'||(r.category==='Housing and homelessness'&&/council|borough of/.test(fold(r.sourceOwner))))return 'council-housing';return r.id;};
 const distinct=hit=>!chosen.some(other=>family(other)===family(hit));
 if(matches.length)chosen.push(matches[0]);
 // Give separate needs a useful starting point instead of three versions of one service.
 for(const need of intent.needs){if(chosen.length>=3)break;if(chosen.some(x=>x.matchedNeeds.includes(need)))continue;const hit=matches.find(x=>!chosen.includes(x)&&distinct(x)&&x.matchedNeeds.includes(need));if(hit)chosen.push(hit);}
 for(const hit of matches){if(chosen.length===3)break;if(!chosen.includes(hit)&&distinct(hit))chosen.push(hit);}
 const missingNeeds=intent.needs.filter(n=>!matches.some(x=>x.matchedNeeds.includes(n)));
 return {area,areaLabel:AREAS[area]||'All areas',top:chosen,more:matches.filter(x=>!chosen.includes(x)),count:matches.length,missingNeeds,urgent,eviction,longTerm};
}
