import {test,expect} from '@playwright/test';
import {mockNavigator,interceptSentry,openSupport,housingIntent,records} from './support.js';

test.beforeEach(async({page})=>{await interceptSentry(page);});
test('standalone home and navigation open the navigator',async({page})=>{
 await page.goto('/');await expect(page.locator('.page.active h1')).toHaveText('Find support');await expect(page.locator('#service-search')).toBeEnabled();
 await expect(page).toHaveTitle('Find support | Community Navigator');
 await page.getByRole('link',{name:'Discharge calls ↗',exact:true}).getAttribute('href').then(h=>expect(h).toBe('https://dtp.lxportal.space/'));
 await page.locator('nav[aria-label="Main navigation"]').getByRole('link',{name:'Printable directories',exact:true}).click();await expect(page.locator('.page.active h1')).toHaveText('Printable local directories');
});
test('staff area links open matching support without sharing form information',async({page})=>{
 await page.goto('/#area-harrow');await expect(page.locator('#area')).toHaveValue('harrow');await expect(page.locator('#resource-list article').first()).toBeVisible();
});
test('privacy warning precedes search and typing sends no AI request',async({page})=>{
 const calls=await mockNavigator(page);await openSupport(page);await expect(page.locator('#navigator-warning')).toContainText('No names, addresses');
 expect(await page.locator('#navigator-warning').evaluate(el=>el.compareDocumentPosition(document.getElementById('service-search'))&Node.DOCUMENT_POSITION_FOLLOWING)).toBeTruthy();
 await page.locator('#service-search').fill('Housing and benefits in Brent');await expect(page.locator('#navigator-results')).toBeHidden();expect(calls).toHaveLength(0);
});
test('AI returns canonical distinct options and clear next steps',async({page})=>{
 const calls=await mockNavigator(page);await openSupport(page);await page.locator('#service-search').fill('I need somewhere to stay tonight and benefits help in Brent');await page.locator('#navigator-submit').click();
 await expect(page.locator('#navigator-cards article')).toHaveCount(3);await expect(page.locator('#navigator-cards article').first()).toHaveAttribute('data-resource-id','brent-housing');
 const ids=await page.locator('#navigator-cards article').evaluateAll(els=>els.map(e=>e.dataset.resourceId));expect(ids.filter(id=>records.find(r=>r.id===id).name.includes('Citizens Advice')).length).toBeLessThanOrEqual(1);
 await expect(page.locator('#navigator-cards')).toContainText('Next step:');await expect(page.locator('#navigator-route-note')).toContainText('do not show available beds');expect(calls).toHaveLength(1);
 expect(new URL(page.url()).search).toBe('');await expect(page.locator('#navigator-result-heading')).toBeFocused();
});
test('area refinement, more results, change search and reset do not add AI calls',async({page})=>{
 const calls=await mockNavigator(page);await openSupport(page);await page.locator('#service-search').fill('Housing and benefits in Brent tonight');await page.locator('#navigator-submit').click();await expect(page.locator('#navigator-results')).toBeVisible();
 await page.locator('#area').selectOption('harrow');await expect(page.locator('#navigator-cards article').first()).toHaveAttribute('data-resource-id','harrow-housing');
 await page.locator('#navigator-more-summary').click();await expect(page.locator('#navigator-more-list article').first()).toBeVisible();
 await page.locator('#navigator-edit').click();await expect(page.locator('#service-search')).toBeFocused();expect(calls).toHaveLength(1);
 await page.locator('#navigator-clear-results').click();await expect(page.locator('#service-search')).toHaveValue('');await expect(page.locator('#area')).toHaveValue('');await expect(page.locator('#navigator-results')).toBeHidden();
});
test('personal identifiers are blocked before the AI request',async({page})=>{
 const calls=await mockNavigator(page);await openSupport(page);
 for(const query of ['NHS number 123 456 7890 needs housing','someone@example.test needs support','DOB 01/02/1990','My name is Example Person and I need advice']){
  await page.locator('#service-search').fill(query);await page.locator('#navigator-submit').click();await expect(page.locator('#navigator-status')).toContainText('remove personal information');
 }
 expect(calls).toHaveLength(0);
});
test('unavailable AI has a labelled local fallback',async({page})=>{
 await page.route('**/api/navigate',route=>route.fulfill({status:503,contentType:'application/json',body:'{"error":"unavailable"}'}));
 await openSupport(page);await page.locator('#service-search').fill('AA meetings in Brent');await page.locator('#navigator-submit').click();await expect(page.locator('#navigator-result-summary')).toContainText('AI is unavailable');await expect(page.locator('#navigator-cards')).toContainText('Alcoholics Anonymous');
});
test('directory filters and one clear action work without AI',async({page})=>{
 const calls=await mockNavigator(page);await openSupport(page);await page.locator('#area').selectOption('harrow');await page.locator('[data-activity="move"]').click();
 await expect(page.locator('#resource-list article').first()).toBeVisible();await page.locator('#service-search').fill('cycling');await page.locator('#navigator-local').click();await expect(page.locator('#resource-list')).toContainText(/cycling/i);
 await page.locator('#clear-filters').click();await expect(page.locator('#service-search')).toHaveValue('');await expect(page.locator('#resource-count')).toContainText(records.length+' listings');expect(calls).toHaveLength(0);
});
test('larger text and phone layouts have no sideways overflow',async({page})=>{
 await mockNavigator(page);await openSupport(page);await page.locator('#reading-options > summary').click();await page.locator('#larger-text').click();
 expect(await page.locator('html').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
 await page.locator('#service-search').fill('Housing and benefits in Brent tonight');await page.locator('#navigator-submit').click();await expect(page.locator('#navigator-cards article')).toHaveCount(3);
 expect(await page.locator('html').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
});
