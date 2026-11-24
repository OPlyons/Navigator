import {test, expect} from '@playwright/test';
import {interceptSentry,openPracticalGuides} from './support.js';

test.beforeEach(async ({page}) => { await interceptSentry(page); });

const controls = [
  '#crisis-help-button', '#workforce-advice-link', '#support [data-suggest-resource]',
  '#primary-nav [data-nav=guides]', '.directory-update-note', '#navigator-warning', '#service-search', '#navigator-submit',
  '#search-help', '#area', '#borough-map', '#support-more-filters > summary',
  '#activity-choices > button', '#browse-all-areas',
  '#reading-options > summary', '#area-map-panel .map-credit > summary',
  '#print-page', '.footer-workforce-name', 'footer nav a'
];

// Measure from the top of the actual landing page. Playwright clicks or focus can
// scroll an element into view and give a false positive for a single-window layout.
for (const [width, height] of [[1280, 720], [1440, 900], [1844, 1024]]) {
  test('all dashboard choices fit at '+width+' × '+height, async ({page, isMobile}) => {
    test.skip(isMobile, 'Desktop geometry only; the phone has a reflow check below.');
    await page.setViewportSize({width, height});
    await page.goto('/');
    await expect(page.locator('#browse-all-areas')).toBeEnabled();
    await expect(page.locator('#activity-choices > button')).toHaveCount(20);
    await expect(page.getByRole('heading',{name:'Support wizard',exact:true})).toHaveCount(1);
    await page.evaluate(async () => {
      await document.fonts.ready;
      window.scrollTo({top:0, left:0, behavior:'instant'});
    });
    const missing = await page.evaluate(async selectors => {
      const absent = selectors.filter(s => !document.querySelector(s));
      const nodes = [...document.querySelectorAll(selectors.join(','))];
      const clipped = await new Promise(resolve => {
        const seen = new Map();
        const observer = new IntersectionObserver(entries => {
          for (const entry of entries) {
            const n = entry.target;
            const name = n.id || n.getAttribute('aria-label') || n.textContent.trim();
            seen.set(n, entry.isIntersecting && entry.intersectionRatio >= .99 ? '' :
              name+' ('+Math.round(entry.intersectionRatio*100)+'% visible, bottom '+Math.round(n.getBoundingClientRect().bottom)+'px)');
          }
          if (seen.size === nodes.length) {
            observer.disconnect();
            resolve([...seen.values()].filter(Boolean));
          }
        }, {threshold:[0,.99,1]});
        nodes.forEach(n => observer.observe(n));
      });
      return [...absent, ...clipped];
    }, controls);
    await test.info().attach('Opening dashboard '+width+'x'+height, {body:await page.screenshot(),contentType:'image/png'});
    expect(missing, 'Hidden, clipped or below the initial viewport').toEqual([]);
    expect(await page.evaluate(()=>document.documentElement.scrollHeight-window.innerHeight), 'Opening page extends below the viewport').toBeLessThanOrEqual(1);
  });
}

test('the wizard follows the area and support choices, and guides are reachable at any text size', async ({page, isMobile}) => {
  await page.setViewportSize(isMobile ? {width:390,height:844} : {width:1280,height:720});
  await page.goto('/');
  await expect(page.locator('#browse-all-areas')).toBeEnabled();
  const checkWidth = async () => {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, 'The page should not need horizontal scrolling').toBeLessThanOrEqual(1);
  };
  await checkWidth();
  const wizard=page.getByRole('search');
  await expect(wizard.getByRole('button',{name:'Search',exact:true})).toHaveCount(1);
  await expect(page.locator('#support .pg-hub,#support [data-open-guide]')).toHaveCount(0);
  const map=await page.locator('#area-map-panel').boundingBox();
  const types=await page.locator('#activity-choices').boundingBox();
  const search=await wizard.boundingBox();
  expect(search.y).toBeGreaterThanOrEqual(Math.max(map.y+map.height,types.y+types.height));
  await page.locator('#area').selectOption('brent');
  const results=await page.locator('#directory-explorer').boundingBox();
  expect(results.y).toBeGreaterThanOrEqual(search.y+search.height);
  const reading = page.locator('#reading-options > summary');
  await reading.click();
  await page.locator('#larger-text').click();
  await reading.click();
  await checkWidth();
  await page.locator('#service-search').scrollIntoViewIfNeeded();
  await expect(page.locator('#service-search')).toBeInViewport();
  await openPracticalGuides(page);
  const course = page.locator('[data-open-guide="courses"]');
  await course.click();
  await expect(page.locator('#pg-drawer')).toBeVisible();
  await page.locator('#pg-drawer .pg-close').click();
  await expect(course).toBeFocused();
  await checkWidth();
});
