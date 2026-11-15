### Changed

- **The accessibility end-to-end cases live in one file per area (brief 219, finding N115).** `apps/demo/e2e/app-accessibility.e2e.ts`
  became `app-accessibility-views.e2e.ts`, `-instructor-phone`, `-learner-phone`, `-pump` and `-ventilator`, with the
  shared set-up (the Vite server and the audit helpers) in `app-accessibility-support.ts`, whose first three lines say
  where a new case goes. Every pull request that added a case edited the same lines of the one file, so two open pull
  requests almost always conflicted there. No case's content, selector, timeout or assertion changed;
  `scripts/e2e-split/check-titles.mjs` proves every test title of the old file exists exactly once in the new files.
  No product code changed.
