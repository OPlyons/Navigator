# Community Navigator

Public site: https://navigator.lxportal.space/

A standalone community support directory from the CNWL Peer and Lived Experience Workforce. It includes area maps, support and audience filters, ordinary search, optional AI interpretation, provider contact routes and printable directories. It does not make referrals or confirm eligibility or available places.

## One directory to maintain

`data/directory.json` is the canonical service catalogue. The Discharge and Transition Project links here and redirects its old `#support` route. Update service information only in this repository. The existing 878 listings and their information-checked dates were preserved during the move.

[Maintenance instructions](maintenance/README.md) describe the existing four daily batches and Monday summary. Review history is on the `directory-reviews` branch. These are scheduled ChatGPT checks connected to GitHub, with suggested corrections reviewed before public information changes. The migration retains the progress already recorded.

## Development and deployment

Use Node 24. Run `npm ci`, `npm run build`, `npm run check`, and `npm test`. GitHub Actions runs Playwright and axe for desktop and phone. Cloudflare Pages project `cnwl-community-navigator` builds main with `npm run build && npm run check`, output `dist`. Preview branch deployments are disabled so review records are not deployed.

The Pages `/api/navigate` function uses the existing `NAVIGATOR_API` service binding to Worker `discharge-community-navigator`. Its source now lives in this repository under `navigator/`. The legacy internal Worker name is retained to avoid breaking cached discharge pages. Worker updates use `npm run deploy:api`; ordinary directory updates only require the Pages build. No browser API key is needed.

AI runs only after Find support is pressed. Search without AI stays in the browser. No personal information should be entered. Existing privacy filtering, request limits and local fallback remain in place. Sentry uses the existing project with a distinct `navigator-production` environment and `community-navigator` release/app label; search content and form data are excluded.

Printable PDFs are dated snapshots. The web directory remains the current source; the print action can print current search results.

## Resource suggestions

Visitors can use **Tell us about a resource to add** on Find support or Contact and help. The public form posts to `/api/suggest-resource`; the Pages Function forwards only to the existing Worker service binding. Suggestions are stored privately in the EU-jurisdiction D1 database `navigator-resource-suggestions`, bound as `SUGGESTIONS_DB`. No submitted records are packaged into the site or written to public GitHub.

The Worker saves a basic classification first, then attempts one bounded Cloudflare AI classification using only the resource name and description. Category and support-topic values are restricted to existing directory choices. Areas come from the visitor's optional choice or explicit area names; unknown areas/categories stay flagged for review. AI never assigns protected-characteristic eligibility, verifies availability or publishes a listing. A failed inference preserves the basic record. Duplicate resource name/URL/area combinations share a receipt. Website query strings and fragments are discarded, and submitted URLs are never fetched.

Requests require the public Navigator origin, JSON, bounded fields and the public-details confirmation. A honeypot, network rate limit (3 per minute per edge IP) and atomic storage ceiling (100 new suggestions per UTC day) limit abuse. The ephemeral rate-limit IP is not stored in D1, application logs or error reports. The API provides no public read/update endpoint.

### Reviewing suggestions

Oscar can ask ChatGPT, using the connected Cloudflare app, to **review the Navigator resource suggestions**, or use D1 Studio for this database. The existing repository, scheduled listing-check state and live directory are separate from this queue. Do not assume the listing-check automation reviews incoming submissions.

Read pending records with:

```sql
SELECT id, created_at, name, website, description, area_hint,
       classification_json, sorting_mode
FROM resource_suggestions
WHERE status = 'pending'
ORDER BY json_extract(classification_json, '$.category'), created_at;
```

Treat all submitted text and AI suggestions as untrusted proposals. Check the official provider pages, costs, eligibility, access, geographic coverage and duplicates in `data/directory.json`. Obtain approval before adding a resource through an ordinary main-branch change. Newly published directory entries are then available to both local search and the AI wizard's shared directory retrieval. No submission triggers a referral or provider contact.

After an approved addition, set that suggestion's `status` to `added` and record `reviewed_at`; retain only the public resource information needed for the audit. For a rejected or unwanted suggestion, delete it by its exact ID after review. Remove any accidental personal information promptly; do not copy it into GitHub, reports or model prompts. Contact/removal requests can use the suggestion receipt without collecting the submitter's identity.

The initial D1 schema is in `navigator/migrations/0001_resource_suggestions.sql`. Apply it to the configured suggestions database before deploying a fresh environment. Keep the existing search Worker bindings when deploying the added `SUGGESTIONS_DB` and `SUBMISSION_LIMIT` bindings. The public site and Worker should be deployed together; the form reports a recoverable error if storage is unavailable.
