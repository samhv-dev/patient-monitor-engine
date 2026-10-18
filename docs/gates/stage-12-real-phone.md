# Stage 12 gate, Step 4: one real phone through the six cards (the OWNER's step)

STATE: **PENDING-OWNER.** Stage 12 merged (PR #57, main 8698a86e); the owner's result in this table still closes gate
step 4. Prepared on the pre-merge dry run
(kit built from `stage-12` at 806b00bc in `Desktop/Claude/_sandbox/pme-classroom-dryrun/kit`).

## The run

1. Turn on the Mac's hotspot: System Settings > General > Sharing > Internet Sharing, sharing to Wi-Fi. Your phone joins it.
2. Double-click **Start Classroom** in the kit. Leave its window open, and click **Allow** for "node" if macOS asks.
3. Put the **Monitor** view on the projector-sized screen. Move the pointer to the top edge, click **Phones**, and scan
   the code with the phone. Click **Close**.
4. Run the six cards in order, as the run sheet presents them (speeds, fast-forwards, events). Keep the phone beside the
   screen the whole time. Take one phone screenshot per card and put it in `docs/gates/stage-12/`.

| # | Card | Scan → "Following" (s, first card only) | Resyncs seen (status line left "Following") | Each fast-forward: end → "Following" (s) | Tiles equal to the screen at 3 moments (y/n each) | Sound on, then off (heard / silent) | Notes |
|---|---|---|---|---|---|---|---|
| 1 | Healthy induction (`showcase-induction`) | | | | / / | | |
| 2 | Induction after fentanyl and midazolam (`showcase-induction-premed`) | — | | | / / | | |
| 3 | Anaphylaxis under anaesthesia (`showcase-anaphylaxis`) | — | | | / / | | |
| 4 | Malignant hyperthermia (`showcase-mh`) | — | | | / / | | |
| 5 | Stab wound: tamponade, PEA and pericardiocentesis (`showcase-tamponade`) | — | | | / / | | |
| 6 | Class IV haemorrhage, PEA and resuscitation (`showcase-haemorrhage`) | — | | | / / | | |

Once:
- 60 s screen lock and unlock → "Following" again in ___ s (more than 15 s becomes a follow-up, R50 M6)
- Phone model and browser: ___
- Hotspot name, and how many other devices were on it: ___
- Relay peer count shown on the sheet: ___
- The bronchospasm library case with the Ventilator view: now hand check **H21** below (no longer optional).
- If you have a phone of the other kind (iPhone / Android): the scan, the Sound tap and one lock on it: ___

## Hand check H21 (S12-F1: the Ventilator-view hold; CI cannot check it on WebKit)

| # | Check | Result (y/n) | Notes |
|---|---|---|---|
| H21 | Bronchospasm with the Ventilator view: once the cockpit ventilates and the phone shows "The ventilator is on the main screen", switch the main screen to the **Monitor** view for 30 s. On the phone, does the hold stay? On the main screen, does the patient keep ventilating (EtCO2 steady, awRR at the cockpit's rate)? Then load the next case: does the phone follow again? | | |

Why: on CI's Linux WebKit, the hidden cockpit stopped sending frames once the Monitor view was shown, so the phone's
hold ended (PR #57, CI run 38194080645). The cockpit is meant to keep ventilating whichever view is on screen. This
check answers it on the real presenting Mac and its browser.

Any card the phone does not follow keeps gate step 4 open (a finding for the orchestrator). Write which card it was and
what the status line said.
