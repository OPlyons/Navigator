import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const data=JSON.parse(fs.readFileSync('config/crisis-pathways.json','utf8'));
const boroughs=['brent','harrow','hillingdon','kensington-chelsea','westminster'];

test('MHCAS self-referral advice keeps its catchment, age and clinical access conditions',()=>{
 const routes=boroughs.map(area=>data.areas[area].routes.find(route=>route.name==='MHCAS at St Charles Hospital'));
 for(const route of routes){
  assert.ok(route);
  for(const borough of ['Brent','Harrow','Hillingdon','Kensington and Chelsea','Westminster'])assert.ok(route.text.includes(borough));
  for(const condition of ['Adults 18+','Walk in 24/7','no referral needed','without an urgent physical health need'])assert.ok(route.text.includes(condition),condition);
  assert.deepEqual(route,routes[0],'the same walk-in service has the same advice in each borough');
 }
 assert.deepEqual(Object.keys(data.areas).filter(area=>data.areas[area].routes.some(route=>route.name==='MHCAS at St Charles Hospital')),boroughs);
});

test('Milton Keynes distinguishes its local 24/7 crisis contact from central SPA out-of-hours cover',()=>{
 const route=data.areas['milton-keynes'].routes.find(route=>route.name==='Urgent NHS advice and SPA');
 for(const advice of ['NHS 111','mental health option','Milton Keynes SPA: 01908 724365 (24/7 crisis help)','Central CNWL SPA: 0800 0234 650 (Milton Keynes out-of-hours cover)','usual care team','Do not wait for an email reply'])assert.ok(route.text.includes(advice),advice);
});

test('walk-in community support and A&E-referred Lighthouse access stay separate',()=>{
 for(const area of ['brent','harrow','hillingdon']){
  const cove=data.areas[area].routes.find(route=>route.name.endsWith('Cove'));
  assert.match(cove.text,/Walk in for non-clinical crisis support/);
 }
 for(const area of ['hillingdon','kensington-chelsea','westminster']){
  const lighthouse=data.areas[area].routes.find(route=>route.name.startsWith('Lighthouse'));
  assert.match(lighthouse.text,/only after assessment and referral/);
  assert.match(lighthouse.text,/not a direct walk-in/);
 }
 assert.match(data.areas['milton-keynes'].routes.find(route=>route.name==='Milton Keynes Crisis Café').text,/Community support for crisis or distress/);
 for(const area of ['kensington-chelsea','westminster'])assert.match(data.areas[area].routes.find(route=>route.name.endsWith('Cove')).text,/limited support and no phone contact/);
});

test('the static crisis page contains every current route before JavaScript runs',()=>{
 const page=new JSDOM(fs.readFileSync('dist/index.html','utf8')).window.document;
 for(const [id,area] of Object.entries(data.areas)){
  const section=page.getElementById('crisis-area-'+id);
  assert.ok(section,id);
  for(const route of area.routes)assert.ok(section.textContent.includes(route.text),id+' '+route.name);
 }
});
