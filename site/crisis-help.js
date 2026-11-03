(()=>{'use strict';
const picker=document.getElementById('crisis-borough'),button=document.getElementById('crisis-help-button');
function reveal(area,focus=false){
 const section=document.getElementById('crisis-area-'+area);
 if(!section)return;
 picker.value=area;section.open=true;
 if(focus){section.querySelector('summary').focus();section.scrollIntoView({block:'nearest'});}
}
picker.addEventListener('change',()=>reveal(picker.value,true));
button.addEventListener('click',()=>{const area=document.getElementById('area')?.value;if(area)reveal(area);});
})();
