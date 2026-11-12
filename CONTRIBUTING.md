# Contributing

Thank you for helping. This project is an educational simulator: correctness of *behaviour* matters more than
features, and every borrowed idea must be traceable.

## Set up

Node ≥ 22.12, pnpm 9.15.9 (`corepack enable`, or `npx -y pnpm@9.15.9 …`).

```bash
pnpm install
pnpm typecheck
PME_TEST_SET=fast pnpm test                       # what CI's three unit jobs run
PME_TEST_SET=perf pnpm --filter @pme/validation exec vitest run   # the tick benchmark, alone (CI's build job)
PME_TEST_SET=slow pnpm --filter @pme/engine-core test   # the multi-sim-hour set (CI's test-slow job)
pnpm build && pnpm check-notices && pnpm check-licences && pnpm check-size
pnpm test:e2e                                      # Playwright; PW_SYSTEM_CHROME=1 uses your installed Chrome
```

CI runs the Chromium e2e suite in four shards and the WebKit one in three (each set's `shards` in
`scripts/ci/e2e-sets.mjs`, which the e2e matrix is built from), each given its files by `scripts/ci/e2e-shard-plan.mjs`
from the per-file durations in the last green main run's reports (longest first onto the least-loaded shard), or by
Playwright's own `--shard` when no such report can be read. The plan is made once per run, in the renderer job, and
every shard of a set reads that one plan, so the shards never split a set two ways.

### Reading the evidence of a retry-only pass

When an e2e attempt fails in CI (a retry that then passes included), its job keeps evidence from **every page and
browser context the test had open**, in the artifact `e2e-evidence-<set>-<shard>of<n>` of that job (nothing is kept,
and nothing uploaded, when every attempt passed). The job's warning line for a retry-only pass names the artifact and
the folder, `test-results/<test>/`, of the failed attempt. In that folder:

- `trace.zip`: the first attempt's Playwright trace, every context in one file (`npx playwright show-trace trace.zip`,
  or drop it on trace.playwright.dev): the actions with their timing, each page's console, network and errors (no DOM
  snapshots or screencast: they slowed CI's passing path). A trace exists only
  for a failed FIRST attempt (`trace: retain-on-first-failure`, playwright.config.ts); a failed retry has the rest.
- `evidence/index.json`: the pages that were open, in browser-context order; `evidence/<n>-<role>.json` per page: the
  application's own counters read at the end of the failed test function and again 1 s later (`atFailure`,
  `oneSecondLater`), so what still moves shows: frame count (`frames.count` grows while the page paints), the host's
  `simNow`, its last engine event times (`lastEventT`), its relay link's `sent` / `received` with `sentAgoMs` /
  `receivedAgoMs`, `reconnects` and `lastClose`; a follower's `sync.status`, `lagS`, its link's counts and its own clock
  (`monitor.renderT`); the status pill and any toast. `role` is `host`, `follower`, `learner-remote`, `app` or `page`.
- `evidence/<n>-<role>.console.txt`: that page's console (Playwright keeps its last 200 messages) and page errors.
- `test-failed-<k>.png`: a screenshot of each open page; `error-context.md`: the error and one page's ARIA snapshot.

So a frozen phone reads as: the host's `relay.sent` still growing with a small `sentAgoMs` while the follower's
`link.received` stands still (the relay or the phone's socket), or the host's `sent` and `frames.count` standing still
too (the host stopped). If the upload fails ("Failed to CreateArtifact"), the job stays the tests' own colour, the warning
says so, and the step "evidence not uploaded" prints every counters and console file to the log (the traces are lost).
Locally, `PME_E2E_EVIDENCE=1` turns all of it on (`=0` off, also in CI).

To repeat one spec many times in CI without a pull request: Actions → **e2e-repeat** → Run workflow (or
`gh workflow run e2e-repeat.yml -f spec=apps/demo/e2e/<name>.e2e.ts -f browser=webkit -f repeat=10 [-f grep='<title>']`).
It runs that spec in CI's container, retries 0, at most 20 repetitions, and uploads `e2e-repeat-evidence-<browser>-<run>`
with the evidence of every failing repetition. Every e2e spec takes `test` from `apps/demo/e2e/evidence.ts`, which
re-exports all of `@playwright/test` (`packages/validation/test/e2e-evidence.test.ts` checks it).

The same fixture closes, when a test ends (after its evidence and its afterEach hooks), every browser context the test
created and every page it opened in a context from before it; what a `beforeAll` opened is left to its `afterAll`. A test
that keeps a page for a later test must therefore open it in `beforeAll`. Each e2e job's step "contexts and pages left
open by tests" lists the files whose tests left any (`scripts/ci/e2e-leaks.mjs`); `PME_E2E_LEAKS=keep` turns the closing
off to measure, and `evidence-tidy.e2e.ts` fails if a finished test's context is still open in the next.

## Rules that CI or review enforce

1. **One piece of work per pull request**, described in the PR template (including "Sources consulted").
2. **Never loosen a test band to make it pass.** If the model misses a published band, keep the band, mark the test
   `it.fails` with the measured number in its title, and add a row to
   [docs/guides/known-deviations.md](docs/guides/known-deviations.md) (the `docs-honesty` test checks this). Fix the
   mechanism instead.
3. **Provenance.** Every borrowed code file, data table, template or dependency gets a row in [NOTICES.md](NOTICES.md)
   in the same PR; files under `packages/*/src/vendor/**` and `packages/engine-core/templates/**` start with a
   `NOTICE-ID` header (`pnpm check-notices`). Dependencies must have a permissive licence (`pnpm check-licences`).
4. **Forbidden sources** (brief §8): do not open ECGSYN or its ports, the PhysioNet ECG/PPG arrhythmia simulator, the
   Python Anesthesia Simulator, or any unlicensed repository. Clean-room implementations from papers are welcome;
   cite the paper beside the equation.
5. **Long engine tests yield.** A test that runs the engine for more than one simulated minute advances one simulated
   minute at a time and yields to the event loop between minutes (see `packages/engine-core/test/helpers/`); the CI
   runner has 2 vCPUs.
6. **Heavy browser tests run in Chromium only** (`test.skip(browserName === 'webkit', …)`); committed screenshots are
   ≤ 60 KB.
7. **No clinical claims.** Documentation describes what the model does and how it was measured; it never claims
   clinical validation or suitability for patient care.
8. **A user-facing change adds a fragment, not a CHANGELOG line.** Write one file
   `changes/unreleased/<your-branch>.md` with your lines under the Keep a Changelog headings CHANGELOG.md uses
   (`### Added`, `### Changed`, `### Deprecated`, `### Removed`, `### Fixed`, `### Security`, `### Known limitations`),
   each line exactly as it should read in CHANGELOG.md; several headings may share one file. Do not edit CHANGELOG.md:
   its Unreleased section stays empty (`changelog-fragments.test.ts` fails on a line there) and changes only at release,
   when `scripts/changelog-assemble.ts` builds the dated section from the fragments (RELEASE.md, step 4). Distinct
   files never conflict, so two pull requests no longer collide in CHANGELOG.md.

9. **A physiology change carries the `run-validation` label.** The validation workflow
   (`.github/workflows/validation.yml`, 30–60 min) runs on a pull request only while it carries that label. The
   `validation label` check (`.github/workflows/validation-label.yml`) fails on a pull request whose diff adds,
   changes, deletes or renames a file under `packages/engine-core/src/` (test files `*.test.ts`/`*.spec.ts` and
   documents `*.md` aside) without the label; its message says to add it. It re-runs on every push and whenever a label
   is added or removed, and it does not run on main. Add the label from the first push and read the validation run's
   conclusion as well as ci's. There is no opt-out label: a workflow is never relabelled away.

## Reporting realism problems

Use the "Clinical realism" issue template: the scenario, the mode (MANUAL or MODELED), what a clinician expects with a
source, and what the monitor showed. Never attach patient data or identifiers.
