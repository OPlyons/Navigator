import fs from 'node:fs';
export const release='community-navigator-v18-2026-10-25';
export const records=JSON.parse(fs.readFileSync(new URL('../data/directory.json',import.meta.url))).resources;
export const housingIntent={needs:['housing','benefits'],area:'brent',keywords:[],exclude:[],audiences:[],preferences:[],urgency:'tonight',specific:false,outOfScope:false};
export async function mockNavigator(page,intent=housingIntent){
 const calls=[];
 await page.route('**/api/navigate',async route=>{calls.push(route.request().postDataJSON());await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({release,mode:'ai',intent})});});
 return calls;
}
export async function interceptSentry(page){
 const envelopes=[];
 await page.route('**/*.ingest.de.sentry.io/**',async route=>{envelopes.push(route.request().postData()||'');await route.fulfill({status:200,contentType:'application/json',body:'{}'});});
 return envelopes;
}
export async function openSupport(page){await page.goto('/#support');await page.locator('#service-search').waitFor({state:'visible'});await page.locator('#service-search').fill('');}
