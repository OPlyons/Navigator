import {defineConfig,devices} from '@playwright/test';
const baseURL=process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:4173';
export default defineConfig({
 testDir:'./tests',testMatch:'*.spec.js',fullyParallel:true,forbidOnly:!!process.env.CI,retries:process.env.CI?1:0,workers:process.env.CI?2:undefined,globalTimeout:10*60*1000,timeout:30000,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL,trace:'retain-on-failure',screenshot:'only-on-failure',...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox']}}:{})},
 projects:[{name:'desktop-chromium',use:{...devices['Desktop Chrome']}},{name:'phone-chromium',use:{...devices['Pixel 7'],viewport:{width:390,height:844}}}],
 webServer:process.env.PLAYWRIGHT_BASE_URL?undefined:{command:'npm run dev',url:baseURL,reuseExistingServer:!process.env.CI,timeout:30000}
});
