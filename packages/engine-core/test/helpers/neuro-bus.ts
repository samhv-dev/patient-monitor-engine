// Stage 7f: a 7g DrugBus with chosen fields set (R51: tests that need concentrations build the bus directly). Every
// fixture carries 7g's full shapes (BusAgent `unit`/`plasma`, BusVolatile `fet`/`brain`/`macAge`/`macFrac`,
// DoseLogEntry `amount`/`amountUnit`), so a renamed 7g field fails the typecheck here first.
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
