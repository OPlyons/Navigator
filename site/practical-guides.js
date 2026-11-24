(()=>{'use strict';
// Carry only the chosen area when a guide takes someone back to the directory.
const directoryLinks=[...document.querySelectorAll('.guide-group a[href^="/#"]')];
const homeLink=document.querySelector('.guide-footer a');
function linkDirectoryArea(){
 const borough=location.hash.match(/^#area-([a-z-]+)$/)?.[1];
 for(const link of directoryLinks){
  const target=link.hash.split('/')[0];
  link.setAttribute('href','/'+target+(borough?'/'+borough:''));
 }
 if(homeLink)homeLink.href=borough&&borough!=='all'?'/#area-'+borough:'/#support';
}
linkDirectoryArea();
window.addEventListener('hashchange',linkDirectoryArea);

const drawer=document.querySelector('#pg-drawer');
if(!drawer||typeof drawer.showModal!=='function')return;
const title=drawer.querySelector('#pg-title'),body=drawer.querySelector('.pg-body'),back=drawer.querySelector('.pg-back');
let launcher,chosen;
for(const link of document.querySelectorAll('[data-open-guide]')){
 link.setAttribute('aria-haspopup','dialog');link.setAttribute('aria-controls',drawer.id);
 link.addEventListener('click',e=>{
  if(e.defaultPrevented||e.button!==0||e.metaKey||e.altKey||e.ctrlKey||e.shiftKey)return;
  const source=document.getElementById('pg-template-'+link.dataset.openGuide);
  if(!source||drawer.open)return;
  e.preventDefault();launcher=link;chosen=null;back.hidden=true;
  body.replaceChildren(source.content.cloneNode(true));title.textContent=link.textContent.trim();
  drawer.showModal();drawer.scrollTop=0;title.focus();
 });
}
body.addEventListener('click',e=>{
 const button=e.target.closest('button[data-route]');if(!button)return;
 const route=body.querySelector('[data-content="'+button.dataset.route+'"]');if(!route)return;
 chosen=button;body.querySelector('.pg-options').hidden=true;body.querySelector('.pg-question').hidden=true;
 route.hidden=false;back.hidden=false;drawer.scrollTop=0;route.querySelector('h3').focus();
});
back.addEventListener('click',()=>{
 for(const route of body.querySelectorAll('[data-content]'))route.hidden=true;
 back.hidden=true;body.querySelector('.pg-question').hidden=false;body.querySelector('.pg-options').hidden=false;
 drawer.scrollTop=0;chosen?.focus();
});
drawer.querySelector('.pg-close').addEventListener('click',()=>drawer.close());
drawer.addEventListener('close',()=>{launcher?.focus();body.replaceChildren();});
})();
