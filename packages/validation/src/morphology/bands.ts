// Pass criteria for the recorded-vs-engine morphology suite. Evidence bands first (R37/R39: the band IS the test);
// where the brief gives a rule relative to the recording (V1/V2 "±20 ms of the VitalDB median"), the band is built
// around the recorded statistic at run time. [ENG] rows are engineering tolerances awaiting Ali's calibration pass.
export type BandKind = 'absolute' | 'deltaToRecorded' | 'ratioToRecorded';

export interface MetricBand {
  id: string;
  metric: string;
  unit: string;
  kind: BandKind;
  min: number;
  max: number;
  source: string;
}

export const BANDS: MetricBand[] = [
  { id: 'V1', metric: 'rToFootMs', unit: 'ms', kind: 'deltaToRecorded', min: -20, max: 20, source: 'brief §9 V1: median within ±20 ms of the VitalDB median per HR bin [ENG]' },
  { id: 'V1-lit', metric: 'rToFootMs', unit: 'ms', kind: 'absolute', min: 150, max: 220, source: 'research 03 §2.1: R → radial upstroke 150–220 ms' },
  { id: 'V2', metric: 'rToNotchMs', unit: 'ms', kind: 'deltaToRecorded', min: -20, max: 20, source: 'brief §9 V2: ±20 ms' },
  { id: 'V2-depth', metric: 'notchDepth', unit: '', kind: 'deltaToRecorded', min: -0.15, max: 0.15, source: '[ENG] notch depth within ±0.15 of the recording' },
  { id: 'V2-kind', metric: 'notchMinimumFrac', unit: '', kind: 'deltaToRecorded', min: -0.3, max: 0.3, source: '[ENG] share of beats with a true notch minimum within ±0.3 of the recording' },
  { id: 'upstroke', metric: 'upstrokeSlope', unit: '×', kind: 'ratioToRecorded', min: 0.7, max: 1.3, source: '[ENG] max dP/dt within ×0.7–1.3 of the recording at matched pressures' },
  { id: 'pwdb-rise', metric: 'footToPeakMs', unit: 'ms', kind: 'absolute', min: Number.NaN, max: Number.NaN, source: 'PWDB radial foot→systolic peak p10–p90 at the patient age (filled at run time)' },
  { id: 'V3-delay', metric: 'ppgDelayMs', unit: 'ms', kind: 'absolute', min: 20, max: 100, source: 'brief §9 V3 / research 03 §3.1: PPG foot − ABP foot 20–100 ms (recorded VitalDB delay is device-latency-contaminated, report only)' },
  { id: 'V3-shape', metric: 'ppgShapeR', unit: 'r', kind: 'absolute', min: 0.8, max: 1, source: 'brief §9 V3: r ≥ 0.8 [ENG]' },
  { id: 'V3-count', metric: 'ppgCountRatio', unit: '', kind: 'absolute', min: 0.98, max: 1.02, source: 'brief §9 V3: PR = HR in sinus' },
  { id: 'V4', metric: 'alpha', unit: '°', kind: 'absolute', min: 100, max: 110, source: 'R39 item 6: normal α 105° (100–110) on the 25 mmHg/s axis' },
  { id: 'V4-rec', metric: 'alpha', unit: '°', kind: 'deltaToRecorded', min: -5, max: 5, source: '[ENG] α within ±5° of the VitalDB (sidestream, Primus) recording' },
  { id: 'PPV', metric: 'ppvPct', unit: '% points', kind: 'deltaToRecorded', min: -3, max: 3, source: '[ENG] PPV within ±3 points of the recording at matched ventilator settings' },
  { id: 'SPV', metric: 'spvMmHg', unit: 'mmHg', kind: 'deltaToRecorded', min: -3, max: 3, source: '[ENG] SPV within ±3 mmHg of the recording' },
  { id: 'HR-avg', metric: 'hrErrAbs', unit: 'bpm', kind: 'absolute', min: 0, max: 2, source: 'brief §6.1: displayed HR within 2 bpm of the 12-RR average at steady state [ENG]' },
  { id: 'NIBP-bias', metric: 'nibpMinusAbp', unit: 'mmHg', kind: 'absolute', min: -5, max: 5, source: 'Stage 2 acceptance 9 / ISO 81060-2 style: bias ≤ 5 mmHg' },
  { id: 'V5-QTc', metric: 'qtcMs', unit: 'ms', kind: 'absolute', min: Number.NaN, max: Number.NaN, source: 'PTB-XL NORM p10–p90 by the same method (filled at run time)' },
  { id: 'V5-PR', metric: 'prMs', unit: 'ms', kind: 'absolute', min: Number.NaN, max: Number.NaN, source: 'PTB-XL NORM p10–p90 by the same method (filled at run time)' },
  { id: 'V5-QRS', metric: 'qrsMs', unit: 'ms', kind: 'absolute', min: Number.NaN, max: Number.NaN, source: 'PTB-XL NORM p10–p90 by the same method (filled at run time)' },
];

/** HR bins of brief §9 V1. */
export const HR_BINS: Array<[number, number]> = [[50, 70], [70, 90], [90, 110]];
export const hrBin = (hr: number): string => {
  const b = HR_BINS.find(([lo, hi]) => hr >= lo && hr < hi);
  return b ? `HR ${b[0]}–${b[1]}` : 'HR other';
};
