# Releasing

Who does what: the stage executor prepares the release in a pull request and stops. **The orchestrator (or samhv-dev)
merges the PR and pushes the tag.** Pushing a `v*` tag runs `.github/workflows/release.yml`, which rebuilds the tagged
commit and creates the GitHub release with its assets, the classroom kit zips among them.

## The classroom kit and the site (after `ci` passes on each merge to `main`, no hand step)

`.github/workflows/kit-and-site.yml` runs when a `ci` run on `main` completes (`workflow_run`, the owner's ruling of
12 Nov 2026: publish only after the tests have passed for that merge). It goes on only if that run concluded
`success`, was a push to `main` and belongs to this repository; it then builds and publishes EXACTLY the commit that ci
run tested (the run's head SHA), never a newer one. It builds the kit once through `.github/workflows/kit-build.yml`
(also used by `release.yml`):

- `node scripts/showcase/make-bundle.mjs` twice: the macOS/Linux kit, and the Windows kit with `--win-node` (the
  official Node.js for Windows x64, version and SHA-256 pinned in `kit-build.yml`'s `WIN_NODE_*` lines; the download
  must match the pin, and make-bundle checks it against nodejs.org's `SHASUMS256.txt` again). Each is zipped with its
  file modes: `pme-classroom-kit.zip`, `pme-classroom-kit-windows.zip`.
- on the UNZIPPED zips: `check-relay.mjs` on both kits (Linux), `check-servers.mjs` on the macOS/Linux kit (a macOS
  runner: it starts ruby, perl and node through the launcher and mounts a read-only disk image), and the site tree
  (`scripts/showcase/site-tree.mjs`: the kit's app without `pme-kit.json`, `LICENSE`, `LICENSES/`, `NOTICES.md`,
  `VERSION.txt`, `.nojekyll`, and `scripts/showcase/site/README.md` with the commit filled in) with `check-subpath.mjs`.

Then, in this repository only: the `pages` job pushes the site tree to `gh-pages` as a new commit on top of the branch
(the Pages setting stays "deploy from branch gh-pages"; never a force-push), and the `prerelease` job moves the
`kit-latest` tag to the commit and replaces the files of the ONE rolling pre-release "kit-latest" (marked pre-release,
never "latest"; its notes name the commit and say it is not a numbered release): the two kit zips and their
`SHA256SUMS.txt`. Each publishing job first asks the API again that ci passed on that commit, then
`scripts/showcase/publish-order.mjs`, which compares the commit with the one already published (the `Commit:` line
of `gh-pages`'s `VERSION.txt`; the commit `kit-latest` points at) and publishes only when it is strictly newer.

Two merges close together, A then B: ci runs for both (main's ci runs are never cancelled) and either may finish
first. If A's finishes first, A is published, then B. If B's finishes first, B is published; A's run comes later,
finds B already published, and leaves the site and kit-latest as they are ("a newer commit is already published").
The kit-and-site runs never overlap and none is cancelled half-way (one concurrency group, no cancelling; a waiting
run is replaced by a newer one). Either way the newest passed merge is what is published, and an older one never
replaces it. A merge whose ci fails publishes nothing; the site stays at the last merge that passed.

**`workflow_run` runs the workflow file as it is on the default branch.** Whatever commit ci tested, the
`kit-and-site.yml` that runs is `main`'s, and the `kit-build.yml` it calls is `main`'s too (the scripts it runs,
`make-bundle.mjs` and the checks, come from the tested commit, which it checks out). So:
- the first merge that brings this workflow publishes: its own ci run's completion starts the `kit-and-site.yml` that
  merge put on `main`;
- a pull request that changes `kit-and-site.yml` or `kit-build.yml` is NOT run through `workflow_run` on its branch:
  the change takes effect at the ci completion of its own merge. Before merging such a change, a maintainer tries it
  on its branch by hand: `gh workflow run kit-and-site.yml --ref <branch> -f dry_run=true` (Actions → kit-and-site →
  Run workflow), which runs the BRANCH's file on the branch's head and builds and checks everything (`pages` and
  `prerelease` are skipped: not `main`, and a dry run), and reads the artifacts `kit-zips` and `site` (`site.tar`);
  `release.yml` with `-f dry_run=true` does the same for the release path. The workflow_run conditions themselves
  (the passed-ci gate) can only be seen working on `main`: read the first kit-and-site run after the merge.

A maintainer does nothing by hand for either. To republish `main`'s head (say after a failed publish): Actions →
kit-and-site → Run workflow on `main` with "publish nothing" unticked; it publishes only if ci passed on that commit
and it is newer than what is published. What stays by hand: the Windows checklist of the kit's `READ ME FIRST.txt`
(step 10 below) and moving the Windows Node.js pin when a newer 22.x is wanted.

## Before the tag (on the merged `main`)

1. `ci` is green on the merge commit (a push to `main` runs every job): `build`, the three `unit` jobs, `renderer`, the four shards of `e2e (chromium …)` and the three of `e2e (webkit …)`, `e2e-count`, and all eleven `test-slow` groups (`slow-a` … `slow-i`, `showcase-a`, `showcase-b`). Read the "e2e tests that passed only on retry" step of every e2e shard (on WebKit it never fails the job) and list any line in the release notes' browser-coverage section.
2. `docs/guides/validation-summary.md` quotes the `docs/validation/report.md` of the release tree, or states that it
   is older and why (which physiology changes it predates). To refresh it: run `pnpm validate` on the tree (or the
   `validation` workflow, Actions → validation → Run workflow) and land the regenerated report in a PR before tagging.
3. Versions: every library `package.json` and `version` constant say the release version
   (`pnpm --filter @pme/validation exec vitest run test/release-versions.test.ts`).
4. `CHANGELOG.md` has a `## [x.y.z] - YYYY-MM-DD` section with today's date, and `CITATION.cff` the same
   `version` and `date-released`. The section is built from the fragments under `changes/unreleased/` (one per pull
   request; CONTRIBUTING.md), in the release PR: run the assembler,
   `node --experimental-strip-types scripts/changelog-assemble.ts x.y.z YYYY-MM-DD --dry-run` to see the section, then
   without `--dry-run` to write it (it also moves the compare links and deletes the fragments); review the section,
   add the release's summary paragraph by hand if it has one, and commit it with the version bump. The assembler
   refuses while CHANGELOG.md's Unreleased section still has lines (`changelog-fragments.test.ts` keeps it empty).
5. Locally: `pnpm install --frozen-lockfile && pnpm build && pnpm check-notices && pnpm check-licences && pnpm check-size
   && pnpm pack-smoke && pnpm docs:api` all pass.
6. `NOTICES.md` is complete (every bundled template, derived file and runtime dependency) and every licence text it
   points to is in `LICENSES/` (`pnpm check-licences` checks both for shipped packages).
7. The version label is `1.0.0-rc.1` (the owner's ruling, Q8 of the Stage 8b plan): a pre-release until the calibration
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
   `LICENSE`, `NOTICES.md` and `LICENSES/` inside), `pme-classroom-kit-v1.0.0-rc.1.zip` and
   `pme-classroom-kit-windows-v1.0.0-rc.1.zip` (the kit as `kit-build.yml` built and checked it), `api-reference-v1.0.0-rc.1.zip` (with `NOTICES.md` and the TypeDoc and
   lunr licence texts inside), `LICENSES.zip`, `SHA256SUMS.txt` (covering every other asset), `LICENSE`, `NOTICES.md`,
   with the CHANGELOG section as notes.
2. Download the embed zip, unzip, open `ventilator-monitor.html` by double-click in Chrome and Safari: the ventilator
   breathes, the monitor shows SpO2 and EtCO2, no console errors.
3. npm: not at this release (Q1, ruled: GitHub release only). The release notes say "ES module packages: build from
   source". If a later release publishes, it is `pnpm -r publish --access public` from the tagged commit by the owner
   of the npm scope (decide the scope first) — pnpm applies each package's `publishConfig`.
4. Update `docs/RESUME.md` and the rulings file.
5. GitHub Pages: nothing to do. The merge to `main` before the tag published the site of that commit once its ci
   passed (`kit-and-site.yml`, above); check that Home shows "Version 1.0.0-rc.‹n› · pre-release · build …" and the footer line
   "For educational use only; Not to be used in patient care.". The Pages site cannot pair learners' phones: they
   need the classroom relay of the local kit (README). (Until brief 169 this step was a hand build pushed with a
   force-push; the workflow now adds a commit on top of `gh-pages` instead.)

## Later: 1.0.0 (not at the release candidate)

- DOI (Q5, deferred to 1.0.0): samhv-dev enables the repository in Zenodo's GitHub integration BEFORE pushing the `v1.0.0`
  tag; Zenodo then mints a DOI for that release; add `doi:` to `CITATION.cff` in a small PR afterwards.
- Versions: `node --experimental-strip-types scripts/release-manifests.ts 1.0.0`, the six constants and their tests,
  CHANGELOG (the assembler, step 4 above), CITATION — `release-versions.test.ts` checks they agree.

## If the workflow fails

Fix on a branch through a PR, merge, then move the tag only if the release was not created:
`git tag -d v1.0.0-rc.1 && git push origin :refs/tags/v1.0.0-rc.1`, and tag the new merge commit. Never rewrite a published
release's assets.
