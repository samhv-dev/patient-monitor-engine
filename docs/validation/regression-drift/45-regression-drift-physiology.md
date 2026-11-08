# The five re-recorded regression rows: is each drift physiological? (brief 76, 2026-11-07)

The owner accepts PR #327's re-record of the five waveform-regression baselines only where the drift agrees with
physiology. This note shows what each waveform became and judges each change against a source. It changes no engine
code and no band. A row judged NOT PHYSIOLOGICAL keeps its 27 September baseline, so it stays red.

## Verdicts

| Row | Moved by | What changed | Verdict |
|---|---|---|---|
| sinus-75 / pleth | PR #24 (`16cdf79a`); PR #138 (`fea0688c`) noise floor | Every pulse is **6–9 % taller**. The shape is identical: r = 1.000, the same upstroke and notch. | **NOT PHYSIOLOGICAL.** The re-record is withdrawn and the row stays red. Ventilation with PEEP should leave the pulse at or slightly below its resting size. It grew because SV₀ (79.1 mL) is not this patient's settled resting SV (88.9 mL). |
| afib-110 / pleth | PR #24; PR #25 (`e81e53fc`, the restitution in `fefcadad`); PR #138 | Every pulse is **21–27 % smaller**. The beat-to-beat pattern and the shape are kept (r ≥ 0.999). | **PHYSIOLOGICAL.** The re-record is accepted. AF at 110/min with no atrial kick ejects less per beat, so the pulse is smaller. The SV₀ bias makes the fall look smaller than it is. |
| hypovolaemia-ppv / pleth | PR #24; PR #138 | Every pulse is **24–25 % smaller**. The shape is the same. | **PHYSIOLOGICAL.** The re-record is accepted. The stroke volume falls (≈ 58 against 79 mL), and the pulse falls with it. In MANUAL the vasoconstriction is the instructor's to set through PI. |
| sinus-75 / co2 | PR #25 (`86b5a21d`, one physical dead space) | The plateau is **2.0 mmHg lower** (EtCO₂ 39.4 → 37.4; PaCO₂ 43.3 → 40.8 at 60 s). Phase II, phase III and Pa−Et are unchanged. | **PHYSIOLOGICAL.** The re-record is accepted. The tube now bypasses the extrathoracic dead space (77 mL against the 72 mL measured by Nunn 1959). |
| bronchospasm / co2 | PR #25 (`86b5a21d`); PR #28 (`176f702e`, `827533b1` one bronchospasm) | The plateau is **3.6 mmHg lower** (35.0 → 31.4; PaCO₂ 46.1 → 42.5). The shark fin is kept: phase II 1.6 s, phase III 7–8 % of EtCO₂ per s. Pa−Et is 10.5 → 10.9. | **PHYSIOLOGICAL.** The re-record is accepted. The same dead-space credit applies. A volume-controlled ventilator delivers the set VT through the spasm. The Pa−Et gap now comes from the lung's own V/Q, not a fixed +8·s. |

Withdrawn: **sinus-75 / pleth**. Accepted: the other four. `packages/validation/baselines/waveforms.json` on this
branch therefore holds the 27-September array (`978b6538`) for sinus-75/pleth and the PR #327 arrays for the four
accepted rows. A local `validate --suites regression` on this branch gives 12 green rows and 1 red: sinus-75/pleth,
625/625 samples outside 2 %, maximum relative error 10.21 %.

## How it was measured

- **Arrays.** The validation package's own `generate()` (`packages/validation/src/regression/baseline.ts`) was run in
  a detached worktree at each commit: `978b6538`, both sides of each merge (`16cdf79a`, `e81e53fc`, `176f702e`,
  `fea0688c`), and this branch (main `3f44820a` plus docs). The outputs reproduce the committed arrays exactly: max
  |Δ| 0 for 978b6538 against the old baseline and for main against PR #327's re-record. `origin/main` `0e547156`
  differs from `3f44820a` in engine code only on the `setMode` path (FX-10), which these cases never take.
- **Within-PR attribution** (`git bisect run`, first parent, 0.002 tolerance), finer than PR #327's:
  - **sinus-75 / co2 and bronchospasm / co2 in PR #25:** `86b5a21d` "ONE exported physical dead space" alone. The
    70-s low-flow τ (`fefcadad`) does not move these rows: the low-flow factor φ is 0.99996 at 60 s in both cases.
  - **afib-110 / pleth in PR #25:** `fefcadad` (the mechanical restitution of premature beats) alone. Applying its
    `l2/circ/model.ts` hunk to `16cdf79a` reproduces the `e81e53fc` output within 1e-4.
  - **bronchospasm / co2 in PR #28:** `827533b1` "one bronchospasm".
  - **pleth in PR #138:** `a09f1765` "a pulseless pleth shows the sensor's noise floor".
- **Longer CO₂ captures.** The CO₂ rows were also captured over 30–60 s, because the 5-s window holds less than one
  12/min breath. Six full breaths per case give phase II and phase III.
- **Probes.** SV per beat, `circ.ref.sv`, `skinTone` and the mode were probed at 40–45 s. For the SV₀ question, the
  sinus-75 patient was also probed without ventilation and with PEEP 0.
- Plots (grey = before, colour = after, lower panel = after − before):
  [sinus-75 pleth](sinus-75-pleth.png) · [afib-110 pleth](afib-110-pleth.png) ·
  [hypovolaemia-ppv pleth](hypovolaemia-ppv-pleth.png) · [sinus-75 CO₂](sinus-75-co2.png) ·
  [bronchospasm CO₂](bronchospasm-co2.png).

## Pleth rows

### What the waveforms became

Each pulse was matched before and after by its peak. Amplitude = peak − foot, in PI units. Upstroke = foot → peak.
Notch = foot → the first minimum after the peak. Shape r = the correlation of the two foot-to-foot segments.

| Case | Amplitude after/before per beat | Upstroke (s) | Notch (s from foot) | Shape r | Foot level |
|---|---|---|---|---|---|
| sinus-75 | 1.062, 1.066, 1.084, 1.086, 1.085, 1.077 | 0.23–0.26, unchanged (one beat +8 ms) | 0.46–0.50, unchanged | 1.000 | +0.01–0.04 |
| afib-110 | 0.792, 0.788, 0.755, 0.772, 0.772, 0.777, 0.734, 0.760, 0.747 | 0.14–0.36, unchanged within one sample | 0.24–0.54 where present, unchanged | ≥ 0.9992 | lower, follows the smaller pulses |
| hypovolaemia-ppv | 0.747, 0.748, 0.759, 0.759, 0.753, 0.749 | 0.26–0.28, unchanged | 0.53–0.57, unchanged | 1.000 | −0.04 to −0.08 |

So the pleth drift is a **pure amplitude change**: no upstroke, notch or timing moved. The respiratory amplitude
modulation of the ventilated cases is kept. The PR #138 noise adds at most ±0.015 PI units (half the detector floor
0.03), about 0.7 % of a 2-unit pulse.

### The rule that moved them (PR #24) and what PI depends on

Before PR #24 each pleth pulse was drawn as PI × SVᵢ / (mean SV of the last 16 beats). A sustained fall in stroke
volume was therefore normalised away: the hypovolaemic and AF pulses kept full size. PR #24 made it PI × SVᵢ / SV₀,
with SV₀ the resting stroke volume (brief §4.3 "PI × (SVᵢ/SV₀)"). FU-8 B3 (`eacb4fb1`) added the cutaneous vasomotor
tone in MODELED mode. Main draws each pulse as:

```
amplitude = PI_L1 × tone × SVᵢ / SV₀,   tone = clamp(1/√skinTone, 0.25, 2) in MODELED, 1 in MANUAL
```

Physiology. PI = AC/DC × 100 %, the pulsatile over the static absorbance (research 03 §3.2, Masimo; Lima AP, Beelen P,
Bakker J, *Crit Care Med* 2002;30:1210–1213: healthy median ≈ 1.4, poor peripheral perfusion below 1.4). The AC part is
the pulsatile change in arterial blood volume under the probe. That change depends on the volume each beat delivers
(stroke volume, pulse pressure) and on the compliance of the finger's vessels, which the sympathetic vasomotor tone
sets (Shelley KH, *Anesth Analg* 2007;105(6 Suppl):S31–S36). Research 03 §3.2 gives the sizes: vasodilation raises PI
2–4×, vasoconstriction lowers it to 0.2–0.5, and hypovolaemia lowers it. The two can pull against each other. At
induction PI rises while SV is 80 ± 16 % of baseline, because the sympatholysis outweighs the volume (Anaesthesia
2023, cited in research 03 §3.2).

**Does the engine scale PI by stroke volume alone?**
- **MODELED: no.** It multiplies by the cutaneous tone. The exponent 0.5 and the bounds 0.25–2 are [ENG], not sourced.
- **MANUAL: yes, by design.** All five regression cases run in MANUAL (`l1.mode = 'manual'`, `skinTone` = 1). There
  the instructor's PI stands in for the finger's tone, so only the stroke-volume part is the engine's.

What tone being absent costs in the three cases:
- **sinus-75:** nothing. No tone change is expected.
- **afib-110:** nothing material at rest.
- **hypovolaemia-ppv:** the real finger vasoconstricts. Its PI falls further than the 25 % the stroke volume explains,
  toward 0.2–0.5. In MANUAL that fall is the instructor's to set, through PI. In MODELED, `skinTone` would carry it.

This is a property of MANUAL mode, not a defect in the drift. The 27-September baseline was further from physiology:
its hypovolaemic pulse did not fall at all.

### The defect the drift exposes: SV₀ is not the patient's resting stroke volume

`circ.ref.sv` (SV₀) is 79.1 mL. It comes from `stabilise.ts`, which runs the bare circuit until the profile's SBP, DBP
and CVP converge. The running engine (reflexes, the MANUAL trackers, intrathoracic pressure) settles elsewhere.
Measured at 40–45 s, sinus-75 patient, seed 42:

| | MANUAL: mean SV (mL) | SV/SV₀ | MODELED: mean SV (mL) | SV/SV₀ |
|---|---|---|---|---|
| not ventilated (the patient's own rest) | 88.9 | **1.124** | 82.3 | 1.041 |
| IPPV 12 × 500, PEEP 5 (the regression case) | 85.5 | 1.081 | 70.8 | 0.896 |
| IPPV 12 × 500, PEEP 0 | 84.0 | 1.062 | 75.2 | 0.951 |

Positive-pressure ventilation lowers right-heart preload and then the left-ventricular stroke volume (Michard F,
*Anesthesiology* 2005;103:419–428). The engine's MANUAL patient shows that fall: 88.9 → 85.5 mL. Measured against the
patient's own rest, the ventilated sinus pulse should therefore be about 0.96× the instructor's PI. That is a drift of
−4 % from the old baseline. Because SV₀ sits 12 % below the settled rest, the engine instead draws it at 1.08×, a drift
of +8 %. **The sinus-75 drift has the wrong sign:** the pulse grows when nothing in the physiology makes it grow.
Re-recording it would freeze a calibration error into the baseline. It is withdrawn.

The same bias also sits in the other two rows, but there it only shrinks a fall that is physiologically right. With
SV₀ at the settled rest, the hypovolaemic pulse would be about 0.67× rather than 0.75×, and the AF pulse about 0.68×
rather than 0.76×. Their drift has the right sign and comes from the right mechanism, so they are accepted. When SV₀
is corrected they will drift again and must be re-recorded then, with the cause stated.

**Mechanism fix (not done here; no engine change under this brief):** SV₀ must be this patient's own settled resting
stroke volume, as the full engine produces it, not the bare-circuit stabiliser's value. For example, measure it once
the running circulation has settled, before the first intervention. Alternatively, run the stabiliser with the loop
the engine actually runs. It is not a constant to fit. Side observation, not investigated: in MANUAL, PEEP 0 gives a
lower SV than PEEP 5 (84.0 against 85.5 mL), the opposite of what is expected. MODELED orders them correctly.

### afib-110: the restitution (PR #25, `fefcadad`)

Of the afib drift, 0.02 (≈ 1 % of the pulse) comes from `fefcadad`'s mechanical restitution of premature beats: a
beat that follows a short RR ejects less. This is the force–interval relation, and it is what produces the AF pulse
deficit. Its constants are [ENG] in the code (REST_ERP_S 0.2 s, REST_TAU_S 0.06 s) and were set to meet the FU-4
target of 10–20 % non-ejecting beats at AF 150. The direction is physiological; the constants carry no clinical
source.

### PR #138 (E126): the sensor's noise floor

E126 (owner ruling 2026-10-26, research/00) has a pulseless finger draw the oximeter's noise, not a flat line. The
noise is four incommensurate slow sines (0.23, 0.61, 1.37 and 2.9 Hz) peaking at half the pulse detector's floor. It
is added to every pleth sample, so it is under the perfused rows too, at ≤ ±0.015 PI units (≈ 0.7 % of a pulse). It
changes no beat's timing or shape; the lower panels show it as the slow ripple on the difference trace.

The brief asks for "the E126 sources in docs/physiology". **There are none:** `docs/physiology` has no E126 entry. The
basis is the owner's ruling to mimic the real monitor. The frequencies and the amplitude are [ENG]. A real PPG does
carry slow baseline variation (respiratory-induced intensity variation, ±2–5 % of DC in spontaneous breathing; research
03 §3.3, after Charlton). A ≤ 1 % sensor component is not against physiology, but it is a sensor model, not a sourced
signal. It is accepted as monitor behaviour, and its parameters stay [ENG] until a source is found.

## CO₂ rows

### What the waveforms became (full breaths at 30–60 s)

| Case | Version | EtCO₂ per breath (mmHg) | Phase II 10–90 % (s) | Phase III slope | PaCO₂ at 60 s | Pa−Et |
|---|---|---|---|---|---|---|
| sinus-75 | 978b6538 | 39.5, 39.4, 39.5, 39.9, 39.9 | 0.40–0.42 | 0.82–0.87 mmHg/s (2.1–2.2 % EtCO₂/s); +1.9–2.0 mmHg across the plateau | 43.3 | 3.4 |
| sinus-75 | main | 37.5, 37.4, 37.4, 37.8, 37.7 | 0.40–0.42 | 0.80–0.85 mmHg/s (2.1–2.3 %/s); +1.8–1.9 mmHg | 40.8 | 3.1 |
| bronchospasm | 978b6538 | 34.6, 35.0, 34.9, 35.7, 35.6 | 1.46–1.74 | 2.5–2.8 mmHg/s (7.0–8.1 %/s); 26–27 → 35 mmHg over the exhalation | 46.1 | 10.5 |
| bronchospasm | main | 31.3, 31.4, 31.5, 31.8, 31.6 | 1.55–1.73 | 2.3–2.7 mmHg/s (7.3–8.4 %/s); 24 → 31.5 mmHg | 42.5 | 10.9 |

The shapes are unchanged: the same phase II time, the same normalised phase III slope, the same breath timing. Only
the level moved, and it moved with PaCO₂.

### sinus-75 / co2: the tube bypasses the upper-airway dead space (`86b5a21d`)

Before this commit, intubation added the apparatus (50 mL) on top of the whole anatomical dead space (2.2 mL/kg IBW =
154 mL): 204 mL. Now the tube replaces the extrathoracic part it bypasses (1.1 mL/kg IBW = 77 mL), leaving 127 mL. The
MANUAL EtCO₂ fit (`vdExtraMl` 60.6 mL) is the same in both. With more alveolar ventilation, PaCO₂ is 2.5 mmHg lower at
60 s, and EtCO₂ follows, 2.0 mmHg lower.

Source: the extrathoracic anatomical dead space averages **72 mL** in adults (Nunn JF, Campbell EJM, Peckett BW, *J Appl
Physiol* 1959;14:174–176; Nunn's *Applied Respiratory Physiology* ch. 8, the code's own citation). Tracheal intubation
bypasses it. The engine's 77 mL for a 70 kg IBW is within that. The normal capnogram's phase III rises +1–3 mmHg across
the plateau (research 03 §4.3, LITFL); the engine's +1.8–2.0 mmHg is unchanged and inside that range.
**PHYSIOLOGICAL.**

### bronchospasm / co2: the dead-space credit, then one bronchospasm (`86b5a21d`, `827533b1`)

- **`86b5a21d`:** −2.4 mmHg, the same dead-space mechanism as above.
- **`827533b1` (PR #28):** −1.2 mmHg. It retired three Stage 3 [ENG] rules:
  - The cycle rule `vt × (1 − 0.2·s)`, which cut the delivered volume by 16 % at severity 0.8. The internal
    ventilator is a flow source: in volume control the set VT is delivered against the raised resistance, at a
    higher peak pressure, and air trapping (intrinsic PEEP) results.
  - A fixed `+8·s` mmHg Pa−Et gradient.
  - A `+0.05·s` shunt.

  The airway event now aliases the lung condition. The lung's alveolar dead space and low-V/Q admixture produce the
  gradient once: Pa−Et 10.9 mmHg, against 10.5 from the old fixed term. The shark fin (`shape: 'shark'`) follows the
  lung's post-bronchodilator severity.

Sources:
- Obstruction gives the "shark fin": a slow phase II merging into a steep phase III, the α angle widening from ≈
  100–110° to ≥ 120–140°, a variable EtCO₂ and a widened Pa−Et gradient (research 03 §4.1/§4.3, LITFL, EMS1). The
  engine's phase II takes 1.6 s against 0.4 s normal, and its phase III rises at 7–8 % of EtCO₂ per s against 2.2 %
  normal. That shape is kept unchanged across the drift.
- The phase III slope rises with the severity of obstruction (You B et al., *Eur Respir J* 1994;7:318–323).
- The Pa−EtCO₂ gradient rises with the dead-space fraction (Yamanaka MK, Sue DY, *Chest* 1987;92:832–835).

The change replaces fixed constants with the lung mechanism, as the owner's rule asks. **PHYSIOLOGICAL.**

### The "≈ 70-s displayed EtCO₂ lag" of PR #25: it is not a display lag, and it does not move these rows

The 70 s is `LOW_FLOW_TAU_S` (`l2/gas/params.ts`), introduced by `fefcadad` in PR #25. It is the time constant of φ,
the **patient's** pulmonary CO₂ delivery factor in the gas-exchange model (`stepCo2`). It is not a filter on the
displayed number:
- **The fall of φ.** Since PR #47 (FU-7.1 B3, owner ruling 2026-10-07), the fall has been the alveolar washout,
  τ = V_alv/VA (≈ 35 s on the 12 × 500 rig), floored at 5 s.
- **The rise of φ.** The 70 s now governs only the rise, as tissue CO₂ returns after ROSC. That value is an [ENG] fit
  to the FU-4 audit band, not a source.
- **In these rows,** φ is 0.99996 at 60 s in both cases, so the 70 s plays no part in either regression row.

The displayed number is built like a real capnometer's:
- **EtCO₂:** the highest breath peak of the last 10 s (`l3/co2-numerics`, `ETCO2_WINDOW_S` 10 [ENG]).
- **Sampling delay and rise time:** 2.3–3.5 s and 200–280 ms per skin (research 09 §5).

The real monitors, for comparison:
- **Philips M3015A Microstream:** sampling delay typically 2.3 s, at most 3 s; rise time 190 ms (neonatal) or 240 ms
  (adult) (Philips MP2 technical data sheet; research 09-evidence-rulings row 1).
- **Philips M3014A:** total system response 3 s sidestream; mainstream < 125 ms, or < 60 ms 10–90 % (row 2).
- **Transport delay across devices:** 0.6–5.0 s, ≥ 89 % of the total response time (Anesth Analg 1994, capnometer
  transport delay; research 03 §4.2).
- **The Saadat B9 manual:** the ET value is "the peak of the weighted breath" (research 06, manual p. 270 and 305).
- **The standard:** ISO 80601-2-55 has the manufacturer state the total system response time.

None of these comes near a 70-s smoothing. **No real sidestream or mainstream capnograph shows a ≈ 70-s lag in its
displayed EtCO₂, and the engine no longer has one.** The orchestrator's note of 11:40 ("FU-4's CO₂ change = the display
lag") does not hold for these rows: their FU-4 change is the dead-space credit.

For row s9 (EtCO₂ < 5 after VF, 83 s), which is not one of these five rows: the 83 s is the alveolar washout (true
EtCO₂ below 5 at +72 s), plus the 10-s peak hold and the sampling delay. It is not an engineered display smoothing.
Whether the washout itself is fast enough against Falk 1988 is the subject of brief C.

## What is left open

1. **SV₀ (the reference for PI).** It should be the patient's settled resting stroke volume (above). Until then:
   sinus-75/pleth stays red, and afib-110 and hypovolaemia-ppv will drift again when it lands.
2. **Unsourced [ENG] values met here:**
   - The tone exponent 0.5 and its bounds 0.25–2.
   - The restitution constants.
   - The E126 noise frequencies and amplitude.
   - The 70-s rise τ of φ at ROSC.
   - The 10-s EtCO₂ window: the manuals in research 06 and 09 describe a per-breath value.
3. **MANUAL SV is higher at PEEP 0 than at PEEP 5.** Seen, not investigated.
