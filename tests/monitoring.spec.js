import {test,expect} from '@playwright/test';import {interceptSentry,openSupport} from './support.js';
test('normal browsing and search typing send no monitoring events or store data',async({page})=>{
 const envelopes=await interceptSentry(page);await openSupport(page);await page.locator('#service-search').fill('Synthetic support search in Brent');await page.locator('#area').selectOption('brent');
 expect(envelopes).toHaveLength(0);expect(await page.evaluate(()=>({local:localStorage.length,session:sessionStorage.length,cookie:document.cookie}))).toEqual({local:0,session:0,cookie:''});
});
test('error transport removes synthetic personal details and request context',async({page})=>{
 const envelopes=await interceptSentry(page);await openSupport(page);await page.locator('#service-search').fill('Synthetic private search phrase');
 await page.evaluate(()=>{setTimeout(()=>{throw new Error('someone@example.test NHS 1234567890 Synthetic private search phrase');},0);});
 await expect.poll(()=>envelopes.length).toBe(1);const body=envelopes[0];expect(body).not.toMatch(/someone@example|1234567890|Synthetic private search|breadcrumbs|request|replay|session|attachment/);expect(body).toContain('Application error');expect(body).toContain('"infer_ip":"never"');expect(body).toContain('"dtp_sanitized":"1"');
 const lines=body.trim().split('\n');expect(JSON.parse(lines[0])).not.toHaveProperty('trace');const payload=JSON.parse(lines[2]);expect(payload).not.toHaveProperty('user');expect(payload).not.toHaveProperty('contexts');expect(payload).not.toHaveProperty('extra');
});
