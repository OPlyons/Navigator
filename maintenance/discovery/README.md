# Finding new community resources

This is a separate, bounded discovery process for Community Navigator. It searches for services missing from the directory and saves sourced candidates, then automatically publishes eligible additions through the normal quality checks. Oscar authorised this on 30 October 2026. Existing listing-review progress is separate.

## Workload and rotation

The ChatGPT task **Navigator resource discovery** runs once each afternoon in Europe/London time. Each day it covers at most two areas and three categories in each area: six search combinations in total. It proposes at most four new resources per day, with at most two from any one combination. These limits are separate from the existing 48 routine listing checks and four retries per day.

The runner reads the latest main-branch directory. All its current areas, including Wider support, and its existing category names form the rotation. Areas visited least recently come first. Within each selected area, categories searched least recently come first, with thinner categories winning ties. New areas and categories enter automatically. At the initial 10 areas and 20 categories, the first full rotation takes about 35 completed daily batches. This is limited searching, not an exhaustive service census.

Progress is saved on the **directory-discovery** branch. Keep this branch out of main; it contains research records. Publish eligible candidates through a separate content PR. The existing **directory-reviews** branch and its 40 completed checks are independent.

## Records

- `maintenance/discovery/`: runner, tests, settings and task instructions.
- `maintenance/discovery-data/state.json`: canonical rotation progress, daily budgets and candidate history.
- `maintenance/discovery-data/runs/YYYY-MM-DD.json`: completed searches, queries, candidate evidence and skipped duplicates.
- `maintenance/discovery-data/summary.json`: recorded progress and proposal counts.
- `maintenance/discovery-data/CANDIDATES.md`: readable new-resource proposals.

Only public service information belongs here. Do not copy visitor submissions, personal contact information, referral forms or service-user information from other systems.

## Commands

Use Node 24 in a scratch checkout of current main, restoring only `maintenance/discovery-data/` from the current discovery branch; use current main for the helper source. No npm installation is needed.

```sh
node --test maintenance/discovery/runner.test.mjs
node maintenance/discovery/runner.mjs prepare --output /tmp/navigator-discovery-plan.json
node maintenance/discovery/runner.mjs record --plan /tmp/navigator-discovery-plan.json --results /tmp/navigator-discovery-results.json
node maintenance/discovery/runner.mjs summary
```

`prepare` and `summary` do not mark anything searched. Missing or invalid state is a blocker. Never initialise again or backdate a run. `record` accepts completed subsets and rejects changed catalogues, changed state, a changed London date, duplicate result cells and excess daily work.

Results are a JSON array. Each result contains the exact planned `key`, `outcome` (`completed` or `unable_to_search`), actual `queries` (up to three), a short `summary`, and `candidates` (zero to two). A completed search with no eligible result still records its limited scope. Do not claim there are no services in an area merely because a short search found none.

Each candidate contains:

- `resource`: `name`, `directoryId`, `category`, `description`, `who`, `access`, `check`, `url`, `sourceUrl`, `sourceOwner`, `coverage`. Optional `phone` must be an explicit public service contact; optional `national` requires Wider support and explicit national coverage.
- `checkedFields`: only fields supported by sources; name, description, access and coverage must be checked.
- `sources`: one or two public source objects with `url`, `ownerType` (`provider`, `nhs`, `council`, `official_network`), `retrieval` (`page` or `official_indexed`), and a short `note`. At least the proposed `sourceUrl` must have readable page content.
- `evidence`: a short paraphrase explaining the activity, access route and coverage.
- `limitations`: costs, accessibility, eligibility or current availability not established by the sources.

Do not put `lastChecked`, `nextReview` or `verificationStatus` into a proposal. Source-check dates are stored separately and do not imply human verification. Do not invent facts to fill fields: use clear unknowns such as “Costs are not published; ask the provider.” If the service, joining route or area cannot be established, do not propose it as eligible for publication.

Duplicate comparison ignores URL tracking, fragments, www and trailing slashes and checks names within each area. National resources should be listed once under Wider support. Retain rejected/added candidates so they are not repeatedly proposed. A shared provider homepage can represent several programmes; if the duplicate rule is ambiguous, omit the candidate and explain it in the search summary rather than bypassing the check.

## Saving and publishing

Before recording, re-read main and the discovery branch head. Refresh changed inputs and re-prepare; retain only research still in scope. Commit only the four generated discovery-data files for that day, using native GitHub tree/commit tools and an expected-head ref update. Never force-push. If the branch lease fails, reload and reapply the eligible results; never overwrite another run.

The Monday **Navigator directory summary** reads both maintenance branches and summarises confirmed additions and unresolved issues. It also reports missed searches or saving failures. No daily all-clear is needed.

Automatically publish evidence-backed eligible additions with `node scripts/publish-maintenance.mjs discoveries --input maintenance/discovery-data/state.json --audit maintenance/publication-data/UNIQUE-RUN-ID.json`. Keep unclear candidates pending. Run the build/unit/browser checks and require successful current-head GitHub CI before merging the separate content PR, then confirm its production deployment. Mark a candidate added only after its matching published record is confirmed. Do not merge this research branch into main, change existing listings, contact providers or imply that Navigator makes professional referrals. Provider websites can themselves be out of date; a proposed listing is not a guarantee of availability.
