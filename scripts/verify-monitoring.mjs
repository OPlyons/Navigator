/* Explicit maintainer check: sends one fixed, non-identifying error from the live app. */
import {chromium} from '@playwright/test';
const origin='https://dtp.lxportal.space';
const proxyServer=process.env.PLAYWRIGHT_PROXY_SERVER;
const browser=await chromium.launch({headless:true,...(proxyServer?{proxy:{server:proxyServer}}:{}),...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']}:{} )});
try{
 const page=await browser.newPage();
 const response=await page.goto(origin+'/#support');
 if(!response?.ok())throw Error('The live site did not load');
 await page.locator('#service-search').waitFor({state:'visible'});
 const result=await page.evaluate(async()=>({eventId:window.DTPMonitoring.captureCode('monitoring_check'),flushed:await window.DTPMonitoring.flush()}));
 if(!result.eventId||!result.flushed)throw Error('Monitoring check did not flush');
 console.log(JSON.stringify({origin,...result}));
}finally{await browser.close();}
