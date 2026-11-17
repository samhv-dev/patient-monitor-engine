// The EDP-TS holds and the respiratory mechanics they measure (research/57 H-18 to H-20, K-15 to K-17, N-07 to N-16;
// plan GX1, GX3, GX13, GD16, GD17), headless on the model with a lung of known compliance and resistance: each value the
// face shows equals the lung's own within half the last digit the face prints it to (face.json layout.dec), and each
// hold ends cleanly at the device's longest hold. Every wait is for an event of the model (a phase, a hold closing or
// ending, a breath starting, the end-expiratory volume settling), bounded only to fail rather than hang.
import { createVentDriver, DT, recoilPressure, setCircuit, type VentConfig, type VentDriver } from '@pme/ventilator';
import { describe, expect, it } from 'vitest';
import { createCockpit, type Cockpit } from '../../core/cockpit.ts';
import { dynamicCompliance } from '../../core/mechanics.ts';
import { DATA, dec, num } from './data.ts';
import { createKnob, type Knob } from './knob.ts';
import { EDP_SPEC } from './modes.ts';
import { dataPage, PAGES } from './patient-data.ts';

/** Half the last printed digit of a Patient's Data value: the tolerance the face's resolution gives. */
const half = (d: keyof typeof DATA.layout.dec) => 0.5 * 10 ** -dec(d);
const M = DATA.mechanics;

const setup = (lung: Partial<VentConfig>, settings: Partial<VentConfig>) => {
  const d = createVentDriver(null);
  const c = createCockpit(d, EDP_SPEC, { linked: false });
  c.write({ spont: false, efl: false, airwayClosure: false, uip: false, stressIdx: false, cardiac: false, pleural: 0, ...lung }, 'tool');
  c.write(settings);
  return { d, c, k: createKnob(c) };
};
/** One 5 ms step of the unlinked driver at a time, until `cond` holds; fails after `guardS` of sim time. */
const until = (d: VentDriver, cond: () => boolean, guardS: number, what: string) => {
  const s = d as unknown as { _ms?: number };
  let ms = s._ms ?? 0;
  d.frame(ms);
  const t0 = d.vs.p.t;
  while (!cond()) {
    if (d.vs.p.t - t0 > guardS) throw new Error(`${what}: not within ${guardS} s`);
    d.frame((ms += DT * 1000));
  }
  s._ms = ms;
};
/** The lung settled: the volume at the start of two breaths in a row differs by less than 0.01 mL. */
const settled = (d: VentDriver) => {
  let last = Number.NaN, n = d.vs.p.breathCount, prev = Number.NaN;
  until(d, () => {
    if (d.vs.p.breathCount !== n) { n = d.vs.p.breathCount; prev = last; last = d.vs.p.breathVstart; }
    return Math.abs(last - prev) < 0.01;
  }, 120, 'the lung settles');
};
const toPhase = (d: VentDriver, ph: 'insp' | 'exp') => {
  until(d, () => d.vs.p.phase !== ph, 30, `leave ${ph}`);
  until(d, () => d.vs.p.phase === ph, 30, `reach ${ph}`);
};
const runTest = (d: VentDriver, k: Knob, id: 'autoPeep' | 'complRes' | 'trapped') => {
  expect(k.tests!.start(id)).toBe(true);
  until(d, () => k.tests!.running() === null, 60, `the ${id} test`);
};

// Constant flow (the manual's formulas read the flow as VT / Ti, K-16), no patient effort.
const VCV: Partial<VentConfig> = { mode: 'VC', modeLabel: 'VCV', vt: 500, prvcTarget: 500, itime: 1.0, rate: 12, peep: 5, flowPattern: 'square', pause: 0 };
const LUNG = { compliance: 50, resistance: 10 };
/** A lung that empties slowly at a fast rate: τ = R·C = 1 s, Te = 1.4 s, so it keeps volume at end-expiration. */
const TRAPPING = { lung: { compliance: 50, resistance: 20 }, set: { ...VCV, itime: 0.6, rate: 30 } };
/** The steady state of a passive single compartment under constant-flow VC: VT·e^(−Te/τ) / (1 − e^(−Te/τ)), mL. */
const trappedMl = (vt: number, teS: number, tauS: number) => (vt * Math.exp(-teS / tauS)) / (1 - Math.exp(-teS / tauS));

describe('Insp/Exp Pause, held (research/57 H-18 to H-20)', () => {
  it('held in inspiration: the valves close at its end and stay closed while held; the plateau is PEEP plus VT over C', () => {
    const { d, c } = setup(LUNG, VCV);
    settled(d);
    toPhase(d, 'insp');
    expect(c.holds!.key(true)).toBe(true);
    until(d, () => c.holds!.state()?.since != null, 5, 'the hold closes');
    expect(d.vs.hold).toBe('insp');
    const at = d.vs.p.t;
    until(d, () => d.vs.p.t >= at + 1, 5, 'one second held');
    expect(d.vs.hold).toBe('insp');
    expect(d.vs.p.Q).toBe(0);
    c.holds!.key(false);
    expect(d.vs.hold).toBeNull();
    const r = c.holds!.last('insp')!;
    expect(r.durS).toBeGreaterThan(1);
    expect(Math.abs(r.paw - (5 + recoilPressure(d.vs.cfg, r.vMl)))).toBeLessThan(1e-9);
    expect(Math.abs(r.breath!.vtMl - 500)).toBeLessThan(1);
  });

  it('held in expiration: the valves close at its end, on the step the next breath would start, at PEEP total', () => {
    const { d, c } = setup(TRAPPING.lung, TRAPPING.set);
    settled(d);
    toPhase(d, 'exp');
    const n = d.vs.p.breathCount;
    c.holds!.key(true);
    until(d, () => c.holds!.state()?.since != null, 5, 'the hold closes');
    expect(d.vs.p.breathCount, 'no breath started').toBe(n);
    expect(d.vs.p.breathT).toBeGreaterThanOrEqual(60 / 30 - DT);
    c.holds!.key(false);
    const r = c.holds!.last('exp')!;
    expect(Math.abs(r.paw - (5 + recoilPressure(d.vs.cfg, r.vMl)))).toBeLessThan(1e-9);
    expect(d.vs.p.breathCount, 'released, the breath it held back starts').toBe(n + 1);
  });

  for (const [kind, phase, max] of [['insp', 'insp', num(M.holdInspMaxS)], ['exp', 'exp', num(M.holdExpMaxS)]] as const) {
    it(`held past ${max} s in ${phase}iration: the hold ends by itself at ${max} s, ventilation goes on, and it holds again only after a release`, () => {
      const { d, c } = setup(LUNG, VCV);
      settled(d);
      toPhase(d, phase);
      c.holds!.key(true);
      until(d, () => c.holds!.state()?.since != null, 10, 'the hold closes');
      until(d, () => c.holds!.state() === null, max + 1, 'the hold ends by itself');
      const r = c.holds!.last(kind)!;
      expect(Math.abs(r.durS - max)).toBeLessThanOrEqual(DT + 1e-9);
      expect([d.vs.hold, d.vs.pendingHold]).toEqual([null, null]);
      // the key still held: two more breaths come and nothing holds them
      const n = d.vs.p.breathCount;
      until(d, () => {
        expect(d.vs.hold).toBeNull();
        return d.vs.p.breathCount >= n + 2;
      }, 30, 'two breaths with the key still held');
      c.holds!.key(false);
      expect(c.holds!.key(true), 'pressed again').toBe(true);
      until(d, () => c.holds!.state()?.since != null, 10, 'it holds again');
      c.holds!.key(false);
    });
  }

  it('holds in VCV and PCV only (p. 19): the key does nothing in PRVC and PSV/CPAP', () => {
    for (const mode of ['VC', 'PC'] as const) expect(c0(mode).holds!.key(true), mode).toBe(true);
    for (const mode of ['PRVC', 'PSV'] as const) {
      const c = c0(mode);
      expect(c.holds!.key(true), mode).toBe('mode');
      expect([c.vs.hold, c.vs.pendingHold]).toEqual([null, null]);
    }
  });
});
const c0 = (mode: VentConfig['mode']): Cockpit => setup(LUNG, { ...VCV, mode, backupMode: 'VC' }).c;

describe('the respiratory-mechanics tests against the lung (research/57 K-15 to K-17)', () => {
  it('auto-PEEP: the end-expiratory occlusion reads the intrinsic PEEP of the lung\'s steady state', () => {
    const { d, c, k } = setup(TRAPPING.lung, TRAPPING.set);
    settled(d);
    const r = c.record()!;
    const want = trappedMl(r.vtMl, r.te, (TRAPPING.lung.resistance * TRAPPING.lung.compliance) / 1000) / TRAPPING.lung.compliance;
    runTest(d, k, 'autoPeep');
    expect(want, 'the lung traps volume').toBeGreaterThan(3);
    expect(Math.abs(k.tests!.values().autoPeep - want)).toBeLessThanOrEqual(half('pdAutoPeep'));
  });

  it('trapped volume: the volume above the relaxed volume at the set PEEP', () => {
    const { d, c, k } = setup(TRAPPING.lung, TRAPPING.set);
    settled(d);
    // the steady state of the breath the model gives: its volume and its expiration's length, on the lung's τ = R·C
    const r = c.record()!;
    const want = trappedMl(r.vtMl, r.te, (TRAPPING.lung.resistance * TRAPPING.lung.compliance) / 1000);
    runTest(d, k, 'trapped');
    expect(Math.abs(k.tests!.trappedMl() - want)).toBeLessThanOrEqual(half('pdVol'));
  });

  for (const [name, lung, set] of [['a lung that empties', LUNG, VCV], ['a lung that keeps volume (PEEP total above the set PEEP)', TRAPPING.lung, TRAPPING.set]] as const) {
    it(`compliance and resistance, ${name}: Cst = C, Ri = R, Re = R`, () => {
      const { d, k } = setup(lung, set);
      settled(d);
      runTest(d, k, 'complRes');
      // the next breath completes: TCexp is read from its expiration
      const n = d.vs.p.breathCount;
      until(d, () => d.vs.p.breathCount > n, 10, 'the breath after the hold');
      const v = k.tests!.values();
      expect(Math.abs(v.cst - lung.compliance), `Cst ${v.cst}`).toBeLessThanOrEqual(half('pdC'));
      expect(Math.abs(v.ri - lung.resistance), `Ri ${v.ri}`).toBeLessThanOrEqual(half('pdR'));
      expect(Math.abs(v.re - lung.resistance), `Re ${v.re}`).toBeLessThanOrEqual(half('pdR'));
    });
  }

  it('in PCV the plateau of the held breath gives Cst = C as well', () => {
    const { d, k } = setup(LUNG, { ...VCV, mode: 'PC', modeLabel: 'PCV', pc: 15, itime: 1.0 });
    settled(d);
    runTest(d, k, 'complRes');
    expect(Math.abs(k.tests!.values().cst - LUNG.compliance)).toBeLessThanOrEqual(half('pdC'));
  });

  it('each test is refused in a mode the manual excludes (PSV/CPAP), and nothing closes', () => {
    const { d, c, k } = setup(LUNG, { ...VCV, mode: 'PSV', backupMode: 'VC', spont: true, pmus: 6, spontRate: 14 });
    for (const id of ['autoPeep', 'complRes', 'trapped'] as const) expect(k.tests!.start(id), id).toBe(false);
    const t0 = d.vs.p.t;
    until(d, () => d.vs.p.t > t0 + 5, 6, 'five seconds');
    expect(c.holds!.last('exp')).toBeNull();
  });

  it('the values show "---" until their hold has been made (N-04)', () => {
    const { d, c, k } = setup(LUNG, VCV);
    settled(d);
    const page = Object.fromEntries(dataPage(c, k.tests!, 0).map((r) => [r.word, r.value]));
    for (const w of ['cst', 'ri', 're', 'autoPeep']) expect(page[w], w).toBe('---');
  });
});

describe("Patient's Data from the breath record (research/57 N-07 to N-16)", () => {
  const row = (c: Cockpit, k: Knob, w: string, page = 0) => dataPage(c, k.tests!, page).find((r) => r.word === w)!.value;

  /** The breaths the lung took, read from the model as they happen: each one's start and the volume it exhaled. */
  const watch = (d: VentDriver) => {
    const took: Array<{ t0: number; vt: number; kind: 'mand' | 'pt' }> = [];
    let n = d.vs.p.breathCount, phase = d.vs.p.phase;
    const step = () => {
      const p = d.vs.p;
      if (p.breathCount !== n) { n = p.breathCount; took.push({ t0: p.markers.at(-1)!.t, vt: Number.NaN, kind: p.markers.at(-1)!.type }); }
      if (phase !== 'exp' && p.phase === 'exp' && took.length) took[took.length - 1]!.vt = p.lastVTE;
      phase = p.phase;
    };
    return { took, step };
  };
  /** Over the last three complete breaths the lung took: volume a minute, breaths a minute (N-07 to N-09). */
  const lastThree = (took: Array<{ t0: number; vt: number }>) => {
    const b = took.slice(-4, -1), span = took.at(-1)!.t0 - b[0]!.t0;
    return { ve: (b.reduce((x, y) => x + y.vt, 0) / 1000) * (60 / span), f: (60 * b.length) / span };
  };

  it('VE Mandat in VCV: the last three breaths\' exhaled volume over their time, as the lung took them', () => {
    const { d, c, k } = setup(LUNG, VCV);
    const w = watch(d);
    until(d, () => { w.step(); return c.breaths(false).length === num(M.breathsAveraged) && w.took.length >= 4 && d.vs.p.phase === 'insp'; }, 60, 'three complete breaths');
    expect(Math.abs(Number(row(c, k, 'veMandat')) - lastThree(w.took).ve)).toBeLessThanOrEqual(half('pdVe'));
    expect(row(c, k, 'veSpont'), 'no spontaneous breath in VCV (N-03)').toBe('---');
  });

  it('TCexp is R·C, Cdyn is VT over the peak pressure above PEEP, Ti/Ttot the time ratio', () => {
    const { d, c, k } = setup(LUNG, VCV);
    settled(d);
    const r = c.record()!;
    expect(Math.abs(Number(row(c, k, 'tcexp')) - (LUNG.resistance * LUNG.compliance) / 1000)).toBeLessThanOrEqual(half('pdTc'));
    // constant flow Q = VT / Ti: the peak is PEEP + VT/C + Q·R
    const flowLs = 0.5 / 1.0;
    const cdyn = 500 / (500 / LUNG.compliance + flowLs * LUNG.resistance);
    // the value the face computes, unrounded, is the lung's within half the digit it prints; and the face prints it
    const measured = dynamicCompliance(r);
    expect(Math.abs(measured - cdyn)).toBeLessThanOrEqual(half('pdC'));
    expect(row(c, k, 'cdyn')).toBe(measured.toFixed(dec('pdC')));
    expect(Number(row(c, k, 'tiTtot', 1))).toBeCloseTo(r.ti / (r.ti + r.te), dec('pdTiTtot'));
    expect(Math.abs(r.ti / (r.ti + r.te) - 1.0 / 5)).toBeLessThanOrEqual(half('pdTiTtot'));
  });

  it('Cdyn reads each breath against the PEEP it was given at: a PEEP changed in its expiration does not move it', () => {
    const { d, c, k } = setup(LUNG, VCV);
    settled(d);
    toPhase(d, 'exp');
    const n = d.vs.p.breathCount;
    c.write({ peep: VCV.peep! + 5 });
    // the breath whose expiration the change came in is complete when the next one starts
    until(d, () => d.vs.p.breathCount > n, 10, 'the next breath');
    const r = c.record()!;
    expect(r.peep).toBe(VCV.peep);
    const cdyn = 500 / (500 / LUNG.compliance + (0.5 / 1.0) * LUNG.resistance);
    expect(Math.abs(dynamicCompliance(r) - cdyn)).toBeLessThanOrEqual(half('pdC'));
    expect(row(c, k, 'cdyn')).toBe(dynamicCompliance(r).toFixed(dec('pdC')));
  });

  it('PSV/CPAP with a breathing patient: F Spont, VE Spont and F/VT are those of the breaths the lung took', () => {
    const { d, c, k } = setup({ ...LUNG, spont: true, pmus: 8, spontRate: 16, variability: false }, { ...VCV, mode: 'PSV', modeLabel: 'PSV/CPAP', backupMode: 'VC', ps: 10, cycleOff: 25 });
    const w = watch(d);
    let prev = Number.NaN;
    // the breathing settles: two breaths in a row exhale the same volume to a hundredth of a mL
    until(d, () => {
      w.step();
      const done = w.took.filter((x) => !Number.isNaN(x.vt));
      const v = done.at(-1)?.vt ?? Number.NaN;
      const ok = d.vs.p.phase === 'insp' && w.took.length >= 4 && Math.abs(v - prev) < 0.01 && c.breaths(true).length === num(M.breathsAveraged);
      if (done.length >= 2) prev = done.at(-2)!.vt;
      return ok;
    }, 120, 'the breathing settles');
    expect(w.took.slice(-4).every((x) => x.kind === 'pt'), 'the patient\'s breaths').toBe(true);
    const want = lastThree(w.took);
    expect(Math.abs(Number(row(c, k, 'fSpont')) - want.f)).toBeLessThanOrEqual(half('pdF'));
    expect(Math.abs(Number(row(c, k, 'veSpont')) - want.ve)).toBeLessThanOrEqual(half('pdVe'));
    // F/VT: the rate over the last exhaled volume in litres (N-11)
    const last = w.took.at(-2)!;
    expect(Math.abs(Number(row(c, k, 'fvt')) - want.f / (last.vt / 1000))).toBeLessThanOrEqual(half('pdFvt'));
    expect(row(c, k, 'veMandat'), 'no mandatory breath').toBe('---');
  });

  it('the two pages, as the manual\'s figure lists them; the values the model does not have show "---"', () => {
    expect(PAGES.length).toBe(num(M.patientDataPages));
    const { c, k } = setup(LUNG, VCV);
    expect(dataPage(c, k.tests!, 0).map((r) => r.word)).toEqual(['veMandat', 'veSpont', 'fSpont', 'tcexp', 'fvt', 'cdyn', 'wobi', 'etco2', 'vco2', 'cst', 'ri', 're', 'autoPeep']);
    expect(dataPage(c, k.tests!, 1).map((r) => r.word)).toEqual(['veMandat', 'veSpont', 'fSpont', 'tcexp', 'fvt', 'cdyn', 'wobi', 'etco2', 'vco2', 'leakL', 'leakPct', 'tiTtot', 'ptracheal']);
    for (const r of [...dataPage(c, k.tests!, 0), ...dataPage(c, k.tests!, 1)]) if (r.unsim) expect(r.value, r.word).toBe('---');
  });
});

describe('Manual Insp. (research/57 H-15)', () => {
  it('one breath at the set parameters from expiration, counted as the device\'s (the lung icon stays off)', () => {
    const { d, c, k } = setup(LUNG, VCV);
    settled(d);
    toPhase(d, 'exp');
    const n = d.vs.p.breathCount;
    k.press('under:manualInsp');
    expect(d.vs.p.breathCount).toBe(n + 1);
    expect(d.vs.p.markers.at(-1)!.type).toBe('mand');
    until(d, () => d.vs.p.phase === 'exp', 5, 'the breath ends');
    expect(Math.abs(d.vs.p.lastVTE - 500)).toBeLessThan(1);
    expect(c.p.lastPtT).toBeNull();
  });
});

describe('the screen lock (research/57 H-12, H-13)', () => {
  it('held 2 s it locks; an alarm unlocks it', () => {
    const d = createVentDriver(null);
    const c = createCockpit(d, EDP_SPEC, { linked: false });
    let now = 0;
    const k = createKnob(c, () => now);
    k.down('under:lock');
    now += num(M.lockHoldS) * 1000;
    expect(k.locked(), 'locked once held 2 s, before the release').toBe(true);
    k.up('under:lock');
    k.press('side:menu');
    expect(k.windows()).toEqual([]);
    setCircuit(d.vs, 'disconnected');
    until(d, () => !k.locked(), 30, 'an alarm unlocks');
    expect(c.alarms().signals!.message).not.toBeNull();
  });
});

describe('inspiratory resistance: the manual\'s formula, shown for a breath given at a constant flow (research/57 K-16, K-27 to K-29)', () => {
  const riRow = (c: Cockpit, k: Knob) => dataPage(c, k.tests!, 0).find((r) => r.word === 'ri')!;
  it('the data marks the rule and cites the manual\'s formula, its definition, its figure and the gap', () => {
    const l = M.riFlow as { v: string; p: string; src: string };
    expect(l).toMatchObject({ v: 'constant', p: 'inferred' });
    for (const row of ['K-16', 'K-27', 'K-28', 'K-29']) expect(l.src).toContain(row);
  });
  it('VCV at a constant flow: Ri is the lung\'s resistance, shown with no reason', () => {
    const { d, c, k } = setup(LUNG, VCV);
    settled(d);
    runTest(d, k, 'complRes');
    expect(Math.abs(k.tests!.values().ri - LUNG.resistance)).toBeLessThanOrEqual(half('pdR'));
    expect(riRow(c, k)).toMatchObject({ value: k.tests!.values().ri.toFixed(dec('pdR')), unsim: null });
  });
  for (const [label, set] of [
    ['VCV with the descending ramp (the face\'s starting waveform)', { ...VCV, flowPattern: 'ramp0' }],
    ['PCV', { ...VCV, mode: 'PC', modeLabel: 'PCV', pc: 15 }],
    ['PRVC', { ...VCV, mode: 'PRVC', modeLabel: 'PRVC', prvcTarget: 500 }],
  ] as const) {
    it(`${label}: the flow was not constant, so Ri shows "---" and says why; Cst is still the lung's`, () => {
      const { d, c, k } = setup(LUNG, set as Partial<VentConfig>);
      settled(d);
      runTest(d, k, 'complRes');
      const v = k.tests!.values();
      expect(Math.abs(v.cst - LUNG.compliance), `Cst ${v.cst}`).toBeLessThanOrEqual(half('pdC'));
      expect(v.ri).toBeNaN();
      expect(riRow(c, k)).toMatchObject({ value: '---', unsim: 'riFlow' });
    });
  }
});

describe('what ends a hold, and what it leaves', () => {
  const holding = (lung = LUNG, set = VCV, phase: 'insp' | 'exp' = 'exp') => {
    const s = setup(lung, set);
    settled(s.d);
    toPhase(s.d, phase);
    s.c.holds!.key(true);
    until(s.d, () => s.c.holds!.state()?.since != null, 10, 'the hold closes');
    return s;
  };
  it('released on the step the valves close, before any step has held, the key keeps no result: there was no plateau to read', () => {
    const { d, c } = setup(LUNG, VCV);
    settled(d);
    toPhase(d, 'insp');
    c.holds!.key(true);
    // released on the step the valves close: that step still carried the inspiration's last flow
    until(d, () => c.holds!.state()?.since != null, 10, 'the valves close');
    c.holds!.key(false);
    expect(c.holds!.last('insp')).toBeNull();
    expect(d.vs.hold).toBeNull();
  });
  it('released after one held step, the plateau is the held pressure: PEEP plus the lung\'s recoil, no flow', () => {
    const { d, c } = setup(LUNG, VCV);
    settled(d);
    toPhase(d, 'insp');
    c.holds!.key(true);
    until(d, () => (c.holds!.state()?.held ?? 0) >= 1, 10, 'one held step');
    c.holds!.key(false);
    expect(c.holds!.last('insp')!.paw).toBeCloseTo(VCV.peep! + recoilPressure(d.vs.cfg, d.vs.p.V), 9);
  });
  it('the circuit opened during a hold ends it, keeps no result and gives no held-back breath', () => {
    const { d, c } = holding();
    setCircuit(d.vs, 'disconnected');
    until(d, () => c.holds!.state() === null, 1, 'the hold ends');
    expect(c.holds!.last('exp')).toBeNull();
    // the breath it held back is dropped; the next breath comes on its own mandatory timing
    expect([d.vs.hold, d.vs.pendingHold, d.vs.heldBreath]).toEqual([null, null, undefined]);
  });
  it('a reset during a hold keeps no result; a reset forgets every result and breath: the screen shows "---"', () => {
    const { d, c, k } = setup(TRAPPING.lung, TRAPPING.set);
    settled(d);
    runTest(d, k, 'complRes');
    for (const w of ['cst', 'ri', 'autoPeep']) expect(dataPage(c, k.tests!, 0).find((r) => r.word === w)!.value, w).not.toBe('---');
    toPhase(d, 'exp');
    c.holds!.key(true);
    until(d, () => c.holds!.state()?.since != null, 10, 'a second hold closes');
    c.reset();
    until(d, () => c.holds!.state() === null, 1, 'the hold ends');
    expect([c.holds!.last('insp'), c.holds!.last('exp'), c.record()]).toEqual([null, null, null]);
    expect(c.breaths(false)).toEqual([]);
    expect(k.tests!.trappedMl()).toBeNaN();
    for (const r of dataPage(c, k.tests!, 0)) expect(r.value, r.word).toBe('---');
  });
  it('a new patient (a preset) forgets them too', () => {
    const { d, c, k } = setup(TRAPPING.lung, TRAPPING.set);
    settled(d);
    runTest(d, k, 'autoPeep');
    c.preset('copd');
    expect(k.tests!.values().autoPeep).toBeNaN();
  });
  for (const [what, patch] of [['the mode', { mode: 'PC', modeLabel: 'PCV' }], ['the set PEEP', { peep: 8 }]] as const) {
    it(`${what} changed during a hold ends it with no result, and forgets the results measured against it`, () => {
      const { d, c, k } = setup(TRAPPING.lung, TRAPPING.set);
      settled(d);
      runTest(d, k, 'autoPeep');
      expect(k.tests!.values().autoPeep).not.toBeNaN();
      toPhase(d, 'exp');
      c.holds!.key(true);
      until(d, () => c.holds!.state()?.since != null, 10, 'the hold closes');
      c.write(patch as Partial<VentConfig>);
      expect(c.holds!.state()).toBeNull();
      expect([c.holds!.last('exp'), d.vs.hold]).toEqual([null, null]);
      expect(k.tests!.values().autoPeep).toBeNaN();
    });
  }
  it('Manual Insp. during a hold is refused, with the simulator\'s words; nothing is counted', () => {
    const { d, c, k } = holding();
    const n = d.vs.p.breathCount;
    k.press('under:manualInsp');
    expect(d.vs.p.breathCount).toBe(n);
    expect(k.note()).toBe('manualHold');
    c.holds!.key(false);
    expect(d.vs.p.breathCount, 'only the held-back breath, at the release').toBe(n + 1);
  });
  it('a 20 s expiratory hold gives no breath for longer than the apnoea time: Apnea is raised while held, and goes when ventilation resumes', () => {
    const { d, c } = holding();
    until(d, () => c.alarms().active.some((a) => a.id === 'apnea'), num(M.holdExpMaxS), 'Apnea while held');
    expect(d.vs.hold).toBe('exp');
    until(d, () => c.holds!.state() === null, num(M.holdExpMaxS), 'the hold ends at its length');
    until(d, () => !c.alarms().active.some((a) => a.id === 'apnea'), 1, 'the breath given at the release ends it');
  });
  it('a patient\'s effort during an expiratory hold shows on the held pressure (the model\'s equation of motion); the held-back breath keeps its kind', () => {
    const { d, c } = holding({ ...LUNG, spont: true, pmus: 8, spontRate: 20, variability: false } as typeof LUNG, { ...VCV, rate: 6 });
    const base = d.vs.p.Paw;
    // the effort may already be rising when the valves close (a patient-triggered end of expiration)
    until(d, () => d.vs.p.Paw < base - 1, 5, 'the held pressure falls with an effort');
    expect(d.vs.hold).toBe('exp');
    expect(d.vs.p.Paw).toBeCloseTo(VCV.peep! + recoilPressure(d.vs.cfg, d.vs.p.V) - d.vs.p.Pmus, 9);
    const held = d.vs.heldBreath!;
    c.holds!.key(false);
    expect(d.vs.p.markers.at(-1)!.type).toBe(held.mandatory ? 'mand' : 'pt');
  });
});

describe('the values belong to the breath and the hold they were measured on', () => {
  it('PEEP total comes only from the occlusion that ended where the held breath began; a later key hold alone uses the measured PEEP', () => {
    const { d, c, k } = setup(TRAPPING.lung, TRAPPING.set);
    settled(d);
    runTest(d, k, 'autoPeep');
    const exp = c.holds!.last('exp')!;
    // breaths go by, then an inspiratory hold by the key, with no occlusion before its breath
    const n = d.vs.p.breathCount;
    until(d, () => d.vs.p.breathCount >= n + 2 && d.vs.p.phase === 'insp', 30, 'two breaths later');
    c.holds!.key(true);
    until(d, () => c.holds!.state()?.since != null, 5, 'the hold closes');
    c.holds!.key(false);
    const insp = c.holds!.last('insp')!;
    const cst = k.tests!.values().cst;
    expect(cst).toBeCloseTo(insp.breath!.vtMl / (insp.paw - insp.breath!.peepBefore), 9);
    expect(insp.breath!.peepBefore).not.toBeCloseTo(exp.paw, 3);
  });
  it('Re is the held breath\'s own time constant over its Cst, "---" until that breath is complete', () => {
    const { d, c, k } = setup(LUNG, VCV);
    settled(d);
    runTest(d, k, 'complRes');
    expect(k.tests!.values().re, 'the held breath not yet complete').toBeNaN();
    const t0 = c.holds!.last('insp')!.breath!.t0;
    until(d, () => Math.abs((c.record()?.t0 ?? -1) - t0) < DT / 2, 10, 'the held breath completes');
    const v = k.tests!.values();
    expect(v.re).toBeCloseTo(c.record()!.tcexp / (v.cst / 1000), 9);
    const n = d.vs.p.breathCount;
    c.write({ resistance: 20 }, 'tool');
    until(d, () => d.vs.p.breathCount >= n + 2, 20, 'breaths on a changed lung');
    expect(k.tests!.values().re, 'not a later breath\'s time constant').toBeCloseTo(v.re, 9);
  });
  it('a switch from PSV/CPAP to VCV leaves no pressure-support breath in VE Spont or F Spont', () => {
    const { d, c, k } = setup({ ...LUNG, spont: true, pmus: 8, spontRate: 16 }, { ...VCV, mode: 'PSV', modeLabel: 'PSV/CPAP', backupMode: 'VC', ps: 10 });
    until(d, () => c.breaths(true).length === num(M.breathsAveraged), 60, 'three spontaneous breaths');
    k.press('side:mode'); k.push(); k.push(); // VCV
    expect(c.cfg.mode).toBe('VC');
    expect(c.breaths(true)).toEqual([]);
    const page = dataPage(c, k.tests!, 0);
    for (const w of ['veSpont', 'fSpont']) expect(page.find((r) => r.word === w)!.value, w).toBe('---');
  });
});

describe('a test that cannot close its valves, and Esc', () => {
  it('every breath ending at the pressure limit: the armed inspiratory occlusion never closes, the test is stopped at its wait and says so; the key then holds', () => {
    // the maximum pressure under the breath's peak: the breath is ended at it (the device's Pmax cycling, research/57 A-32)
    const { d, c, k } = setup(LUNG, { ...VCV, pmax: 12 });
    settled(d);
    const t0 = d.vs.p.t;
    expect(k.tests!.start('complRes')).toBe(true);
    until(d, () => k.tests!.running() === null, num(M.testWaitMaxS) + 10, 'the test ends');
    // the end-expiratory occlusion first (at most one breath period and its length), then the wait
    // and the step its end is seen on
    expect(d.vs.p.t - t0).toBeLessThanOrEqual(60 / VCV.rate! + num(M.occlusionS) + num(M.testWaitMaxS) + 2 * DT);
    expect(k.note()).toBe('testStopped');
    expect(c.holds!.last('insp')).toBeNull();
    expect([d.vs.hold, d.vs.pendingHold]).toEqual([null, null]);
    expect(c.holds!.key(true)).toBe(true);
  });
  it('while a test runs the key says so; Esc cancels the test, with no result and no breath given', () => {
    const { d, c, k } = setup(LUNG, VCV);
    settled(d);
    toPhase(d, 'insp');
    k.tests!.start('autoPeep');
    k.down('under:inspExpPause');
    expect(k.note()).toBe('pauseBusy');
    k.up('under:inspExpPause');
    until(d, () => d.vs.hold === 'exp', 10, 'the occlusion closes');
    const n = d.vs.p.breathCount;
    k.press('under:esc');
    expect([k.tests!.running(), d.vs.hold, c.holds!.last('exp')]).toEqual([null, null, null]);
    expect(d.vs.p.breathCount).toBe(n);
    expect(k.note()).toBe('testCancelled');
  });
});

describe('P0.1: the drop of the held pressure in the first 100 ms of an effort (research/57 K-19)', () => {
  const BREATHING = { ...LUNG, spont: true, pmus: 8, spontRate: 20, variability: false };
  it('measured on an end-expiratory occlusion; it is the lung model\'s effort over that window; held until the next', () => {
    const { d, c, k } = setup(BREATHING, { ...VCV, rate: 6 });
    settled(d);
    expect(k.tests!.p01(), 'before it is measured').toBeNaN();
    // the effort, step by step: on the first step the airway is held (the step the valves close on is still the
    // expiration's) and on the step the occlusion ends
    let from = Number.NaN, to = Number.NaN, closed = 0, was = false;
    const off = c.onStep(() => {
      const now = c.holds!.state()?.since != null;
      if (now && ++closed === 2) from = d.vs.p.Pmus;
      if (was && !now) to = d.vs.p.Pmus;
      was = now;
    });
    expect(k.tests!.start('p01')).toBe(true);
    until(d, () => k.tests!.running() === null, 60, 'the test ends');
    off();
    expect(k.note()).toBe('testDone');
    // the held pressure is PEEP + recoil − effort on a constant volume: its drop is the effort's rise
    expect(Math.abs(k.tests!.p01() - (to - from))).toBeLessThan(1e-9);
    expect(k.tests!.p01()).toBeGreaterThan(0);
    const v = k.tests!.p01();
    const n = d.vs.p.breathCount;
    until(d, () => d.vs.p.breathCount > n + 1, 30, 'ventilation goes on');
    expect(k.tests!.p01(), 'held').toBe(v);
  });
  it('with no effort the occlusion ends at its longest and says so; no value', () => {
    const { d, k } = setup(LUNG, VCV);
    settled(d);
    k.tests!.start('p01');
    until(d, () => k.tests!.running() === null, num(M.p01MaxS) + num(M.testWaitMaxS), 'the test ends');
    expect(k.note()).toBe('p01NoEffort');
    expect(k.tests!.p01()).toBeNaN();
  });
});
