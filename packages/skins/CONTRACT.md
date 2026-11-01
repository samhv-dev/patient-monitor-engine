# @pme/skins: the renderer and audio contract

Stage 4a ships skins as validated data; Stage 4b wires them into the live monitor. This file is the contract between
the two: `resolveSkin(id, { theme? })` returns a `ResolvedSkin`, and every field below maps onto an option that exists
on `main` **today**, or is listed as a request.

```ts
import { resolveSkin } from '@pme/skins';            // no ajv in this entry
import { validate } from '@pme/skins/validate';       // ajv; for user-supplied skins only
const r = resolveSkin('iran-icu-as-found', { theme: 'projector-light' });
```

Resolution order: base (`iec-defaults`, vendor skins only) ← skin file ← preset overrides ← theme. Arrays replace,
objects merge. `r.provenance` is merged the same way, so every leaf of `r.skin` has a covering
`{ tag, source }` entry (tested).

## Renderer (`r.render`) → what the renderer takes today

| ResolvedSkin field | Today's option | File on main | Notes |
|---|---|---|---|
| `render.background` | `LaneConfig.background`, `THEME.background` | `packages/renderer/src/sweep-lane.ts`, `monitor-core.ts` | THEME is hard-coded (request RR-1) |
| `render.lanes[i].color` | `LaneConfig.color` | `sweep-lane.ts` | byLabel / byChannel already applied |
| `render.lanes[i].mmPerS` | `LaneConfig.mmPerS` | `sweep-lane.ts` | per-lane sweep default |
| `render.lanes[i].gainMmPerMv` | `LaneConfig.gainMmPerMv` | `sweep-lane.ts` | multiplier × 10 mm/mV; AUTO → 10 plus `autoGain: true` (RR-2) |
| `render.lanes[i].label` | lead label text in `drawChrome` | `monitor-core.ts` | from `ecg.laneLabel` (`'II  X1  NORMAL'`, `'II  M'`) |
| `render.lineWidth` | `LaneConfig.lineWidth` | `sweep-lane.ts` | CSS px |
| `render.eraseGapPx` | `LaneConfig.eraseGapPx` | `sweep-lane.ts` | saadat-like 4 [inferred], others 16 |
| `render.cursorLine` | — | — | request RR-3 (all shipped skins say `false`) |
| `render.grid` | — | — | ECG-paper grid (theme `ecg-grid`); `SweepLane` paints solid background (RR-4) |
| `render.fontStack`, `numericWeight` | `NumericTile` inline CSS; `ctx.font` in `drawChrome` | `numerics-dom.ts`, `monitor-core.ts` | RR-5 |
| `render.tileColors[param]` | `TileOptions.color` | `numerics-dom.ts` | HR tile today: `#00ff66` hard-coded |
| `render.ecgFilter.engineMode` | `device ecg filter` command value `'monitor' \| 'diagnostic'` | `engine-core/src/types.ts` `EcgFilterMode` | `exact: false` when the skin's band is not one of the engine's two (E-4a-1) |
| `render.hrMethod.engine` | `HrMethod` `'dropMaxMin' \| 'mean12'` | `engine-core/src/l3/hr.ts` | `null` for `moving-average-seconds` (E-4a-2) |
| `r.skin.ecg.laneLeads` | `CoreOptions.lanes` (`'II'` → `'ecgII'`, `'V1'` → `'V1'`, `'V'` → `'V1'`) | `renderer/src/protocol.ts` | |
| `r.skin.sweep.*.options`, `ecg.gainOptions`, `ecg.filters` | display-settings menus | — | Stage 4b |

`MountOptions.skin?: string` already exists on main (`mount.ts`), and today it throws for anything but
`'philips-like'`. Stage 4b replaces that check with `resolveSkin(opts.skin)`. Stage 4a does not touch it.

## Audio (`r.audio`) → what @pme/audio takes

| ResolvedSkin field | @pme/audio API | Notes |
|---|---|---|
| `audio.alarm.profile` | `getAlarmProfile(id)` → `AlarmSoundProfile` | `'iec-style' \| 'traditional' \| 'saadat'` |
| `audio.alarm.repeatS`, `lowPulses`, `volume`, `silence` | `new AlarmSounder(scheduler, profile, { overrides })` | the skin's cadence overrides (ZOLL-like 15/30/none, Philips-like 2-pulse INOP) |
| `audio.beep.pitchMap`, `baseHz` | `pitchHz(map, spo2, baseHz)` → the `freqHz` of a `qrs`/`pulse` tone | `'none'` = fixed pitch |
| `audio.beep.enabled`, `volume` | whether mount enqueues beep tones; gain | Stage 4b |
| `r.skin.defib.toneSet` | `createTonePlayer(ctx, dest, { profile, toneSet })` | charge / chargeReady / shock / nibpDone |
| (all tone kinds) | `ToneScheduler({ play: createTonePlayer(...) })` | replaces `play: playBeep` in `mount.ts` (RR-6) |

Alarm tone ids are `alarm:<alarmId>:<train>:<burst>:<pulse>`, never reused, so `ToneScheduler.cancel(ids)` stops
pulses already handed to Web Audio.

## Sensor swaps (`layout.whenAttached`, showcase hotfix)

Optional `layout.whenAttached.<sensor>` (sensors: `co2`) = `{ lanes?: { <lane>: <lane> }, tiles?: { <param>: TileSpec } }`:
while that sensor is attached, each named lane is drawn as the mapped lane in the same position (on the layout and on
every page that lists its own lanes) and each named tile is replaced by the given tile. It is resolved in one place,
`resolveSkin(id, { sensors: { co2: true } })`; without `sensors`, or with the sensor false, the skin's own lanes and
tiles. A skin without the rule resolves byte-identically either way (test `sensor-swap.test.ts`). `saadat-like` (and
so `iran-icu-as-found`) declares `co2: RESP → CO2` and `RR → CO2 (IMCO2, AWRR)` (research/06 §3.1 F6, §5). The
renderer's `mountMonitor` starts from the engine's `patient.sensors.co2` and follows every accepted `attachSensor co2`.
In `layout.grid` (landscape), a tile named in a rule is drawn as its replacement's stand-in while the sensor is off
(rule O4, pass 3): the replacement's colour, value size (`grid.fontPx`) and label size (`grid.labelPx`) (`data-as`). A
stand-in for a split row is drawn as one part laid out by the row's first-part rule, as wide as its own tile
(Saadat-like's RR: RR with BrPM beside it, its limits left of the digits, the digits centred in the rest, as the EtCo2
part; the owner, 1 November: held to the EtCo2 part's third, it sat low-left in an otherwise empty box).

## Lanes as on the real unit (rc.3, PR-L; every key optional)

A skin without these keys draws exactly as before. Only `saadat-like` (and so `iran-icu-as-found`) sets them.

| Skin key | Renderer | Notes |
|---|---|---|
| `co2.fill?: boolean` | `PlanLane.fill` → `LaneConfig.fill` (`sweep-lane.ts` `fillWrapped`) | the area under the capnogram down to the 0 line, in the CO2 colour, drawn under the line |
| `co2.displaySmoothMs?: number` (0–500) | `PlanLane.smoothMs` → `LaneConfig.smoothN` (+ `smoothGate`, `monitor-core.ts` `SMOOTH_GATE_MMHG`) | a moving average of the DRAWN capnogram only, applied where the window's range is under 1.5–3 mmHg (the cardiogenic ripple), so an upstroke or a curare cleft is drawn as it is; the engine signal and EtCO2 are unchanged |
| `ibp.scaleLines` | `PlanLane.scaleLines`/`scaleMid` → `LaneConfig.hLines` | now read: `'dotted-upper-mid-lower'` draws dotted lines at the IBP scale's three values and prints the middle value; `'none'` as before |
| `ibp.scaleLineColor?: Hex` | `RenderPlan.scaleLineColor` | the dots' colour (absent = the lane colour); themes darken it like `colors` |
| `layout.laneText?: { labels?: { <lane>: { text, color?, sub? } } }` | `RenderPlan.laneText`, `PlanLane.rightLabel`/`scaleSuffix` (`monitor-core.ts` `drawChrome`, `repaintRightTexts`) | its presence draws the lane text in the foreground colour, each wave label and every sweep speed at the right of its lane (repainted as the erase bar passes), the CO2 scale with its unit ("50mmHg"), and no label or speed on an ECG lane that repeats an earlier lane's lead. `labels` overrides a label's text and colour (themes darken it) and adds a second line `sub`. Pages that name their lanes keep the old chrome |
| `layout.laneText.fontPx?`, `gutterPx?: { ecg, wave }`, `rightInsetPx?`, `ecgLabelX?: number[]`, `scaleX?: { edge, mid }` (pass 2) | `RenderPlan.laneText` (`LaneTextPlan`), `monitor-core.ts` `overTexts`, `overprintLane`, `overChrome` | landscape only (`renderPlan(…, portrait)`: a phone keeps the 14 px rc.3 chrome). `fontPx` sizes the lane text (default 14). `gutterPx` starts the traces at these x per lane kind instead of the 56 px chrome column; with it the lane text is drawn OVER the trace and repainted only inside the rects the sweep has just cleared and drawn (`SweepLane.takeBand`, `LaneConfig.recordBand`), so no black box cuts into a trace or the CO2 fill, and the ECG 1 mV bar follows `ecg.calPulse.defaultOn` (`RenderPlan.calBar`). `rightInsetPx` (default 6) insets the right-hand texts; `ecgLabelX` places the ECG label's parts (split at double spaces) at these x; `scaleX` puts the top and bottom scale values at `edge` and the middle one at `mid`, centred on its dotted line. `labels.<lane>.leftInsetPx` left-aligns that label this far left of the right edge, its second line on the speed's row (the pleth "NORMAL" over "X1") |
| `sweep.pxPerMm?: number` (1–10, pass 2) | `RenderPlan.pxPerMm` → `MonitorCore.pxPerMm` | the screen scale the sweep and the ECG gain are drawn at until the user calibrates (`mount` `pxPerMm`, `calibrate()`); absent = 96 dpi (3.78) |
| `co2.scaleLineTop?: boolean` (pass 2) | `PlanLane.scaleLines` = `[top]` on the CO2 lane | a dotted line at the CO2 scale top, in `ibp.scaleLineColor` |
| `co2.autoScales?: number[]` (mmHg, ≥ 2; owner 2026-11-01, E63 revisited) | `PlanLane.autoRanges` (`[scale, …larger tops]`) → `MonitorCore.co2AutoRange` (`co2-range.ts`) | the CO2 lane's auto-range, as real units widen the scale when the plateau exceeds it. Each breath's peak, found as the engine's EtCO2 detector finds it in the same displayed samples, is judged: **2 consecutive breaths** at ≥ 95 % of the current top widen the lane one step; **6 consecutive breaths** under 80 % of the next-lower top narrow it one step (on 50/80: widen at 47.5, narrow under 40; the band between is the hysteresis, so the lane does not flap at 50). One step per judgement; no breath changes nothing; above the widest top the trace still clips at the lane top (E63 there). The range, the dotted top line and the scale texts ("80mmHg", "0") follow; the lane is redrawn whole from the engine's buffer at the new scale; the EtCO2 number is unchanged. The judgement runs over the samples in index order, not over frames, so every window on one timeline (Instructor pane, learner monitor, phones: sample-identical engines) takes the same steps at the same breaths, as the pleth auto-scale is computed in each window; it keeps its scale across a resize, a restore (a follower's snapshot) and a skin/theme switch that offers the same top, and counts breaths afresh after a restore or a gap of more than 100 s. A window opened later starts at the first top and catches up within 2 breaths, except in the hysteresis band. No manual scale override (the renderer offers none for any lane). `saadat-like`: `[50, 80, 100]` |

## Alarm visuals (data only in 4a)

`r.skin.alarms.lamp` (`L1..L3` style plus `flashHz` and `duty`), `messageBar` (`bg`/`fg` per level, idle, acknowledged,
`prefix`, `rotate`), `numericFlash`, `alarmOffIcon`, `factoryEnabled`, `alwaysOn`, `silence.suppressesVisual`,
`silence.headerCountdown`: consumed by the Stage 4b alarm engine and alarm bar. The 4a preview page draws the
bars and lamps from these fields. Stage 4b adds two optional fields: `alarms.numericStyle` (`'flash-text'`, the
default, or `'flash-box'`, Mindray-like) and `layout.badge` (header text such as `LAYOUT UNVERIFIED` for skins whose
layout was not taken from a manual: `ge-like`, `mindray-like`). FU-1 adds the optional `hr.averaging`
(`{ kind: 'beats' | 'seconds', n }`, E-4a-2): the engine's HR numeric becomes the plain mean of the last n RR, or of the RR
ending in the last n seconds (at least 2); absent (every shipped skin) = the `hr.method` default.

## Limits

`r.limits[band]` has inheritance applied. `r.approximateLimits[band]` lists the keys a band took from another band
(saadat-like paediatric and neonatal HR, SpO2, RR and Temp), which the UI must mark approximate (brief §6.8).
A `null` table or cell means "not published" and must never be filled with invented values.

## FU-5: behaviour fields (monitor fidelity)

- `alarms.latching` is `{ visual, audible }`: `'lethal'` (ASYSTOLE, VFIB, VTAC, EXTREME BRADY/TACHY), `'red'` (every
  level-1 alarm), `'redYellow'` or `'off'`; audible `'off' | 'red' | 'redYellow'`. Technical alarms never latch.
  iec-defaults `lethal`/`off` (FU-5 ruling: IEC 60601-1-8 convention), philips-like `red`/`off` (Configuration Guide
  #H30), mindray-like and saadat-like `off`/`off`.
- `alarms.silence.mode`: `'mute'` mutes for `durationS` (ZOLL 90 s, Saadat 120 s with visuals); `'acknowledge'`
  acknowledges every active alarm, new alarms sound at once, `durationS` is `null` (Philips Silence, Mindray Alarm
  Reset). `r.audio.alarm.silence.durationS` is 0 for acknowledge skins.
- `glyphs.questionable` (suffix of a questionable numeric; empty on the shipped skins since E126 — the low-signal INOP carries the doubt) and `glyphs.inop` (a numeric whose INOP is active).
- Limit tables may carry `HR_extremeBrady` / `HR_extremeTachy` (absolute thresholds, mindray-like); without them the
  extreme alarms are the HR limit ∓ 20 bpm clamped (Philips).
- The engine reads `spo2.avgDefault`/`updateHz`, `hr.source`/`autoPriority`/`relabelNonEcgAs`, `nibp.initialInflation`,
  `nextInflation`, `stat`, `ibp.filterDefaultHz`, `limits.*.apneaS`/`gasApneaS` and `arrhythmia.asystoleS`.
- `ibp.staticDisplay`: a static (non-pulsatile) pressure keeps its systolic/diastolic/mean with only the pulse "-?-"
  (`'keep'`, Philips IFU p. 57; the IEC default) or shows the mean only (`'mean-only'`, saadat-like).
- `alarms.abpDisconnectDefault`: the arterial-line disconnect alarm (static, mean < 10 mmHg) is on by default
  (Philips IFU p. 44; the IEC default) or off (saadat-like, research/06 §4.1).
- `arrhythmia.pauseAlarm`: the PAUSE alarm's factory switch (mindray-like off, BeneVision N App. C.1.1.2).
- `alarms.delayS` is the vendor's alarm ON-DELAY for the limit alarms (FU-5 Task 9a, the orchestrator's ruling on the
  FU-5 plan's Open question 20): a limit condition must hold for `delayS` before the alarm is raised; it is a delay,
  never a hold that suppresses another alarm, and it resets while the alarm is chained under a live parent. SpO2 uses
  `spo2DelayS`, DESAT its own 20 s. Per skin:

  | Skin | `delayS` | `spo2DelayS` | Source |
  |---|---|---|---|
  | philips-like | 3 s | 10 s | IntelliVue IFU [S2] p. 28 (alarm delay = system delay + the measurement's trigger delay) and p. 294 (system delay "less than 3 seconds"; the bound is used); SpO2 High/Low Alarm Delay 10 s, Desat 20 s, Configuration Guide [S1] p. 66. No configurable HR/pressure on-delay is published. |
  | mindray-like | 6 s | 10 s (inherited) | BeneVision N [S4] §10.6.5, §39.4.6 factory "Alarm Delay 6 sec" (continuously measured parameters; not apnoea, not ST); the SpO2 limits keep the inherited 10 s (the skin applies `delayS` to every limit alarm except SpO2). |
  | saadat-like | 1 s | 1 s | research/06 §4.2 [M p.50] "less than 1 s" from condition to indication (the same bound convention). |
  | iec-defaults (zoll-, lifepak-, ge-like) | 0 s [ENG] | 10 s (brief §6.4) | no vendor on-delay found in research/05; these skins carry no limit table. |
- `alarms.messageBar.rotateAll` (FU-5 Task 12): the single message bar rotates every unacknowledged message, live or
  latched, every 2 s (philips-like, IFU p. 29–30), instead of the top level only.

**Recorded, not modelled (kept as documented data — FU-5 review ruling 5: documented data is never deleted):**
`nibp.modeDefault` and `nibp.autoIntervalMin` — applied at patient start only by skins with `nibp.applyAtStart`
(rc.3: saadat-like and its preset, AUTO 5 min, research/34 §8 O2); recorded, not modelled, elsewhere (the engine's NIBP
is command-driven and idle at power-on; the vendors' defaults are Philips/IEC AUTO 15 min [brief §6.8], LIFEPAK auto OFF [research/05 §2.4], Saadat MANUAL
[research/06 §4.1, M p.128], Mindray 15 min in other departments / 5 min in the OR with Start Mode Clock [S4] App.
C.1.5); the Philips Alarm Reminder (factory default On, 3 min: a tone repeat for an acknowledged alarm still present,
[S1] p. 135, 141 — decided as the vendor's default, not modelled; Stage 9 or a later FU); silencing some Philips INOPs
switches the measurement off (TEMP/ABP NO TRANSDUCER, CO2 NO TUBING, [S2] p. 57, 62, 71) — not modelled. Removed by
FU-5: saadat-like's IBP1 `PPV` tile
extra (no PPV numeric; the B9's PPV is OFF by default, research/06 §4.1), its HR `PACE`/`PVCs` and BFA `SQI`/`EMG`
extras (no such numerics); `glyphs.outOfRange` ("--") and `glyphs.ibpPrUnavailable` ("---", research/06 §3.2: no
engine numeric leaves a device range the manuals give, and no tile shows an IBP pulse rate). Option lists
(`*Options`, `autoIntervalsMin`, `ecg.filters`, `spo2.sensitivity`) and menu features (`alarms.alarmFreezeOption`,
`alarms.recall`) are settings-menu data and do not claim a behaviour; `spo2.plethNormalized` is the renderer's pleth
auto-scale, which every skin gets.

Tile `extras` the renderer draws: `PR` (SpO2: the pleth rate; NIBP: the cuff's), `PI`, `AWRR`, `T2`, `DT`, `ST`;
`MEAN` is the pressure tiles' own sub-line; NMT/BFA extras name their second readout (FU-3). The printed labels are
research/11's glossary labels (R56): "PR", "PI" (perfusion index; the LVAD index is never "PI"), "awRR", "T2", "ΔT",
"ST-II"; BFA's `BS%` (saadat-like) is the B9's alias of SR, the burst-suppression ratio.

## rc.3: tiles, header and the NIBP start (PR-T; all keys optional, set only by saadat-like)

Every key below is optional; without it the renderer and the app take today's path. Only `saadat-like` sets them, and
`iran-icu-as-found` inherits them (research/34 §3, §8; the owner-approved mock-up of IMG_8113).

| Key | Read by | Meaning |
|---|---|---|
| `layout.headerStyle: 'two-row'` | `DeviceUI` header | Row 1: page box (`chrome.pageBox`), bed (`MountOptions.bed`, default "BED 01") over the patient category (`chrome.patientCategoryColor`, from the alarm status's age band), lamp, countdown, local date over the wall-clock time; row 2: the message bar (43 % of the wave-area width). Items render only if `layout.header` lists them; battery, recorder and network are not modelled and not drawn. A phone held upright keeps the one-row header. |
| `alarms.messageBar.rotateS` | `barView` | Seconds per rotated message (saadat-like 6, measured 5.5–7 s); absent = 2. |
| `alarms.limitsDisplay: 'always'` | `DeviceUI` tiles | The rc.3 tile skeleton: every limit pair the alarm status carries, ON or OFF, small, high over low (`[data-lim=<key>]`): `_S` left of the value, `_D` right, `_M` under the left, a single key left, a part's own key inside its part. Whole numbers, temperatures to one decimal. A limit the status does not carry is never printed (O1). |
| `alarms.limitsColor` | the same | The pairs' colour; themes darken it like `colors`. |
| `hr.statusColor` | the PR tile | Colour of the PACE / ST / PVCs status lines; themes darken it. |
| `layout.showAlways` | `DeviceUI` | Module tiles drawn with blank values when the module publishes nothing (saadat-like BFA). |
| `nibp.applyAtStart` | the demo app | At a free-play patient start the app sends `nibp auto <autoIntervalMin>` (a fresh command id per start); not on a skin switch, a scenario or `?load=perf8`. |
| TileSpec `label`, `unit`, `weight`, `italic` | tiles | The printed label ('%SPO2'), unit ('BPM', '(mmHg)'), value weight (HR 700, upright) and style. |
| TileSpec `split`, `parts` | tiles | A split tile: part 0 is the main value, part k is `extras[k − 1]`, side by side (`row`) or stacked (`column`), each with its label, unit and limit key. Part 0's label and value ARE `[data-pme=lbl]` and `[data-pme=v]`. An extra the engine does not publish (SQI%, EMG%) is a blank value under its label. |
| TileSpec `status` | the PR tile | Status lines: `PACE: OFF/ON` (`ecg.paceDetectDefault`), `ST: OFF` or the ST value (`st.defaultOn`; crossed bell when the ST limit is off), `PVCs: OFF` or blank (arrhythmia analysis; crossed bell when off). |
| TileSpec `limitsLayout: 'row'` | tiles | The pairs in one row under the value, low then high (the IBP tiles of IMG_8113). |
| `glyphs.noValue`, `glyphs.inop` may be `''` | tiles | A blank field (O1): "IBP1" with no sensor reads `/` and `()`. |

## rc.3: the screen layout of the real unit (PR-G; optional, set only by saadat-like)

`layout.grid` only PLACES the tiles of `layout.tiles` (resolved through the CO2 swap); the tiles themselves are the
rc.3 tiles above. Without the key (every other skin, a phone held upright, or the rollback by data) the renderer takes
today's path: the header over the whole width, 180 px tile columns, equal lanes. `iran-icu-as-found` inherits it.

| Key | Read by | Meaning |
|---|---|---|
| `layout.waveAreaFraction` | the Stage 4a preview; `mountMonitor` with `layout.grid` | The WIDTH share of the wave column (saadat-like 0.641, the mock-up's x 0–821 of 1280). Without a grid the live monitor ignores it (the canvas takes what the tile columns leave). |
| `layout.grid.laneWeights` | `RenderPlan.laneWeights`, `MonitorCore.laneBox` | Relative lane heights, one per `layout.lanes` entry. Any other lane count (a preset's four lanes), a page that names its lanes (P7) or a demo page that passes `lanes`/`waves` draws equal lanes with the old arithmetic. |
| `layout.grid.columns`, `rows` | `DeviceUI` | The tile area's tracks (`minmax(0, <w>fr)`), right of the wave column. |
| `layout.grid.cells[]: { params, row, col, rowSpan?, colSpan? }` | `DeviceUI` | One cell (1-based row and column, spans) holding the tiles of `params` side by side. A cell naming RR places the CO2 tile while the CO2 line is attached (`applySensors`). Every tile is placed once, in a cell or the strip. |
| `layout.grid.strip: { heightPct, tile: { param, widthPct, extras? }, fields[] }` | `DeviceUI.strip` (`.pme-strip`), `mountMonitor` | A full-width strip under the waves and the tiles, `heightPct` of the monitor height: one tile at `widthPct` of the width (its `extras` replace the tile's own), then label fields of equal width (`.pme-sfield[data-field=<label>]`: `.pl` label, `.u` unit, `[data-pme=fv]` value). A field prints the engine numeric it names (`numeric`, `digits`) or stays blank (O1); a field prints no limits (E100). `color` is a colour key. |
| `layout.grid.fontPx` | `DeviceUI` | Font sizes in px at an 800 px monitor height, scaled with the monitor's height (`--pme-h`, set by `mountMonitor`): the main value per tile param (each part of a split tile), `field` for strip values, `label` and `limit`. |
| `layout.grid.labelPx?: { <param>: px }`, `labelWeight?` (pass 2) | `DeviceUI` (`photoCss`) | a tile's own label size (its split parts' labels too) over `fontPx.label`, and the weight of the tile and strip labels. Grid mode only, with the rest of the pass-2 tile CSS (the rate source, the PR status lines, the NIBP mean and mode, the T column, the CO2 parts, the strip frame). A strip field's `color` may also be a hex of its own (themes darken it) |

With a grid, `mountMonitor` puts the header (two-row, `--pme-tiles-w: 0px`) inside the wave column, so the PR tile
reaches the top edge (plan D5). Rollback by data: delete `layout.grid` from `saadat-like.json` together with its
provenance entry `layout.grid` (the provenance test reports a dangling entry otherwise); `waveAreaFraction` may stay.

The PR tile (HR) shows its rate source on skins with `hr.relabelNonEcgAs`: `(ECG)` in the HR colour, `(IBP1)` or
`(SPO2)` with the tile in that channel's colour, and a heart that lights 200 ms per beat tone. The NIBP tile prints
"S / D", "(M)", the engine's mode ("AUTO(5Min)", "MANUAL", "STAT": the `nibp` event's optional `mode` and
`intervalMin`) and the wall time at which this window received the result (blank after a restore or a late join).
This reverses FU-5's removal of the HR `PACE`/`PVCs` and BFA `SQI`/`EMG` extras, as labels with blank values. The
engine gains a `nibp manual` action: auto cycling off without aborting a running measurement, allowed without a cuff.
