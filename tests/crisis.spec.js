import {test,expect} from '@playwright/test';
import {interceptSentry,openSupport} from './support.js';
import AxeBuilder from '@axe-core/playwright';
test.beforeEach(async({page})=>{await interceptSentry(page);});
test('red crisis button is visible across pages and opens direct emergency help without AI',async({page})=>{
 let calls=0;await page.route('**/api/navigate',route=>{calls++;return route.abort();});
 await openSupport(page);
 const button=page.getByRole('link',{name:'Crisis help',exact:true});
 await expect(button).toBeVisible();await expect(button).toHaveCSS('background-color','rgb(180, 35, 50)');
 await button.click();await expect(page).toHaveURL(/#urgent$/);
 await expect(page.getByRole('heading',{name:'Crisis help',exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'Call 999',exact:true})).toHaveAttribute('href','tel:999');
 await expect(page.getByRole('link',{name:'Call NHS 111',exact:true})).toHaveAttribute('href','tel:111');
 expect(calls).toBe(0);
 await page.goto('/#privacy');await expect(button).toBeVisible();
 expect(await page.locator('html').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBeTruthy();
});
test('selected support borough opens its crisis routes and all areas remain available',async({page})=>{
 await openSupport(page);await page.locator('#area').selectOption('hillingdon');
 await page.locator('#crisis-help-button').click();
 await expect(page.locator('#crisis-area-hillingdon')).toHaveAttribute('open','');
 await expect(page.locator('#crisis-area-hillingdon')).toContainText('only after assessment and referral by Hillingdon A&E');
 await page.locator('#crisis-borough').selectOption('westminster');
 await expect(page.locator('#crisis-area-westminster')).toContainText('limited support and no phone contact');
 await expect(page.locator('#crisis-area-westminster')).toContainText('not a direct walk-in');
 await expect(page.locator('.crisis-borough-card')).toHaveCount(9);
 await page.locator('#crisis-borough').selectOption('camden');await expect(page.locator('#crisis-area-camden')).toContainText('Camden Crisis Sanctuary');
 expect(await page.locator('html').evaluate(e=>e.scrollWidth<=e.clientWidth)).toBeTruthy();
});
test('expanded crisis guidance is keyboard accessible and passes axe',async({page})=>{
 await page.goto('/#urgent');
 await page.locator('#crisis-borough').selectOption('surrey');
 await expect(page.locator('#crisis-area-surrey > summary')).toBeFocused();
 const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']).analyze();expect(audit.violations).toEqual([]);
});

test('MHCAS catchment and the two Milton Keynes SPA routes are readable on screen',async({page})=>{
 await page.goto('/#urgent');
 for(const area of ['brent','harrow','hillingdon','kensington-chelsea','westminster']){
  await page.locator('#crisis-borough').selectOption(area);
  const card=page.locator('#crisis-area-'+area);
  await expect(card).toContainText('For residents of Brent, Harrow, Hillingdon, Kensington and Chelsea or Westminster.');
  await expect(card).toContainText('Walk in 24/7, no referral needed');
 }
 await page.locator('#crisis-borough').selectOption('milton-keynes');
 const card=page.locator('#crisis-area-milton-keynes');
 await expect(card).toContainText('Milton Keynes SPA: 01908 724365 (24/7 crisis help)');
 await expect(card).toContainText('Central CNWL SPA: 0800 0234 650 (Milton Keynes out-of-hours cover)');
 expect(await page.locator('html').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
 const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']).analyze();
 expect(audit.violations).toEqual([]);
});
