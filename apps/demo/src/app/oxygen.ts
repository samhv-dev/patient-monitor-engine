// E121b: oxygen is never assumed; it is given like a drug. How a spontaneously breathing patient's oxygen is given (the
// Airway & ventilation tab's Oxygen control), the flows offered, the FiO₂ they give, when the control may act and the one
// event that gives it.
import type { EngineEvent } from '@pme/engine-core';

export type O2Device = 'none' | 'nasal' | 'mask';
export const O2_FLOWS: Readonly<Record<O2Device, readonly number[]>> = { none: [0], nasal: [1, 2, 3, 4, 5, 6], mask: [5, 6, 8, 10] };
/** The flow a device starts at when chosen. */
export const O2_DEFAULT: Readonly<Record<O2Device, number>> = { none: 0, nasal: 2, mask: 10 };

/** The FiO₂ a flow gives, the classic teaching approximation of about 4 % per L/min (nasal cannula 1–6 L/min ≈ 24–44 %,
 *  simple face mask 5–10 L/min ≈ 40–60 %): FiO₂ = 0.20 + 0.04 × flow. Room air without oxygen. The real value varies
 *  with the patient's inspiratory flow, which the model does not couple to these low-flow devices. */
export const o2Fio2 = (device: O2Device, flowLpm: number): number => (device === 'none' ? 0.21 : Math.round((0.2 + 0.04 * flowLpm) * 100) / 100);

/** Who breathes and through what, as the engine's 1 Hz state reports it. */
export type Breathing = NonNullable<Extract<EngineEvent, { type: 'state' }>['breathing']>;

/** Why the oxygen control is off now, or null when it may act: only a patient breathing spontaneously with no airway
 *  device, the bag or a ventilator. Otherwise its `source: 'spontaneous'` event would take the patient off the bag or
 *  the ventilator (on an intubated patient, a silent extubation of the model), so it is never sent. */
export function oxygenBlock(b: Breathing | undefined, breathingStaged = false): string | null {
  if (!b) return 'Waiting for the monitor’s state.';
  if (b.source === 'bvm' || b.source === 'ventilator' || b.source === 'external' || b.device !== 'none') return 'FiO₂ is set on the ventilator / bag.';
  if (b.source !== 'spontaneous') return 'No spontaneous breathing: oxygen by mask needs a patient who breathes.';
  if (breathingStaged) return 'A breathing change is staged: commit it first.';
  return null;
}

/** The oxygen event: the patient breathes spontaneously at the FiO₂ the device gives; the device and flow ride along as
 *  words for the log and the Debrief (the engine reads `fio2` only). */
export const oxygen = (device: O2Device, flowLpm: number): Record<string, unknown> => ({
  type: 'applyEvent',
  event: { kind: 'ventilation', source: 'spontaneous', fio2: o2Fio2(device, flowLpm), o2Device: device, ...(device === 'none' ? {} : { o2FlowLpm: flowLpm }) },
});
