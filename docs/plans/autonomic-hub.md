# The autonomic hub: one autonomic outflow with the reflexes as its inputs — Implementation Plan

**STATUS: DRAFT — owner questions AQ1–AQ14 open (§11).** Written by a planning executor from brief 137 of the
post-demo set (row 7 of `research/48`, "FU-12"). Nothing in it is built: this pull request adds this page and one
roadmap line, and changes no engine code, test, band, card, kit or data file. Two pieces wait on papers the owner
must fetch (§12): H5 (the baroreceptor curve) cannot take its numbers until Ursino 1998 or an equivalent human
parameter set is in hand, and H9 (the sympathoinhibitory event) needs the full text of Schadt & Ludbrook 1991 and
Cooke 2004 for its time course.

**Base and preconditions.**
- Base: `origin/main` **73eb6590** (Merge PR #390), read in the worktree `scratch/wt-plan-hub` (branch
  `plan-autonomic-hub`). Every `file:line` is on 73eb6590 and is a starting point only: an executor finds the code by
  the function or constant name, because lines move.
- The evidence: `docs/roadmap/v2.0/evidence/cardiac-reflexes-audit.md` (the repository copy of the project's
  research/23, 4 October 2026, measured on `fecbdcc`; cited here as **RA** with its section). The defect inventory:
  `docs/review-inputs/research/44-physiology-compromise-audit.md` (cited as **audit**, with its row id). The coupling
  triage: the project's research/26 (cited as **triage**, with its row). Numbers RA measured on `fecbdcc` are a month
  old; piece H0 re-measures every one of them on the day's main before any piece moves them.
- The rulings this plan applies:
  - **Mechanisms first; sources set the numbers** (owner, 7 November): a band is never moved to meet the engine, only
    corrected to what its own source states; re-recording only for self-referential rows, with the cause attributed
    commit by commit and a control.
  - **A23** (4 October): a resting (tonic) sympathetic share that anaesthetics remove; built as FU-8 B4
    (`TONIC_*`, `l2/circ/profile.ts:97–100`).
  - **The three FU-12 answers** (4 October, evening; `research/00`, "Ali answers to the three FU-12 gating
    questions"): (1) no fixed time at the perfusion floor; criteria by **cause**, each a graded literature range, the
    time emerging from the mechanism, flow-dependent outputs visibly failing meanwhile; (2) a survived deep nadir
    leaves a **residue**, graded with depth × time; (3) the sympathoinhibitory collapse is **not deterministic**: a
    graded event whose occurrence and severity depend on the patient, seeded at literature base rates, with an
    instructor override to force or suppress it; outcome from a transient bradycardia that recovers with volume to
    asystole.
  - **N1 = C** (10 November, 23:06): Freeman & LeWinter's resting pericardial pressure (1.1 ± 0.9 mmHg) is adopted
    inside this stage, where the resting circulation is re-examined **once**; every moved baseline re-recorded with
    that cause.
  - **N8** (10 November, 23:10): the t17b band stays derived (Mutschler class III shifted by Havens 2012) while a
    measured statistic is sought; the miss stays amber, attributed to the hub.
  - **Row 7 of research/48:** PR #162 (chemoreflex efferent) and PR #188 (cerebral dilator reserve) are folded into
    this stage and closed as superseded; the T-01 marks of #352 and the t17b miss are carried here.
- The plans this one stands on: `docs/plans/mechanism-tree.md` (the coupling registry, its ABSENT rows and the label
  rule: every node a piece adds needs a row in `apps/demo/src/app/mechanisms/labels.ts`, and
  `scripts/mechanism-labels.ts` regenerates `docs/plans/mechanism-tree-labels.md`). House style:
  `docs/plans/pump-rack-tci.md` and `docs/plans/scenario-builder.md`.
- **How statements are marked.** A sentence with a citation states what that source states. **(inf.)** marks my
  inference: a design choice or a reading that no source states in those words. **[PH]** marks a placeholder number:
  it may be written into code only with that tag, a named experiment that would source it, and a test that records
  it, never as a band.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan piece by piece. Each piece is ONE pull request with its own gate;
> never two pieces in one PR. Tests first in every code piece: the failing test (or the `it.fails` with its source
> band and the measured number) is committed before the code. Every engine piece carries the `run-validation` label
> from its first push.

---

## 1. Intent

The owner, 10 November: "I have a feeling that the lack of a true autonomic system is really affecting us
everywhere." The body has one autonomic outflow: a sympathetic outflow to the sinus node, the myocardium, the
arterioles bed by bed, the veins and the adrenal medulla, and a vagal outflow to the sinus and AV nodes. Every reflex
is an input to it, and every anaesthetic, opioid, block and vasoactive drug acts on it or on its effectors. The
engine has four parallel gain paths instead (§3), and each new reflex would be a fifth. What a resident sees today,
and what he will see when the hub is built:

| Situation | What the resident sees today | What he should see (source) |
|---|---|---|
| **Haemorrhage, classes I–IV** | An awake 50 % bleed settles: HR 149 → 88 and MAP 59.6 → 62.6 while lactate reaches 7.6, because the baroreflex set point resets 95 → 60 mmHg (RA §5.1 F1). No bradycardic phase in any class (F2). 2 L lost in 60 s leaves MAP 51.7, stable (F9). | Compensation by the cardiopulmonary limb first (PP narrows, SBP held; Johnson 1974), then the baroreflex; at ≈ 30 % loss / CO ≈ 60 % of baseline a sympathoinhibitory phase in some patients, MAP and HR falling together (Schadt & Ludbrook 1991; Sander-Jensen 1986; Barriot & Riou 1987, 7 % of pre-hospital shocks); class IV does not recover on its own. Registry HR is modest across classes I–IV (Mutschler 2013: 86 / 90 / 96 / 97). |
| **Induction hypotension** | The propofol fall is graded by the tonic share since B4 (−30 % healthy … −41 % HFrEF), but the hypertensive patient falls only 4.42 points more than the healthy one (≥ 5 wanted), the opioid adds 1.16 × instead of ≈ 1.9 × (Billard 1994), and class III + propofol arrests (nadir 2.7 mmHg) where the expected picture is a nadir of 30–50. | SBP −25 to −40 % at 2–2.5 mg/kg with little HR change (Miller 10e ch. 21 p. 519, Table 21.3); propofol near-abolishes MSNA and resets the baroreflex down (Ebert 1992; Sellgren 1994); the elderly, the hypertensive and the bleeding patient fall further because more of their pressure is sympathetic. |
| **The stimulus surge** (laryngoscopy, incision) | Laryngoscopy ΔMAP +19.1 without opioid (Shribman: 20–30); the hypertensive's surge only 1.19 × the healthy (Prys-Roberts: ≥ 1.3); labetalol barely blunts it (0.96; Inada: 0.2–0.8); a desflurane step never surges. | One sympathetic answer to nociception, scaled by the patient's tone and blunted at the effectors by β- and α-blockade; the desflurane airway surge from its own afferent. |
| **Hypercapnia** | Answered three times (a pressor multiplier in `chemoFactors`, an endocrine sympathetic term, an adrenal drive), the first with the wrong sign (PR #162's finding). | CO2 dilates the arterioles and depresses the myocardium directly (Walley 1990, after propranolol); the net pressure rise in an intact patient is sympathetic, through the central chemoreceptor (Somers 1989: MSNA +17 ± 7 % breathing, +173 ± 47 % in apnoea). |
| **Hypoxia in the paralysed patient** | A ventilated, paralysed adult desaturating to SaO2 79 % gets a 16 % tachycardia (RA §5.10). | Primary chemoreflex bradycardia when ventilation cannot rise; tachycardia only when it can (de Burgh Daly; Miller 10e ch. 13 p. 290: PaO2 < 50 → parasympathetic slowing, persistent hypoxia → sympathetic activation). |
| **A high spinal** | Not expressible: no neuraxial block exists in the circulation (`condition neuraxialBlock` absent; an intrathecal bupivacaine route is refused as not modelled, `l2/pk/pipeline.ts:307`). | Blockade of the peripheral (T1–L2) and cardiac (T1–T4) sympathetic fibres and of adrenal secretion; venous pooling; SVR −15 to −18 % in the healthy normovolaemic, ≈ −25 % in the elderly cardiac patient; bradycardia, and at T1 severe bradycardia or asystole from unopposed vagal tone (Miller 10e ch. 41 p. 1272); bradycardia ≈ 13 %, hypotension ≈ 33 % (Carpenter 1992); arrest 6.4 ± 1.2 per 10,000 spinals (Auroy 1997). |
| **A vagal event** (oculocardiac, peritoneal traction, the second suxamethonium) | The heart cannot go below 30/min (`l2/circ/model.ts:395`), every vagal event *raises* the pressure (peritoneal traction MAP 84.6 → 89.7; RA §5.10), and no vagal event can stop the heart. | A vagal efferent that can reach sinus arrest, with a vasodepressor limb that an antimuscarinic does not remove (Barriot & Riou 1987: atropine raised the rate, not the pressure); oculocardiac HR fall > 20 %, larger with hypercapnia and light anaesthesia (Meuwly 2015/2017). |

The single teaching point the hub must carry, stated by RA §2.3 from Barriot & Riou and Cooke 2004: **in sudden
severe hypovolaemia, bradycardia means volume and position, not atropine alone; atropine raises the rate but does
not reliably restore the pressure, because the vasodilator component is sympathetic withdrawal.**

## 2. Goals, non-goals, anti-goals

Goals
- **One efferent state** (§4.1): sympathetic outflow to the sinus node, contractility, resistance by region and venous
  capacitance, and to the adrenal medulla; vagal outflow to the sinus and AV nodes. Each with a tonic level that
  anaesthesia, block and drugs can remove.
- **Every reflex an afferent** (§4.2): arterial and cardiopulmonary baroreceptors, peripheral and central
  chemoreceptors, the cardiac reflexes (the sympathoinhibitory reflex of low preload, oculocardiac and trigeminal,
  visceral, carotid sinus, lung inflation), brainstem ischaemia and intracranial pressure (Cushing), pain and the
  surgical stimulus; the humoral arm as a slower path driven by the same outflow.
- **Modulation in one place** (§4.3): anaesthetics, opioids, ketamine, dexmedetomidine and neuraxial block act on the
  central integration or on the preganglionic outflow; β-blockers, antimuscarinics and vasoactive drugs act at the
  effectors; reflex answers to a drug are emergent.
- **Bounded acute resetting, saturation from the curve, sourced time constants** (§4.4, §4.5).
- **A vagal route to sinus arrest** and a rate floor that no longer hides it (§4.6).
- **The resting circulation re-calibrated once** (N1 = C, §4.7), before any hub piece measures against it.
- **The hand-offs** (§5): renal sympathetic tone and renin, the splanchnic bed and lactate (audit item 7), the
  cerebral reserve of #188, cutaneous thermoregulatory vasomotion, and what the pulsus plan needs (research/54 E7).
- **The expected-failure marks and validation rows it resolves**, each named with file and line (§6), removed only
  when the mechanism meets the source's band.

Non-goals
- **A humoral hub with concentrations** (vasopressin, renin–angiotensin–aldosterone as secreted and cleared
  hormones, ANP): v2.0 workstream 3 in `docs/roadmap/v2.0/README.md`. This plan routes the existing humoral arm
  (`HUM_*`) and the renal angiotensin state (`l2/renal/kidney.ts:88–95`) from the hub's outflow so a later humoral hub
  has one input; it does not model the hormones (AQ6).
- **Emergent arrest and the perfusion floor's substrate** (audit item 3, workstream 4). This stage writes the
  floor's acceptance cells by cause and records them (owner answer 1), and it makes the reflex route to bradyasystole
  possible (H4); the myocardial and cerebral energy balance that makes the time at the floor emerge is the arrest
  stage's (AQ11).
- **A regional circulation** with separate splanchnic, renal, muscle and skin beds in the circuit: the hub outputs a
  sympathetic level per region from H2 on, and the regional circuit is its own piece (H11c, a stage in itself; AQ7).
- Valsalva as a feature, the diving reflex, the CO2 pneumoperitoneum's sustained haemodynamics (Joris 1993), respiratory
  sinus arrhythmia beyond its amplitude: each is one afferent once the hub exists, and each is listed in §7.3 as a
  later piece, not built here.
- Pain as a mechanism: the nociceptive input stays `noxious × (1 − antinoc)` (`l2/neuro/depth.ts:118–121`).

Anti-goals (a piece that does one of these is rejected)
- **A fourth multiplier at `model.ts`.** No effector may read a reflex directly once H2 lands; every reflex reaches an
  effector through the efferent state.
- **A gain chosen to pass a band.** A hub constant enters code with its source, or as **[PH]** with its experiment
  and a recorded (not asserted) test. A band is never moved toward the engine; a band corrected to its own source is
  allowed and is its own commit with the source beside it.
- **A deterministic collapse.** The sympathoinhibitory event is a seeded hazard with an instructor override (owner
  answer 3), never a threshold that fires every time.
- **An atropine that cures the vasodepressor limb.** An antimuscarinic acts on the vagal effector only.
- **A re-record without a cause.** Every moved baseline is attributed to its piece's named mechanism by a control
  run with that mechanism switched off (§8).
- **Coupling the tonic level to arrest or perfusion** (RA §6.3 rec. 4): `tonic` stays a profile property; brainstem
  perfusion acts through the gate (`brainstemOutF`), as now.

## 3. What exists today, path by path (73eb6590)

The control step runs at 10 Hz (`CTL_DT = 0.1`, `l2/circ/model.ts:23`); the endocrine model at 1 Hz. The pass order is
pk → neuro → resp → blood → endo (writes `circ.ext.endo*`) → organs (writes `circ.ext.rSysF`, `cbfRel`) →
haemodynamics (`l2/engine.ts:804–864`). Unless a constant is marked otherwise, its tag is
`[FIT: <target>; brief research/44 L2-xx]`: fitted to a scenario, not sourced.

### 3.1 Path 1: the arterial and cardiopulmonary baroreflex (`l2/circ/baroreflex.ts`)

- **Form:** error e = MAP_set − sensed MAP, sensed = MAP + `K_PP`·(PP − PP_rest) (Chapleau & Abboud 1987 direction,
  `K_PP 0.3` FIT). Vagal limb: delay 0.3 s, LPF 1 s → RR increment. Sympathetic limb: delay 2.5 s, LPF 10 s, linear
  gain × error, each factor saturating at ±`SYMP_SAT 0.6`. Header constants sourced to "B §4.9" only.
- **Gains (all FIT L2-03):** `G_HS 0.04`/mmHg HR (twice the cited 0.01–0.02), `G_R 0.02` SVR, `G_C 0.008`
  contractility, `G_V 20` mL/mmHg venous V0 (B §4.9 10–20, upper end), `G_CSV 0.004` compliance; asymmetry by
  multipliers (`SYMP_WITHDRAW 0.3`, `SYMP_WITHDRAW_HR 0.1`, `VAGAL_STEADY 0.2`, whose comment says ×0.4); caps
  `VAGAL_MAX_MS 600` (no source), `VAGAL_WITHDRAW_MS 200`.
- **Resetting:** `RESET_FRAC 0.05 / RESET_HOLD_S 420 / RESET_GAIN 0.35`, unbounded (Pulse N-P16), skipped only when
  the instructor pins the set point (`baroreflex.ts:150–156`). This is the mechanism behind DEV-05.
- **Cardiopulmonary limb:** transmural RA pressure, τ 3 s, `G_CP_R 0.06`, `G_CP_V 200` mL/mmHg, clamp ±10 mmHg; SVR
  and venous volume only, **no rate arm**; one shared recruitment cap `V0_RECRUIT_MAX_ML_KG 12` (Guyton; Magder,
  without a page).
- **Tonic share (B4, A23):** `TONIC_ADULT 0.2 / ELDERLY 0.3 / HTN 0.1 / HFREF 0.25` (`profile.ts:97–100`, MSNA
  direction from Sundlöf & Wallin 1978 and Grassi 1998; sizes the owner's), `TONIC_EES_SHARE 0.5` (FIT). Venous and
  compliance effectors carry no tonic share (`baroreflex.ts:115–116`). `profile.ts:58–63` already says a
  `tonicVagal` twin "is expected from a planned autonomic hub".
- **Gates:** `outF` (the drug bus's `symp`) and `brainF = brainstemOutF(cbfRel)` (`CBF_REFLEX_FULL 0.6`,
  `_ZERO 0.2`; Astrup 1981 [P], FIT L2-12) multiply the delivered output.
- **Profile gains:** `BAND` table (`profile.ts:106–116`): `gv` 4/7/12/17/15/6.5 ms/mmHg, `gs` 0.7/0.8/1/1/1/0.6 for
  neonate → elderly ("tables §1.1"). Both arms fall together with age, against the source (RA §2.1: the MSNA arm is
  relatively preserved while the cardiac arm falls). `prof.mapSet` (`profile.ts:152/186/199`) has **no runtime
  reader**: the set point starts at the stabilised MAP (`model.ts:213`).
- **Writes:** `p.rSys` (`model.ts:338`), `skinTone` (`:339`), `p.v0Sv` through one shared recruit with the humoral
  arm (`:357–359`), `p.cSv` (`:360`), `kLv`/`kRv` (`:374`, `:381`), RR → `hrModel` (`:394–395`).
- **Read by:** the rate rule (`rate-rule.ts:43–47`, AF ventricular modulation `AV_GAIN 0.25`), the pleth's perfusion
  index (`hemo/pipeline.ts:634–639`), the humoral arm (`baro.set`, raw, `endo/adapters.ts:101`), the escape foci
  (`saF`).

### 3.2 Path 2: the sympathetic stress gains (`l2/endo/`)

- `symp` = min(`SYMP_MAX 3`, noxious·(1 − antinoc) + extraSymp), τ on 25 s / off 180 s (`hormones.ts:73–82`;
  `params.ts:5–6`, "TXT pattern" and "tables"); `surge` on the nociceptive term only.
- `extraSymp` (`core.ts:253`): sepsis 0.3–0.7, anaphylaxis, SIRS, hypermetabolic (FIT L2-59), hypoglycaemia (FIT
  L2-04), MH, central hypercapnia × brainF, and `sympDrive × catReserve` (ketamine 2.2, ephedrine 1.6; FIT X-11/X-12).
- **Effects** (`effects.ts:77–96`): HR × (1 + `G_SYMP_HR 0.18`·symp), SVR × (1 + `G_SYMP_SVR 0.2`·symp; "tables"),
  Ees × (1 + 0.15·symp), venous −3 %/unit, set-point raise `surgeF` ≤ +25 %, and surge noradrenaline/adrenaline as
  drug-equivalent "actives" in the PK rows (`pk/pipeline.ts:97–109`).
- `catReserve` τ down 1,200 s / up 7,200 s, floor 0.2 (FIT L2-02).
- **Delivered** as `ext.endoHrF` (pre-blunted for β-block), `endoSvrF`, `endoEesF`, `endoDV0Frac`, `surgeF`
  (`adapters.ts:182–191`). **Not gated** by `outF` or `brainF`: an anaesthetic removes the baroreflex's output but not
  this path's (except through `antinoc`), and a pulseless brain still delivers it.
- **Read by:** the circulation's control step, the arrest hazard (`arrest.ts:60`, `riskOf.cat`), the PK layer
  (`endoCat`).

### 3.3 Path 3: the humoral arm (`l2/endo/`)

- `hum` = u/(u + `HUM_EC50_MMHG 30`), u = baro.set − MAP − 3; τ on 150 s / off 600 s; SVR × (1 + `HUM_SVR 0.32`·hum),
  venous −`HUM_V0 0.30`·hum of the base unstressed volume (`params.ts:221–242`; direction Schadt & Ludbrook 1991,
  Brabant 1999; all sizes FIT L2-01). `HUM_SVR` was lowered from 0.55 because 0.55 "blunted the owner's tamponade
  collapse away"; `HUM_V0` is "the term that keeps the bleeding patient alive through induction" (audit L2-01).
  Not scaled by `vasoResp` or `outF`; its SVR share is withdrawn over `NO_FLOW_S` of a declared arrest.
- Plasma adrenaline and noradrenaline (Pulse code values; `EPI_ADRENAL_GAIN 3` [TXT]; `NE_SPILL_GAIN 1.5` FIT; adrenal
  drives from hypotension below MAP 65, SaO2 below 0.85, PaCO2 above 50, all thresholds inline, slopes FIT L2-02).
  The noradrenaline readout acts on nothing; adrenaline acts through Hill curves (Clutter 1980 [TXT], FIT L2-02).
- Cortisol (`CORT_*`, tables §5c) sets `vasoResp`, which scales catecholamine efficacy (`combine.ts:133`).
- **A second angiotensin**, unconnected: `l2/renal/kidney.ts:88–95` (RPP ramp, FIT L2-07), acting on the efferent
  arteriole only.

### 3.4 Path 4: the chemoreflex (`l2/lung/`, `l2/neuro/`, `l2/circ/`)

- **Ventilation:** `CO2_SLOPE 1.5`, Weil hypoxic factor `HVR_A 25` (Weil 1970), central/peripheral split
  `CENTRAL_TAU_S 90`, `PERIPH_SHARE 0.3` (Dahan 1990 [TXT]), anaesthetic depression of the hypoxic response
  (`l2/neuro/drive.ts`; Knill & Gelb, Dahan & Teppema).
- **To the circulation, three paths with no shared afferent:**
  1. `chemoFactors` (`l2/circ/model.ts:272–281`): HR × (1 + 1.2·(0.85 − SaO2)) capped 1.3, or × (1 − 2.5·…) floor 0.5
     for neonates/infants or SaO2 < 0.6; hypercapnia HR and SVR × (1 + 0.01/mmHg above 50), cap 0.2. Inline literals
     (FIT L2-04), ungated, fed with SpO2 and EtCO2 + 5 (`hemo/pipeline.ts:427`), not PaO2/PaCO2.
  2. the endocrine central-hypercapnia term → `symp` (`SYMP_HYPERCAPNIA_*`, 45 mmHg, 0.03/mmHg, max 0.3; Somers 1989
     [P direction]);
  3. the adrenal hypoxia and hypercapnia drives (§3.3).
  The overlap is written in the code (`endo/params.ts:81–87`, "KNOWN OVERLAP, owner note").

### 3.5 The side paths that reach the same effectors

| Path | Where | What it does | Status |
|---|---|---|---|
| Cushing | `l2/brain/cushing.ts:17–33`, `organs/effects.ts:18, 42` | MODELED: `rSysF = 1 + CUSH_SVR_GAIN 1.2·drive`; HR left to the baroreflex | FIT L2-12; tables §5.1 |
| Stimulus vagal events | `l2/circ/model.ts:75–77, 285–292`; `engine.ts:1101–1104` | laryngoscopy 300, oculocardiac 600, peritoneal 600 ms, fatigue 120 s; no vasodepressor limb | FIT L2-29; direction Miller |
| Bezold–Jarisch (RV infarct only) | `l2/circ/conditions.ts:53, 74` | `BJ_VAGAL_MS 420`·severity, additive RR, × (1 − muscBlock) | FIT brief 94 (Mark 1983; Dell'Italia 1985) |
| Empty-ventricle BJ (mechanism D10, FU-4) | comment only, `l2/circ/model.ts:78–81` | prototyped as 800 ms × (0.35 − EDV/rest)/0.35 and withdrawn | absent |
| Repeat-suxamethonium bradycardia | `l2/pk/hooks.ts:32–38` | a rhythm request, not a reflex | partly FIT L2-27, partly no source |
| Drug bus | `l2/pk/combine.ts:88–224` | `gv`, `gvHr`, `symp`, `setF`, `vagalMs`, `muscBlock` on the reflex; direct `hr`, `svr`, `ees`, `v0Frac` on effectors | propofol/volatile reflex rows FIT X-11 of sourced endpoints; opioid HR/SVR EC50s FIT X-10 |
| Temperature HR | `l2/thermal/metabolic.ts:49–51` | 0.12/°C above 37.5, 0.07/°C below 35, via `endoHrF`, unblunted | no source comment |
| Hypoxic/ischaemic SA depression | `l2/circ/model.ts:53–66` | `G_SA`, `K_BRADY`, `G_SA_ISCH`, `G_SA_K` | FIT L2-05; pacemaker, not reflex: stays |
| The rate floor | `l2/circ/model.ts:395` | `hrModel = min(hrMax, max(30, 60/rr))` | blocks every reflex bradyasystole (RA §0.2 gap 1) |

### 3.6 What the structure gets wrong, in one list

1. **Four sympathetic paths multiply at the same effectors** (`rSys`, `v0Sv`, `kLv`/`kRv`, RR): the baroreflex, the
   endocrine `endo*F`, `chemoFactors`, Cushing's `rSysF`; the surge catecholamines are a fifth route through the PK rows.
   Nothing can saturate them jointly, and no reflex can inhibit another.
2. **Gating is uneven:** `outF × brainF` gates the baroreflex and the endocrine hypercapnia term only.
3. **Two vagal accumulations and no tonic vagal level:** `b.rrMs` × gVagal, and separately
   `vagalMs + vStim + bjVagalMs` × (1 − muscBlock) (`model.ts:394`). An antimuscarinic raises the resting rate only
   through its direct `hr` row.
4. **No sympathoinhibitory branch** anywhere: lower pressure always means a faster heart (RA §5.7 F19).
5. **Unbounded resetting** erases the error signal (DEV-05).
6. **No neuraxial block, no posture input to the circulation** (`headUpDeg` reaches only the brain,
   `l2/organs/pipeline.ts:316, 347`).
7. **The organs read volume proxies, not the outflow:** hepatic flow constriction is `max(alphaE, (1 − bvRel)/0.3)`
   (`l2/liver/liver.ts:61–66`); lactate's regional supply dependence is a CO/CO0 ramp (`blood/params.ts:82–84`, FIT
   L2-09); the kidney has no sympathetic input at all; cerebral autoregulation has none (correctly, (inf.)).
8. **Small defects to correct on the way:** `VAGAL_STEADY`'s comment (×0.4) against its value (0.2); `prof.mapSet`
   unused; desflurane carries neither `VOLATILE_SYMP` nor `VOLATILE_SETF` (`rows-anaesthetic.ts:209–213`);
   dexmedetomidine's comment names a `symp` row that does not exist (`:136–140`); the chemoreflex reads SpO2 and
   EtCO2 + 5. The coupling registry has no rows for `vagalStim`, `bjVagalMs`, `muscBlock`, `catReserve`, `sympDrive`
   or the renal angiotensin (`couplings/unregistered.ts` lists some of them).

The registry already declares the hub as absent: node `absent.autonomic.sympatheticOutflow` and the rows
`circulation.absent.{baroAfferent, baroToHub, chemoAfferent, chemoToHub, chemoVagal, hubToSaNode, hubToVessels,
hubToHeart, hubToVeins}` (`couplings/circulation.ts:22, 110–118`), `endocrine-thermal.absent.{avp, avpVessels,
avpVeins, renin, angiotensinVessels, adrenalMedulla}` (`couplings/endocrine-thermal.ts:33–38`) and
`organs.absent.brainstemToHub` (`couplings/organs.ts:15`). Each piece below turns named ABSENT rows into live rows.

## 4. The design

```
AFFERENTS (pure functions of truths the engine already has; each owned by the module that has the signal)
  arterial baroreceptors      carotid + aortic: MAP and pulsatility, against a set point with bounded resetting
  cardiopulmonary receptors   transmural RA pressure (atrial), LV filling and contractility (ventricular)
  peripheral chemoreceptors   PaO2 (hyperbolic), PaCO2, pH, after the lung→carotid transit delay
  central chemoreceptors      central PCO2 (the existing pc, tau 90 s)
  pulmonary stretch           VT / VT_rest, breath phase (gates the chemoreflex's cardiac sign)
  brainstem perfusion         cbfRel: excitatory band (CNS ischaemic response), failure below; ICP (Cushing)
  nociception                 noxious x (1 - antinoc); airway irritation (desflurane)
  stimulus sites              trigeminal/ocular, laryngeal, visceral/peritoneal, carotid sinus
  thermal                     core and skin temperature (cutaneous vasomotion)
          |
          v
CENTRAL INTEGRATION (one state object, l2/autonomic/; the only place an outflow can change)
  drive_s = sum of excitatory afferents - sum of inhibitory afferents   (one per sympathetic target)
  drive_v = sum of vagal-excitatory afferents - baroreceptor unloading
  sympathoinhibitory state R (0..1, seeded hazard; H9) subtracts from drive_s and adds to drive_v
  activity = logistic(drive) around the tonic operating point          (saturation from the curve, not a clamp)
  x central modulators (anaesthetic, opioid, alpha2, ketamine)  x brainstem gate brainF
  x preganglionic block by segment (neuraxial level)
          |
          v
EFFERENT STATE  E = { sCard, sVaso[splanchnic, renal, muscle+skin, other], sVen, sAdr, vSA, vAV }
          |
          v
EFFECTORS (interfaces unchanged where they exist; receptor drugs act here)
  sinus node    rate from sCard (beta1, x beta-block) and vSA (muscarinic, x antimuscarinic); may reach arrest
  AV node       conduction from vAV and sCard                                           (new, H3)
  ventricles    Ees from sCard                                                          (kLv, kRv)
  arterioles    SVR from sVaso, weighted by bed until the regional circuit exists       (rSys; H11c)
  veins         unstressed volume and compliance from sVen                              (v0Sv, cSv)
  adrenal       adrenaline secretion from sAdr; noradrenaline spillover from sVaso      (endo; H6)
  kidney        afferent tone and renin from sVaso[renal]                               (H11b)
  skin          cutaneous tone from sVaso[muscle+skin] and the thermal afferent        (skinTone, H11d)
  ECG           RSA amplitude from vSA                                                  (Modifiers.rsa, H3)
```

### 4.1 The efferent state

Units: each component is an activity relative to the resting awake supine adult, 1 = rest (inf.: a normalised
activity keeps the effector interfaces unchanged and makes the tonic share explicit, as B4's
`1 − τ(1 − o) + o·reflex` already does). The effector reads `1 − share·(1 − a)` around the tonic share it owns, so
a = 0 (total sympathectomy) removes exactly the sourced tonic share, and a > 1 adds reflex activation.

| Component | Targets | Tonic share at rest (source or [PH]) | Why separate |
|---|---|---|---|
| `sCard` | SA rate (β1), Ees both ventricles, AV conduction | HR: from the intrinsic rate after combined blockade, [PH] until a source is read (RA §0.3: hexamethonium is not in the library; the human intrinsic-rate literature is in "papers wanted"); Ees: `TONIC_EES_SHARE 0.5` as now, FIT, carried | the T1–T4 cardioaccelerator fibres are blocked separately from the vasomotor outflow (Miller 10e ch. 41 p. 1272) |
| `sVaso[bed]` | arteriolar resistance per bed | `TONIC_*` 0.2 / 0.3 / +0.1 / +0.25 (A23; owner sizes) as the total; the split by bed [PH] (AQ7) | the cardiopulmonary limb constricts forearm and splanchnic beds (Johnson 1974); renal and splanchnic nerves drive the kidney and the lactate path (audit L2-08, L2-09); a neuraxial level blocks beds by segment |
| `sVen` | venous unstressed volume and compliance (splanchnic capacitance) | today none; the venodilation of a sympathectomy predominates over the arteriolar one "owing to the limited amount of smooth muscle in venules" (Miller 10e ch. 41 p. 1272), so a venous tonic share is required, size [PH] (Greenway; Magder; Maas 2012 stressed volume 1,265 mL in "papers wanted") | the venous term is where sympathectomy and the vasodepressor limb do most damage (RA §6.3 rec. 3) |
| `sAdr` | adrenal medulla adrenaline | `EPI_BASAL_PG_ML 34` at rest (Pulse [code]); the adrenal drive becomes sAdr | neuraxial block removes adrenal secretion (Miller p. 1272); hypoglycaemia drives it more than vasomotor outflow (inf.) |
| `vSA` | SA node vagal lengthening of RR | new `tonicVagal` by age from the resting HR and the intrinsic HR (Kardos 2001 for the BRS slope with age; the resting tonic level itself [PH]) | atropine must raise the resting rate through a tonic level (RA R-20) |
| `vAV` | AV conduction | [PH]; until sourced it equals vSA (inf.) | high vagal tone gives AV block and AV dissociation (RA §2.8, insufflation) |

### 4.2 The afferents

| Afferent | Signal (existing truth) | Acts on | Form, time course (source) | Today | Sizing experiment if [PH] |
|---|---|---|---|---|---|
| Arterial baroreceptor | beat MAP + pulsatility (`K_PP`) | drive_s (−), drive_v (+), per target | sigmoid; threshold ≈ 50–60, saturation ≈ 160–180 mmHg, maximal gain at the operating point [T] (RA §2.1); the reflex "loses its functional capacity" below MAP 50 (Miller 10e ch. 13 p. 290, Fig. 13.20); vagal latency < 1 s, sympathetic 2–5 s, τ several to tens of s [T/H]; Eckberg 1976 onset 0.24 s (triage row 30); per-effector gains and delays from Ursino 1998 (not read: papers wanted) | linear-saturating, FIT | the modified-Oxford pressor test (R-09) and the depressor test, cardiac BRS 15–20 ms/mmHg young, ≈ 7 at 70 y (Kardos 2001; Laitinen 1998 15.0 ± 1.2 men, 10.2 ± 1.1 women) |
| Cardiopulmonary, atrial | transmural RA pressure (`cpLp`) | drive_s to sVaso and sVen (−), small rate arm, AVP drive | low-level LBNP −10 to −20 mmHg raises forearm and splanchnic resistance 20–40 % with no HR or MAP change (Johnson 1974) [H]; rate arm small and disputed (Crystal & Salem 2012 [D]; Miller 10e ch. 13 p. 290: depends on the starting rate) | vasomotor only, FIT | R-15 Bainbridge cell, low confidence |
| Ventricular (the "empty vigorously contracting ventricle") | LVEDV / rest, `kLv` | the sympathoinhibitory hazard R (H9) | one afferent among several, modest weight: transplant recipients faint (Fitzpatrick 1993, 7/10), the ventricle is not empty before syncope (Liu 2000); Hainsworth 1991 [D] | absent (D10 withdrawn) | R-04/R-05 base rates |
| Peripheral chemoreceptor | PaO2, PaCO2, pH (`rs.o2.pao2`, `rs.co2.pf`) after a transit delay (reuse `l2/gas/delay.ts`) | drive_s (+), drive_v (+ when ventilation cannot rise), ventilation (exists) | primary bradycardia with vasoconstriction at constant ventilation, tachycardia when ventilation rises (de Burgh Daly; Daly 1997 [A/T]); significant below SaO2 ≈ 90 % / PaO2 ≈ 60 [T]; ventilation settles 18–23 s after alveolar PO2 (Weil 1970; triage row 40); MSNA +17 ± 7 % breathing, +173 ± 47 % apnoeic (Somers 1989 [H]) | `chemoFactors`, wrong inputs, age switch | a "bpm per % SaO2" human figure was not found (RA §2.5 [UNCONFIRMED]); R-11 by sign only until then |
| Central chemoreceptor | central PCO2 `pc` (τ 90 s, `l2/neuro/spont.ts:145`) | drive_s (+) | hypercapnic pressor response roughly linear above PaCO2 ≈ 50 [T]; Somers 1989 | endocrine term + `chemoFactors` + adrenal: three paths | — |
| Pulmonary stretch | VT / VT_rest, breath phase | drive_v (− for moderate inflation, + for very large) | moderate inflation → vagal withdrawal → tachycardia (Anrep 1936; Daly [A]); weak in the awake adult (Hering–Breuer threshold above a normal VT [T/H]) | absent | the chemoreflex sign cell R-11 is its test |
| Brainstem perfusion | `cbfRel` | drive_s (+) in the band 0.6 → 0.3 (CNS ischaemic response), gate to 0 below 0.2 | insignificant above MAP 60, maximal at MAP 15–20 (Guyton [A/T], RA §2.6); the failure ramp stays as `brainstemOutF` | failure ramp only | Guyton 1948 is unverified (papers wanted); size [PH] |
| Intracranial pressure | Cushing drive (`brain/cushing.ts`) | drive_s (+); the bradycardia from the baroreflex | CPP < 40 mmHg for > 30 s → MAP +30–50, HR −20–40 % (tables §5.1 [TXT shape]); Miller 10e ch. 13 p. 291 | `rSysF` multiplier, FIT | — |
| Nociception | `noxious × (1 − antinoc)` | drive_s (+), all targets | incision MAP and HR +10–25 % in 30–60 s (Sato & Schmidt 1973 [A]; Sellgren 1994 MSNA surge [H]); laryngoscopy MAP +20–25, HR +20 adult, peak ≈ 1 min, settling ≈ 5 min (Shribman 1987) | endocrine `symp`, FIT | — |
| Airway irritation | end-tidal desflurane step | drive_s (+) | tables §6.3: HR +20–30 % for 2–4 min after a step | never fires (DI-70) | — |
| Stimulus sites | `stimulus` events (ocular, laryngeal, peritoneal; carotid sinus new) | drive_v (+), drive_s (−) for the vasodepressor share | oculocardiac HR fall > 20 % (Meuwly 2015/2017), potentiated by hypercapnia, hypoxia and light anaesthesia, fatigues on sustained traction; infant laryngoscopy bradycardia [T]; carotid sinus bradycardia + vasodepression [T] | additive RR, no vasodepressor limb | — |
| Thermal | core and mean skin temperature | sVaso[skin] | — (H11d sources it; the cutaneous share is "not modelled", `circ/model.ts:126–132`) | absent | — |

### 4.3 How drugs and blocks act on it

| Agent | Where it acts | Source | Today |
|---|---|---|---|
| Propofol | central: drive_s × (1 − E), set point down; a smaller direct vasodilation and myocardial term stays at the effectors | MSNA near-abolished at induction, dose-dependent, baroreflex reset down (Ebert 1992; Sellgren 1994; Robinson 1997); "a vasodilator due to a reduction in sympathetic activity", decreases cardiac parasympathetic tone dose-dependently (Miller 10e ch. 21 p. 519) | `PROPOFOL_SYMP`, `_SETF` (FIT X-11 of sourced endpoints) **plus** direct `svr −0.45`, `ees −0.2` at EC50 3.5: the split between them is the open question (AQ8) |
| Volatiles | central (drive_s, the HR arm of the baroreflex) | Kotrly 1984 (isoflurane pressor baroslope falls at 1.0 and 1.5 MAC); Muzi & Ebert 1995 (desflurane, isoflurane); Ebert, Muzi & Lopatka 1995 (sevoflurane 0.41–1.24 MAC: MAP falls, HR unchanged, lower MSNA); Miller 10e ch. 13 p. 290 (halothane inhibits the HR component) | `VOLATILE_GVHR`, `_SYMP`, `_SETF`; desflurane carries none |
| Opioids | central vagotonia (vSA +); attenuation of the nociceptive afferent (exists, `antinoc`) | M10 ch. 22, Reitan 1978 (audit X-10) | direct `hr −0.25`, `svr −0.15` EC50s (FIT X-10) plus `*_VAGAL` 420 ms |
| Ketamine | central sympathetic excitation (drive_s +) and a direct myocardial depression at the effector | Miller ch. 21 (to be paged by H8) | `sympDrive 2.2` (FIT X-11) |
| Dexmedetomidine | central α2 sympatholysis (drive_s −) and the peripheral α2B early vasoconstriction at the effector | DI-60, T6.3 | no `symp` row; α2B arm missing (`interactions-misc.test.ts:168`) |
| Neuraxial block | removes the preganglionic outflow of the blocked segments: sVaso and sVen of beds below the level, sCard when the level reaches T1–T4, sAdr; sympathectomy extends 2–6 dermatomes above the sensory level with spinal, at the same level with epidural | Miller 10e ch. 41 p. 1272 | not expressible |
| β-blockers | effector: β1 occupancy at the SA node, AV node and myocardium; β2 at vessels | as now (FIT X-12, low priority) | `betaBlock*`, `betaBlunt` |
| Antimuscarinics | effector: vSA and vAV × (1 − occupancy); the vasodepressor limb untouched | Barriot & Riou 1987 | `muscBlock` (two places) |
| Direct vasopressors and inotropes | effectors only; the reflex answer emerges | Miller; tables §1 | as now |
| Ephedrine (indirect) | releases neural noradrenaline from the terminal store the outflow uses; tachyphylaxis as the store empties | tables (tachyphylaxis 0.7² row) | `sympDrive 1.6 × catReserve` (FIT); tachyphylaxis miss `pk-acceptance-pd.test.ts:128` |

### 4.4 Resetting and saturation

- **Saturation** comes from the logistic's bounds per efferent (Kent 1972 four-parameter form; Ursino 1998), so the
  activation/withdrawal asymmetry of today's multipliers emerges from where the operating point sits on the curve
  (audit L2-03). `SYMP_WITHDRAW`, `SYMP_WITHDRAW_HR`, `VAGAL_STEADY` and the out-of-range `G_HS` are deleted in H5.
- **Acute resetting** re-centres the curve toward the prevailing pressure within minutes while keeping its gain, and
  does not abolish the error (Chapleau; Krieger [A], RA §2.1; the original papers are unverified in RA and in "papers
  wanted"). **Chronic** resetting takes days to weeks (hypertension) [T] and is the profile's set point (HTN
  `mapSet` +20, read at last by H5, since `prof.mapSet` has no reader today).
- **The bound:** RA proposed ±15 mmHg of acute excursion from the profile set point and suspension while a distress
  index is non-zero; neither number is in a source RA read (RA §6.1 says "e.g."). **[PH]**, AQ5. The experiment
  that would source it: a human sustained-hypotension or LBNP study reporting the baroreflex curve's midpoint shift
  over 10–60 min (Chapleau/Krieger/Munch, papers wanted).

### 4.5 Time constants

| Limb | Value | Source | Status |
|---|---|---|---|
| Vagal efferent | delay 0.3 s, τ 1 s | onset 0.24 s (Eckberg 1976; triage row 30); "within one cardiac cycle" [T/H] (RA §2.1); peak 2.1 s young, 3.8 s older (Fisher; triage row 30) | sourced range; age dependence of the lag [PH] |
| Sympathetic efferent | delay 2.5 s, τ 10 s | latency ≈ 2–5 s, τ several to tens of s [T/H]; Valsalva late phase II latency ≈ 5–7 s (Sandroni 1991) | sourced range |
| Cardiopulmonary afferent | τ 3 s | — | [PH] (FIT today) |
| Peripheral chemoreceptor | lung→carotid transit + τ | ventilation settles 18–23 s after alveolar PO2 (Weil 1970) | transit from the engine's own circulation delay (inf.); τ [PH] |
| Central chemoreceptor | τ 90 s | Dahan 1990 [TXT] | as now |
| Nociceptive sympathetic | on 25 s, off 180 s | laryngoscopy peak ≈ 1 min, settles ≈ 5 min (Shribman 1987; RA §2.8) | the existing τ, re-checked against Shribman by H6 |
| Sympathoinhibitory event | onset seconds to tens of s; reversal ≤ 60 s on volume | HR falls 30–60 bpm over ≈ 10–60 s (Cooke 2004; Sander-Jensen 1988); all reversed with fluid (Barriot & Riou 1987) | sourced range; RA's τ on 5 s / off 30 s are a proposal [PH] |
| Humoral (AVP/AngII) | on 150 s, off 600 s | direction Schadt & Ludbrook 1991 | FIT, carried until the humoral hub |
| Adrenaline | t½ ≈ 2 min | tables §5c (audit L2-59: D) | as now |
| Acute resetting | minutes | [A], RA §2.1 | [PH] |
| Catecholamine store | down 1,200 s, up 7,200 s | — | FIT L2-02; H6 re-sources it as the terminal store (Esler spillover, papers wanted) |

### 4.6 The rate floor and the vagal route to sinus arrest

The floor `max(30, 60/rr)` (`model.ts:395`) is replaced by a vagal route: when the vagal RR lengthening exceeds the
sinus cycle the SA node pauses, and the existing escape foci (through `saF`) and the arrest machinery decide what
follows (RA §6.1, "the rate floor"). Reflex bradycardia to 30–40/min and asystole are what the sources describe
(Caplan 1988; Auroy 1997; Miller 10e ch. 41 p. 1272: "severe bradycardia and even asystole because of unopposed
parasympathetic activity"). The floor is load-bearing for `arrest.ts`, `rate-rule.ts`, the escape foci and the rhythm
engine's rate validation (RA §6.4 risk table), so it is its own piece (H4), after the vagal efferent (H3) and before
any piece that can produce a deep vagal drive.

### 4.7 The resting pericardium and the one re-calibration (N1 = C)

Brief 94 built Freeman & LeWinter's resting pericardial pressure (1.1 mmHg; λ fitted 0.012) and measured resting CO
−7 % for every patient and 10 CI jobs red with no t15 gain, and withdrew it (`research/00`, 8 November 11:15). The
owner ruled it in here because this stage re-examines the resting circulation anyway. H1 does it **once, first**:
the resting pericardial pressure, and with it the settled resting stroke volume as the pleth's reference SV₀ (the
withdrawn sinus-75/pleth re-record: SV₀ 79.1 mL is not the settled 88.9 mL; known-deviations, "Waveform
regression"), so that every later hub piece measures against the final resting state and no resting baseline moves
twice (inf.: the two belong together because both change what "rest" is). The pulsus plan's `v0Peri` change
(research/54 E4) is **not** taken here; H1 changes the resting pressure only.

## 5. What the hub hands to other organs, and what stays out

| Hand-off | What the hub provides | Who builds the consumer | What it removes |
|---|---|---|---|
| **Kidney** | `sVaso[renal]` → afferent arteriolar tone and renin release (β1); the renal angiotensin state reads the outflow instead of its own RPP/EABV ramp | H11b | audit L2-07 (one RAAS input), L2-08 (PEEP and α-agonists act through named structures); `EABV_EXP` once the RAAS is one |
| **Regional flow and lactate** (audit item 7) | `sVaso[splanchnic]` and the bed weights | H11c (a stage: the parallel systemic beds) | L2-09's CO ratio ramp 0.88 → 0.55 and hepatic flow (CO/CO0)² |
| **Cerebral reserve** (#188) | the brainstem afferent reads `cbfRel` after #188's finite dilator reserve | H2b (folds #188) | the "CO2 holds flow up at MAP 43" artefact that moves the haemorrhage card's collapse (PR #188 body) |
| **Thermoregulatory vasomotion** | `sVaso[skin]` from the thermal afferent | H11d | the "not modelled" cutaneous share (`circ/model.ts:126–132`); `tempHrF`'s unsourced slopes are re-examined there |
| **Respiratory drive from distress** (research/54 E7) | the baro- and chemoreceptor afferents as inputs to the respiratory controller | after H7, in the pulsus stage | the quiet 16 × 530 mL breathing of the tamponade patient (research/54 §0) |
| **Heart rate variability** | `vSA` → `Modifiers.rsa` × (1 − muscarinic occupancy), ÷ breathing frequency | H3 | RSA as a decoration (RA §5.11) |

**What the hub must leave ready for pulsus (E122/research/54):** (1) the afferents as pure functions with named
outputs, so the respiratory controller can read baroreceptor unloading and the chemoreceptor signal without a new
seam (E7); (2) the cardiopulmonary afferent reading **transmural** RA pressure on the same pleural pressure the pulsus
plan's E1 will compute, so the reflex sees the respiratory swing it should; (3) the resting pericardial pressure of
H1, on which research/54's P0 bench is then measured; (4) no hub constant fitted on the tamponade card (the HUM_SVR
history is the warning).

**What stays out:** hormones as concentrations (non-goal); coagulation and inflammation; the arrest substrate; the
diving reflex and Valsalva as features; pain physiology beyond its input; a human motor and posture model beyond a
head-up angle for the circulation (H9 adds the input, AQ12).

## 6. Acceptance: clinical behaviours, their source bands, and today's value

The band column is the source's own statement; the rig matches the source's condition (brief 93's rule). "Today" is
the number on main as recorded in the test title, the known-misses page or the validation report; RA numbers are on
`fecbdcc` and are re-measured by H0. A row a piece owns is written as an `it.fails` (or `expectedMiss`) with its band
and measured number in H0 or in that piece's first commit, and the mark comes off only when the mechanism meets it.

### 6.1 Haemorrhage

| # | Behaviour (rig) | Source band, as the source states it | Today | Piece |
|---|---|---|---|---|
| A1 | Class II, 25 % over 10 min, awake, breathing: HR (`circ-sanity-1.test.ts:60`) | test band HR 100–125 (ATLS 2008 table) | **95.4**, `it.fails`, T-01 | see AQ3: the gate uses Mutschler 2013 II 89.8 ± 20.3, which 95.4 meets |
| A2 | s2 class II gate rows (`sanity-docs.ts:93`) | Mutschler 2013 Table 2 HR II 89.8 ± 20.3; SBP 0.9–1.05 × base; PP < 0.9 × base | green after #347 (the committed `report.md` predates the band move and is stale) | must stay green from H1 on |
| A3 | s4 class III / IV, t17a (`sanity-docs.ts:108–117, 221`) | Mutschler III 95.9 ± 22.5, IV 97.2 ± 32.4; SBP < 100 (III), < 90 and PP < 25 (IV) | green after #347 | must stay green |
| A4 | t17b β-blocked class III HR (`sanity-docs.ts:226`) | derived 67.4–112.4 (Mutschler III − Havens 6 bpm; N8) | **64.4**, amber | H5, H6 |
| A5 | β-blocked 35 %, awake, breathing (`circ-sanity-1.test.ts:121`) | test band HR 75–95 (tables §7 17b; prototype 79) | **66.3**, `it.fails`, T-01 | H5, H6; AQ3 |
| A6 | t17-bb-contrast (`sanity-docs.ts:320–340`) | HR-response ratio < 0.6 (Bjurstedt 1977: 48 %); SBP ratio < 1; CO ratio < 1 | 0.19 green; SBP **1.063** and CO **1.033**, mark F | H5, H6 |
| A7 | R-01: 30 % over 10 min, awake, at 40 min | HR and SBP inside Mutschler III, PP narrowed, set point within the acute bound of the profile value | not run on today's main (RA: 103 → 84 HR, set point ~88 on fecbdcc) | H5 |
| A8 | R-02: 50 % over 10 min, awake, at 40 min | MAP < 55 and flat or falling, not recovering; lactate > 4 (ATLS class IV; Schadt & Ludbrook phase 2) | RA: MAP 59.6 → **62.6** recovering, set point 60.5 (DEV-05) | H5 |
| A9 | R-03: 2 L (41 %) in 60 s, awake | peri-arrest: MAP < 40, or a sympathoinhibitory event, or progression (Barcroft 1944 [UNCONFIRMED]; RA F9) | RA: MAP **51.7**, stable | H5, H9 |
| A10 | R-04: progressive central hypovolaemia, susceptible patient | abrupt: MAP ≈ −40 mmHg and HR ≈ −30/min within 30 s at ≈ 30 % loss / CO ≈ 60 %; reversing within 60 s of volume (Schadt & Ludbrook 1991; Sander-Jensen 1986: 94 → 50, 90 → 57; Barriot & Riou 1987) | **no route** | H9 |
| A11 | R-05: base rate over seeds | relative bradycardia in 7 % (Barriot & Riou) to 28.9 % (Demetriades 1998) of hypotensive patients | 0 % | H9; AQ2 |
| A12 | R-06: atropine during the event | the rate rises, MAP does not normalise (Barriot & Riou 1987; Kinsella & Tuckey 2001) | — | H9 |
| A13 | Class III then RL 2 L: urine (`blood-fluid-kinetics.test.ts:76`) | ≥ 0.5 mL/kg/h at 30–60 min | 0.33 | H11b (inf.: renal sympathetic tone) |
| A14 | Class IV BE (`blood-massive-transfusion.test.ts:31`) | BE ≤ −10 (ATLS class IV) | −0.2 | H11c (regional supply dependence) |
| A15 | S6b 30 % haemorrhage, propofol Ce (`l2/pk/flow-distribution.test.ts:49`) | peak Ce ≥ 1.3 × healthy | 1.29 | H11c (flow distribution) |
| A16 | LVAD, 1.5 L bleed (`circ-lvad-filling.test.ts:61`) | pump flow ≤ 3.0 and a suction event (research/20 DV-17) | 3.68 | H5 (inf.: the venous capacitance term) |
| A17 | Exsanguination, CPR + 2 L + adrenaline (`clinical-suite.test.ts:296`) | a pulse within 4 min | none in 10 min "with the humoral fade" | H6 (the humoral arm routed from the outflow); may stay for the arrest stage |

### 6.2 Induction, drugs and the baroreflex curve

| # | Behaviour | Source band | Today | Piece |
|---|---|---|---|---|
| B1 | s3 propofol MAP at 2 min; little HR rise | ≈ 70 % of base ± 15 %; HR < 1.1 × (brief §4.9 3); SBP −25 to −40 % at 2–2.5 mg/kg, HR no significant change (Miller 10e ch. 21 p. 519) | 73.2 green; 70.9 green | must stay green |
| B2 | HTN 60 y vs healthy 40 y induction (`circ-sympathetic-tone.test.ts:56`) | ≥ 5 points more | **4.42**, `it.fails` (A23 size) | H5 (chronic set point read), AQ4 |
| B3 | Fentanyl + propofol vs propofol (`drug-opioid-induction-synergy.test.ts:48`) | 1.79–1.89 × (Billard 1994) | 1.16 | H8 |
| B4 | S6a class III + propofol (`clinical-suite.test.ts:161`) | nadir 30–50 over 1–3 min | **2.7**, arrest | H5, H8 |
| B5 | t10 AS + CAD propofol, then phenylephrine (`sanity-docs.ts:154`; `circ-sanity-2.test.ts:52, 61`) | MAP 60–65 at 2 min; ≥ 85 within 90 s (tables §7 10) | 74.5 / 69.3 amber; both `it.fails` | H8 (inf.) |
| B6 | Phenylephrine pressor test, awake 40 y (`sanity-docs.ts:86`) | HR −5 to −15 for MAP +15 to +25 (brief §4.9 1) | RA: −15.1 for +26.2 (in band) | must stay; H5 |
| B7 | R-09 cardiac BRS by age | 15–20 ms/mmHg young vs ≈ 7 at 70 y, ratio ≈ 0.35 (Kardos 2001; modified Oxford) | RA: 8.1 vs 5.4, ratio 0.67 | H5 |
| B8 | R-10 BRS under propofol Ce 3 and 1 MAC sevoflurane | 25–50 % of awake (Kotrly 1984; Muzi & Ebert 1995; Nagasaki 2001) | RA: 32 % and 27 % (in band) | must stay; H8 |
| B9 | Nitroglycerin depressor response | no human band in hand ([PH]); RA F23 judged +19/min for −6 mmHg steep | RA: +19.0 for −5.6 | H5, recorded only |
| B10 | Reflex bradycardia to a pressor (`drug-layer.test.ts:305`) | HR below the control arm (M10 ch. 14) | never below | H5 |
| B11 | Histamine MAP fall (`drug-layer.test.ts:61`) | MAP −8 to −25 % (T6.3) | −6.7 % "the reflex holds the pressure" | H5 |
| B12 | Nitroprusside SV (`drug-layer.test.ts:116`) | SV ≥ +8 %, MAP ≤ −15 % (Cohn & Franciosa 1977) | SV +1.2 % | H5 (inf.: venous capacitance) |
| B13 | Ephedrine under β-block (`drug-layer.test.ts:275`) | 0.3–0.7 × healthy (tables §1.5 / §7 17b; DI-04a) | 0.99 | H6 |
| B14 | Ephedrine tachyphylaxis (`pk-acceptance-pd.test.ts:128`) | third dose ≤ 0.6 × first | 0.040 / 0.010 / 0.005 | H6 |
| B15 | Dobutamine β-blocked share (`pk-acceptance-pd.test.ts:72`) | ≤ ½ of the free rise (decision 7) | 52 %, T-01 of #352 | H5 (inf.: the reflex withdrawal under β-block) |
| B16 | Dexmedetomidine α2B (`l2/pk/interactions-misc.test.ts:168`) | early SVR rise then decay (DI-60; T6.3) | × 0.994 | H8 |
| B17 | Esmolol HR multiplier (`l2/pk/interactions-misc.test.ts:203`) | falls 10–20 % (DI-07; T6.2) | 6.5 % | H8 (inf.: the β-occupancy at the SA effector) |
| B18 | Sugammadex HR (`l2/pk/interactions-misc.test.ts:35`) | < 5 % fall (DI-45) | 13.4 % | H3 (inf.: the vagal accumulation); may not be the hub's |
| B19 | R-20 atropine 20 µg/kg, adult and 4 y | resting rate +25–40 % (standard; RA) | not measured | H3 |

### 6.3 The stimulus surge, hypercapnia, hypoxia, Cushing, sepsis

| # | Behaviour | Source band | Today | Piece |
|---|---|---|---|---|
| C1 | Laryngoscopy, no opioid (`stimulus-surge.test.ts:121`) | ΔMAP 20–30 (Shribman 1987) | +19.1 | H6 |
| C2 | HTN / healthy surge (`stimulus-surge.test.ts:99`) | ratio ≥ 1.3 (Prys-Roberts 1971) | 1.19 | H6 |
| C3 | Labetalol blunting (`stimulus-surge.test.ts:143`) | ratio 0.2–0.8 (Inada 1989; DI-08) | 0.96 | H6 |
| C4 | β-block bounds (`stimulus-surge.test.ts:162`) | ΔHR ≤ 0.5, ΔMAP ≤ 0.9 | 0.56 / 1.00 | H6 |
| C5 | Desflurane 3 → 12 % (`drug-desflurane-surge.test.ts:24`; `interactions-misc.test.ts:118`) | HR +8–35 for 2–4 min (tables §6.3); fires within 60 s (DI-70) | +1.1; never fires | H8 |
| C6 | Sustained symp lowers the reserve (`l2/endo/cat-reserve.test.ts:20`) | below 0.45 at 30 min | 0.485 | H6 (the store re-sourced) |
| C7 | Noxious stimulus VE (`resp-drive-nonchemical.test.ts:31`) | VE ≥ +20 % | +3.3 % | the pulsus stage E7 (inf.), recorded only here |
| C8 | Hypercapnia, intact patient | MSNA rise (Somers 1989); SVR −0.4 %/mmHg and Emax −22 % at PCO2 92 non-sympathetically (Walley 1990, after propranolol) | three pressor paths, #162 open | H7 |
| C9 | Permissive hypercapnia mPAP (`lung-r14.test.ts:21`) | ≥ +2 mmHg | +1.1 | H7 (inf.: may be `K_PVR_CO2`'s, not the hub's) |
| C10 | R-11 hypoxia: (a) breathing, (b) paralysed at fixed VE | (a) tachycardia, (b) bradycardia (de Burgh Daly; Daly 1997; Miller 10e ch. 13 p. 290) | (b) RA: +16 % tachycardia | H7 |
| C11 | Hypoxic arrest, monitor HR before (`circ-hypoxic-arrest.test.ts:216`) | HR < 45 in the minute before | min 58 | H4, H7 |
| C12 | Cushing HR (`organs-tbi.test.ts:97`) | −20 to −40 % (ratio 0.6–0.8; tables §5.1) | 0.803 | H6 |
| C13 | Warm sepsis CO, SVR (`endo-circ-acceptance.test.ts:64, 68`) | CO 7–9; SVR 500–700 | 5.0; 861 | H6 (inf.: the condition drive no longer multiplies beside the baroreflex) |
| C14 | HTN CBF premise (`organs-htn.test.ts:77`) | MAP ≈ 80 premise, CBF > 80 % | MAP 86.6 | H2b, H5 (inf.) |

### 6.4 Neuraxial, vagal events, the floor

| # | Behaviour | Source band | Today | Piece |
|---|---|---|---|---|
| D1 | t22 term spinal T4 (`sanity-docs.ts:262`) | MAP 60–65 at 3–5 min (tables §7 22) | not measurable ("applyEvent neuraxial … not implemented") | H10 |
| D2 | R-07 T4 block, 70 kg adult, seeds | MAP −20 to −30 %; bradycardia ≈ 13 % (Carpenter 1992); hypotension ≈ 33 %; SVR −15 to −18 % healthy normovolaemic, ≈ −25 % elderly cardiac (Miller 10e ch. 41 p. 1272); arrest of the order 6.4 ± 1.2 per 10,000 (Auroy 1997) | not expressible | H10 (the arrest rate is not testable in CI at that base rate; recorded as a forced-event cell) |
| D3 | R-08 beach chair, interscalene block | hypotensive–bradycardic events 13 % (D'Alessio 1995) to 22–29 % (Liguori 1998), reduced by metoprolol or glycopyrrolate | not expressible | H9 + the posture input (AQ12) |
| D4 | R-16 medial-rectus traction, 4 y, 1 MAC sevo, normo- vs PaCO2 55 | HR fall > 20 %, larger at 55; fatigues; abolished by IV atropine 20 µg/kg (Meuwly 2017) | no PaCO2 potentiation | H12 |
| D5 | R-17 laryngoscopy, adult vs 6 months | adult MAP +20–25, HR +15–20; infant bradycardia (Shribman 1987; paediatric literature) | adult only, `VAGAL_STIM_PER_INTENSITY` false | H12 |
| D6 | Peritoneal traction | bradycardia within seconds, MAP not raised (RA §2.8) | MAP 84.6 → 89.7 | H12 |
| D7 | Vagal sinus arrest reachable | asystole from a vagal drive (Caplan 1988; Miller p. 1272) | floor 30/min | H4 |
| D8 | R-15 2 L crystalloid at HR 55 | HR +5 to +15 (Crystal & Salem 2012, [D], low confidence) | RA: +0.1 then −1.7 | H5, recorded only |
| D9 | t15 RV infarct CVP (`circ-sanity-2.test.ts:105`; `sanity-docs.ts:192`, mark D) | CVP 9–13 (Dell'Italia 1985) | 8.2 | H1 (the resting pericardium; inf.) |
| D10 | Tamponade pulsus (`circ-pulsus.test.ts:34`) | ≥ 10 mmHg (Spodick 2003) | 3.1 | **not the hub's**: research/54 after H1 |

### 6.5 The perfusion floor and the residue (owner answers 1 and 2), recorded by cause

Written in H0 as recorded (not asserted) cells, one per cause, each with the literature range and its strength label,
for the arrest stage to own (AQ11): ongoing haemorrhage, fixed volume loss, vasodilatory (spinal, sepsis),
obstructive (tamponade, tension pneumothorax), the anaesthetic nadir (R-14: Lam & Gelb 1983 MAP 40 ± 1 held; Walsh
2013 graded injury below MAP 55 at 1–5 min; Astrup 1981). RA §5.2 F5 (24 min below MAP 35 in a GA 40 % bleed) is
today's failure.

### 6.6 The guard

R-21: at rest, with no reflex firing, every published number identical to the commit before the piece; H2 asserts it
byte for byte, and every later piece states which resting numbers it moves and why.

## 7. The pieces

Sizes are plan hours (est.), as in the pump and builder plans. Each piece is one PR. **Common gate for every engine
piece:** `00-common-rules.md` (own worktree under `scratch/`, draft until green, identity through the environment, no
closing keyword before a `#number`, never re-run a job in which a test failed); `install --frozen-lockfile`;
typecheck; the touched package's tests (engine-core and validation with at most 3 workers, output to a file); the
showcase slow groups the piece names; `docs/validation/known-misses.md`, the model docs, the coupling registry
(`scripts/couplings.ts --check`) and the mechanism labels regenerated; the `run-validation` label from the first push
and both runs' conclusions read; the `it.fails` count changed only by the marks the piece declares.

**Must not touch in any piece unless it names it:** the bands under `packages/validation` (except a band correction to
its own source, as its own commit, AQ3), the showcase cards' JSON, `viewer-sync.ts`, the instructor and learner paths,
the PK layer's kinetics, the arrest hazards' sizes.

**Every re-record (§8)** names the piece's mechanism, runs a control with that mechanism switched off by a test-only
flag, and shows the control reproduces the old baseline within the regression tolerance.

### H0: Baseline, the acceptance cells and the bit-identity harness (10 h; tests only)
**Depends on:** nothing. **Files:** new `packages/engine-core/test/engine/autonomic-baseline.test.ts` (the rigs of §6
that have no test today: A7–A12, B7, B9, B19, C8, C10, D2–D8, the §6.5 cells), `…/autonomic-identity.test.ts` (R-21:
hashes of the four paths' outputs and of 12 rigs' published numbers on the base commit), additions to
`docs/guides/known-deviations.md`. **Tests first:** every new cell is an `it.fails` with its source band and today's
number, or a recorded value where the source gives no band (B9, D8, §6.5). **Removes:** nothing. **Moves:** nothing.
**Records:** RA's `fecbdcc` numbers re-measured on the day's main, in the PR body. **CI:** 1 run.

### H1: The resting circulation re-calibrated once (N1 = C) (18 h; validation workflow)
**Depends on:** H0. **Files:** `l2/circ/params.ts`, `l2/circ/stabilise.ts` (the resting pericardial pressure 1.1 ±
0.9 mmHg, Freeman & LeWinter 1986; its λ from the paper if its text gives one, else **[PH]** with the experiment named;
brief 94 fitted 0.012), the PI reference SV₀ = the settled resting SV (`circ.ref.sv`), model docs. **Tests first:** a
resting-state table for the eight profiles (MAP, HR, CO, SV, CVP, PCWP, pericardial pressure) asserted against their
sourced bands where they exist and recorded where they do not; sinus-75/pleth back inside 2 % of a re-record whose
control is the old SV₀. **Must not touch:** any reflex constant. **Removes:** possibly D9's mark D (inf.).
**Moves:** every resting baseline (waveforms.json all five cases, determinism hashes, the eeg-baseline fixture, the
showcase slow tests' recorded values): each re-recorded with the cause "resting pericardium + settled SV₀ (H1)" and a
control run with both switched off. **Showcase:** all slow groups re-measured; cue cards re-measured if a value they
show moves. **CI:** 1 run + validation; high load (all slow groups).

### H2: The hub refactor: the same arithmetic in one place (22 h; validation workflow)
**Depends on:** H1. **Files:** new `packages/engine-core/src/l2/autonomic/{state,afferents,integrate,effectors}.ts`
(AQ1 for the home), `l2/circ/model.ts` (the four paths' products read the efferent state), `l2/endo/adapters.ts`,
`l2/organs/effects.ts`, `couplings/{circulation,endocrine-thermal,organs,pharmacology}.ts` (the ABSENT rows of §3.6
become live rows naming the new constants; new rows for `vagalStim`, `bjVagalMs`, `muscBlock`, `catReserve`,
`sympDrive`), `apps/demo/src/app/mechanisms/labels.ts` (one row per new node: the efferent components, the afferents),
`docs/showcase/i18n/fa-debrief.json` (the new labels, `reviewed: false`). **Tests first:** R-21 byte-identical on every
H0 rig; the registry check passes with the absent rows gone. **Must not touch:** any number. **Removes:** nothing.
**Moves:** nothing (a moved number fails the piece). **CI:** 1 run + validation.

### H2b: #188's finite cerebral dilator reserve, folded (8 h; validation workflow)
**Depends on:** H2. **Files:** `l2/brain/flow.ts` and its tests from PR #188 (its mechanism and sources as written in
that PR, re-measured on the day's main). **Tests first:** #188's tests. **Removes:** #188's own marks; possibly C14
(inf.). **Moves:** the haemorrhage card's collapse time (the `brainstemOutF` crossing; #188 measured it at 591 s) and
CPR's CBF: re-recorded with the cause "cerebral dilator reserve (#188, folded)", control = reserve off. **Closes:** PR
#188 as superseded, with a comment linking this PR. **CI:** 1 run + validation.

### H3: The vagal efferent: one accumulation, a tonic level, the AV node, RSA (16 h; validation workflow)
**Depends on:** H2. **Files:** `l2/autonomic/*`, `l2/circ/model.ts` (one vagal sum; `muscBlock` once, at the
effector), `l2/circ/profile.ts` (`tonicVagal` by age band, resting HR unchanged by construction: the intrinsic rate
minus the tonic vagal lengthening; **[PH]** for the split until the intrinsic-rate source is read), `l2/ecg/hrv.ts`
consumer (RSA from vSA). **Tests first:** B19/R-20 (atropine raises the resting rate 25–40 %), RSA abolished by
atropine and smaller with age and depth (direction only, Eckberg 2003), resting HR identical. **Removes:** possibly
B18 (inf.). **Moves:** the ECG RR series (HRV) in every waveform baseline: re-recorded, cause "RSA from vagal tone
(H3)", control = the old constant `rsa 0.67`. **CI:** 1 run + validation.

### H4: The rate floor and the vagal route to sinus arrest (12 h; validation workflow)
**Depends on:** H3. **Files:** `l2/circ/model.ts:395`, `l2/circ/rate-rule.ts`, the escape foci path. **Tests first:**
D7 (a vagal drive above the cycle length gives a sinus pause, then escape or asystole); every arrest and PEA test
unchanged; the rhythm engine's rate validation at 15–30/min. **Removes:** possibly C11. **Moves:** the arrest
timings of the asphyxia and tension-pneumothorax rigs where they sat at 30.0 (RA §0.2 gap 1): re-recorded with cause
"floor removed (H4)", control = floor 30. **CI:** 1 run + validation; high risk (RA §6.4).

### H5: The baroreceptor curve, per-effector gains, bounded resetting, the venous tonic share (28 h; validation workflow) — BLOCKED on papers
**Depends on:** H3, H4, and the papers of §12 rows 1–3. **Files:** `l2/autonomic/afferents.ts` (the arterial
baroreceptor logistic and the cardiopulmonary afferent), `l2/autonomic/effectors.ts`, `l2/circ/baroreflex.ts` (the
linear limbs, `SYMP_WITHDRAW*`, `VAGAL_STEADY`, `G_HS` deleted; resetting bounded; `prof.mapSet` read as the chronic
set point), `l2/circ/profile.ts` (the vascular arm preserved with age, the cardiac arm falling: Kardos 2001).
**Tests first:** B6, B7, B8, B10, B11, A7, A8, A9 (the non-event branch), B2. **Removes (expected, inf.):** A1 or A5 per
AQ3, B2, B10, B11, B12, B15, A16; A4 and A6 jointly with H6. **Moves:** every haemorrhage, induction and vasoactive
row; the showcase haemorrhage, haemorrhage-v2 and both induction cards: re-measured, each change attributed to "the
sourced baroreceptor curve (H5)" with a control on H4's head; the kit round re-run once (§9). **CI:** 1 run +
validation; the heaviest piece.

### H6: One sympathetic outflow: nociception, the adrenal medulla, spillover, the terminal store, brainstem ischaemia (26 h; validation workflow)
**Depends on:** H5. **Files:** `l2/endo/{hormones,effects,adapters,params}.ts` (`symp` becomes the nociceptive
afferent's drive; `endoHrF/SvrF/EesF/DV0Frac` deleted as separate multipliers; adrenaline from sAdr; noradrenaline
spillover from sVaso (Esler, papers wanted); `catReserve` as the terminal store ephedrine releases), `l2/brain/cushing.ts`
and `l2/organs/effects.ts` (Cushing and the CNS ischaemic response as one brainstem afferent; `CUSH_SVR_GAIN`
deleted), `l2/pk/data/rows-cardiovascular.ts` (ephedrine's `sympDrive` → release from the store), the humoral arm
driven by the outflow and the cardiopulmonary afferent instead of `baro.set − MAP`. **Tests first:** C1–C4, C6, C12,
C13, B13, B14, A17. **Removes (expected, inf.):** C1, C2, C3, C4, C6, C12, C13, B13, B14, A4, A6 (with H5), A17 or a
recorded reason. **Moves:** the MH and anaphylaxis cards (their sympathetic drive), sepsis rows: attributed "one
sympathetic outflow (H6)", control = H5's head. **CI:** 1 run + validation.

### H7: The chemoreceptor afferents, folding #162 (16 h; validation workflow)
**Depends on:** H6. **Files:** `l2/autonomic/afferents.ts` (peripheral and central chemoreceptors from PaO2/PaCO2/pH
truths after the transit delay; the ventilation gate from whether VE can rise and the inflation afferent),
`l2/circ/model.ts` (`chemoFactors` deleted), `l2/endo/params.ts` (`SYMP_HYPERCAPNIA_*` and the adrenal hypoxia and
hypercapnia drives deleted as separate paths), `l2/circ/model.ts co2VascularF` and `l2/blood/circ-adapter.ts` (PR #162's
direct CO2 vasodilation and myocardial depression, Walley 1990, as that PR wrote them and its review answered),
`l2/hemo/pipeline.ts:427` (the truths, not SpO2 and EtCO2 + 5). **Tests first:** C8, C10, C11, #162's tests and its
owner's S1 demo-path row. **Removes:** possibly C9 (inf.), C11 (with H4). **Moves:** asphyxia and MH timings (RA §6.4:
`TAU_HYP_S` was fitted three times): attributed "chemoreceptor afferent (H7)", control = H6's head. **Closes:** PR #162
as superseded. **CI:** 1 run + validation.

### H8: Anaesthetics, opioids and α2 agonists on the central integration (20 h; validation workflow)
**Depends on:** H6. **Files:** `l2/pk/data/rows-anaesthetic.ts` (propofol, volatiles incl. desflurane's missing
rows, opioids' haemodynamics through vagotonia and the nociceptive afferent instead of direct HR/SVR EC50s (audit
X-10), dexmedetomidine's central row and α2B arm), `l2/pk/combine.ts` (the `gv`, `gvHr`, `symp`, `setF` fields become
central modulators), the desflurane airway afferent. **Tests first:** B3, B4, B5, B8, B16, B17, C5. **Removes
(expected, inf.):** B3, B4 (with H5), B5 (two marks), B16, B17, C5 (two marks). **Moves:** every induction and
maintenance row: attributed "central modulation (H8)", control = H7's head (or H6's if H7 is not merged; §7.2).
**CI:** 1 run + validation.

### H9: The sympathoinhibitory reflex of low preload, seeded, with the instructor override (22 h; validation workflow) — BLOCKED on papers for its time course
**Depends on:** H5, H6. **Files:** `l2/autonomic/sympathoinhibition.ts` (the state R: a seeded hazard whose rate
rises with an afferent score from unloaded cardiopulmonary receptors, LV filling and contractility, posture and
susceptibility; output drive_s down and drive_v up; τ from Cooke 2004 / Sander-Jensen 1988), the instructor's force
and suppress commands (`types-*.ts`, the controller's allow-list), the posture input to the circulation if AQ12 = A,
the BJ of the RV infarct re-expressed as the same state's ventricular afferent (`l2/circ/conditions.ts:53, 74`).
**Tests first:** A9 (the event branch), A10, A11 over 100 seeds, A12, D3 (if the posture input is in). **Removes:**
nothing pre-existing; its own H0 cells. **Moves:** possibly the showcase haemorrhage cards by seed: each card's seed is
checked and the card's teaching is decided by the owner (AQ2). **CI:** 1 run + validation; a 100-seed suite runs in
the validation workflow only, never locally beyond 10 seeds (load rule).

### H10: Neuraxial block (20 h; validation workflow)
**Depends on:** H6, H9. **Files:** a `neuraxialBlock {sensoryLevel, kind: spinal | epidural}` condition (the
reserved name), `l2/autonomic/effectors.ts` (preganglionic block by segment: sVaso and sVen of beds below the level,
sCard at T1–T4, sAdr; sympathectomy 2–6 dermatomes above the sensory level for spinal, the same level for epidural;
Miller 10e ch. 41 p. 1272), the thermal model's existing neuraxial terms read from the same condition. **Tests
first:** D1 (t22 becomes measurable), D2. **Removes:** t22's "not measurable" note. **Moves:** nothing existing.
**Does not:** model local-anaesthetic spread from a dose (the level is the input; AQ9). **CI:** 1 run + validation.

### H11b: The kidney reads the outflow (12 h; validation workflow)
**Depends on:** H6. **Files:** `l2/renal/{kidney,params,model}.ts` (afferent tone and renin from `sVaso[renal]`; the
renal angiotensin state's input from the outflow; S_GA re-examined as the anaesthetic's effect on the outflow).
**Tests first:** A13. **Removes:** possibly A13. **Moves:** UOP rows: attributed, control = H6's head. **CI:** 1 run +
validation.

### H11c: Regional beds and lactate (stage; its own plan, not sized here)
Audit item 7: a parallel systemic bed split (ICRP-89 flow fractions already in the circuit, per audit L2-09), regional
DO2 against DO2crit per bed, hepatic flow from the splanchnic bed. It needs a plan of its own (AQ7). Removes
(expected): A14, A15, L2-09's ramp.

### H11d: Cutaneous thermoregulatory vasomotion (8 h; validation workflow)
**Depends on:** H6. Sources first (none in hand for the cutaneous share; papers wanted row 10). **Moves:** the skin
tone the pleth reads, attributed.

### H12: Cardiac reflex sites on the hub (14 h; validation workflow)
**Depends on:** H4, H6, H7. **Files:** `l2/circ/model.ts` stimulus terms → `l2/autonomic/afferents.ts` (a vasodepressor
share per site; laryngoscopy pressor in adults and vagal in infants by age band; oculocardiac potentiation by PaCO2
and depth; per-kg atropine, research/21 S8; a carotid-sinus site). **Tests first:** D4, D5, D6. **Moves:** the
`vagal-events.test.ts` rows (pass today; their numbers move): attributed, control = H7's head. **CI:** 1 run +
validation.

### H13: Close-out: showcase, kit, Persian, debrief fixtures, docs (10 h)
**Depends on:** every built piece. **Files:** the cue cards and run sheet re-measured (§9), kit round A re-run once,
the debrief fixtures re-exported where their source run changed, `docs/guides/known-deviations.md` ("Haemorrhage, what
is measured" rewritten from H0–H9's numbers), the roadmap rows. **CI:** 1 run; the kit round on its own config.

### 7.1 Build order and what keeps main green

```
H0 → H1 → H2 → H2b → H3 → H4 → H5 → H6 → { H7, H8, H11b, H11d } → H9 → H10 → H12 → H13
                                     (H5 waits for papers rows 1-3; H9 for rows 4-5)
```

- **Strictly serial through H6** (inf.): every one of H1–H6 changes what "the reflex" is, and two in flight at once
  would make each other's re-records unattributable.
- **After H6** H7, H8, H11b and H11d touch disjoint files, but each re-records rows the others move; merge them in the
  order H7, H8, H11b, H11d, each re-measured on the merged head before it is marked ready, never in parallel CI on the
  shared runners (load).
- **Every piece keeps every showcase card teachable** by re-running its slow group in the PR; a card whose teaching
  changes (the haemorrhage card after H5 and H9) stops the piece for the owner's read (AQ2), never ships a changed
  card silently.
- **The `run-validation` gate is green on every merged head**: a row a piece cannot keep green is a known miss with
  its number and the piece's mechanism named, recorded in that PR.

### 7.2 Hours and CI load

| Piece | Hours | CI | Validation run |
|---|---|---|---|
| H0 | 10 | 1 | — |
| H1 | 18 | 1 (all slow groups) | 1 |
| H2 | 22 | 1 | 1 |
| H2b | 8 | 1 | 1 |
| H3 | 16 | 1 | 1 |
| H4 | 12 | 1 | 1 |
| H5 | 28 | 1 (all slow groups) | 1 |
| H6 | 26 | 1 (all slow groups) | 1 |
| H7 | 16 | 1 | 1 |
| H8 | 20 | 1 | 1 |
| H9 | 22 | 1 | 1 (with the 100-seed suite) |
| H10 | 20 | 1 | 1 |
| H11b | 12 | 1 | 1 |
| H11d | 8 | 1 | 1 |
| H12 | 14 | 1 | 1 |
| H13 | 10 | 1 + kit round | — |
| **Total** | **≈ 262 h** (H11c not included) | 16 runs | 14 validation runs (≈ 90 min each on the shared runners) |

Each re-push of a PR carrying `run-validation` cancels its own superseded validation run (the preamble's rule).

### 7.3 Later pieces, one afferent each (not sized)

Pneumoperitoneum (IAP and dIAP/dt, Joris 1993; needs IAP into the circulation), the lung-inflation reflex beyond the
chemoreflex gate, Valsalva as the hub's acceptance test (Sandroni 1991; needs a strain input), the diving reflex
(Gooden 1994), the respiratory drive from distress (research/54 E7).

## 8. Baselines and how each re-record is attributed and controlled

- **Self-referential rows only** are re-recorded: `packages/validation/baselines/waveforms.json`, the determinism
  hashes, the engine-core fixtures (eeg-baseline), the showcase slow tests' recorded values, the debrief fixtures'
  `*.readers.json` goldens. A sourced band is never re-recorded.
- **Attribution:** the piece's mechanism is behind one test-only switch (inf.: a constructor option in the test
  harness, not a scenario or user setting); the control run with it off must reproduce the previous head's arrays
  within the regression tolerance (2 % per sample); the PR states old → new per row and the cause, in the manner of
  `docs/validation/regression-drift/45-regression-drift-physiology.md` (a physiology verdict per row; a row judged
  not physiological keeps its old array and stays red). Commit `f723a09d` is the commit-message style.
- **Order:** H1 moves every resting row once; H3 the HRV in every row; later pieces move only the rows they name. A
  piece that moves a row it did not name stops and reports.

## 9. What else moves, and how each is re-measured

| Item | Where | How it is re-measured | When |
|---|---|---|---|
| Showcase cards' engine runs | `apps/demo/src/app/showcase/*.slow.test.ts` | `PME_TEST_SET=showcase-a`, `-b` (groups in `apps/demo/vite.config.ts:11–28`), one group at a time, ≤ 2 workers | in every piece that moves them (H1, H5, H6, H9; others if named) |
| Cue cards and run sheet | `docs/showcase/SHOWCASE-2-CUE-CARDS.md`, `SHOWCASE-2-RUN-SHEET.md`, `SHOWCASE-2-MEASUREMENTS.md` | they are records of the 3 November build: left as records; a new measurements section for the post-hub build, from the slow tests' printed values | H13 (and H5 if a card's teaching changes) |
| Kit rounds | `scripts/showcase/kit-round-a.kitround.ts` → `docs/showcase/kit-round-a/` | the kit gate's rebuild sequence (`docs/showcase/KIT-GATE.md:3–35`), one browser at a time | after H5 (once) and in H13 |
| Debrief fixtures | `apps/demo/src/app/__fixtures__/debrief-2/*.json` + `*.readers.json` | byte copies of kit-round exports (`debrief-compat.test.ts:18–26`): re-copied from the new kit round, goldens with `vitest run -u` in the same PR, the diff stated | H13 |
| Persian strings | `docs/showcase/i18n/fa-debrief.json` | new mechanism-tree labels and any new debrief line ("sympathoinhibitory event", the neuraxial level) as entries `reviewed: false`, written through the project's Persian conventions and sent to the owner as a file for review | H2, H9, H10 |
| Mechanism tree | `couplings/*.ts`, `labels.ts`, `docs/plans/mechanism-tree-labels.md` | regenerated by `scripts/couplings.ts` and `scripts/mechanism-labels.ts`; the label test fails on a node without a row | every piece |
| Known deviations | `docs/guides/known-deviations.md` | every removed or added `it.fails` title; the "Haemorrhage, what is measured" paragraph | every piece; rewritten in H13 |

## 10. Risks

1. **The resting re-calibration moves everything (H1).** Brief 94 saw 10 CI jobs red. Mitigation: H1 does nothing
   else; every moved row is attributed with a control; it lands before any hub piece so nothing is re-recorded twice.
2. **Bounded resetting and the sourced curve (H5) move dozens of fitted rows** (RA §6.4 "high"). Mitigation: the bands
   were corrected to their sources first (#347, Mutschler), so the hub is tuned to sourced physiology (audit step 3
   before step 4); H5 is blocked until its parameters are read, never fitted.
3. **The papers may not be readable.** Ursino 1998 is a parameter set in full text only. If it cannot be read, H5
   either waits or takes the owner's ruling to build with **[PH]** gains and recorded tests (AQ13).
4. **The sympathoinhibitory event can arrest patients in every scenario** (RA §6.4). Mitigation: seeded at a base rate
   with an override (owner answer 3), a 100-seed rate test in the validation workflow, and the showcase cards' seeds
   checked for whether they fire (AQ2).
5. **The floor (H4) is load-bearing for the arrest and PEA machinery.** Mitigation: its own piece, every arrest test
   unchanged except those it names.
6. **A tonic level that is not a source's number.** The tonic shares are the owner's A23 sizes, carried as such; the
   venous share and the tonic vagal level are [PH] until sourced, and their tests are recorded, not asserted.
7. **The chemoreflex rework re-times asphyxia** (fitted three times). Mitigation: H7 re-records with a control and
   names every timing it moves.
8. **CI and runner load:** 14 validation runs of ≈ 90 min. Mitigation: strictly one engine piece in validation at a
   time; superseded runs cancelled.
9. **Scope creep into the humoral hub and the regional circuit.** Mitigation: non-goals; AQ6 and AQ7.
10. **The v2.0 roadmap says the hub is built on a new core** (`docs/roadmap/v2.0/README.md`, "How v2.0 is built"),
    while row 7 of research/48 asks to build it now on v1. Building on v1 may be redone in v2 (AQ1).

## 11. Decisions for the owner

Each in his format: the question, a short plain explanation, the options, my proposal. AQ-ids are this plan's;
research/23 §6.6's nine questions are carried as AQ-c1 … AQ-c9 at the end, each answered or re-asked.

**AQ1 — Build the hub now on v1, or wait for the v2.0 core?**
The v2.0 roadmap puts the hub first among the workstreams but "designed on the new core"; your row 7 asks for it
now, and 20+ marks and every haemorrhage row wait behind it.
A: build on v1 now, in `l2/autonomic/`, behind the same effector interfaces, so v2 can lift it as a module.
B: wait for the v2.0 core (workstream 1).
C: build only H0–H5 on v1 (the baroreflex and the refactor), the rest on v2.
**Proposal: A.** The pieces are interface-preserving by construction (H2 is byte-identical), so the work carries
into v2; waiting leaves v1 teaching shock wrongly for the whole v2 build.

**AQ2 — The haemorrhage cards and the seeded event.**
Once the sympathoinhibitory event exists (H9), a card's patient may or may not have it, depending on the seed.
A: the cards keep their seeds and the instructor decides with force or suppress at run time.
B: each card fixes the event's occurrence in its scenario (forced on or off), and the base rate applies only to free
runs.
C: one new card teaches the event; the existing cards suppress it.
**Proposal: B for the existing cards (their teaching stays reproducible), plus C later.**

**AQ3 — The two T-01 test bands that are not the gate's sources.**
`circ-sanity-1.test.ts:60` asserts class II HR 100–125 (the ATLS table) and `:121` asserts 75–95 (tables §7 17b);
the gate, after #347, uses Mutschler 2013 (II 89.8 ± 20.3) and the derived t17b band 67.4–112.4. The engine's 95.4
meets Mutschler; 66.3 misses both. The audit (V-07) found the ATLS bands mis-specified.
A: correct both test bands to the gate's sources (a band corrected to its own source, its own commit); 95.4 then
passes and that mark comes off without engine work; 66.3 stays a miss.
B: keep the ATLS band on that test as a teaching band and the mark until the hub reaches it.
**Proposal: A**, before H5, so the hub is never tuned to the ATLS table (the audit's warning).

**AQ4 — The hypertensive's induction gap (A23 size).**
The HTN patient falls 4.42 points more than the healthy one; the band asks ≥ 5. The size of the HTN tonic share is
yours (A23); H5 adds the chronic set point (+20) that is never read today.
A: re-measure after H5 before any size change.
B: raise `TONIC_HTN` now.
**Proposal: A** (the missing reader is a mechanism; a size change now would be a fit).

**AQ5 — The acute resetting bound.**
Today the set point chases the pressure without limit, which erases class IV. RA proposed ±15 mmHg of acute
excursion and a suspension under distress, but no source RA read gives either number.
A: build the bound as [PH] ±15 mmHg with a recorded test and the experiment named, until a source is read.
B: wait for a source (papers wanted row 6) before H5.
C: no acute resetting at all in v1 (only the chronic set point).
**Proposal: A**, with the papers fetched in parallel.

**AQ6 — The humoral arm in this stage.**
The AVP/angiotensin "drive" is one fitted function of MAP unloading; the kidney has a second angiotensin.
A: route both from the hub's outputs (cardiopulmonary afferent, renal sympathetic) and keep their sizes; hormones as
concentrations wait for the humoral hub (v2.0 workstream 3).
B: build the humoral hub inside this stage.
**Proposal: A.**

**AQ7 — The regional circuit (audit item 7).**
A sympathetic level per bed is cheap; a circuit with parallel beds is a stage.
A: the hub outputs per-bed activity from H2; H11c gets its own plan after H6.
B: H11c inside this stage now.
**Proposal: A.**

**AQ8 — Propofol: how much is central, how much direct?**
Propofol carries both a sympatholysis (`PROPOFOL_SYMP`) and a direct SVR −45 % / Ees −20 %. Miller ch. 21 p. 519 says
it is "a vasodilator due to a reduction in sympathetic activity" and lists direct mechanisms too, without a split.
A: keep the split as it is (both fitted to sourced endpoints, audit X-11) and re-measure after H8.
B: move the vasodilation onto the central path and keep only a direct term a source sizes.
**Proposal: A now, B as a sourced follow-up** if a split source is found (papers wanted row 12).

**AQ9 — Neuraxial block: level as input, or a dose and spread?**
A: the instructor or scenario sets the sensory level (T4, T10 …); spread from dose is not modelled.
B: model spread from dose, baricity and position.
**Proposal: A** (Miller 10e ch. 41 p. 1277: dose is the most reliable determinant of spread, but drug, patient and
procedural factors all affect it; a spread model is its own plan).

**AQ10 — The name in the interface.**
Carried from RA Q4: the event is the sympathoinhibitory (vasovagal) reflex; the empty-ventricle Bezold–Jarisch account
is disputed in man (Fitzpatrick 1993; Hainsworth 1991), but residents are examined on the name.
A: "Sympathoinhibitory (vasovagal) reflex", with Bezold–Jarisch in the glossary.
B: "Bezold–Jarisch reflex" in the interface.
C: "Bezold–Jarisch (sympathoinhibitory) reflex".
**Proposal: C** (the examined name first, the mechanism beside it).

**AQ11 — The perfusion floor and the residue: this stage or the arrest stage?**
Your answers 1 and 2 (4 October) want the time at the floor to emerge by cause and a residue graded by depth × time.
Both need the myocardial and cerebral energy balance (audit item 3, workstream 4).
A: this stage records the cells by cause (§6.5) and enables the reflex route (H4, H9); the arrest stage builds the
emergence and the residue.
B: build the residue here as its own piece.
**Proposal: A.**

**AQ12 — A posture input to the circulation.**
The beach-chair cell (R-08) and tilt need head-up posture acting on venous return and the cardiopulmonary afferent;
today `headUpDeg` reaches only the brain.
A: add it in H9 (venous hydrostatics on the existing circuit, sourced).
B: later, its own piece (triage backlog item 11).
**Proposal: B**, so H9 stays the reflex alone; R-08 waits.

**AQ13 — If Ursino 1998 cannot be read.**
A: H5 waits.
B: H5 builds the logistic with [PH] parameters, every dependent test recorded, not asserted.
**Proposal: A for two weeks, then B.**

**AQ14 — The v1.0 open decision in `docs/roadmap/v1.0-remaining.md`.**
"Whether a minimal subset must still go into v1.0 because v1 otherwise teaches shock wrongly."
A: H0–H5 (bounded resetting, the curve, the floor) are that subset.
B: nothing in v1.0; all of it in v2.0.
**Proposal: A.**

**Carried from research/23 §6.6:**
- **AQ-c1 (time at the floor):** answered 4 October (no fixed time; by cause; graded ranges). Applied in §6.5 and AQ11.
- **AQ-c2 (residue):** answered 4 October (yes, depth × time). Applied in AQ11.
- **AQ-c3 (base rate, deterministic or seeded):** answered 4 October (graded, seeded, override). Applied in H9; the
  card question re-asked as AQ2.
- **AQ-c4 (the name):** re-asked as AQ10.
- **AQ-c5 (atropine's harm in conscious haemorrhagic shock, Barriot & Riou: ectopy in 2, VF in 1 of 20):** re-asked.
  A: reproduce it (atropine in an active event raises the arrest hazard); B: teach it in the debrief only.
  **Proposal: B** (one series of 20 is too thin to size a hazard).
- **AQ-c6 (resetting bounds inside the stage or as a calibration pass):** answered by this plan's structure (inside,
  H5) and re-asked for the number as AQ5.
- **AQ-c7 (the rate floor as part of the stage or its own PR):** answered by the structure (its own piece, H4).
  Proposal stands unless the owner objects.
- **AQ-c8 (a minimal neuraxial block):** re-asked as AQ9 (the level as input, H10 in this stage).
- **AQ-c9 (where the hub lives):** RA recommended `l2/circ/autonomic.ts`. **Proposal: `l2/autonomic/`**, its own
  module, with the afferents owned by the modules that have the signals (inf.: the drug, neuro, organ and renal layers
  all write into it, and a home inside `circ/` would hide that seam). Re-asked.

## 12. Papers wanted (for the owner to fetch; none was downloaded)

| # | Paper | DOI or PMID | Needed by | Why |
|---|---|---|---|---|
| 1 | Ursino M. Interaction between carotid baroregulation and the pulsating heart: a mathematical model. Am J Physiol 1998;275:H1733–47 | DOI 10.1152/ajpheart.1998.275.5.H1733 | H5 | the human carotid-baroreflex parameter set: sigmoid afferent, a gain, delay and τ per effector (audit L2-03: not read) |
| 2 | Kent BB et al. 1972, the four-parameter logistic baroreflex curve (journal and pages unverified: triage cites it "from memory, not opened") | not identified | H5 | the four-parameter logistic form |
| 3 | Kardos A et al. Determinants of spontaneous baroreflex sensitivity in a healthy working population. Hypertension 2001;37:911–6 | PMID 11244017 | H5 | full text for the age regression's scatter and the arm split |
| 4 | Schadt JC, Ludbrook J. Hemodynamic and neurohumoral responses to acute hypovolemia in conscious mammals. Am J Physiol 1991;260:H305–18 | PMID 1671735 | H5, H6, H9 | phase-2 onset and its humoral time course (RA read the abstract) |
| 5 | Cooke WH, Ryan KL, Convertino VA. Lower body negative pressure as a model to study progression to acute hemorrhagic shock in humans. J Appl Physiol 2004;96:1249–61 | PMID 15016789 | H9 | the sympathoinhibitory time course (HR −30–60 over 10–60 s) |
| 6 | The acute-resetting papers (Chapleau; Krieger; Munch) | not identified (RA: unverified) | H5 | the acute bound (AQ5) |
| 7 | Freeman GL, LeWinter MM. Determinants of intrapericardial pressure in dogs. J Appl Physiol 1986;60:758–64 | PMID to be confirmed | H1 | the resting pressure and the curve's parameters (research/54: no steep-limb parameters in the abstract) |
| 8 | Esler M et al. Overflow of catecholamine neurotransmitters to the circulation: source, fate, and functions. Physiol Rev 1990;70:963–85 | DOI 10.1152/physrev.1990.70.4.963 | H6 | noradrenaline spillover from nerve activity |
| 9 | Maas JJ et al. (stressed volume in humans, 2012); Greenway; Magder (venous capacitance and recruitable volume) | not identified | H5 | the venous tonic share and the recruitable volume (`V0_RECRUIT_MAX_ML_KG` cites "Guyton; Magder" without a page) |
| 10 | A human source for the cutaneous sympathetic share in thermoregulation | not identified | H11d | none in hand |
| 11 | A source for the human intrinsic heart rate after combined autonomic blockade, by age | not identified | H3 | the tonic vagal and sympathetic split of resting HR |
| 12 | A source splitting propofol's vasodilation into central and direct shares | not identified | H8 / AQ8 | — |
| 13 | Guyton AC 1948 (CNS ischaemic response); Barcroft 1944 (posthaemorrhagic fainting) | RA: unverified | H6, H9 | the classics RA could not verify |
| 14 | Jacobsen & Secher 1992 (median HR 83 at 34 % loss; triage row 22) | RA: unverified | H5, H9 | the bradycardic phase in human haemorrhage |
| 15 | Laitinen T et al. 1998 (BRS 15.0 ± 1.2 men, 10.2 ± 1.1 women; triage row 32) | to be confirmed | H5 | the sex term |
| 16 | Crystal GJ, Salem MR. The Bainbridge and the "reverse" Bainbridge reflexes. Anesth Analg 2012;114:520–32 | PMID not retrieved (RA) | H5 (D8) | the low-confidence Bainbridge cell |

## 13. Self-review against the codebase (73eb6590)

- The four paths and the side paths were located on 73eb6590 with file and line (§3); the T-01 and hub marks were
  listed by `grep "it.fails("` in the named files, and each line in §6 is on that commit.
- **The "six T-01 marks of #352"** (research/48 row 7): #352 added six `it.fails` (`research/00`, 9 November 18:43):
  `circ-sanity-1.test.ts:60`, `:121`, `circ-sympathetic-tone.test.ts:56`, `pk-acceptance-pd.test.ts:72`,
  `apps/demo/src/app/showcase/healthy-induction.slow.test.ts:85` and `packages/engine-core/test/l2/neuro/diaphragm-recovery.test.ts:53`. The last two are
  respiratory (the first breath before the pulse loss; the diaphragm's recovery) and are **not** the hub's (inf.);
  the four others are in §6 (A1, A5, B2, B15).
- The audit's "20 it.fails" of T-01 are now 19: the awake laryngoscopy row turned green in #352.
- No band, test, card or engine file is changed by this PR.
