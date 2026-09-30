// Stage 7f: a 7g DrugBus with chosen fields set (R51: tests that need concentrations build the bus directly). Every
// fixture carries 7g's full shapes (BusAgent `unit`/`plasma`, BusVolatile `fet`/`brain`/`macAge`/`macFrac`,
// DoseLogEntry `amount`/`amountUnit`), so a renamed 7g field fails the typecheck here first.
import { PROP_HYP_C50_REF } from '../../src/l2/pk/combine.ts'; // FU-7 (E-FU7-9)
import { DRUGS } from '../../src/l2/pk/data/drugs.ts';
import { DRUG_BUS_NEUTRAL, type DrugBus } from '../../src/types-pk.ts';

export interface BusPatch {
  cns?: Partial<DrugBus['cns']>;
  nmb?: Partial<DrugBus['nmb']>;
  antagonist?: Partial<DrugBus['antagonist']>;
  agents?: DrugBus['agents'];
  doses?: DrugBus['doses'];
  volatiles?: DrugBus['volatiles'];
}

export function busFixture(p: BusPatch = {}): DrugBus {
  const b = structuredClone(DRUG_BUS_NEUTRAL);
  Object.assign(b.cns, p.cns ?? {});
  // FU-7 (addendum 20, E-FU7-9): 7g ALWAYS publishes the HYPNOTIC outputs, so a fixture that sets per-agent
  // concentrations must publish them too, at 7g's own hypnotic C50 ratios (review F10: derived, not typed — midazolam
  // 3.08/4 ≈ 0.77 µg/mL propofol-equivalent per reference dose, ketamine 3.08/0.8 = 3.85) and ketamine's `ventShare`.
  const wM = PROP_HYP_C50_REF / (DRUGS.midazolam?.cns?.hypC50 ?? 4);
  const wK = PROP_HYP_C50_REF / (DRUGS.ketamine?.cns?.hypC50 ?? 0.8);
  if (p.cns?.hypPropEq === undefined) b.cns.hypPropEq = b.cns.propCe + wM * b.cns.benzoCeMidazEq + wK * b.cns.ketamineCe;
  if (p.cns?.hypVentPropEq === undefined) b.cns.hypVentPropEq = b.cns.propCe + wM * b.cns.benzoCeMidazEq + 0.3 * wK * b.cns.ketamineCe;
  if (p.cns?.dissoc === undefined) b.cns.dissoc = b.cns.hypPropEq > 0 ? (wK * b.cns.ketamineCe) / b.cns.hypPropEq : 0;
  if (p.cns?.benzoShare === undefined) b.cns.benzoShare = b.cns.hypVentPropEq > 0 ? (wM * b.cns.benzoCeMidazEq) / b.cns.hypVentPropEq : 0;
  // The OPIOID outputs need per-agent sites and potencies a fixture does not carry (D16), so a fixture that does not
  // set them publishes NONE and 7f's duck-typed per-agent fallback reads its `agents` exactly as before FU-7.
  if (p.cns?.opioidCeFentEq === undefined) Reflect.deleteProperty(b.cns, 'opioidCeFentEq');
  if (p.cns?.opioidVentFentEq === undefined) Reflect.deleteProperty(b.cns, 'opioidVentFentEq');
  Object.assign(b.nmb, p.nmb ?? {});
  Object.assign(b.antagonist, p.antagonist ?? {});
  b.agents = { ...b.agents, ...(p.agents ?? {}) };
  b.doses = [...b.doses, ...(p.doses ?? [])];
  b.volatiles = { ...b.volatiles, ...(p.volatiles ?? {}) };
  return b;
}

/** An opioid bus entry (ng/mL): brain and ventilatory sites. */
export const opioid = (brain: number, vent: number) => ({ unit: 'ng/mL', plasma: brain, brain, vent, cumulativeMgPerKg: 0 });
/** An NMB bus entry (ng/mL): thumb and diaphragm sites. */
export const nmbAgent = (nmj: number, dia: number, cumulativeMgPerKg: number) => ({ unit: 'ng/mL', plasma: nmj, brain: nmj, nmj, dia, cumulativeMgPerKg });
/** A volatile bus entry at steady state: end-tidal = brain tension; `macAge` % atm (sevoflurane 1.8 at 40 y, N2O 104). */
export const vol = (macFrac: number, macAge: number) => ({ fet: macFrac * macAge, brain: macFrac * macAge, macAge, macFrac });
/** A dose-log entry as 7g writes it (a µg row: amount in µg). */
export const dose = (agent: string, mgPerKg: number, t: number, weightKg = 70) => ({ agent, mgPerKg, amount: mgPerKg * weightKg * 1000, amountUnit: 'mcg', t });
