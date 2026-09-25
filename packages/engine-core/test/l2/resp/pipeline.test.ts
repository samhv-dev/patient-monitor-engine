// The Stage 3 pipeline in isolation (engine-free): samples by absolute index, breath events, commands.
import { describe, expect, it } from 'vitest';
import { createL1State } from '../../../src/l1/state.ts';
import { constantRamp } from '../../../src/l1/ramp.ts';
import { createHemoState } from '../../../src/l2/hemo/pipeline.ts';
import { advanceResp, applyRespCommand, createRespState, validateRespCommand } from '../../../src/l2/resp/pipeline.ts';
import type { Command } from '../../../src/types.ts';

const c = (b: Record<string, unknown>) => ({ id: 'x', issuedBy: 't', ...b }) as Command;

describe('respiratory pipeline', () => {
  it('writes co2/resp at 62.5 Hz by absolute index, emits breath and lungState events', () => {
    const l1 = createL1State();
    const rs = createRespState({ sensors: { co2: 'on' } }, l1, 1);
    const hemo = createHemoState(undefined, l1, 75);
    const idx: Record<string, number[]> = { co2: [], resp: [] };
    advanceResp(rs, { l1, hemo, rhythm: { id: 'sinus', records: [] }, hr: constantRamp(75) }, 625, (ch, m) => idx[ch]!.push(m));
    expect(idx.co2![0]).toBe(0);
    expect(idx.co2![idx.co2!.length - 1]).toBe(625);
    expect(idx.resp).toHaveLength(626);
    expect(rs.out.filter((e) => e.type === 'breath').length).toBeGreaterThanOrEqual(2);
    expect(rs.out.find((e) => e.type === 'lungState')).toBeDefined();
  });

  it('validates and applies Stage 3 commands; leaves Stage 2 commands alone', () => {
    expect(validateRespCommand(c({ type: 'applyEvent', event: { kind: 'airway', state: 'kinked' } }))).toMatch(/airway state/);
    expect(validateRespCommand(c({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', fio2: 0.1 } }))).toMatch(/fio2/);
    expect(validateRespCommand(c({ type: 'applyEvent', event: { kind: 'condition', id: 'pe', severity: 1 } }))).toMatch(/Stage 7/);
    expect(validateRespCommand(c({ type: 'attachSensor', sensor: 'temp', state: 'on', site: 'rectal' }))).toBeUndefined();
    expect(validateRespCommand(c({ type: 'applyEvent', event: { kind: 'line', line: 'abp', action: 'flush' } }))).toBeNull();
    const l1 = createL1State();
    const rs = createRespState(undefined, l1, 1);
    expect(applyRespCommand(rs, l1, c({ type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 10, vtMl: 450, fio2: 0.5 } }), 3)).toBe(true);
    expect(rs.driver.vent).toMatchObject({ rr: 10, vt: 450 });
    expect(applyRespCommand(rs, l1, c({ type: 'attachSensor', sensor: 'co2', state: 'warmup', sampling: 'mainstream' }), 3)).toBe(true);
    expect(rs.co2Sensor).toBe('warmup');
    expect(rs.sampler.mode).toBe('mainstream');
  });
});
