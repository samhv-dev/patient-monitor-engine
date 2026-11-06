### Added

- **`pme-scenario/2` F5.2 and F5.3: IM dantrolene modelled, and the "not modelled" register.** A drug row may carry
  `routeModels`, one mechanism per route other than IV: bioavailability `F`, absorption rate `ka`, lag `lagS`, each
  from its `src`, and an optional local effect raised as a new `drugLocalEffect` event. Dantrolene IM is the one row:
  F = 0 (the owner's ruling of 2026-10-29 17:00, "IM dantrolene = no effect + local harm"), so the dose is accepted,
  nothing reaches the circulation (`dantroleneE` stays 0; an MH crisis given IM dantrolene runs exactly as the untreated
  one), and one tissue-injury event names the solution's pH of about 9.5 (Dantrium Intravenous label). `routeHonoured`
  and the record therefore no longer flag IM dantrolene as "route not modelled"; it is accepted and still does not
  satisfy an IV-only action. Epinephrine IM stays "route not modelled": no source read states both its F and its ka,
  and a ka back-solved from a peak time would be a fitted constant; no absorption depot is built. Every IV, IO and
  central path is unchanged. The local injury, its creatine kinase and potassium effects, the charcoal filter and
  epinephrine IM are `.todo` entries listed in `docs/guides/known-deviations.md`, each with its roadmap row.
