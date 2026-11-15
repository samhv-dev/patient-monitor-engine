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

// Brief 202: one miss recorded as an expected failure (the conditions' numbers are not changed here). N111: the device
// reads its oxygen cell; the model has none.
describe('the EDP-TS alarm conditions: known misses', () => {
  it.fails('o2High is raised on the oxygen the device\'s cell reads (A-44): IMG_1542 shows 43 % read at a set 40 %, so a high limit of 42 is crossed (measured: not raised, as the model has no oxygen sensor and its O2 alarms compare the SET 40 % with the limit, finding N111)', () => {
    const vs = createVent({ fio2: 40, almO2hi: 42, almO2lo: 30 });
    advanceVent(vs, 40);
    expect(ids(vs)).toContain('o2High');
  });
});

// Brief 202, round 2: a condition is evaluated only once the quantity it reads exists. Peak is "the maximum pressure in
// each breath" (research/57 R-20, M p. 16) and the exhaled VT a breath's (V-10): a breath-based condition waits for the
// first breath whose inspiration has ended. V̇E is "the volume delivered per minute" (S-08, M p. 15) and the model's is
// the rate of the breath intervals times the last exhaled VT: it exists once the record read holds a rate. Before that,
// the record holds zeros that no breath produced, and the v1.9 conditions read them as a low peak and a low minute
// volume (brief 202 found Low pressure at t = 0.005 s and Low minute volume latched at 11 s on a quiet start).
describe('no condition reads a quantity that does not exist yet', () => {
  const EDP = { almPlo: 5, almContHiP: 5, almPeepHi: 20, almO2hi: 60, almO2lo: 30 };
  it('a quiet start on a connected patient: no condition at any 5 ms step of the first 30 s (but contHighPressure, true in every inspiration by design: its 15 s is the face\'s delay, A-31)', () => {
    const vs = createVent(EDP);
    const seen = new Set<string>();
    advanceVent(vs, 30, (v) => { for (const a of ventAlarms(v, {})) if (a.id !== 'contHighPressure') seen.add(`${a.id}@${v.p.t.toFixed(3)}`); });
    expect([...seen]).toEqual([]);
  });
  it('lowPressure, pmax and disconnection read the last COMPLETED breath (R-20): none before the first inspiration ends', () => {
    const vs = createVent({ almPlo: 5 });
    let firstEnd = -1;
    advanceVent(vs, 3, (v) => {
      if (firstEnd < 0 && v.p.breathTimes.length > 0) firstEnd = v.p.t;
      if (firstEnd < 0) expect(ids(v)).toEqual([]);
    });
    expect(firstEnd).toBeGreaterThan(0);
  });
  it('a circuit open to air from the start still alarms once a breath has been delivered into it (A-34, A-35)', () => {
    const vs = createVent({ almPlo: 5 });
    setCircuit(vs, 'disconnected');
    advanceVent(vs, 8);
    expect(ids(vs)).toContain('lowPressure');
    expect(ids(vs)).toContain('disconnection');
  });
  it('mvLow / mvHigh wait for the minute volume to exist: a rate in the record they read (S-08); then they read it', () => {
    const vs = createVent({ almMVlo: 2.41 });
    advanceVent(vs, 30, (v) => { if (!((v.p.shown ?? v.p.measured).RR > 0)) expect(ids(v)).not.toContain('mvLow'); });
    vs.cfg.almMVlo = 50;
    expect(ids(vs)).toContain('mvLow');
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
