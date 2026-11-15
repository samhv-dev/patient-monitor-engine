// Plan pump-rack-tci.md A2, Rate (§4 D2 item 3, D12): run the channel at a rate in mL/h, a dose rate in the
// programme's unit (the host converts it with the PROGRAMMED concentration, as a real pump does), or, on a drip channel,
// drops/min with the programmed IV set, and a volume limit. Every range the form shows is the device profile's own
// figure for the loaded syringe size or the programmed set (S1's sp-500.json, ot-701.json), and a figure the
// catalogue does not give is said as a gap in the face's words; nothing is checked here: the host refuses a rate out of
// range in the profile's words (C2), and the face shows them.
import type { PumpDevices } from '@pme/controller';
import { DRUGS } from '@pme/engine-core';
import { unitText } from '../drugs.ts';
import { h } from '../ui.ts';
import type { FaceRow } from './face-row.ts';
import type { ChannelKind } from './face.ts';
import { deviceName, field, FLOW_WORDS, hint, missing, num, numberInput, selectOf, type FlowDef, type FlowInput } from './form.ts';

export const RATE_WORDS = {
  button: 'Rate',
  title: 'Rate',
  submit: 'Set rate',
  done: (ch: number) => `Rate set on channel ${ch}.`,
  rate: 'Rate',
  unit: 'Unit',
  weight: 'Weight (kg)',
  limit: 'Volume limit (mL)',
  theRate: 'the rate',
  theWeight: 'the weight',
  bySyringe: (dev: string, sizes: string) => `${dev}: the range depends on the syringe (${sizes} mL): load one first`,
  bySet: (dev: string, sets: string) => `${dev}: the range depends on the IV set (${sets} drops/mL): program one first`,
  syringe: (dev: string, min: number, max: number, ml: number, step: number) => `${dev}: ${min}–${max} mL/h with a ${ml} mL syringe, in ${step} mL/h steps`,
  drip: (dev: string, a: { min: number; max: number }, d: { min: number; max: number }, set: number) => `${dev}: ${a.min}–${a.max} mL/h or ${d.min}–${d.max} drops/min with a ${set} drops/mL set`,
  dripStep: (step: number) => `, in ${step} mL/h steps`,
  // the face's words for the profile's gaps (D12; the gap's own text names the manual and is not shown)
  doseGap: 'dose-rate limits not set from the manual',
  dropsGap: 'drops/min step not set from the manual',
  limitRange: (min: number, max: number, none: boolean) => `Volume limit ${min}–${max} mL${none ? ', or none' : ''}`,
};

/** "10, 20, 30 and 50" */
export const listText = (xs: readonly (string | number)[]): string => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs.at(-1)}`);
const isGap = (v: unknown): boolean => !!v && typeof (v as { gap?: unknown }).gap === 'string';

/** The dose-rate units a channel offers for its programmed drug (engine RateUnit; none until it is programmed). */
export function doseRateUnits(drugId: string | null): string[] {
  const u = drugId ? DRUGS[drugId]?.amountUnit : undefined;
  if (u === 'mg' || u === 'mcg') return ['mcg/kg/min', 'mcg/min', 'mcg/kg/h', 'mg/kg/h', 'mg/h', 'mg/min'];
  if (u === 'units') return ['units/min', 'units/h'];
  if (u === 'mmol') return ['mmol/h'];
  return [];
}
/** Every unit the Rate form offers on a channel: mL/h first, drops/min on a drip channel, then the dose rates. */
export function rateUnits(kind: ChannelKind, row: FaceRow | null): string[] {
  return ['mL/h', ...(kind === 'drip' ? ['drops/min'] : []), ...doseRateUnits(row?.programmed?.drugId ?? null)];
}

/** The device's range for this channel and unit, from its profile (the face's words for its gaps). */
export function rateHints(kind: ChannelKind, row: FaceRow | null, devices: PumpDevices | null, unit: string): string[] {
  if (!devices) return [FLOW_WORDS.noProfile];
  if (kind === 'syringe') {
    const sp = devices['sp-500'];
    const s = sp.syringes.find((x) => x.ml === row?.syringeMl);
    if (!s) return [RATE_WORDS.bySyringe(deviceName(sp), listText(sp.syringes.map((x) => x.ml)))];
    const dose = unit !== 'mL/h' && isGap(sp.doseRate) ? `; ${RATE_WORDS.doseGap}` : '';
    return [RATE_WORDS.syringe(deviceName(sp), s.rate.min, s.rate.max, s.ml, sp.rateStep.step) + dose];
  }
  const ot = devices['ot-701'];
  const limit = RATE_WORDS.limitRange(ot.volumeLimit.min, ot.volumeLimit.max, ot.volumeLimit.none);
  const s = ot.sets.find((x) => x.dropsPerMl === row?.set);
  if (!s) return [RATE_WORDS.bySet(deviceName(ot), listText(ot.sets.map((x) => x.dropsPerMl))), limit];
  // the factory range, "standard" (ot-701.json factory); the narrow range waits for the manual, as the host's check does
  const r = s.standard;
  const tail = unit === 'drops/min' ? (isGap(ot.dropsStep) ? `; ${RATE_WORDS.dropsGap}` : '') : RATE_WORDS.dripStep(ot.rateStep.step);
  return [RATE_WORDS.drip(deviceName(ot), r.mlH, r.dropsMin, s.dropsPerMl) + tail, limit];
}

function rateFlow(x: FlowInput) {
  const units = rateUnits(x.kind, x.row);
  const was = x.row?.rate ?? null;
  const rate = numberInput('rate', { min: 0 });
  const unit = selectOf('unit', units.map((u) => [u, unitText(u)] as const), was && units.includes(was.unit) ? was.unit : 'mL/h');
  if (was) rate.value = String(was.rate);
  const weight = numberInput('weightKg', { min: 0 });
  if (was?.weightKg !== undefined) weight.value = String(was.weightKg);
  const weightField = field(RATE_WORDS.weight, weight);
  const limit = numberInput('limitMl', { min: 0 });
  if (x.row?.limitMl != null) limit.value = String(x.row.limitMl);
  const hints = h('div', { class: 'pf-hints' });
  const draw = () => {
    weightField.hidden = !unit.value.includes('/kg');
    hints.replaceChildren(...rateHints(x.kind, x.row, x.devices, unit.value).map(hint));
  };
  unit.addEventListener('change', draw);
  draw();
  const el = h('div', { class: 'pf-fields-in' }, h('div', { class: 'pf-row' }, field(RATE_WORDS.rate, rate), field(RATE_WORDS.unit, unit)), weightField,
    x.kind === 'drip' ? field(RATE_WORDS.limit, limit) : null, hints);
  return {
    el,
    build() {
      const r = num(rate.value);
      if (r === null) return missing(RATE_WORDS.theRate);
      const body: Record<string, unknown> = { type: 'pump', ch: x.ch, action: 'rate', rate: r, unit: unit.value };
      if (unit.value.includes('/kg')) {
        const w = num(weight.value);
        if (w === null) return missing(RATE_WORDS.theWeight);
        body.weightKg = w;
      }
      const l = x.kind === 'drip' ? num(limit.value) : null;
      if (l !== null) body.limitMl = l;
      return body as { type: 'pump'; ch: number; action: string };
    },
  };
}

export const RATE: FlowDef = { id: 'rate', button: RATE_WORDS.button, title: RATE_WORDS.title, submit: RATE_WORDS.submit, done: RATE_WORDS.done, kinds: ['syringe', 'drip'], make: rateFlow };
