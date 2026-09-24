import { describe, expect, it } from 'vitest';
import { constantRamp } from '../../../src/l1/ramp.ts';
import { createL1State } from '../../../src/l1/state.ts';
import { advanceHemo, applyHemoCommand, createHemoState, validateHemoCommand, type HemoChannel, type HemoCtx } from '../../../src/l2/hemo/pipeline.ts';
import { createRngState } from '../../../src/rng/sfc32.ts';
import type { Command, EngineEvent } from '../../../src/types.ts';

/** Regular sinus beat and P records at 75 bpm (what the rhythm engine would emit), for `secs` seconds. */
function sinusRecords(secs: number): EngineEvent[] {
  const out: EngineEvent[] = [];
  for (let k = 0; 0.3 + k * 0.8 < secs + 1; k++) {
    const tR = 0.3 + k * 0.8;
    out.push({ type: 'atrial', t: tR - 0.2, kind: 'p', conducted: true });
    out.push({ type: 'beat', t: tR, seq: k, origin: 'sinus', template: 'narrow', qrsMs: 90, qtMs: 380, mech: { perfused: true, kSV: 1, svMl: 70, lvetMs: 277 } });
  }
  return out;
}

function run(secs: number, sensors: Record<string, string>) {
  const l1 = createL1State();
  const hs = createHemoState({ sensors }, l1, 75);
  const ctx: HemoCtx = { l1, hr: constantRamp(75), rhythm: { id: 'sinus', records: sinusRecords(secs) }, rng: createRngState(1), phi: 0 };
  const data: Record<HemoChannel, number[]> = { abp: [], cvp: [], pap: [], pleth: [] };
  advanceHemo(hs, ctx, secs * 125, (ch, m, v) => {
    data[ch][m] = v;
  });
  return { hs, data, l1 };
}

describe('l2/hemo/pipeline', () => {
  it('synthetic sinus 75: the displayed ABP settles on the 120/80 targets, PAP on 24/10, CVP on 6', () => {
    const { data, hs } = run(30, { abp: 'connected', cvp: 'connected', pap: 'connected' });
    const last = (ch: HemoChannel) => data[ch].slice(125 * 25, 125 * 30);
    expect(Math.max(...last('abp'))).toBeGreaterThan(115);
    expect(Math.max(...last('abp'))).toBeLessThan(127);
    expect(Math.min(...last('abp'))).toBeGreaterThan(75);
    expect(Math.min(...last('abp'))).toBeLessThan(85);
    expect(Math.max(...last('pap'))).toBeGreaterThan(20);
    expect(Math.max(...last('pap'))).toBeLessThan(29);
    const cvp = last('cvp');
    expect(cvp.reduce((a, b) => a + b, 0) / cvp.length).toBeCloseTo(6, 0);
    expect(hs.out.some((e) => e.type === 'measurement' && e.values.abpSys?.flag === 'valid')).toBe(true);
    expect(hs.out.filter((e) => e.type === 'state')).toHaveLength(30);
  });

  it("channels with sensor 'none' are not written; pleth always is", () => {
    const { data } = run(3, {});
    expect(data.abp).toHaveLength(0);
    expect(data.pleth.length).toBe(3 * 125 + 1);
  });

  it('command hooks: null for non-Stage-2 commands; sensors and line events apply', () => {
    const { hs, l1 } = run(1, {});
    const c = (b: Record<string, unknown>) => ({ id: 'x', issuedBy: 't', ...b }) as Command;
    expect(validateHemoCommand(c({ type: 'setRhythm', rhythm: 'afib' }), hs)).toBeNull();
    expect(validateHemoCommand(c({ type: 'setTarget', variable: 'hr', value: 80 }), hs)).toBeNull();
    expect(validateHemoCommand(c({ type: 'setTarget', variable: 'sbp', value: 90 }), hs)).toBeUndefined();
    const rng = createRngState(1);
    expect(applyHemoCommand(hs, l1, c({ type: 'attachSensor', sensor: 'abp', state: 'connected', site: 'rightRadial' }), 1, () => {}, rng)).toBe(true);
    expect(hs.lines.abp.sensor).toBe('connected');
    expect(hs.abpSite).toBe('rightRadial');
    applyHemoCommand(hs, l1, c({ type: 'applyEvent', event: { kind: 'line', line: 'pap', action: 'wedge', value: 1 } }), 1, () => {}, rng);
    expect(hs.wedge.on).toBe(true);
    let hr = 0;
    applyHemoCommand(hs, l1, c({ type: 'pin', variable: 'hr', value: 90 }), 1, (v) => (hr = v), rng);
    expect(hr).toBe(90);
    expect(l1.pinned).toEqual(['hr']);
  });
});
