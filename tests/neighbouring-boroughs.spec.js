import {test,expect} from '@playwright/test';
import {interceptSentry,mockNavigator,openSupport,openMainNavigation,records} from './support.js';

const areas=[
 ['barnet','Barnet'],['islington','Islington'],['hammersmith-fulham','Hammersmith and Fulham'],
 ['hounslow','Hounslow'],['richmond-upon-thames','Richmond upon Thames']
];
test.beforeEach(async({page})=>{await interceptSentry(page);});

test('neighbouring map buttons work by keyboard and show the same local listings as the area picker',async({page})=>{
 const requests=await mockNavigator(page);
 await openSupport(page);
 const picker=page.locator('#area'),map=page.locator('#borough-map'),cards=page.locator('#resource-list article');
 for(const [id,label] of areas){
  const localNames=records.filter(r=>r.directoryId===id).map(r=>r.name);
  expect(localNames.length,label).toBeGreaterThan(0);
  const button=map.getByRole('button',{name:new RegExp('^'+label+',')});
  await expect(button).toBeEnabled();
  await button.press('Enter');
  await expect(button).toHaveAttribute('aria-pressed','true');
  await expect(picker).toHaveValue(id);
  await expect(cards.first()).toBeVisible();
  const names=await cards.getByRole('heading').allTextContents();
  expect(names.length,label).toBeGreaterThan(0);
  for(const name of names)expect(localNames,label).toContain(name);
  await picker.selectOption('brent');
  await expect(button).toHaveAttribute('aria-pressed','false');
  await picker.selectOption(id);
  await expect(button).toHaveAttribute('aria-pressed','true');
  await expect(cards.getByRole('heading')).toHaveText(names);
 }
 expect(requests).toHaveLength(0);
 expect(await page.locator('html').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
});

test('each neighbouring borough can be chosen in a resource suggestion without submitting it',async({page})=>{
 await openSupport(page);
 const requests=[];
 await page.route('**/api/suggest-resource',route=>{requests.push(route.request().url());return route.abort();});
 await page.locator('#support [data-suggest-resource]').press('Enter');
 const dialog=page.getByRole('dialog',{name:'Tell us about a resource to add'});
 await expect(dialog).toBeVisible();
 const area=dialog.getByRole('combobox');
 for(const [id,label] of areas){
  await area.selectOption({label});
  await expect(area).toHaveValue(id);
 }
 await page.keyboard.press('Escape');
 await expect(dialog).toBeHidden();
 expect(requests).toHaveLength(0);
});

test('leaving a covered borough does not carry its local crisis route into a neighbouring borough',async({page})=>{
 await openSupport(page);
 const support=page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Find support',exact:true});
 const help=page.getByRole('link',{name:'Crisis help',exact:true});
 await page.locator('#area').selectOption('camden');
 await help.click();
 await expect(page.locator('#crisis-area-camden')).toHaveAttribute('open','');
 for(const [id,label] of areas){
  await openMainNavigation(page);await support.click();
  await page.locator('#area').selectOption(id);
  await help.click();
  await expect(page.getByRole('link',{name:'Call NHS 111',exact:true})).toBeVisible();
  await expect(page.locator('.crisis-borough-card[open]')).toHaveCount(0);
  await expect(page.locator('#crisis-borough')).toHaveValue('');
  await expect(page.getByText('There is no local crisis guide for '+label,{exact:false})).toBeVisible();
 }
});
