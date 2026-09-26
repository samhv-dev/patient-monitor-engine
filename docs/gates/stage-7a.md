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
