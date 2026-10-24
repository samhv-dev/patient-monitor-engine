// E121b: oxygen is never assumed; it is given like a drug. How a spontaneously breathing patient's oxygen is given (the
// Airway & ventilation tab's Oxygen control), the flows offered, the FiO₂ they give and the one event that gives it.

export type O2Device = 'none' | 'nasal' | 'mask';
export const O2_FLOWS: Readonly<Record<O2Device, readonly number[]>> = { none: [0], nasal: [1, 2, 3, 4, 5, 6], mask: [5, 6, 8, 10] };
/** The flow a device starts at when chosen. */
export const O2_DEFAULT: Readonly<Record<O2Device, number>> = { none: 0, nasal: 2, mask: 10 };

/** The FiO₂ a flow gives, the classic teaching approximation of about 4 % per L/min (nasal cannula 1–6 L/min ≈ 24–44 %,
 *  simple face mask 5–10 L/min ≈ 40–60 %): FiO₂ = 0.20 + 0.04 × flow. Room air without oxygen. The real value varies
 *  with the patient's inspiratory flow, which the model does not couple to these low-flow devices. */
export const o2Fio2 = (device: O2Device, flowLpm: number): number => (device === 'none' ? 0.21 : Math.round((0.2 + 0.04 * flowLpm) * 100) / 100);

/** The oxygen event: the patient breathes spontaneously at the FiO₂ the device gives; the device and flow ride along as
 *  words for the log and the Debrief (the engine reads `fio2` only). */
export const oxygen = (device: O2Device, flowLpm: number): Record<string, unknown> => ({
  type: 'applyEvent',
  event: { kind: 'ventilation', source: 'spontaneous', fio2: o2Fio2(device, flowLpm), o2Device: device, ...(device === 'none' ? {} : { o2FlowLpm: flowLpm }) },
});
