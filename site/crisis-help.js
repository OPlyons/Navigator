(()=>{'use strict';
const picker=document.getElementById('crisis-borough'),button=document.getElementById('crisis-help-button');
const notice=document.createElement('p');notice.className='crisis-limit';notice.hidden=true;
picker.before(notice);
function reveal(area,focus=false){
 const section=document.getElementById('crisis-area-'+area);
 for(const card of document.querySelectorAll('.crisis-borough-card[open]'))if(card!==section)card.open=false;
 picker.value=section?area:'';
 const name=window.CNWLNavigatorCore?.AREAS[area];
 notice.hidden=Boolean(section)||!name||area==='wider-support';
 notice.textContent=notice.hidden?'':'There is no local crisis guide for '+name+' here yet. Use the NHS help at the top of this page.';
 if(!section)return;
 section.open=true;
 if(focus){section.querySelector('summary').focus();section.scrollIntoView({block:'nearest'});}
}
picker.addEventListener('change',()=>reveal(picker.value,true));
button.addEventListener('click',()=>reveal(document.getElementById('area')?.value));
})();
