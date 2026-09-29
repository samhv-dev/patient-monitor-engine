// Human-readable trigger text for the panel and the remote ("EtCO2 ≥ 20 for 30 s", …). Pure; no ajv.
import type { Transition, When } from './types.ts';

const OP: Record<string, string> = { '<': '<', '<=': '≤', '>': '>', '>=': '≥', '==': '=', '!=': '≠' };
const MIN_TEXT: Record<string, string> = { minJ: '≥ %s J', minDose: 'dose ≥ %s', minVolumeMl: '≥ %s mL', minMa: '≥ %s mA' };

/**
 * FU-8 (Stage 9 R-S9-2): the words a host prints for engine ids — a vital (`etco2`), an event value (a drug id), a
 * sensor and a scenario state. The controller owns no glossary (R56: the app's glossary is the one label source), so
 * the host passes its labeller; without one the ids print as before.
 */
export interface Labeller {
  vital?: (id: string) => string;
  value?: (key: string, v: string) => string;
  sensor?: (id: string) => string;
  state?: (id: string) => string;
}

export function describeWhen(w: When, lx: Labeller = {}): string {
  if ('afterS' in w) return `after ${w.afterS} s in state`;
  if ('atScenarioS' in w) return `at scenario ${w.atScenarioS} s`;
  if ('vital' in w) return `${lx.vital?.(w.vital.var) ?? w.vital.var} ${OP[w.vital.op] ?? w.vital.op} ${w.vital.value}${w.vital.forS ? ` for ${w.vital.forS} s` : ''}`;
  if ('event' in w) {
    const parts = Object.entries(w.event)
      .filter(([k]) => k !== 'kind')
      .map(([k, v]) => (MIN_TEXT[k] ? (MIN_TEXT[k] as string).replace('%s', String(v)) : (lx.value?.(k, String(v)) ?? String(v))));
    return `${w.event.kind}${parts.length ? ` ${parts.join(' ')}` : ''}`;
  }
  if ('sensor' in w) return `${lx.sensor?.(w.sensor.sensor) ?? w.sensor.sensor} ${w.sensor.state}`;
  if ('manual' in w) return `button "${w.manual.label}"`;
  if ('all' in w) return `all of (${w.all.map((x) => describeWhen(x, lx)).join('; ')})`;
  return `any of (${w.any.map((x) => describeWhen(x, lx)).join('; ')})`;
}

export function describeTransition(t: Transition, lx: Labeller = {}): string {
  const st = (id: string) => lx.state?.(id) ?? id;
  const p = t.probability !== undefined ? ` · p ${t.probability}${t.else ? ` else → ${st(t.else)}` : ' else stay'}` : '';
  return `${describeWhen(t.when, lx)} → ${st(t.to)}${p}`;
}

/** The manual label of a transition, or null when it has no manual trigger. */
export function manualLabel(w: When): string | null {
  if ('manual' in w) return w.manual.label;
  if ('all' in w || 'any' in w) {
    for (const c of 'all' in w ? w.all : w.any) {
      const l = manualLabel(c);
      if (l !== null) return l;
    }
  }
  return null;
}
