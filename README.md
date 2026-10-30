# patient-monitor-engine 1.0.0-rc.4 (pre-release) — static site

The built teaching app of the preview branch `preview-oct30c` (`b6183d34`, 2026-10-30): `main` 6d19b8b3 plus twelve DRAFT changes from the clinical owner's first-use list (#202–#206: one Instructor entry chosen in Settings, the strip's inline confirmation, past stages after a reload, finished steps grouped by stage, the monitor's return controls off the ECG; #210: with no case, Instructor v2 shows three cards; #211: the Case briefing over the learners' monitor on a card load; #207: IBP lane scales, fixed, typed or AUTO; #208: escape rhythms start at their own interval; #209: the MH sympathetic surge constricts the skin so the core heats; #213: the ECG auto-gain holds through ectopy, changes with hysteresis and reads the same in every window; #214: "Finish the case" in Instructor v2 with the browser's debrief archive, Save and restart, Debrief now, Save and close). Not in this build: #212 (the education line off the working views; it collides with #211's End briefing box in the stage strip, a design call pending). A preview for the owner, not a release and not the demo kit; the version line still reads 1.0.0-rc.4 by design. New since the tag: a second instructor view at `#/teach2` (Instructor v2), corrected Explore units, labels and Drugs-page rows, and relay fixes. For education only:
not a medical device and not clinically validated. Source, release notes and known limitations:
https://github.com/samhv-dev/patient-monitor-engine (see `CHANGELOG.md` and `docs/guides/known-deviations.md`).

Learners' phones need the classroom relay of the local kit, built from a source checkout with
`node scripts/showcase/make-bundle.mjs` (Node.js ≥ 22); this static copy on GitHub Pages cannot pair phones.

`VERSION.txt` names the exact build. Licence: MIT (`LICENSE`); third-party notices in `NOTICES.md` and `LICENSES/`.
