### Second scenario load restarts the clock (webkit)

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | HR –, ART –/– (–), SpO2 –, EtCO2 –, RR – · state awake | loaded "Healthy induction" at ×4 |
| 2:01 | HR 71, ART 123/81 (95), SpO2 99, EtCO2 38, RR 14 · state awake | first case running 2 min |
| 0:02 | HR 72, ART –/– (–), SpO2 –, EtCO2 –, RR – · state arrival | second case loaded |
| 0:34 | HR 100, ART 110/89 (96), SpO2 96, EtCO2 34, RR 14 · state arrival | 8 s (wall) later |

Alarms raised (scenario clock): none

Checks: PASS the clock restarts on the second load ("02:03 → 00:05 (time in state 00:05)") · PASS the clock runs after the second load ("00:05 → 00:35") · PASS no console error or page error ([])
