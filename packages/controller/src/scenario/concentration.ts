// DC1 (docs/plans/scenario-builder.md §13, BQ11 = B; shared with docs/plans/pump-rack-tci.md E2): a drug's plasma and
// effect-site concentration in the PATIENT as a pme-scenario/2 phase-rule variable, `cp:<drugId>` and `ce:<drugId>`.
// The value is the drug panel row's `cp`/`ce` (DrugPanelRow, the engine's 1 Hz `drugs` event), in that row's own unit
// (`concUnit`), never a pump's target or prediction. Only a row the engine carries in a compartment model has one: the
// propofol and opioid models, the NMB agents and sugammadex, the per-kg rows (the vasoactives in rate-equivalents, the
// local anaesthetics, magnesium). The rest are refused, each with why.
import { DRUGS, concUnit } from '@pme/engine-core';
import type { ScenarioDocV2 } from './types-v2.ts';
import { namedRules, walkLeaves } from './rules.ts';

/** `cp:<drugId>` (plasma) or `ce:<drugId>` (effect site). */
export type ConcentrationVar = `cp:${string}` | `ce:${string}`;
export const CONCENTRATION_VAR = /^(cp|ce):([A-Za-z][A-Za-z0-9_.-]{0,63})$/;
/** The drugs the infusion-pump plan gives a compartment plant (E3a–E3c, its PQ6 = B). */
const PUMP_PLAN_PLANTS: ReadonlySet<string> = new Set(['dexmedetomidine', 'midazolam', 'ketamine']);

export type ConcentrationInfo =
  | { ok: true; site: 'cp' | 'ce'; drugId: string; unit: string; words: string }
  | { ok: false; site: 'cp' | 'ce'; drugId: string; reason: string };

/** A rule variable as a concentration: null when it is not a `cp:`/`ce:` name (a truthVar); else the drug, the unit and
 *  the words ("effect-site propofol"), or why the engine has no such concentration. */
export function concentrationVar(v: string): ConcentrationInfo | null {
  const m = CONCENTRATION_VAR.exec(v);
  if (!m) return null;
  const site = m[1] as 'cp' | 'ce';
  const drugId = m[2] as string;
  const row = DRUGS[drugId];
  if (!row) return { ok: false, site, drugId, reason: `no drug "${drugId}" in the engine` };
  const name = row.name.charAt(0).toLowerCase() + row.name.slice(1);
  const no = (why: string) => ({ ok: false as const, site, drugId, reason: `${v}: ${why}` });
  switch (row.pk.kind) {
    case 'model':
    case 'nmb':
    case 'perKg':
      return { ok: true, site, drugId, unit: concUnit(row), words: `${site === 'cp' ? 'plasma' : 'effect-site'} ${name}` };
    case 'gamma':
      return no(`the engine models ${name} only as an effect curve over time (its panel row is "× ref dose", not a concentration): it has no plasma or effect-site compartment to read${PUMP_PLAN_PLANTS.has(drugId) ? '; the infusion-pump plan\'s E3a–E3c give it one' : ''}`);
    case 'volatile':
      return no(`${name} is an inhaled agent: its level is the vaporiser's end-tidal and brain fraction, not a plasma row`);
    case 'blood':
      return no(`the blood model carries ${name}'s action (its chemistry); the drug model keeps no plasma concentration for it`);
  }
}

/** The concentration variables a card's rules read, once each, in the order first met: what the driver feeds a runner. */
export function ruleConcentrations(doc: ScenarioDocV2): Array<{ name: ConcentrationVar; site: 'cp' | 'ce'; drugId: string }> {
  const out = new Map<string, { name: ConcentrationVar; site: 'cp' | 'ce'; drugId: string }>();
  for (const nr of namedRules(doc)) {
    if (nr.rank !== 3) continue; // a display rule reads the displayed numerics, never a concentration
    walkLeaves(nr.rule, nr.name, (leaf) => {
      const w = 'value' in leaf ? leaf.value : 'slope' in leaf ? leaf.slope : 'unchanged' in leaf ? leaf.unchanged : null;
      const m = w ? CONCENTRATION_VAR.exec(w.var) : null;
      if (m && !out.has(w!.var)) out.set(w!.var, { name: w!.var as ConcentrationVar, site: m[1] as 'cp' | 'ce', drugId: m[2] as string });
    });
  }
  return [...out.values()];
}
