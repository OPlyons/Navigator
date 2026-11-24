import {test, expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import {interceptSentry, openMainNavigation, records} from './support.js';

const collection = JSON.parse(fs.readFileSync(new URL('../data/neurodiversity.json', import.meta.url)));
const topicCount = collection.groups.flatMap(group => group.topics).length;
const allCount = `${collection.resources.length} resources across ${topicCount} topics`;

test('the homepage opens the collection and the local services link applies the directory audience', async ({page}) => {
  await interceptSentry(page);
  await page.goto('/');
  await (await openMainNavigation(page)).getByRole('link', {name:'Neurodiversity',exact:true}).click();
  await expect(page.getByRole('heading', {name:'Neurodiversity resources'})).toBeVisible();
  await expect(page.locator('#nd-count')).toHaveText(allCount);
  await page.getByRole('link', {name:'Find neurodivergent services by area'}).click();
  const count = records.filter(r => r.audiences.includes('neurodivergent')).length;
  await expect(page.locator('#audience')).toHaveValue('neurodivergent');
  await expect(page.locator('#resource-count')).toContainText(`${count} listings`);
  await expect(page.locator('#nd-selection-link')).toBeVisible();
  await page.locator('#area').selectOption('harrow');
  await expect(page.locator('#resource-count')).toContainText('Harrow');
});

test('topic and text filters combine, clear, and support reading options', async ({page}) => {
  await page.goto('/neurodiversity/');
  await page.getByLabel('Topic', {exact:true}).selectOption('apps');
  await page.getByRole('searchbox').fill('goblin');
  await expect(page.locator('#nd-count')).toHaveText('1 resource across 1 topic');
  await expect(page.locator('.nd-entry:visible h4')).toContainText(/goblin/i);
  await page.getByRole('searchbox').fill('qzqxqz');
  await expect(page.locator('#nd-empty')).toBeVisible();
  await page.getByRole('button', {name:'Clear filters'}).click();
  await expect(page.locator('#nd-count')).toHaveText(allCount);
  await page.locator('#reading-options > summary').click();
  await page.getByRole('button', {name:'Reduce colours'}).click();
  await page.getByRole('button', {name:'Larger text'}).click();
  await expect(page.locator('html')).toHaveClass(/reduced-colours/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
});

test('board topics and individual resource links are accessible with filters open', async ({page}) => {
  await page.goto('/neurodiversity/#topic-sensory');
  await expect(page.locator('#topic-sensory')).toHaveAttribute('open','');
  const open = page.locator('#topic-sensory');
  await expect(open.locator('.nd-entry h4').first()).toBeVisible();
  const axe = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','best-practice']).analyze();
  expect(axe.violations).toEqual([]);
});
