# Releasing

Who does what: the stage executor prepares the release in a pull request and stops. **The orchestrator (or Ali)
merges the PR and pushes the tag.** Pushing a `v*` tag runs `.github/workflows/release.yml`, which rebuilds the tagged
commit and creates the GitHub release with its assets.

## Before the tag (on the merged `main`)

1. `ci` is green on the merge commit: `build`, `renderer`, `e2e (chromium)`, `e2e (webkit)` and all eight `test-slow` groups (`slow-a` … `slow-g`, `showcase`). Read the "e2e tests that passed only on retry" step of both e2e jobs (it never fails the job) and list any line in the release notes' browser-coverage section.
2. `docs/guides/validation-summary.md` quotes the `docs/validation/report.md` of the release tree, or states that it
   is older and why (which physiology changes it predates). To refresh it: run `pnpm validate` on the tree (or the
   `validation` workflow, Actions → validation → Run workflow) and land the regenerated report in a PR before tagging.
3. Versions: every library `package.json` and `version` constant say the release version
   (`pnpm --filter @pme/validation exec vitest run test/release-versions.test.ts`).
4. `CHANGELOG.md` has a `## [x.y.z] - YYYY-MM-DD` section with today's date, and `CITATION.cff` the same
   `version` and `date-released`.
5. Locally: `pnpm install --frozen-lockfile && pnpm build && pnpm check-notices && pnpm check-licences && pnpm check-size
   && pnpm pack-smoke && pnpm docs:api` all pass.
6. `NOTICES.md` is complete (every bundled template, derived file and runtime dependency) and every licence text it
   points to is in `LICENSES/` (`pnpm check-licences` checks both for shipped packages).
7. The version label is `1.0.0-rc.1` (Ali's ruling, Q8 of the Stage 8b plan): a pre-release until the calibration
   pass and the blind review have run. The workflow flags any `v*-*` tag as a GitHub pre-release; check the release
   page says "Pre-release".
8. Tick-cost gate (FU-11 J5, F10). On an idle machine (nothing else running):
   `npx -y pnpm@9.15.9 --filter @pme/validation perf:ticks --seconds 600 --budget-ms 6` exits 0 (6 ms: Stage 8a's
   stated bound "p99 ≪ 6 ms", measured 0.53 ms; `docs/gates/stage-8a.md`). CI does not run it (shared runners). The run
   rewrites `docs/validation/perf/ticks.json`: restore it unless the release lands a new measurement on purpose.
9. Soak with a busy Ventilator view (FU-11). With the Ventilator view open at ×4 and a Remote paired, the Remote shows
   its first state within 5 s and the host's frame p95 stays ≤ 20 ms for 10 min (record both numbers). The frame p95
   is read as the FU-11 D gate read it (`docs/gates/fu-11-d.md`, "Host frame p95"; evidence
   `docs/gates/fu-11-d/step4-*.json`: n ≈ 60 per second): the intervals between `requestAnimationFrame` callbacks in
   the host window, collected by a Playwright script on the dev server (that gate's script was a scratch file, not
   committed) or pasted into the host window's console, and their 95th percentile over the 10 minutes.
10. Classroom kit on Windows: until the owner has ticked the 10-line checklist in the kit's `READ ME FIRST.txt` (section
   WINDOWS) on a Windows PC, the release notes say "Windows launchers (`.cmd`): untested on Windows at this release".

## Tag (orchestrator only)

```bash
git checkout main && git pull --ff-only
git tag -a v1.0.0-rc.1 -m "patient-monitor-engine 1.0.0-rc.1"
git push origin v1.0.0-rc.1
gh run watch "$(gh run list --workflow release --limit 1 --json databaseId --jq '.[0].databaseId')"
```

## After the workflow

1. The release page lists `patient-monitor.iife.js` (+ `.map`), `ventilator-monitor-embed-v1.0.0-rc.1.zip` (with
   `LICENSE`, `NOTICES.md` and `LICENSES/` inside), `api-reference-v1.0.0-rc.1.zip` (with `NOTICES.md` and the TypeDoc and
   lunr licence texts inside), `LICENSES.zip`, `SHA256SUMS.txt` (covering every other asset), `LICENSE`, `NOTICES.md`,
   with the CHANGELOG section as notes.
2. Download the embed zip, unzip, open `ventilator-monitor.html` by double-click in Chrome and Safari: the ventilator
   breathes, the monitor shows SpO2 and EtCO2, no console errors.
3. npm: not at this release (Q1, ruled: GitHub release only). The release notes say "ES module packages: build from
   source". If a later release publishes, it is `pnpm -r publish --access public` from the tagged commit by the owner
   of the npm scope (decide the scope first) — pnpm applies each package's `publishConfig`.
4. Update `docs/RESUME.md` and the rulings file.
5. Publish the rc.1 static build to GitHub Pages (the owner's go-ahead, relayed 2026-10-18: "the update after rc1 is
   acceptable"; it supersedes the Stage 8b plan's Q3 for this release). Once, after the tag, from the tagged commit:
   `node scripts/showcase/make-bundle.mjs <scratch>/kit` (the kit's relative-base build of the app, with its
   `VERSION.txt`); copy `<scratch>/kit/app/` into a clean gh-pages tree with an empty `.nojekyll`, the kit's
   `VERSION.txt`, `LICENSE`, `NOTICES.md` and `LICENSES/`; check that the Start view shows "Version 1.0.0-rc.1
   (pre-release). For education only. …"; commit and force-push the `gh-pages` branch ONLY (never `main`); record the
   gh-pages commit in the gate note or the rulings file. The Pages site cannot pair learners' phones: they need the
   classroom relay of the local kit (README).

## Later: 1.0.0 (not at the release candidate)

- DOI (Q5, deferred to 1.0.0): Ali enables the repository in Zenodo's GitHub integration BEFORE pushing the `v1.0.0`
  tag; Zenodo then mints a DOI for that release; add `doi:` to `CITATION.cff` in a small PR afterwards.
- Versions: `node --experimental-strip-types scripts/release-manifests.ts 1.0.0`, the six constants and their tests,
  CHANGELOG, CITATION — `release-versions.test.ts` checks they agree.

## If the workflow fails

Fix on a branch through a PR, merge, then move the tag only if the release was not created:
`git tag -d v1.0.0-rc.1 && git push origin :refs/tags/v1.0.0-rc.1`, and tag the new merge commit. Never rewrite a published
release's assets.
