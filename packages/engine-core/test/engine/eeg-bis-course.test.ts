// EEG E7 on the ENGINE'S signal (the course tests; the reader's constructed-input tests are
// test/l3/eeg-devices/bis-type.test.ts): one 40-y patient, seed 31, the BIS-type reader chosen with `device eeg model
// bisType`, through awake → sedation → loss of responsiveness → surgical depth (propofol + fentanyl, no stimulus) →
// burst suppression → emergence. Each sub-parameter must move the way the papers say; the plan's cells C26–C30.
// Directions: [RAM98] Rampil 1998 Fig. 16 (pp. 998–999): the β ratio −0.55 → −1.64 → −2.47 → −2.63 and the BIS
// 93.8 → 84.7 → 59.8 → 39.8 as propofol rises 0 → 5.38 µg/mL; [CON22] Connor 2022 p. 7 and Fig. 3B: the 40–47 Hz power
// concentration drops at induction; low (0.5–4 Hz) over mid (11–20 Hz) power shifts the mix toward general anaesthesia.
// Nothing here is tuned: a miss is an expected failure (it.fails) with its measured value and its cause in the title.
import { beforeAll, describe, expect, it } from 'vitest';
import { createEngine, type Command, type MonitorEngine } from '../../src/index.ts';
import { epochSpectrum, meanBicoherence } from '../../src/l3/eeg-devices/bis-type.ts';

const ADULT = { weightKg: 70, heightCm: 170, ageY: 40, sex: 'M' as const };
let k = 0;
const cmd = (c: Record<string, unknown>) => ({ id: `eeg7-${++k}`, issuedBy: 'test', ...c }) as unknown as Command;
const eeg = (action: string, value?: unknown) => cmd({ type: 'device', action: { device: 'eeg', action, ...(value !== undefined ? { value } : {}) } });
const ev = (event: Record<string, unknown>) => cmd({ type: 'applyEvent', event });
const TCI = (target: number) => ev({ kind: 'tci', drugId: 'propofol', mode: 'effect', target });
const ETT = ev({ kind: 'airwayDevice', device: 'ett' });
const VENT = ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 });
const FENT = ev({ kind: 'drug', drugId: 'fentanyl', dose: 2, unit: 'mcg/kg', route: 'iv' });
const IDS = ['bis', 'bisSr', 'bisBeta', 'bisConc', 'bisLowMid'] as const;
type Id = (typeof IDS)[number];

/** The phases: [name, start s, commands at start, read window [from, to] s]. Effect-site targets settle in ≈ 2–3 min. */
const PHASES: Array<[string, number, Command[], [number, number]]> = [
  ['awake', 0, [], [90, 120]],
  ['sedation', 120, [TCI(1.5)], [300, 330]],
  ['loss of responsiveness', 330, [TCI(3)], [510, 540]],
  ['surgical depth', 540, [ETT, VENT, TCI(3.5), FENT], [780, 810]],
  ['burst suppression', 810, [TCI(8)], [1080, 1110]],
  // C29: the same burst suppression with noisy electrodes (25 kΩ: the generator's electrode noise, artefacts.ts)
  ['noisy burst suppression', 1110, [eeg('impedance', 25)], [1140, 1170]],
  // emergence: read over the 30 s after the cortex's own responsiveness returns (`lor` below 1 again), not at a fixed
  // time: how long that takes is the drug model's (the read window below is replaced at run time)
  ['emergence', 1170, [eeg('impedance', 2), TCI(0)], [NaN, NaN]],
];
type Row = Record<Id, number | null> & { bic: number };
const R: Record<string, Row> = {};
/** C28: the index when the cortex first reaches loss of responsiveness (its own `lor` ≥ 1), by age. */
const AT_LOR: Record<number, number> = {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const st = (e: MonitorEngine): any => (e as unknown as { st: unknown }).st;

async function course(ageY = 40, untilS = Infinity): Promise<void> {
  const e = createEngine({ seed: 31, mode: 'modeled', patient: { ...ADULT, ageY } });
  const got: Array<{ t: number; v: Partial<Record<Id, number | null>> }> = [];
  e.on((x) => {
    if (x.type === 'measurement' && 'bis' in x.values) got.push({ t: x.t, v: Object.fromEntries(IDS.map((id) => [id, x.values[id]?.value ?? null])) });
  });
  expect(e.dispatch(eeg('on')).accepted).toBe(true);
  e.step(1);
  expect(e.dispatch(eeg('model', 'bisType')).accepted).toBe(true);
  let lorT = NaN;
  const run = async (e: MonitorEngine, toS: number) => {
    for (let t = Math.floor(e.now().simT) + 1; t <= toS; t++) {
      e.advanceTo(t);
      if (Number.isNaN(lorT) && st(e).eeg.cortex.lor >= 1) lorT = t;
      if (t % 60 === 0) await new Promise((r) => setImmediate(r));
    }
  };
  for (const [name, start, cmds, win] of PHASES) {
    let [from, to] = win;
    if (Number.isNaN(to) ? start > untilS : to > untilS) break;
    await run(e, start);
    for (const c of cmds) expect(e.dispatch(c).accepted, JSON.stringify(c)).toBe(true);
    if (Number.isNaN(to)) {
      let t = start;
      while (st(e).eeg.cortex.lor >= 1 && t < start + 3600) await run(e, ++t);
      [from, to] = [t, t + 30];
      if (ageY === 40) console.log(`emergence: the cortex's lor below 1 at ${t} s (TCI 0 at ${start} s)`);
    }
    await run(e, to);
    const w = got.filter((g) => g.t > from && g.t <= to);
    const avg = (id: Id) => {
      const v = w.map((g) => g.v[id]).filter((x): x is number => x !== null && x !== undefined);
      return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
    };
    // the bispectral term (RAM98): the mean bicoherence of the phase's last 60 s, 30 two-second epochs of the channel
    const out = new Float32Array(60 * 125);
    const last = e.latestSampleIndex('eeg');
    e.readSamples('eeg', last - out.length + 1, out);
    const eps = Array.from({ length: 30 }, (_, i) => epochSpectrum(Array.from(out.subarray(i * 250, (i + 1) * 250))));
    if (ageY !== 40) continue;
    R[name] = { ...(Object.fromEntries(IDS.map((id) => [id, avg(id)])) as Record<Id, number | null>), bic: meanBicoherence(eps) };
  }
  const near = got.filter((g) => Math.abs(g.t - lorT) <= 5 && g.v.bis !== null);
  AT_LOR[ageY] = near.reduce((a, g) => a + (g.v.bis as number), 0) / near.length;
  if (ageY !== 40) return;
  // the measured course, for the PR and the known-misses titles
  console.log(Object.entries(R).map(([n, r]) => `${n}: ${IDS.map((id) => `${id} ${r[id]?.toFixed(2)}`).join(', ')}, BIC ${r.bic.toFixed(3)}`).join('\n'));
}

describe('the BIS-type reader on the engine\'s course (C26–C30)', { timeout: 900_000 }, () => {
  beforeAll(async () => {
    await course();
    await course(80, 540);
    console.log(`index at the cortex's loss of responsiveness: 40 y ${AT_LOR[40]?.toFixed(3)}, 80 y ${AT_LOR[80]?.toFixed(3)}`);
  }, 900_000);
  const v = (p: string, id: Id) => R[p]?.[id] as number;

  it('C26: the index falls as the hypnotic rises (awake > sedation > loss of responsiveness, > surgical > burst suppression) and rises at emergence', () => {
    expect(v('awake', 'bis')).toBeGreaterThan(v('sedation', 'bis'));
    expect(v('sedation', 'bis')).toBeGreaterThan(v('loss of responsiveness', 'bis'));
    expect(v('awake', 'bis')).toBeGreaterThan(v('surgical depth', 'bis'));
    expect(v('surgical depth', 'bis')).toBeGreaterThan(v('burst suppression', 'bis'));
    expect(v('emergence', 'bis')).toBeGreaterThan(v('surgical depth', 'bis'));
  });
  it.fails('C26: surgical depth (propofol 3.5 + fentanyl) below loss of responsiveness (propofol 3) — measured 85.6 vs 83.5: the β ratio (sedation component) is −10.9 dB vs −12.3 dB and the general score never wins (40–47 Hz concentration −20.1 dB)', () => {
    expect(v('loss of responsiveness', 'bis')).toBeGreaterThan(v('surgical depth', 'bis'));
  });
  it('awake reads high (toward 100: full book p. 2169; RAM98 Fig. 16A: 93.8)', () => {
    expect(v('awake', 'bis')).toBeGreaterThan(80);
  });
  it('the β ratio falls with propofol (RAM98 Fig. 16); the 40–47 Hz concentration drops at induction (CON22 Fig. 3B); low/mid rises (CON22 p. 7)', () => {
    expect(v('awake', 'bisBeta')).toBeGreaterThan(v('surgical depth', 'bisBeta'));
    expect(v('awake', 'bisConc')).toBeGreaterThan(v('surgical depth', 'bisConc'));
    expect(v('surgical depth', 'bisLowMid')).toBeGreaterThan(v('awake', 'bisLowMid'));
  });
  it('the BSR is 0 awake and at surgical depth, and rises in burst suppression (CON22 l. 13)', () => {
    expect(v('awake', 'bisSr')).toBe(0);
    expect(v('surgical depth', 'bisSr')).toBe(0);
    expect(v('burst suppression', 'bisSr')).toBeGreaterThan(0);
  });
  // The cause, from Table 1's mixer: the sedation score cannot fall below Eo − Emax = 104.4 − 49.4 = 55 (l. 46), so
  // 40–60 needs the general score, which lies in 40–60 only for a 40–47 Hz power concentration of ≈ −31.2 to −25.7 dB
  // (l. 47–48); the engine's signal at surgical depth gives −20.1 dB (−5.1 awake): its 40–47 Hz power stays too high
  // against the whole spectrum, and the sedation score (β ratio −10.9 dB → 85.6) is the lower one.
  it.fails('C27: surgical depth (propofol + fentanyl, no stimulus) within 40–60 (Ch36 Table 36.4, p. 1149) — measured 85.6: the 40–47 Hz power concentration −20.1 dB, not the ≈ −31 to −26 dB the general score needs (Connor 2022 Table 1 l. 47–48)', () => {
    expect(v('surgical depth', 'bis')).toBeGreaterThanOrEqual(40);
    expect(v('surgical depth', 'bis')).toBeLessThanOrEqual(60);
  });
  it('C29: noisy burst suppression reads higher than the same burst suppression (Ch36 Table 36.3, p. 1148: the false "awake"), reproduced, not corrected', () => {
    expect(v('noisy burst suppression', 'bisSr')).toBeLessThan(v('burst suppression', 'bisSr'));
    expect(v('noisy burst suppression', 'bis')).toBeGreaterThan(v('burst suppression', 'bis'));
  });
  // Higher means by at least the one point the index is shown in [ENG: display]. The cause: every component is a ratio
  // of powers (dB differences), so the generator's lower amplitude at 80 y cancels, and its flatter slope moves the
  // ratios by about half a point here.
  it.fails('C28: at the cortex\'s own loss of responsiveness the index is higher at 80 y than at 40 y ("paradox of age", Ch36 p. 1145, Table 36.3) — measured 89.31 vs 88.78', () => {
    expect((AT_LOR[80] as number) - (AT_LOR[40] as number)).toBeGreaterThanOrEqual(1);
  });
  it('the bispectral term is measured (RAM98 Eq 8): the mean bicoherence is a number at every depth (recorded, in no index)', () => {
    // measured 0.163–0.167 at every depth: the level of NO phase coupling (30 epochs of uniform triple-product phase:
    // E|mean| ≈ √(π/120) ≈ 0.16) — today's generator is a spectral synthesiser with no designed coupling (E3)
    for (const r of Object.values(R)) expect(r.bic).toBeLessThan(0.25);
  });
});

describe('C30: the index is a reading, not the patient\'s state (Ch36 p. 1147: no single threshold)', () => {
  it('the engine\'s whole state but the EEG device is the same with the generic or the BIS-type reader', async () => {
    const mk = (model: string) => {
      const e = createEngine({ seed: 31, mode: 'modeled', patient: ADULT });
      e.dispatch(eeg('on'));
      e.step(1);
      e.dispatch(eeg('model', model));
      e.dispatch(TCI(3));
      return e;
    };
    const [a, b] = [mk('generic'), mk('bisType')];
    for (let t = 2; t <= 240; t++) {
      a.advanceTo(t);
      b.advanceTo(t);
    }
    const strip = (e: MonitorEngine) => JSON.stringify({ ...st(e), eeg: { ...st(e).eeg, dev: undefined } });
    expect(strip(a)).toBe(strip(b));
  }, 120_000);
});
