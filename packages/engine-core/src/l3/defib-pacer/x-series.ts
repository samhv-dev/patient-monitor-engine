// The generic defibrillator's energies: those of the ZOLL X Series, the source its defaults carry. Pages are the guide's
// printed pages.

/** Where a device's numbers were read. */
export interface DeviceSource {
  document: string;
  revision: string;
  page: string;
}

/** Every manual energy setting, J: Table A-2, "Delivered Energy at Every Defibrillator Setting"; 200 J is the maximum (A-2). */
export const X_SERIES_ENERGIES_J: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30, 50, 70, 85, 100, 120, 150, 200];
export const X_SERIES_ENERGIES_SOURCE: DeviceSource = { document: "ZOLL X Series Operator's Guide, REF 9650-001355-01", revision: 'P', page: 'A-3, Table A-2' };

/** The next energy on a device's list from `energyJ`, upward (dir 1) or downward (dir −1); null past the list's end. */
export function stepEnergy(list: readonly number[], energyJ: number, dir: 1 | -1): number | null {
  const next = dir > 0 ? list.find((j) => j > energyJ) : [...list].reverse().find((j) => j < energyJ);
  return next ?? null;
}
