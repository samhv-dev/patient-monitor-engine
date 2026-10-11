### Second scenario load restarts the clock (webkit)

| Clock | Monitor | Presenter |
|---|---|---|
| 0:01 | HR 71, ART 123/81 (95), SpO2 –, EtCO2 36, RR – · state awake | loaded "Healthy induction" at ×4 |
| 2:02 | HR 70, ART 123/81 (95), SpO2 99, EtCO2 38, RR 13 · state awake | first case running 2 min |
| -1:-4 | HR 70, ART –/– (–), SpO2 –, EtCO2 –, RR – · state arrival | second case loaded |
| 0:29 | HR 100, ART 109/89 (95), SpO2 96, EtCO2 34, RR 14 · state arrival | 8 s (wall) later |

Alarms raised (scenario clock): none

Checks: PASS the clock restarts on the second load ("02:09 → 00:05 (time in state 00:04)") · PASS the clock runs after the second load ("00:05 → 00:38") · PASS no console error or page error ([])
