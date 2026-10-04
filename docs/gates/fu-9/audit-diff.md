# audit:physiology — "## Propofol" and "## Arrests" tables, before (origin/main) vs after (FU-9 A + C)

```diff
@@ -1,17 +1,17 @@
 ## Propofol state-dependence (audit §K)
 | state | pre MAP | pre HR | pre CO | ΔMAP nadir | ΔMAP % | at t+ | ΔHR | ΔCO | min MAP | arrest |
 |---|---|---|---|---|---|---|---|---|---|---|
-| healthy 40 y | 96 | 73 | 4.97 | -21.8 | -23 % | 70 s | 2 | -0.31 | 74 | no |
-| 80 y hypertensive | 122 | 68 | 4.69 | -25.9 | -21 % | 80 s | -1 | -0.11 | 96 | no |
-| AS + CAD + HTN 75 y | 118 | 67 | 5.00 | -25.3 | -21 % | 80 s | -0 | -0.19 | 93 | no |
+| healthy 40 y | 96 | 73 | 4.97 | -21.8 | -23 % | 70 s | 3 | -0.32 | 74 | no |
+| 80 y hypertensive | 122 | 68 | 4.70 | -26.0 | -21 % | 80 s | -1 | -0.10 | 96 | no |
+| AS + CAD + HTN 75 y | 118 | 67 | 5.00 | -25.4 | -22 % | 80 s | -0 | -0.20 | 93 | no |
 | HFrEF 60 y | 87 | 70 | 5.08 | -18.7 | -22 % | 90 s | 2 | -0.54 | 68 | no |
-| tamponade 1 (250 mL) | 89 | 103 | 3.06 | -75.6 | -85 % | 250 s | -62 | -3.12 | 13 | t+170 s sinus |
-| hypovolaemia (−1.5 L) | 83 | 116 | 3.10 | -56.4 | -68 % | 60 s | -28 | -1.47 | 27 | no |
-| massive PE (φ 0.8) | 76 | 126 | 2.68 | -62.2 | -82 % | 225 s | -59 | -2.68 | 13 | t+60 s sinus |
+| tamponade 1 (250 mL) | 89 | 103 | 3.03 | -75.6 | -85 % | 250 s | -63 | -3.03 | 13 | t+170 s sinus |
+| hypovolaemia (−1.5 L) | 83 | 116 | 3.12 | -56.4 | -68 % | 60 s | -28 | -1.46 | 27 | no |
+| massive PE (φ 0.8) | 76 | 126 | 2.68 | -61.7 | -82 % | 230 s | -61 | -2.63 | 14 | t+60 s sinus |
 | tension PTX (7b, R) | 17 | 0 | 0.00 | -2.3 | -14 % | 280 s | 0 | 0.00 | 15 | t+5 s asystole |
-| septic shock warm | 77 | 138 | 5.18 | -28.6 | -37 % | 95 s | -45 | -0.46 | 48 | no |
-| MANUAL healthy (vs pre-dose) | 107 | 75 | 6.57 | -22.8 | -21 % | 195 s | 0 | -0.34 | 84 | no |
-| MANUAL hypovolaemia | 53 | 80 | 3.23 | -19.4 | -35 % | 260 s | 5 | -0.41 | 35 | no |
+| septic shock warm | 77 | 137 | 5.12 | -28.2 | -37 % | 95 s | -46 | -0.44 | 48 | no |
+| MANUAL healthy (vs pre-dose) | 107 | 75 | 6.57 | -22.9 | -21 % | 195 s | 0 | -0.34 | 84 | no |
+| MANUAL hypovolaemia | 53 | 80 | 3.24 | -19.3 | -35 % | 230 s | 4 | -0.64 | 35 | no |
 
 ## Arrests
 | scenario | arrest at | rhythm | cause | first MAP < 30 | min HR, last min before | steps |
@@ -32,29 +32,29 @@
 | B0-tamp | – | – |  | – | – | 60 s tamponade 1 |
 | B0s-tamp-spont | – | – |  | – | – | 60 s tamponade 1 |
 | B1-tamp-prop1 | – | – |  | – | – | 60 s tamponade 1; 660 s propofol 1 mg/kg |
-| B2-tamp-prop2 | 830 s | sinus (PEA) | lowFlow | 810 s | 47 | 60 s tamponade 1; 660 s propofol 2 mg/kg |
+| B2-tamp-prop2 | 830 s | sinus (PEA) | lowFlow | 810 s | 46 | 60 s tamponade 1; 660 s propofol 2 mg/kg |
 | B3-tamp-peep10 | – | – |  | – | – | 60 s tamponade 1; 660 s PEEP 10 |
 | B3b-tamp-peep15 | – | – |  | – | – | 60 s tamponade 1; 660 s PEEP 15 |
 | B4-tamp-sevo | – | – |  | – | – | 60 s tamponade 1; 660 s sevoflurane 2 % |
 | B5-tamp-bleed1000 | – | – |  | – | – | 60 s tamponade 1; 660 s bleed 1000 mL / 300 s |
-| B6-chain | 1135 s | sinus (PEA) | lowFlow | 1115 s | 48 | 60 s tamponade 1; 660 s propofol 1 mg/kg; 960 s propofol 1 mg/kg; 1260 s PEEP 10; 1560 s sevoflurane 2 %; 2160 s bleed 1000 mL / 300 s |
-| B7-ali | 830 s | sinus (PEA) | lowFlow | 810 s | 47 | 60 s tamponade 1; 660 s propofol 2 mg/kg; 900 s propofol 1 mg/kg; 1200 s PEEP 15; 1500 s sevoflurane 2 %; 2100 s bleed 2000 mL / 300 s |
+| B6-chain | 1135 s | sinus (PEA) | lowFlow | 1115 s | 47 | 60 s tamponade 1; 660 s propofol 1 mg/kg; 960 s propofol 1 mg/kg; 1260 s PEEP 10; 1560 s sevoflurane 2 %; 2160 s bleed 1000 mL / 300 s |
+| B7-ali | 830 s | sinus (PEA) | lowFlow | 810 s | 46 | 60 s tamponade 1; 660 s propofol 2 mg/kg; 900 s propofol 1 mg/kg; 1200 s PEEP 15; 1500 s sevoflurane 2 %; 2100 s bleed 2000 mL / 300 s |
 | B8-tamp08-prop2 | – | – |  | – | – | 60 s tamponade 0.8; 660 s propofol 2 mg/kg |
-| B9-tamp-prop4 | 760 s | sinus (PEA) | lowFlow | 740 s | 47 | 60 s tamponade 1; 660 s propofol 4 mg/kg |
+| B9-tamp-prop4 | 760 s | sinus (PEA) | lowFlow | 735 s | 46 | 60 s tamponade 1; 660 s propofol 4 mg/kg |
 | C0-bleed1500-ctl | – | – |  | – | – | 60 s bleed 1500 mL / 600 s |
 | C1-bleed-prop2 | – | – |  | 1005 s | – | 60 s bleed 1500 mL / 600 s; 960 s propofol 2 mg/kg |
 | C2-bleed-sevo | – | – |  | – | – | 60 s bleed 1500 mL / 600 s; 960 s sevoflurane 2 % |
 | C3-bleed-neuraxial | – | – |  | – | – | 60 s bleed 1500 mL / 600 s; 960 s thermal neuraxial |
 | C4-bleed2500 | 645 s | sinus (PEA) | lowFlow | 605 s | 55 | 60 s bleed 2500 mL / 600 s |
-| D0-pe | 1460 s | sinus (PEA) | lowFlow | – | 110 | 60 s PE 1 |
+| D0-pe | 1455 s | sinus (PEA) | lowFlow | – | 118 | 60 s PE 1 |
 | D1-pe-prop-peep | 720 s | sinus (PEA) | lowFlow | – | 84 | 60 s PE 1; 660 s propofol 2 mg/kg; 960 s PEEP 15 |
-| D2-pe-peep15 | 1180 s | sinus (PEA) | lowFlow | – | 126 | 60 s PE 1; 660 s PEEP 15 |
+| D2-pe-peep15 | 1190 s | sinus (PEA) | lowFlow | – | 123 | 60 s PE 1; 660 s PEEP 15 |
 | D3-pe-both | – | – |  | – | – | 60 s PE 1; 60 s lung PE 1 |
 | E1-ptx-lung | 400 s | asystole | lowFlow | 380 s | 43 | 60 s ptxTension R 1; 660 s PEEP 15 |
 | E2-ptx-circ | 400 s | asystole | lowFlow | 380 s | 43 | 60 s tensionPtx 1; 660 s PEEP 15 |
 | F0-sepsis | – | – |  | – | – | 60 s sepsis 1 warm |
 | F1-sepsis-prop2 | – | – |  | – | – | 60 s sepsis 1 warm; 1260 s propofol 2 mg/kg |
-| F2-anaph | 295 s | sinus (PEA) | lowFlow | 270 s | 62 | 60 s anaphylaxis 1 |
+| F2-anaph | 295 s | sinus (PEA) | lowFlow | 270 s | 59 | 60 s anaphylaxis 1 |
 | F3-anaph-peep | 280 s | sinus (PEA) | lowFlow | 255 s | 58 | 60 s anaphylaxis 1; 240 s PEEP 15 |
 | F4-mh | 2785 s | vfCoarse | hyperthermia | – | 175 | 60 s sevoflurane 2 %; 120 s MH 1 |
 | G1-k75 | – | – |  | – | – |  |
@@ -68,7 +68,7 @@
 | H1b-remi3 | – | – |  | – | – | 300 s remifentanil 3 µg/kg |
 | H2-sux-repeat | – | – |  | – | – | 300 s sux 1.5 mg/kg; 600 s sux 1 mg/kg |
 | H3-neo | – | – |  | – | – | 300 s neostigmine 0.05 mg/kg |
-| I1-apnoea | 1220 s | asystole | lowFlow | – | 57 | 300 s ventilation none; 300 s propofol 2 mg/kg; 300 s rocuronium 0.6 mg/kg |
+| I1-apnoea | 1220 s | asystole | lowFlow | 1215 s | 57 | 300 s ventilation none; 300 s propofol 2 mg/kg; 300 s rocuronium 0.6 mg/kg |
 | J1-od-healthy | – | – |  | – | – | 300 s propofol 4 mg/kg; 300 s remi 2 µg/kg |
 | J2-od-80htn | – | – |  | – | – | 300 s propofol 4 mg/kg; 300 s remi 2 µg/kg |
 | J3-80htn-prop2 | – | – |  | – | – | 300 s propofol 2 mg/kg |
```
