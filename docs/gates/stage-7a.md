# Stage 7a gate — circulation (draft, written incrementally)

## Needs a ruling

### NR-1 — Stage 2 acceptance 5c, post-PVC SBP +8–15 mmHg (R45(a))
R45(a) asked for a one-beat Emax boost after a premature beat instead of loosening the band. The mechanism is in
(`circ/model.ts` PESP_MAX 0.5, scaled by prematurity, for perfused and unperfused premature beats). Measured at engine
level over isolated PVCs (65 % coupling, compensatory pause 1.6 s): **−10.8 mmHg** (PESP 0.5), −9.5 (1.0), −3.4 (1.5 =
Emax × 2.5). The arterial run-off through the compensatory pause (radial DBP 80 → 59–65 mmHg; τ ≈ 1.7 s, which is what
120/80 at HR 75 implies) outweighs the extra stroke volume an elastance LV can eject: diastasis limits the EDV gain to
+5 %, and SV ≤ EDV − V0. Stage 2 reached the band only with FS_CARRY 0.75 (an [ENG] volume carry-over). The test is
`it.fails` with this explanation so CI stays green and flags the gap. Options: (a) re-specify to "post-PVC PP rises,
SBP within −15…+15"; (b) a pressure-dependent arterial compliance / critical-closing-pressure run-off (slows the pause
decay); (c) accept an [ENG] carry-over term. Needs Ali/orchestrator.

### NR-2 — R23 AS + CAD propofol ischaemia trajectory (tables §3 worked example, §7 check 10)
Engine, MODELED, 75 y AS (0.7) + 3-vessel CAD + HTN, propofol 1.5 mg/kg at 60 s. Two tables-sourced mechanisms were
added while chasing it: the Schnider age sensitivity of propofol (tables §6.1 C50 by age → × 1.6 at 75 y) and the
ischaemic diastolic stiffening β_LV × (1 + 0.5·δ) (tables §3 "Effects"). Trajectory (10 s means):

| t | SBP/DBP | HR | LVEDP | LVSP | CPP | S/D | kIsch |
|---|---|---|---|---|---|---|---|
| rest (55 s) | 155/85 | 65 | 18.9 | 235 | 68 | 1.33 | 1.00 |
| +2 min (180 s) | 96/56 | 70 | 12.2 | 171 | 45 | 1.00 | 0.94 |
| +2.4 min (205 s) | 99/58 | 71 | 12.5 | 173 | 47 | 1.04 | 0.93 |
| phenylephrine +30 s (240 s) | 133/79 | 69 | 16.7 | 197 | 64 | 1.47 | 0.95 |
| phenylephrine +90 s (300 s) | 146/86 | 67 | 17.9 | 208 | 69 | 1.61 | 0.98 |
| ephedrine instead, +90 s (300 s) | 124/75 | 78 | 11.8 | 204 | 65 | 1.08 | 0.95 |
| ephedrine, +3.3 min (410 s) | 139/83 | 79 | 11.8 | 221 | 73 | 1.13 | 0.97 |

MAP falls to 65 % of baseline (tables 60–65 % ✓, deeper than the healthy 75 % ✓), phenylephrine restores pressure
and the supply/demand ratio within 90 s ✓, ephedrine raises HR (+13) and rescues more slowly ✓ — but the spiral does
not start: S/D bottoms at 1.00 (tables 0.78), kIsch 0.93 (tables ≤ 0.75), no ST change. The difference is LVEDP: propofol's
venodilation plus the R45(b) venous recruitment LOWER it to 12 instead of the tables' 25, so CPP stays 45 (tables 20–25).
The two R23 tests are `it.fails` with these numbers. Options: (a) accept "hypotension + rescue" as the 7a R23 evidence
and move the spiral to 7g (effect-site propofol, larger Ce in the elderly); (b) make the AS LV preload-intolerant
(stiffer EDPVR so a small EDV fall drops SV); (c) re-weight the tables' demand term (LVSP enters linearly, which falls
with the pressure and cancels most of the supply loss).
