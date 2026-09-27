// Respiratory variation of the arterial pulse against the ventilator cycle (brief §9 metrics list; research 03 §2.4):
// per breath (inspiration onset to the next), PPV = (PPmax − PPmin) / mean(PPmax, PPmin) · 100 and SPV = SBPmax −
// SBPmin; phase = (time of the PPmax beat − inspiration onset) / breath length, 0…1. Positive-pressure ventilation puts
// PPmax early in the cycle (inspiration) — the reversed-pulsus sign. Median over breaths with ≥ 3 beats [ENG].
import type { PulseBeat } from './abp.ts';
import { median } from '../stats.ts';

export interface RespVariation { ppvPct: number; spvMmHg: number; ppMaxPhase: number; breaths: number }

export function respVariation(beats: PulseBeat[], inspirations: number[]): RespVariation {
  const ppv: number[] = [];
  const spv: number[] = [];
  const phase: number[] = [];
  for (let i = 0; i + 1 < inspirations.length; i++) {
    const a = inspirations[i] as number;
    const b = inspirations[i + 1] as number;
    const inB = beats.filter((x) => x.peak >= a && x.peak < b);
    if (inB.length < 3) continue;
    const pp = inB.map((x) => x.sys - x.dia);
    const hi = Math.max(...pp);
    const lo = Math.min(...pp);
    ppv.push((100 * (hi - lo)) / ((hi + lo) / 2));
    spv.push(Math.max(...inB.map((x) => x.sys)) - Math.min(...inB.map((x) => x.sys)));
    phase.push(((inB[pp.indexOf(hi)] as PulseBeat).peak - a) / (b - a));
  }
  return { ppvPct: median(ppv), spvMmHg: median(spv), ppMaxPhase: median(phase), breaths: ppv.length };
}
