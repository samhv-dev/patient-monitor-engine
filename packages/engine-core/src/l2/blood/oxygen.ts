// Oxygen delivery and lactate (tables §5b.3 caO2/do2/svo2 rows; §5.3 lactate, critical DO2, erMax, kAnaer rows).
//   CaO2 = 13.4·Hb·SaO2·(1 − COHb − MetHb) + 0.03·PaO2   (mL/L)       DO2 = CO·CaO2 (mL/min)
//   VO2 = demand − global: extraction rises first, VO2 becomes supply-dependent only below DO2crit
//     (FU-9 F3: Cain 1977 J Appl Physiol 42:228; Shibutani 1983 Crit Care Med 11:640; Vincent & De Backer 2013 NEJM
//     369:1726 — SvO2 falls with CO in haemorrhage before VO2 does)
//   lactate deficit = max(global, regional)
//     global   = demand·(1 − DO2/DO2crit)                        below DO2crit (6 mL/kg/min) [TXT, Q42]
//     regional = demand·REGIONAL_FRAC·clamp((0.88 − q)/(0.88 − 0.40)),  q = (CO/CO0)/(demand/demand0)   [ENG, Q41/Q42]
//       (flow relative to what the current metabolism needs: under GA flow and VO2 fall together without redistribution)
//       — the regional term is heterogeneous splanchnic dysoxia: it makes lactate but does not lower the whole-body VO2
//       (the other beds extract more), so it is not subtracted from VO2 (FU-9 F3)
//   lactate: V·dL/dt = P0 + kAnaer·deficit − kLac·hbfRel·L·V                  (P0 = kLac·L0·V: steady at 1.0)
import { DO2_CRIT_ML_KG_MIN, K_ANAER, K_LAC_PER_H, NORMAL, REGIONAL_FLOW_FULL, REGIONAL_FLOW_ON, REGIONAL_FRAC } from './params.ts';

export interface O2Out {
  cao2: number; // mL/L
  do2: number; // mL/min
  vo2: number; // mL/min (actual)
  demand: number;
  deficit: number; // the LACTATE deficit (mL O2/min): max(global, regional) — FU-9 F3: VO2 is demand − global only
  er: number; // extraction ratio VO2/DO2
  svo2: number; // 0–1 (mixed venous, from content)
}

export function o2Delivery(coLpm: number, co0Lpm: number, cao2: number, demand: number, weightKg: number, demandRel = 1): Omit<O2Out, 'svo2' | 'cao2'> {
  const do2 = coLpm * cao2;
  const crit = DO2_CRIT_ML_KG_MIN * weightKg;
  const global = do2 < crit ? demand * (1 - do2 / crit) : 0;
  const q = coLpm / Math.max(0.1, co0Lpm) / Math.max(0.3, demandRel);
  const regional = demand * REGIONAL_FRAC * Math.min(1, Math.max(0, (REGIONAL_FLOW_ON - q) / (REGIONAL_FLOW_ON - REGIONAL_FLOW_FULL)));
  const deficit = Math.min(demand, Math.max(global, regional));
  const vo2 = demand - Math.min(demand, global); // FU-9 F3: extraction rises first; VO2 is supply-dependent only below DO2crit
  return { do2, vo2, demand, deficit, er: do2 > 0 ? vo2 / do2 : 1 };
}

/** Lactate amount step (mmol in vLac); `liver` is the 7d hook (1 = normal), `hbfRel` hepatic flow / baseline. */
export function stepLactate(lacMmol: number, vLacL: number, deficit: number, hbfRel: number, liver: number, dtS: number): number {
  const k = (K_LAC_PER_H / 60) * Math.max(0, hbfRel) * liver; // 1/min
  const p0 = (K_LAC_PER_H / 60) * NORMAL.lactate * vLacL; // mmol/min
  const conc = lacMmol / vLacL;
  const dm = (p0 + K_ANAER * deficit - k * conc * vLacL) * (dtS / 60);
  return Math.max(0, lacMmol + dm);
}
