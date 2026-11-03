# Crisis guidance review on 3 November 2026

Scope: the six differences between Navigator PR #6 and Discharge Project PR #2. Both current configuration files were compared. Five differences omit the MHCAS walk-in catchment from the Discharge Project; the sixth omits Milton Keynes out-of-hours SPA context. Neither merged PR documents a reason to present different eligibility advice. This is a review of published access information, not confirmation from a service manager.

## Decisions and official sources

| Guidance | Decision | Official evidence checked on 3 November 2026 |
| --- | --- | --- |
| MHCAS walk-in access in Brent, Harrow, Hillingdon, Kensington and Chelsea, and Westminster | Keep Navigator's existing text and use it in all five Discharge Project entries. It states the walk-in catchment, age 18+, 24/7 access without referral and absence of an urgent physical health need. | [CNWL MHCAS service page](https://www.cnwl.nhs.uk/services/mental-health-services/adult-and-older-adult/st-charles-hospital/mental-health-crisis-assessment-service-mhcas), eligibility, referrals and opening times; [CNWL walk-in announcement](https://www.cnwl.nhs.uk/news/MHCAS), dated 24 January 2025, expressly includes age 18. |
| Milton Keynes urgent clinical help | Use identical wording in both projects. Keep NHS 111's mental health option available 24/7. Distinguish the local Milton Keynes SPA contact listed by CNWL as 01908 724365 for 24/7 crisis help from central CNWL SPA on 0800 0234 650, whose service page specifies Milton Keynes out-of-hours cover. Retain the care plan, usual team and no-wait-for-email advice. | [CNWL emergency-help page](https://www.cnwl.nhs.uk/patients-and-carers/help-mental-physical-health-crisis), local Milton Keynes crisis contact and 24/7 help; [CNWL central SPA service page](https://www.cnwl.nhs.uk/services/mental-health-services/adult-and-older-adult/single-point-access), the central number and Milton Keynes out-of-hours remit. |

The two SPA pages describe different contacts. The local 24/7 listing should not be replaced with a blanket statement that Milton Keynes crisis help is available only out of hours. We do not infer exact out-of-hours boundaries or call charges. CNWL's older Milton Keynes news article uses the central number as general 24/7 advice; the proposed wording follows the current service and emergency-help pages and makes their distinction explicit. If the provider changes either remit, review both projects together.

The MHCAS resident statement concerns direct walk-in access. Its service page also describes a separate A&E liaison referral route, including people attending A&E in the five boroughs. We do not turn that into an exclusive residence rule for every professional referral.

## Access distinctions retained

- Immediate danger, serious injury or overdose: the existing 999/A&E advice remains prominent.
- Urgent NHS advice and assessment: NHS 111 and SPA remain clinical routes. MHCAS is a clinical assessment service with direct walk-in access under the conditions above.
- Community crisis support: Coves and the Milton Keynes Crisis Café remain separate from clinical assessment. [CNWL's Coves access section](https://www.cnwl.nhs.uk/services/coves) confirms open access, with different age thresholds. [Mind BLMK's Crisis Café page](https://www.mind-blmk.org.uk/how-we-can-help/milton-keynes/crisis-cafe-milton-keynes/) confirms adult drop-in support without an appointment, daily 5pm–11pm. The existing KCW provider limitation notice is retained.
- Lighthouse: [Hillingdon](https://www.cnwl.nhs.uk/services/mental-health-services/adult-and-older-adult/hillingdon-hospital/lighthouse-hillingdon-hospital-uxbridge) and [St Mary's](https://www.cnwl.nhs.uk/services/mental-health-services/adult-and-older-adult/lighthouse-st-marys-hospital-paddington) require A&E referral. Their entries continue to say they are not direct walk-ins.

## Maintaining one shared version

Navigator owns `config/crisis-pathways.json`; Discharge Project keeps an identical reviewed copy so builds and form downloads do not depend on a live request to another site. The companion Discharge Project PR adds a read-only GitHub Actions comparison on pull requests, main pushes, daily scheduled runs and manual runs. It compares every JSON field, including eligibility, contact numbers, source links, notices and check dates; missing files, invalid JSON or a changed field fail the check.

For a paired change, Discharge Project's PR check uses the exact Navigator commit recorded in `config/crisis-source.json`. Main and daily checks always compare with Navigator's current main, so an old pin cannot hide later divergence. The check reports differences; it never edits, merges or deploys. This checks consistency, not clinical correctness, and a daily check can only flag drift after it occurs. Provider verification and approval remain necessary.

No merging or production publication is authorised by this review. After approval, merge Navigator first, then Discharge Project, and verify the main-branch comparison.
