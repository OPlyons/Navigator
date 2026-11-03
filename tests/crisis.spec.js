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
