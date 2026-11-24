import {test,expect} from '@playwright/test';
import {interceptSentry,mockNavigator,openSupport,records} from './support.js';

test.beforeEach(async({page})=>{await interceptSentry(page);});

test('the same area and type can each be turned off without resetting the directory',async({page})=>{
 const calls=await mockNavigator(page);
 await openSupport(page);
 const surrey=page.locator('.other-areas [data-area="surrey"]');
 const faith=page.locator('[data-activity="faith"]'),count=page.locator('#resource-count');
 const surreyTotal=records.filter(r=>r.directoryId==='surrey').length;

 await surrey.click();
 await expect(count).toContainText(surreyTotal+' listings in Surrey');
 await faith.click();
 await expect(faith).toHaveAttribute('aria-pressed','true');
 await expect(count).not.toContainText(surreyTotal+' listings in Surrey');
 await faith.press('Space');
 await expect(faith).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('[data-activity="all"]')).toHaveAttribute('aria-pressed','true');
 await expect(surrey).toHaveAttribute('aria-pressed','true');
 await expect(count).toContainText(surreyTotal+' listings in Surrey');

 await surrey.press('Enter');
 await expect(surrey).toHaveAttribute('aria-pressed','false');
 await expect(count).toContainText(records.length+' listings in all areas');
 expect(calls).toHaveLength(0);
});

test('clearing a borough inferred by the wizard keeps the query and active support type',async({page})=>{
 const calls=await mockNavigator(page);
 await openSupport(page);
 const query='Housing and benefits in Brent tonight';
 await page.locator('#service-search').fill(query);
 await page.locator('#navigator-submit').click();
 const brent=page.locator('#borough-map [data-area="brent"]'),summary=page.locator('#navigator-result-summary');
 const money=page.locator('[data-activity="money"]');
 await expect(brent).toHaveAttribute('aria-pressed','true');
 await expect(summary).toContainText(' in Brent.');
 await money.click();
 await brent.click();
 await expect(brent).toHaveAttribute('aria-pressed','false');
 await expect(page.locator('[data-map-shape="brent"]')).not.toHaveClass(/is-selected/);
 await expect(page.locator('#area')).toHaveValue(/^(all)?$/);
 await expect(summary).toBeVisible();
 await expect(summary).toContainText(' across local and wider services.');
 await expect(page.locator('#navigator-cards article').first()).toBeVisible();
 await expect(money).toHaveAttribute('aria-pressed','true');
 await expect(page.locator('#service-search')).toHaveValue(query);
 expect(calls).toHaveLength(1);
});

test('clearing the only type shows all listings and still lets the next search choose a borough',async({page})=>{
 const calls=await mockNavigator(page);
 await openSupport(page);
 const type=page.locator('[data-activity="housing"]');
 await type.click();
 await type.click();
 await expect(page.locator('#resource-count')).toBeVisible();
 await expect(page.locator('#resource-count')).toContainText(records.length+' listings in all areas');
 await expect(page.locator('#area')).toHaveValue('');
 await page.locator('#service-search').fill('Housing and benefits in Brent tonight');
 await page.locator('#navigator-submit').click();
 await expect(page.locator('#area')).toHaveValue('brent');
 const shape=page.locator('[data-map-shape="brent"]');
 await expect(shape).toHaveClass(/is-selected/);
 await shape.dispatchEvent('click');
 await expect(shape).not.toHaveClass(/is-selected/);
 await expect(page.locator('#navigator-result-summary')).toContainText(' across local and wider services.');
 expect(calls).toHaveLength(1);
});
