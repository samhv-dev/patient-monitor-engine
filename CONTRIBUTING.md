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

10. **The classroom kit and the site are built by the workflows, never by hand.** When `ci` has PASSED on a merge to
   `main`, `.github/workflows/kit-and-site.yml` (a `workflow_run` trigger) builds that very commit's kit with
   `scripts/showcase/make-bundle.mjs` (a macOS/Linux kit and a Windows kit with a pinned, checksum-verified Node.js),
   checks the unzipped kits (`check-relay.mjs`, `check-servers.mjs` on macOS), publishes the site tree
   (`scripts/showcase/site-tree.mjs`) to the `gh-pages` branch and refreshes the rolling `kit-latest` pre-release,
   never over a newer commit (`scripts/showcase/publish-order.mjs`); a `v*` tag attaches the same kit zips to its
   release (`release.yml`). Do not push `gh-pages` or edit `kit-latest` yourself. `workflow_run` runs the workflow
   file of `main`, so a change to `kit-and-site.yml` or `kit-build.yml` is tried on its branch by hand before the
   merge: `gh workflow run kit-and-site.yml --ref <branch> -f dry_run=true` (artifacts `kit-zips` and `site`; nothing
   is published). RELEASE.md, "The classroom kit and the site", has the details.
