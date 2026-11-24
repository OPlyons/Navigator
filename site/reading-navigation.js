(() => {
 'use strict';
 const $=id=>document.getElementById(id);
$('larger-text').addEventListener('click',e=>{const on=document.documentElement.classList.toggle('large');e.currentTarget.setAttribute('aria-pressed',on);e.currentTarget.textContent=on?'Standard text size':'Larger text';});
$('hide-pictures').addEventListener('click',e=>{const on=document.documentElement.classList.toggle('no-pictures');e.currentTarget.setAttribute('aria-pressed',on);e.currentTarget.textContent=on?'Show pictures':'Hide pictures';});
$('reduce-colours').addEventListener('click',e=>{const on=document.documentElement.classList.toggle('reduced-colours');e.currentTarget.setAttribute('aria-pressed',String(on));e.currentTarget.textContent=on?'Show section colours':'Reduce colours';});
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
