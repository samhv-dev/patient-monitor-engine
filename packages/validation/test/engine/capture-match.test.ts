import { createEngine } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { capture, clinical } from '../../src/engine/capture.ts';
import { matchedRun, WARMUP_S } from '../../src/engine/match.ts';
import { computeWindowMetrics } from '../../src/metrics/window-metrics.ts';
import { median } from '../../src/stats.ts';
import type { AnalysisWindow } from '../../src/datasets/signals.ts';

describe('headless capture', { timeout: 60_000 }, () => {
  it('copies samples out in chunks, identical to one read at the end (inside the 120 s ring)', async () => {
    const c = await capture({ engine: { seed: 5, patient: { sensors: { abp: 'connected' } } }, channels: ['ecgII', 'abp'], fromS: 10, toS: 70 });
    const e = createEngine({ seed: 5, patient: { sensors: { abp: 'connected' } } });
    e.advanceTo(70.2);
    const ref = new Float32Array(60 * 125);
    e.readSamples('abp', 10 * 125, ref);
    expect(Array.from(c.channels.abp?.x ?? [])).toEqual(Array.from(ref));
    expect(c.channels.ecgII?.x.length).toBe(60 * 500);
  });
  it('captures beyond the ring length and dispatches scripted commands on time', async () => {
    const c = await capture({ engine: { seed: 5, patient: { sensors: { co2: 'on' } } }, script: [{ t: 5, cmd: clinical({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500 }) }], channels: ['co2'], fromS: 0, toS: 150 });
    expect(c.channels.co2?.x.length).toBe(150 * 62.5);
    expect(c.events.some((e) => e.type === 'breath' && e.t > 5 && e.t < 11)).toBe(true);
  });
});

describe('matched engine run (decision 5)', { timeout: 60_000 }, () => {
  it('lands on the window HR, pressures and EtCO2 and measures like a recording', async () => {
    const w: AnalysisWindow = { source: 'vitaldb', record: 'test', fromS: 0, toS: 30, site: 'radial', hr: 80, sbp: 130, dbp: 70, etco2: 32, vent: { rr: 10, vtMl: 480, peep: 5 }, ageY: 60, sex: 'F', tags: [] };
    const { signals, cap } = await matchedRun(w, 11);
    expect(cap.fromS).toBe(WARMUP_S);
    const m = computeWindowMetrics(signals);
    expect(Math.abs(m.hr - 80)).toBeLessThan(3);
    expect(Math.abs(median(m.sys) - 130)).toBeLessThan(8);
    expect(Math.abs(median(m.dia) - 70)).toBeLessThan(8);
    expect(signals.inspirations?.length).toBe(5);
    expect(Math.abs(median(m.plateau) - 32)).toBeLessThan(4);
  });
});
