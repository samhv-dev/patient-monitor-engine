# FU-9 gate — RH runner: origin/main (engine as at 176f702) → fu-9-blood-fluids (Parts A + C), seed 7

Every cell whose automatic verdict or any value moved (> 1 % or 1e-3). Runner: `research/13-audit-scripts` (read-only copy). Full matrices: `rh-matrix-before.md`, `rh-matrix-after.md` (their verdict column carries the coverage run's frozen hand grades where it had one; the totals here are the runner's automatic verdicts).

cells 62 (missing after: none)
automatic verdicts before: PL 23, TW 11, TS 7, WR 12, MI 1, NE 8; after: PL 33, TW 10, TS 6, WR 5, NE 8

| cell | values before → after (moved keys) | auto before → after |
|---|---|---|
| RH-01a | uoGA1 0.38 → **0.57**; uoGA2 0.35 → **0.57**; uoGA3 0.35 → **0.57**; uoGA4 0.35 → **0.58**; uoGAmin 0.35 → **0.57**; uoAw1 0.93 → **1.04**; uoAw4 0.93 → **1.06**; vNhGA 0.58 → **1**; vNhAw 0.88 → **0.99**; angGA 0.36 → **0** | TS → **PL** |
| RH-01b | flagFirstS 1200 → **None**; flagAny True → **False**; flagMinutesOn 221 → **0** | WR → **PL** |
| RH-01c | rbfAw 870 → **916**; rbfGA 478 → **889**; rbfPctCoAw 15.3 → **16.1**; ffAw 0.26 → **0.25**; ffGA 0.48 → **0.26**; rbfGAvsAwPct -45 → **-2.94** | TS → **PL** |
| RH-02a | uoAw2 29.7 → **32.7**; uoAw3 14 → **18.4**; uoAw0 65.6 → **74.2**; uoGA2 7.4 → **13.3**; uoGA3 2.7 → **5.1**; uoGA0 24.9 → **40**; uoGA3kgH30 0.04 → **0.08** | PL → **TS** |
| RH-02b | rbfPct2 -43.4 → **-57.6**; gfrPct2 -1.1 → **-1.8**; rbfPct3 -43.2 → **-64.8**; gfrPct3 -1.3 → **-24.7**; gfrMinusRbf2 42.3 → **55.8**; gfrMinusRbf3 41.9 → **40.1**; ff0 0.48 → **0.26**; ff2 0.81 → **0.58**; ff3 0.79 → **0.52** | TS =  |
| RH-02c | hbfRel 0.38 → **0.43**; hbfOverCo 0.61 → **0.68**; kLacPct -35.1 → **-39.9**; dLact30 2.19 → **2.09**; hbfRel2 0.56 → **0.6** | PL =  |
| RH-03a | uoPre 0.4 → **0.32**; uoBleed 0.05 → **0.09**; uo0to30 0.19 → **0.59**; uo30to60 0.23 → **0.33**; uoCtl30to60 0.04 → **0.07**; uoNormGA30to60 0.35 → **0.57**; vNh60 0.52 → **0.82**; tUo05 None → **600** | MI → **TW** |
| RH-03b | uoPre 0.4 → **0.32**; uoBleed 0.05 → **0.09**; uo0to30 0.07 → **0.14**; uo30to60 0.09 → **0.15**; uoCtl30to60 0.04 → **0.07**; uoNormGA30to60 0.35 → **0.57**; coEnd 3.69 → **3.96**; vNh60 0.21 → **0.42** | TW =  |
| RH-04a | uoH65 0.09 → **0.1**; uoH80 0.18 → **0.32**; uoA65 0.29 → **0.15**; uoA80 0.45 → **0.41**; ratioH 0.5 → **0.31**; ratioA 0.64 → **0.37**; htnMinusHealthy65 -0.2 → **-0.05**; vNhH65 0.49 → **0.89**; vNhA65 0.99 → **1** | PL =  |
| RH-04b | rbfH65vs80 -7.8 → **-41.9**; rbfA65vs80 -35.8 → **-42**; gfrH65vs80 -40.2 → **-56.7**; gfrA65vs80 -13.6 → **-49.6**; gfrShiftEffect -26.6 → **-7.1**; rbfShiftEffect 28 → **0.1** | PL =  |
| RH-05a | uoPre 0.52 → **0.73**; uoPreHour 0.51 → **0.76**; vNh 0.61 → **0.86** | TS =  |
| RH-05b | uo30to60 0.66 → **0.73**; uoCtl30to60 0.42 → **0.64**; uo0to30 0.62 → **0.82**; coPct 18.2 → **19.8** | TS =  |
| RH-15a | peakRatio 1.73 → **1.68**; ce10Ratio 1.83 → **1.75**; fShock 0.53 → **0.57**; fNorm 0.94 → **0.93**; qShock 0.45 → **0.46**; hbf 0.25 → **0.31** | PL =  |
| RH-15b | ce30Ratio 1.19 → **1.17**; fNorm 0.92 → **0.89** | TW =  |
| RH-16 | hbfPct 5.3 → **-15.2**; coPct 2.8 → **2.7**; kLacPct 2.8 → **-8.2** | WR → **PL** |
| RH-21 | uoC 0.8 → **0.73**; vNhI 0.16 → **0.25**; vNhC 0.99 → **1** | WR =  |
| RH-M1 | uo1 0.79 → **0.72**; uo2 0.81 → **0.73** | PL =  |
| RH-M2 | uoI 0.55 → **0.53**; uoC 0.06 → **0.04** | PL =  |
| RH-06a | uo0 0.36 → **0.57**; uo15 0.36 → **0.49**; uo20 0.36 → **0.45**; uo25 0.36 → **0.42**; uo15Pct 0 → **-14**; gfr25 126 → **130**; rbf25Pct -28.1 → **-42.8** | WR → **TS** |
| RH-06d | hbf20Pct 0 → **-26.3**; hbf25Pct 0 → **-36.8**; kLac25Pct 0.2 → **-19** | WR → **PL** |
| RH-07a | peakT40Min 2.5 → **11**; peakUo40MlMin 3.09 → **4.6**; peakUo20MlMin 2.37 → **3.66**; extra2h40 168 → **297**; extra2h20 120 → **211** | TW =  |
| RH-07b | dK3h -0.003 → **-0.027**; dNa3h 0.02 → **0.08**; dHco3 0.15 → **0.17** | TW =  |
| RH-07c | dBvMl2h -29.4 → **-99**; dCvp2h -0.27 → **-0.49**; dCvp10 -0.44 → **-0.48**; dMap2h -0.71 → **-2.27**; dHb2h 0.09 → **0.31** | TW =  |
| RH-08a | dBvPeak -2.4 → **116**; dBv3h -161 → **-84.4**; dCvpPeak 0.01 → **0.58** | WR → **PL** |
| RH-08b | extra1h 285 → **350**; extra3h 624 → **724**; peakUoMlMin 6.21 → **6.92**; mannitolG1h 49.5 → **0** | PL =  |
| RH-08c | dNa15 0.1 → **-7.6**; dNa3h 0.49 → **-2.91**; dOsm15 0.2 → **8.71**; dOsm3h 0.98 → **4.08** | WR =  |
| RH-09a | dKpeakAki 0.734 → **0.7**; dKpeakOk 0.734 → **0.667**; gfrAki 76.8 → **25.1**; uoAki 0.22 → **0.11**; uoOk 0.36 → **0.57** | PL =  |
| RH-09b | dK3hAki -0.014 → **-0.159**; dK3hOk -0.014 → **-0.158** | WR =  |
| RH-10a | t25Ckd 44.5 → **50.5**; ratio 1.24 → **1.4**; fCkd 0.74 → **0.68**; gfrRelCkd 0.39 → **0.2** | TW → **PL** |
| RH-10b | t90Ckd 3 → **3.33**; ratio 1.12 → **1.25** | PL =  |
| RH-11 | dKAki 0.469 → **0.478**; akiMinusOk 0 → **0.006** | PL =  |
| RH-12a | lactHf 2.11 → **2.15**; lactOk 1.19 → **1.23**; kLacHf 0.86 → **0.85**; kLacOk 1.24 → **1.22** | PL =  |
| RH-12e | fHf 0.93 → **0.89**; fOk 0.93 → **0.89** | PL =  |
| RH-13 | dLactHf 0.91 → **1.04**; dLactOk 0.66 → **0.87**; dLactHf60 0.45 → **0.76**; hfMinusOk 0.25 → **0.17** | PL → **TS** |
| RH-14a | coPct 0.1 → **-0.1** | NE =  |
| RH-14b | mapPctHf -23.2 → **-22.9** | NE =  |
| RH-17a | uoCtlH2 0.35 → **0.57**; rbfPct -63.4 → **-80.5**; tStage1Min 124 → **129**; akiStageCtl 1 → **0** | WR → **PL** |
| RH-17b | lact60 1.45 → **1.48**; lact120 3.99 → **3.75**; kLacPct -40.6 → **-32**; hbfPct -25.8 → **-11.7** | TW =  |
| RH-20a | fRatio 0.77 → **0.82**; pctPerC -7.9 → **-6.2**; ce60Ratio 1.11 → **1.08** | PL → **TW** |
| RH-20b | kLacPct -22 → **-19.5**; dLact2h 0.47 → **0.43** | PL =  |
| RH-20c | uoCold 0.25 → **0.71**; uoNorm 0.33 → **0.55**; uoPct -24.2 → **29.1**; dMap -4.64 → **-4.55**; coPct -4.8 → **-4.7** | WR → **PL** |
| RH-22a | uoC 0 → **0.01**; uoN1 0.09 → **0.1**; uoN3 0.19 → **0.18** | PL =  |
| RH-22b | dUoHiLo 0.1 → **0.08** | PL =  |
| RH-23a | osmGap 31.9 → **32.3** | PL =  |
| RH-23b | dMapPeak 13 → **13.2**; dHrMin -10.5 → **-10.3**; dCvpEnd 13.5 → **11.9**; dMapLate 14.4 → **12.6**; dPawp 16.9 → **13.6** | PL =  |
| RH-23c | extraUrine1h 18.4 → **455**; uoEnd 0.71 → **7.33** | TW → **PL** |
| RH-25a | dNa2h 2.26 → **2.31** | PL =  |
| RH-25b | extraUrine2h 12.9 → **299**; dBv2h 330 → **196** | TW → **PL** |
| RH-26a | hbfPct -29.3 → **-22.2** | PL =  |
| RH-26b | uoPct -48.6 → **-24.6**; uoI 0.18 → **0.43**; uoC 0.35 → **0.57**; gfrPct -0.8 → **-0.6** | TS → **PL** |
| RH-27a | rbf90 722 → **748**; rbf150 849 → **859**; rbfPct150vs90 17.5 → **14.9**; gfrPct150vs90 -0.3 → **-0.2** | TS → **PL** |
| RH-27b | uo90 0.53 → **0.48**; uo120 1.02 → **0.92**; uo150 2.06 → **1.88** | PL =  |
