import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {interceptSentry,mockNavigator,openSupport,openMainNavigation} from './support.js';
test('Practical guides opens the whole collection and its two interactive wizards',async({page})=>{
 await interceptSentry(page);const calls=await mockNavigator(page);
 await openSupport(page);
 await (await openMainNavigation(page)).getByRole('link',{name:'Practical guides',exact:true}).click();
 const guides=page.getByRole('main');
 await expect(guides.getByRole('link')).toHaveText([
  'Benefits advice','Open a bank account','Get ID','Free legal advice',
  'Get ready for work','Find a course','Recently left hospital?','Support wizard'
 ]);
 const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']).analyze();
 expect(audit.violations).toEqual([]);
 await guides.getByRole('link',{name:'Get ID'}).click();
 await expect(page.getByRole('heading',{level:1,name:'Get ID'})).toBeVisible();
 await page.getByRole('link',{name:'All practical guides'}).click();
 await guides.getByRole('link',{name:'Recently left hospital?'}).click();
 const hospital=page.getByRole('dialog',{name:'Recently left hospital?'});
 await expect(hospital.getByRole('button',{name:'Help at home'})).toBeFocused();
 await hospital.getByRole('button',{name:'Medicines support'}).click();
 await expect(page.locator('#resource-list')).toContainText('NHS Discharge Medicines Service');
 await (await openMainNavigation(page)).getByRole('link',{name:'Practical guides',exact:true}).click();
 await guides.getByRole('link',{name:'Support wizard'}).click();
 await expect(page.locator('#service-search')).toBeFocused();
 expect(calls).toHaveLength(0);
});
test('guides offer one next step without changing search or sending answers',async({page})=>{
 await interceptSentry(page); const calls=await mockNavigator(page); await openSupport(page);
 await page.locator('#area').selectOption('brent');
 const hub=page.getByRole('region',{name:'Practical guides',exact:true}), tiles=hub.locator('[data-open-guide]'),drawer=page.locator('#pg-drawer');
 await expect(tiles).toHaveCount(6);
 for(const tile of await tiles.all()){
  const name=(await tile.innerText()).trim();await tile.focus();await tile.press('Enter');
  await expect(drawer).toBeVisible();await expect(drawer.getByRole('heading',{name,exact:true})).toBeFocused();
  const choices=drawer.locator('button[data-route]');const n=await choices.count();
  for(let i=0;i<n;i++){
   const button=choices.nth(i),label=await button.innerText();await button.click();const route=drawer.locator('[data-content]:visible');
   await expect(route).toHaveCount(1);await expect(route.getByRole('heading',{name:label,exact:true})).toBeFocused();
   await expect(route.getByRole('link').first()).toHaveAttribute('href',/^https:\/\//);
   await drawer.getByRole('button',{name:'Back to choices'}).click();await expect(button).toBeFocused();
  }
  await page.keyboard.press('Escape');await expect(drawer).toBeHidden();await expect(tile).toBeFocused();
 }
 await expect(page.locator('#area')).toHaveValue('brent');expect(calls).toHaveLength(0);
});
test('bank guide works with reading settings and passes a dialog accessibility check',async({page})=>{
 await interceptSentry(page);await openSupport(page);
 await page.locator('#reading-options > summary').click();await page.locator('#larger-text').click();await page.locator('#hide-pictures').click();await page.locator('#reduce-colours').click();
 const bank=page.locator('[data-open-guide="bank-account"]');await expect(bank.locator('svg')).toBeHidden();await bank.click();
 const drawer=page.locator('#pg-drawer');await drawer.getByRole('button',{name:'No fixed address: ask a charity about HSBC'}).click();
 await expect(drawer.getByRole('link',{name:/HSBC:/})).toHaveAttribute('href','https://www.hsbc.co.uk/help/money-worries/no-fixed-address/');
 expect(await drawer.evaluate(n=>n.scrollWidth<=n.clientWidth+1)).toBeTruthy();
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(axe.violations).toEqual([]);
 await drawer.getByRole('button',{name:'Close practical guide'}).click();await expect(bank).toBeFocused();
});
test('a shareable benefits guide works without scripts and links to real claim services',async({browser,baseURL})=>{
 const context=await browser.newContext({baseURL,javaScriptEnabled:false});const page=await context.newPage();
 try{const resp=await page.goto('/guides/benefits/');expect(resp.status()).toBe(200);
 await page.getByText('Start or finish a PIP claim',{exact:true}).click();await expect(page.getByRole('link',{name:'Sign in to an existing online PIP claim'})).toHaveAttribute('href','https://www.apply-for-pip.dwp.gov.uk/verify');
 await page.getByText('Claim Universal Credit',{exact:true}).click();await expect(page.getByRole('link',{name:'Start Universal Credit online'})).toHaveAttribute('href','https://www.universal-credit.service.gov.uk/start');}finally{await context.close();}
});
