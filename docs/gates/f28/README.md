# F28 gate: the Saadat-like follower on a phone held upright

Base `origin/main` 695ca78c (rc.3). Shots by an evidence-only Playwright spec (not committed): the instructor's
session over the source relay, the phone an iPhone 13 context (deviceScaleFactor 3, isMobile, hasTouch) following it,
shot 8 s after sync.

## Phone (before = main, after = this branch)

| Size | Chromium | WebKit |
|---|---|---|
| 390 × 664 (Safari with toolbars, the owner's photo) | `before-/after-follower-saadat-chromium-390x664.png` | `before-/after-follower-saadat-webkit-390x664.png` |
| 390 × 844 | `before-/after-follower-saadat-chromium-390x844.png` | `before-/after-follower-saadat-webkit-390x844.png` |

At 390 × 664 the after shots have no grey box in the header, no "200" over "120" or "30" over "10", whole "RESP",
"IBP" and "NORMAL" labels (their speed texts are left out: the lanes are 30–36 px), and "NIBP AUTO 5min" inside its
tile. At 390 × 844 every lane text is drawn as before; only the header box and the NIBP header change.

## Landscape (pixel comparison against main)

The instructor (`#/teach`) and learner monitor (`#/monitor`) views at 1280 × 800 and 1920 × 1080, Chromium, Saadat-like,
made deterministic: the main-thread renderer (no OffscreenCanvas) under Playwright's clock, a fresh engine (seed 7)
run for exactly 12 s of fake time, CSS animations off, the random session code masked. Two runs of main and four of the
branch were compared pixel by pixel:

| View | main vs main | branch vs main (best pairing) |
|---|---|---|
| monitor 1280 × 800 | 0 | **0** (every pairing) |
| monitor 1920 × 1080 | 0–2 | **0** |
| teach 1280 × 800 | 0 | **0** |
| teach 1920 × 1080 | 0–8 | **0** |

The non-zero pairings occur between two runs of the same code too (main vs main, branch vs branch). Every such pixel is
either in the first trace column of a lane (x = 56, the RESP sweep's start) or a one-level colour step in the
instructor panel's DOM (x 1261–1263, 1376, 1904); none is in a lane text, a scale value, the header or a tile header.
The after shots are `after-teach-saadat-*.png` and `after-monitor-saadat-*.png`; they are byte-identical to main's
shots of the same pairing.
