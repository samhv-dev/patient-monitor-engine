# Embedding the monitor

Two ways in: **ES modules** for applications with a bundler, and **one IIFE file** for static pages, `file://` and
hosts without a build step (brief §7.6). Both run the engine in a Web Worker with an OffscreenCanvas when the browser
allows it and fall back to the main thread otherwise; the audio always runs on the main thread.

## The IIFE (`patient-monitor.iife.js`)

One classic script, no dependencies, works from `file://`. It defines `window.PatientMonitor` with `mountMonitor`,
`createEngine`, `transports`, `version` and the renderer's helpers (the full list is the `@pme/renderer` page of the
API reference).

```html
<div id="pm" style="height: 420px"></div>
<script src="patient-monitor.iife.js"></script>
<script>
  const pm = PatientMonitor.mountMonitor(document.getElementById('pm'), {
    skin: 'saadat-like',
    engine: { seed: 7, mode: 'manual', patient: { ageY: 54, sex: 'M', weightKg: 80 } },
    lanes: ['ecgII'], waves: ['abp', 'pleth', 'co2'], nibp: true,
  });
  pm.renderPath.then((p) => console.log('running on', p)); // 'worker-raf' | 'worker-pump' | 'main'
</script>
```

The worker is created from a `blob:` URL holding the IIFE's own source, so a page with a Content Security Policy needs
`worker-src blob:` (and `script-src` allowing the file). Without a worker the monitor runs on the main thread
(`renderPath` resolves to `'main'`). The file can also be loaded into your own classic worker with `importScripts` to
use `PatientMonitor.createEngine` headless: its monitor worker code starts only inside the worker it creates itself
(named `pme-engine`), so it never touches your worker's messages.

## ES modules

```ts
import { mountMonitor, type MonitorHandle } from '@pme/renderer';
import type { EngineEvent } from '@pme/engine-core';

const pm: MonitorHandle = mountMonitor(document.querySelector('#pm')!, { skin: 'philips-like', engine: { seed: 1 } });
pm.on((e: EngineEvent) => { if (e.type === 'alarm') console.log(e.id, e.priority); });
```

Packages: `@pme/engine-core` (the engine, no DOM — usable headless in Node or a worker via `createEngine`),
`@pme/renderer` (`mountMonitor`), `@pme/audio`, `@pme/controller` (transports, panel; `@pme/controller/scenario` for
the scenario runner, which brings ajv), `@pme/skins` (`@pme/skins/validate` brings ajv), `@pme/ventilator`. Each ships
ES modules only (no `require`) and `.d.ts` files; sibling packages are peers in your bundle, never duplicated on the
main thread; the renderer's worker bundle carries its own copy of the engine.

## Mount options

| Option | Meaning |
|---|---|
| `engine` | `EngineOptions`: `seed` (uint32, determinism), `mode` (`'manual'` default, or `'modeled'`), `patient` (age, sex, weight, height, baseline vitals, sensors, conditions), `device` (`ageBand`, `mainsHz`), `truthHz` (0–2 Hz read-only truth events) |
| `skin`, `theme`, `page` | a skin id (`saadat-like`, `philips-like`, `zoll-like`, `ge-like`, `mindray-like`, `lifepak-like`, or the preset `iran-icu-as-found`), a theme (`projector-light`, `ecg-grid`), a skin page |
| `lanes` | ECG leads on the ECG lanes (`'ecgII'`, `'V5'`, …) |
| `waves` | pressure/pleth/CO2 lanes below the ECG (`'abp'`, `'cvp'`, `'pap'`, `'pleth'`, `'co2'`, …); their tiles appear with them |
| `nibp`, `temp` | show the NIBP and temperature tiles |
| `worker` | `'auto'` (default) or `'off'` (force the main thread) |
| `fps` | `60` (default) or `30` (projectors) |
| `pxPerMm` | screen calibration so 25 mm/s is 25 mm/s (or call `calibrate()`) |
| `role` | `'host'` (default: owns the simulation) or `'viewer'` (a mirror driven by a transport) |
| `layout` | reserved: declared in `MountOptions` but not read at 1.0.0-rc.1 |
| `audioSilence` | `'engine'` (default: the device's Silence quiets the sound) or `'window'` (only this window's `silenceAudio()` does: a learner monitor on a second screen) |
| `portrait` | waveforms over the full width and the tiles in a grid below them (a phone held upright); needs `skin` |

## The handle

`dispatch(cmd)` → `Promise<DispatchResult>` (accepted, tick, reason); `on(fn)` → unsubscribe; `enableSound()` — call
it from a user gesture (browsers block audio until then); `setTimeScale(k)` with `k` in `MIN_TIME_SCALE`–`MAX_TIME_SCALE` (exported by `@pme/engine-core`: 0.25–8 at 1.0.0-rc.1); `pause()`,
`resume()`; `setFps()`; `calibrate(pxPerMm)`; `setSkin(id, { theme, page })`; `snapshot()` / `restore(s)` (JSON-safe
`pme-snapshot/1`, for bookmarks and late joiners); `capture12()` (the last 10 s of 12 leads); `trends` (1 Hz for 8 h);
`eventLog` (CSV/JSON export); `renderPath`; `destroy()`. Also: `disableSound()` and `soundOn`; `audioLog` (the tones
played); `role` and `skin` (the resolved skin); `advance(ticks, last)` (a fast-forward: run ticks without drawing them,
sound off until `last`) and `latchAlarms(alarms)` (show alarms that came and went during it); `viewerClock()` (for
a `'viewer'` mounted with `worker: 'off'`); `silenceAudio()` (with `audioSilence: 'window'`); `setHeaderNote(text)` (a
short line in the free centre of a two-row header, e.g. "SIMULATION · not a clinical monitor"; returns whether the skin's
header shows it).

## Commands

Every command carries an `id` (unique string) and `issuedBy`. Examples:

```js
pm.dispatch({ id: 'r1', issuedBy: 'panel', type: 'setRhythm', rhythm: 'vfCoarse', when: 'now' });
pm.dispatch({ id: 't1', issuedBy: 'panel', type: 'setTarget', variable: 'sbp', value: 80,
  ramp: { durationS: 60, curve: 'sigmoid' } });                                  // MANUAL targets
pm.dispatch({ id: 'd1', issuedBy: 'panel', type: 'applyEvent',
  event: { kind: 'drug', drugId: 'propofol', dose: 2, unit: 'mg/kg', route: 'iv' } });
pm.dispatch({ id: 's1', issuedBy: 'panel', type: 'attachSensor', sensor: 'spo2', state: 'off' });
pm.dispatch({ id: 'n1', issuedBy: 'panel', type: 'device', action: { device: 'nibp', action: 'start' } });
```

The full union is `Command` in the API reference (`@pme/engine-core`); `pme-scenario/1` documents use the same
commands. A rejected command resolves with `accepted: false` and a `reason`; nothing throws.

## Events

`pm.on(fn)` receives `beat`, `measurement` (the *measured* numerics, e.g. `values.spo2.value`, which lag and average
like a real monitor), `alarm`, `state` (1 Hz, with sim time `t`), `marker` (pacer spikes, shocks), `tone`, `lungState`
and, with `truthHz`, `truth`; the MODELED physiology adds more (`breath`, `tof`, `labs`, `labResult`, `organs`,
`drugWarning`, …; the full union is `EngineEvent` in the API reference). Hosts should read `measurement`, never the
truth, when they show numbers to learners.

## Several monitors, remote control

Several `mountMonitor` calls on one page give independent patients. For an instructor on another device, give the
learner's monitor `role: 'host'` and a transport, and the instructor's page the controller panel or `role: 'viewer'`:
`PatientMonitor.transports` (IIFE) or `transports` from `@pme/controller` offers `inProcess`, `postMessage`,
`broadcastChannel`, `websocket` (with the relay: `pnpm relay` in a clone) and `webrtc`. Raw samples never cross the
network; commands go in, events come out.

## Worked example: the ventilator with the monitor (`file://`)

`apps/demo/dist/embed/` (built by `pnpm build`; attached to each release as `ventilator-monitor-embed-v*.zip`) is the
reference embed: `ventilator-monitor.html` loads `patient-monitor.iife.js` and `pme-ventilator-embed.iife.js` as two
classic scripts and calls

```js
window.__embed = PmeVentilatorEmbed.mountEmbed({ monitor: document.getElementById('pme-monitor'), profile: 'normal' });
```

`mountEmbed` (source: `apps/demo/src/vent/embed.ts`) mounts the monitor with the link profile's patient, starts the
Hamilton-style ventilator UI, and joins them with an in-page link: every 20 ms the ventilator sends its airway
pressure, flow, volume, FiO2 and PEEP to the engine (`externalDrive`), and the engine sends back the lung's state
(the `lungState` event: respiratory-system compliance and resistance, spontaneous effort, auto-PEEP tendency, shunt,
dead space and FRC, and — since V.1 — per-lung compliance, resistance, time constant, shunt, perfusion and aeration,
the slow compartment, atelectasis and recruitable fraction, expiratory resistance, chest-wall compliance, V/Q
admixture, leak fraction, auto-PEEP, the lung conditions and `pleuralCmH2O`) so the ventilator's own waveforms
change with the patient. The engine is the
master clock. Try it: open the page, set FiO2 to 21 % — SpO2 holds for about 20–30 s, then falls; set the rate to 6 —
EtCO2 climbs over minutes (the Playwright test `apps/demo/e2e/vent-embed.e2e.ts` asserts both).

A host with its **own** ventilator physics can skip the link and send frames itself (brief §7.6):

```js
let n = 0;
function onPhysicsStep() {               // the host's 200 Hz loop
  if (++n % 4) return;                   // 200 Hz → 50 Hz
  pm.dispatch({ id: 'v' + n, issuedBy: 'vent', type: 'externalDrive', source: 'ventilator',
    frame: { pawCmH2O: paw, flowLps: flow, volumeMl: volume, fio2: fio2Fraction, peepCmH2O: peep } });
}
```

## Limits

Time scale `MIN_TIME_SCALE`–`MAX_TIME_SCALE` (0.25–8 at 1.0.0-rc.1; the ventilator embed itself stays at ×4 or less). One patient per engine (several engines per page are fine). Audio needs a user gesture. The
MODELED physiology has known deviations: read [known-deviations.md](known-deviations.md) before building a scenario
that depends on a specific number.
