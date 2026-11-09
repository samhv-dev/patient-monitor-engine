SCENARIO BUILDER AND STORE MOCK-UPS (docs/plans/scenario-builder.md), drawn 9 November 2026 on main 8344539d
==========================================================================================================
Static pages for the owner's review: NOT the product, no app code. Nothing here is built.

How they are made
  make-mockups.py        writes the six pages (python3 -I make-mockups.py)
  capture.sh             screenshots them at 1440 x 900 with Chrome headless (serve the repository root over http first)
  mock.css               the PROPOSED builder's classes (sb-*), on the app's own tokens
  ip2-captured.html      Instructor v2's DOM as the app drew it (kit I, main cd1e28c7, served locally), the MH card
                         showcase-mh-v2 paused at 07:53 after a fast forward; the learners' monitor canvas removed and
                         the Finish panel dropped; used whole by page 4
Every page links the app's own stylesheets from the source tree (apps/demo/src/app/app.css; page 4 also
teach2/teach2.css, state.css, action.css), so every class that is not sb-* is today's app's.

The pages
  01-builder-main.html / .png      the builder's main screen: outline, the Header and story section, the checks
  02-phase-editor.html / .png      the phase editor on Early signs
  03-action-editor.html / .png     the action editor on Dantrolene 2.5 mg/kg, with acceptance criteria
  04-run-in-place.html / .png      the draft running: the builder's run panel beside Instructor v2
  05-library.html / .png           the library with Verified, Community (unverified) and On this laptop
  06-sign.html / .png              a verifier's sign step

What is the product's own (read from main 8344539d)
  - The MH card's phases, their labels, cues, Say line, rules, holds and next lists (showcase-mh-v2.json); the
    dantrolene action's criteria, window, repeat, contraindication and give (the same file); the row subtitle "2–3
    mg/kg · IV/CENTRAL · within 5 min of the "callCrisis" action · again every 5–10 min while after recrudescence" and
    the phase line "when EtCO₂ > 45 and EtCO₂ rising and set minute ventilation unchanged and HR rising, held 20 s" are
    Instructor v2's own text for this card.
  - The validator's messages: "/takeHome: must NOT have more than 4 items" (ajv's wording through validate.ts) and
    "/phases/2/next/0: no phase "establshed"" (validate.ts validateV2's wording); the misspelt id is planted for the
    picture. The truth leaves and their names (the schema's truthVar), and that a phase rule has no manual, event or
    afterS leaf.
  - Page 4's right half: everything in it (Latent 01:24 and Early signs 05:59 were the phase entries of that run).
  - The engine has 65 drug rows; dantrolene's routes: iv, io, central honoured; im accepted with no systemic effect
    (F5.2); inh not modelled.

What is illustrative (invented for the layout)
  - Every time, version number and count in the save chips, the history, the checks and the run trace (11:42:05, v7,
    v6, "23 numbers", 05:39, the slope and ventilation values in "What fired, and why", 00:24).
  - The id mh-phases-copy, the fifth take-home line and the four other take-home lines' wording.
  - The library's community cards (local anaesthetic toxicity, laryngospasm), their versions and dates; the
    "Healthy induction ... beats identical · signed 12 Nov 2026" line; the rail's count 21.
  - Page 3's "How it grades" lines: the grades follow the guide's rules for this card's criteria, but the strings were
    written for the page, not printed by grade() (B4 prints grade()'s own).
  - Page 6's card, its diff, its hash, its dates, the author's chosen line "a resident, Anaesthesia", "2 cards".
  - The wording of the signature's assertion is a DRAFT for the owner (BQ1, BQ3), not his text.
