### Second scenario load restarts the clock (chromium)

| Clock | Monitor | Presenter |
|---|---|---|
| 0:00 | HR –, ART –/– (–), SpO2 –, EtCO2 –, RR – · state awake | loaded "Healthy induction" at ×4 |
| 2:02 | HR 70, ART 123/80 (95), SpO2 99, EtCO2 38, RR 14 · state awake | first case running 2 min |
| 0:02 | HR 78, ART 79/62 (68), SpO2 –, EtCO2 –, RR 24 · state arrival | second case loaded |
| 0:36 | HR 97, ART 107/87 (93), SpO2 97, EtCO2 34, RR 13 · state arrival | 8 s (wall) later |

Alarms raised (scenario clock): none

Checks: PASS the clock restarts on the second load ("02:06 → 00:06 (time in state 00:06)") · PASS the clock runs after the second load ("00:06 → 00:41") · PASS no console error or page error ([])
