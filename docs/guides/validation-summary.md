# Validation summary

What has been measured, how, and what the measurements do and do not show. The full, regenerated report is
[`docs/validation/report.md`](../validation/report.md) (harness: `pnpm validate`, Stage 8a); the open items are the
[calibration queue](../validation/calibration-queue.md) and [known-deviations.md](known-deviations.md).

## What the harness does

`pnpm validate` (Stage 8a; `docs/validation/README.md`, `docs/gates/stage-8a.md`) applies one metric implementation
to recorded patient windows and to engine runs matched to them (heart rate, blood pressure, measuring site,
ventilation), and grades every row against an evidence band. Datasets, all downloaded and never committed:

| Dataset | Licence | Windows used |
|---|---|---|
| VitalDB, PhysioNet copy 1.0.0 | CC BY 4.0 | 80 |
| MGH/MF Waveform Database 1.0.0 | ODC-By 1.0 | 16 |
| PTB-XL 1.0.3 | CC BY 4.0 | 100 (report-only ECG comparison) |
| Pulse Wave Database (PWDB) 0.1.0 | PDDL 1.0 | 0 — not fetched: Zenodo answers 403 to this network (Stage 8a, and again for this report) |

Suites: **morphology** (recorded vs engine: R → radial upstroke, dicrotic notch, PPG ↔ ABP shape, brief §9 V1–V5),
**intervals**, **sanity** scenarios and **gate** numbers (segment validation of `pme-validation` documents),
**waveform regression** (2 % per sample against committed baselines), **determinism** (V9) and the **Pulse
differential oracle** (the Pulse physiology engine as a reference, never bundled). Grades (R40): 🟢 inside the band
(or within 10 % of a point target), 🟡 misses by less than 30 %, 🔴 misses by 30 % or more or was not measured; red
rows are "gating" and fail the run, yellow rows never do. Every yellow and red row goes to the calibration queue.

## The latest run

From `docs/validation/report.md`, generated 2026-10-17 by `pnpm validate --seeds 11,12` on commit `e737de92` of the
Stage 8b branch (engine 1.0.0-rc.1; 914 s wall; `PME_PULSE_DIR` set, so the oracle ran):

> **Summary:** 🟢 96 · 🟡 33 · 🔴 27 graded rows; 1 documents not measurable on this build; calibration queue 60 rows.
> Gating failures: 27.

Measured on the v1.0.0-rc.1 tree: no physiology file (`packages/engine-core/src`, `packages/engine-core/data`,
`packages/ventilator/src`) changed after that commit. The previous report (commit `7bcf992`, 2026-09-27: 🟢 96 · 🟡 27
· 🔴 16) was measured before Stages 7c–7k, FU-3 to FU-11, FU-7.1 and V.1.

The 27 red rows by suite: morphology 10 (R → radial upstroke about 100 ms against 145–190 ms recorded; dicrotic notch
270–284 ms against 428–518 ms; PPG ↔ ABP shape correlation 0.4 against 0.9), segments 9 (haemorrhage class III/IV and
class III without β-blockade: HR stays at 75 where 120–180 is expected; RV infarct CVP and PAWP low; warm septic shock
MAP 87 and HR 75 against 55–60 and 115–130; EtCO2 below 5 mmHg only 83 s after witnessed VF against ≤ 30 s; the
return of breathing after sugammadex reads 0 s against 60–240 s — that never-ventilated patient arrests first,
`docs/gates/fu-3.md`), waveform regression 5 (pleth and CO2 shapes have moved from the Stage 8a baselines,
which this release did not re-baseline), and the Pulse oracle 3 (haemorrhage HR rise 0 against Pulse's +48 bpm and
MAP fall 5 against 16 mmHg; MAP fall after propofol 19 against 28 mmHg). The rows, with every number, are in
[known-deviations.md](known-deviations.md) and the [calibration queue](../validation/calibration-queue.md).

**BUILD-PLAN Stage 8 acceptance 1 ("V1–V9 pass") is not met at this release:** 27 rows are outside their evidence
band by 30 % or more.

## Performance and determinism

From `docs/gates/stage-8a.md` §7 (measured at Stage 8a; not re-measured for this release): a 60-minute soak at ×1 on the
main-thread path grew the heap by 0.6 MB after minute 5 (budget ≤ 5 MB) and kept sim time at 3,601 s in 60 min, with
no apnoea alarm; frame intervals on the worker path at 60 and 30 fps had p95 16.7 ms (budgets 25 and 50 ms); the
worker tick in Node over 600 s had p50 0.42, p95 0.45 and p99 0.53 ms (budget: p99 well under 6 ms). The iPad and
projector readings are manual and have not been taken. Determinism (V9) on this release's report: 216 runs, none
non-deterministic. CI's tick-bench keeps the p50 bound (< 6 ms on CI); the 600 s p99 gate (`perf:ticks --budget-ms 6`)
is a release-checklist step on an idle machine (`RELEASE.md`).

## Blind realism review

**Not yet run.** The tool is ready (`apps/demo/validation-review.html`; procedure in
`docs/validation/review/README.md`), and Stage 8a built a 160-clip bundle, but no rater's scores are in
`docs/validation/review/`. BUILD-PLAN Stage 8 acceptance 2 (the blind realism review) is therefore **not met** at this
release.

## What this does not show

The measurements compare waveform morphology, timing and a set of scenario responses with public recordings, published
models and a reference physiology engine. They do not show that the simulator is accurate enough for any clinical
purpose, and they do not replace a clinician's review of each teaching scenario. The engine is not a medical device.
