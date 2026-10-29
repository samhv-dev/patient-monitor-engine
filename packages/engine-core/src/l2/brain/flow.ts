// Cerebral blood flow, metabolism and brain oxygen (tables §5.1): CBF = CBF0·A(CPP)·min(C(PaCO2)·O(PaO2)·M, reserve),
// with M the flow–metabolism coupling plus the direct vasodilation of volatiles/ketamine (tables "Anaesthetic and
// treatment effects") and the reserve the dilation left between autoregulation's state and maximal dilation; CBV
// follows Grubb; PbtO2 and SjvO2 from the delivery/demand ratio.
import {
  BREAKTHROUGH_PER_MMHG, CPP_REF, CPP_ZERO_FLOW, GRUBB, K_CO2, OER0, OER_MAX, PACO2_MAX, PACO2_MIN, PAO2_CBF_DOUBLE,
  PAO2_CBF_ONSET, PBTO2_0, PBTO2_EXP, PBTO2_HYPEROXIA, Q10_BRAIN,
} from './params.ts';

/**
 * Per-agent anaesthetic state in the tables' terms (§5.1 rows): the INTERIM/fallback input and the unit-test
 * vocabulary. In the engine the drugs arrive as `BrainDrugs` from the drug model's bus (and the neuro model's CMRO2),
 * see organs/inputs.ts.
 */
export interface BrainAnaesthesia {
  propofolE: number; // 0–1 fractional effect, E = Ce/(Ce + C50)
  sevoMac: number;
  isoMac: number;
  ketamineE: number; // 0–1
}
export const NO_ANAESTHESIA: BrainAnaesthesia = { propofolE: 0, sevoMac: 0, isoMac: 0, ketamineE: 0 };
/** What the brain model consumes: the drug CMRO2 multiplier (normothermic) and the direct cerebral vasodilation. */
export interface BrainDrugs {
  cmro2Mult: number; // 1 = none (neuro: `neuro.outputs.cmro2Mult`, else drugs: `bus.cns.cmro2Mult`)
  cbfVaso: number; // 1 = none (the drug model's `bus.cns.cbfVaso`)
}
export const NO_DRUGS: BrainDrugs = { cmro2Mult: 1, cbfVaso: 1 };

/** Pressure autoregulation A(CPP) with intact regulation (tables A(): plateau [LL, UL], linear to 0 at 10, +1 %/mmHg above UL). */
export function autoregIntact(cpp: number, ll: number, ul: number): number {
  if (cpp <= CPP_ZERO_FLOW) return 0;
  if (cpp < ll) return (cpp - CPP_ZERO_FLOW) / (ll - CPP_ZERO_FLOW);
  if (cpp <= ul) return 1;
  return 1 + BREAKTHROUGH_PER_MMHG * (cpp - ul);
}

/** A with an autoregulation index ar (1 intact, 0 pressure-passive: CBF ∝ CPP/CPP_REF). TBI impairs it. */
export function autoreg(cpp: number, ll: number, ul: number, ar: number): number {
  const passive = Math.max(0, cpp) / CPP_REF;
  return ar * autoregIntact(cpp, ll, ul) + (1 - ar) * passive;
}

/**
 * The cerebral vasodilatory reserve: how much more the resistance vessels can still dilate, from the state pressure
 * autoregulation holds them in at this CPP, before they are maximally dilated — as a flow multiple ≥ 1.
 * Maximal dilation is the pressure-passive line A() already follows below the lower limit, where autoregulation has
 * run out of dilation and flow falls with pressure: F_max = (CPP − CPP_ZERO_FLOW)/(LL − CPP_ZERO_FLOW), and
 * reserve = F_max / A(CPP) [D: no new constant]. At CPP 80 (LL 60) it is 70/50 = 1.40; autoregulation spends it as
 * CPP falls through the plateau (1.20 at CPP 70); at and below LL it is 1 and the CO2 response is lost — [P] Harper &
 * Glass 1965 (J Neurol Neurosurg Psychiatry 28:449, dogs, read through Gersten's sigmoid fit to their data, arXiv
 * physics/9911029 [S]: the hypercapnic ceiling relative to PaCO2 40 is 2.11 at MAP 150, 1.52 at 100, 0.997 ± 0.010
 * at 50); [P abstract] Okuda 1976 (J Neurol Neurosurg Psychiatry 39:221, baboons: abolished at systolic 60, kept at
 * higher pressures); [P abstract] Gregory 1981 (J Cereb Blood Flow Metab 1:195, cats at MAP 36–37: none with
 * trimetaphan, < half with nitroprusside). The same sharing moves the limits with anything that raises or lowers CBF,
 * notably CO2 ([P abstract] Paulson, Strandgaard & Edvinsson 1990, Cerebrovasc Brain Metab Rev 2:161): hypercapnia
 * spends the reserve autoregulation needs, so its plateau is lost. Chronic HTN (LL 75) leaves 70/65 at CPP 80.
 */
export function dilatorReserve(cpp: number, ll: number, ul: number, ar: number): number {
  const a = autoreg(cpp, ll, ul, ar);
  if (a <= 0) return 1;
  return Math.max(1, Math.max(0, cpp - CPP_ZERO_FLOW) / (ll - CPP_ZERO_FLOW) / a);
}

/**
 * The dilator limbs (CO2, hypoxia, the drugs' direct and coupled effects) act on one vessel tone, so they spend one
 * reserve: the combined request (their product) is delivered while it fits inside the reserve and no further, so at
 * maximal dilation no limb adds flow and what one limb spends another cannot. A constricting request (< 1) is not
 * dilation and always passes. Inside the reserve each limb's sourced gain is delivered unchanged: the 3 %/mmHg of
 * CO2 up to PaCO2 53 at CPP 80, the hypoxic ×(60 − PaO2)/30 down to PaO2 48 [D].
 */
export function spendReserve(request: number, reserve: number): number {
  return Math.min(request, reserve);
}

/** CO2 reactivity C(PaCO2) = 1 + k·(PaCO2 − ref), PaCO2 clamped to 20–80 (tables C()). ref adapts over hours. */
export function co2Factor(paco2: number, ref = 40, k = K_CO2): number {
  const p = Math.min(PACO2_MAX, Math.max(PACO2_MIN, paco2));
  return Math.max(0.1, 1 + k * (p - ref));
}

/** O2 reactivity: 1 above PaO2 60, ×2 at 30, linear (tables O()), floor at PaO2 20. */
export function o2Factor(pao2: number): number {
  const p = Math.max(20, pao2);
  return p >= PAO2_CBF_ONSET ? 1 : 1 + (PAO2_CBF_ONSET - p) / (PAO2_CBF_ONSET - PAO2_CBF_DOUBLE);
}

/** Hypothermia: CMRO2 −7 %/°C below 37 (tables `q10Brain`), floor 0.3. */
export function tempCmro2(tempC: number): number {
  return Math.max(0.3, 1 - Q10_BRAIN * (37 - tempC));
}

/** CMRO2 relative to awake normothermia: propofol ×(1 − 0.5E), sevo ×(1 − 0.25·MAC), iso ×(1 − 0.3·MAC), both floor 0.5;
 *  ketamine ×(1 + 0.1E); temperature −7 %/°C (tables §5.1 rows; Slupe2018, Matta1999, LITFL). */
export function cmro2Rel(a: BrainAnaesthesia, tempC: number): number {
  const vol = Math.max(0.5, (1 - 0.25 * a.sevoMac) * (1 - 0.3 * a.isoMac));
  return (1 - 0.5 * a.propofolE) * vol * (1 + 0.1 * a.ketamineE) * tempCmro2(tempC);
}

/** Net CBF change of a volatile at a MAC (Matta 1999 MCA velocity: sevo +4 % at 0.5, +17 % at 1.5; iso +19 %, +72 %). */
function volatileNet(mac: number, at05: number, at15: number): number {
  if (mac <= 0) return 1;
  return mac <= 0.5 ? 1 + (at05 * mac) / 0.5 : 1 + at05 + (at15 - at05) * (mac - 0.5);
}

/** Direct cerebral vasodilation beyond coupling: the net volatile effect divided by its metabolic share; ketamine +40 % at E 1. */
export function vasoDirect(a: BrainAnaesthesia): number {
  const sevoMet = Math.max(0.5, 1 - 0.25 * a.sevoMac);
  const isoMet = Math.max(0.5, 1 - 0.3 * a.isoMac);
  const sevo = volatileNet(a.sevoMac, 0.04, 0.17) / sevoMet;
  const iso = volatileNet(a.isoMac, 0.19, 0.72) / isoMet;
  return sevo * iso * (1 + 0.4 * a.ketamineE);
}

/** The tables' per-agent rows as the model's drug input (the INTERIM fallback: `thermal` GA without the drug model). */
export function drugsOf(a: BrainAnaesthesia): BrainDrugs {
  return { cmro2Mult: cmro2Rel(a, 37), cbfVaso: vasoDirect(a) };
}

/** Grubb: CBV/CBV0 = (CBF/CBF0)^0.38. */
export function cbvRel(cbfRel: number): number {
  return Math.max(0, cbfRel) ** GRUBB;
}

/** Arterial O2 content, mL/dL. */
export function caO2(hb: number, sao2: number, pao2: number): number {
  return 1.34 * hb * sao2 + 0.003 * pao2;
}

/**
 * Brain oxygen from the delivery/demand ratio r = (CBF·CaO2/CMRO2) relative to awake normal: PbtO2 = 25·r^0.75·
 * (1 + 0.004·(PaO2 − 100)+) [ENG]; SjvO2 = SaO2·(1 − OER), OER = 0.33/r capped at 0.75 [ENG] (params.ts).
 */
export function brainOxygen(r: number, sao2: number, pao2: number): { pbto2: number; sjvo2: number; oer: number } {
  const rr = Math.max(0, r);
  const pbto2 = PBTO2_0 * rr ** PBTO2_EXP * (1 + PBTO2_HYPEROXIA * Math.max(0, pao2 - 100));
  const oer = rr > 0 ? Math.min(OER_MAX, OER0 / rr) : OER_MAX;
  return { pbto2, sjvo2: sao2 * (1 - oer), oer };
}
