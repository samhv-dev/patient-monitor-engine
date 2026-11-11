// The EDP-TS alarm conditions the v1.9 model did not have (plan vent-skin-edp-ts.md V3; research/57 A-31, A-35, A-44,
// A-49, L-02, L-08, L-13, L-15). Each is evaluated only when its optional limit is in the cfg, so the v1.9 configuration
// (the Hamilton-style face) raises exactly what it raised before; and `silenceAlarms` takes a duration (A-20).
import { describe, expect, it } from 'vitest';
import { advanceVent, createVent, setCircuit, silenceAlarms, toggleHold, ventAlarms } from '../src/index.ts';

const NEW = ['lowPressure', 'contHighPressure', 'highPeep', 'o2High', 'o2Low'];
const ids = (vs: Parameters<typeof ventAlarms>[0], obs?: Parameters<typeof ventAlarms>[1]) => ventAlarms(vs, obs).map((a) => a.id);

describe('the EDP-TS alarm conditions', () => {
  it('without their limits nothing new is raised, whatever happens (the v1.9 cfg keeps its keys)', () => {
    const vs = createVent();
    expect(Object.keys(vs.cfg).filter((k) => /^alm(Plo|ContHiP|PeepHi|O2)|alarmVolume/.test(k))).toEqual([]);
    advanceVent(vs, 10);
    toggleHold(vs, 'insp'); // a long inspiratory hold: the airway pressure stays above PEEP + 5
    advanceVent(vs, 40);
    toggleHold(vs, 'insp');
    setCircuit(vs, 'disconnected');
    advanceVent(vs, 55);
    for (const id of NEW) expect(ids(vs, { peepEnd: 99 })).not.toContain(id);
  });

  it('lowPressure: the last breath\'s peak under the minimum inspiratory pressure (A-35, L-02)', () => {
    const vs = createVent({ almPlo: 5 });
    advanceVent(vs, 10);
    expect(ids(vs)).not.toContain('lowPressure');
    setCircuit(vs, 'disconnected');
    advanceVent(vs, 20);
    expect(vs.p.measured.PIP).toBeLessThan(5);
    expect(ids(vs)).toContain('lowPressure');
    expect(ventAlarms(vs).find((a) => a.id === 'lowPressure')?.priority).toBe('high');
  });

  it('contHighPressure: the airway pressure above PEEP + 5, instantaneous (the 15 s is the face\'s delay, A-31, L-15)', () => {
    const vs = createVent({ almContHiP: 5 });
    advanceVent(vs, 10);
    let seen = false, clear = false;
    for (let i = 1; i <= 1000; i++) { advanceVent(vs, 10 + i * 0.005); const on = ids(vs).includes('contHighPressure'); seen ||= on; clear ||= !on; }
    expect(seen && clear, 'raised in inspiration, gone in expiration').toBe(true);
    toggleHold(vs, 'insp');
    advanceVent(vs, 40);
    expect(vs.p.Paw).toBeGreaterThan(vs.cfg.peep + 5);
    expect(ids(vs)).toContain('contHighPressure');
  });

  it('highPeep: the end-expiratory pressure the caller measured above the limit (A-49, L-13); none without it', () => {
    const vs = createVent({ almPeepHi: 20 });
    advanceVent(vs, 5);
    expect(ids(vs, { peepEnd: 5 })).not.toContain('highPeep');
    expect(ids(vs)).not.toContain('highPeep');
    expect(ventAlarms(vs, { peepEnd: 21 }).find((a) => a.id === 'highPeep')?.priority).toBe('medium');
  });

  it('o2High / o2Low: the set oxygen outside its limits (no oxygen sensor in the model; A-44, L-08)', () => {
    const vs = createVent({ fio2: 50, almO2hi: 60, almO2lo: 40 });
    advanceVent(vs, 2);
    expect(ids(vs)).not.toContain('o2High');
    expect(ids(vs)).not.toContain('o2Low');
    vs.cfg.almO2hi = 45;
    expect(ids(vs)).toContain('o2High');
    vs.cfg.almO2hi = 60;
    vs.cfg.almO2lo = 55;
    expect(ids(vs)).toContain('o2Low');
  });
});

describe('silenceAlarms', () => {
  it('120 s by default (v1.9), or the duration a face passes', () => {
    const vs = createVent();
    advanceVent(vs, 3);
    silenceAlarms(vs);
    expect(vs.silenceUntil - vs.p.t).toBeCloseTo(120, 9);
    silenceAlarms(vs, 30);
    expect(vs.silenceUntil - vs.p.t).toBeCloseTo(30, 9);
  });
});
