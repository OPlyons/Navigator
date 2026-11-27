import {test} from 'node:test';
import assert from 'node:assert/strict';
import {printableListing} from '../../scripts/build-directory-pdfs.mjs';

const resource={url:'https://example.org/removed',lastChecked:'2026-10-25',verificationStatus:'Provider website checked'};
test('PDFs retain unresolved warnings and never revive a failed destination',()=>{
 const pending={...resource,lastUnconfirmedOn:'2026-11-26'};
 assert.match(printableListing(pending).warning,/could not confirm/);
 assert.equal(printableListing(pending).url,'');
 const fallback={...pending,unconfirmedContact:{url:'https://example.org/contact',label:'Enquire with the provider'}};
 assert.equal(printableListing(fallback).url,fallback.unconfirmedContact.url);
 assert.equal(printableListing(fallback).linkLabel,fallback.unconfirmedContact.label);
 assert.match(printableListing(fallback).checked,/25 October 2026/);
});
test('a successful later check clears the old warning in both PDF and web data',()=>{
 const current={...resource,lastChecked:'2026-11-26',lastUnconfirmedOn:'2026-11-23'};
 assert.equal(printableListing(current).warning,'');
 assert.equal(printableListing(current).url,current.url);
});
