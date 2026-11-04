# Resolution audit, 4 November 2026

The owner presented on 3 November from a Windows laptop (Chrome) on a projector and reported "several problems with
the UI, mostly because of screen resolution". Before his notes arrive, this audit records every layout fault the app
shows at the common laptop and projector sizes, and says which ones the uniform-scaling pull request fixes.

## How it was measured

- **Build.** The demo build (`main` 079d4851, kit G3, the build the demo ran on), served by the classroom relay with
  `--static`, as the kit serves it (the brief asked for `vite preview`; the relay serves the same `dist/` and also lets a
  phone join). The same audit was then run on this PR's build.
- **Browser.** Playwright Chromium (the nearest to the owner's Chrome). A device scale factor was set through the
  DevTools protocol (`Emulation.setDeviceMetricsOverride`).
- **Case.** The MH (phases) card (`showcase-mh-v2`) loaded on Instructor v2, its run sheet pressed to the MH crisis call
  and the first dantrolene (08:33), then run on: every screenshot is past Early signs (Early signs or Treated, 09:20 to
  11:15 sim time). The brief named Instructor v2 as `#/teach`; Instructor v2 is `#/teach2` (`#/teach` is the first
  Instructor view), so `#/teach2` was audited.
- **Views.** Home, Scenarios, Instructor v2, Monitor (saadat-like, default skin), Room, Debrief, and the learner's phone
  joined over the relay (iPhone user agent, touch, device scale factor 3) upright at 390 × 844 and sideways at 844 × 390.
- **Viewports.** 1280 × 720, 1366 × 768, 1440 × 900, 1536 × 864 (a 1920 × 1080 laptop at 125 %), 1600 × 900,
  1920 × 1080, 1920 × 1080 at device scale factor 1.25 and 1.5, 1024 × 768 (old projector), and 1420 × 900 (the window
  of the 26 October note).
- **What counts as a fault.** Measured in the page: the page or a panel scrolling; a text clipped by its box; in the
  monitor, a tile text that wraps, leaves its tile, inks over another text of its tile, or is drawn below 9 px (the
  renderer's own legibility floor, `LIM_MIN_PX`); an element past the viewport. Then each screenshot was looked at for
  overlaps the measures do not see, and compared with 1920 × 1080 at 100 %.
- **Script and screenshots** (not committed): `scratch/post-demo-resolution/audit.mjs`; screenshots of the demo build in
  `scratch/post-demo-resolution/shots-base/` (1420 × 900 in `shots-base-1420/`), of this PR in `shots-fix/`, with
  `results.json` (every measure) beside them.

## Fault table

62 cells were audited (6 views × 10 viewports, and the phone in its two orientations). The table has 18 rows, one per
fault and view and viewport (F2 is one row for the Monitor view at every size): 10 rows are fixed by this PR (F1 to F4),
8 are listed for the orchestrator (O1 to O8) and are not touched here.

| # | View | Viewport | Fault (demo build) | Measured | This PR |
|---|------|----------|--------------------|----------|---------|
| F1 | Instructor v2 | 1280 × 720 | The learners' monitor is squeezed to the pane's leftover height with the column's full width: the Saadat screen drawn at 4.7 : 1 instead of 1.6 : 1. The grid's fonts follow the height only, so the tile texts shrink to unreadable while the tiles stay wide; lane labels run into the sweep-speed text ("NORMAL25 mm/s"), the IBP scale values ink over each other, the alarm message is cut ("NIBP SYS TOO LO"). | pane 507 × 107 px; 71 tile texts below 9 px (limits at 2 px), 10 outside their tile (HR "50", "PVCs: OFF", NIBP limit pairs, the cuff time) | Fixed: the whole screen at one scale, 171 × 107 px, letterboxed; nothing wraps or leaves its tile. Still too small to read: O1. |
| F1 | Instructor v2 | 1366 × 768 | as above | pane 547 × 155; 67 texts below 9 px, 5 outside their tile (NIBP limits, cuff time, SpO₂ value and limit) | Fixed (248 × 155); too small: O1 |
| F1 | Instructor v2 | 1420 × 900 | as above (the window of the 26 October note, where the NIBP tile wrapped in the first Instructor view's pane) | pane 572 × 287; 60 texts below 9 px; NIBP "60" outside its tile | Fixed (459 × 287) |
| F1 | Instructor v2 | 1440 × 900 | as above, milder | pane 581 × 287; 60 texts below 9 px; NIBP "60" outside its tile | Fixed (459 × 287) |
| F1 | Instructor v2 | 1536 × 864 | as above, milder | pane 625 × 350; 57 texts below 9 px | Fixed (560 × 350) |
| F1 | Instructor v2 | 1600 × 900 | as above, milder | pane 655 × 386; 52 texts below 9 px | Fixed (618 × 386) |
| F1 | Instructor v2 | 1024 × 768 | as above, and the IBP1 value inks over its limits | pane 389 × 205; 63 texts below 9 px, 3 outside, 4 overlaps ("109" × "165", "69" × "35", "(80)" × "(mmHg)", "(80)" × "115") | Fixed (328 × 205) |
| F2 | Monitor | every size but 16 : 10 | The screen is stretched to the window: the wave column is 64.1 % of whatever width there is, so the time the wave canvas spans changes with the window (at 25 mm/s and the skin's 3.10 px/mm: 15.9 s at 1920 × 1080, 8.5 s at 1024 × 768), and the tiles change shape. No text wraps at these sizes. | wave canvas 1231 px wide at 1920, 656 at 1024 | Fixed: 10.6 s at every size (821 design px), the tiles keep the photo's shape; the screen is letterboxed (1670 × 1044 at 1920 × 1080, 125 px each side) |
| F3 | Phone sideways | 844 × 390 | No waveforms: the phone keeps the upright layout (tiles in a 3-column grid, the wave canvas 0 px high), and the CO2 tile is cut by the bar under the monitor. Defect reported on 26 October (mock-up m14). | canvas 844 × 0 CSS px; CO2 tile bottom 358 > monitor 310 | Fixed: the whole Saadat screen at one scale, 541 × 338 px (m14: 547 × 342), the bar on one row; turning the phone switches layout without a reload |
| F4 | Phone sideways | 844 × 390 | The bar under the monitor takes two rows (80 px of 390) | bar 80 px | Fixed (one row, 52 px) |
| O1 | Instructor v2 | 1280 × 720, 1366 × 768 | After F1 the monitor is whole but 107 and 155 px high: unreadable. The pane gets only what the cue box, Fast forward and the alarm line leave. The height split is the E127 design's (the owner asked for the monitor about a quarter of the page, top right). | 171 × 107, 248 × 155 | Orchestrator (E127 layout) |
| O2 | Instructor v2 | 1280 × 720 | ACTION scrolls (the MH card's 10 open rows at Early signs); the 1440 × 900 fit test does not cover 720-high windows | 540 > 505 px | Orchestrator |
| O3 | Instructor v2 | 1024 × 768 | The dock overflows: "Patient" and "Log" are drawn over the thumbs-up and note group; the header's patient line and case name are cut ("M 35 y 80…", "Malignant hyperthermia (pha…") | see `teach2-1024x768.png` | Orchestrator |
| O4 | Instructor v2 | 1280 × 720, 1366 × 768 | The fast-forward toast (centred, top) covers the RUNNING pill and its clock for the toast's life | toast x 530–750 vs pill from 705 at 1280; 5 px overlap at 1366; none from 1440 | Orchestrator |
| O5 | Instructor v2 | 1280 to 1600 wide | The Fast forward box's note is cut to "the phones catch u…" (its text is the only place that says the phones catch up at the end) | 355 px of text in 114–261 px | Orchestrator |
| O6 | Instructor v2 | every size below 1920 | ACTION's row titles and sub-lines are cut with an ellipsis (designed so; at 1280 the call row reads "MH crisis: stop sevoflurane, charcoal filters, propofol infusion, O₂ 100 %…") | 1 row at 1920, 4 or more below | Orchestrator (design check) |
| O7 | Room | every size | The typed join address breaks inside the session code ("…?join=S9T" / "567"), so the code reads as two pieces | see `room-*.png` | Orchestrator |
| O8 | Monitor | 1920 × 1080 at 1.25 and 1.5 | Not measurable from the page: the host monitor draws in a worker (OffscreenCanvas), so the canvas element's size does not show its backing store. Layout identical to 100 %. | — | Orchestrator (a check in the worker if wanted) |

Home, Scenarios and Debrief showed no fault at any of the ten viewports (no scroll of the page, no clipped text, nothing
past the viewport; the Debrief scrolls inside its view, as designed). The upright phone (390 × 844) showed none either.
The 1920 × 1080 layouts at device scale factors 1.25 and 1.5 are the same as at 100 % in every view.

The sizes in the last column are the whole screen at k = min(pane width / 1280, pane height / 800) for the pane the demo
build measured; the pane's height follows the cue text of the phase on screen, so a run at another moment gives other
panes (the PR's screenshots), never another proportion.

## What this PR changes

1. **The monitor scales as one unit** (renderer `mountMonitor`, skins `layout.grid.screenPx`). A skin whose grid names
   the screen it was measured on (saadat-like: 1280 × 800, the rectified photo IMG_8113 the grid, the fonts and the sweep
   scale were all measured in) is laid out at that size, and the whole of it, waves, header, tiles, strip and every font,
   is scaled by one factor `k = min(width / 1280, height / 800)` into the space it is given, centred, the rest in the
   skin's background. Its proportions never change, so no tile wraps and no text leaves its tile at any window size.
   The canvas backing store follows the device pixels (device pixel ratio × k), so traces stay sharp when scaled up; a
   `calibrate()` value (screen px per mm) is converted into the design's px. Skins without `screenPx` (philips-like and
   the rest) and an upright phone fill their box exactly as before.
2. **The Instructor v2 pane** shows the same unit, scaled to the pane: at every width down to 1280 (and at 1024) the
   NIBP, EtCO₂ and SpO₂ tiles are whole and unwrapped. How large the pane is stays the E127 design's (O1).
3. **The landscape phone** shows the whole Saadat screen (owner's mock-up m14) and follows each turn of the phone;
   upright it keeps the F28 layout.

No colour, typeface or font size of the skin changed: the sizes are the skin's own at 1280 × 800, then scaled.
