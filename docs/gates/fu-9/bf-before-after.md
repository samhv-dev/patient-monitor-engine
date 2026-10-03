# FU-9 gate — BF runner: origin/main (engine as at 176f702) → fu-9-blood-fluids (Parts A + C), seed 7

Every cell whose automatic verdict or any value moved (> 1 % or 1e-3). Runner: `research/22-audit-scripts` (read-only copy). Full matrices: `bf-matrix-before.md`, `bf-matrix-after.md` (their verdict column carries the coverage run's frozen hand grades where it had one; the totals here are the runner's automatic verdicts).

cells 74 (missing after: none)
automatic verdicts before: PL 29, TW 10, TS 8, WR 7, MI 1, NE 19; after: PL 34, TW 11, TS 5, WR 4, MI 1, NE 19

| cell | values before → after (moved keys) | auto before → after |
|---|---|---|
| BF-01a | dCl 5.45 → **4.82**; dBE -0.444 → **-0.702**; dHco3 -0.774 → **-0.984**; dPh 0.02 → **0.015**; dNa 0.715 → **0.753**; dBE90 -1.29 → **-1.6**; dAg -3.96 → **-3.09**; dAlb -10.6 → **-9.08** | TW =  |
| BF-01b | dCl -0.75 → **-1.52**; dBE 1.77 → **1.45**; dHco3 1.06 → **0.793**; dPh 0.057 → **0.052**; dNa 0 → **0.034**; dBE90 1.22 → **0.958**; dAg -0.315 → **0.764**; dAlb -10.4 → **-8.86**; dBEvsSaline 2.22 → **2.15** | WR =  |
| BF-02a | retEndAwake 0.74 → **0.56**; retAwake30 0.53 → **0.23**; retEndGA 0.74 → **0.65**; retGA30 0.53 → **0.35**; gaMinusAwake 0 → **0.12**; dUopAwake 11 → **323**; dUopGA 15 → **261**; retAwake90 0.5 → **0.12** | WR → **PL** |
| BF-02b | retHypo30 0.53 → **0.54**; retGA30 0.53 → **0.35**; hypoMinusGA 0 → **0.19**; dCoHypo 1.01 → **1.06** | WR → **PL** |
| BF-03a | effEnd 0.99 → **0.96**; eff60 0.93 → **0.85**; effRLEnd 0.82 → **0.83**; effRL60 0.49 → **0.5**; dCop 1.8 → **0.692** | PL =  |
| BF-03b | effEnd 0.94 → **0.93**; eff60 0.86 → **0.8**; effRLEnd 0.82 → **0.83**; effRL60 0.49 → **0.5**; dCop 0.039 → **-0.606** | PL =  |
| BF-04 | dHb1h 0.546 → **0.734**; dHb4h 0.547 → **0.886**; dBv1h 191 → **127**; dK 0.05 → **0.01** | TW → **PL** |
| BF-05a | iCaNadir 0.3 → **0.958**; tNadirS 1940 → **1730**; citratePeak 10.7 → **1.12**; iCa30AfterEnd 0.775 → **1.07**; events i:10s sinus→2430s asystole → **None** | TS → **TW** |
| BF-05b | kPeak 4.81 → **5.01**; dkPeak 0.69 → **0.87**; k60AfterEnd 5.2 → **3.7**; events i:10s sinus→2430s asystole → **None** | PL =  |
| BF-05c | events i:10s sinus→2430s asystole → **None** | PL =  |
| BF-05d | bePre -0.15 → **-0.16**; beNadir -5.59 → **-0.156**; lactPeak 21.1 → **7.37**; phNadir 6.91 → **7.41**; mapNadir 7.06 → **27.7**; coNadir 0 → **1.35**; arrest True → **False**; events i:10s sinus→2430s asystole → **None** | TS → **TW** |
| BF-05e | albEnd 31 → **28.5**; events i:10s sinus→2430s asystole → **None** | NE =  |
| BF-06b | dCoHypo 0.83 → **0.86** | PL =  |
| BF-13a | lactBefore 3.87 → **3.79**; dPaco2Peak 3.32 → **4.24**; dEtco2Peak 17.4 → **17**; dPaco2At20 -8.81 → **-7.45**; events i:5s sinus→2390s asystole | c:5s sinus→2150s asystole → **i:5s sinus→2420s asystole | c:5s sinus→2210s asystole** | PL =  |
| BF-13b | dICa -0.08 → **-0.07**; events i:5s sinus→2390s asystole | c:5s sinus→2150s asystole → **i:5s sinus→2420s asystole | c:5s sinus→2210s asystole** | PL =  |
| BF-13c | dPhPeak 0.14 → **0.12**; dPh30 0.108 → **0.104**; dHco3 3.88 → **4.03**; dLact30 -0.475 → **-0.467**; events i:5s sinus→2390s asystole | c:5s sinus→2150s asystole → **i:5s sinus→2420s asystole | c:5s sinus→2210s asystole** | PL =  |
| BF-16a | dK 0.222 → **0.219** | TS =  |
| BF-16b | dPaco2 0.4 → **0.6** | TW =  |
| BF-17a | dICa -0.062 → **-0.063** | PL =  |
| BF-17b | dK -0.22 → **-0.215**; kPer01 -0.18 → **-0.17**; dK40 -0.278 → **-0.271** | PL =  |
| BF-25a | albEnd 17.6 → **18.3** | NE =  |
| BF-25b | albEnd 17.6 → **18.3** | NE =  |
| BF-25c | albEnd 17.6 → **18.3** | NE =  |
| BF-25d | albEnd 17.6 → **18.3** | NE =  |
| BF-25e | albEnd 17.6 → **18.3** | NE =  |
| BF-29a | coLow 1.71 → **1.73**; gapLow 21 → **20**; gapNormal 6 → **7** | TS =  |
| BF-29b | svo2Low 79.7 → **56**; svo2Normal 85.9 → **84.4**; svo2Truth 79.7 → **56**; lactLow 3.02 → **2.98** | TS → **PL** |
| BF-08d | dKBicarb60 -0.17 → **-0.209**; dKFuro3h -0.002 → **-0.029**; dUopFuro 154 → **235** | TW =  |
| BF-12 | dNa2h 6.92 → **6.99**; dBv45 555 → **458** | PL =  |
| BF-14 | dBE -3.25 → **-3.34**; dCl 11.4 → **10.5**; dPh -0.037 → **-0.033**; dAlb -14 → **-12.6**; dHb -6.19 → **-5.47**; retained 3377 → **2813**; evlwiExtra 11.8 → **8.62** | TW =  |
| BF-18a | hbEnd 6.72 → **6.98**; dBv 234 → **68**; dHr 20 → **18**; dMap -9 → **-13** | PL =  |
| BF-18b | coPct 27.4 → **20.4**; do2Pct -41.7 → **-44.4**; svo2 62.2 → **60.4**; lact 0.798 → **0.932**; svrPct -31.3 → **-29.2** | PL =  |
| BF-19 | hbEnd 10.8 → **11**; coPct 16.7 → **11.6**; do2Pct -14.4 → **-19**; dHr 4 → **6**; svo2 82.8 → **81.7** | PL → **TS** |
| BF-20a | dEvlwiSepsis 0 → **0.547**; dEvlwiHealthy 2.68 → **1.02**; dPao2Sepsis 22 → **11**; dPao2Healthy 6 → **5**; dVisfSepsis 1296 → **1203**; dVisfHealthy 1019 → **804** | WR =  |
| BF-20b | dMapPeak 10.9 → **11.7**; dMap60After 11.7 → **12.5**; dCoPeak 2.72 → **2.59** | TS =  |
| BF-21a | pawpPeakHF 27 → **26**; pawpPeakMR 34 → **33** | PL =  |
| BF-21b | evlwiExtraHF 4.97 → **2.77**; evlwiExtraMR 8.9 → **5.78**; copEnd 14.7 → **16.2** | PL → **TW** |
| BF-21c | spo2MinHF 95 → **96**; spo2MinMR 91 → **94**; rrMaxHF 18 → **14.9** | TW =  |
| BF-22a | cop 8.65 → **11.7**; oedemaThreshold 6.7 → **9.7** | TS → **PL** |
| BF-22b | ag 12.6 → **7.86**; dAg -0.164 → **-4.86**; dBE 0.197 → **5.67**; dHco3 0.166 → **4.86** | TW → **PL** |
| BF-22c | dMapPct -0.1 → **0.1** | MI =  |
| BF-15b | paco2 38.8 → **45.2**; hco3 33.8 → **34.7**; dPaco2 -0.193 → **6.24**; dVe -0.056 → **-0.889**; iCa 1.12 → **1.15**; k 4.18 → **4.28** | WR → **PL** |
| BF-11a | dMapPeak 3.38 → **3.33** | PL =  |
| BF-11b | dIcp2h 0.054 → **0.095**; dIcpMax 0.1 → **0.41** | TW =  |
| BF-M1 | mapBase 53 → **54**; dMap 29 → **30**; dCvp 2.98 → **3.24** | PL =  |
