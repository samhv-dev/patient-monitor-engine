import { describe, expect, it } from 'vitest';
import { LIMIT_KEYS } from '../../src/l3/alarms/profile.ts';
import type { EngineEvent } from '../../src/types.ts';
import { organsRig } from '../helpers/organs.ts';

describe('ICP alarm (brief §6.8 Appendix 1 limits)', { timeout: 300_000 }, () => {
  it('maps ICP/CPP limit keys to the organ numerics', () => {
    expect(LIMIT_KEYS.ICP?.numeric).toBe('icpMean');
    expect(LIMIT_KEYS.CPP?.numeric).toBe('cpp');
  });
  it('ICP 22 on the saadat-like skin (limit 0–10, alarm enabled) raises ICP_HIGH', async () => {
    const r = organsRig({ seed: 1, patient: { weightKg: 70 }, device: { skin: 'saadat-like' } });
    const alarms: EngineEvent[] = [];
    r.e.on((x) => alarms.push(x), ['alarm']);
    r.send({ type: 'attachSensor', sensor: 'icp', state: 'on' });
    r.send({ type: 'device', action: { device: 'alarm', action: 'enable', param: 'ICP', value: true } });
    r.send({ type: 'applyEvent', event: { kind: 'brain', massMl: 12 } });
    await r.run(30);
    console.log(alarms.filter((a) => a.type === 'alarm').map((a) => (a as { id: string }).id));
    expect(alarms.some((a) => a.type === 'alarm' && a.id === 'ICP_HIGH' && a.state === 'raised')).toBe(true);
  });
});
