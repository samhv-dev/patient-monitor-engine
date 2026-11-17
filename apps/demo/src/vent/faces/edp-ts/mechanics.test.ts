// The EDP-TS holds and the respiratory mechanics they measure (research/57 H-18 to H-20, K-15 to K-17, N-07 to N-16;
// plan GX1, GX3, GX13, GD16, GD17), headless on the model with a lung of known compliance and resistance: each value the
// face shows equals the lung's own within half the last digit the face prints it to (face.json layout.dec), and each
// hold ends cleanly at the device's longest hold. Every wait is for an event of the model (a phase, a hold closing or
// ending, a breath starting, the end-expiratory volume settling), bounded only to fail rather than hang.
import { createVentDriver, DT, recoilPressure, setCircuit, type VentConfig, type VentDriver } from '@pme/ventilator';
import { describe, expect, it } from 'vitest';
import { createCockpit, type Cockpit } from '../../core/cockpit.ts';
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
      expect(c.holds!.key(true), mode).toBe(false);
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

  it('VE Mandat in VCV: the last three breaths\' volume over their time, the set VT times the rate', () => {
    const { d, c, k } = setup(LUNG, VCV);
    until(d, () => c.breaths(false).length === num(M.breathsAveraged), 60, 'three complete breaths');
    expect(Math.abs(Number(row(c, k, 'veMandat')) - (0.5 * 12))).toBeLessThanOrEqual(half('pdVe') + 0.5 * 12 * 0.002);
    expect(row(c, k, 'veSpont'), 'no spontaneous breath').toBe('---');
  });

  it('TCexp is R·C, Cdyn is VT over the peak pressure above PEEP, Ti/Ttot the time ratio', () => {
    const { d, c, k } = setup(LUNG, VCV);
    settled(d);
    const r = c.record()!;
    expect(Math.abs(Number(row(c, k, 'tcexp')) - (LUNG.resistance * LUNG.compliance) / 1000)).toBeLessThanOrEqual(half('pdTc'));
    // constant flow Q = VT / Ti: the peak is PEEP + VT/C + Q·R
    const flowLs = 0.5 / 1.0;
    const cdyn = 500 / (500 / LUNG.compliance + flowLs * LUNG.resistance);
    expect(Math.abs(Number(row(c, k, 'cdyn')) - cdyn)).toBeLessThanOrEqual(half('pdC') + 0.05);
    expect(Number(row(c, k, 'tiTtot', 1))).toBeCloseTo(r.ti / (r.ti + r.te), dec('pdTiTtot'));
    expect(Math.abs(r.ti / (r.ti + r.te) - 1.0 / 5)).toBeLessThanOrEqual(half('pdTiTtot'));
  });

  it('PSV/CPAP with a breathing patient: F Spont is the patient\'s rate, VE Spont its volume a minute, F/VT the rapid shallow breathing index', () => {
    const { d, c, k } = setup({ ...LUNG, spont: true, pmus: 8, spontRate: 16, variability: false }, { ...VCV, mode: 'PSV', modeLabel: 'PSV/CPAP', backupMode: 'VC', ps: 10, cycleOff: 25 });
    settled(d);
    const n = c.breaths(true).length;
    expect(n).toBe(num(M.breathsAveraged));
    expect(Math.abs(Number(row(c, k, 'fSpont')) - 16)).toBeLessThanOrEqual(half('pdF'));
    const vt = c.breaths(true).reduce((s, b) => s + b.vtMl, 0) / n / 1000;
    expect(Math.abs(Number(row(c, k, 'veSpont')) - vt * 16)).toBeLessThanOrEqual(half('pdVe') + vt * 16 * 0.01);
    expect(Number(row(c, k, 'fvt'))).toBeCloseTo(c.measured().RR / (c.measured().VTE / 1000), 0);
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
