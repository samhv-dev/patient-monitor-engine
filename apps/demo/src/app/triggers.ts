// A scenario transition's trigger in clinical words ("EtCO₂ ≥ 20 mmHg for 30 s", "Shock of at least 150 J", "Adrenaline
// given"), for the run strip's "next" list. The controller's own describeTransition prints engine ids; this is the
// panel's copy of the same grammar with glossary labels and state names.
import { DRUGS, type StateVar } from '@pme/engine-core';
import type { ScenarioDoc, Transition, When } from '@pme/controller';
import { drugName, labelOf } from './glossary.ts';
import { SENSORS } from './describe.ts';
import { vitalLabel, vitalOf } from './vitals.ts';

const OP: Record<string, string> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥', '==': '=', '!=': '≠' };
const KIND: Record<string, string> = {
  defib: 'Defibrillator', drug: 'Drug', cpr: 'CPR', fluid: 'Fluid', airway: 'Airway', ventilation: 'Ventilation', pacer: 'Pacing', bleed: 'Bleeding',
  preoxygenate: 'Preoxygenation', line: 'Invasive line', surgical: 'Surgical event', condition: 'Condition',
};

function varText(v: string): string {
  const s = vitalOf(v as StateVar);
  return s ? vitalLabel(v as StateVar) : labelOf(`mon.${v}`) ?? 'A vital sign';
}

export function whenText(w: When): string {
  if ('afterS' in w) return `after ${dur(w.afterS)} in this state`;
  if ('atScenarioS' in w) return `at ${dur(w.atScenarioS)} into the scenario`;
  if ('vital' in w) {
    const s = vitalOf(w.vital.var as StateVar);
    return `${varText(w.vital.var)} ${OP[w.vital.op] ?? w.vital.op} ${w.vital.value}${s ? ` ${s.unit}` : ''}${w.vital.forS ? ` for ${dur(w.vital.forS)}` : ''}`;
  }
  if ('event' in w) {
    const e = w.event;
    if (e.kind === 'defib') return e.action === 'shock' ? `a shock${e.minJ ? ` of at least ${e.minJ} J` : ''}` : e.action === 'charge' ? 'the defibrillator charged' : 'a defibrillator action';
    if (e.kind === 'drug') return `${e.drugId && DRUGS[String(e.drugId)] ? drugName(String(e.drugId)) : 'a drug'} given${e.minDose ? ` (at least ${e.minDose})` : ''}`;
    if (e.kind === 'cpr') return e.active === false ? 'CPR stopped' : 'CPR started';
    if (e.kind === 'fluid') return `fluid given${e.minVolumeMl ? ` (at least ${e.minVolumeMl} mL)` : ''}`;
    if (e.kind === 'pacer') return `pacing${e.minMa ? ` at ${e.minMa} mA or more` : ''}`;
    return `${(KIND[e.kind] ?? 'An intervention').toLowerCase()}`;
  }
  if ('sensor' in w) return `${SENSORS[w.sensor.sensor] ?? 'a sensor'} ${w.sensor.state === 'off' || w.sensor.state === 'none' ? 'removed' : 'attached'}`;
  if ('manual' in w) return `you press "${w.manual.label}"`;
  if ('all' in w) return w.all.map(whenText).join(' and ');
  return w.any.map(whenText).join(' or ');
}

/** "a shock of at least 150 J → ROSC (30 % chance, else stays)". */
export function transitionText(t: Transition, doc: ScenarioDoc | null): string {
  const name = (id: string) => doc?.states.find((s) => s.id === id)?.label ?? 'next state';
  const p = t.probability !== undefined ? ` (${Math.round(t.probability * 100)} % chance${t.else ? `, else ${name(t.else)}` : ''})` : '';
  const w = whenText(t.when);
  return `${w.charAt(0).toUpperCase()}${w.slice(1)}: ${name(t.to)}${p}`;
}

/** Seconds left for a time trigger, or null. */
export function countdown(t: Transition, inState: number, scenarioT: number): number | null {
  if ('afterS' in t.when) return Math.max(0, t.when.afterS - inState);
  if ('atScenarioS' in t.when) return Math.max(0, t.when.atScenarioS - scenarioT);
  return null;
}

const dur = (s: number): string => (s >= 60 && s % 60 === 0 ? `${s / 60} min` : s >= 60 ? `${Math.floor(s / 60)} min ${s % 60} s` : `${s} s`);
