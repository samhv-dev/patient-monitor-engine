# Validation (Stage 8a)

`pnpm validate` measures the engine against recorded patients and against its own evidence bands, and writes three
files here:

| File | What |
|---|---|
| `report.md` | Every graded row: morphology (recorded vs matched engine, brief §9 V1–V5), sanity and gate documents (segment validation), waveform regression (2 % per sample), determinism (V9), the Pulse oracle, datasets and attribution. |
| `report.json` | The same, machine-readable (`pme-validation-report/1`). |
| `calibration-queue.md` | Every yellow or red row — the input to Ali's calibration pass (R44), with an empty "decision" column. |

Grades (R40, after Pulse's segment validation, method only): 🟢 inside the evidence band (or within 10 % of a point
target); 🟡 misses by less than 30 %; 🔴 misses by 30 % or more, or was not measured. Red fails the run; yellow never
does. Documents whose commands the current engine refuses ("arrives in Stage 7") are listed as *not measurable*.

## Commands (from the repo root)

```bash
npx -y pnpm@9.15.9 --filter @pme/validation datasets:fetch        # download what the manifests list (≈ 1 GB, cached)
npx -y pnpm@9.15.9 validate                                        # everything (≈ 30–60 min)
npx -y pnpm@9.15.9 validate --quick                                # 4 recorded windows, fewer seeds (≈ 5 min)
npx -y pnpm@9.15.9 validate --suites sanity,gates                  # a subset
PME_PULSE_DIR=../research/pulse-spike/web npx -y pnpm@9.15.9 validate --suites oracle
npx -y pnpm@9.15.9 validate --rebaseline                           # rewrite waveform baselines + golden hashes (review the diff!)
```

`PME_DATASET_CACHE` moves the cache (default `packages/validation/datasets/cache/`, git-ignored). Raw records never
enter git; only manifests (ids, window times, hashes) and derived statistics do (brief §8).

## Datasets and licences

VitalDB 1.0.0, PhysioNet copy (CC BY 4.0) · MGH/MF Waveform DB 1.0.0 (ODC-By 1.0) · PWDB 0.1.0 (PDDL 1.0) · PTB-XL
1.0.3 (CC BY 4.0) · CUDB and MIT-BIH (ODC-By 1.0, Stage 5 templates). Attribution text: `NOTICES.md` N-050…N-052,
N-080…N-084 and the report's dataset table.

## CI

`.github/workflows/validation.yml` runs weekly, on manual dispatch, and on a pull request carrying the
`run-validation` label — never on every push (it is long). The unit tests of the metrics run in the normal CI.

## Human reviews

- Blind realism review (brief §9): `validation-review.html` — see `docs/validation/review/README.md`.
- Saadat bedside checklist (research/06 §7): `validation-bedside.html` — results in `docs/validation/bedside/`.
- Performance: `validation-perf.html` and the soak (`playwright.validation.config.ts`); iPad numbers are manual.
