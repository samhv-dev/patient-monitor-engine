### A3 tamponade, cue-card path (kit round) (chromium, kit 62e521c3, load avg 2.41–4.1)

Script: scripts/showcase/kit-round-a.kitround.ts · server: Start Classroom.command (relay + static app, node, as built) · reaction 2 s · 0 phones · setup: {"sessionCode":"PMC4RY","alarmButtonAtOpen":"Limit alarms off","alarmButtonAfterAllOn":"No alarms","soundButton":"Sound on","alarmButtonAfterLoad":"Limit alarms off","limitsAfterLoad":"Limit alarms OFF after Load","allOnAgainAfterLoadAt":"00:13","alarmButtonAfterAllOnAgain":"No alarms","bookmarkAt":"00:13","alarmButtonAtEnd":"No alarms"}

| Wall | Clock | × | State | HR | ART | SpO2 | EtCO2 | RR | Load | What |
|---|---|---|---|---|---|---|---|---|---|---|
| 1.6 | 00:13 | 8 | arrival | 104 | 113/88 (96) | 96 | 36 | 20 | 3.86 | Load "Stab wound: tamponade, PEA and pericardiocentesis" at ×8, Bookmark |
| 7.9 | 01:04 | 8 | arrival | 97 | 105/85 (91) | 98 | 32 | 13 | 3.79 | 1:00 (CVP on the IBP2 tile) |
| 53.2 | 07:04 | 1 | deteriorating | 147 | 63/55 (58) | 99 | 21 | 16 | 3.03 | 7:00 ×1 |
| 97.4 | 07:49 | 1 | pea | 45 | –/– (21) | 99 | 14 | 16 | 3.08 | card shows PEA |
| 100.3 | 07:51 | 1 | cpr | 44 | –/– (20) | 99 | 13 | 16 | 3.08 | press **Start CPR, intubate, FiO₂ 1.0** |
| 100.6 | 07:53 | 4 | cpr | 51 | –/– (32) | 99 | 12 | 19 | 3.08 | ×4 after CPR |
| 118.7 | 09:04 | 1 | cpr | 116 | 39/19 (27) | 99 | 9 | 12 | 3.41 | 9:00 ×1 |
| 136 | 09:22 | 1 | cprDrained | 104 | 41/20 (28) | 99 | 9 | 12 | 3.56 | press **Pericardiocentesis during CPR** |
| 151.2 | 10:22 | 1 | cprDrained | 112 | 71/33 (46) | 99 | 17 | 12 | 3.64 | ≈ 1 min after the drainage, ×1: watch |
| 184.4 | 10:55 | 1 | cprDrained | 135 | 69/32 (45) | 99 | 19 | 12 | 3.19 | return of circulation (the model) |
| 187.3 | 10:58 | 1 | rosc | 123 | 115/50 (76) | 99 | 19 | 12 | 3.01 | press **Pulse back: stop CPR** |
| 216.6 | 11:27 | 1 | rosc | 64 | 115/77 (90) | 99 | 28 | 12 | 2.62 | 30 s after stopping CPR |
| 217.4 | 11:28 | 1 | roscFluid | 65 | 115/78 (91) | 99 | 28 | 12 | 2.41 | press **Crystalloid 500 mL** |

States: 00:02 arrival · 06:14 deteriorating · 07:49 pea · 07:51 cpr · 09:21 cprDrained · 10:57 rosc · 11:27 roscFluid

Alarms raised: 00:22 CVP MEAN TOO HIGH · 05:59 SPO2 LOW PERFUSION · 06:06 ART SYS TOO LOW · 07:03 ART MEAN TOO LOW · 07:10 HR TOO HIGH · 07:17 ART DIA TOO LOW · 07:21 ETCO2 TOO LOW · 07:31 IBP1 STATIC PRESSURE · 07:45 HR TOO LOW · 07:57 ART SYS TOO LOW · 07:57 ART DIA TOO LOW · 11:04 ART DIA TOO HIGH · 11:04 ART MEAN TOO HIGH

Spans: 

Measures: {"a3tamponade":{"peaStateAt":"07:49","cprAt":"07:51","cprAfterPeaStateS":2,"drainedAt":"09:21","drainAfterCprS":90.2,"roscAt":"10:55","drainToRoscS":93.8,"stopAt":"10:57","stopAfterRoscS":2.1,"maxSystolicDrainToRosc":71.4,"artAtStop":"115/50 (76)"},"pdf":{"pages":6,"a4":true,"title":"Debrief Stab wound: tamponade, PEA and pericardiocentesis 2026-10-17"}}

Debrief: {"objectives":[{"status":"not assessable","text":"– Not assessable Name the tamponade within 180 s of arrival from the monitor: tachycardia, narrow pulse pressure, CVP above 15 mmHg (instructor-assessed)This objective has no rule: the instructor judges it."},{"status":"met","text":"✓ Met Start CPR within 10 s of the pulse lossCPR 3 s after the pulse loss (07:48 → 07:51; within 10 s asked)."},{"status":"met","text":"✓ Met Pericardiocentesis within 120 s of starting CPRThe state \"CPR: pericardium drained, catheter left in\" 1 min 30 s after CPR (07:51 → 09:21; within 2 min 00 s asked)."},{"status":"met","text":"✓ Met Stop CPR (“Pulse back”) within 30 s of the pulse returning on the arterial line and the capnogramThe state \"Return of circulation: ventilated, catheter in the pericardium\" 2 s after the return of circulation (10:55 → 10:57; within 30 s asked)."},{"status":"not met","text":"✗ Not met Better: pericardiocentesis before the pulse loss, while the systolic pressure is above 60 mmHg — then no PEA followsThe pulse loss at 07:48"}],"facts":{"Lowest SpO₂":"95 % at 00:28","Lowest ART M / NIBP M":"20 mmHg at 07:51","Highest EtCO₂":"36 mmHg at 00:09","Highest T1 / T2":"36.8 °C at 00:01","Pulseless":"3 min 07 s in all; first lost at 07:48","Return of circulation":"3 min 07 s after the pulse loss (10:55)","Labs (the model): last (lowest–highest)":"K⁺ 4.2 mmol/L (4.2–4.2) · Lactate 2.2 mmol/L (1.0–2.2) · pH 7.28 (7.28–7.41) · Glucose 5.8 mmol/L (5.6–5.8) · Tcore 36.8 °C (36.8–36.8)"},"timelineRows":41,"minuteRows":12}

Phones: null

Notes: 

Errors: none
