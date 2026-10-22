# Saadat fidelity pass 2: evidence

Branch `saadat-pass-2` from `origin/main` 695ca78c (rc.3). The work list is the rc.3 photo review (44 rows G, T, C, W,
measured against the owner's photo IMG_8113, rectified to 1280 × 800). Owner rulings E114 (alarms on), E115 (limits)
and E116 (lead II twice) apply.

## How the shots were taken

The renderer is mounted alone, with the worker off and engine seed 1, under Playwright 1.63's fake clock: no time
passes except what the script runs. Two trees give the same pixels for the same code (two runs of main: 0 differing
pixels). Before this harness, the same view moved by a few frame-boundary pixels from run to run.

- `tools/zz-p2-harness.html` is copied into `apps/demo/` for the run and removed afterwards; it is not shipped.
- `tools/harness-shots.mjs <worktree> <out> <chromium|webkit> skin@WxH[@portrait][@photo][@ms]` takes the shots.
- `tools/compose.mjs` draws the composite: photo | build, with a 50 % overlay below (the review's layout).
- `tools/pxdiff.mjs` counts the pixels that differ between two shots.

**Photo state** (`@photo`; the review's sequence, applied as engine commands):

- manual mode;
- the CO₂ line on a ventilator at 12/min, which gives AWRR 12, as in the photo (the review's app run read 14);
- CVP in IBP2, no IBP1 line, temperature probes off;
- NIBP AUTO 20 min;
- targets HR 98, SBP 119, DBP 90, SpO₂ 100, PI 2.8, EtCO₂ 32, RR 12;
- then 70 s of fake time.

The values on screen differ a little from the photo. These are state differences, not scored (review §7): HR 99,
NIBP 133/86, SpO₂ 100, PI 1.9, an ADULT patient, gain X1.

The PNGs here are reduced to 256 colours to keep the repository small. Every pixel comparison was made on the raw
shots.

## Files

| File | What |
|---|---|
| `composite-photo-vs-build-1280x800.png` | photo, then this branch (after the in-run review fixes), then the 50 % overlay |
| `composite-photo-vs-main-1280x800.png` | the same composite for main 695ca78c (the "before") |
| `build-1280x800.png`, `build-1920x1080.png`, `build-1024x640.png` | this branch at three landscape sizes |
| `portrait-390x664-chromium.png`, `portrait-390x664-webkit.png` | this branch on a phone in portrait (`mountMonitor` `portrait`) |
| `portrait-main-pass2-with-f28-390x664.png` | phone in portrait, left to right: main, this branch, this branch with PR F28's two commits cherry-picked (Chromium), the same on WebKit |
| `unchanged-{philips,mindray,ge,zoll,lifepak}-like-1280x800.png` | the five other skins on this branch |
| `iran-icu-as-found-1280x800.png` | the as-found preset. It inherits the lane and tile changes and keeps its alarms off. |

## Results

- **Other skins, unchanged.** philips-like, mindray-like, ge-like, zoll-like and lifepak-like at 1280 × 800 on
  Chromium: **0 differing pixels** against main 695ca78c. Every pass-2 change sits behind a new optional key or in
  grid / two-row / lane-text code, and only saadat-like opts into those.
- **Phone in portrait.** The lane keys apply only in landscape (`renderPlan(…, portrait)`), so a phone keeps the rc.3
  lane chrome that PR F28's fit guards measure. Main and this branch differ in portrait only through these changes:
  - the bells that E114 removes;
  - the 3.10 px/mm sweep;
  - the 10 px gap and the 2 px traces;
  - the taller canvas that comes from dropping the CO₂ tile's bell row.

  PR F28's three facts at 390 × 664 hold on Chromium and WebKit with both PRs applied: no overprinted scale values,
  the lane labels visible, and the NIBP header inside its tile ("AUTO 20min"). The same three facts fail on main and on
  this branch alone, because they are what F28 fixes. Merging the two PRs needs:
  - one hand-merge in `paintHeader`: `(this.two || this.portrait) && !b.text`;
  - one flipped expectation in F28's `header-two-row.test.ts`: the two-row idle bar is now transparent (C3).
- **Landscape 1024 × 640.** The pleth lane is about 68 px high, so its "X1" line gives way to the speed (a new fit
  guard). Every other text stays.

Superseded: the saadat-like shots in `../saadat-pr-g/`, `../saadat-pr-l/` and `../saadat-pr-t/` show rc.3, not this
pass.
