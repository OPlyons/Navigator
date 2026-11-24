(() => {
 'use strict';
 document.documentElement.classList.add('js');
 const $=id=>document.getElementById(id);
 const root=document.documentElement;
 const options=[
  ['larger-text','large','Larger text','Standard text size'],
  ['hide-pictures','no-pictures','Hide pictures','Show pictures'],
  ['reduce-colours','reduced-colours','Reduce colours','Show section colours']
 ];
 const readingKey='navigator-reading-options';
 let saved=[];
 try{saved=(sessionStorage.getItem(readingKey)||'').split(' ');}catch{}
 for(const [id,setting,offLabel,onLabel] of options){
  const button=$(id);
  function apply(on){
   root.classList.toggle(setting,on);
   button.setAttribute('aria-pressed',String(on));
   button.textContent=on?onLabel:offLabel;
  }
  apply(saved.includes(setting));
  button.addEventListener('click',()=>{
   apply(!root.classList.contains(setting));
   const enabled=options.map(option=>option[1]).filter(name=>root.classList.contains(name));
   try{
    if(enabled.length)sessionStorage.setItem(readingKey,enabled.join(' '));
    else sessionStorage.removeItem(readingKey);
   }catch{}
  });
 }
$('print-page').addEventListener('click',()=>window.print());
  const menu=$('menu-toggle'), nav=$('primary-nav');
  function closeMenu(){nav.classList.remove('opened');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open menu');}
  menu.addEventListener('click',()=>{
    if(nav.classList.contains('opened')) return closeMenu();
    nav.classList.add('opened');menu.setAttribute('aria-expanded','true');menu.setAttribute('aria-label','Close menu');
  });
  nav.addEventListener('click',e=>{if(e.target.closest('a'))closeMenu();});
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    if($('reading-options').open){$('reading-options').open=false;$('reading-options').querySelector('summary').focus();return;}
    if(nav.classList.contains('opened')){closeMenu();menu.focus();}
  });
  document.addEventListener('click',e=>{
    const options=$('reading-options');
    if(options.open&&!options.contains(e.target))options.open=false;
  });
  window.addEventListener('hashchange',()=>{closeMenu();$('reading-options').open=false;});
})();
