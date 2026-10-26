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
