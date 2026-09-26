// The one signal bundle every metric takes, whether the samples were recorded or generated (decision 3).
export interface Wave {
  fs: number;
  x: Float64Array;
}

export interface Signals {
  /** ECG lead II (mV). */
  ecg?: Wave;
  /** Arterial pressure (mmHg); `site` says where. */
  abp?: Wave;
  site?: 'radial' | 'femoral' | 'unknown';
  pleth?: Wave;
  /** Capnogram in mmHg (MGH/MF: normalised, decision 11). */
  co2?: Wave;
  co2Calibrated?: boolean;
  /** Inspiration onsets (s from the start of the window): from airway pressure (recorded) or breath events (engine). */
  inspirations?: number[];
  /** Device numerics over the window: [t s from window start, value]. Keys: hr, nibpMean, abpMean, etco2, paco2. */
  numerics: Record<string, Array<[number, number]>>;
}

/** A recorded analysis window: where it comes from and what the matched engine run must reproduce. */
export interface AnalysisWindow {
  source: 'vitaldb' | 'mghdb';
  record: string;
  fromS: number;
  toS: number;
  site: 'radial' | 'femoral' | 'unknown';
  hr: number;
  sbp: number;
  dbp: number;
  etco2: number | null;
  vent: { rr: number; vtMl: number; peep: number } | null;
  ageY: number | null;
  sex: 'M' | 'F' | null;
  tags: string[];
}

/** Replace NaN runs by linear interpolation (edges hold the nearest value). Returns the fraction that was NaN. */
export function fillGaps(x: Float64Array): number {
  let bad = 0;
  let last = -1;
  for (let i = 0; i <= x.length; i++) {
    const ok = i < x.length && Number.isFinite(x[i] as number);
    if (i < x.length && !ok) {
      bad++;
      continue;
    }
    const gap = i - last - 1;
    if (gap > 0) {
      const a = last >= 0 ? (x[last] as number) : i < x.length ? (x[i] as number) : 0;
      const b = i < x.length ? (x[i] as number) : a;
      for (let k = 1; k <= gap; k++) x[last + k] = a + ((b - a) * k) / (gap + 1);
    }
    last = i;
  }
  return x.length ? bad / x.length : 1;
}
