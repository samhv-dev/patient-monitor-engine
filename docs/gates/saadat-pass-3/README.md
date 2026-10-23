# Saadat pass 3: evidence (the owner's 2026-10-23 review of rc.3)

**Before** is `main` fcf99b70 (the rc.3 commit). **After** is the `saadat-pass-3` branch. All images are 8-bit
indexed PNGs at CSS pixel size.

## The owner's viewport, on the Instructor view (`instructor/`)

The images come from `apps/demo/e2e/saadat-instructor-tiles.e2e.ts` with `PME_SHOTS=1`. They show the monitor pane
only, with the instructor panel open beside it.

| Viewport | Monitor pane | Why |
|---|---|---|
| 1990 × 920 | 1430 × 820 | The owner's Safari window (1990 × 1080 outside, about 160 px of toolbars) |
| 1990 × 1080 | 1430 × 980 | The full-height viewport |
| 1420 × 900 | 1000 × 800 | Found by the release-day rehearsal on the rc.3 kit |

- **States:** `rr` is the default patient, with no capnograph and the RR tile. `etco2` is the patient ventilated with
  the CO₂ sampling line attached from the Devices tab.
- **Engines:** Chromium and WebKit.

The e2e measures the ink box of every text in the HR, NIBP, TEMP, RR/CO2, IBP1, IBP2, BFA and SpO2 tiles. It uses
canvas `measureText` at the node's computed font, placed on its DOM baseline.

| Viewport | Before (main) | After |
|---|---|---|
| 1430 × 820 pane | `mmHg` × `FiCo2`, `AWRR` × `30`; while the cuff runs, NIBP "mmHg NBP inflating" wraps and pushes the MAP limit `60` out of the tile | 0 overlaps, 0 outside, 0 wrapped |
| 1430 × 980 pane | the same, plus `AWRR` × `5` | 0 overlaps, 0 outside, 0 wrapped |
| 1000 × 800 pane | the CO2 overlaps; NIBP `110`, `60` outside while the cuff runs; the T values end 0.4 px past the tile's right edge | 0 overlaps, 0 outside, 0 wrapped |

The e2e also checks these, and passes on both engines:

- the IBP1 "( )" sits over its mean limits;
- the BFA labels are evenly spaced;
- the T values are right-aligned inside the tile;
- the RR tile's label, unit, digit and limit fonts, colours and digit row equal those of the EtCo2 part.

## The standard sizes (`sizes/`)

These come from the renderer mounted alone with the app's stylesheet (`apps/demo/src/app/app.css`), under Playwright's
fake clock. Each size has both states, `rr` and `co2`.

- **Chromium:** 1430 × 820, 1000 × 800, 1280 × 800, 1366 × 768, 1920 × 1080 and 1024 × 640.
- **WebKit:** 1430 × 820 and 1000 × 800.

After the in-run review, two more states were shot on both engines, with the CO₂ line attached:

- `after-1430x820-co2-art-*`: an arterial line in IBP1, so the IBP value prints over its limit pairs;
- `after-1000x800-co2-art-hi-*`: also an EtCO₂ of 101 at the 1000 × 800 pane, which takes the fit's last step (the
  digits scale down).

The same ink probe ran on every image:

- **Before:** every `co2` image has the two CO2 overlaps. At 1024 × 640 the FiCo2 and AWRR digits also fall outside
  the tile.
- **After:** no overlaps, nothing outside a tile and nothing wrapped, at any size, on either engine.

## The photo composite (1280 × 800)

The renderer was driven to the photo's state. Each composite shows the photo, the build, and a 50 % overlay below.

- `composite-photo-vs-pass3-1280x800.png` is the branch.
- `composite-photo-vs-main-1280x800.png` is `main`.

## The other skins and portrait

The pixel comparison used the same harness and Chromium, at 1280 × 800.

- **philips-like, mindray-like, ge-like, zoll-like, lifepak-like:** 0 differing pixels against `main`.
- **Saadat-like in portrait (390 × 664, F28), Chromium and WebKit:** the tiles are identical. The only differing
  pixels are in the lanes. Two runs of `main` against each other differ by the same amount, so this is lane noise
  between runs.
- **F28 e2e:** passes.

## Tools

The tools are in `scratch/saadat-pass-3-tools/`, outside the repository:

- `shots.mjs` (the harness);
- `run-sizes.sh`;
- `ink.js` (the ink probe);
- `pxdiff.mjs`;
- `compose.mjs`.
