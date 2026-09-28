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
- `glyphs.questionable` (suffix of a questionable numeric) and `glyphs.inop` (a numeric whose INOP is active).
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
`nibp.modeDefault` and `nibp.autoIntervalMin` (the engine's NIBP is command-driven and idle at power-on on every
skin; the vendors' defaults are Philips/IEC AUTO 15 min [brief §6.8], LIFEPAK auto OFF [research/05 §2.4], Saadat MANUAL
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
