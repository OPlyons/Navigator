import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';
import {unresolvedSourceNotice} from '../../navigator/shared.mjs';

test('every original board card is reachable in static HTML, including repeated resources in different boroughs', () => {
  const {resources,groups} = JSON.parse(fs.readFileSync('data/neurodiversity.json','utf8'));
  const page = new JSDOM(fs.readFileSync('dist/neurodiversity/index.html','utf8')).window.document;
  const sources = resources.flatMap(r => r.sources);
  assert.equal(page.querySelectorAll('.nd-topic').length, groups.flatMap(g => g.topics).length);
  assert.equal(page.querySelectorAll('a.nd-source').length,sources.length);
  for (const source of sources) {
    const link = page.getElementById('topic-'+source.topic).querySelector(`a[href="https://trello.com/c/${source.card}"]`);
    assert.ok(link,source.card+' in '+source.topic);
  }
  assert.equal(new Set(sources.map(s => s.card)).size,sources.length);
  assert.equal(page.querySelector('nav .nd-nav-link').getAttribute('aria-current'),'page');
});

test('the unconfirmed notice ends when a later source check succeeds', () => {
  const row = {lastChecked:'2026-10-01', lastUnconfirmedOn:'2026-11-23'};
  assert.match(unresolvedSourceNotice(row),/23 November 2026/);
  assert.equal(unresolvedSourceNotice({...row,lastChecked:'2026-11-24'}),'');
  assert.equal(unresolvedSourceNotice({lastChecked:row.lastChecked}),'');
});
