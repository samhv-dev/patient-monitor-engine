// Device-behaviour metrics computed identically on recorded numerics and engine `measurement` events:
// - HR averaging: the displayed HR vs the HR of the last 12 R-R intervals ending at the display time
//   (IEC-style, brief §6.1) — error distribution in bpm;
// - NIBP vs ABP: each NIBP MAP minus the invasive MAP averaged over the 40 s before it (the cuff cycle) [ENG];
// - EtCO2 − PaCO2: each arterial PaCO2 lab value against the median EtCO2 of the 120 s before it (recorded only;
//   the engine has no public PaCO2 until Stage 7c, the report says so).
import { median } from '../stats.ts';
import type { PulseBeat } from './abp.ts';

export function hrAveragingError(displayed: Array<[number, number]>, rS: number[]): number[] {
  const out: number[] = [];
  for (const [t, hr] of displayed) {
    const past = rS.filter((r) => r <= t);
    if (past.length < 13) continue;
    const rr = past.slice(-13);
    const mean = (rr[12] as number - (rr[0] as number)) / 12;
    out.push(hr - 60 / mean);
  }
  return out;
}

export function nibpVsAbp(nibpMean: Array<[number, number]>, beats: PulseBeat[]): number[] {
  const out: number[] = [];
  for (const [t, map] of nibpMean) {
    const w = beats.filter((b) => b.peak >= t - 40 && b.peak < t);
    if (w.length < 10) continue;
    out.push(map - median(w.map((b) => b.dia + (b.sys - b.dia) / 3)));
  }
  return out;
}

export function paEtGap(paco2: Array<[number, number]>, etco2: Array<[number, number]>): number[] {
  const out: number[] = [];
  for (const [t, pa] of paco2) {
    const et = etco2.filter(([s]) => s >= t - 120 && s <= t).map(([, v]) => v);
    if (et.length >= 3) out.push(pa - median(et));
  }
  return out;
}
