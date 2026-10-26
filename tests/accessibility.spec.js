import {test,expect} from '@playwright/test';import AxeBuilder from '@axe-core/playwright';
import {interceptSentry,mockNavigator,openSupport} from './support.js';
test.beforeEach(async({page})=>{await interceptSentry(page);});
async function audit(page){const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']).analyze();expect(result.violations).toEqual([]);}
for(const route of ['support','resources','privacy','contact','accessibility','urgent'])test('axe: '+route,async({page})=>{await page.goto('/#'+route);await audit(page);});
test('axe: Navigator initial and results',async({page})=>{await mockNavigator(page);await openSupport(page);await audit(page);await page.locator('#service-search').fill('Housing and benefits in Brent tonight');await page.locator('#navigator-submit').click();await expect(page.locator('#navigator-results')).toBeVisible();await audit(page);});
test('axe: map and directory filters',async({page})=>{await openSupport(page);await page.locator('#area').selectOption('brent');await page.locator('.directory-filter-options > summary').click();await audit(page);});
test('axe: Support for icon picker',async({page})=>{await openSupport(page);await page.locator('#support-for-toggle').click();await expect(page.getByRole('dialog',{name:'Support for',exact:true})).toBeVisible();await audit(page);});
