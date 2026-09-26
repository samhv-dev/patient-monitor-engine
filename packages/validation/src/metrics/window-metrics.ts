// All morphology/device metrics of one analysis window, from one Signals bundle — recorded or generated (decision 3).
import type { Signals } from '../datasets/signals.ts';
import { pulseBeats, type PulseBeat } from './abp.ts';
import { capnoAngles } from './capno.ts';
import { hrAveragingError, nibpVsAbp } from './device.ts';
import { detectR } from './ecg.ts';
import { ppgAbp } from './ppg.ts';
import { respVariation, type RespVariation } from './resp-variation.ts';

export interface WindowMetrics {
  hr: number;
  beats: number;
  rToFootMs: number[];
  footToPeakMs: number[];
  rToNotchMs: number[];
  notchDepth: number[];
  notchMinimumFrac: number;
  upstrokeSlope: number[];
  sys: number[];
  dia: number[];
  alpha: number[];
  slopeIII: number[];
  plateau: number[];
  co2Calibrated: boolean;
  resp: RespVariation | null;
  ppgDelayMs: number[];
  ppgShapeR: number;
  ppgCountRatio: number;
  hrErr: number[];
  nibpMinusAbp: number[];
}

export function computeWindowMetrics(s: Signals): WindowMetrics {
  const rS = s.ecg ? detectR(s.ecg.x, s.ecg.fs).map((i) => i / (s.ecg as { fs: number }).fs) : [];
  const beats: PulseBeat[] = s.abp ? pulseBeats(s.abp.x, s.abp.fs, rS) : [];
  const ok = beats.filter((b) => b.foot - b.r > 0 && b.foot - b.r < 0.4);
  const withNotch = ok.filter((b) => b.notch !== undefined);
  const breaths = s.co2 ? capnoAngles(s.co2.x, s.co2.fs) : [];
  const ppg = s.abp && s.pleth && rS.length > 4 ? ppgAbp(s.abp, s.pleth, rS, beats) : null;
  const rr = rS.slice(1).map((t, i) => t - (rS[i] as number)).sort((a, b) => a - b);
  return {
    hr: rr.length ? 60 / (rr[Math.floor(rr.length / 2)] as number) : Number.NaN,
    beats: ok.length,
    rToFootMs: ok.map((b) => 1000 * (b.foot - b.r)),
    footToPeakMs: ok.map((b) => 1000 * (b.peak - b.foot)),
    rToNotchMs: withNotch.map((b) => 1000 * ((b.notch as number) - b.r)),
    notchDepth: withNotch.map((b) => b.notchDepth as number),
    notchMinimumFrac: ok.length ? ok.filter((b) => b.notchKind === 'minimum').length / ok.length : Number.NaN,
    upstrokeSlope: ok.map((b) => b.slope),
    sys: ok.map((b) => b.sys),
    dia: ok.map((b) => b.dia),
    alpha: breaths.map((b) => b.alpha),
    slopeIII: breaths.map((b) => b.slopeIII),
    plateau: breaths.map((b) => b.plateau),
    co2Calibrated: s.co2Calibrated ?? false,
    resp: s.inspirations && s.inspirations.length > 3 ? respVariation(ok, s.inspirations) : null,
    ppgDelayMs: ppg?.delayMs ?? [],
    ppgShapeR: ppg?.shapeR ?? Number.NaN,
    ppgCountRatio: ppg?.countRatio ?? Number.NaN,
    hrErr: hrAveragingError(s.numerics.hr ?? [], rS),
    nibpMinusAbp: nibpVsAbp(s.numerics.nibpMean ?? [], ok),
  };
}
