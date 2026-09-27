// Stage 7x: display metadata per path — label, unit, digits and a scale into clinical units. A small curated map
// for the values a clinician reads first; everything else gets its unit from the field name and its digits from
// its magnitude (format.ts), so new fields need no entry here.
export interface Meta {
  label: string;
  unit: string;
  /** Fixed decimals; undefined → by magnitude. */
  digits?: number;
  /** Displayed = raw × scale (e.g. mmHg·s/mL → dyn·s/cm⁵). */
  scale: number;
  /** Curated rows sort first in their section, in this map's order. */
  rank: number;
  /**
   * Absolute change tolerance in raw units, for quantities where 2 % of the baseline is the wrong size (pH, core
   * temperature, PaCO2, K, lactate); 'sat' = one saturation point (1 on a % scale, 0.01 on a fraction). Undefined →
   * the 2 % default (format.ts `CHANGE_REL`).
   */
  tol?: number | 'sat';
}

const DYN = 1333.22; // 1 mmHg·s/mL = 1333.22 dyn·s/cm⁵
type Entry = [path: string, label: string, unit: string, digits?: number, scale?: number];
const CURATED: Entry[] = [
  // monitor output
  ['mon.hr', 'HR', 'bpm', 0], ['mon.abpSys', 'ABP sys', 'mmHg', 0], ['mon.abpDia', 'ABP dia', 'mmHg', 0], ['mon.abpMean', 'ABP mean', 'mmHg', 0],
  ['mon.spo2', 'SpO₂', '%', 0], ['mon.etco2', 'EtCO₂', 'mmHg', 0], ['mon.rr', 'RR', '/min', 0], ['mon.cvpMean', 'CVP', 'mmHg', 0],
  ['mon.papSys', 'PAP sys', 'mmHg', 0], ['mon.papDia', 'PAP dia', 'mmHg', 0], ['mon.papMean', 'PAP mean', 'mmHg', 0],
  ['mon.tempCore', 'Temp core', '°C', 1], ['mon.pr', 'PR', 'bpm', 0], ['mon.pi', 'PI', '%', 1],
  ['mon.nibpSys', 'NIBP sys', 'mmHg', 0], ['mon.nibpDia', 'NIBP dia', 'mmHg', 0], ['mon.nibpMean', 'NIBP mean', 'mmHg', 0], ['mon.qtc', 'QTc', 'ms', 0],
  // circulation summary (7a `circ` event, 1 Hz)
  ['ev.circ.co', 'CO', 'L/min', 2], ['ev.circ.sv', 'SV', 'mL', 0], ['ev.circ.ef', 'EF', '%', 0, 100],
  ['ev.circ.svr', 'SVR', 'dyn·s/cm⁵', 0, DYN], ['ev.circ.pvr', 'PVR', 'dyn·s/cm⁵', 0, DYN],
  ['ev.circ.lvedv', 'LVEDV', 'mL', 0], ['ev.circ.lvesv', 'LVESV', 'mL', 0], ['ev.circ.lvedp', 'LVEDP', 'mmHg', 1], ['ev.circ.lvsp', 'LV systolic', 'mmHg', 0],
  ['ev.circ.svRv', 'SV (RV)', 'mL', 0], ['ev.circ.pmsf', 'Pmsf', 'mmHg', 1], ['ev.circ.cpp', 'Coronary perfusion pressure', 'mmHg', 0],
  ['ev.circ.supplyDemand', 'Coronary supply/demand', '', 2], ['ev.circ.kIsch', 'Ischaemia factor', '', 2],
  ['hemo.circ.p.rSys', 'R systemic (model)', 'mmHg·s/mL', 3], ['hemo.circ.p.eesLv', 'Ees LV', 'mmHg/mL', 2], ['hemo.circ.p.eesRv', 'Ees RV', 'mmHg/mL', 3],
  ['hemo.circ.hrModel', 'HR (model)', 'bpm', 0],
  // ECG inputs: the potassium the ECG morphology reads (stages push their changes into it as deltas, R51 §6)
  ['mods.k', 'K⁺ (ECG input)', 'mmol/L', 2],
  // lungs and gas
  ['resp.o2.pao2', 'PaO₂', 'mmHg', 0], ['resp.o2.sa', 'SaO₂', '%', 1, 100], ['resp.o2.fa', 'FAO₂', '%', 1, 100], ['resp.co2.pf', 'PaCO₂ (pf)', 'mmHg', 1],
  ['resp.shunt', 'Shunt', '%', 1, 100], ['ev.lungState.complianceMlPerCmH2O', 'Compliance', 'mL/cmH₂O', 0],
  ['ev.lungState.resistanceCmH2OPerLps', 'Resistance', 'cmH₂O/L/s', 1], ['ev.lungState.shunt', 'Shunt (lung)', '%', 1, 100],
  ['ev.lungState.deadSpaceMl', 'Dead space', 'mL', 0], ['ev.lungState.frcMl', 'FRC', 'mL', 0], ['resp.etco2', 'EtCO₂ (model)', 'mmHg', 1],
  // temperature (Stage 3 thermal model)
  ['resp.temp.tc', 'Core temp (model)', '°C', 2],
  // controls
  ['ev.state.values.sbp', 'SBP (truth)', 'mmHg', 0], ['ev.state.values.dbp', 'DBP (truth)', 'mmHg', 0], ['ev.state.values.hr', 'HR (truth)', 'bpm', 0],
];
/**
 * Absolute change tolerances by field name (whole path; `.to`/`.from` of an L1 ramp count as the variable) [ENG]:
 * pH 0.02; temperature 0.2 °C; SpO2/SaO2/SvO2 one point; PaCO2/EtCO2 2 mmHg; K 0.2 mmol/L; lactate 0.3 mmol/L. `k`
 * is potassium only under `mods`, the L1 variable, `blood` and the lab events (elsewhere it is a step index or a
 * valve constant).
 */
const TOLERANCES: Array<[RegExp, number | 'sat']> = [
  [/(^|\.)(ph|pH)(Art|Ven|a|v)?(\.(to|from))?$|Ph$/, 0.02],
  [/(^|\.)(temp|tempC|tempCore|tempPeriph|tempBlood)(\.(to|from))?$|TempC$|^resp\.temp\.t[cp]$/, 0.2],
  [/(^|\.)(spo2|sao2|svo2|scvo2|sjvo2|so2|sa)(\.(to|from))?$/i, 'sat'],
  [/(^|\.)(paco2|pco2|pvco2|etco2|petco2)(\.(to|from))?$|^resp\.co2\.pf$/i, 2],
  [/^mods\.k$|^(l1\.coupled|ev\.state\.values)\.k$|^l1\.vars\.k\.(to|from)$|^(blood|ev\.labs|ev\.labResult)\..+\.k$|(^|\.)(kPlus|potassium|kMmolL)$/, 0.2],
  [/(^|\.)(lac|lactate|lactateMmolL)$/i, 0.3],
];
const tolOf = (path: string): number | 'sat' | undefined => TOLERANCES.find(([re]) => re.test(path))?.[1];

const BY_PATH = new Map<string, Meta>(
  CURATED.map(([p, label, unit, digits, scale], rank) => {
    const m: Meta = { label, unit, digits, scale: scale ?? 1, rank };
    const tol = tolOf(p);
    if (tol !== undefined) m.tol = tol;
    return [p, m];
  }),
);

/**
 * Unit from the field name's suffix (the engine's naming convention: vtMl, rateMlPerMin, flowLpm, prMs, …). Order
 * matters: the concentration suffixes (…PgMl, …NgMl, …UuMl) come before the bare …Ml, …MgPerKg before …Kg.
 */
const SUFFIX_UNITS: Array<[RegExp, string]> = [
  [/MlPerMin$|MlMin$/, 'mL/min'], [/MlPerCmH2O$/, 'mL/cmH₂O'], [/PgMl$/, 'pg/mL'], [/NgMl$/, 'ng/mL'], [/UuMl$/, 'µU/mL'],
  [/MgDl$/, 'mg/dL'], [/MlKgH$/, 'mL/kg/h'], [/NmolL$/, 'nmol/L'], [/TempC$|^tempC$/, '°C'], [/MgPerKg$/, 'mg/kg'],
  [/Ml$/, 'mL'], [/Lpm$/, 'L/min'], [/MmHg$|Mmhg$/, 'mmHg'],
  [/CmH2O$/, 'cmH₂O'], [/Ms$/, 'ms'], [/Kg$/, 'kg'], [/Bpm$|Ppm$/, '/min'], [/Pct$/, '%'], [/MmolL$/, 'mmol/L'], [/Hz$/, 'Hz'],
  [/Deg$/, '°'], [/Ma$/, 'mA'], [/J$/, 'J'], [/Y$/, 'y'], [/^(sbp|dbp|map|cvp|pcwp|pawp|papSys|papDia|lvedp|lvsp|mapSet|cpp)$/, 'mmHg'],
];

const cache = new Map<string, Meta>();
export function metaOf(path: string): Meta {
  const hit = BY_PATH.get(path) ?? cache.get(path);
  if (hit) return hit;
  const last = path.slice(path.lastIndexOf('.') + 1);
  const unit = SUFFIX_UNITS.find(([re]) => re.test(last))?.[1] ?? '';
  const m: Meta = { label: last, unit, scale: 1, rank: Number.POSITIVE_INFINITY };
  const tol = tolOf(path);
  if (tol !== undefined) m.tol = tol;
  cache.set(path, m);
  return m;
}

/**
 * The unit a sibling leaf declares for an uncurated number without a suffix unit: `<name>Unit` (7g's panel
 * `rate`/`rateUnit`), `amountUnit` for `…Amount`, else the object's `unit` (7g's bus agents: `plasma`, `brain`, `nmj`
 * in the drug's concentration unit). A unit in the field name wins over a sibling (`cumulativeMgPerKg` stays mg/kg).
 */
export function siblingUnit(path: string, get: (p: string) => unknown): string | undefined {
  const dot = path.lastIndexOf('.');
  if (dot < 0) return undefined;
  const parent = path.slice(0, dot);
  const last = path.slice(dot + 1);
  if (/[uU]nit$/.test(last)) return undefined;
  for (const p of [`${path}Unit`, /Amount$/.test(last) ? `${parent}.amountUnit` : '', `${parent}.unit`]) {
    const u = p ? get(p) : undefined;
    if (typeof u === 'string' && u !== '') return u;
  }
  return undefined;
}
