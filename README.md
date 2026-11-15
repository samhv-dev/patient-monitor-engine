# patient-monitor-engine — static site (1.0.0-rc.5 line)

The built teaching app of `main` a6ad3c46 (Merge pull request #458 from samhv-dev/defib-e7a-second-alarm-instance), built 2026-11-15T11:54:44.234Z. Full commit:
https://github.com/samhv-dev/patient-monitor-engine/commit/a6ad3c464016a2e27a881267aacc32316f4f753c

This is a teaching simulator: not a medical device and not clinically validated. Source, release notes and known
limitations: https://github.com/samhv-dev/patient-monitor-engine (see `CHANGELOG.md`, `docs/guides/known-deviations.md`
and `docs/validation/README.md` — the validation gate reports every physiological miss by name).

This site is published by the repository's `kit-and-site` workflow once the tests have passed on a merge to `main`; nobody edits this branch
by hand. The same commit's classroom kit (the offline folder with the double-click launchers) is the `kit-latest`
pre-release: https://github.com/samhv-dev/patient-monitor-engine/releases/tag/kit-latest

What is in the offline kit only, not on this site: the classroom relay (learners' phones following the instructor's
laptop, and the learner's remote on a phone) and the kit's own `user-data` folder, where
scenario cards and debriefs are kept as plain files. This site cannot pair phones; it keeps its drafts and debriefs
in this browser only.
