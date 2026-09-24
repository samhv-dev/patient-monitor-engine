# Stage 1 independent review (date: 2026-09-24)

Scope: commits `d125ad2..b2bcd46`. The reviewer made no edits to source or tests; this file is the only write.
Method: read the Stage 1 source and tests in `engine-core`, `renderer` and `audio`. Every numerical claim below comes from
throw-away Node scripts that import the repo's own `.ts` modules (Node 26 type stripping). The scripts live in the session
scratchpad (`rev/*.mjs`), not in the repo. For the clean-room check, the ECGSYN reference (`ecgsyn.c`, `ecgsyn.m`) was read
in the scratchpad.

## 1. Verdict summary

- **Clean-room: clean.** The ECG generator shares no structure, algorithm, naming or constants with ECGSYN, beyond the
  published Gaussian-sum equation and the paper's 0.025 mV noise figure. That equation and figure are facts. One provenance
  nit sits outside the ECG code: `hash53` is cyrb53 verbatim and has no NOTICES row.
- **Three High bugs are visible at arm's length and are not caught by the gate:**
  - Sinus at ≥180 bpm with default HRV (≥195 bpm without HRV) locks into a functional 2:1 block, so HR reads half.
  - At DPR 1 (projectors, most external monitors), frame-boundary erasing cuts gaps of up to ~19 px into QRS
    up/downstrokes. The gate checked crispness only at DPR 2.
  - `toneCancel` cannot revoke a tone that has already reached Web Audio, and every command re-posts in-flight tones, so beeps
    double while controls are used.
- **The audio drop rule silences beeps on high-latency outputs.** Tones arrive only 13–33 ms before they are due. With the
  30 ms rule, any output latency above ~60 ms drops every tone. Bluetooth speakers typically run 150–250 ms. This is derived
  from the arithmetic, not measured.
- **Physiology is mostly right**, with two exceptions:
  - The drawn QT is about 50 ms short. By the tangent method it is 350 ms at 60 bpm against a nominal 400 ms. Acceptance
    tests 2 and 3 read the kernel constant back, so they cannot see this.
  - Flutter F-waves are a narrow V-notch with half the cycle flat, not a sawtooth. Their amplitude is fine at 0.28 mV p-p.
- **Rulings:**
  - (1) Go back to PR60 = 160. Fix the T geometry and re-specify test 3 as P-onset-before-T-end.
  - (2) Keep I/III. Waive the ProSim V1/V4 ratios, which are not physiological, and use interim precordial shape checks.
  - (3) Adopt (d) + (a): QRS beeps are detection-driven and never dropped for lateness caused by output latency.
    BEEP_DELAY 30 ms; L stays 100 ms.

## 2. Clean-room finding (ECG generator vs ECGSYN)

**Rating: clean.** No copied or closely derived code.

| Aspect | ECGSYN (`ecgsyn.c` / `ecgsyn.m`) | Ours (`packages/engine-core/src/l2/ecg/`) |
|---|---|---|
| Model | 3-state ODE limit cycle, `atan2` phase, `fmod` angular distance, RK4 at `sfint`, then rescaled to −0.4…1.2 mV | No ODE and no phase circle. Events are placed in absolute time and their Gaussian kernels summed per VCG axis (`kernels.ts:46-57`), with a half-Gaussian T. There is no rescaling step |
| RR / HRV | `rrprocess`: bimodal spectrum, IFFT with random phases | Two sinusoids plus Gaussian ε per beat (`hrv.ts:30-37`), from brief §4.1 |
| Parameters | `ti` in degrees `[-60 -15 0 15 90]` / `[-70 … 100]`, `ai [1.2 -5 30 -7.5 0.75]`, `bi [...]`, `hrfact`/`hrfact2` Bazett scaling, `zbase = 0.005·sin(...)` | τ/σ in ms from the brief's seed table; Fridericia QT; VCG vectors fitted to Dower rows. None of ECGSYN's numbers appear |
| Naming / organisation | `ti ai bi`, `derivsecgsyn`, `thetap1..5`, `Anoise`, `ran1` (Numerical Recipes) | `tau sigmaRise sigmaFall`, `K_STRIDE`, `makeEvent`, `planUntil`, sfc32 streams |
| Noise | uniform, `Anoise` default 0 | Gaussian table, 0.025 mV SD (McSharry paper fact, cited) |

The shared elements are the idea of a Gaussian wave sum and the respiratory frequency of 0.25 Hz. Both are published facts,
cited through research 03 §1.3.

**Provenance nit (outside ECG).** `rng/sfc32.ts:31-44` `hash53` is bryc's cyrb53 line for line: same seeds `0xdeadbeef`/`0x41c6ce57`
and same multipliers 2654435761, 1597334677, 2246822507 and 3266489909. Its author calls it public domain, but the widely
copied Stack Overflow copy is CC BY-SA by default. Add a NOTICES row pointing at bryc/code and its licence, or replace it with
a trivially original mixer. sfc32 (PractRand, public domain) and the RBJ cookbook formulas are fine and cited.

**Citation coverage of physiological constants.** Most constants carry `[03 §…]`, `brief §…` or `[ENG]`. Gaps:
- `rhythm-engine.ts:207`: sinus first P at `t0 + 0.1`.
- `rhythm-engine.ts:219`: focus start `t0 + 0.05` / `refractoryUntil + 0.01`.
- `rhythm-engine.ts:326-327`: first-beat RR fallback `max(30, rate || 60)` and the QT RR clamp `0.25–2 s`.
- `rhythm-engine.ts:300`: LVET floor 150 ms.
- `rhythm-engine.ts:361`: PVC `+0.005` after refractory.
- `templates.ts:77-79`: wide-complex timings `0.05/0.022`, `0.11/0.02`, T σ `0.06/0.04`, which carry no tag of their own.
- `templates.ts:86`: retro-P `0.07/0.02`.
- `templates.ts:56-57`: flutter kernel timings, covered only by the `[ENG]` on the vector.
- `rhythms.ts:32`: `sinusBrady` backup escape 30.
- `hrv.ts:12`: `MIN_RR_S` 0.2.

The fitted `VEC` values (`templates.ts:11-18`) are explained, but the fit script is not in the repo, so the fit cannot be
reproduced.

## 3. Findings (ranked)

No Critical findings (data loss, crash on default path, licence contamination).

| # | Sev | Where | Failure scenario (evidence) | Fix |
|---|---|---|---|---|
| H1 | High | `rhythm-engine.ts:324`, `:326-327`, `:346` | Every conducted sinus beat must clear the *ventricular* refractory `QRS + 0.8·QT`. With HRV off, that exceeds RR above ~194 bpm, and sinus locks into 2:1. With default HRV one short RR drops a beat. The next QT is then computed from the doubled RR, so refractory > RR and the 2:1 persists. Measured: `sinus`/`sinusTachy` at 180/185/190 bpm with HRV give 90–96 QRS/min within 0.3–18 s (3 seeds); at 200/220/250 they give 102/112/127. Atrial records still say `conducted: true`. The QRS-detector test "sinusTachy @ 200" passes because it scores against the halved beat list | For supraventricular conduction, block through an **AV-node** ERP (≈250–300 ms, which gives a Wenckebach point around 200–220), not through ventricular refractoriness. Keep ventricular refractory for escape/PVC/capture interactions. Compute QT from the prevailing cycle, not from an RR doubled by a concealed beat. Set `conducted` from the outcome. Add a test: sinusTachy 200 and 220 with HRV on produce 200 and 220 QRS/min |
| H2 | High | `renderer/src/sweep-lane.ts:107-108`, `:124` | Each frame clears from the *last column's centre*, snapped down, which erases that whole device column. It then re-strokes only the last 2 points. A column is drawn as first→min→max→last, so its first→min→max run is lost. At DPR 1 the line (1.75 px wide) almost vanishes in that column. Raster simulation of lead II, 2.5 s at 60 fps: 4 of 18 steep QRS columns lost up to 19 CSS px of trace. A single-frame draw loses 0, and DPR 2 loses 0, which is why the DPR-2 gate crop looked clean | Either re-stroke the whole last column plus the previous column's last point, or start `clearSpan` at the right edge of the last column (`(col+1)/dpr`) and re-stroke only the joining segment. Add a raster test at DPR 1 with a steep-QRS source (the current tests use a slow sine) |
| H3 | High | `engine.ts:249-252`, `:260-265`; `audio/src/scheduler.ts:62-64`, `:77-85`; `renderer/src/mount.ts:63-64` | Tones reach the main thread 13–33 ms before they are due, and the scheduler hands anything due within 100 ms straight to Web Audio. So `cancelAfter` finds nothing to revoke: **stale tones survive**. Every accepted command also resets `lastToneT = simT` and re-posts in-flight tones under new ids, so they are played again. Measured with one `setTarget` per tick (a slider drag): 57 of 88 sinus beats and 63 of 97 AF beats had their tone posted twice. The scheduler test only cancels tones outside the look-ahead, the one case where cancel works | Give each tone a stable id derived from the detected R sample index (`qrs-${rIndex}`) and dedupe by id in the scheduler. Keep the node handles of scheduled tones and `stop(0)`/disconnect them on cancel. Only emit `toneCancel` when the regenerated detections differ from those already posted. Add a test: commands every tick still give exactly one `play()` per R |
| H4 | High | `templates.ts:41`, `:62-71` (seed table: T peak = QT − 110, σ fall 30) | The T wave has fallen to baseline long before the nominal QT. Tangent-method T end is τ+60 ms and the 5% end is τ+74 ms, so on screen QT is 350 at 60 bpm (nominal 400), 287 at 100 (337) and 245 at 150 (295). The QT readout is systematically ~50 ms (12%) short, which matters for the planned long-QT and torsades teaching. It also means "P on T" at 150 bpm is really "P abutting T": P onset 246 ms, tangent T end 245 ms. Tests 2 and 3 read back `τ_T + 0.11`, so they are tautological | Put the T peak at QT − ~70 ms (σ 45/30 kept), so the tangent end ≈ QT − 10 and the 5% end ≈ QT + 4. Alternatively keep QT − 110 with σ_fall ≈ 50. Re-specify test 2 to measure the tangent T end on generated lead-II samples, and test 3 per ruling 1 |
| H5 | High (derived) | `audio/src/scheduler.ts:79-80`, `audio/src/context.ts:48-52` | `when` is output-mapped (getOutputTimestamp), so `late = currentTime − when` includes the device's output latency. Tones arrive 13–33 ms ahead, so an output latency above ~60 ms drops **every** QRS tone under the 30 ms rule. Bluetooth or AirPlay output (typically 150–250 ms) would be silent with no error. Not measured here | See ruling 3: judge staleness as `late − outputLatency`, and never drop QRS tones for device latency |
| M1 | Medium | `rhythm-engine.ts:45-50`, `:161-169` | AF rate control drifts at both ends of the allowed 40–180 range. Over 600 s: target 40 gives 32.5, 50 gives 46.5, 150 gives 142.6 and 180 gives 159.6 bpm, and the HR tile reads 150–160 at a target of 180. At slow targets `θ = 80·RR²` makes the mean wait exceed RR, so refractory clamps at 0.25. At fast targets a single 15 mV impulse crosses θ. The test covers only 60–150 | Calibrate (θ, τ_R) against target HR by simulation into a small table across 40–180, or narrow `rateRange` to [50, 150] until that is done. Extend the ±10% test to the full range |
| M2 | Medium | `rhythm-engine.ts:324`, `:374-386` | VT at 120–130/min leaves a short non-refractory window in each cycle, and a dissociated sinus beat conducts into it. The VT focus (`bypass`) still fires 15–40 ms later, so two QRS-T complexes superimpose and two beat records are emitted. Measured: 12 pairs < 200 ms apart in 60 s at VT 120 | A capture should reset the focus (`focusNextT = t_capture + cycle`), or be classed as fusion with the focus beat suppressed |
| M3 | Medium | `engine.ts:385-389`, `l3/qrs.ts:142`, `:126` | Changing lane 0's lead keeps the detector thresholds learned on lead II. Switching II → aVL (QRS about 23%) gives no detections for >4 s, and HR reads **0** at t+4 s. That would raise a false asystole alarm once Stage 4 alarms exist | When lane 0's lead or the filter changes, reset `QrsState` with a short re-learn (1–2 s). While re-learning, hold the last HR with a "learning" flag instead of reading 0 |
| M4 | Medium | `engine.ts:210-222`, `buffers/ring.ts:30-34` | `restore()` leaves the ring buffers from the discarded timeline. Restore to t = 10 from t = 40: `latestSampleIndex` stays at 20050 instead of ~5050, and `readSamples` returns samples from the discarded future. Restoring into a fresh engine presents 120 s of zeros or foreign data as valid history (`oldest` is derived from `latest`). The snapshot test doesn't check `latestSampleIndex` | On restore, call `clear()` on all buffers, or set `latest = st.n − 1` and track a `firstWritten` index. Then re-speculate. Assert `latestSampleIndex` in the test |
| M5 | Medium | `engine.ts:329-359`, `rhythm-engine.ts:399-414` | Numeric rhythm opts and modifiers are not validated. A NaN or Infinity `rateBpm`/`atrialRateBpm` makes `min(...)` return NaN, `planUntil` falls through to `onEscape(NaN)` and spins to the 1,000,000 guard on every tick, which freezes the worker. A NaN `qtc`/`rsa`/`noise` poisons the IIR and QRS state permanently. `groupSize: 0` gives NaN `groupPos` | Range-check every numeric field in `validate()`. Throw in `planUntil` when an event time is not finite |
| M6 | Medium | `audio/src/context.ts:53` | The fallback mapping *adds* `baseLatency`. It should subtract `baseLatency + outputLatency`. Where getOutputTimestamp is missing, or reports `performanceTime` 0 early after resume, beeps land ~2·base + output latency later, and they jump when the mapping switches. Safari/iPad support for getOutputTimestamp should be verified; this may be the iPad path | `currentTime + (perfMs − now)/1000 − (baseLatency + (outputLatency ?? 0))` |
| M7 | Medium | `audio/src/context.ts:38-56`, `mount.ts:107-127`, `scheduler.ts:77` | iOS suspends or interrupts the AudioContext after backgrounding, and nothing resumes it. Tones pile up while `currentTime` is frozen, then are all dropped. `destroy()` never closes the context, and iOS caps the number of live contexts. Two quick taps on "Enable sound" create two contexts | Handle `statechange`: clear the queue and resume on the next gesture or visibility change. Close the context in `destroy`. Make `enableSound` idempotent with a pending promise |
| M8 | Medium | `engine.ts:40`, `:257-266`; `l3/qrs.ts:21` | Budget: detection latency (narrow 104–110 ms; wide 124–130; VT 102–154; VT 120 up to 200) plus BEEP_DELAY 40 ms exceeds L = 100 ms. For VT, 28 of 80 tones were already overdue in sim time when posted. At timeScale > 1 the wall-clock lead shrinks in proportion, so at 4× even narrow tones arrive late | Ruling 3. Optionally cut detector latency by finalising at the MWI maximum (first falling sample) instead of at the 60% fall |
| L1 | Low | `monitor-core.ts:95-102` | `catchUp` discards the fractional tick on every 1 s hidden pump, so sim time loses up to 20 ms per hidden second (~1%). Over 10 min hidden that is ~6 s behind wall time | Carry the remainder in the accumulator |
| L2 | Low | `monitor-core.ts:118` | While hidden there are no frames, so the event batch is never posted and grows: AF emits 5 atrial records/s | Post at the end of `catchUp` |
| L3 | Low | `monitor-core.ts:63-69`, `:125-145` | A lead or filter change runs `layout()`, which wipes every lane | Reset only the affected lane and its chrome |
| L4 | Low | `mount.ts:69-73` | The backing store uses integer `clientWidth` × DPR. A fractional CSS width stretches the bitmap and breaks the device-pixel snapping | Use `ResizeObserverEntry.devicePixelContentBoxSize` |
| L5 | Low | `worker-host.ts:97-105`, `engine.worker.ts:17-20` | After `ready`, worker errors reject an already-settled promise, so they are swallowed. An exception in the worker rAF loop is not caught, and the monitor freezes silently | Surface errors (event or `renderPath` status) and fall back to the main thread |
| L6 | Low | `worker-host.ts:77-78`, `:156-159` | If `transferControlToOffscreen` throws, the already-created worker leaks | Create the worker after the transfer succeeds, or terminate it in the catch |
| L7 | Low | `engine.ts:369` | `setRhythm {when:'nextBeat'}` retargets `hr` immediately, so the old rhythm changes rate before the switch (VT 170 slows to the 120 clamp) | Defer the hr retarget into `pendingSwitch` |
| L8 | Low | `rhythm-engine.ts:216` | Leaving AF cuts the f-waves abruptly at `t0`, a step of up to ~0.15 mV | Fade over 50–100 ms |
| L9 | Low | `monitor-core.ts:111-116` | Lanes draw speculative samples between the committed tick and `renderT`. After a filter or lead command those samples are regenerated but never redrawn, leaving a ≤20 ms glitch | Accept, or draw only up to the committed tick + L |
| L10 | Low | `engine.ts:210-212` | `restore` ignores `engineVersion` and `mainsHz`. The brief promises exact replay only on the same build | Warn or refuse on a version mismatch |
| L11 | Low | `scheduler.ts:81-87` | The 500-entry log cap is applied only after a *played* tone, so dropped tones can grow the log | Cap after every push |
| L12 | Low | `templates.ts:21-25` | PVC/VT R in II is 1.48 mV, 1.36× the normal beat; the brief says 1.5–2× | Scale `WIDE_VEC` by ~1.2 |

## 4. Physiology plausibility (vs research 03 §1)

- **AF RR model.** Integrate-and-fire gives RR CV 0.17–0.30, lag-1 correlation ≈ 0 and RR_min ≥ 0.25 s, which is realistic.
  The rate mapping is off at the extremes (M1). The f-waves (three sinusoids, 5–9 Hz, 0.03–0.05 mV each) are fine.
- **Flutter 4:1.** The amplitude is not the problem: the filtered lead II F-wave measures **0.28 mV p-p** without noise, inside
  the brief's 0.1–0.3 mV. The shape is. Each cycle is a slow drift, then a sharp 60 ms negative notch (−0.23 mV) and a
  sharp return, and about half the cycle sits within ±0.04 mV. At 94.5 px/s that reads as small notches on a flat line, not a
  continuous sawtooth, which explains the "faint" note. Recommendation:
  - Make the F-wave a continuous asymmetric sawtooth: a slow descending ramp over ~70% of the cycle and a fast upstroke,
    for example the first 4 Fourier terms of a sawtooth.
  - Target 0.3–0.4 mV p-p in II/III/aVF and small upright discrete F-waves in V1.
  - Keep the zero mean so the 0.5 Hz high-pass does not matter.
- **Wenckebach.** PR 184 → 284 → 334 ms (increments 100 → 50), RR shortening 0.90 → 0.85 s, pause 1.45 s < 2·PP. Correct.
- **Complete heart block.** Independent clocks, KS p = 0.99, P waves march through. Correct.
- **PVC.** Coupling 55–65% of RR; the full compensatory pause comes from the next sinus beat being blocked. Below ~55 bpm some
  PVCs become interpolated (the next beat conducts), which is physiological but untested. The wide template is LBBB-like:
  QS in V1 with an upright T, R in V6 with an inverted T, and a discordant T in II. That is correct discordance. Amplitude
  is slightly low (L12).
- **VT.** 170/min, QRS 165 ms, visible dissociated P waves (a nice touch). Capture artefact at 120–130/min (M2). The QRS
  detector holds up to 250/min (measured: 0 misses, 0 false detections at 200/220/250).
- **QT rate dependence.** The Fridericia plumbing is correct, but the drawn QT is ~50 ms short (H4). QT follows the single
  preceding RR, so in AF it jumps beat to beat, whereas real QT has minutes of hysteresis. Acceptable for Stage 1; note it for
  Stage 5.
- **Sinus tachycardia.** Functional 2:1 above ~180 bpm (H1): this is the most visible physiology error.
- **P wave.** 0.15 mV in II; axis ≈ 55° (I 0.08, III 0.07, aVR −0.115); visible duration ~90 ms. Normal. V1 P is monophasic
  negative (−0.075 mV); real V1 P is usually biphasic. That is cosmetic and waits for Stage 5.
- **Precordial leads.** V1 rS (r 0.06, S −0.78), V2 r 0.04 / S −0.87, transition at V3, V4 R 1.84, V5 1.77, V6 1.33. The
  r waves in V1–V2 are too small (typical 0.1–0.3 / 0.2–0.6 mV), and V2 r < V1 r is a mild reverse progression. See ruling 2.
- **RSA and wander.** Default `rsa` 0.67 gives ±40 ms at 0.25 Hz, R-amplitude modulation ±8%, and wander of 0.08 mV. The
  wander is ~12 dB down after the monitor's 0.5 Hz high-pass, which is realistic.
- **Filters.** Verified numerically:
  - monitor: −3.01 dB at 0.5 Hz, −3.30 dB at 40 Hz (the notch skirt adds 0.3 dB), −296 dB at 50 Hz.
  - diagnostic: −3.01 dB at 0.05 and 150 Hz.
  - All poles are inside the unit circle; the worst is the 0.05 Hz high-pass at |p| = 0.99956, which is fine in float64.
  - No float32 accumulation anywhere: the ring buffers store float32 only for display.

## 5. Test-quality notes

- **Tautological or near-tautological:**
  - Test 2 reads `τ_T + 0.11` back, which is the constant used to place T.
  - Test 3 uses the same `T end` and a "T onset" (τ − 2.5σ) that lands at 72 ms, inside the QRS.
  - Test 11 checks index arithmetic that is `tick × 10` by construction.
  - Test 8 is guaranteed structurally with HRV off, though it does confirm that the blocking happens.
  - The "tone 20–60 ms after R" test checks the `BEEP_DELAY` constant in sim time. It ignores the render offset and audio
    latency, and it runs sinus only.
  - Test 4 (filtered) mostly confirms that a linear filter is linear. It is still useful for per-lane state bugs.
- **Tests that pass for the wrong reason:**
  - QRS detector "sinusTachy @ 200" passes against a rhythm that is actually 2:1 (H1).
  - The scheduler cancel test uses tones outside the look-ahead, the one case where cancel works (H3).
  - Sweep-lane tests use a 1 Hz sine, which has no steep segments, and never rasterise (H2).
- **Missing:**
  - chunking invariance: tick-by-tick vs bulk `advanceTo` must give identical committed samples and events, and the whole
    speculate-and-commit design depends on it;
  - `latestSampleIndex` after restore;
  - AF rate accuracy across 40–180;
  - sinus 180–220 with HRV;
  - detector behaviour after a lane-0 lead change;
  - one-play-per-R under repeated commands;
  - a DPR-1 raster check.
- **Good tests:** 5 (Mobitz I structure), 6 (KS on P–QRS phase), 7 (CV plus lag-1), 12 (min/max decimation keeps the R),
  and the detector sweep across rhythms.

## 6. Rulings

### (1) PR60 = 190 vs textbook 160

**Recommend PR60 = 160, fix the T geometry (H4), and re-specify test 3.** PR 190 was chosen to satisfy a test that asked for
more than the physiology it cites. Research 03 §1.1's own arithmetic (PR ~130 + QT 295 = 425 > RR 400) gives about 20–25 ms of
**P-onset** overlap with the end of T at 150 bpm. It does not put the **P peak** inside T. PR 190 also makes every "normal"
demo read 184–190 ms, at the edge of first-degree block (200), which clinicians will notice with calipers.

With T peak = QT − 70 and PR60 = 160 at 150 bpm:
- PR = 124, so P onset is 276 ms after QRS onset.
- The drawn T ends at 285 (tangent) or ~299 ms (5% level).
- P therefore starts on the T downslope, 10–23 ms of overlap, and it emerges from timing.

New test 3: *at 150 bpm, the P-wave onset of beat n+1 precedes the end of the drawn T of beat n, with the T end measured by
the tangent method on generated samples.* The overlap grows at 160–180 bpm, where the pronounced P-in-T look actually belongs.

### (2) Lead amplitude ratios

**Keep II exact, I at 70% and III at 30%. Waive the ProSim V1 24% and V4 120% ratios.** ProSim-class simulators emit scaled
copies of one template per lead. A positive 24%-of-II V1 is a test-signal convention, not physiology: a real V1 is rS with a
dominant negative QRS. The limb ratios agree with Einthoven-consistent physiology, so they cost nothing. Until PTB-XL (Stage 5),
use interim precordial acceptance:
- V1 rS with r/S < 1;
- r(V1) 0.1–0.3 mV and r(V2) > r(V1), so the septal Q vector needs a larger anterior (−Z) component;
- transition at V3–V4;
- R(V4) 1.2–1.8 mV;
- T upright in V2–V6.

If ProSim parity is ever needed for device-validation demos, make it an explicit "ProSim-compatible" morphology preset, not
the default.

### (3) Beep policy

**What a real monitor does.** The beep fires on *detection*. It is never predicted, and it is never dropped for being late.
- Audible lag after the R depends on the detector and on QRS width: tens of ms for narrow complexes, more for wide or paced
  ones.
- The displayed trace on a real device is itself delayed by acquisition and filtering, so beep and on-screen R look roughly
  simultaneous.
- Perceptually, sound lagging vision is tolerated far more than sound leading it. ITU-R BT.1359 puts detectability at about
  125 ms of audio lag and acceptability at about 185 ms, so a consistent 40–100 ms lag reads as "in sync".
- Dropping beats, as the current policy does for 22% of VT beats, is the one behaviour no real monitor shows.

**Recommendation: (d) + (a), keep L, trim (c).** Constants:

| Constant | Value | Why |
|---|---|---|
| `BEEP_DELAY_S` | **0.030** (from 0.040) | Keeps the narrow-complex target inside 30–60 ms audible. Narrow tones reach the scheduler 13–33 ms early, so this recovers ~10 ms |
| QRS lateness rule | play at `max(when, now)`; drop only if `(currentTime − when) − outputLatency > 0.15 s` | `late` already includes device output latency, which is H5. 150 ms means "stale event", for example after a stall. With this rule VT (≤ ~100 ms) and Bluetooth outputs still beep |
| Non-QRS tones (alarms, Stage 4) | no drop; play late | Alarm cadence is real-time, and a late start is harmless |
| Look-ahead L | **0.100** (unchanged) | Lengthening L (option b) buys wide-complex margin but multiplies the in-flight tones that H3 cannot cancel. With (a) + (d) it is unnecessary |
| Diagnostics | log and show `audibleLateS = late` alongside sim-time beep−R | The gate showed that sim-time beep−R (45–47 ms) hides 45–78 ms of audible lag |

Optional: finalise QRS detections at the MWI maximum (`qrs.ts:140`) to cut ~30–40 ms of latency on every complex. That is
the single change that most improves alignment for wide complexes.

## 7. Not covered

- No browser run. The DPR-1 gap and the Bluetooth silencing come from simulation or arithmetic. Confirm both in Chrome
  and Safari: a DPR-1 screenshot zoomed on QRS, and a Bluetooth output device.
- `getOutputTimestamp` / `outputLatency` availability on Safari and iPad (M6), and the `<audio>` keep-alive behaviour with the
  silent switch.
- The `worker-pump` path (no browser here lacks worker rAF).
- Brief §7 API conformance of `types.ts` (command and event shapes, `DispatchResult`, snapshot schema), apart from what the
  engine uses.
- The demo app (`apps/`), the IIFE build, CI config, `check-notices`, and the clock and ring tests beyond a skim.
- The gate screenshots were not opened. The flutter and QRS assessments are numerical.
- The full Vitest suite was not re-run. The gate's 131/131 pass is taken as reported.
