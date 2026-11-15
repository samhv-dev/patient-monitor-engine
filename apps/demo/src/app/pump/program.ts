// Plan pump-rack-tci.md A2, Program (§4 D2 item 2, §8): the learner tells the pump what it is running — a drug from the
// pump's drug list and its concentration, and on a drip channel the IV set's drops/mL (the OT-701's set types, from its
// device profile, D12). The programme is the learner's choice and independent of what the syringe or bag holds: a
// programme that differs from the contents is not refused or warned about here (§8: the mismatch is physical, and the
// instructor's finding). The drug list is the engine's library rows a pump can run (the same rules as the engine's
// `infusion` event, pump.ts infusableRefusal), so a drug the engine would refuse is not offered.
import { DRUGS } from '@pme/engine-core';
import { drugName } from '../glossary.ts';
import { h } from '../ui.ts';
import { field, FLOW_WORDS, hint, missing, num, numberInput, selectOf, type FlowDef, type FlowInput } from './form.ts';

export const PROGRAM_WORDS = {
  button: 'Program',
  title: 'Program',
  submit: 'Program',
  done: (ch: number) => `Programmed on channel ${ch}.`,
  drug: 'Drug',
  amount: 'Amount',
  unit: 'Unit',
  perMl: 'In mL',
  set: 'IV set',
  setText: (n: number) => `${n} drops/mL`,
  concentration: 'the concentration',
  theSet: 'the IV set',
};

/** The concentration units a pump channel takes (engine pump.ts CONC_UNITS). */
const CONC_UNITS = ['mg', 'mcg', 'g', 'units', 'mmol'] as const;
type Row = (typeof DRUGS)[string];
/** Whether the engine runs `row` from a pump (pump.ts infusableRefusal, read for the list only). */
function pumpable(row: Row): boolean {
  const pk = row.pk;
  if (pk.kind === 'volatile') return false;
  if (pk.kind === 'blood' && !row.rateActsVia) return false;
  if (pk.kind === 'gamma' && pk.refRate === undefined && !row.rateActsVia) return false;
  return (CONC_UNITS as readonly string[]).includes(row.amountUnit);
}
/** The pump's drug list: every library drug it can run, by its name. */
export function pumpDrugs(): Array<readonly [string, string]> {
  return Object.values(DRUGS).filter(pumpable).map((r) => [r.id, drugName(r.id)] as const).sort((a, b) => a[1].localeCompare(b[1]));
}

function programFlow(x: FlowInput) {
  const drugs = pumpDrugs();
  const was = x.row?.programmed ?? null;
  const drug = selectOf('drugId', drugs, was?.drugId);
  const amount = numberInput('amount', { min: 0 });
  const unit = selectOf('unit', CONC_UNITS.map((u) => [u, u === 'mcg' ? 'µg' : u] as const));
  const perMl = numberInput('perMl', { min: 0 });
  perMl.value = String(was?.concentration.perMl ?? 1);
  if (was) amount.value = String(was.concentration.amount);
  const unitFor = () => (unit.value = was && was.drugId === drug.value ? was.concentration.unit : (DRUGS[drug.value]?.amountUnit ?? 'mg'));
  unitFor();
  drug.addEventListener('change', unitFor);
  const ot = x.devices?.['ot-701'] ?? null;
  const sets = x.kind === 'drip' && ot ? selectOf('set', ot.sets.map((s) => [String(s.dropsPerMl), PROGRAM_WORDS.setText(s.dropsPerMl)] as const), x.row?.set != null ? String(x.row.set) : undefined) : null;
  const el = h('div', { class: 'pf-fields-in' }, field(PROGRAM_WORDS.drug, drug),
    h('div', { class: 'pf-row' }, field(PROGRAM_WORDS.amount, amount), field(PROGRAM_WORDS.unit, unit), field(PROGRAM_WORDS.perMl, perMl)),
    x.kind === 'drip' ? (sets ? field(PROGRAM_WORDS.set, sets) : hint(FLOW_WORDS.noProfile)) : null);
  return {
    el,
    build() {
      const a = num(amount.value);
      const v = num(perMl.value);
      if (a === null || v === null) return missing(PROGRAM_WORDS.concentration);
      const body = { type: 'pump' as const, ch: x.ch, action: 'program', drugId: drug.value, concentration: { amount: a, unit: unit.value, perMl: v } };
      if (x.kind !== 'drip') return body;
      const s = sets ? num(sets.value) : null;
      return s === null ? missing(PROGRAM_WORDS.theSet) : { ...body, set: s };
    },
  };
}

export const PROGRAM: FlowDef = { id: 'program', button: PROGRAM_WORDS.button, title: PROGRAM_WORDS.title, submit: PROGRAM_WORDS.submit, done: PROGRAM_WORDS.done, kinds: ['syringe', 'drip'], make: programFlow };
