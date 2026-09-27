// Stage 7d brain constants (tables §5.1; R26). Every number cites its tables row or is [ENG] with the prototype
// number it was tuned to (docs/plans/stage-7d-organs.md "Prototype results"). Q numbers point at tables §9.
export const BRAIN_DT_S = 0.1; // brain step 10 Hz, on the gas grid (brief §3.2)
export const BRAIN_G = 1400; // adult brain mass, g [TXT] (CBF0 50 mL/100 g/min ≈ 700 mL/min)
export const CBF0 = 50; // mL/100 g/min, tables `CBF0` [P] LITFL-CBF
export const CMRO2_0 = 3.3; // mL O2/100 g/min, tables `cmro2_0` [P]
export const ICP0 = 10; // mmHg, tables `ICP0` [TXT]
export const PVI = 25; // mL, tables `pvi` [P] Marmarou (normal 25–30; exhausted < 10–13)
export const CSF_PROD_ML_MIN = 0.35; // CSF formation ≈ 500 mL/day [TXT]
/** Outflow resistance to CSF absorption, mmHg·min/mL (Marmarou; normal 6–10) — sets the CSF buffering τ
 *  ≈ Rout·PVI/(2.303·ICP) ≈ 8.7 min at ICP 10 (tables `tauCsf` 5 min [ENG], range 2–15: Q37). 8, not 10: with 10 the
 *  check-19 haematoma reached ICP 20 at 9.1 min (tables ~10–15); 8 gives 10.8 min and leaves ICP 40 at 23.7 min. */
export const R_OUT = 8;
/** Displaceable CSF, mL (tables `csfReserve` 30, range 20–50; Q37): absorption of extra CSF fades as it is used. */
export const CSF_RESERVE_ML = 30;
export const CBF_LL = 60; // autoregulation lower limit as CPP, mmHg, tables `cbfLL` [P] (Q13)
export const CBF_UL = 150; // upper limit, tables `cbfUL` [P]
export const CPP_ZERO_FLOW = 10; // below LL CBF falls linearly to 0 at CPP 10 (tables A(), [ENG shape])
export const BREAKTHROUGH_PER_MMHG = 0.01; // above UL CBF rises 1 %/mmHg (tables A())
export const CPP_REF = 80; // CPP of the reference state (MAP 90, ICP 10): pressure-passive CBF = CBF0·CPP/80 [ENG]
export const HTN_LL_SHIFT = 15; // chronic HTN: LL +15–20, tables §1.5 `htn` (Q13)
export const HTN_UL_SHIFT = 20; // UL shifts right in HTN (tables §5.1, no number) [ENG]
export const K_CO2 = 0.03; // CBF fraction per mmHg PaCO2, tables `kCO2` [P] (Q38: OpenAnesthesia ~0.04)
export const PACO2_MIN = 20; // reactivity clamped (blunted) below 20 and above 80 mmHg (tables C())
export const PACO2_MAX = 80;
/** Chronic hypocapnia: CSF pH buffering resets the CO2 reference over 6–24 h (tables §5.1 hyperventilation row). */
export const PACO2_ADAPT_TAU_S = 8 * 3600;
export const PAO2_CBF_ONSET = 60; // tables `paO2Cbf` [P] (range 50–60)
export const PAO2_CBF_DOUBLE = 30; // ×2 at PaO2 30 (tables O())
export const TAU_VASC_S = 10; // dynamic autoregulation / CO2 response τ: CBF within 30 s (tables hyperventilation row) [ENG]
export const GRUBB = 0.38; // CBV ∝ CBF^0.38, tables `grubb` [VERIFY]
export const CBV0_ML = 60; // whole-brain CBV ≈ 4.3 mL/100 g [TXT]
/** Fraction of the CBV change that reaches ICP (the rest is offset by venous re-expansion) [ENG]: with 0.4,
 *  PaCO2 40 → 30 lowers ICP by 27 % at ICP 25 / PVI 20 (tables: −25–30 %). */
export const CBV_EFF = 0.4;
export const PBTO2_0 = 25; // mmHg, tables `PbtO2_0` [P]
export const PBTO2_EXP = 0.75; // [ENG] PbtO2 ∝ (delivery/demand)^0.75, not the tables' linear form: linear gave 9.5 in check 18 (tables 10–15)
export const PBTO2_HYPEROXIA = 0.004; // tables PbtO2 formula (1 + 0.004·(PaO2 − 100)+) [ENG]
export const OER0 = 0.33; // [ENG] resting cerebral O2 extraction, chosen so SjvO2 = 0.97·(1 − 0.33) ≈ 0.65 (textbook 55–75 %; tables have no row)
export const OER_MAX = 0.75; // [ENG] extraction ceiling (tables §5.3 `erMax` range 0.6–0.75, top end: the brain extracts more than the body)
export const Q10_BRAIN = 0.07; // CMRO2 −7 %/°C, tables `q10Brain` [P]
export const HB_DEFAULT = 14; // g/dL until 7c's blood exists (Stage 3 HB_G_DL)
export const HEAD_HEIGHT_CM = 25; // tragus above the heart at 90° head-up [ENG]; 30° → 12.5 cm → MAP_head −9.2
/** Venous/CSF volume that leaves the skull at 30° head-up [ENG]: ICP 20 → 14.4 at PVI 20 (tables: −5.6 mmHg). */
export const HEADUP_VOL_ML_30 = 2.9;
export const MMHG_PER_CM_BLOOD = 0.74; // tables MAP_head = MAP − 0.74·h
// Osmotherapy (tables §5.1 mannitol/HTS rows [TXT]; shape [ENG])
export const OSM_K_MOSM = 50; // saturation: 0.25 g/kg (96 mOsm) gives 66 % of 1 g/kg's 88 % (tables "0.25 ≈ 1 g/kg")
export const OSM_VMAX_ML = 4.5; // brain-water loss at the peak of a saturating dose [ENG]: see Prototype results
export const MANNITOL_TAU_IN_MIN = 15; // onset 10–15 min, peak ≈ 40 min (tables 20–60), duration 2–6 h
export const MANNITOL_TAU_OUT_MIN = 180;
export const HTS_TAU_IN_MIN = 7; // onset 5–10 min, longer than mannitol (tables)
export const HTS_TAU_OUT_MIN = 240;
export const MANNITOL_MOSM_PER_G = 1000 / 182.17; // 5.49 mOsm/g
export const NACL_MOSM_PER_G = 2000 / 58.44; // 34.2 mOsm/g
// Cushing (tables §5.1: CPP < 40 for > 30 s → MAP +30–50 over 30–60 s, HR −20–40 %, ataxic breathing [TXT shape, ENG numbers])
export const CUSH_CPP = 40;
export const CUSH_GAP = 10; // second trigger: ICP within 10 mmHg of MAP_head (tables §5.1 Cushing row)
export const CUSH_DELAY_S = 30;
export const CUSH_OFF_S = 30; // CPP ≥ 40 this long (on the pre-surge MAP) ends the response
export const CUSH_TAU_ON_S = 15;
export const CUSH_TAU_OFF_S = 60;
/** mmHg at full drive: the centre of the tables' +30–50 [ENG]. With 50 the MANUAL engine read +54 (the 7a waveform's
 *  area MAP at HR 48 sits ≈ 0.45 of the pulse pressure above the diastolic, not the 1/3 the coupled split assumes). */
export const CUSH_DMAP = 40;
export const CUSH_HR_DROP = 0.4; // HR × (1 − 0.4·drive): 80 → 48
export const MAP_BASE_TAU_S = 120; // pre-surge MAP reference (frozen while the surge is on)
export const HERNIATION_CPP = 10; // CPP ≤ 10 for 60 s → herniation (irreversible in v1) [ENG]
export const HERNIATION_S = 60;
export const ICP_THRESHOLD = 22; // BTF2016 treatment threshold (alarm default, tables)
// TBI condition (severity s ∈ 0–1) [ENG, tables §7 check 19 uses PVI 20, ICP0 12]
export const TBI_PVI_DROP = 5; // pvi 25 → 20
export const TBI_ICP0_RISE = 2; // 10 → 12
export const TBI_AR_LOSS = 0.7; // autoregulation index 1 → 0.3 (impaired, not absent)
/** Swollen brain: the displaceable CSF reserve shrinks 30 → 10 mL at severity 1 [ENG, DEVIATION from the tables'
 *  normal-brain `csfReserve` 20–50]: check 19's own timeline (12 → 20 by 10–15 min → 40 by 20–25 min at 1 mL/min, PVI
 *  20) needs ≈ 11 mL of total compensation; with a reserve of 20 ICP never reached 40 in 30 min, with 12–14 it took
 *  25.7–27.7 min. With 10 (and R_OUT 8): ICP 20 at 10.8 min, 40 at 23.7 min. Q37. */
export const TBI_RESERVE_DROP = 20;
