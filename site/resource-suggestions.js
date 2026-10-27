/* Public resource suggestions only. Nothing is sent until the form is submitted. */
(()=>{'use strict';
 const dialog=document.getElementById('resource-suggestion-dialog'),form=document.getElementById('resource-suggestion-form'),status=document.getElementById('resource-suggestion-status'),success=document.getElementById('resource-suggestion-success'),send=document.getElementById('resource-suggestion-send'),area=document.getElementById('resource-suggestion-area');
 if(!dialog||!form)return;
 for(const [id,label] of Object.entries(window.CNWLNavigatorCore.AREAS))area.append(new Option(id==='wider-support'?'National / UK or England-wide':label,id));
 let opener=null,busy=false;
 for(const button of document.querySelectorAll('[data-suggest-resource]')){
  button.disabled=false;
  button.addEventListener('click',()=>{opener=button;dialog.showModal();button.setAttribute('aria-expanded','true');(success.hidden?document.getElementById('resource-suggestion-name'):document.getElementById('resource-suggestion-done')).focus();});
 }
 const close=()=>{dialog.close();};
 document.getElementById('resource-suggestion-close').addEventListener('click',close);
 document.getElementById('resource-suggestion-privacy-link').addEventListener('click',()=>dialog.close());
 document.getElementById('resource-suggestion-done').addEventListener('click',close);
 dialog.addEventListener('close',()=>{opener?.setAttribute('aria-expanded','false');opener?.focus();});
 // Native modal dialog contains keyboard focus; avoid the page's other dialog shortcuts.
 dialog.addEventListener('keydown',event=>{if(event.key==='Tab'){
  const items=[...dialog.querySelectorAll('button,input,textarea,select,a[href]')].filter(el=>!el.disabled&&el.getClientRects().length),first=items[0],last=items.at(-1);
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
  else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
 }});
 document.getElementById('resource-suggestion-another').addEventListener('click',()=>{form.reset();form.hidden=false;success.hidden=true;status.textContent='';document.getElementById('resource-suggestion-name').focus();});
 const errors={personal_information:'Please describe the resource only. Remove personal contact details, addresses, dates of birth or care information.',website:'Please add a public website starting with https://. Use the resource’s main page, without a sign-in or private link.',agreement:'Please confirm that these are public resource details.',busy:'We have received several suggestions. Please try again later. Your details are still in this form.',invalid_request:'Check the resource name, website and description, then try again.',unavailable:'We could not confirm that your suggestion was saved. Please try again. Your details are still in this form.'};
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy||!form.reportValidity())return;
  const body={name:form.elements.resourceName.value.trim(),website:form.elements.resourceWebsite.value.trim(),description:form.elements.resourceDescription.value.trim(),area:area.value,websiteTrap:form.elements.websiteTrap.value,agreed:form.elements.publicDetails.checked};
  const core=window.CNWLNavigatorCore;
  if(core.sensitiveInput(body.name+' '+body.description)){status.textContent=errors.personal_information;status.focus();return;}
  busy=true;send.disabled=true;send.textContent='Sending suggestion…';form.setAttribute('aria-busy','true');status.textContent='Saving your suggestion and sorting it for review…';
  try{
   const response=await fetch('/api/suggest-resource',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'omit',body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});
   let result;try{result=await response.json();}catch{throw Error('unavailable');}
   if(!response.ok||!['pending_review','reviewed'].includes(result.status)||typeof result.id!=='string')throw Error(Object.hasOwn(errors,result.error)?result.error:'unavailable');
   form.hidden=true;success.hidden=false;status.textContent='';
   document.getElementById('resource-suggestion-receipt').textContent=result.status==='reviewed'?'This resource has already been suggested and reviewed.':result.duplicate?'This resource has already been suggested. It is in the review queue.':'Your resource suggestion has been saved for review.';
   document.getElementById('resource-suggestion-reference').textContent='Reference: '+result.id;
   form.reset();document.getElementById('resource-suggestion-success-heading').focus();
  }catch(error){status.textContent=errors[error.message]||errors.unavailable;status.focus();}
  finally{busy=false;send.disabled=false;send.textContent='Send resource suggestion';form.removeAttribute('aria-busy');}
 });
})();
