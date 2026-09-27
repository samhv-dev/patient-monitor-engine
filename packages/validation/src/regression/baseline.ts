// Waveform regression baselines (R40 borrow #1, audit N-P02): fixed scenarios, 5 s windows per channel, compared
// sample by sample with a 2 % limit. The limit's floor (5 % of the window's peak-to-peak) stops samples near zero
// from turning into huge relative errors [ENG, decision 9]. Baselines are our own engine output (MIT), JSON.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ChannelId, Command } from '@pme/engine-core';
import { capture, clinical, cmd } from '../engine/capture.ts';
import type { Grade } from '../segments/types.ts';

export const REL_LIMIT = 0.02;
export const FLOOR_FRAC_PP = 0.05;
export const WINDOW: [number, number] = [40, 45];

export interface BaselineCase { id: string; seed: number; patient: Record<string, unknown>; script: Array<{ t: number; cmd: Command }>; channels: ChannelId[] }
export const CASES: BaselineCase[] = [
  { id: 'sinus-75', seed: 42, patient: { baseline: { hr: 75 }, sensors: { abp: 'connected', spo2: 'on', co2: 'on' } }, script: [{ t: 0, cmd: clinical({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 }) }], channels: ['ecgII', 'V5', 'abp', 'pleth', 'co2'] },
  { id: 'afib-110', seed: 42, patient: { baseline: { hr: 110 }, rhythm: { id: 'afib' }, sensors: { abp: 'connected', spo2: 'on' } }, script: [], channels: ['ecgII', 'abp', 'pleth'] },
  { id: 'vf-coarse', seed: 42, patient: { rhythm: { id: 'vfCoarse' }, sensors: { abp: 'connected' } }, script: [], channels: ['ecgII', 'abp'] },
  { id: 'bronchospasm', seed: 42, patient: { sensors: { co2: 'on' } }, script: [{ t: 0, cmd: clinical({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 }) }, { t: 5, cmd: clinical({ kind: 'airway', state: 'bronchospasm', severity: 0.8 }) }], channels: ['co2'] },
  { id: 'hypovolaemia-ppv', seed: 42, patient: { sensors: { abp: 'connected', spo2: 'on', co2: 'on' } }, script: [{ t: 0, cmd: clinical({ kind: 'ventilation', source: 'ventilator', rr: 15, vtMl: 500, fio2: 0.5, peep: 5 }) }, { t: 1, cmd: cmd({ type: 'setTarget', variable: 'volumeStatus', value: 0.3 }) }], channels: ['abp', 'pleth'] },
];

export type Baseline = Record<string, Record<string, number[]>>; // case → channel → samples (4 decimals)
export const baselinePath = (): string => fileURLToPath(new URL('../../baselines/waveforms.json', import.meta.url));

export async function generate(c: BaselineCase): Promise<Record<string, number[]>> {
  const cap = await capture({ engine: { seed: c.seed, patient: c.patient }, script: c.script, channels: c.channels, fromS: WINDOW[0], toS: WINDOW[1] });
  return Object.fromEntries(c.channels.map((ch) => [ch, Array.from(cap.channels[ch]?.x ?? [], (v) => Math.round(v * 1e4) / 1e4)]));
}

export interface WaveCompare { case: string; channel: string; n: number; failed: number; maxRelErr: number; rms: number; grade: Grade }

/** Per-sample 2 % comparison; green = every sample within, yellow ≤ 1 % of samples outside, else red. */
export function compareWave(caseId: string, channel: string, base: number[], now: ArrayLike<number>): WaveCompare {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of base) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  const floor = FLOOR_FRAC_PP * (hi - lo);
  let failed = 0;
  let maxRel = 0;
  let ss = 0;
  const n = Math.min(base.length, now.length);
  for (let i = 0; i < n; i++) {
    const b = base[i] as number;
    const d = Math.abs((now[i] as number) - b);
    const den = Math.max(Math.abs(b), floor, 1e-10);
    if (d > REL_LIMIT * den) failed++;
    maxRel = Math.max(maxRel, d / den);
    ss += d * d;
  }
  if (base.length !== now.length) failed += Math.abs(base.length - now.length);
  const grade: Grade = failed === 0 ? 'green' : failed <= 0.01 * n ? 'yellow' : 'red';
  return { case: caseId, channel, n, failed, maxRelErr: maxRel, rms: Math.sqrt(ss / Math.max(1, n)), grade };
}

export function readBaseline(): Baseline | null {
  return existsSync(baselinePath()) ? (JSON.parse(readFileSync(baselinePath(), 'utf8')) as Baseline) : null;
}
export function writeBaseline(b: Baseline): void {
  writeFileSync(baselinePath(), `${JSON.stringify(b)}\n`);
}

/** Compare every case with the committed baseline; with `rebaseline` (or no baseline yet) write it and return []. */
export async function runRegression(opts: { rebaseline?: boolean } = {}): Promise<WaveCompare[]> {
  const cur: Baseline = {};
  for (const c of CASES) cur[c.id] = await generate(c);
  const base = readBaseline();
  if (!base || opts.rebaseline) {
    writeBaseline(cur);
    return [];
  }
  const out: WaveCompare[] = [];
  for (const c of CASES) for (const ch of c.channels) out.push(compareWave(c.id, ch, base[c.id]?.[ch] ?? [], cur[c.id]?.[ch] ?? []));
  return out;
}
