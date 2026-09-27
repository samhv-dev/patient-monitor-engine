// Stage 7f no-drift run (scope 7f-5) on the long-run helper: 24 sim-h locally, 6 on CI (test/helpers/longrun.ts).
import { describe, expect, it } from 'vitest';
import { createEngine, type Command } from '../../src/index.ts';
import { LONGRUN_HOURS, LONGRUN_S } from '../helpers/longrun.ts';

let n = 0;
const cmd = (c: Record<string, unknown>) => ({ id: `l${++n}`, issuedBy: 'test', ...c }) as Command;
const ev = (event: Record<string, unknown>) => cmd({ type: 'applyEvent', event });
const ADULT = { weightKg: 70, heightCm: 170, ageY: 40, sex: 'M' as const };

describe('Stage 7f long run', () => {
  it(`${LONGRUN_HOURS} h with a maintenance anaesthetic: no NaN, TOF trains keep their cadence, DI stays in band`, { timeout: 1_800_000 }, async () => {
    const e = createEngine({ seed: 25, patient: ADULT });
    let bad = 0;
    let tofN = 0;
    let lastDi = 0;
    e.on((x) => {
      if (x.type === 'anaesthesia') {
        if (!Number.isFinite(x.di) || !Number.isFinite(x.mac) || !Number.isFinite(x.macBrain)) bad++;
        lastDi = x.di;
      }
      if (x.type === 'tof') tofN++;
    }, ['anaesthesia', 'tof']);
    e.dispatch(ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 }));
    e.dispatch(ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct: 2.5, fgfLpm: 6 }));
    e.dispatch(ev({ kind: 'drug', drugId: 'remifentanil', dose: 0.1, unit: 'mcg/kg/min', route: 'iv', infusion: true }));
    e.dispatch(cmd({ type: 'device', action: { device: 'tof', action: 'start', intervalS: 60 } }));
    for (let t = 60; t <= LONGRUN_S; t += 60) {
      e.advanceTo(t);
      await new Promise((r) => setImmediate(r));
    }
    expect(bad).toBe(0);
    expect(tofN).toBeGreaterThanOrEqual(LONGRUN_S / 60 - 1);
    expect(tofN).toBeLessThanOrEqual(LONGRUN_S / 60 + 1);
    expect(lastDi).toBeGreaterThan(30);
    expect(lastDi).toBeLessThan(50);
  });
});
