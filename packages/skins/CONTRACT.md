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
layout was not taken from a manual: `ge-like`, `mindray-like`).

## Limits

`r.limits[band]` has inheritance applied. `r.approximateLimits[band]` lists the keys a band took from another band
(saadat-like paediatric and neonatal HR, SpO2, RR and Temp), which the UI must mark approximate (brief §6.8).
A `null` table or cell means "not published" and must never be filled with invented values.
