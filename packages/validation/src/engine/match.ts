// An engine run matched to a recorded analysis window (decision 5): same HR, SBP/DBP, arterial site, ventilator
// RR/VT/PEEP (ventilation event at t = 0), EtCO2 (setTarget AFTER the ventilation event — an etco2 baseline target is
// overridden by the ventilation start, measured while planning), NIBP auto every minute, 180 s warm-up.
import type { EngineEvent, NumericId } from '@pme/engine-core';
import type { AnalysisWindow, Signals } from '../datasets/signals.ts';
import { capture, clinical, cmd, type Capture } from './capture.ts';

export const WARMUP_S = 180; // the etco2 calibration settles in ≈ 2–3 min (planning: 36 vs target 33 after 60 s)

export function numericSeries(ev: EngineEvent[], id: NumericId, fromS: number, toS: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const e of ev) {
    if (e.type !== 'measurement' || e.t < fromS || e.t >= toS) continue;
    const m = e.values[id];
    if (m && m.value !== null && m.flag === 'valid') out.push([e.t - fromS, m.value]);
  }
  return out;
}

export async function matchedRun(w: AnalysisWindow, seed: number): Promise<{ signals: Signals; cap: Capture }> {
  const len = w.toS - w.fromS;
  const site = w.site === 'femoral' ? 'femoral' : 'leftRadial';
  const script = [
    { t: 0, cmd: cmd({ type: 'attachSensor', sensor: 'abp', state: 'connected', site }) },
    { t: 0, cmd: cmd({ type: 'device', action: { device: 'nibp', action: 'auto', intervalMin: 1 } }) },
  ];
  if (w.vent) script.push({ t: 0, cmd: clinical({ kind: 'ventilation', source: 'ventilator', rr: w.vent.rr, vtMl: w.vent.vtMl, peep: w.vent.peep, fio2: 0.5 }) });
  if (w.etco2 !== null) script.push({ t: 1, cmd: cmd({ type: 'setTarget', variable: 'etco2', value: Math.round(w.etco2) }) });
  const cap = await capture({
    engine: {
      seed,
      patient: {
        ...(w.ageY !== null ? { ageY: w.ageY } : {}), ...(w.sex !== null ? { sex: w.sex } : {}),
        baseline: { hr: Math.round(w.hr), sbp: Math.round(w.sbp), dbp: Math.round(w.dbp) },
        sensors: { ecg: 'on', abp: 'connected', spo2: 'on', nibp: 'on', co2: 'on' },
      },
    },
    script, channels: ['ecgII', 'abp', 'pleth', 'co2'], fromS: WARMUP_S, toS: WARMUP_S + len,
  });
  const ch = cap.channels;
  const inspirations = cap.events.filter((e) => e.type === 'breath' && e.t >= WARMUP_S && e.t < WARMUP_S + len).map((e) => (e as { t: number }).t - WARMUP_S);
  const num = (id: NumericId) => numericSeries(cap.events, id, WARMUP_S, WARMUP_S + len);
  return {
    cap,
    signals: {
      ...(ch.ecgII ? { ecg: ch.ecgII } : {}), ...(ch.abp ? { abp: ch.abp } : {}), site: w.site, ...(ch.pleth ? { pleth: ch.pleth } : {}),
      ...(ch.co2 ? { co2: ch.co2 } : {}), co2Calibrated: true, inspirations,
      numerics: { hr: num('hr'), abpMean: num('abpMean'), nibpMean: num('nibpMean'), etco2: num('etco2') },
    },
  };
}
