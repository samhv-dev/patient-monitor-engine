# 23 — Cardiac reflexes and the autonomic nervous system: evidence, engine inventory, and a proposed architecture

> **Note for readers of the repository.** This is the evidence audit of 4 October 2026 as written, copied here because the v2.0 roadmap builds on it. References to `research/NN`, to "rulings" and to a scratchpad point to the project's working notes, which are kept outside this repository. Engine measurements are from v1 at commit `fecbdcc`.


*Reflex audit, 2026-10-04. READ-ONLY on the repo: no code changed, no commit, no PR. Engine under test:
`origin/main` **fecbdcc** (Merge PR #33, showcase-hotfix), measured in a detached worktree
(`scratch/wt-reflex-audit`, removed at the end of the run). Scripts lived in the session scratchpad
(`reflex-audit/`), never in the repo; seed 7, default adult 40 y / 70 kg / 175 cm male unless the arm says
otherwise; every arm yields to the event loop once per simulated minute. Commissioned by the orchestrator ruling of
2026-10-04 ~15:00 (research/00 §"Ali feedback … cardiac reflexes", requirement P-2) and answering P-1 and
"P-1 clarified" of the same day. Format follows research/19, research/20 and research/21.*

> **Standing note on the owner's four points.** Ali asked explicitly to be challenged where the literature disagrees
> ("these are just my feedbacks, you should always check everything against evidence and you may fight me on these",
> research/00 2026-10-04 ~14:20). This report does that. Three of the four points survive with conditions; one — the
> HR-shaped "accelerating" curve — is supported for the metabolic path and **contradicted for the reflex path**, where
> the evidence says the collapse is a cliff, not a curve. §4 states each verdict with the evidence both ways.

---

## 0. One page

### 0.1 The four verdicts

| # | The owner's point | Verdict | The condition that matters |
|---|---|---|---|
| **(a)** | A measurable arterial pressure is not perfusion; there is a time-critical **low-perfusion** state and, lower, a **no-perfusion** state; at MAP in the mid-20s to mid-30s arrest is imminent | **SUPPORTED WITH CONDITIONS** | The two-zone *shape* is well evidenced (cerebral penumbra thresholds, Astrup 1981; coronary zero-flow pressure 15–21 mmHg, Nanto 2001 / Hoffman & Spaan 1990; pressure-without-pulsatility, Dhanani 2021). The **number is not a constant**: anaesthetised humans tolerated MAP 40 ± 1 for minutes (Lam & Gelb 1983), bypass runs 40–50 mmHg safely, and dogs held at MAP ≈ 30 took 45–60 min to become irreversible (Wiggers model). "Imminent" must mean *minutes at a metabolic rate and a heart rate*, expressed as **time-at-low-perfusion × demand**, not a threshold rule — which is exactly what Ali's own design principle ("use the body's own mechanism") requires |
| **(b)** | The death spiral **accelerates**; e.g. HR 120→60 slowly, 60→30 faster, 30→asystole faster still | **SUPPORTED WITH CONDITIONS — and partly NOT SUPPORTED as stated** | The *mechanism* is real and classical (Crowell & Guyton 1961; Guyton & Crowell 1964: low pressure → low coronary flow → weaker pump → lower pressure), and it has a quantitative basis: below the coronary autoregulatory limit flow becomes **pressure-passive**, so each further mmHg costs proportionally more flow. But (i) no study was found that quantifies the HR 120→60→30→0 curve — treat the specific shape as expert heuristic, not data; and (ii) the **reflex** route to arrest is a *step*, not an acceleration: tilt and LBNP syncope show MAP 94→50 and HR 90→57 **suddenly** after ~19 min of stable tilt (Sander-Jensen 1986 *Am J Physiol*), and spinal-anaesthesia asystole arrives from a near-normal rate. The engine must therefore carry **two** shapes, not one accelerating ramp |
| **(c)** | In acute low preload the fast path to arrest is **reflex**, not coronary ischaemia (which takes time) | **SUPPORTED WITH CONDITIONS** | The reflex path is real, fast (seconds) and clinically the one anaesthetists meet: spinal/epidural bradycardia and asystole (Caplan 1988; Auroy 1997 6.4 ± 1.2 per 10,000 spinals; Pollard 2001), the beach-chair hypotensive-bradycardic event (>20 % of sitting shoulder arthroscopies, Liguori 1998), and phase 2 of haemorrhage at ≈ 30 % blood loss (Schadt & Ludbrook 1991). Two conditions: **(1)** "ischaemia takes time" is true of *necrosis* (≈ 20 min) but false of *contractile failure*, which starts at **12 ± 5 s** of zero flow in humans (Wohlgelernter 1986) and within seconds in dogs (Tennant & Wiggers 1935) — so in a no-flow state the two paths converge within one minute; **(2)** calling it "Bezold–Jarisch" is **disputed** in humans: denervated heart-transplant recipients still have full vasovagal responses on tilt (Fitzpatrick 1993, 7/10, MAP −55 ± 9; Scherrer 1990), so the ventricular-mechanoreceptor trigger is not necessary. The engine should model the **sympathoinhibitory / vagal-excitatory reflex** with the empty ventricle as *one* afferent among several |
| **(d)** | "All the cardiac reflexes should be added; with the autonomic nervous system they play important roles" | **SUPPORTED** | Teaching value is high and the engine is far from it. Of 14 reflex families audited: **2 are real mechanisms** (arterial baroreflex, Cushing), **4 are partial** (cardiopulmonary limb, chemoreflex, stimulus-driven vagal sites, RSA), **8 are absent** (Bezold–Jarisch / sympathoinhibitory, Bainbridge and reverse Bainbridge, vasovagal, diving, Hering–Breuer and lung-inflation cardiac reflexes, carotid-sinus, pneumoperitoneum vagal, Valsalva as an integrated response) — full inventory with file:line in §5.11. The right answer is **not** eight patches but **one autonomic hub** (§6.2) into which each reflex is an afferent — which is also what makes B4 (tonic sympathetic tone) worth doing first |

### 0.2 The biggest gaps (ranked; the first five are the ones that block the owner's four points)

1. **The sinus rate cannot go below 30/min, and no reflex can stop the heart** (`l2/circ/model.ts:342`:
   `m.hrModel = Math.min(m.prof.hrMax, Math.max(30, 60 / rr))`). Every vagal mechanism in the engine — the baroreflex
   vagal limb, the opioid `vagalMs`, the oculocardiac/peritoneal/laryngoscopy stimulus events — is an additive RR
   increment that is then **clamped at 30/min**. Measured: in three different arms the rate sat exactly at 30.0 for
   minutes (asphyxia, class III + propofol spontaneous, tension pneumothorax). There is therefore **no route by which
   a reflex can produce the bradyasystole of a spinal anaesthetic, a vasovagal faint, an oculocardiac arrest or
   phase 2 of haemorrhage**. Arrest is reachable only through `kIsch ≤ 0.1`, `cor.hyp ≥ 0.9`, the no-flow rule
   (MAP < 25 for 60 s) or the K/temperature hazards (`l2/circ/arrest.ts:75–90`). This single clamp blocks Ali's
   point (c) outright.
2. **The baroreflex curve is monotone in one direction: lower pressure always means a faster heart.** The static
   sweep of `stepBaro` (§5.7) gives HR 70 → 122 at MAP 80, saturating at ×1.6, and 178/min at MAP 20. There is no
   sympathoinhibitory branch, no afferent from ventricular filling, and no central arm that can withdraw. Measured
   consequence: in **no** arm of a graded haemorrhage (10–50 % of blood volume, awake or anaesthetised) did a
   bradycardic phase appear before the heart was already ischaemic; the only bradycardias seen are the ischaemic
   (`K_BRADY`) and hypoxic (`G_SA`) pacemaker depressions, which are late and metabolic, not reflex.
3. **The baroreflex set point chases the pressure, so shock resolves itself.** `RESET_FRAC 0.05 / RESET_HOLD_S 420 /
   RESET_GAIN 0.35` (`baroreflex.ts:34–36`, applied at `:135–141`) moves the set point 35 % of the error every 7 min
   with no limit. Measured in an awake 50 %-of-blood-volume haemorrhage: set point 95.3 → **60.5** mmHg over 34 min,
   HR 149 → 88, MAP settles at 62 with lactate 7.6 and **no arrest at all** (§5.1). A 2,450 mL exsanguination becomes
   a stable new normal. Acute resetting in the literature is partial and bounded (it returns the *gain* to the new
   operating pressure, it does not abolish the error); chronic resetting takes days to weeks in hypertension. This is
   the mechanism behind "there is no decompensated state in the engine".
4. **The reflexes are not paid for: there is no tonic autonomic level to withdraw** (this is exactly FU-8 B4). Every
   effector is `1 + o·gain·error` (`baroreflex.ts:152–159`), so at rest the error is 0 and an anaesthetic's `outF`
   removes only the *response*. Hence the measured propofol fall is ≈ −20 % in every profile, and hence a general
   anaesthetic in the engine blunts the reflex **gain** but takes away nothing at rest. The same absence blocks the
   neuraxial sympathectomy (§5.9: no route exists at all), the "sympathoinhibition" of phase 2, and the vasovagal
   vasodepressor limb.
5. **The chemoreflex has the wrong sign in a paralysed ventilated patient, and no vagal event lowers the blood
   pressure.** Measured (§5.10): a ventilated, paralysed adult desaturating to SaO2 79 % at a fixed minute
   ventilation gets a **16 % tachycardia**, where the primary chemoreflex with ventilation prevented is
   **bradycardia** (de Burgh Daly; Daly 1997) — the engine gates the bradycardic branch on age and on SaO2 < 60 %
   (`model.ts:245`) instead of on whether ventilation can rise. And every stimulus-driven vagal event *raises* the
   pressure (peritoneal traction MAP 84.6 → 89.7; laryngoscopy 74.5 → 85.1), because there is no vasodepressor limb
   to accompany the bradycardia.
6. **There is no afferent for ventricular or atrial filling, and the cardiopulmonary limb is vasomotor only.** The
   low-pressure limb (`baroreflex.ts:38–47`) senses transmural RA pressure and drives SVR and venous volume with
   **no rate arm at all** (`G_CP_R`, `G_CP_V`, nothing chronotropic). Measured: a 2 L crystalloid load in a
   60/min patient moved HR by **+0.1/min** and then −1.7 (§5.8) — no Bainbridge; and nothing anywhere reads LV
   end-diastolic volume as a reflex input, so "empty ventricle" has no signal (the FU-4 prototype that did
   (`model.ts:72–75`) was withdrawn and its comment is the only trace).

### 0.3 Things that could not be measured

- **Neuraxial (spinal/epidural) sympathectomy — not expressible.** `condition neuraxialBlock` is rejected
  ("arrives in Stage 7"); `thermal {anaesthesia:'neuraxial'}` is accepted but reaches only the heat model
  (`l2/thermal/heat.ts:124,140`); and `drug bupivacaine route:'intrathecal'` / `'epidural'` is *accepted* but the
  route string is **never read** by the PK layer (no `route` reference anywhere in `l2/pk/`), so it is dosed as a
  systemic IV bolus — i.e. local-anaesthetic toxicity, not a block. Experiment 3 of the brief is therefore reported
  as NOT EXPRESSIBLE, not as a number.
- **Carotid-sinus manipulation** — `stimulus site carotid` is rejected ("site must be laryngoscopy, oculocardiac,
  peritoneal"), as research/21 SP-21 already recorded.
- **A clean open-loop baroreflex step on the whole engine.** There is no "impose this pressure" input, so §5.7's
  static curve is a unit sweep of the pure `stepBaro` function, and the closed-loop numbers come from pressor and
  vasodilator boluses (which carry their own direct effects — stated with each row).
- **Valsalva** — no expiratory-strain input exists; the recruitment manoeuvre (`recruit`) is the nearest thing and
  was not run as a Valsalva surrogate because its phases are not separable.
- **Ganglionic blockade as a reference for tonic tone** — `hexamethonium` is not a drug in the library, so the
  classic "how much of resting tone is neurogenic" probe cannot be run against the engine.

---

## 1. Method

- **Engine:** `origin/main` fecbdcc, detached worktree, `pnpm install --frozen-lockfile`. No file in the repo was
  modified; the worktree was removed at the end.
- **Runner:** one ARM = `createEngine({seed: 7, mode: 'modeled', patient})` + a scripted timeline of the command
  bodies the physiology console sends, then a READ-ONLY sample of the committed state every 5 s (every 30 s or 60 s
  in the printed tables). Columns: rhythm and pulselessness, monitored and model HR, beat MAP/SBP/DBP, CO, SVR, CVP,
  LVEDV, EtCO2, PaCO2, SaO2, coronary perfusion pressure (`cor.cpp`), the coronary supply/demand ratio and `kIsch`,
  the hypoxic share `cor.hyp`, the sinus-node factor `saF`, the baroreflex set point and both filtered errors,
  relative cerebral flow `ext.cbfRel`, the endocrine multipliers, lactate, ICP/CPP/Cushing drive, and the vagal
  stimulus event. Pattern copied from research/21-audit-scripts/`runner.ts`; no pokes, no engine internals written.
- **Reading the tables.** "MAP" is the beat truth (6 s mean of `CircBeat.map`) except in pulseless rows, where it is
  the continuous `circ.mapNow`. "HR" is `circ.hrModel`, the rate the control layer asks the rhythm engine for
  (the monitored HR is carried separately and agreed within 1–3/min in every arm). Times are seconds from the event
  that starts the arm unless the column says otherwise.
- **Sources and strength labels.** Every claim in §2–§4 carries a citation and one of **[H]** human data,
  **[A]** animal data, **[T]** textbook consensus, **[D]** disputed. A claim that could not be verified in this run
  is marked **[UNCONFIRMED]** and is not used to support a verdict. Full list in §8.
- **What the audit did NOT do.** It proposes; it does not implement. §6 is a design, not a plan, and every number in
  it is a target to be met by a mechanism, not a constant to be written into a scenario.

---

## 2. Part 1 — the evidence, reflex by reflex

Each entry: receptors and afferent · central integration · efferent · trigger and threshold · magnitude and time
course · modulation · where an anaesthetist meets it.

### 2.1 Arterial (high-pressure) baroreflex

- **Afferent.** Stretch-sensitive endings in the carotid sinus (glossopharyngeal, Hering's nerve) and the aortic
  arch (vagal), firing with both mean distension and the **rate** of distension, so pulsatility matters as well as
  the mean: at the same mean pressure a narrower pulse pressure unloads them (Chapleau & Abboud 1987) **[A]**.
- **Central.** Nucleus tractus solitarii → caudal and rostral ventrolateral medulla (sympathetic) and nucleus
  ambiguus / dorsal motor nucleus (vagal).
- **Efferent.** Vagal to the sinus and AV nodes (fast, beat-to-beat); sympathetic to the sinus node, myocardium,
  arterioles, and the venous capacitance beds (slower).
- **Operating range and curve.** Sigmoid; threshold for carotid-sinus pressure ≈ 50–60 mmHg, saturation ≈ 160–180,
  with the operating point on the steep limb and the maximal gain near it **[T]** (Guyton & Hall; Berne & Levy).
- **Gain, with numbers.** The best-verified normative dataset is **Kardos 2001** (*Hypertension* 37:911–6,
  PMID 11244017): spontaneous-sequence BRS measurable in 90 % of 1,134 healthy working adults, with
  `ln(BRS) = 3.24 − 0.03 × age` (r² = 0.23) — i.e. ≈ **20 ms/mmHg at 20 years falling to ≈ 8–9 ms/mmHg at 60**
  **[H]**. Modified-Oxford values of ≈ 19 ± 1 (young women) / 21 ± 2 (young men) and ≈ 7 ± 1 ms/mmHg (older women)
  are consistent with that regression **[H, individual-paper attributions UNCONFIRMED]**. The sequence method
  correlates poorly with the phenylephrine method where BRS is already low **[H]**. The vascular (MSNA) arm is a
  separate, slower limb and is **relatively preserved with age** while the cardiac arm falls **[H]** — which matters
  for the engine, because the profile today scales both arms together (`profile.ts:93–98`: elderly `gv 6.5` *and*
  `gs 0.6`).
- **Latency and dynamics.** Vagal limb: within one cardiac cycle, latency < 1 s, so a pressor bolus slows the very
  next beats; sympathetic limb: latency ≈ 2–5 s with a time constant of several seconds to tens of seconds **[T/H]**.
- **Acute resetting.** The curve shifts toward the prevailing pressure within minutes while keeping its gain — in
  exercise, in sustained carotid-sinus pressure changes, and in sustained hypotension (Chapleau, Krieger) **[A]**.
  The key point for the engine: resetting re-centres the **gain** on the new pressure; it does **not** abolish the
  error signal nor stop the other defences. **Chronic** resetting (hypertension) takes days to weeks and is
  accompanied by reduced gain **[T]**.
- **Modulation.** Propofol near-abolishes muscle sympathetic nerve activity at induction and depresses it
  dose-dependently, and resets the set point downward (Ebert 1992; Sellgren 1994; Robinson 1997; Ebert 2005) **[H]**.
  Isoflurane reduces the pressor baroslope progressively at 1.0 and 1.5 MAC (Kotrly 1984) **[H]**; sevoflurane and
  desflurane reduce cardiac baroslopes similarly (Muzi & Ebert 1995) **[H]**; sevoflurane 0.41–1.24 MAC lowers MAP
  with **no** HR change and lower sympathetic nerve activity (Ebert, Muzi & Lopatka 1995) **[H]**. Opioids depress
  the chronotropic arm and add central vagotonia. Age lowers cardiac BRS markedly (above). Diabetic autonomic
  neuropathy and β-blockade lower the HR arm specifically. The transplanted heart has **no** efferent vagal or
  sympathetic innervation initially, so the HR arm is absent and the response is humoral and vascular only.
- **Where you meet it.** Every induction; the HR answer to a pressor or a vasodilator; the hypertensive patient
  whose reflex is reset upward and who therefore falls further; the elderly patient in whom the HR arm is nearly
  gone.

### 2.2 Cardiopulmonary (low-pressure) receptor reflexes

- **Afferent.** Atrial A- and B-type receptors (myelinated vagal), ventricular and pulmonary-vein receptors, and
  unmyelinated ventricular **C fibres**; all vagal. They sense transmural filling.
- **Efferent.** Tonically inhibitory on sympathetic vasoconstrictor outflow; also control vasopressin release.
- **Threshold and magnitude.** This is the limb that answers *mild* hypovolaemia. Low-level lower-body negative
  pressure (−10 to −20 mmHg), which lowers right atrial pressure and unloads cardiac receptors **without changing
  arterial pressure or heart rate**, raises forearm and splanchnic vascular resistance by ≈ **20–40 %**
  (Johnson, Rowell, Niederberger & Eisman 1974, *Circ Res* 34:515–24, PMID 4826928) **[H]**; reviewed by
  Mark & Mancia 1983 **[review, bibliographic details UNCONFIRMED]**. This is why class I–II haemorrhage narrows the
  pulse pressure while systolic pressure holds, and why the heart rate can be unremarkable.
- **Modulation.** Positive-pressure ventilation and PEEP unload them (so PEEP raises SVR and lowers venous return
  simultaneously); anaesthesia depresses the efferent arm.
- **Where you meet it.** The compensated bleeder; the effect of PEEP; the vasoconstriction of head-up tilt.

### 2.3 Bezold–Jarisch and the sympathoinhibitory reflex of low preload

- **History and pathway.** Von Bezold 1867 and Jarisch (1930s–40s): veratrum alkaloids cause the triad
  **bradycardia + vasodilation + hypotension**; the afferents are unmyelinated vagal C fibres in the left
  ventricle, excited chemically (serotonin, veratridine, capsaicin, prostaglandins) and mechanically **[A]**.
- **The "empty vigorously contracting ventricle" hypothesis.** Öberg & Thorén 1972 (*Acta Physiol Scand*,
  "Increased activity in left ventricular receptors during haemorrhage or occlusion of caval veins in the cat — a
  possible cause of the vaso-vagal reaction") recorded increased ventricular C-fibre activity exactly when a cat
  was bled or the caval veins occluded **[A]**. Mark 1983 (*JACC*, "The Bezold–Jarisch reflex revisited") brought it
  into cardiology; Campagna & Carter 2003 (*Anesthesiology* 98:1250–60) is the anaesthetic review; Kinsella & Tuckey
  2001 (*BJA* 86:859–68) ties perioperative bradycardia and asystole to it **[reviews]**.
- **Magnitude and time course.** When it fires it is **abrupt**: in head-up tilt, after ≈ 19 ± 3 min of stable tilt,
  MAP fell from 94 to 50 mmHg and HR from 90 to 57/min **suddenly** (Sander-Jensen 1986, *Am J Physiol*
  251:R742) **[H]**; in progressive LBNP, HR rose 55 → 90 then fell to 57 as MAP reached 41 ± 7 (Sander-Jensen 1988,
  *Am J Physiol* 255:R149) **[H]**. Onset over seconds to a few tens of seconds, not minutes; recovery on restoring
  venous return is equally fast (Barriot & Riou: all 20 recovered **with fluid loading alone**) **[H]**.
- **Clinical settings.**
  - **Spinal and epidural anaesthesia.** Bradycardia in ≈ **13 %** and hypotension in ≈ **33 %** of spinals
    (Carpenter 1992, *Anesthesiology* 76:906) **[H]**; sudden cardiac arrest in healthy patients during spinal
    anaesthesia (Caplan 1988, *Anesthesiology* 68:5–11; 14 closed claims, all resuscitated in theatre, 6 died of
    neurological injury) **[H]**; prospective incidence **6.4 ± 1.2 per 10,000 spinals** versus 1.0 ± 0.4 for all
    other regional blocks (Auroy 1997) **[H]**; mechanisms and prevention in Pollard 2001 (*Anesth Analg* 92:252)
    **[review]**.
  - **Shoulder surgery in the beach-chair position under interscalene block.** Hypotensive/bradycardic events in
    ≈ **13 %** (D'Alessio, Weller & Rosenblum 1995, *Anesth Analg* 80:1158–62, PMID 7762845) and **22–29 %** in the
    untreated arms of Liguori 1998 (*Anesth Analg* 87:1320–5), where prophylactic metoprolol or glycopyrrolate
    reduced them **[H]**. 5-HT3 antagonism attenuates the pressure fall of spinal anaesthesia (Owczuk 2008,
    *Reg Anesth Pain Med* 33:332–9, PMID 18675744; replicated in the elderly, *Minerva Anestesiol* 2015;81:598–607,
    PMID 25220555) **[H]**.
  - **Inferior myocardial infarction.** Bradycardia and hypotension from inferoposterior ischaemia, attributed to
    the same ventricular afferents **[T]**.
- **The biphasic response to acute haemorrhage** — the central claim for Ali's point (c):
  - **Barcroft, Edholm, McMichael & Sharpey-Schafer 1944** (*Lancet*, "Posthaemorrhagic fainting: study by cardiac
    output and forearm flow"): volunteers bled until they fainted. Cardiac output fell from the start, heart rate
    rose from the start, vascular resistance rose, and arterial pressure held — **until the faint**, when resistance
    fell **[H]**. This is the original demonstration that the collapse is a *release* of vasoconstriction, not a
    progressive failure.
  - **Secher & Bie 1985** (*Clin Physiol* 5:315, "Bradycardia during reversible haemorrhagic shock — a forgotten
    observation?") **[H]**.
  - **Sander-Jensen 1986** (*BMJ* 292:364–6): 20 consecutive hypotensive bleeding patients, mean blood loss
    **2.3 ± 0.3 L ≈ 36 ± 4 % of blood volume**; during shock mean pressure **81/55** and heart rate **73/min**;
    immediately after resuscitation 111/72 and 102/min, then 131/79 and 82/min. Pancreatic polypeptide — a
    vagally-controlled hormone — rose from 64–77 to 198–280 pmol/L. Conclusion: reversible hypotensive hypovolaemic
    shock is characterised by a **fall** in heart rate, reflecting increased vagal tone **[H]**. Sander-Jensen's own
    1991 review gives the heart rate during severe haemorrhage as a mean of 73 with a range of **46–98** **[H]**.
  - **Barriot & Riou 1987** (*Intensive Care Med* 13:203): of 273 acute haemorrhagic shocks in one pre-hospital
    year, **20 (7 %)** had paradoxical bradycardia; all were conscious; **9 had no measurable systolic pressure with
    a palpable femoral pulse**; all recovered from the bradycardia **with fluid alone**. Atropine was harmful — two
    patients developed ventricular ectopy and one ventricular fibrillation — so the authors conclude atropine must be
    avoided here **[H]**. (This is directly relevant to the engine's atropine behaviour and to teaching.)
  - **Demetriades 1998** (*J Trauma* 45:534–9): of 750 hypotensive trauma patients, **28.9 %** had relative
    bradycardia; crude mortality 21.7 % with bradycardia vs 29.2 % with tachycardia (RR 1.34, p = 0.047), adjusted
    RR 1.23 (not significant) **[H]**. Thompson 1990 and Victorino 2003 report the same direction **[H]**. So
    **relative bradycardia in haemorrhage is not a terminal sign** — a point the engine should not teach wrongly.
  - **Schadt & Ludbrook 1991** (*Am J Physiol* 260:H305–18): the canonical two-phase description. Phase 1 —
    conductance falls in proportion to the fall in cardiac output, so MAP falls by only ≈ 8 mmHg. **Phase 2 begins
    when cardiac output has fallen to ≈ 60 % of baseline** (≈ 30 % blood-volume loss): vascular conductance rises
    **abruptly**, pressure falls, and heart rate falls relatively or absolutely. Opioid (δ) mechanisms are
    implicated. Crucially, the authors state the **cardiopulmonary afferent origin is established in rabbits and
    rats but unknown in dogs and humans** **[A, with the human attribution D]**. In the human LBNP-to-presyncope
    model the switch is **abrupt**: heart rate falls from a peak of 100–130/min by **30–60 bpm over ≈ 10–60 s**,
    with simultaneous withdrawal of muscle sympathetic nerve activity (Cooke, Ryan & Convertino 2004,
    *J Appl Physiol* 96:1249–61, PMID 15016789; Sander-Jensen 1988, PMID 3394838) **[H]**. **Atropine raises the
    rate but does not reliably restore the pressure**, because the vasodilator component is sympathetic withdrawal
    **[H]** — the single most important teaching point of this whole section.
  - **Against the ventricular-afferent account.** 7 of 10 **heart-transplant recipients** had full vasovagal
    responses to tilt despite ventricular denervation, with MAP falling 55 ± 9 mmHg (Fitzpatrick 1993, *JACC*
    21:1132–7, PMID 8459066) **[H]**; vasovagal syncope occurred in a transplant recipient after a vasodilator
    (Scherrer 1990, *NEJM* 322:602–4, PMID 2304506) **[H]**; and on echocardiography the ventricle is **not** empty
    before neurally-mediated syncope (Liu JE, Hahn RT, Stein KM, et al. 2000, *Circulation* 101:777–83,
    PMID 10683352) **[H]**. Hainsworth's review (*Physiol Rev* 1991;71:617–58, PMID 2057525) concludes the
    ventricular-receptor hypothesis is not established in man **[D]**. Campagna & Carter's own review is sceptical
    that the Bezold–Jarisch reflex explains regional-anaesthesia collapse. Little & Kirkman's work suggests
    nociception from injury can suppress the bradycardic phase, which fits the clinical observation that trauma
    patients often stay tachycardic **[A, citation UNCONFIRMED]**.
  - **Engine consequence.** Model the **efferent pattern** (sympathoinhibition + vagal excitation) as a central
    state that several afferents can drive — ventricular filling being one, with a modest weight — rather than
    hard-wiring "empty ventricle → bradycardia". That is both better evidence and better architecture.
- **Modulation.** Abolished or blunted by atropine/glycopyrrolate on the cardiac limb only (the vasodepressor limb
  survives); deeper under spinal than general anaesthesia because the sympathectomy removes the compensations;
  worse with head-up posture, with vasodilators, and in a volume-depleted patient; β-blockade reduces the
  "vigorous contraction" trigger (hence metoprolol prophylaxis in beach-chair surgery).

### 2.4 Bainbridge and "reverse Bainbridge"

- **Bainbridge 1915** (*J Physiol*): infusing blood or saline into the jugular vein of anaesthetised dogs raised the
  heart rate; vagotomy abolished it **[A]**. Afferent: atrial B-type stretch receptors (and caval); efferent: vagal
  withdrawal with some sympathetic activation.
- **Magnitude and direction depend on the starting rate.** The response is a rise when the initial rate is low and
  can be a fall when it is high — i.e. the reflex pulls the rate toward a middle value. It is also strongly
  **species-dependent and weak or absent in primates** (Boettcher, Zimpfer & Vatner 1982, "Phylogenesis of the
  Bainbridge reflex", *Am J Physiol* 242:R244–6, PMID 7065218) **[A]**. **In humans the effect is small and its
  existence as a distinct reflex is disputed** (Crystal & Salem 2012, *Anesth Analg* 114:520–32, the definitive
  review) **[D]**.
- **"Reverse Bainbridge."** A fall in heart rate when venous return falls; invoked for spinal-anaesthesia
  bradycardia alongside the Bezold–Jarisch account (Crystal & Salem 2012) **[D]**.
- **Where you meet it.** The rate response to a rapid fluid bolus in a bradycardic patient; the rate behaviour on
  going head-up or head-down; the explanation offered for the bradycardia of neuraxial block.

### 2.5 Arterial chemoreflex

- **Afferent.** Carotid bodies (glossopharyngeal) principally, aortic bodies; sense PaO2 (hyperbolic, steep below
  ≈ 60 mmHg), PaCO2 and pH.
- **Efferent and the ventilation confound.** Selective carotid-body stimulation at **constant ventilation** gives
  **primary bradycardia** with peripheral vasoconstriction; if ventilation is allowed to rise, the lung-inflation
  reflex and the central respiratory–cardiac coupling convert this into **tachycardia** (de Burgh Daly; Daly 1997)
  **[A]**. Severe hypoxia additionally acts directly: central depression of ventilation, direct myocardial
  bradycardia, and local vasodilation in muscle and brain **[A/T]**.
- **Thresholds and magnitude.** The hypoxic drive becomes significant below SaO2 ≈ 90 % / PaO2 ≈ 60 mmHg; the
  hypercapnic pressor response rises roughly linearly above PaCO2 ≈ 50 **[T]**. In apnoeic asphyxia the sequence in
  every animal model is early tachycardia and hypertension, then bradycardia and hypotension, then loss of
  pulsations with the ECG still organised (DeBehnke 1995, dogs; Varvarousi 2011/2015, swine) **[A]**.
- **Modulation.** Volatile anaesthetics depress the acute hypoxic ventilatory response markedly even at
  subanaesthetic concentrations, and arousal or pain does not restore it (Sarton, Dahan, Teppema, et al. 1996,
  *Anesthesiology* 85:295–303, PMID 8712445) **[H]**; the hypercapnic response is depressed dose-dependently. The
  cardiac limb of the hypoxic response in a *paralysed, ventilated* patient is unopposed by inflation, so
  bradycardia dominates. Neonates and infants answer hypoxia with bradycardia, not tachycardia **[T]**. A
  quantitative human "bpm per % SaO2 fall" figure was not found **[UNCONFIRMED]**.
- **Where you meet it.** Apnoea at induction; the bradycardia of a hypoxic neonate; obstructive sleep apnoea;
  the "SpO2 falling and the heart slowing" of a failed airway.

### 2.6 CNS ischaemic response and the Cushing reflex

- **CNS ischaemic response** (Guyton 1948; Guyton & Hall): a *systemic hypotension* response — it is insignificant
  until MAP falls **below ≈ 60 mmHg** and is maximal at **MAP 15–20 mmHg**, when it can raise pressure to as much as
  **250 mmHg for up to 10 min** in animals; the stimulus is believed to be CO2 accumulation in a
  poorly-perfused medulla, and Guyton called it the "last-ditch stand" **[A/T]**.
- **Cushing reflex** (Cushing 1901/1902): the response to *intracranial* hypertension — hypertension with a widened
  pulse pressure, **bradycardia** (itself the baroreflex's answer to the pressor surge) and irregular respiration.
  Trigger: brainstem ischaemia as cerebral perfusion pressure falls or the ICP approaches arterial pressure. The
  full triad is present in a minority of patients with raised ICP **[H, incidence not verified here]**.
- **Time course.** The engine's own tables use "CPP < 40 mmHg for > 30 s → MAP +30–50 over 30–60 s, HR −20–40 %",
  which matches the textbook description **[T]**.
- **Where you meet it.** Traumatic brain injury; posterior-fossa surgery; the hypertensive bradycardic patient with
  a blown pupil.

### 2.7 Oculocardiac and the trigeminocardiac reflex

- **Afferent** long and short ciliary nerves → ciliary ganglion → ophthalmic division of the trigeminal → Gasserian
  ganglion → trigeminal sensory nucleus; **efferent** vagal to the sinus and AV nodes. Aschner 1908 / Dagnini.
- **Trigger.** Traction on the extra-ocular muscles (classically the medial rectus), pressure on the globe,
  retrobulbar block, orbital fracture; and more generally **any** stimulation of trigeminal sensory branches —
  Schaller's trigeminocardiac reflex (skull-base surgery, maxillofacial surgery, nasal packing).
- **Definition and incidence.** The usual definition is a fall in heart rate **> 20 %** of baseline, or below
  60/min (Meuwly, Golanov, Chowdhury, Erne & Schaller 2015, *Medicine (Baltimore)* 94(5):e484, PMID 25654391;
  updated in Meuwly 2017, *Front Neurol* 8:533) **[review]**. Reported prevalence in strabismus surgery ranges
  **14–90 %** depending on the definition, anaesthetic and traction technique; individual series give 56 %, 68 % and
  one arrhythmia-inclusive series 91 % **[H, individual series UNCONFIRMED]**. Bradycardia is commonest, but
  arrhythmias and asystole occur.
- **Time course.** Onset within seconds of traction; **fatigues** on sustained or repeated traction; recovers within
  seconds of release.
- **Modulation.** Abolished or blunted by antimuscarinics given beforehand (atropine, glycopyrrolate; intravenous
  works, intramuscular premedication is unreliable); **potentiated by hypercapnia, hypoxia and light anaesthesia**;
  far commoner in children than adults; deepened by opioids; blunted by retrobulbar block (which can itself trigger
  it); a second dose of suxamethonium is a classic trigger of vagal bradyasystole in children.
- **Where you meet it.** Paediatric squint surgery; orbital trauma; any trigeminal manipulation.

### 2.8 Vagal reflexes from the airway, viscera and carotid sinus; the somatosympathetic response

- **Laryngoscopy and intubation.** In adults the dominant response is **sympathetic**: King 1951; Shribman, Smith &
  Achola 1987 (*BJA* 59:295–9) showed similar rises in arterial pressure and circulating catecholamines with
  laryngoscopy with or without intubation, with a **heart-rate rise only in the intubated group** **[H]**. Typical
  size MAP +20–25 mmHg and HR +20/min, peaking at ≈ 1 min and settling within ≈ 5 min **[H/T]**. In **neonates,
  infants and small children** the same stimulus commonly produces **bradycardia** — the reason atropine is used
  before paediatric and neonatal intubation. Note the caveat: in a 264-child critical-care cohort atropine was
  associated with lower mortality but **not** through preventing bradycardia (Jones P, Peters MJ, Pinto da Costa N,
  et al. 2013, *PLoS One* 8(2):e57478, PMID 23468997) **[H]**.
- **Peritoneal and mesenteric traction.** Traction on the peritoneum or mesentery gives vagal bradycardia within
  seconds. **Mesenteric traction syndrome** is a separate, **prostacyclin-mediated** event beginning ≈ 15–20 min
  into open abdominal surgery — facial flushing lasting ≈ 30–40 min, tachycardia, falls in SVR and MAP, incidence
  ≈ 30–85 % (one systematic review ≈ 76 % in major abdominal surgery) **[H, review citation UNCONFIRMED]**. It does
  **not** respond to atropine and is attenuated by NSAIDs — so it must not be modelled as a vagal site.
- **Carotid sinus.** Direct manipulation during carotid endarterectomy or a carotid-sinus massage produces
  bradycardia and vasodepression; local infiltration abolishes it **[T]**.
- **Somatosympathetic response to surgical stimulation.** A- and C-fibre somatic afferents → segmental and
  supraspinal sympathoexcitation (Sato A & Schmidt RF 1973, *Physiol Rev* 53:916–47, PMID 4355517) **[A]**; in
  anaesthetised patients skin incision raises MAP and HR by ≈ **10–25 % within 30–60 s**, attenuated
  dose-dependently by opioids and abolished below an adequate neuraxial block; the MSNA surge at intubation and
  surgery is documented in Sellgren 1994 (PMID 8141450) **[H]**.
- **CO2 pneumoperitoneum.** Two distinct things. (1) A **vagal** event on rapid peritoneal stretch at insufflation —
  bradycardia, AV dissociation, occasionally asystole, abolished by desufflation and atropine **[H]**. (2) The
  **sustained haemodynamic** response: Joris 1993 (*Anesth Analg* 76:1067) measured, during laparoscopic
  cholecystectomy, MAP **+ ≈ 35 %**, cardiac index **− ≈ 20 %**, systemic vascular resistance **+ ≈ 65 %** and
  pulmonary vascular resistance **+ ≈ 90 %** on insufflation; anaesthesia + head-up tilt + insufflation together gave
  a **50 % fall in cardiac index**; vasopressin and catecholamines rose to levels sufficient to explain the change,
  with partial recovery over ≈ 10–15 min **[H]**. Plus CO2 absorption raising PaCO2/EtCO2 over 15–30 min.
  Complications reviewed in Gutt 2004 (*Dig Surg* 21:95–105, PMID 15010588); specific bradyarrhythmia incidence
  figures (quoted as 14–27 %) could not be verified **[UNCONFIRMED]**.

### 2.9 Vasovagal (neurocardiogenic) syncope

- **Pattern.** A period of stable or rising heart rate and maintained pressure, then an abrupt sympathoinhibition
  with vasodilation (vasodepressor), bradycardia (cardioinhibitory) or both (mixed; VASIS classification). Lewis
  1932 named the vagal and vasodepressor components separately.
- **VASIS classification.** Type 1 mixed; type 2A cardioinhibitory without asystole; type 2B cardioinhibitory with
  asystole > 3 s; type 3 vasodepressor **[T]**. The abrupt phase occupies the final ≈ 1–2 min of a tilt test.
- **Numbers.** Tilt data: MAP 94 → 50 and HR 90 → 57 **suddenly** at ≈ 19 ± 3 min of 60° tilt (Sander-Jensen 1986,
  *Am J Physiol* 251:R742–8, PMID 3766774) **[H]**; sympatho-vagal responses characterised in Jardine, Krediet,
  Cortelli, Frampton & Wieling 2009 (*Clin Sci* 117:345–53, PMID 19281451) **[H]**. van Dijk 2014
  (*Brain* 137:576–85, PMID 24343112) correlated 69 tilt-induced syncopes with the EEG: a
  "slow–flat–slow" pattern went with a **lower minimum pressure, longer RR intervals and more asystole**, and loss
  of consciousness lasted a mean of **22.4 s (range 4–55)** **[H]**. Loss of consciousness follows abrupt
  circulatory arrest in ≈ **6.4–6.9 s** (Rossen, Kabat & Anderson 1943) **[H]**, with EEG change at a mean of
  **10.2 s** after the last normal beat in human defibrillator-testing arrests (Clute & Levy 1990,
  *Anesthesiology* 73:821–5) **[H]**.
- **Where you meet it.** Awake regional blocks; the sitting patient; venepuncture; the "faint" on the ward that the
  anaesthetist is called to.

### 2.10 Diving reflex

- **Trigger and pathway.** Cold water on the face (trigeminal ophthalmic division) with apnoea; vagal bradycardia
  **plus** peripheral vasoconstriction and a redistribution of flow, and it co-exists with the chemoreflex.
- **Magnitude.** HR falls ≈ **10–30 %** in adults with cold-water face immersion (apnoea alone gives less), larger
  and faster in infants; onset within **5–10 s**, maximal by ≈ **20–30 s** (Gooden 1994, *Integr Physiol Behav Sci*
  29:6–16, PMID 8018553; Foster & Sheel 2005, *Scand J Med Sci Sports* 15:3–12, PMID 15679566) **[H, reviews]**.
  It is the one reflex that raises parasympathetic **and** sympathetic outflow together, which is why it is a useful
  test of whether an autonomic hub really has two independent drives.
- **Where you meet it.** Ice-water immersion to break paroxysmal SVT in a child; cold-water drowning; the trigeminal
  component overlaps the trigeminocardiac reflex.

### 2.11 Lung-inflation reflexes and respiratory sinus arrhythmia

- **Hering–Breuer inflation reflex.** Slowly adapting pulmonary stretch receptors → vagus → inspiratory
  termination. **Weak in the awake adult human** (threshold ≈ > 0.8–1.0 L, above a normal tidal volume) and much
  stronger in neonates and under anaesthesia **[T/H]**.
- **Lung-inflation cardiac reflex.** Moderate inflation produces **tachycardia** by vagal withdrawal (Anrep 1936;
  Daly) **[A]** — this is the reflex that converts the chemoreflex's primary bradycardia into tachycardia (§2.5).
  Large inflations excite pulmonary C fibres and give bradycardia, hypotension and apnoea **[A]**.
- **Respiratory sinus arrhythmia.** RR intervals shorten in inspiration and lengthen in expiration; almost entirely
  vagal and abolished by atropine; **larger at slow breathing rates and small at fast ones**; respiratory activity
  **gates the timing** of vagal motoneurone firing rather than its tonic level (Eckberg 2003, *J Physiol*, "The
  human respiratory gate") **[H]**. Amplitude falls markedly with age and with general anaesthesia (reduced
  high-frequency HRV power). Peak-to-valley amplitude in young healthy supine adults is commonly ≈ **50–150 ms**,
  larger with slow deep breathing **[H]**. Under controlled positive-pressure ventilation the **dominant mechanism
  changes from neural to mechanical** (the pulse-pressure oscillation); a strict phase inversion is often asserted
  but no primary source was found **[UNCONFIRMED / D]**.
- **Where you meet it.** The HRV the monitor draws; the loss of beat-to-beat variability as anaesthesia deepens or
  autonomic neuropathy advances; the reason a paralysed ventilated patient's sinus rhythm looks metronomic.

### 2.12 Valsalva as an integrated test

- **Four phases.** I: transient pressure rise with the strain. II early: venous return falls, pressure falls, HR
  rises; II late: sympathetic vasoconstriction (latency ≈ 5–7 s) recovers the pressure. III: brief fall on release.
  IV: overshoot above baseline with reflex bradycardia.
- **Numbers.** The **Valsalva ratio** (maximum HR during the strain ÷ minimum HR after release) is normally
  **> 1.21** and is strongly age-dependent (age-stratified lower limits are used clinically); phase II late and
  phase IV are the adrenergic measures, and the sympathetic latency from the onset of the pressure fall is ≈ **5–7 s**
  (Sandroni, Benarroch & Low 1991, *J Appl Physiol* 71:1563–7, PMID 1757382) **[H]**. Absent late phase II recovery
  and absent phase IV overshoot characterise adrenergic failure; a **"square-wave" response** (no fall in phase II,
  no overshoot in phase IV) indicates a raised central volume, classically heart failure **[H/T]**. The commonly
  repeated claim that phase IV is absent under general anaesthesia is mechanistically plausible but no primary
  source was found **[UNCONFIRMED]**.
- **Why it matters here.** It is the one manoeuvre that exercises every limb — venous return, the arterial
  baroreflex's vagal and sympathetic arms, and the recovery overshoot — in 20 s. If an engine reproduces a correct
  Valsalva, its autonomic hub is probably right. It is therefore the best single acceptance test for §6.2.

---

## 3. Part 1 continued — the integration questions

### 3.1 (i) Lower limits of autoregulation, and how long MAP 25–35 is tolerated

**Coronary.**

| Quantity | Number | Source | Strength |
|---|---|---|---|
| Coronary zero-flow pressure, vasodilated bed | ≈ **15–20 mmHg** | Hoffman & Spaan 1990, *Physiol Rev* 70:331–90 | [A/review] |
| Coronary zero-flow pressure, human, true (long diastole under intracoronary ATP) | **21 ± 7 mmHg** (47 ± 15 estimated from normal beats — the normal-beat method overestimates) | Nanto 2001, *Jpn Circ J* 65:793–6, n = 15 | [H] |
| Zero-flow pressure with normal vasomotor tone, dog | 20–50 mmHg | Bellamy 1978, *Circ Res* 43:92–101 | [A] |
| Lower limit of coronary autoregulation (distal coronary pressure), conscious dog | wall thickening unchanged to **39 ± 5.6**, endocardial shortening to **42 ± 7.4 mmHg**; ≈ 70 mmHg in anaesthetised animals | Canty 1988, *Circ Res* 63:821–36 | [A] |
| Coronary perfusion pressure needed for ROSC in human CPR | **≥ 15 mmHg** (maximal CPP; 1.6 vs 13.4 mmHg initial in non-ROSC vs ROSC; necessary, not sufficient — 18 patients ≥ 15 did not resuscitate) | Paradis 1990, *JAMA* 263:1106–13, n = 100 | [H] |
| Onset of contractile failure at zero coronary flow, human | **12 ± 5 s** to wall-motion abnormality; ECG change later (64 % at 20 s, 86 % at 60 s); recovery 43 ± 17 s | Wohlgelernter 1986, *JACC* 7:1245–54 | [H] |
| Same, dog | abnormal shortening ≈ 5 s, paradoxical motion by ≈ 50 s | Tennant & Wiggers 1935, *Am J Physiol* 112:351 | [A] |
| Irreversible myocardial injury | ≈ **20 min** of occlusion; necrosis spreads subendocardium → epicardium | Jennings 1960; Reimer 1977, *Circulation* 56:786–94 | [A/T] |

**Cerebral.**

| Quantity | Number | Source | Strength |
|---|---|---|---|
| Classic autoregulatory plateau | ≈ 60–150 mmHg, but built from **between-subject pooled** data, not individual curves | Lassen 1959, *Physiol Rev* 39:183–238 | [T, now disputed] |
| Revised individual lower limit | nearer 70 mmHg in normotensive adults | Drummond 1997, *Anesthesiology* 86:1431–3 (editorial; exact figures [UNCONFIRMED]) | [D] |
| Measured lower limit, 225 patients on bypass | mean **66 mmHg**, 95 % prediction interval **43–90**; preoperative pressure predicts it only weakly | Joshi 2012, *Anesth Analg* 114:503–10 | [H] |
| Flow threshold for electrical failure | ≈ **15 mL/100 g/min** (evoked potentials lost) | Astrup, Siesjö & Symon 1981, *Stroke* 12:723–5 | [A/T] |
| Flow threshold for membrane failure / infarction | ≈ **6–10 mL/100 g/min**; between the two lies the **penumbra**: silent but viable | same | [A/T] |
| Loss of consciousness at abrupt total cerebral ischaemia | **6.4–6.9 s** | Rossen, Kabat & Anderson 1943, *Arch Neurol Psychiatry* 50:510–28 | [H] |
| EEG change after the last normal beat | mean **10.2 s** (82 of 93 induced arrests) | Clute & Levy 1990, *Anesthesiology* 73:821–5 | [H] |
| Lower limits of other beds | spinal cord ≈ 60 mmHg [A/T]; kidney classically ≈ 80 mmHg from animals, probably lower in man and shifted up by hypertension/diabetes/CKD; splanchnic autoregulates weakly | Meng 2019, *Crit Care Med* 47:436–48 | [review] |

**How long is MAP 25–35 tolerated?**

| Evidence | Number | Strength |
|---|---|---|
| Deliberate hypotension for aneurysm surgery: MAP held at **40 ± 1 mmHg**, reached in ≈ 5.7 min | Lam & Gelb 1983, *Anesth Analg* 62:742–8 | [H] |
| Modern deliberate hypotension convention: MAP 50–65, or ≤ 20–30 % below baseline | secondary/consensus | [T] |
| Historical controlled hypotension: complications ≈ 1 in 32, mortality ≈ 1 in 291 (AAGBI survey) | Hampton & Little 1953, *AMA Arch Surg* (case count [UNCONFIRMED]) | [H, historical] |
| Time-dependent organ injury at far **higher** pressures: AKI and myocardial injury rise below MAP 55, graded by exposure even at 1–5 min | Walsh 2013, *Anesthesiology* 119:507–15 | [H, observational] |
| Same, graded below MAP 65 or > 20 % below baseline | Salmasi 2017, *Anesthesiology* 126:47–65 | [H, observational] |
| Fixed-pressure animal shock (Wiggers model): MAP ≈ 50 for 90–120 min, then **MAP ≈ 30 for 45–60 min** → irreversible shock in ≈ 85 % even after retransfusion | secondary sources; original papers not retrieved | [A] |
| Cardiopulmonary bypass routinely run at MAP 40–50 mmHg with adequate **flow** | practice | [T] |
| Pressure is not pulsatile perfusion: the last QRS coincided with the last arterial pulse in only **19 %** of 480 dying patients; 14 % had transient resumption after pulselessness (longest 4 min 20 s) | Dhanani 2021, *NEJM* 384:345–52 | [H] |
| Palpable pulses overestimate pressure: with only femoral and carotid pulses, **83 %** had systolic < 70 mmHg (mean 66.4); with only a carotid pulse, 0 of 4 had systolic > 60 | Deakin & Low 2000, *BMJ* 321:673–4 | [H, small] |

**Reading.** The *concept* Ali describes is exactly the penumbra concept, and it is well evidenced in both beds: a
band where flow is insufficient but tissue is viable and **time is the variable**, below which function and then
membranes fail. The *number* is not a constant. A MAP of 30 in an anaesthetised, normothermic, slow-heart-rate
patient with a 20 mmHg diastolic pressure and a low LVEDP has a coronary driving pressure of ≈ 5–10 mmHg above
zero-flow and will fail within minutes; the same MAP on bypass with 2.4 L/min/m² of non-pulsatile flow is tolerated
for hours. The engine therefore should not acquire a "MAP < 35 → arrest" rule. It should let the coronary driving
pressure (already computed, `coronary.ts:163`) and the cerebral flow (already computed, `brain/model.ts:122`)
decide, with the right time constants — and **that is already the architecture**; what is wrong is the sizes (§5).

### 3.2 (ii) Does the agonal decline accelerate?

**For.**

- The classical positive-feedback account: Crowell & Guyton 1961 (*Am J Physiol* 201:893–6, "Evidence favoring a
  cardiac mechanism in irreversible hemorrhagic shock") and Guyton & Crowell 1964 ("Cardiac deterioration in shock.
  I. Its progressive nature") **[A/T]**: low pressure → low coronary flow → depressed contractility → lower output
  and pressure.
- A quantitative basis for acceleration: **above** the coronary autoregulatory limit, flow is held constant as
  pressure falls (so a 10 mmHg fall costs nothing); **below** it, flow is pressure-passive and roughly linear in
  (P − Pzf) (Canty 1988; Bellamy 1978) **[A]**. As P approaches Pzf the *fractional* loss of flow per mmHg goes to
  infinity. The same is true of the cerebral penumbra (Astrup 1981). So the second derivative of the decline is
  genuinely positive once the autoregulatory reserve is spent. **This is the strongest form of Ali's point and it is
  correct.**
- Asphyxial animal models show the ordered, increasingly rapid sequence: tachycardia and hypertension → bradycardia
  and hypotension → loss of pulsations with an organised ECG (DeBehnke 1995; Varvarousi 2011/2015) **[A]**.

**Against, or qualifying.**

- **No study was found that quantifies the HR 120→60→30→0 curve.** The dataset that could answer it
  (Dhanani 2021's DePPaRT waveforms) reports resumption events, not deceleration curves. The specific shape is
  **expert heuristic [UNCONFIRMED]** and should not become an acceptance criterion in that form.
- **The reflex route is a step, not a ramp.** Tilt and LBNP: stable, then MAP 94 → 50 and HR 90 → 57 *suddenly*
  (Sander-Jensen 1986/1988) **[H]**. Spinal-anaesthesia asystole arrives from a near-normal rate (Caplan 1988)
  **[H]**. Vasovagal EEG data show the whole event compressed into tens of seconds (van Dijk 2014) **[H]**. An
  engine that only has an accelerating ramp cannot teach the cliff, and the cliff is the thing that kills patients
  in theatre.
- **Bradycardia in haemorrhage is not necessarily terminal** (Sander-Jensen 1986: mean HR 73 at 36 % blood loss, all
  reversible; Barriot & Riou 1987: all 20 recovered with fluid alone; Demetriades 1998: bradycardia carried *lower*
  crude mortality) **[H]**. So "HR falling = the spiral has begun" is wrong as a general rule, and an engine that
  equates the two will teach a dangerous reflex: giving atropine (which Barriot & Riou found harmful) instead of
  volume.

**Reading.** Accept acceleration **for the metabolic/ischaemic path**, implemented as a mechanism (pressure-passive
flow below the autoregulatory limit, in both the coronary and cerebral beds) rather than as a rate-of-decline rule.
Add a **separate, fast, reversible reflex state** for the cliff. Do not write "the decline must accelerate" as a
test; write the two mechanisms and let the shapes emerge — which is Ali's own stated principle.

### 3.3 (iii) Reflex bradycardia versus ischaemic pump failure in acute preload loss

- **Reflex is faster.** Sympathoinhibition and vagal excitation develop over **seconds to a few tens of seconds**
  (§2.3, §2.9) and can produce asystole directly. Loss of consciousness follows in 6–7 s (Rossen 1943) **[H]**.
- **But "ischaemia takes time" is only half true.** Contractile failure at zero coronary flow begins at
  **12 ± 5 s** in man (Wohlgelernter 1986) **[H]**; it is *necrosis* that takes ≈ 20 min (Jennings 1960;
  Reimer 1977) **[A]**. In a true no-flow state the two paths converge inside a minute. The distinction that
  actually matters clinically is not "reflex vs ischaemia" but **"reversible on restoring preload vs not"**: the
  reflex event reverses on volume and position within seconds to a minute (Barriot & Riou 1987) **[H]**, whereas
  ischaemic pump failure needs the perfusion pressure restored and then recovers over minutes
  (43 ± 17 s for a 60 s human occlusion; far longer after global low flow).
- **What the anaesthetist is taught.** In sudden severe hypovolaemia, bradycardia means *give volume and raise the
  legs*, not *give atropine*; and an unexplained bradycardia after a spinal or in the beach-chair position is a
  reflex event until proven otherwise, treated with volume, vasoconstriction, position and — for the cardiac limb
  only — an antimuscarinic.
- **Engine consequence.** Ali's point (c) is right about the *order of events* and the *clinical lesson*, and
  should be implemented. It is wrong if it is taken to mean the coronary path is slow in absolute terms; the engine
  already has the coronary path with τ_down 20 s (`coronary.ts:17`), which is the right order of magnitude, and
  what it lacks is the reflex path entirely.

---

## 4. The four verdicts in full

### 4.1 (a) Perfusion floor — SUPPORTED WITH CONDITIONS

**Supported:** the two-zone structure, the claim that a measurable pressure is not perfusion, and the claim that
time is the variable in the upper zone. Evidence: Astrup 1981 penumbra thresholds; coronary zero-flow pressure
15–21 mmHg (Nanto 2001; Hoffman & Spaan 1990) against a diastolic pressure in the low 20s at MAP ≈ 30;
Paradis 1990's ≥ 15 mmHg for ROSC; Dhanani 2021 and Deakin & Low 2000 on pressure/pulse dissociation;
Walsh 2013 and Salmasi 2017 showing dose-by-time injury even at MAP 55–65.

**Conditions (where the evidence disagrees with the number):**
1. **No fixed MAP threshold.** Lam & Gelb 1983 held MAP 40 ± 1 deliberately; bypass runs 40–50; Wiggers-model dogs
   survived MAP ≈ 30 for 45–60 min before irreversibility. A neonate's normal MAP is 30–40.
2. **The variable is driving pressure and demand, not mean pressure.** The same MAP is lethal at HR 150 with an
   LVEDP of 25 and benign at HR 50 with an LVEDP of 8, because the coronary driving pressure
   (DBP − LVEDP) and the diastolic time fraction differ. The engine already computes both.
3. **"Imminent" must be given a time.** The defensible statement is: *sustained* MAP in the mid-20s to mid-30s with
   a coronary driving pressure near zero-flow is not survivable for more than a few minutes in an intact
   circulation, while a *nadir of seconds to ~1 min* is routinely survived — which is what the engine's own
   class III + propofol case shows (§5.6: 65 s below MAP 30, recovery to 59, no arrest) and which the induction
   literature supports.
4. **Therefore the old "safeguard" is wrong and the new rule must not be a threshold.** Ali is right that
   "nadir 26.6 mmHg, no arrest" is not an acceptance criterion. But the replacement is **not** "arrest below 35";
   it is "the coronary and cerebral consequences must be real at that pressure and must integrate over time" —
   which §5.6 shows they currently are not (CoPP 25 and `kIsch` only 0.82 at a MAP of 26).

### 4.2 (b) The spiral accelerates — SUPPORTED WITH CONDITIONS, and NOT SUPPORTED as a single shape

**Supported:** the mechanism and the direction. Crowell & Guyton; and the hard quantitative reason — below the
autoregulatory limit, flow is pressure-passive, so fractional flow loss per mmHg rises without limit as pressure
approaches zero-flow pressure.

**Not supported:**
1. The specific HR 120→60→30→0 curve has no study behind it that this audit could find **[UNCONFIRMED]**.
2. **A single accelerating ramp is the wrong model**, because the reflex collapse is a step (Sander-Jensen
   1986/1988; Caplan 1988; van Dijk 2014). The engine needs both shapes.
3. **Slowing is not always dying.** Sander-Jensen 1986, Barriot & Riou 1987 and Demetriades 1998 all show reversible
   bradycardic hypotension at 30–40 % blood loss. The "every bradycardia is the spiral" reading would teach
   atropine where volume is indicated.

**What to implement instead of a rate-of-decline rule:** the pressure-passive flow law in both beds, the metabolic
debt integrator the engine already has (`cor.hyp`, `kIsch`), plus a separate reflex state. Then *record* the
time course in the acceptance cells (§6.5) rather than *asserting* a shape.

### 4.3 (c) The fast path in acute low preload is reflex — SUPPORTED WITH CONDITIONS

**Supported:** Schadt & Ludbrook's phase 2 at ≈ 30 % loss / CO 60 % of baseline with abrupt rise in conductance and
relative bradycardia **[A/review]**; the human series (Sander-Jensen 1986, Barriot & Riou 1987, Demetriades 1998)
**[H]**; the perioperative incidence data (Carpenter 1992, Caplan 1988, Auroy 1997, Liguori 1998) **[H]**; onset in
seconds, reversal on volume **[H]**.

**Conditions:**
1. **Not necessarily Bezold–Jarisch.** Denervated transplanted hearts still faint (Fitzpatrick 1993; Scherrer 1990);
   Schadt & Ludbrook state the afferent origin is unknown in dogs and man; Hainsworth 1991 concludes the ventricular
   hypothesis is unproven in man **[D]**. Implement the **efferent pattern** driven by **several** afferents.
2. **Ischaemia is not slow in the functional sense** (12 ± 5 s to contractile failure at zero flow). The engine's
   coronary τ is already of the right order; the honest statement is that the reflex path is *earlier* and
   *reversible*, not that the ischaemic path is slow.
3. **It is a probabilistic event, not a deterministic one.** 13 % bradycardia in spinals, 7 % paradoxical
   bradycardia in pre-hospital haemorrhagic shock, > 20 % hypotensive-bradycardic events in beach-chair surgery.
   An engine that fires it every time will teach the wrong base rate; one that cannot fire it at all (today) teaches
   that it does not exist. A seeded hazard with a patient-dependent susceptibility is the right form — the same
   shape the engine already uses for arrest-onset rhythms (`arrest.ts:63–72`).

### 4.4 (d) Add all the cardiac reflexes — SUPPORTED

Teaching value is high (§6.4 ranks it), the inventory is thin (§5.11), and the architecture to carry them is
cheaper than eight patches (§6.2). The only disagreement is with "all": a few (Bainbridge in man, the
Hering–Breuer inflation reflex in the adult) are small or disputed and should be cheap afferent terms or deliberate
omissions with a comment, not mechanisms with their own constants.

---

## 5. Part 2 — what the engine does today, measured

All numbers from the scripts named in each table (`reflex-audit/` in the session scratchpad), engine fecbdcc,
seed 7.

### 5.1 Graded acute haemorrhage, awake (`exp-haem.ts awake`)

Bleed starts at t = 60 s, delivered over 600 s; spontaneous breathing; blood volume 4,900 mL; run to 2,700 s.

| % blood volume (mL) | HR 0 → peak (t of peak) | MAP 0 → nadir | MAP at 2,700 s | HR at 2,700 s | baro set point at end | lactate end | bradycardic phase? | arrest |
|---|---|---|---|---|---|---|---|---|
| 10 % (490) | 69.6 → 78.5 (765 s) | 96.1 → 93.0 | 95.0 | 78.1 | 95.3 | 1.0 | no | none |
| 20 % (980) | 69.6 → 88.7 (725 s) | 96.1 → 91.9 | 92.7 | 87.0 | 95.3 | — | no | none |
| 30 % (1,470) | 69.6 → 103.1 (670 s) | 96.1 → 83.1 | 84.2 | 84.1 | ~88 | — | no | none |
| 40 % (1,960) | 69.6 → 124.7 (670 s) | 96.1 → 76.0 | 76.8 | 87.9 | ~72 | — | no (HR falls only as the set point resets) | none |
| **50 % (2,450)** | 69.6 → **149.2** (675 s) | 96.1 → **59.6** | **62.6** | **88.5** | **60.5** | **7.6** | no | **none** |

Findings.

- **F1 (P1). A 50 % blood-volume loss is a stable state.** MAP bottoms at 59.6 at the end of the bleed and then
  **rises** to 62.6 while the heart rate falls 149 → 88. The cause is the baroreflex set point resetting downward in
  five steps (95.3 → 80.8 → 72.8 → 67.5 → 63.5 → 60.5 mmHg between 720 s and 2,400 s), at
  `baroreflex.ts:135–141` with `RESET_FRAC 0.05 / RESET_HOLD_S 420 / RESET_GAIN 0.35`. The error signal is
  therefore erased: `baro.es` 40.0 at 660 s → 5.4 at 2,700 s. Lactate 7.6 mmol/L and CO 2.9 L/min say the patient is
  in class IV shock; the reflex says he is at his set point. **There is no decompensated state** and no class IV
  picture to teach.
- **F2 (P1). No bradycardic phase anywhere.** The HR trajectory is monotone up then monotone down with the set
  point, in every arm. This follows directly from the static curve (§5.7): the reflex has no sympathoinhibitory
  branch.
- **F3 (P2). The pulse-pressure narrowing of class I–II is present but weak** (SBP 122 → 111 / DBP 81 → 83 at
  10 min of a 50 % bleed: PP 41 → 28). The cardiopulmonary limb is doing its job on SVR (1,205 → 2,112) and venous
  recruitment.
- **F4 (P1). Nothing reaches the "no-perfusion" zone awake, so P-1 cannot even be exercised awake.** `kIsch` stays
  1.00 and CoPP ≥ 59 in every awake arm.

### 5.2 The same under general anaesthesia (`exp-haem.ts ga`)

ETT + VCV 12 × 600 / PEEP 5 / FiO2 0.5 at t = 1 s; propofol 2 mg/kg + rocuronium 0.6 mg/kg + sevoflurane 2.0 %
from t = 30 s; bleed at 900 s over 600 s; run to 3,300 s.

| % blood volume | HR 0 → peak | MAP 0 → nadir | s below MAP 50 / 35 / 30 | min CoPP | min `kIsch` | min CBF rel. | time MAP 60→35 | 35→20 | 20→arrest | arrest |
|---|---|---|---|---|---|---|---|---|---|---|
| 10 % | 70.5 → 73.1 | 79.0 → 67.4 | 0 / 0 / 0 | 56.5 | 1.00 | 0.38 | — | — | — | none |
| 20 % | 70.5 → 76.5 | 79.0 → 53.7 | 0 / 0 / 0 | 47.7 | 1.00 | 0.35 | — | — | — | none |
| 30 % | 70.5 → 84.1 | 79.0 → **37.9** | **1,880** / 0 / 0 | 35.3 | 1.00 | 0.25 | — | — | — | **none** |
| 40 % | 70.5 → 93.2 | 79.0 → **21.8** | 1,570 / **1,440** / **805** | 20.7 | 0.40 | 0.12 | 245 s | — | — | **+1,965 s** (asystole, `lowFlow`) |
| 50 % | 70.5 → 90.7 | 79.0 → **11.1** | 245 / 120 / 80 | 9.6 | 0.14 | 0.03 | **215 s** | **95 s** | **25 s** | **+550 s** (asystole, `lowFlow`) |

Findings.

- **F5 (P1). The engine's own numbers contradict P-1 badly in the 40 % arm: 1,440 s (24 min) below MAP 35 and
  805 s (13.4 min) below MAP 30 before the arrest**, with `kIsch` only falling to 0.40. This is the cross-cutting
  audit item Ali asked for, in its worst form.
- **F6 (P1). The 30 % arm sits at MAP 38 for 31 minutes with `kIsch` = 1.00 and a coronary driving pressure of
  35 mmHg.** No ischaemia at all. Compare Canty 1988: endocardial function fails below a distal coronary pressure of
  ≈ 40. The reason is visible in `coronary.ts:208`: supply is normalised to the resting CoPP
  (`(cpp − P_ZF)/(cpp0 − P_ZF)`) and multiplied by the coronary flow reserve `cfr` (≈ 3–4 in a healthy patient), so
  a CoPP of 35 against a resting 77 still delivers ≈ 3 × 0.31 ≈ 0.95 of resting demand. **The flow reserve, not the
  pressure, is what holds the heart up**, and the reserve is applied with no limit on how low the pressure can be.
- **F7 (P2). The anaesthetised reflex is almost mute.** The HR peak at a 50 % loss is 90.7 against 149.2 awake,
  because propofol's and sevoflurane's `symp`/`gvHr` terms scale the delivered output
  (`rows-anaesthetic.ts:41,57`). Directionally right, but it means every GA haemorrhage arm is driven by the
  circuit, not by the reflex.
- **F8. The intervals do shorten (215 → 95 → 25 s in the 50 % arm)** — but the bleed is still running through all
  three, so this is the insult accelerating, not the body. §5.6 is the clean test.

### 5.3 Sudden preload loss (`exp-misc.ts preload`)

Ventilated as above; event at 300 s.

| Arm | HR 0 → peak (t) → min | MAP nadir | 60→35 | 35→20 | 20→arrest | arrest | min CoPP | min `kIsch` | min EtCO2 |
|---|---|---|---|---|---|---|---|---|---|
| Tension pneumothorax, severity 1 | 73.4 → 180 (+120 s) → **30** | 25.5 | 245 s | — | — | **+390 s** (asystole) | −4.8 | 0.17 | 7.8 |
| Tamponade accumulating 60 mL/min | 73.4 → 146.2 (+325) → 46.3 | 19.5 | **20 s** | **10 s** | **15 s** | **+375 s** | 2.7 | 0.12 | 15.3 |
| Massive PE, severity 1 | 73.4 → 132.8 (+1,345) → 109.2 | **41.8** | — | — | — | **+1,385 s** | **37.0** | **1.00** (LV) | 9.4 |
| Exsanguination 3 L over 180 s | 73.4 → 162.9 (+130) → 48.2 | 3.5 | **20 s** | **10 s** | 35 s | **+185 s** | 4.1 | 0.12 | 15.9 |
| Exsanguination 2 L over **60 s** | 73.4 → 160.4 (+80) → 112.5 | **51.7** | — | — | — | **none** | 50.0 | 0.95 | 19.3 |

Findings.

- **F9 (P1). 2 L (41 % of blood volume) lost in 60 seconds leaves a MAP of 51.7 and no arrest, ever.** The
  recruitable unstressed volume (`V0_RECRUIT_MAX_ML_KG 12` → 840 mL, `baroreflex.ts:48–50`) plus the humoral arm
  absorb it. In a patient this is a peri-arrest state. This is the single clearest demonstration that the engine has
  no reflex collapse: the faster and larger the insult, the *better* the engine copes, because its only defence is
  a fast one.
- **F10 (P2). Massive PE arrests with a MAP of 42, a CoPP of 37 and an LV `kIsch` of 1.00** — the arrest comes from
  the RV limb (`cor.kIschRv`, `coronary.ts:225–238`). Correct physiology, and worth keeping; but it shows the LV
  path has no sensitivity at these pressures.
- **F11 (P2). The bradycardias that do occur are metabolic and late.** In the tension-pneumothorax arm HR falls
  180 → 30 only after `kIsch` has dropped below `K_BRADY 0.5` (`model.ts:332`), 2–4 min into the event, and it
  then sits at exactly **30.0** — the clamp.

### 5.4 Apnoea and asphyxia (`exp-misc.ts asphyxia`)

| Arm | Event | HR course | MAP course | arrest | cause |
|---|---|---|---|---|---|
| Ventilator stopped (ETT, paralysed) | t = 300 s | 73 → 103 (at +300 s) → 46 (+360) → 31 (+540) → **30.0 held for 14 min** | 95 → 103 (+300) → 79 (+660) → 44.8 (+960) → 17.7 (+1,020) | **+685 s (11.4 min)**, `hypoxia`; agonal at +1,080, asystole at +1,260 | `cor.hyp` ≥ 0.9 |
| Spontaneous, ventilation source `none` | t = 300 s | 69.6 → 98.6 (+95) → 40.3 (+120) → **30.0** | 96 → 98.9 (+120) → 91.9 (+240) → 44.9 nadir | **+470 s (7.8 min)**, `hypoxia` | same |
| `airway obstructed` with an ETT and the ventilator running | t = 300 s | 73 → 85 over 25 min | 95 → 97 | **none** | — |

Findings.

- **F12 (P1). The sequence is right in shape and the timing is inside DeBehnke's window, which is FU-3/FU-8's
  achievement** (early tachycardia and hypertension, then bradycardia and hypotension, then pulselessness with an
  organised rhythm). Keep it.
- **F13 (P1). But the bradycardia is entirely a pacemaker-depression artefact, not a chemoreflex.** `chemoFactors`
  (`model.ts:241–250`) does give a bradycardic branch below SaO2 60 % (or in neonates/infants), but the measured
  fall from 103 to 46/min inside 60 s coincides with `cor.hyp` rising and `saF` falling 1.0 → 0.4 → 0.1; the floor
  of 30/min is then held for 14 minutes while the pressure decays. **A reflex bradycardia and a dying pacemaker are
  indistinguishable in the engine, and the second is the only one with any depth.**
- **F14 (P2). EtCO2 is not informative in the ventilator-off arm** (held at 35), because there is no gas flow to
  sample — worth knowing for the teaching case, not a reflex finding.
- **F15 (P2). `airway obstructed` on an ETT with the ventilator attached does nothing.** Reported for the
  record; not pursued (the airway path is 7b's).

### 5.5 Class III haemorrhage + propofol: the P-1 case re-measured (`exp-haem.ts s6a`)

Clinical-suite S6a rig exactly: ventilated, bleed 1,500 mL over 600 s from t = 60 s, propofol 2 mg/kg at 960 s.

| Arm | pre-dose MAP / HR | MAP nadir (t) | s below 35 | s below 30 | min CoPP | min `kIsch` | min CBF rel. | HR min | MAP at 2,700 s | arrest |
|---|---|---|---|---|---|---|---|---|---|---|
| **S6a + propofol 2 mg/kg (ventilated)** | 82.8 / 116.3 | **26.3** (+60 s) | **115** | **65** | 25.0 | **0.82** | 0.17 | 79.9 | **58.8** | **none** |
| S6a control (no propofol) | 82.8 / 116.3 | 77.4 | 0 | 0 | 70.2 | 1.00 | 0.92 | 87.3 | 77.8 | none |
| S6a + propofol, **spontaneous** (not ventilated) | 88.6 / 97.5 | 30.3 | 75 | 0 | 15.0 | 0.79 | 0.40 | **30.0** | 71.5 | none |
| Same rig with **1,715 mL (35 %)** + propofol | 75.4 / 124.9 | **17.8** | 70 | 65 | 15.8 | **0.24** | 0.09 | 60.0 | 4.0 | **+105 s** (`lowFlow`, from sinus → asystole) |

Findings.

- **F16 (P1). The nadir is 26.3 mmHg for 65 s and the patient then recovers to 59.** Ali is right that this cannot
  be an acceptance criterion in the form "no arrest, therefore fine" — but the right objection is **not** that it
  should have arrested. A 60-second nadir at MAP 26 with a coronary driving pressure of 25 mmHg is, by the
  literature in §3.1, survivable. The real defects are: (i) the coronary driving pressure of **25 mmHg** is well
  above the zero-flow pressure and `kIsch` therefore only reaches 0.82, so **nothing is accumulated** — there is no
  debt to pay back; (ii) relative cerebral flow falls to **0.17**, which is below Astrup's electrical-failure
  threshold, and nothing happens to the patient's brain, breathing or EEG-equivalent; (iii) the recovery is
  complete, as if the episode had never happened.
- **F17 (P1). The threshold between "recovers fully" and "arrests in 105 s" is 215 mL of blood (1,500 → 1,715).**
  The engine has a near-cliff where the literature has a graded, time-weighted risk. That is the signature of a
  model whose only low-flow mechanism is a hard arrest rule plus a flow reserve that holds everything up until it
  does not.
- **F18 (P2). In the spontaneous arm the heart rate falls to the 30/min clamp** while MAP is 30 and CoPP 15 — the
  propofol apnoea adds hypoxia, and the two depressions stack. Clinically this looks like the right picture by
  accident.

### 5.6 Is the decline self-sustaining? (the clean test)

The 40 %/50 % GA arms and the exsanguination arms all keep bleeding while the pressure falls, so their shortening
intervals are not evidence of positive feedback. The S6a propofol arm is the clean test: a **fixed, finite** insult
(one bolus on a completed bleed) drives MAP to 26.3 and the engine then **recovers monotonically to 58.8** with no
residue. The 1,715 mL arm, 215 mL further on, arrests in 105 s.

**Reading:** the engine has a *latent* positive-feedback loop (`kIsch` → contractility → CoPP → `kIsch`) but it has
a **dead zone**: because supply is `cfr × (CoPP − 15)/(CoPP₀ − 15) × (DTF/DTF₀)` with `cfr ≈ 3–4`, the loop gains
less than unity until CoPP is close to `P_ZF`. So the engine's behaviour is bistable — full recovery or arrest in
~100 s — rather than an accelerating spiral. **Ali's point (b) is not implemented, and neither is the bounded,
reversible low-perfusion state the literature describes.**

### 5.7 The baroreflex curve, static and dynamic (`exp-baro.ts`)

**(a) Static.** Unit sweep of `stepBaro` (pure function, 600 s per point, set point pinned at 95.3, gains of a
healthy 40-year-old: `gVagal 15`, `gSymp 1`, no β-blockade).

| MAP | `e_s` | vagal RR increment (ms) | HR × | SVR × | Ees × | ΔV0 (mL) | cSv × | HR from a resting 70 |
|---|---|---|---|---|---|---|---|---|
| 160 | −64.7 | +194 | 0.74 | 0.61 | 0.84 | +240 | 1.04 | 44.4 |
| 140 | −44.7 | +134 | 0.82 | 0.73 | 0.89 | +240 | 1.03 | 50.9 |
| 120 | −24.7 | +74 | 0.90 | 0.85 | 0.94 | +148 | 1.01 | 58.5 |
| 110 | −14.7 | +44 | 0.94 | 0.91 | 0.96 | +88 | 1.01 | 62.8 |
| 100 | −4.7 | +14 | 0.98 | 0.97 | 0.99 | +28 | 1.00 | 67.6 |
| **95.3 (set)** | 0 | 0 | 1.00 | 1.00 | 1.00 | 0 | 1.00 | 70.0 |
| 90 | +5.3 | −16 | 1.21 | 1.11 | 1.04 | −106 | 0.99 | 86.8 |
| 85 | +10.3 | −31 | 1.41 | 1.21 | 1.08 | −206 | 0.98 | 104.1 |
| **80** | +15.3 | −46 | **1.60 (sat.)** | 1.31 | 1.12 | −306 | 0.97 | 122.5 |
| 70 | +25.3 | −76 | 1.60 | 1.51 | 1.20 | −506 | 0.95 | 130.5 |
| **60** | +35.3 | −106 | 1.60 | **1.60 (sat.)** | 1.28 | −706 | 0.93 | 139.6 |
| 50 | +45.3 | −136 | 1.60 | 1.60 | 1.36 | −800 (cap) | 0.91 | 150.1 |
| 40 | +55.3 | −166 | 1.60 | 1.60 | 1.44 | −800 | 0.89 | 162.2 |
| 30 | +65.3 | −196 | 1.60 | 1.60 | 1.52 | −800 | 0.87 | 176.6 |
| 20 | +75.3 | −200 (cap) | 1.60 | 1.60 | 1.60 | −800 | 0.85 | 178.7 |
| 10 | +85.3 | −200 | 1.60 | 1.60 | 1.60 | −800 | 0.83 | 178.7 |

Gains at the operating point: vagal **3.0 ms/mmHg** (95 → 85), HR **−3.3 bpm/mmHg** on the hypotensive side and
**−0.48 bpm/mmHg** on the hypertensive side (the `SYMP_WITHDRAW_HR 0.1` asymmetry), SVR **2 %/mmHg**.

- **F19 (P1). Monotone, with no sympathoinhibitory branch and no bradycardic region anywhere below the set point.**
  Combined with the 30/min clamp this is the structural reason Ali's point (c) is unreachable.
- **F20 (P2). The HR arm saturates only 15 mmHg below the set point (MAP 80) and the SVR arm at 35 mmHg below
  (MAP 60).** Below MAP 60 the reflex contributes nothing new except the slowly growing contractility term and the
  vagal-withdrawal RR cap: the whole of the "severe shock" range is on a plateau. Literature puts carotid-sinus
  threshold at ≈ 50–60 mmHg, so the saturation pressure is roughly right; the problem is that nothing *else* takes
  over there (no CNS ischaemic response, no humoral escalation beyond the existing arm, no sympathoinhibition).
- **F21 (P2). The steady-state vagal gain is 3.0 ms/mmHg**, against 15.7 ± 9.2 ms/mmHg (mixed age) and 19–21 in
  healthy young adults by the modified Oxford method. The file knows this (`VAGAL_STEADY 0.2`, with the comment that
  the sequence-method value overstates the steady state) and has traded the resting gain for a correct *pressor
  test* result; §5.7(b) shows the trade in numbers.

**(b) Closed loop, drug tests.** (Each drug also has direct vascular effects, so these are reflex *plus* drug.)

| Arm | MAP 0 → peak/trough (t) | HR 0 → extreme (t) | ΔMAP | ΔHR | pressor BRS (ms/mmHg) | SVR 0 → extreme |
|---|---|---|---|---|---|---|
| Phenylephrine 100 µg, awake 40 y | 95.7 → 121.9 (+50 s) | 73.4 → 58.3 (+60 s) | +26.2 | −15.1 | **8.1** | 1,306 → 1,913 |
| Nitroglycerin 100 µg, awake 40 y | 95.7 → 90.1 trough (+15 s) | 73.4 → 92.4 (+45 s) | −5.6 | **+19.0** | — | 1,306 → 1,263 |
| Phenylephrine after propofol 2 mg/kg | 80.1 → 119.0 (+60 s) | 71.2 → 63.5 (+70 s) | +38.9 | −7.6 | **2.6** (32 % of awake) | 1,062 → 1,772 |
| Phenylephrine at ≈ 1 MAC sevoflurane | 80.4 → 113.0 (+55 s) | 71.1 → 65.5 (+50 s) | +32.6 | −5.6 | **2.2** (27 % of awake) | 1,058 → 1,670 |
| Phenylephrine, 80 y | 109.1 → 141.0 (+30 s) | 69.4 → 57.8 (+80 s) | +31.9 | −11.6 | **5.4** (67 % of awake) | 1,548 → 2,306 |
| Phenylephrine, β-blocked profile | 93.8 → 121.0 (+60 s) | 60.3 → 54.4 (+70 s) | +27.2 | −5.8 | **3.9** | 1,284 → 1,893 |

- **F22. The pressor test is well calibrated**: HR −15 for MAP +26 awake is inside the textbook band
  (HR −5 to −15 for MAP +15 to +25), and the anaesthetic depression (to 27–32 % of awake) matches Nagasaki 2001's
  −50 to −60 % pressor BRS and Kotrly 1984's direction. The age effect (67 % of awake at 80 y) is in the right
  direction but **too small**: the literature's ratio is closer to 7/20 = 35 %.
- **F23 (P2). The depressor side is asymmetric in the wrong proportion for teaching:** nitroglycerin gives
  ΔMAP −5.6 with ΔHR +19, i.e. the engine answers a small pressure fall with a large tachycardia (the `SYMP_WITHDRAW`
  0.3 / `SYMP_WITHDRAW_HR` 0.1 asymmetry only applies on the *hypertensive* side). Reflex tachycardia to a
  vasodilator is real, but +19/min for −6 mmHg is steep.

### 5.8 Bainbridge: rapid volume loading (`exp-misc.ts bainbridge`)

| Arm | HR 0 | HR peak (t) | HR min | MAP 0 → max | CVP 0 → max |
|---|---|---|---|---|---|
| 2 L crystalloid over 10 min, β-blocked profile (HR 60) | 60.3 | **60.4** (+95 s) | 58.6 | 93.8 → 94 | 7.6 → ~11 |
| 2 L over 10 min, normal adult | 73.4 | **73.3** | 66.4 | 95.7 → 96 | 7.4 → ~11 |
| 1 L over 2 min, β-blocked profile | 60.3 | **60.4** | 59.0 | 93.8 → 94 | 7.6 → ~11 |
| 1 L over 2 min, awake normal | 69.6 | **69.8** | 66.7 | 95.7 → 96 | 4.4 → ~8 |

- **F24 (P2). There is no Bainbridge reflex: the largest rate change to a 2 L load is +0.1/min, and the net effect
  is a *fall* of 1.7–7.0/min** (the arterial baroreflex answering the small pressure rise). The cardiopulmonary limb
  has no chronotropic arm by construction (`baroreflex.ts:45–47`: `G_CP_R` on SVR and `G_CP_V` on venous volume
  only). Given that the human Bainbridge effect is small and disputed (Crystal & Salem 2012), the *absence* is
  defensible; what is not defensible is that the **same missing arm** is what would carry the reverse Bainbridge,
  i.e. the rate fall of reduced venous return — which is one of the two candidate mechanisms for Ali's point (c).

### 5.9 Representability probe (`exp-misc.ts probe`)

| Command | Result |
|---|---|
| `stimulus {intensity, site:'carotid'}` | **REJECTED** — "site must be laryngoscopy, oculocardiac, peritoneal" |
| `condition {id:'neuraxialBlock'}` | **REJECTED** — "condition neuraxialBlock arrives in Stage 7" |
| `condition {id:'vasovagal'}` | **REJECTED** — "condition vasovagal arrives in Stage 7" |
| `drug bupivacaine route:'intrathecal'` / `'epidural'` | accepted — **but `route` is never read anywhere in `l2/pk/`**, so it is dosed as an IV bolus (LAST), not a block |
| `thermal {anaesthesia:'neuraxial'}` | accepted — reaches only `l2/thermal/heat.ts:124,140` (redistribution and skin loss) |
| `drug hexamethonium` | **REJECTED** — unknown drug (so no ganglionic-blockade reference for resting tone) |
| `renal {iapMmHg:15}` | accepted — renal/organ input only; research/21 S4 measured 0 circulatory effect |
| `position {headUpDeg:70}` | accepted — brain hydrostatics only; research/21 S6 measured 0 systemic effect |
| `atropine 0.5 mg`, `glycopyrrolate 0.2 mg` | accepted (muscarinic occupancy, `rows-cardiovascular.ts:24,27`) |

**Experiment 3 of the brief (spinal-like sympathectomy) is therefore NOT EXPRESSIBLE** and is reported as such.

### 5.10 The stimulus-driven vagal events, Cushing and the chemoreflex (`exp-misc.ts reflex`, `exp-chemo2.ts`)

**(a) The three vagal sites.** Traction applied at 1,200 s, released at 1,320 s; sevoflurane maintenance.

| Arm | HR before | HR at +30 s | % fall | HR at +120 s (end of traction) | HR 30 s after release | MAP before → during | `vagalStim` |
|---|---|---|---|---|---|---|---|
| Oculocardiac, **4 y 16 kg**, sevo 2.5 % | 103 | **58.3** | **−43 %** | 78.2 (fatigue τ 120 s) | 110 | 62.6 → **69.2** | 600 ms |
| Oculocardiac, **adult**, sevo 2.5 % | 71.0 | **47.3** | **−33 %** | 59.5 | 75.6 | 82.4 → **87.8** | 600 ms |
| Peritoneal traction, adult | 71.4 | **47.8** | **−33 %** | 60.2 | 77.1 | 84.6 → **89.7** | 600 ms |
| Laryngoscopy site, adult, after propofol | 75.8 | **59.5** | **−21 %** | — (released at +60 s) | 79.6 | 74.5 → **85.1** | 300 ms |

- **F25 (P1, already owned by research/21 S2). The laryngoscopy site makes an adult bradycardic** (−21 %), where
  the adult response is a pressor one with a *rise* in rate (Shribman 1987). The site is not age-scaled and not
  intensity-scaled (`VAGAL_STIM_PER_INTENSITY.laryngoscopy = false`, `model.ts:70`).
- **F26 (P1, new). There is no age dependence in the vagal sites at all:** the oculocardiac reflex takes an adult
  from 71 to 47 (−33 %) and a 4-year-old from 103 to 58 (−43 %) — nearly the same fractional fall, where the
  clinical teaching is that the reflex is a paediatric phenomenon and that incidence and depth fall with age.
- **F27 (P2, new). Every vagal event *raises* the blood pressure** (MAP 84.6 → 89.7 on peritoneal traction;
  62.6 → 69.2 in the child; 74.5 → 85.1 on laryngoscopy). The slower rate fills the ventricle better and the engine
  has no vasodepressor limb to go with the bradycardia, so the monitor shows "HR down, BP up" where the clinical
  picture is bradycardia with a falling or flat pressure. This is the same missing vasodepressor limb as §0.2 gap 4.
- **F28. The fatigue term works** (600 ms decaying with τ 120 s: HR 58 → 65 → 72 → 78 across two minutes of
  continuous traction) and recovery on release is immediate. Keep it.

**(b) Cushing.** Expanding mass lesion at 1.0 mL/min from 300 s, ventilated, run to 3,300 s.

| t (s) | ICP | relative CBF | Cushing drive | HR | MAP |
|---|---|---|---|---|---|
| 360 | 9.5 | 0.8 | 0 | 73.3 | 96.8 |
| 1,200 | 17.0 | 0.8 | 0 | 73.1 | 95.7 |
| 2,400 | 23.7 | 0.8 | 0 | 73.2 | 96.8 |
| 3,000 | 36.6 | 0.8 | 0 | 73.2 | 96.6 |
| 3,240 | **43.4** | 0.7 | **0** | **73.2** | **96.5** |

- **F29 (P2). At an ICP of 43 mmHg in a normotensive patient the Cushing response has still not fired.** The two
  triggers (`cushing.ts:19`) are a pre-surge CPP < 40 or an ICP within 10 mmHg of head MAP, and with MAP ≈ 96 the
  head CPP is ≈ 43 — just above threshold. So the response needs ICP ≳ 46 here. That is internally consistent and
  arguably correct, but it means the Cushing demonstration needs a much larger lesion than a 50-minute 1 mL/min
  bleed, and the 50 minutes of rising ICP produce **no cardiovascular sign at all** — relevant to the showcase and
  to teaching, since clinically the triad is a late but not that late sign.

**(c) Chemoreflex.**

| Arm | Stimulus achieved | HR | MAP | SVR | Expected |
|---|---|---|---|---|---|
| Fixed low minute ventilation (3 × 200 mL) from 600 s | PaCO2 33 → **69.2**, EtCO2 29.5 → 60.9 | 73.3 → **83.0** (+13 %) | 96.7 → 102 | 1,298 → 1,464 (+13 %) | tachycardia + pressor response — **correct direction**, magnitude capped at +20 % (`model.ts:248`) |
| FiO2 0.21 + complete atelectasis, **paralysed and ventilated at a fixed minute volume** | SaO2 97.9 → **78.6**, PaO2 103 → 39.5 | 73.4 → **85.0 (+16 %, tachycardia)** | 96.1 (flat) | 1,302 → 1,368 | **bradycardia** — primary chemoreflex with ventilation prevented (de Burgh Daly; Daly 1997) |
| FiO2 0.10 attempt | **REJECTED** — "fio2 must be a finite number in 0.21–1" | — | — | — | — |

- **F30 (P1, new). The chemoreflex has the wrong sign in exactly the patient the anaesthetist worries about.** A
  paralysed, ventilated adult desaturating to 79 % at a fixed minute ventilation gets a **16 % tachycardia**. The
  bradycardic branch exists but is gated on `band === 'neonate' || band === 'infant' || sao2 < 0.6`
  (`model.ts:245`), i.e. by *age* and by an *extreme* saturation, not by whether ventilation can rise. The missing
  variable is the lung-inflation reflex, which is what converts the primary bradycardia into tachycardia in a
  breathing subject. Below SaO2 60 % the branch does flip, but by then `cor.hyp` is also depressing the pacemaker,
  so the two are indistinguishable (§5.4 F13).
- **F31 (P2). The hypercapnic arm is a single capped linear term on both HR and SVR** with no separate central and
  peripheral components and no interaction with the vagal sites (clinically hypercapnia *potentiates* the
  oculocardiac reflex).

### 5.11 Inventory: what exists, where

| Reflex | State in the engine | File:line | Mechanism, inputs, outputs |
|---|---|---|---|
| **Arterial baroreflex** | **REAL** | `l2/circ/baroreflex.ts:8–160`, stepped from `l2/circ/model.ts:283–285` at 10 Hz | `e = set·setF − LPF₁ₛ(MAP + K_PP·ΔPP)`; vagal limb delay 0.3 s / τ 1 s → RR increment (cap +600/−200 ms); sympathetic limb delay 2.5 s / τ 10 s, saturating at ±0.6 → HR ×, SVR ×, Ees ×, venous V0 −, venous compliance ×. Gains `G_HS 0.04`, `G_R 0.02`, `G_C 0.008`, `G_V 20 mL/mmHg`, `G_CSV 0.004`; asymmetric withdrawal (`SYMP_WITHDRAW 0.3`, `SYMP_WITHDRAW_HR 0.1`); `VAGAL_STEADY 0.2` on the vagal gain. Inputs: beat MAP and pulse pressure, profile gains (`profile.ts:93–98` by age band), β-blockade, drug `gv`/`gvHr`/`symp`/`setF`, brainstem perfusion `brainstemOutF(cbfRel)`. Drives the HR request and the circuit's resistance, elastance and venous terms |
| Baroreflex **resetting** | REAL but unbounded | `baroreflex.ts:34–36, 135–141` | `|MAP − set| > 5 %` held 420 s → `set += 0.35·(MAP − set)`; no limit, no floor, no distinction between acute and chronic. §5.1 F1 |
| **Cardiopulmonary (low-pressure) limb** | **PARTIAL** — vasomotor only | `baroreflex.ts:38–47`, `:148–149`, `:155,157` | `e_cp = RA_tm,set − LPF₃ₛ(RA transmural)`, clamped ±10 mmHg → SVR × and venous V0 −. **No rate arm, no atrial-stretch rate effect, no vasopressin coupling** |
| Pulsatility sensing | REAL (small) | `baroreflex.ts:51–55`, `model.ts:266–269` | `sensed = MAP + 0.3·(PP − PP_rest)` |
| Brainstem perfusion of the vasomotor centre | REAL | `baroreflex.ts:56–75`, `organs/effects.ts:42` | delivered sympathetic output × ramp from `cbfRel` 0.2 → 0.6. This is a *failure* term, not a CNS ischaemic *response* |
| **Bezold–Jarisch / sympathoinhibition of low preload** | **ABSENT** (prototyped and withdrawn) | comment only, `model.ts:72–75` | The withdrawn prototype was `800 ms × (0.35 − EDV/rest)/0.35`. Nothing reads LVEDV as a reflex input today |
| **Bainbridge / reverse Bainbridge** | **ABSENT** | — | §5.8; the cardiopulmonary limb has no chronotropic arm |
| **Arterial chemoreflex** | **PARTIAL** | `model.ts:240–250` (`chemoFactors`), inputs written at `l2/hemo/pipeline.ts:409` | `hyp = max(0, 0.85 − SaO2)`: HR × min(1.3, 1 + 1.2·hyp) in adults, or ×max(0.5, 1 − 2.5·hyp) in neonates/infants **and in anyone below SaO2 60 %**; hypercapnia `+1 %/mmHg above PaCO2 50`, capped +20 %, on both HR and SVR. **No ventilation gating** (the inflation reflex that inverts the sign is absent), no separate vascular arm, no interaction with depth, and the inputs are SpO2 and EtCO2 + 5, not PaO2/PaCO2 |
| Asphyxial arrest path | REAL | `l2/circ/hypoxic-arrest.ts:20–42`, `coronary.ts:50` (`TAU_HYP_S 235`) | `cor.hyp ≥ 0.9` declares it; onset rhythm VF 0.1 / asystole 2/30 / PEA. §5.4 |
| **Cushing response** | **REAL** | `l2/brain/cushing.ts:1–36`, params `l2/brain/params.ts:64–72`, applied `l2/organs/effects.ts:35–44` | Triggers: pre-surge CPP < 40 mmHg, **or** ICP within 10 mmHg of head MAP, held 30 s, and only while ICP > 22. Drive 0–1, τ_on 15 s / τ_off 60 s; MODELED effect is `ext.rSysF = 1 + 1.2·drive` and the bradycardia is left to the baroreflex (`effects.ts:41`), plus ataxic breathing. MANUAL writes coupled SBP/DBP and an HR request |
| **CNS ischaemic response** (systemic hypotension, Guyton) | **ABSENT** | — | Explicitly excluded: `brain/model.ts:148–152` says a low CPP from systemic hypotension alone is "the circulation's business". The only thing in that range is the *failure* ramp `brainstemOutF`, which has the opposite sign |
| **Oculocardiac / peritoneal / laryngoscopy vagal events** | **PARTIAL** | `model.ts:62–75` (`VAGAL_STIM_MS` laryngoscopy 300, oculocardiac 600, peritoneal 600 ms; `VAGAL_STIM_FATIGUE_S 120`), `model.ts:252–261`, site list `types-neuro.ts:32–33` | Additive RR increment × (1 − muscarinic occupancy), × stimulus intensity for oculocardiac and peritoneal but **not** laryngoscopy. Clamped by the 30/min floor. research/21 S2 records the adult-laryngoscopy sign error; S8 the non-per-kg atropine |
| **Trigeminocardiac** more generally | ABSENT | — | Only the ocular branch exists, as a site name |
| **Carotid sinus** | ABSENT | rejected, §5.9 | — |
| **Vasovagal syncope** | ABSENT | rejected, §5.9 | — |
| **Diving reflex** | ABSENT | — | No facial-immersion or cold-stimulus input |
| **Hering–Breuer / lung-inflation cardiac reflex** | ABSENT | — | No inflation afferent to the circulation; the chemoreflex is therefore ungated (above) |
| **Respiratory sinus arrhythmia** | **PARTIAL** (ECG-level only) | `l2/ecg/hrv.ts:9–39`, `l2/ecg/atria.ts:196–212`, default `modifiers.ts:12` (`rsa 0.67`, `hrvScale 1`) | `RR = RR̄ + 0.06·rsa·RR̄·k·sin(breath phase) + LF + ε`; follows the real breath clock when one exists. It is a **waveform decoration**, not a vagal output: it does not scale with vagal tone, is not abolished by atropine, does not fall with anaesthetic depth or age, and does not change under positive-pressure ventilation |
| **Somatosympathetic response to surgery** | **REAL** (non-baroreflex path) | `l2/endo/hormones.ts:65–86`, params `l2/endo/params.ts:5–11`, effects `l2/endo/effects.ts:45–72` | `symp` 0–3 from `noxious × (1 − antinoc)` + condition drives, τ_on 25 s / τ_off 180 s → HR ×(1 + 0.18·symp), SVR ×(1 + 0.2·symp), Ees ×(1 + 0.15·symp), venous −3 %/unit; plus endogenous epinephrine (τ½ ≈ 2 min) with β1/β2/α Hill terms, and cortisol. Also the humoral (AVP + AT II) arm `hum`, driven by baroreceptor **unloading** below the set point, **not** suppressed by anaesthetics (`hormones.ts:70–73`) — the nearest thing the engine has to a second autonomic layer |
| **CO2 pneumoperitoneum** | ABSENT (circulatory) | `renal` input only | research/21 S4: IAP 14 changes CO, SVR, MAP, Crs, Ppeak, FRC and urine output by 0 |
| **Valsalva** | NOT EXPRESSIBLE | — | No strain input |
| Pacemaker-level depressions that masquerade as reflexes | REAL | `model.ts:49–60, 332–334` | `G_SA 1.5` per unit hypoxic deficit; `K_BRADY 0.5` / `G_SA_ISCH 1.2` ischaemic; `G_SA_K 0.12` per mmol/L of K above 7; shared by every pacemaker through `saF` |
| **The rate floor** | — | `model.ts:342` | `hrModel = min(hrMax, max(30, 60/rr))` — **the single most important line in this audit** |

---

## 6. Part 3 — gaps and a proposed architecture (proposal only)

### 6.1 Reflex × state × target × smallest mechanism

| Reflex | State | Evidence-based target behaviour (numbers, source) | Smallest mechanism to add | Layer / file that would own it | Reads | Drives |
|---|---|---|---|---|---|---|
| Arterial baroreflex | present | Pressor test HR −5…−15 for MAP +15…+25; cardiac BRS 15–20 ms/mmHg young, ≈ 7 at 70 y (modified Oxford); anaesthetic depression to 25–50 % | keep; make the age ratio ≈ 0.35 not 0.67; give the vagal limb a tonic level (see B4 note) so the resting gain can be 15 ms/mmHg **and** the pressor test stay correct | `l2/circ/baroreflex.ts` | — | — |
| Baroreflex **resetting** | present, unbounded | acute resetting is partial and bounded; chronic takes days; it re-centres gain, it does not abolish the defence | **bound it**: a maximum excursion from the profile set point (e.g. ±15 mmHg acute), and suspend it while any "distress" index is non-zero (lactate rising, `kIsch` < 1, `hum` > 0) | `baroreflex.ts:34–36,135–141` | lactate / `kIsch` / `hum` | the set point |
| Cardiopulmonary limb | partial (no rate arm) | low-level LBNP (−10…−20) raises peripheral resistance ≈ 25–30 % with no HR or MAP change | add the **rate arm** of the same limb (small, bidirectional) — this is both Bainbridge and reverse Bainbridge | `baroreflex.ts` (`G_CP_HR`) | RA transmural pressure (already there) | the HR request |
| **Sympathoinhibitory reflex of low preload** (BJR / vasovagal / reverse Bainbridge, one mechanism) | **absent** | fires at CO ≈ 60 % of baseline / ≈ 30 % blood loss (Schadt & Ludbrook); abrupt: MAP 94→50, HR 90→57 within seconds (Sander-Jensen 1986/88); incidence 7 % of pre-hospital haemorrhagic shocks (Barriot & Riou), 13 % of spinals (Carpenter), > 20 % of beach-chair cases (Liguori); reverses on volume alone | **one central state `reflexInhib` (0–1)**: a seeded hazard whose rate rises with an afferent score (unloaded cardiopulmonary receptors + low LVEDV + high ventricular contractility + head-up posture + susceptibility), τ_on ≈ 5 s, τ_off ≈ 30 s, decaying when preload is restored. Output: a **negative** multiplier on the delivered sympathetic output (vasodepressor limb) **and** a large additive vagal RR increment (cardioinhibitory limb, antimuscarinic-sensitive) | **new** `l2/circ/reflex-inhib.ts`, stepped from `model.ts` control | RA transmural pressure, LVEDV/rest, `kLv`, head-up degrees, profile susceptibility, muscarinic occupancy | `outF` (down), the vagal RR term, `saF` not at all |
| **The rate floor** | blocker | reflex bradycardia reaches 30–40/min and asystole | lower the clamp to ≈ 15/min **and** give the vagal path a route to sinus arrest (a request for `sinusPause` / `asystole` when the vagal RR increment exceeds the cycle length) | `model.ts:341–342` + `l2/circ/rate-rule.ts` | the vagal terms | the rhythm request |
| **Chemoreflex** | partial | primary bradycardia at constant ventilation; tachycardia when ventilation rises (de Burgh Daly); adults answer isolated hypoxia with tachycardia only because they breathe | **gate the sign by ventilation**: the bradycardic branch applies when minute ventilation cannot rise (paralysed, apnoeic, fixed ventilator) and the tachycardic branch when it can; use PaO2/PaCO2 truths, not SpO2/EtCO2 + 5 | `model.ts:240–250` + `l2/hemo/pipeline.ts:409` | `resp` truths, ventilation source and whether VE is rising | HR ×, SVR × |
| **Lung-inflation cardiac reflex** | absent | moderate inflation → vagal withdrawal → tachycardia; large inflation → bradycardia and hypotension | one term from tidal volume relative to rest, feeding the same vagal path (negative for moderate, positive for very large) | `l2/circ/` consuming 7b's breath state | VT/VT_rest, breath phase | the vagal RR term |
| **RSA** | partial (decoration) | vagal; abolished by atropine; larger at slow rates; falls with age and depth | drive `Modifiers.rsa` **from** the vagal tone the hub computes (× (1 − muscarinic occupancy), × age factor, ÷ breathing frequency) instead of from a constant | `l2/ecg/hrv.ts` consumer side; the value set by the autonomic hub | vagal tone, muscarinic occupancy, breath period | the ECG RR series |
| **CNS ischaemic response** | absent | insignificant above MAP 60, maximal at MAP 15–20, can raise pressure dramatically; "last-ditch stand" (Guyton) | a **positive** sympathoexcitatory term from the same `cbfRel` that `brainstemOutF` already reads, acting in the 0.3–0.6 band and overridden by the existing failure ramp below 0.2 | `baroreflex.ts` beside `brainstemOutF` | `ext.cbfRel` | the delivered sympathetic output, up |
| **Cushing** | present | CPP < 40 for > 30 s → MAP +30–50 over 30–60 s, HR −20–40 % | keep; once the hub exists, express it as "a large sympathoexcitatory afferent + the baroreflex's own answer", which is what `effects.ts:41` already does in spirit | `l2/brain/cushing.ts` | — | the hub's sympathetic drive |
| **Oculocardiac / trigeminocardiac** | partial | > 20 % HR fall defines it; 14–90 % incidence in strabismus surgery; fatigues; potentiated by hypercapnia, hypoxia and light anaesthesia; abolished by IV antimuscarinic | keep the event; add (i) an age factor so laryngoscopy is pressor in adults and vagal in children, (ii) intensity scaling for laryngoscopy, (iii) potentiation by PaCO2 and depth, (iv) per-kg atropine (research/21 S8) | `model.ts:62–75` + the hub's vagal path | age band, PaCO2, depth, muscarinic occupancy | the vagal RR term |
| **Carotid sinus** | absent | bradycardia + vasodepression on manipulation; abolished by local infiltration | a fourth `VagalSite` with a vasodepressor component (i.e. it also lowers `outF`) | `types-neuro.ts:32–33` + the hub | — | vagal RR + `outF` |
| **Pneumoperitoneum** | absent (circulatory) | insufflation: MAP + ≈ 35 %, CI − ≈ 20 %, SVR + ≈ 65 %, PVR + ≈ 90 % (Joris 1993); vagal bradycardia on rapid stretch; CO2 absorption over 15–30 min | route the existing `iapMmHg` into the circulation: venous return (IAP as the abdominal venous back-pressure, already in `renal/model.ts:114`), a sympathetic/vasopressin afferent, and a **rate-of-rise**-triggered vagal event | `l2/circ/` reading `organs.iap` | IAP and dIAP/dt | venous return, `hum`, vagal RR |
| **Valsalva** | not expressible | ratio > 1.21, four phases, phase II late latency ≈ 5–7 s | an expiratory-strain input (airway pressure against a closed glottis) — low priority as a feature, **high value as the acceptance test** of the hub | `l2/resp` input + the hub | — | — |
| Somatosympathetic | present | incision MAP/HR +10–20 % unless blunted | keep; connect to the hub so it adds to one sympathetic drive rather than multiplying beside it | `l2/endo/` | — | the hub |

### 6.2 One autonomic structure (the proposal)

Today there are **six independent paths** to the same effectors, combined multiplicatively at
`model.ts:300–341`: the baroreflex's `b.*` factors, `chemoFactors`, the endocrine `endoHrF/endoSvrF/endoEesF`,
the humoral `endoHumSvrF`, the Cushing `ext.rSysF`, and the drug bus. Each new reflex would be a seventh. The
proposal is to collapse them into one hub, because that is what the body is, and because it is the only way the
reflexes can *interact* (potentiation, saturation, mutual inhibition) rather than multiply.

```
AFFERENTS (each a small pure function of existing truths, 10 Hz or 1 Hz)
  arterial baroreceptors        MAP + K_PP·ΔPP, vs a bounded set point        (exists)
  cardiopulmonary receptors     RA transmural pressure                        (exists, vasomotor only)
  ventricular mechanoreceptors  LVEDV/rest, contractility                     (NEW — the "empty ventricle")
  arterial chemoreceptors       PaO2, PaCO2, pH, gated by ventilation         (exists, ungated)
  pulmonary stretch             VT/VT_rest, breath phase                      (NEW)
  cerebral perfusion            cbfRel: excitatory 0.6→0.3, failing below 0.2 (half exists)
  intracranial pressure         Cushing drive                                 (exists)
  trigeminal / visceral / carotid-sinus stimulus sites                        (partly exists)
  nociception                   noxious × (1 − antinoc)                       (exists, in 7e)
  abdominal pressure            IAP and dIAP/dt                               (NEW)
      │
      ▼
CENTRAL INTEGRATION  (one state object; the only place a reflex can change the autonomic outflow)
  sympDrive  = tonicSymp(profile, age, disease)        ← FU-8 B4 provides this
               + Σ excitatory afferents
               − reflexInhib·(the sympathoinhibitory state)
               , × anaesthetic outF, × brainstem perfusion, clamped
  vagalDrive = tonicVagal(profile, age)                ← B4's twin, NOT in B4 today
               + Σ vagal-excitatory afferents (BJR, trigeminal, visceral, chemo-when-ungated, inflation)
               − baroreceptor loading
               , × (1 − muscarinic occupancy), × anaesthetic
      │
      ▼
EFFECTORS (unchanged interfaces, so the circuit and the rhythm engine do not move)
  sinus node       rate from sympDrive and vagalDrive; vagalDrive may reach sinus arrest   (floor must go)
  AV node          conduction/block from vagalDrive                                        (NEW, cheap)
  contractility    Ees × from sympDrive (tonic share removed by anaesthetic)
  arterioles       SVR × from sympDrive (tonic share removed)
  venous tone      V0 and compliance from sympDrive (tonic share removed)
  RSA              Modifiers.rsa from vagalDrive                                            (NEW wiring)
```

Three properties this buys that patches do not:
1. **Every reflex is an afferent.** Adding the carotid sinus, the diving reflex or the pneumoperitoneum event is one
   afferent function and one row in a table, not a new multiplier at `model.ts`.
2. **Reflexes can interact.** Hypercapnia potentiating the oculocardiac reflex, the inflation reflex inverting the
   chemoreflex, and an antimuscarinic abolishing the cardiac limb while leaving the vasodepressor limb — all of
   these are one-line consequences of a shared vagal and sympathetic drive and are impossible today.
3. **A tonic level exists to be withdrawn**, which is what makes anaesthetic effects, neuraxial sympathectomy and
   the vasodepressor limb of a reflex all the *same* mechanism.

### 6.3 What FU-8 Task B4 should do now so this can build on it

B4 as planned (`repo/docs/plans/fu-8-followups.md` Task B4) adds `BaroGains.tonic`, `TONIC_EES_SHARE 0.5` and
`ResolvedProfile.tonicSymp` (0.2 adult / 0.3 elderly / +0.1 HTN / +0.25 HFrEF), and changes two lines:
`svrF = 1 − tonic·(1 − o) + o·(reflex)` and the matching `eesF`. Four recommendations, none of which changes its
measured outcome or its gate:

1. **Keep the mechanism and the sizes exactly as prototyped.** `1 − τ(1 − o) + o·reflex` is bit-identical at rest
   and is precisely the "tonic level an anaesthetic removes" the hub needs. Do not generalise it now.
2. **Name it for what it is, and put the constant where the hub will want it.** `tonicSymp` on the resolved profile
   is right. Add a one-line comment that it is the **sympathetic** tonic share and that a **vagal** twin
   (`tonicVagal`) is expected, so a later reader does not assume one number covers both. The vagal tonic level is
   what the engine needs for the resting BRS of 15 ms/mmHg (§5.7 F21), for the age decline, and for an antimuscarinic
   to raise the resting rate correctly; B4 need not add it, but it should not foreclose it.
3. **Apply the tonic share to the venous and compliance effectors too, or state explicitly that it does not.**
   B4 touches `svrF` and `eesF` only. The resting venous tone is also sympathetically maintained, and the venous
   term (`dV0`, `cSvF`) is where a sympathectomy and the vasodepressor limb of a reflex do most of their damage. If
   the executor does not extend it, the gate note should record that `dV0`/`cSvF` keep no tonic share, so the later
   work knows it is adding, not changing.
4. **Do not make `tonic` a function of the arrest or perfusion state** (no coupling to `kIsch`, `cbfRel` or the
   arrest flag). Those belong to the hub's `brainF`/`outF` path, which already exists; mixing them into `tonic`
   would make the B4 numbers un-reproducible when the hub lands.

One **non**-recommendation: B4 should **not** try to deliver any part of the sympathoinhibitory reflex, the rate
floor, or resetting bounds. Those are FU-12's, and each needs its own measured gate.

### 6.4 Ranking

**By teaching value for an anaesthesia resident** (1 = highest):

| Rank | Reflex / mechanism | Why |
|---|---|---|
| 1 | **Sympathoinhibitory reflex of low preload** (spinal bradycardia, beach-chair HBE, paradoxical bradycardia of haemorrhage) | It is the mechanism of the commonest sudden perioperative collapse in a healthy patient, and the *management* (volume, position, vasoconstrictor; not atropine alone) is examinable and life-saving |
| 2 | **Bounded resetting + a decompensated state** | Without it the engine cannot teach class IV haemorrhage, which is the core ATLS lesson |
| 3 | **The rate floor and a vagal route to arrest** | Enables 1, the oculocardiac arrest, the suxamethonium bradyasystole and the vasovagal faint |
| 4 | **Chemoreflex gated by ventilation** | The paralysed hypoxic patient slowing down is the daily emergency; the sign error here is a teaching hazard |
| 5 | Tonic sympathetic tone (B4) | Explains why the elderly, hypertensive and heart-failure patients fall further at induction — the single most repeated induction lesson |
| 6 | Oculocardiac / trigeminocardiac with age and depth dependence | Paediatric list staple |
| 7 | Pneumoperitoneum (vagal event + sustained haemodynamics) | Laparoscopy is most of a general list |
| 8 | CNS ischaemic response | Explains the hypertensive crisis of profound hypotension and why pressure can be preserved while flow is not |
| 9 | Carotid sinus | Endarterectomy lists; cheap once the hub exists |
| 10 | Cardiopulmonary rate arm (Bainbridge / reverse) | Small and disputed in man, but it is the same arm as 1 |
| 11 | RSA driven by vagal tone | Makes the monitor's HRV mean something; valuable for depth teaching |
| 12 | Lung-inflation cardiac reflex | Mostly needed as the chemoreflex's gate (4) |
| 13 | Valsalva | Best as a *test* of the hub, not a feature |
| 14 | Diving reflex | Narrow (ice water for SVT) |

**By implementation risk** (highest first):

| Risk | Item | Why |
|---|---|---|
| **High** | Bounding resetting | Every existing haemorrhage, sepsis and hypotension band was fitted *with* unbounded resetting. Expect dozens of moved rows; this needs its own measured gate and probably its own PR |
| **High** | Lowering the 30/min floor | The floor is load-bearing for the arrest and PEA machinery (`arrest.ts`, `rate-rule.ts`, the escape foci through `saF`) and for the rhythm engine's rate validation |
| **High** | The sympathoinhibitory state | New behaviour that can arrest patients; needs a seeded hazard, a susceptibility, and a deliberate base rate, or it will fire in every scenario |
| Medium | The hub refactor itself | Mechanically large but behaviour-preserving if done as "same arithmetic, one place"; worth a dedicated PR with a bit-identical requirement at rest |
| Medium | Chemoreflex gating | Changes the asphyxia timings that FU-3/FU-4/FU-8 fitted three times (`TAU_HYP_S` scan history, `coronary.ts:27–50`) |
| Medium | Pneumoperitoneum into the circulation | Touches 7b, 7d and 7a seams |
| Low | B4 as prototyped | Measured, bit-identical at rest, one gate |
| Low | Cardiopulmonary rate arm, carotid-sinus site, oculocardiac age factor, RSA wiring | Small, local, each with an obvious acceptance cell |

### 6.5 Acceptance cells a later plan should use

| # | Situation | Expected numbers | Source |
|---|---|---|---|
| R-01 | Awake 70 kg adult, 1,470 mL (30 %) bled over 10 min, measured at 40 min | HR 100–130, SBP near normal with a narrowed pulse pressure, MAP ≥ 70; **set point still within 15 mmHg of the profile value** | ATLS class II/III; the resetting bound of §6.1 |
| R-02 | Same, 2,450 mL (50 %) over 10 min, measured at 40 min | MAP < 55 and **still falling or flat, not recovering**; HR not returning to baseline; lactate > 4 | ATLS class IV; §5.1 F1 is the current failure |
| R-03 | Awake adult, 2 L (41 %) over 60 s | peri-arrest: MAP < 40, and either a sympathoinhibitory event or progression; **not** MAP 52 and stable | §5.3 F9; Barcroft 1944 |
| R-04 | Progressive central hypovolaemia (haemorrhage or 60° tilt) in a susceptible awake patient | an **abrupt** event at ≈ 30 % loss / CO ≈ 60 % of baseline: MAP falls ≈ 40 mmHg and HR falls ≈ 30/min **within 30 s**, reversing within 60 s of volume restoration | Schadt & Ludbrook 1991; Sander-Jensen 1986 (94→50, 90→57); Barriot & Riou 1987 (reverses on fluid) |
| R-05 | Base rate of R-04 over seeds in a pre-hospital-style haemorrhagic shock cohort | ≈ 5–30 % of hypotensive patients show relative bradycardia, not 0 % and not 100 % | Barriot & Riou 1987 (7 %); Demetriades 1998 (28.9 %) |
| R-06 | Atropine given during an R-04 event | the **cardiac** limb reverses (rate rises) while the **vasodepressor** limb persists (MAP does not normalise) — and the teaching note that volume is the treatment | Barriot & Riou 1987 (atropine harmful); Kinsella & Tuckey 2001 |
| R-07 | Spinal-anaesthesia analogue (once expressible): T4 block in a 70 kg adult | MAP −20…−30 %, bradycardia in ≈ 13 % of seeds, and an asystole rate of the order of 1 in 10³–10⁴ | Carpenter 1992; Auroy 1997 |
| R-08 | Shoulder surgery, 70° head-up, interscalene block, awake | hypotensive-bradycardic event in > 20 % of seeds; abolished in most by prophylactic β-blockade or glycopyrrolate | Liguori 1998 |
| R-09 | Pressor test (phenylephrine, MAP +20) in healthy 25 y / 70 y | cardiac BRS ≈ 15–20 vs ≈ 7 ms/mmHg (ratio ≈ 0.35) | modified Oxford values, §2.1 |
| R-10 | Same under propofol at Ce 3 µg/mL and at 1 MAC sevoflurane | BRS 25–50 % of awake | Kotrly 1984; Muzi & Ebert 1995; Nagasaki 2001 |
| R-11 | Isolated hypoxia (SaO2 → 70 %) in (a) a spontaneously breathing adult, (b) a paralysed ventilated adult at fixed minute ventilation | (a) tachycardia; (b) **bradycardia** | de Burgh Daly; Daly 1997 |
| R-12 | Zero coronary flow (CoPP ≤ P_zf) in a beating heart | measurable contractility loss within **10–20 s**, not 60–120 s | Wohlgelernter 1986 (12 ± 5 s); Tennant & Wiggers 1935 |
| R-13 | MAP held at 30 mmHg (anaesthetised, ventilated, normothermic), by whatever mechanism | progression to arrest within **2–10 min**; no scenario should sit below MAP 35 for > 2 min without either arrest or a visibly failing EtCO2, SpO2 and brain | §3.1; replaces the P-1 "threshold" with a time-at-pressure cell. §5.2 F5 (24 min below 35) is the current failure |
| R-14 | MAP nadir of ≤ 60 s at 26–30 mmHg, then relieved (the S6a + propofol case) | survival **with a residue**: a coronary debt that takes minutes to repay, a lactate step, and a measurable cerebral event — **not** a clean return | Lam & Gelb 1983 (MAP 40 tolerated); Walsh 2013 (1–5 min matters); Astrup 1981 |
| R-15 | 2 L crystalloid in 10 min into a patient at 55/min | HR +5…+15/min (small, real, Bainbridge direction) and not a fall | Crystal & Salem 2012 (small, [D]) — a *low-confidence* cell, to be marked as such |
| R-16 | Medial-rectus traction in a 4-year-old at 1 MAC sevoflurane, (a) normocapnic, (b) PaCO2 55 | HR fall > 20 % in both, **larger in (b)**; fatigues on sustained traction; abolished by IV atropine 20 µg/kg | Meuwly 2017; standard OCR teaching; research/21 S8 for the per-kg atropine |
| R-17 | Laryngoscopy in an adult vs a 6-month-old at equivalent depth without opioid | adult: MAP +20…+25, HR +15…+20; infant: **bradycardia** | Shribman 1987; paediatric atropine literature |
| R-18 | CO2 insufflation to IAP 14 in an anaesthetised adult | MAP + ≈ 35 %, CI − ≈ 20 %, SVR + ≈ 65 %, PVR + ≈ 90 %; plus a vagal bradycardia on rapid insufflation in a minority of seeds | Joris 1993 |
| R-19 | Valsalva-equivalent strain, awake adult | four phases present; Valsalva ratio > 1.21; phase-IV overshoot above baseline | Sandroni 1991; Novak 2011 |
| R-20 | Atropine 20 µg/kg IV, resting awake adult and 4-year-old | resting rate rises by ≈ 25–40 % in both (i.e. a **tonic vagal** level exists to block) | standard; needs `tonicVagal` (§6.3 rec. 2) |
| R-21 | Bit-identity guard for the hub refactor | at rest, with no reflex firing, every published number identical to the pre-refactor commit | R45-style |

### 6.6 Open questions for the owner

1. **The perfusion floor as a time rule.** Proposed replacement for P-1: *no scenario may sit below MAP 35 for more
   than 2 minutes without either arrest or visibly failing flow-dependent outputs (EtCO2, SpO2, cerebral function)*,
   enforced by mechanism, not threshold (cell R-13). Is 2 minutes the right number for teaching, given that
   Lam & Gelb held MAP 40 deliberately and that a 60 s induction nadir at 26 is survivable?
2. **The residue (R-14).** Should a survived deep nadir leave something behind — a repaid coronary debt, a lactate
   step, a period of cerebral dysfunction — or is a clean recovery acceptable for v1 teaching? The literature
   (Walsh 2013) says the residue is real even at MAP 55.
3. **Base rate of the sympathoinhibitory event (R-05).** 7 % (Barriot & Riou) to 29 % (Demetriades) of hypotensive
   patients. For a teaching simulator, should it be a *deterministic* consequence of a defined trigger (always
   reproducible, pedagogically clear) or a *seeded hazard* at a literature base rate (realistic, but a resident may
   never see it)? Recommendation: hazard, with an instructor override.
4. **The name.** Given the transplant evidence (Fitzpatrick 1993; Scherrer 1990), this audit recommends calling it
   the **sympathoinhibitory (vasovagal) reflex** with the empty ventricle as one afferent, and mentioning
   Bezold–Jarisch in the glossary as the classical name. Does Ali want the Bezold–Jarisch name in the UI anyway,
   because that is what residents are examined on?
5. **Atropine teaching (R-06).** Barriot & Riou found atropine *harmful* in conscious haemorrhagic shock with
   paradoxical bradycardia (ventricular ectopy in 2, VF in 1 of 20). Should the engine reproduce that hazard, or is
   that too much realism for a teaching tool?
6. **Resetting bounds (R-01/R-02).** A ±15 mmHg acute bound is proposed. This will move many fitted rows (§6.4,
   high risk). Does Ali want it inside FU-12, or as its own calibration pass with his review of the moved numbers?
7. **The rate floor.** Lowering it to ≈ 15/min is required for any vagal arrest. It touches the arrest and PEA
   machinery. Approve as part of FU-12, or carve out as a separate small PR with its own gate?
8. **Neuraxial block as a feature.** `condition neuraxialBlock` is reserved ("arrives in Stage 7") and nothing
   implements it. Spinal bradycardia and asystole are the highest-teaching-value items in this whole audit (§6.4
   rank 1), and they need it. Should FU-12 include a minimal neuraxial block (a dermatomal sympathectomy level that
   removes tonic sympathetic tone below it, plus venous pooling), or does that stay a separate stage?
9. **Where the hub lives.** `l2/circ/` keeps the autonomic hub next to its effectors but puts a neural model inside
   the circulation module; `l2/neuro/` is the honest home but adds a seam and a cross-module ordering constraint
   every tick. Recommendation: `l2/circ/autonomic.ts`, with the afferent functions owned by the modules that have
   the signals.

---

## 7. What this audit changed

Nothing. No file in `repo/` was modified; no commit, no branch, no PR. The measurement worktree
(`scratch/wt-reflex-audit`) was removed at the end of the run. The scripts live in the session scratchpad under
`reflex-audit/` and can be re-run against any commit by setting `PME_ENGINE` to that worktree's
`packages/engine-core/src/index.ts`.

---

## 8. References

Grouped by the section that uses them. Strength labels: [H] human data · [A] animal data · [T] textbook consensus ·
[D] disputed · [UNCONFIRMED] cited but not verified in this run.

> **Provenance of this list.** Two independent literature checks were run against PubMed records for this audit.
> Entries carrying a PMID or DOI were retrieved and checked (authors, journal, volume, pages). Entries marked
> **[UNCONFIRMED]** are cited in the secondary literature but were not verified in this run — chiefly the pre-1946
> classics (Bainbridge 1915, Cushing 1901/1902, von Bezold 1867, Jarisch, Aschner 1908, Lewis 1932,
> Barcroft 1944, Guyton 1948, King 1951), the book chapters (Mark & Mancia 1983; Daly 1997; Wiggers 1950) and a
> short list named in §8 "not verified". Nothing marked UNCONFIRMED is used to support a verdict in §4.

**Baroreflex and its modulation**
1. Chapleau MW, Abboud FM. Contrasting effects of static and pulsatile pressure on carotid baroreceptor activity in dogs. *Circ Res* 1987;61:648–58. [A]
2. Ebert TJ, Muzi M, Berens R, et al. Sympathetic responses to induction of anesthesia in humans with propofol or etomidate. *Anesthesiology* 1992;76(5):725–33. PMID 1575340. [H]
3. Sellgren J, Ejnell H, Elam M, Pontén J, Wallin BG. Sympathetic muscle nerve activity, peripheral blood flows, and baroreceptor reflexes in humans during propofol anesthesia and surgery. *Anesthesiology* 1994;80(3):534–44. PMID 8141450. [H]
4. Kotrly KJ, Ebert TJ, Vucins E, Igler FO, Barney JA, Kampine JP. Baroreceptor reflex control of heart rate during isoflurane anesthesia in humans. *Anesthesiology* 1984;60(3):173–9. PMID 6696251. [H]
5. Muzi M, Ebert TJ. A comparison of baroreflex sensitivity during isoflurane and desflurane anesthesia in humans. *Anesthesiology* 1995;82:919–25. [H]
6. Ebert TJ, Muzi M, Lopatka CW. Neurocirculatory responses to sevoflurane in humans. *Anesthesiology* 1995;83:88–95. [H]
7. Nagasaki G, Tanaka M, Nishikawa T. The recovery profile of baroreflex control of heart rate after isoflurane or sevoflurane anesthesia in humans. *Anesth Analg* 2001;93:1127–31. [H]
8. **Kardos A, Watterich G, de Menezes R, Csanády M, Casadei B, Rudas L. Determinants of spontaneous baroreflex sensitivity in a healthy working population. *Hypertension* 2001;37(3):911–6. PMID 11244017.** (n = 1,134; ln BRS = 3.24 − 0.03 × age, r² = 0.23 — ≈ 20 ms/mmHg at 20 y, ≈ 8–9 at 60 y) [H]
8a. Modified-Oxford normative figures quoted alongside Kardos (young women 19 ± 1, young men 21 ± 2, older women 7 ± 1 ms/mmHg) — consistent with ref. 8; individual-paper attributions **[UNCONFIRMED]**.
8b. Ebert TJ, Muzi M. Propofol and autonomic reflex function in humans. *Anesth Analg* 1994;78(2):369–75. **[found by web search; not PubMed-verified]** [H]. Cullen 1987 (the `gvHr` fit's cited source in `rows-anaesthetic.ts`) **[UNCONFIRMED]**.
9. Guyton AC, Hall JE. *Textbook of Medical Physiology*, ch. 18 (nervous regulation of the circulation; CNS ischaemic response, the "last-ditch stand", maximal at MAP 15–20, pressure to 250 mmHg for up to 10 min). [T]
10. Berne RM, Levy MN. *Cardiovascular Physiology* (baroreflex operating range and gain). [T]
10a. Acute baroreflex resetting (Krieger; Chapleau; Munch) — the phenomenon is well established [A, some H], but those specific records were **not retrieved [UNCONFIRMED]**.

**Cardiopulmonary receptors**
11. Mark AL, Mancia G. Cardiopulmonary baroreflexes in humans. In: *Handbook of Physiology, Section 2: The Cardiovascular System*, Vol. III, Pt 2. Bethesda: APS, 1983. [review; book chapter, **bibliographic details UNCONFIRMED**]
12. **Johnson JM, Rowell LB, Niederberger M, Eisman MM. Human splanchnic and forearm vasoconstrictor responses to reductions of right atrial and aortic pressures. *Circ Res* 1974;34(4):515–24. PMID 4826928.** (forearm/splanchnic resistance + ≈ 20–40 % at −10 to −20 mmHg LBNP with no HR or MAP change) [H]
13. Abboud FM, Eckberg DL, Johannsen UJ, Mark AL. Carotid and cardiopulmonary baroreceptor control of splanchnic and forearm vascular resistance during venous pooling in man. *J Physiol* 1979;286:173–84. **[UNCONFIRMED]** [H]

**Bezold–Jarisch, sympathoinhibition and haemorrhage**
14. **Öberg B, Thorén P. Increased activity in left ventricular receptors during hemorrhage or occlusion of caval veins in the cat. A possible cause of the vaso-vagal reaction. *Acta Physiol Scand* 1972;85(2):164–73. PMID 5049411.** [A]
15. **Mark AL. The Bezold–Jarisch reflex revisited: clinical implications of inhibitory reflexes originating in the heart. *J Am Coll Cardiol* 1983;1(1):90–102.** [review]
15a. **Aviado DM, Guevara Aviado D. The Bezold–Jarisch reflex: a historical perspective of cardiopulmonary reflexes. *Ann N Y Acad Sci* 2001;940:48–58. PMID 11458703.** [review]
16. Campagna JA, Carter C. Clinical relevance of the Bezold–Jarisch reflex. *Anesthesiology* 2003;98:1250–60. PMID 12717149. [review]
17. Kinsella SM, Tuckey JP. Perioperative bradycardia and asystole: relationship to vasovagal syncope and the Bezold–Jarisch reflex. *Br J Anaesth* 2001;86:859–68. PMID 11573596. [review]
18. Barcroft H, Edholm OG, McMichael J, Sharpey-Schafer EP. Posthaemorrhagic fainting: study by cardiac output and forearm flow. *Lancet* 1944;i:489–91. **[pre-1946, not PubMed-indexed: bibliographically UNCONFIRMED]** [H]
19. **Secher NH, Bie P. Bradycardia during reversible haemorrhagic shock — a forgotten observation? *Clin Physiol* 1985;5(4):315–23. PMID 3899474.** [H]
20. **Sander-Jensen K, Secher NH, Bie P, Warberg J, Schwartz TW. Vagal slowing of the heart during haemorrhage: observations from 20 consecutive hypotensive patients. *BMJ (Clin Res Ed)* 1986;292(6517):364–6. PMID 3080172.** [H]
21. **Sander-Jensen K, Secher NH, Astrup A, et al. Hypotension induced by passive head-up tilt: endocrine and circulatory mechanisms. *Am J Physiol* 1986;251:R742–8. PMID 3766774.** [H]
22. **Sander-Jensen K, Mehlsen J, Stadeager C, et al. Increase in vagal activity during hypotensive lower-body negative pressure in humans. *Am J Physiol* 1988;255(1 Pt 2):R149–56. PMID 3394838.** [H]
23. **Sander-Jensen K. Heart and endocrine changes during central hypovolemia in man. *Dan Med Bull* 1991;38(6):443–57. PMID 1802634.** [H, review]
24. **Barriot P, Riou B. Hemorrhagic shock with paradoxical bradycardia. *Intensive Care Med* 1987;13(3):203–7. PMID 3584650. DOI 10.1007/BF00254705.** [H]
25. **Thompson D, Adams SL, Barrett J. Relative bradycardia in patients with isolated penetrating abdominal trauma and isolated extremity trauma. *Ann Emerg Med* 1990;19(3):268–75. PMID 2310066.** [H]
25a. **Cooke WH, Ryan KL, Convertino VA. Lower body negative pressure as a model to study progression to acute hemorrhagic shock in humans. *J Appl Physiol* 2004;96(4):1249–61. PMID 15016789.** [H]
26. **Demetriades D, Chan LS, Bhasin P, et al. Relative bradycardia in patients with traumatic hypotension. *J Trauma* 1998;45(3):534–9. PMID 9751546.** (28.9 % of 750 hypotensive trauma patients; crude mortality 21.7 % vs 29.2 %, RR 1.34 p = 0.047; adjusted RR 1.23 ns) [H]
27. **Victorino GP, Battistella FD, Wisner DH. Does tachycardia correlate with hypotension after trauma? *J Am Coll Surg* 2003;196(5):679–84. PMID 12742195.** (the "44 %" figure sometimes quoted from it is **UNCONFIRMED**) [H]
28. **Schadt JC, Ludbrook J. Hemodynamic and neurohumoral responses to acute hypovolemia in conscious mammals. *Am J Physiol* 1991;260(2 Pt 2):H305–18. PMID 1671735.** [A/review]
29. **Evans RG, Ventura S, Dampney RA, Ludbrook J. Neural mechanisms in the cardiovascular responses to acute central hypovolaemia. *Clin Exp Pharmacol Physiol* 2001;28(5–6):479–87. PMID 11428384.** [A/H review]
30. **Hainsworth R. Reflexes from the heart. *Physiol Rev* 1991;71:617–58. PMID 2057525.** [review; concludes the ventricular-receptor hypothesis is unproven in man — D]
31. **Fitzpatrick AP, Banner N, Cheng A, Yacoub M, Sutton R. Vasovagal reactions may occur after orthotopic heart transplantation. *J Am Coll Cardiol* 1993;21(5):1132–7. PMID 8459066.** [H]
32. **Scherrer U, Vissing S, Morgan BJ, Hanson P, Victor RG. Vasovagal syncope after infusion of a vasodilator in a heart-transplant recipient. *N Engl J Med* 1990;322(9):602–4. PMID 2304506.** [H]
32a. **Liu JE, Hahn RT, Stein KM, et al. Left ventricular geometry and function preceding neurally mediated syncope. *Circulation* 2000;101(7):777–83. PMID 10683352.** (the ventricle is **not** empty before syncope) [H]
33. Little RA, Kirkman E. Attenuation of the bradycardic response to central hypovolaemia by nociceptive afferent input (injury); and Jacobsen J, Secher NH 1992. [A] **[both UNCONFIRMED — exact citations not verified in this run]**

**Spinal/epidural and beach-chair events**
34. **Caplan RA, Ward RJ, Posner K, Cheney FW. Unexpected cardiac arrest during spinal anesthesia: a closed claims analysis of predisposing factors. *Anesthesiology* 1988;68(1):5–11. PMID 3337390.** (14 arrests in healthy patients; poor neurological outcome attributed to delayed α-agonist therapy) [H]
35. **Carpenter RL, Caplan RA, Brown DL, Stephenson C, Wu R. Incidence and risk factors for side effects of spinal anesthesia. *Anesthesiology* 1992;76(6):906–16.** (bradycardia ≈ 13 %, hypotension ≈ 33 %) [H]
36. Auroy Y, Narchi P, Messiah A, Litt L, Rouvier B, Samii K. Serious complications related to regional anesthesia. *Anesthesiology* 1997;87:479–86. (cardiac arrest 6.4 ± 1.2 per 10,000 spinals vs 1.0 ± 0.4 for other regional) [H]
37. **Pollard JB. Cardiac arrest during spinal anesthesia: common mechanisms and strategies for prevention. *Anesth Analg* 2001;92(1):252–6. PMID 11133639.** [review]
38. Liguori GA, Kahn RL, Gordon J, Gordon MA, Urban MK. The use of metoprolol and glycopyrrolate to prevent hypotensive/bradycardic events during shoulder arthroscopy in the sitting position under interscalene block. *Anesth Analg* 1998;87(6):1320–5. (untreated-arm rates ≈ 22–29 %; **PMID not retrieved**) [H]
39. **D'Alessio JG, Weller RS, Rosenblum M. Activation of the Bezold–Jarisch reflex in the sitting position for shoulder arthroscopy using interscalene block. *Anesth Analg* 1995;80(6):1158–62. PMID 7762845.** (≈ 13 % incidence) [H] — *note: this is the Anesth Analg paper, not the separate Reg Anesth 1995;20:62–8 retrospective comparison.*
39a. **Owczuk R, Wenski W, Twardowski P, et al. Ondansetron given intravenously attenuates arterial blood pressure drop due to spinal anesthesia. *Reg Anesth Pain Med* 2008;33(4):332–9. PMID 18675744**; elderly replication *Minerva Anestesiol* 2015;81(6):598–607, PMID 25220555. [H]
39b. **Kinsella SM, Tuckey JP. Perioperative bradycardia and asystole: relationship to vasovagal syncope and the Bezold–Jarisch reflex. *Br J Anaesth* 2001;86(6):859–68. PMID 11573596.** [review]

**Bainbridge**
40. Bainbridge FA. The influence of venous filling upon the rate of the heart. *J Physiol* 1915;50:65–84. **[bibliographically UNCONFIRMED]** [A]
41. Crystal GJ, Salem MR. The Bainbridge and the "reverse" Bainbridge reflexes: history, physiology, and clinical relevance. *Anesth Analg* 2012;114(3):520–32. (**PMID not retrieved**) [review; the human effect small and D]
42. **Boettcher DH, Zimpfer M, Vatner SF. Phylogenesis of the Bainbridge reflex. *Am J Physiol* 1982;242(3):R244–6. PMID 7065218.** (species-dependent; **weak or absent in primates** — the strongest single reason the engine's absence of a Bainbridge reflex is defensible) [A]

**Chemoreflex, inflation reflexes and RSA**
43. Daly MdeB. *Peripheral Arterial Chemoreceptors and Respiratory–Cardiovascular Integration* (Monographs of the Physiological Society). Oxford: Clarendon Press, 1997. (primary bradycardia at constant ventilation; inversion by the inflation reflex) **[book, not PubMed-verified]** [A/T]
43a. **Sarton E, Dahan A, Teppema L, et al. Acute pain and central nervous system arousal do not restore impaired hypoxic ventilatory response during sevoflurane sedation. *Anesthesiology* 1996;85(2):295–303. PMID 8712445.** [H]
44. Anrep GV, Pascual W, Rössler R. Respiratory variations of the heart rate. *Proc R Soc Lond B* 1936;119:191–230. **[bibliographically UNCONFIRMED]** [A]
45. **Eckberg DL. The human respiratory gate. *J Physiol* 2003;548(Pt 2):339–52. PMID 12626671.** [H]
46. **Hayano J, Yasuma F, Okada A, Mukai S, Fujinami T. Respiratory sinus arrhythmia: a phenomenon improving pulmonary gas exchange and circulatory efficiency. *Circulation* 1996;94(4):842–7. PMID 8772709.** [H]
47. Widdicombe JG. Reflexes from the lungs in the control of breathing. (Hering–Breuer threshold ≈ > 0.8–1.0 L in the awake adult) [T] **[UNCONFIRMED — exact citation not verified]**
48. DeBehnke DJ, Hilander SJ, Dobler DW, Wickman LL, Swart GL. The hemodynamic and arterial blood gas response to asphyxiation: a canine model of pulseless electrical activity. *Resuscitation* 1995;30:169–75. [A]
49. Varvarousi G, Stefaniotou A, Varvarousis D, Xanthos T. Glucocorticoids as an emerging pharmacologic agent for cardiopulmonary resuscitation. *Cardiovasc Drugs Ther* 2014; and Varvarousi G et al., *Resuscitation* 2011/2015 (swine asphyxial arrest, PEA 21 / VF 7 / asystole 2 of 30). [A]

**CNS ischaemic response and Cushing**
50. Guyton AC. Acute hypertension in dogs with cerebral ischemia. *Am J Physiol* 1948;154:45–54. **[bibliographically UNCONFIRMED]** [A]
51. Cushing H. Concerning a definite regulatory mechanism of the vasomotor centre which controls blood pressure during cerebral compression. *Bull Johns Hopkins Hosp* 1901;12:290–2. **[bibliographically UNCONFIRMED]** [A/H]
52. **Fodstad H, Kelly PJ, Buchfelder M. History of the Cushing reflex. *Neurosurgery* 2006;59(5):1132–7. PMID 17143247.** [review] — the often-quoted "full triad in about a third" incidence is **UNCONFIRMED**.

**Trigeminocardiac and vagal stimulus reflexes**
53. **Meuwly C, Golanov E, Chowdhury T, Erne P, Schaller B. Trigeminal cardiac reflex: new thinking model about the definition based on a literature review. *Medicine (Baltimore)* 2015;94(5):e484. PMID 25654391**; updated in Meuwly C, Chowdhury T, Sandu N, et al. Definition and diagnosis of the trigeminocardiac reflex: a grounded theory approach for an update. *Front Neurol* 2017;8:533. (HR fall below 60/min or > 20 % of baseline) [reviews]
54. Schaller B, Probst R, Strebel S, Gratzl O. Trigeminocardiac reflex during surgery in the cerebellopontine angle. *J Neurosurg* 1999;90(2):215–20. (**PMID not retrieved**) [H]
55. Arnold RW, Jensen PA, Kovtoun TA, Maurer SA, Schultz JA. The profound augmentation of the oculocardiac reflex by fast acting opioids. *Binocul Vis Strabismus Q* 2004;19:215–22. **[UNCONFIRMED]** [H]
56. Oculocardiac reflex prevalence in strabismus surgery 14–90 % by definition; series at 56 %, 68 % and one arrhythmia-inclusive series 91 %. [H] (compiled from reviews; individual series attributions **[UNCONFIRMED]**). Arasho 2009 **[UNCONFIRMED]**.
57. King BD, Harris LC, Greifenstein FE, Elder JD, Dripps RD. Reflex circulatory responses to direct laryngoscopy and tracheal intubation performed during general anesthesia. *Anesthesiology* 1951;12:556–66. **[bibliographically UNCONFIRMED]** [H]
58. **Shribman AJ, Smith G, Achola KJ. Cardiovascular and catecholamine responses to laryngoscopy with and without tracheal intubation. *Br J Anaesth* 1987;59(3):295–9. PMID 3828177.** [H]
59. Fastle RK, Roback MG. Pediatric rapid sequence intubation: incidence of reflex bradycardia and effects of pretreatment with atropine. *Pediatr Emerg Care* 2004;20:651–5. **[UNCONFIRMED]** [H]
60. **Jones P, Peters MJ, Pinto da Costa N, et al. Atropine for critical care intubation in a cohort of 264 children and reduced mortality unrelated to effects on bradycardia. *PLoS One* 2013;8(2):e57478. PMID 23468997.** [H]
61. **Sato A, Schmidt RF. Somatosympathetic reflexes: afferent fibers, central pathways, discharge characteristics. *Physiol Rev* 1973;53(4):916–47. PMID 4355517.** [A]
62. **Joris JL, Noirot DP, Legrand MJ, Jacquet NJ, Lamy ML. Hemodynamic changes during laparoscopic cholecystectomy. *Anesth Analg* 1993;76(5):1067–71. PMID 8484509.** [H]
63. **Gutt CN, Oniu T, Mehrabi A, et al. Circulatory and respiratory complications of carbon dioxide insufflation. *Dig Surg* 2004;21(2):95–105. PMID 15010588.** [review] — the 14–27 % bradyarrhythmia incidence, and Valentin 2004 / Yong 2015, are **UNCONFIRMED**.
63a. Mesenteric traction syndrome (prostacyclin-mediated; onset ≈ 15–20 min, flushing ≈ 30–40 min, incidence ≈ 30–85 %, ≈ 76 % in major abdominal surgery per a 2023 systematic review). **[systematic-review citation UNCONFIRMED]** [H]

**Vasovagal syncope, diving, Valsalva**
64. Lewis T. Vasovagal syncope and the carotid sinus mechanism. *BMJ* 1932;1:873–6. **[bibliographically UNCONFIRMED]** [H]
65. **van Dijk JG, Thijs RD, van Zwet E, et al. The semiology of tilt-induced reflex syncope in relation to electroencephalographic changes. *Brain* 2014;137:576–85. PMID 24343112.** [H]
66. Wieling W, Thijs RD, van Dijk N, Wilde AAM, Benditt DG, van Dijk JG. Symptoms and signs of syncope: a review of the link between physiology and clinical clues. *Brain* 2009;132:2630–42. [review] — a separate "Wieling 2004 tilt-syncope time course" paper could not be isolated **[UNCONFIRMED]**.
66a. **Jardine DL, Krediet CT, Cortelli P, Frampton CM, Wieling W. Sympatho-vagal responses in patients with sleep and typical vasovagal syncope. *Clin Sci (Lond)* 2009;117(10):345–53. PMID 19281451.** [H]
67. **Gooden BA. Mechanism of the human diving response. *Integr Physiol Behav Sci* 1994;29(1):6–16. PMID 8018553.** [review]
68. **Foster GE, Sheel AW. The human diving response, its function, and its control. *Scand J Med Sci Sports* 2005;15(1):3–12. PMID 15679566.** [review]
69. **Sandroni P, Benarroch EE, Low PA. Pharmacological dissection of components of the Valsalva maneuver in adrenergic failure. *J Appl Physiol* 1991;71(4):1563–7. PMID 1757382.** [H]
70. Novak P. Quantitative autonomic testing. *J Vis Exp* 2011;(53):2502; Low PA 1993. (Valsalva ratio, phases) **[both UNCONFIRMED]** [H]

**Perfusion thresholds, agonal physiology, and the time question**
71. Bellamy RF. Diastolic coronary artery pressure–flow relations in the dog. *Circ Res* 1978;43:92–101. DOI 10.1161/01.res.43.1.92. PMID 657462. [A]
72. Hoffman JIE, Spaan JAE. Pressure–flow relations in coronary circulation. *Physiol Rev* 1990;70:331–90. PMID 2181499. [A/review]
73. Nanto S, Masuyama T, Takano Y, Hori M, Nagata S. Determination of coronary zero flow pressure by analysis of the baseline pressure–flow relationship in humans. *Jpn Circ J* 2001;65:793–6. (true Pzf 21 ± 7 mmHg) [H]
74. Canty JM Jr. Coronary pressure–function and steady-state pressure–flow relations during autoregulation in the unanesthetized dog. *Circ Res* 1988;63:821–36. PMID 3168181. (wall thickening unchanged to 39 ± 5.6; endocardial shortening to 42 ± 7.4 mmHg) [A]
75. Paradis NA, Martin GB, Rivers EP, et al. Coronary perfusion pressure and the return of spontaneous circulation in human cardiopulmonary resuscitation. *JAMA* 1990;263:1106–13. PMID 2386557. [H]
76. Tennant R, Wiggers CJ. The effect of coronary occlusion on myocardial contraction. *Am J Physiol* 1935;112:351–61. [A]
77. Wohlgelernter D, Cleman M, Highman HA, et al. Regional myocardial dysfunction during coronary angioplasty. *J Am Coll Cardiol* 1986;7:1245–54. PMID 2940283. (wall-motion abnormality at 12 ± 5 s) [H]
78. Jennings RB, Sommers HM, Smyth GA, Flack HA, Linn H. Myocardial necrosis induced by temporary occlusion of a coronary artery in the dog. *Arch Pathol* 1960;70:68–78. PMID 14407094. [A]
79. Reimer KA, Lowe JE, Rasmussen MM, Jennings RB. The wavefront phenomenon of ischemic cell death. *Circulation* 1977;56:786–94. [A]
80. Lassen NA. Cerebral blood flow and oxygen consumption in man. *Physiol Rev* 1959;39:183–238. [T, pooled between-subject data — D as an individual limit]
81. Drummond JC. The lower limit of autoregulation: time to revise our thinking? *Anesthesiology* 1997;86:1431–3. PMID 9197320. [editorial; exact figures UNCONFIRMED]
82. Joshi B, Ono M, Brown C, et al. Predicting the limits of cerebral autoregulation during cardiopulmonary bypass. *Anesth Analg* 2012;114:503–10. PMID 22104067. (lower limit mean 66 mmHg, 95 % PI 43–90) [H]
83. Meng L, Wang Y, Zhang L, McDonagh DL. Heterogeneity and variability in pressure autoregulation of organ blood flow. *Crit Care Med* 2019;47:436–48. PMID 30516567. [review]
84. Astrup J, Siesjö BK, Symon L. Thresholds in cerebral ischemia — the ischemic penumbra. *Stroke* 1981;12:723–5. (electrical failure ≈ 15, membrane failure ≈ 6–10 mL/100 g/min) [A/T]
85. Rossen R, Kabat H, Anderson JP. Acute arrest of cerebral circulation in man. *Arch Neurol Psychiatry* 1943;50:510–28. (loss of consciousness 6.4–6.9 s; page numbers from a secondary citation) [H]
86. Clute HL, Levy WJ. Electroencephalographic changes during brief cardiac arrest in humans. *Anesthesiology* 1990;73:821–5. PMID 2240671. (mean 10.2 s) [H]
87. Lam AM, Gelb AW. Cardiovascular effects of isoflurane-induced hypotension for cerebral aneurysm surgery. *Anesth Analg* 1983;62:742–8. PMID 6869861. (MAP 40 ± 1 mmHg held deliberately) [H]
88. Hampton LJ, Little DM Jr. Complications associated with the use of controlled hypotension in anesthesia. *AMA Arch Surg* 1953;67:549–56. (complications ≈ 1 in 32, mortality ≈ 1 in 291; case count UNCONFIRMED) [H, historical]
89. Testa LD, Tobias JD. Pharmacologic drugs for controlled hypotension. *J Clin Anesth* 1995;7:326–37. PMID 7546762. [review]
90. Walsh M, Devereaux PJ, Garg AX, et al. Relationship between intraoperative mean arterial pressure and clinical outcomes after noncardiac surgery. *Anesthesiology* 2013;119:507–15. PMID 23835589. [H]
91. Salmasi V, Maheshwari K, Yang D, et al. Relationship between intraoperative hypotension, defined by either reduction from baseline or absolute thresholds, and acute kidney and myocardial injury after noncardiac surgery. *Anesthesiology* 2017;126:47–65. PMID 27792044. [H]
92. Crowell JW, Guyton AC. Evidence favoring a cardiac mechanism in irreversible hemorrhagic shock. *Am J Physiol* 1961;201:893–6. [A]
93. Guyton AC, Crowell JW. Cardiac deterioration in shock. I. Its progressive nature. *Int Anesthesiol Clin* 1964;2:159–70. PMID 14125006. [A]
94. Dhanani S, Hornby L, Shemie SD, et al. Resumption of cardiac activity after withdrawal of life-sustaining measures. *N Engl J Med* 2021;384:345–52. PMID 33503343. (last QRS coincided with the last arterial pulse in only 19 % of 480) [H]
95. Deakin CD, Low JL. Accuracy of the advanced trauma life support guidelines for predicting systolic blood pressure using carotid, femoral and radial pulses: observational study. *BMJ* 2000;321:673–4. PMID 10987771. [H]
96. Wiggers CJ. *Physiology of Shock*. New York: Commonwealth Fund, 1950. (the fixed-pressure irreversible-shock model: MAP ≈ 50 for 90–120 min then ≈ 30 for 45–60 min) [A] **[numbers from secondary sources; originals not retrieved]**
97. Weisfeldt ML, Becker LB. Resuscitation after cardiac arrest: a 3-phase time-sensitive model. *JAMA* 2002;288:3035–8. [review] (already cited by `arrest.ts`)

**Textbooks used as [T] throughout**
98. Gropper MA (ed.). *Miller's Anesthesia*, 9th/10th ed. (chs. 21 intravenous anaesthetics, 22 opioids, 25 local anaesthetics, ophthalmic and paediatric anaesthesia chapters).
99. Hall JE, Hall ME. *Guyton and Hall Textbook of Medical Physiology*, 14th ed., chs. 18–24.
100. Lumb AB. *Nunn's Applied Respiratory Physiology*, 8th ed. (chemoreflex, inflation reflexes).
101. Pardo MC, Miller RD. *Basics of Anesthesia*; Barash PG et al., *Clinical Anesthesia*, 8th ed. (laparoscopy and regional chapters); Stoelting RK, Hines RL, Marschall KE, *Stoelting's Anesthesia and Co-Existing Disease*.

### Not verified in this run — do not state as fact

Barcroft 1944 *Lancet*; Bainbridge 1915 *J Physiol*; Guyton 1948 *Am J Physiol*; Cushing 1901/1902; von Bezold 1867;
Jarisch (1930s–40s); Aschner 1908; Lewis 1932; King 1951; Mark & Mancia 1983 *Handbook of Physiology* chapter;
Abboud 1979; Daly 1997 monograph page details; the Krieger / Chapleau / Munch acute-resetting papers; Cullen 1987;
Ebert & Muzi 1994 *Anesth Analg* 78:369–75 (web-only); Crystal & Salem 2012 PMID; Liguori 1998 PMID;
Thames 1978 and Wei JY 1983 (inferior-MI bradycardia); Little & Kirkman 1995; Jacobsen & Secher 1992; Fastle 2004;
Arasho 2009; Widdicombe (Hering–Breuer threshold); the "Wieling 2004" tilt time-course paper; Low 1993 and
Novak 2011; Valentin 2004 and Yong 2015; the 14–27 % laparoscopic bradyarrhythmia incidence; Victorino's 44 %
figure; the Cushing-triad incidence figure; the mesenteric-traction-syndrome systematic review; the quantitative
"bpm per % SaO2 fall" chemoreflex figure; the RSA phase-reversal claim under positive-pressure ventilation; the
claim that Valsalva phase IV is absent under general anaesthesia; Hampton & Little's case count; Enderby's MAP
values; Klocke; the Kern coronary-perfusion-pressure paper; the Wiggers fixed-pressure-shock numbers; and the exact
figures in the Drummond 1997 editorial.

Also recorded: **no study was found that quantifies the agonal heart-rate curve** (HR 120→60→30→0), which is why
§4.2 treats that specific shape as an expert heuristic rather than an acceptance criterion.
