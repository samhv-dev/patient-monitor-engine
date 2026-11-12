// Plan pump-rack-tci.md A2, Bolus (§4 D2 item 5, §5; PQ3 = A): a bolus from a syringe channel, as a volume or as a dose
// the host converts with the PROGRAMMED concentration (what the pump believes it gives; the patient receives the
// contents, §8). The OT-701 catalogue names no bolus function, so a drip channel has none (the button is not drawn). It
// runs at the SP-500's rapid flow rate for the loaded syringe size, which the form says from the profile ("about", as the
// catalogue prints "Approx."); the bolus volume limit is a gap until the manual. The same-drug lock and every range are
// the host's answer.
import type { PumpDevices } from '@pme/controller';
import { DRUGS } from '@pme/engine-core';
import { unitText } from '../drugs.ts';
import { h } from '../ui.ts';
import type { FaceRow } from './face-row.ts';
import { deviceName, field, FLOW_WORDS, hint, missing, num, numberInput, selectOf, type FlowDef, type FlowInput } from './form.ts';
import { listText } from './rate.ts';

export const BOLUS_WORDS = {
  button: 'Bolus',
  title: 'Bolus',
  submit: 'Give bolus',
  done: (ch: number) => `Bolus started on channel ${ch}.`,
  amount: 'Amount',
  unit: 'Unit',
  weight: 'Weight (kg)',
  theAmount: 'the amount',
  theWeight: 'the weight',
  rate: (dev: string, approx: boolean, rate: number, ml: number) => `${dev}: given at ${approx ? 'about ' : ''}${rate} mL/h with a ${ml} mL syringe`,
  bySyringe: (dev: string, sizes: string) => `${dev}: the bolus rate depends on the syringe (${sizes} mL): load one first`,
  volumeGap: 'bolus volume limit not set from the manual',
};

/** The units a bolus may be given in on a channel: mL, then the programmed drug's dose units (engine DoseUnit). */
export function bolusUnits(row: FaceRow | null): string[] {
  const u = row?.programmed ? DRUGS[row.programmed.drugId]?.amountUnit : undefined;
  const dose = u === 'mg' || u === 'mcg' ? ['mg', 'mcg', 'mg/kg', 'mcg/kg'] : u === 'units' ? ['units', 'units/kg'] : u === 'mmol' ? ['mmol', 'mmol/kg'] : [];
  return ['mL', ...dose];
}

/** The rapid rate the bolus runs at, from the SP-500 profile for the loaded syringe size, and the volume gap. */
export function bolusHint(row: FaceRow | null, devices: PumpDevices | null): string {
  if (!devices) return FLOW_WORDS.noProfile;
  const sp = devices['sp-500'];
  const s = sp.syringes.find((x) => x.ml === row?.syringeMl);
  const gap = 'gap' in sp.bolus.volume ? `; ${BOLUS_WORDS.volumeGap}` : '';
  return s ? BOLUS_WORDS.rate(deviceName(sp), s.rapid.approx, s.rapid.rate, s.ml) + gap : BOLUS_WORDS.bySyringe(deviceName(sp), listText(sp.syringes.map((x) => x.ml)));
}

function bolusFlow(x: FlowInput) {
  const amount = numberInput('amount', { min: 0 });
  const unit = selectOf('unit', bolusUnits(x.row).map((u) => [u, unitText(u)] as const), 'mL');
  const weight = numberInput('weightKg', { min: 0 });
  const weightField = field(BOLUS_WORDS.weight, weight);
  const draw = () => void (weightField.hidden = !unit.value.endsWith('/kg'));
  unit.addEventListener('change', draw);
  draw();
  const el = h('div', { class: 'pf-fields-in' }, h('div', { class: 'pf-row' }, field(BOLUS_WORDS.amount, amount), field(BOLUS_WORDS.unit, unit)), weightField, hint(bolusHint(x.row, x.devices)));
  return {
    el,
    build() {
      const a = num(amount.value);
      if (a === null) return missing(BOLUS_WORDS.theAmount);
      if (unit.value === 'mL') return { type: 'pump' as const, ch: x.ch, action: 'bolus', volumeMl: a };
      const body: Record<string, unknown> = { type: 'pump', ch: x.ch, action: 'bolus', dose: { amount: a, unit: unit.value } };
      if (unit.value.endsWith('/kg')) {
        const w = num(weight.value);
        if (w === null) return missing(BOLUS_WORDS.theWeight);
        body.weightKg = w;
      }
      return body as { type: 'pump'; ch: number; action: string };
    },
  };
}

export const BOLUS: FlowDef = { id: 'bolus', button: BOLUS_WORDS.button, title: BOLUS_WORDS.title, submit: BOLUS_WORDS.submit, done: BOLUS_WORDS.done, kinds: ['syringe'], make: bolusFlow };
