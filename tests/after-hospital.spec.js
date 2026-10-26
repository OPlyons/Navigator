import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {interceptSentry,mockNavigator,openSupport,records} from './support.js';
test.beforeEach(async({page})=>{await interceptSentry(page);});
test('six hospital shortcuts preserve the borough, clear conflicting filters and run locally',async({page})=>{
 const calls=await mockNavigator(page);await openSupport(page);await page.locator('#area').selectOption('brent');
 const cases=[['Help at home','Help at home after hospital — reablement'],['Money and essentials','Benefits after a hospital stay'],['Medicines support','NHS Discharge Medicines Service'],['Getting to appointments','NHS Healthcare Travel Costs Scheme'],['People and connection',null],['Support for carers','Carers UK — make a back-up care plan']];
 for(const [label,expected] of cases){
  await page.locator('[data-activity="faith"]').click();
  await page.locator('#after-hospital-toggle').click();
  const dialog=page.getByRole('dialog',{name:'Recently left hospital?',exact:true});
  await expect(dialog.locator('.after-hospital-choice')).toHaveCount(6);
  await dialog.getByRole('button',{name:label,exact:true}).click();
  await expect(dialog).toBeHidden();await expect(page.locator('#resource-results-heading')).toBeFocused();
  await expect(page.locator('#area')).toHaveValue('brent');await expect(page.locator('[data-activity="all"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('#resource-list article').first()).toBeVisible();
  if(expected)await expect(page.locator('#resource-list')).toContainText(expected);
 }
 expect(calls).toHaveLength(0);
 await page.locator('#clear-filters').click();await expect(page.locator('#service-search')).toHaveValue('');await expect(page.locator('#resource-count')).toContainText(records.length+' listings');
});
test('a hospital shortcut replaces prior AI results without another AI request',async({page})=>{
 const calls=await mockNavigator(page);await openSupport(page);await page.locator('#service-search').fill('Housing and benefits in Brent tonight');await page.locator('#navigator-submit').click();await expect(page.locator('#navigator-results')).toBeVisible();
 await page.locator('#after-hospital-toggle').click();await page.getByRole('button',{name:'Medicines support',exact:true}).click();
 await expect(page.locator('#navigator-results')).toBeHidden();await expect(page.locator('#resource-list')).toContainText('NHS Discharge Medicines Service');expect(calls).toHaveLength(1);
 await page.locator('#navigator-reset').click();await expect(page.locator('#support-start')).toBeVisible();await expect(page.locator('#service-search')).toHaveValue('');
});
test('hospital choices work with keyboard and reading options',async({page})=>{
 await mockNavigator(page);await openSupport(page);const trigger=page.locator('#after-hospital-toggle'),dialog=page.getByRole('dialog',{name:'Recently left hospital?',exact:true});
 await trigger.press('Enter');await expect(dialog.getByRole('button',{name:'Help at home',exact:true})).toBeFocused();
 await page.keyboard.press('Shift+Tab');await expect(page.locator('#after-hospital-close')).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(dialog.getByRole('button',{name:'Support for carers',exact:true})).toBeFocused();
 await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(trigger).toBeFocused();
 await page.locator('#reading-options > summary').click();await page.locator('#larger-text').click();await page.locator('#hide-pictures').click();await page.locator('#reduce-colours').click();
 await trigger.click();await expect(dialog.locator('.after-hospital-icon').first()).toBeHidden();expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBeTruthy();
 await dialog.getByRole('button',{name:'Money and essentials',exact:true}).press('Enter');await expect(page.locator('#resource-list')).toContainText('Benefits after a hospital stay');
});
test('axe: hospital picker and practical results',async({page})=>{
 await mockNavigator(page);await openSupport(page);await page.locator('#after-hospital-toggle').click();
 const audit=async()=>{const result=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']).analyze();expect(result.violations).toEqual([]);};
 await audit();await page.getByRole('button',{name:'Getting to appointments',exact:true}).click();await audit();
});
