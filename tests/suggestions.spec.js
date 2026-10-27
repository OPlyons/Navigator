import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {interceptSentry,mockNavigator,openSupport} from './support.js';
test.beforeEach(async({page})=>{await interceptSentry(page);await mockNavigator(page);});
async function fill(page){await page.getByLabel('Resource name',{exact:true}).fill('Example local games club');await page.getByLabel('Resource website',{exact:true}).fill('https://example.org/club');await page.getByLabel('What does it offer?',{exact:true}).fill('A friendly weekly board games group in Brent.');await page.getByRole('checkbox',{name:/These are public resource details/}).check();}
async function open(page){await openSupport(page);await page.locator('#support [data-suggest-resource]').click();await expect(page.getByRole('dialog',{name:'Tell us about a resource to add',exact:true})).toBeVisible();}
test('resource form is accessible, keyboard friendly and sends nothing before submit',async({page})=>{
 const requests=[];await page.route('**/api/suggest-resource',r=>{requests.push(r.request().postDataJSON());return r.fulfill({status:201,contentType:'application/json',body:JSON.stringify({id:'example-reference',status:'pending_review',sortingMode:'ai'})});});
 await open(page);await expect(page.getByLabel('Resource name',{exact:true})).toBeFocused();await fill(page);expect(requests).toHaveLength(0);
 const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']).analyze()).violations;expect(violations).toEqual([]);
 expect(await page.locator('#resource-suggestion-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth)).toBeTruthy();
 await page.getByRole('button',{name:'Send resource suggestion',exact:true}).click();await expect(page.getByRole('heading',{name:'Thank you for sharing'})).toBeFocused();await expect(page.locator('#resource-suggestion-receipt')).toContainText('saved for review');expect(requests).toHaveLength(1);expect(requests[0].area).toBe('');
 await page.getByRole('button',{name:'Done',exact:true}).click();await expect(page.locator('#support [data-suggest-resource]')).toBeFocused();
});
test('server errors keep the resource details and a retry uses the same form',async({page})=>{
 let attempt=0;await page.route('**/api/suggest-resource',r=>{attempt++;return r.fulfill({status:attempt===1?503:200,contentType:'application/json',body:JSON.stringify(attempt===1?{error:'unavailable'}:{id:'existing-reference',status:'pending_review',duplicate:true})});});
 await open(page);await fill(page);await page.getByRole('button',{name:'Send resource suggestion',exact:true}).click();await expect(page.locator('#resource-suggestion-status')).toContainText('could not confirm');await expect(page.getByLabel('Resource name',{exact:true})).toHaveValue('Example local games club');
 await page.getByRole('button',{name:'Send resource suggestion',exact:true}).click();await expect(page.locator('#resource-suggestion-receipt')).toContainText('already been suggested');
 await page.getByRole('button',{name:'Suggest another resource',exact:true}).click();await expect(page.getByLabel('Resource name',{exact:true})).toHaveValue('');await expect(page.getByLabel('Resource name',{exact:true})).toBeFocused();
 await page.keyboard.press('Escape');await expect(page.locator('#resource-suggestion-dialog')).toBeHidden();
});
test('personal details are stopped locally and privacy information is reachable',async({page})=>{
 let requests=0;await page.route('**/api/suggest-resource',r=>{requests++;return r.abort();});
 await open(page);await fill(page);await page.getByLabel('What does it offer?',{exact:true}).fill('My name is Example and my email is personal@example.org');await page.getByRole('button',{name:'Send resource suggestion',exact:true}).click();await expect(page.locator('#resource-suggestion-status')).toContainText('Remove personal');expect(requests).toBe(0);
 await page.getByRole('link',{name:'How suggestions are handled',exact:true}).click();await expect(page.locator('#resource-suggestion-dialog')).toBeHidden();await expect(page.locator('#resource-suggestion-privacy')).toBeVisible();
});
