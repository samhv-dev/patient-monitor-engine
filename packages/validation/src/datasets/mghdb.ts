// MGH/MF Waveform Database (ODC-By 1.0): header metadata (age, sex, rhythm, ventilation mode from the # comments),
// the channel map (signal descriptions vary: "ART", "OFF", "Inp."), and recorded windows as Signals.
// CO2 is uncalibrated in the headers (gain 1000, no unit): it is normalised so the median plateau reads 38 mmHg and
// marked co2Calibrated = false (decision 11).
import { capnoAngles } from '../metrics/capno.ts';
import { decode212, parseHeader, type WfdbHeader } from '../templates/wfdb.ts';
import { fillGaps, type Signals } from './signals.ts';

export const MGHDB = 'mghdb/1.0.0';
export const MGH_CO2_REF_MMHG = 38; // [ENG] decision 11

export interface MghMeta {
  record: string;
  ageY: number | null;
  sex: 'M' | 'F' | null;
  diagnosis: string;
  rhythm: string;
  ventilation: string;
  channels: Partial<Record<'ecgI' | 'ecgII' | 'ecgV' | 'abp' | 'pap' | 'cvp' | 'resp' | 'co2', number>>;
}

/** Metadata and channel indices from a .hea text. */
export function mghMeta(heaText: string): MghMeta {
  const h = parseHeader(heaText);
  const lines = heaText.split(/\r?\n/);
  const after = (label: string) => {
    const i = lines.findIndex((l) => l.includes(label));
    return i >= 0 ? (lines[i + 1] ?? '').replace(/^#\s*/, '').trim() : '';
  };
  const m = /<age>:\s*(\d+)\s*<sex>:\s*([MF])\s*<diagnoses>:\s*(.*)$/.exec(lines.find((l) => l.includes('<age>')) ?? '');
  const channels: MghMeta['channels'] = {};
  h.signals.forEach((s, i) => {
    const d = s.description.toUpperCase();
    if (d === 'ECG LEAD I') channels.ecgI = i;
    else if (d === 'ECG LEAD II') channels.ecgII = i;
    else if (d === 'ECG LEAD V') channels.ecgV = i;
    else if (d === 'ART') channels.abp = i;
    else if (d === 'PAP') channels.pap = i;
    else if (d === 'CVP') channels.cvp = i;
    else if (d.startsWith('RESP')) channels.resp = i;
    else if (d === 'CO2') channels.co2 = i;
  });
  return {
    record: h.record, ageY: m ? Number(m[1]) : null, sex: (m?.[2] as 'M' | 'F' | undefined) ?? null, diagnosis: m?.[3]?.trim() ?? '',
    rhythm: after('UNDERLYING RHYTHM'), ventilation: after('MODE OF VENTILATION'), channels,
  };
}

/** Physical-unit window [fromS, toS) of every mapped channel, decoded once per record. */
export function mghSignals(h: WfdbHeader, meta: MghMeta, dat: Uint8Array, fromS: number, toS: number): Signals {
  const sig = decode212(dat, h.nSignals);
  const phys = (i: number | undefined) => {
    if (i === undefined) return undefined;
    const s = h.signals[i];
    const raw = sig[i];
    if (!s || !raw) return undefined;
    const a = Math.round(fromS * h.fs);
    const b = Math.round(toS * h.fs);
    // samples at the ADC limits (−2048 / 2047) are invalid in format 212
    const x = Float64Array.from(raw.subarray(a, b), (v) => (v <= -2048 || v >= 2047 ? Number.NaN : (v - s.baseline) / s.gain));
    fillGaps(x);
    return { fs: h.fs, x };
  };
  const co2raw = phys(meta.channels.co2);
  let co2: Signals['co2'];
  if (co2raw) {
    const sorted = Array.from(co2raw.x).sort((p, q) => p - q);
    const base = sorted[Math.floor(0.02 * sorted.length)] ?? 0;
    const zeroed = Float64Array.from(co2raw.x, (v) => v - base);
    const plateaus = capnoAngles(zeroed, h.fs).map((b) => b.plateau).sort((p, q) => p - q);
    const pl = plateaus[Math.floor(plateaus.length / 2)];
    if (pl && pl > 0) co2 = { fs: h.fs, x: Float64Array.from(zeroed, (v) => (v * MGH_CO2_REF_MMHG) / pl) };
  }
  const ecg = phys(meta.channels.ecgII);
  const abp = phys(meta.channels.abp);
  return { ...(ecg ? { ecg } : {}), ...(abp ? { abp } : {}), site: 'unknown', ...(co2 ? { co2, co2Calibrated: false } : {}), numerics: {} };
}
