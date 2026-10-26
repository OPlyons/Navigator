import {test,expect} from '@playwright/test';
import {interceptSentry,mockNavigator,openSupport,records} from './support.js';
test.beforeEach(async({page})=>{await interceptSentry(page);});
test('wizard, borough map and support icons share the opening dashboard',async({page,isMobile})=>{
 const calls=await mockNavigator(page);
 if(!isMobile)await page.setViewportSize({width:1280,height:720});
 await page.goto('/');await page.locator('nav[aria-label="Main navigation"]').getByRole('link',{name:'Find support',exact:true}).click();await expect(page.locator('#service-search')).toBeEnabled();
 await expect(page.locator('.wizard-panel')).toBeVisible();await expect(page.locator('#borough-map')).toBeVisible();await expect(page.locator('#activity-choices')).toBeVisible();
 const workforce=page.locator('#workforce-advice-link');await expect(workforce).toBeVisible();await expect(workforce).toHaveAttribute('href','https://map.lxportal.space/');await expect(workforce).toHaveAttribute('target','_blank');await expect(workforce).toContainText('on behalf of the service user');await expect(workforce).toContainText('Not a referral process.');
 await expect(page.locator('[data-search-mode]')).toHaveCount(0);await expect(page.locator('#activity-choices > button')).toHaveCount(20);
 if(!isMobile){
  const wizard=await page.locator('.wizard-panel').boundingBox(),map=await page.locator('.support-area').boundingBox(),types=await page.locator('.support-types').boundingBox();
  expect(Math.abs(wizard.y-map.y)).toBeLessThan(2);expect(map.x).toBeGreaterThan(wizard.x+wizard.width);expect(types.x).toBeGreaterThan(map.x+map.width);
  const sizing=await page.evaluate(()=>Object.fromEntries(['.brand-inner','.navigation-wrap','.utility-bar','main','.support-heading','.wizard-panel','.support-area','.support-types'].map(selector=>{const n=document.querySelector(selector),s=getComputedStyle(n),r=n.getBoundingClientRect();return[selector,{y:r.y,height:r.height,padding:s.padding,fontSize:s.fontSize,has:document.body.matches(':has(#support.active)')}];})));
  expect(Math.max(wizard.y+wizard.height,map.y+map.height,types.y+types.height),JSON.stringify(sizing)).toBeLessThanOrEqual(720);
  const more=await page.locator('#support-more-filters').boundingBox();expect(more.y+more.height).toBeLessThanOrEqual(720);
  const workforceBox=await workforce.boundingBox();expect(workforceBox.y+workforceBox.height).toBeLessThanOrEqual(wizard.y);expect(workforceBox.y).toBeGreaterThanOrEqual(0);
 }
 expect(calls).toHaveLength(0);
 await test.info().attach('Opening support dashboard',{body:await page.screenshot(),contentType:'image/png'});
});
test('map and support icons refine AI results locally',async({page})=>{
 const calls=await mockNavigator(page);await openSupport(page);await page.locator('#service-search').fill('Housing and benefits in Brent tonight');await page.locator('#navigator-submit').click();
 await expect(page.locator('#navigator-cards article')).toHaveCount(3);await expect(page.locator('#area')).toHaveValue('brent');
 await page.locator('#borough-map [data-area="harrow"]').click();await expect(page.locator('#navigator-cards article').first()).toHaveAttribute('data-resource-id','harrow-housing');
 await page.locator('[data-activity="money"]').click();await expect(page.locator('#navigator-cards article').first()).toBeVisible();
 const ids=await page.locator('#navigator-cards article').evaluateAll(nodes=>nodes.map(n=>n.dataset.resourceId));
 for(const id of ids)expect(['Money and benefits','Legal advice and rights','Voice and advocacy']).toContain(records.find(r=>r.id===id).category);
 expect(calls).toHaveLength(1);
 await page.locator('#navigator-reset').click();await expect(page.locator('#area')).toHaveValue('');await expect(page.locator('#service-search')).toHaveValue('');await expect(page.locator('[data-activity="all"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#navigator-results')).toBeHidden();await expect(page.locator('#support-start')).toBeVisible();
});
test('a support icon and borough browse locally and clear together',async({page})=>{
 const calls=await mockNavigator(page);await openSupport(page);await page.locator('[data-activity="housing"]').press('Enter');await page.locator('#borough-map [data-area="brent"]').click();
 await expect(page.locator('#directory-explorer')).toBeVisible();await expect(page.locator('#resource-list')).toContainText('Brent housing and homelessness');
 await expect(page.locator('[data-activity="housing"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#area')).toHaveValue('brent');
 expect(calls).toHaveLength(0);await page.locator('#clear-filters').click();await expect(page.locator('#resource-count')).toContainText(records.length+' listings');await expect(page.locator('[data-activity="all"]')).toHaveAttribute('aria-pressed','true');
});
test('practical filters are directly available as icons and keep the borough choice',async({page})=>{
 const calls=await mockNavigator(page);await openSupport(page);await page.locator('#area').selectOption('harrow');
 await expect(page.locator('#support-more-filters')).not.toHaveAttribute('open','');
 for(const [id,category] of [['money','Money and benefits'],['legal','Legal advice and rights'],['addictions','Alcohol and drug support']]){
  const icon=page.locator('[data-activity="'+id+'"]');await expect(icon).toBeVisible();await icon.click();
  await expect(icon).toHaveAttribute('aria-pressed','true');await expect(page.locator('#area')).toHaveValue('harrow');
  const cards=page.locator('#resource-list article');await expect(cards.first()).toBeVisible();
  for(const label of await cards.locator('.category').allTextContents())expect(label).toContain(category);
 }
 // Older wider entries without an explicit national flag must remain discoverable.
 await expect(page.locator('#wider-results-hint')).toBeVisible();await page.locator('#matching-wider-support').click();
 await expect(page.locator('#resource-list')).toContainText('Alcoholics Anonymous');
 await page.locator('#clear-filters').click();await expect(page.locator('#resource-count')).toContainText(records.length+' listings');expect(calls).toHaveLength(0);
});
test('wellbeing icons find new local services and include clearly labelled national options',async({page})=>{
 const calls=await mockNavigator(page);await openSupport(page);
 for(const [type,area,query,name] of [
  ['relax','harrow','Soham','Soham Yoga'],
  ['therapy','ealing','Ealing Abbey','Ealing Abbey Counselling Service'],
  ['peers','milton-keynes','Man Cave','The Man Cave UK'],
  ['therapy','ealing','find talking therapies','NHS — find talking therapies']
 ]){
  await page.locator('#navigator-reset').click();await page.locator('#area').selectOption(area);await page.locator('[data-activity="'+type+'"]').click();
  await page.locator('#service-search').fill(query);await page.locator('#navigator-local').click();
  await expect(page.locator('#resource-list')).toContainText(name);
 }
 await expect(page.locator('#resource-list .category').first()).toContainText('National');
 await page.locator('#clear-filters').click();await expect(page.locator('#resource-count')).toContainText(records.length+' listings');
 await expect(page.locator('#service-search')).toHaveValue('');await expect(page.locator('[data-activity="all"]')).toHaveAttribute('aria-pressed','true');expect(calls).toHaveLength(0);
});
test('the compact wizard keeps a local text search available',async({page})=>{
 const calls=await mockNavigator(page);await openSupport(page);await page.locator('#area').selectOption('camden');await page.locator('#service-search').fill('board games');await page.locator('#navigator-local').click();
 await expect(page.locator('#resource-list')).toContainText(/board.game/i);expect(calls).toHaveLength(0);await expect(page.locator('#navigator-results')).toBeHidden();
});
test('Support for icon opens every group and applies or clears the local filter',async({page})=>{
 const calls=await mockNavigator(page);await openSupport(page);
 const trigger=page.locator('#support-for-toggle'),dialog=page.getByRole('dialog',{name:'Support for',exact:true});
 await expect(trigger).toBeEnabled();await expect(dialog).toBeHidden();
 const labels=['Everyone','Women','Men','Neurodivergent people','Disabled people / access','LGBTQ+ people','Trans & non-binary people','Cultural & faith communities','Older people','Young adults','Pregnancy & new parents','Relationships & families','Carers'];
 await trigger.click();await expect(dialog.locator('.audience-choice')).toHaveCount(labels.length);
 expect(await dialog.locator('.audience-choice').allTextContents()).toEqual(labels);
 await expect(dialog.getByRole('button',{name:'Everyone',exact:true})).toBeFocused();
 const ids=await dialog.locator('.audience-choice').evaluateAll(nodes=>nodes.map(n=>n.dataset.audience));
 await page.locator('#support-for-close').click();
 for(const [i,id] of ids.entries()){
  await trigger.click();await dialog.getByRole('button',{name:labels[i],exact:true}).click();await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
  const count=records.filter(r=>!id||(r.audiences||[]).includes(id)).length;
  await expect(page.locator('#resource-count')).toContainText(count+' listings in all areas');
  await expect(page.locator('#audience')).toHaveValue(id);
 }
 await page.locator('#audience-clear').click();await expect(page.locator('#resource-count')).toContainText(records.length+' listings');await expect(page.locator('#audience-selection')).toBeHidden();
 await page.locator('#area').selectOption('harrow');await page.locator('[data-activity="relax"]').click();await page.locator('#service-search').fill('yoga');await page.locator('#navigator-local').click();
 await trigger.click();await dialog.getByRole('button',{name:'Women',exact:true}).click();
 await expect(page.locator('#area')).toHaveValue('harrow');await expect(page.locator('[data-activity="relax"]')).toHaveAttribute('aria-pressed','true');await expect(page.locator('#service-search')).toHaveValue('yoga');
 await expect(page.locator('#resource-list')).toContainText('Well Woman Yoga');await expect(page.locator('#audience-selection')).toContainText('Support for: Women');
 await page.locator('#clear-filters').click();await expect(page.locator('#audience')).toHaveValue('');await expect(trigger).toHaveAttribute('data-selected','false');await expect(page.locator('#resource-count')).toContainText(records.length+' listings');
 expect(calls).toHaveLength(0);
});
test('Support for picker supports keyboard dismissal and reading options',async({page})=>{
 await mockNavigator(page);await openSupport(page);
 const trigger=page.locator('#support-for-toggle'),dialog=page.getByRole('dialog',{name:'Support for',exact:true});
 await trigger.press('Enter');await expect(trigger).toHaveAttribute('aria-expanded','true');await expect(dialog).toBeVisible();
 await dialog.getByRole('button',{name:'Everyone',exact:true}).press('Shift+Tab');await expect(page.locator('#support-for-close')).toBeFocused();
 await page.locator('#support-for-close').press('Shift+Tab');await expect(dialog.getByRole('button',{name:'Carers',exact:true})).toBeFocused();
 await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();await expect(trigger).toHaveAttribute('aria-expanded','false');
 await page.locator('#reading-options > summary').click();await page.locator('#larger-text').click();await page.locator('#hide-pictures').click();await page.locator('#reduce-colours').click();
 await trigger.click();await expect(dialog.locator('.audience-icon').first()).toBeHidden();
 expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
 expect(await page.locator('html').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
 await dialog.getByRole('button',{name:'Trans & non-binary people',exact:true}).press('Enter');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
 await trigger.press('Enter');await expect(dialog.getByRole('button',{name:'Trans & non-binary people',exact:true})).toBeFocused();
 await page.keyboard.press('Escape');await page.locator('#navigator-reset').click();await expect(page.locator('#audience')).toHaveValue('');
});
