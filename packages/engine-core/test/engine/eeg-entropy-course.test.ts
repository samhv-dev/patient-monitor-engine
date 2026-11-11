// EEG E8 on the ENGINE'S signal (the course tests; the reader's constructed-input tests are
// test/l3/eeg-devices/entropy.test.ts): one 40-y patient, seed 31, the Entropy reader chosen with `device eeg model
// entropy`, through awake → sedation → loss of responsiveness → surgical depth (propofol + fentanyl, no stimulus) →
// burst suppression → emergence, as the BIS-type course (eeg-bis-course.test.ts); then a sevoflurane + remifentanil arm
// before and after a stimulus (C31). The plan's cells C26–C28 and C31 for Entropy.
// Directions: [VO04] Viertiö-Oja 2004: SE reflects the cortical state (p. 158); RE − SE indicates EMG (p. 158), which the
// frontal signal carries above ≈ 30 Hz and which falls with hypnosis and rises at arousal (pp. 157–158); the range of
// "adequate hypnosis and emergence" lies between 0.5 and 1.0 on the original scale (p. 159). Any index: 100 awake toward
// 0 (full book p. 2169, C26).
// For each phase the test also records the WHY: SE and RE on the original scale and the share of RE's power in
// R_high (32–47 Hz), computed from the engine's own samples with the reader's functions.
// Nothing here is tuned: a miss is an expected failure (it.fails) with its measured value and its cause in the title.
import { beforeAll, describe, expect, it } from 'vitest';
import { createEngine, type Command, type MonitorEngine } from '../../src/index.ts';
import { componentBins, ENTROPY_SPEC, presented, rowsIn, stateResponse, windowSpectra } from '../../src/l3/eeg-devices/entropy.ts';
import { dftOf } from '../../src/l3/eeg-devices/spectral.ts';

const ADULT = { weightKg: 70, heightCm: 170, ageY: 40, sex: 'M' as const };
let k = 0;
const cmd = (c: Record<string, unknown>) => ({ id: `eeg8-${++k}`, issuedBy: 'test', ...c }) as unknown as Command;
const eeg = (action: string, value?: unknown) => cmd({ type: 'device', action: { device: 'eeg', action, ...(value !== undefined ? { value } : {}) } });
const ev = (event: Record<string, unknown>) => cmd({ type: 'applyEvent', event });
const TCI = (target: number) => ev({ kind: 'tci', drugId: 'propofol', mode: 'effect', target });
const ETT = ev({ kind: 'airwayDevice', device: 'ett' });
const VENT = ev({ kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 });
const FENT = ev({ kind: 'drug', drugId: 'fentanyl', dose: 2, unit: 'mcg/kg', route: 'iv' });
const SEVO = (dialPct: number) => ev({ kind: 'vaporiser', agent: 'sevoflurane', dialPct, fgfLpm: 6 });
const REMI = ev({ kind: 'infusion', drugId: 'remifentanil', rate: 0.1, unit: 'mcg/kg/min' });
const STIM = ev({ kind: 'stimulus', intensity: 1 });
const IDS = ['se', 're', 'reSe'] as const;
type Id = (typeof IDS)[number];
const FS = 125;

/** The phases: [name, start s, commands at start, read window [from, to] s]. Effect-site targets settle in ≈ 2–3 min. */
const PHASES: Array<[string, number, Command[], [number, number]]> = [
  ['awake', 0, [], [90, 120]],
  ['sedation', 120, [TCI(1.5)], [300, 330]],
  ['loss of responsiveness', 330, [TCI(3)], [510, 540]],
  ['surgical depth', 540, [ETT, VENT, TCI(3.5), FENT], [780, 810]],
  ['burst suppression', 810, [TCI(8)], [1080, 1110]],
  // emergence: read over the 30 s after the cortex's own responsiveness returns (`lor` below 1 again)
  ['emergence', 1110, [TCI(0)], [NaN, NaN]],
];
type Why = { seOrig: number; reOrig: number; highShare: number; deltaShare: number };
type Row = Record<Id, number | null> & Why;
const R: Record<string, Row> = {};
/** C28: SE when the cortex first reaches loss of responsiveness (its own `lor` ≥ 1), by age. */
const AT_LOR: Record<number, number> = {};
const LOR_WHY: Record<number, Why & { t: number; ageAmp: number; ageSlope: number }> = {};
/** C31: SE and the end-tidal sevoflurane (vol %) before and after the stimulus, and at a lower dial without it. */
const C31: Record<string, { se: number; re: number; et: number; arousal: number }> = {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const st = (e: MonitorEngine): any => (e as unknown as { st: unknown }).st;

/** The reader's own computation on the engine's last 60.16 s of samples: SE, RE (original scale) and R_high's share. */
function why(e: MonitorEngine): Why {
  const K = ENTROPY_SPEC.constants;
  const N = Math.round(FS * K.epochS.value);
  const step = Math.round(FS * K.updateS.value);
  const rowsN = rowsIn(K.seLongS.value);
  const len = N + (rowsN - 1) * step;
  const out = new Float32Array(len);
  e.readSamples('eeg', e.latestSampleIndex('eeg') - len + 1, out);
  const b = componentBins(FS, N);
  const rows = Array.from({ length: rowsN }, (_, j) => {
    const f = dftOf(Array.from(out.subarray(j * step, j * step + N)), b.hi);
    return f.re.map((re, i) => re * re + (f.im[i] as number) ** 2).slice(b.lo, b.hi + 1);
  });
  const { se, re } = windowSpectra(rows, b);
  const o = stateResponse(se, re);
  const tot = re.reduce((a, v) => a + v, 0);
  const lowTot = se.reduce((a, v) => a + v, 0);
  const below4 = Math.ceil(4 * (N / FS)) - b.lo; // R_low's components under 4 Hz (delta and slower, Ch36 Table 36.1)
  return { seOrig: o.se, reOrig: o.re, highShare: re.slice(b.mid - b.lo).reduce((a, v) => a + v, 0) / tot, deltaShare: se.slice(0, below4).reduce((a, v) => a + v, 0) / lowTot };
}

function engine(ageY: number): { e: MonitorEngine; got: Array<{ t: number; v: Partial<Record<Id, number | null>> }> } {
  const e = createEngine({ seed: 31, mode: 'modeled', patient: { ...ADULT, ageY } });
  const got: Array<{ t: number; v: Partial<Record<Id, number | null>> }> = [];
  e.on((x) => {
    if (x.type === 'measurement' && 'se' in x.values) got.push({ t: x.t, v: Object.fromEntries(IDS.map((id) => [id, x.values[id]?.value ?? null])) });
  });
  expect(e.dispatch(eeg('on')).accepted).toBe(true);
  e.step(1);
  expect(e.dispatch(eeg('model', 'entropy')).accepted).toBe(true);
  return { e, got };
}
const mean = (v: number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const avgOf = (got: Array<{ t: number; v: Partial<Record<Id, number | null>> }>, from: number, to: number, id: Id) => {
  const v = got.filter((g) => g.t > from && g.t <= to).map((g) => g.v[id]).filter((x): x is number => x !== null && x !== undefined);
  return v.length ? mean(v) : null;
};

async function course(ageY = 40, untilS = Infinity): Promise<void> {
  const { e, got } = engine(ageY);
  let lorT = NaN;
  const run = async (toS: number) => {
    for (let t = Math.floor(e.now().simT) + 1; t <= toS; t++) {
      e.advanceTo(t);
      if (Number.isNaN(lorT) && st(e).eeg.cortex.lor >= 1) {
        lorT = t;
        LOR_WHY[ageY] = { t, ...why(e), ageAmp: st(e).eeg.cortex.ageAmp, ageSlope: st(e).eeg.cortex.ageSlope };
      }
      if (t % 60 === 0) await new Promise((r) => setImmediate(r));
    }
  };
  for (const [name, start, cmds, win] of PHASES) {
    let [from, to] = win;
    if (Number.isNaN(to) ? start > untilS : to > untilS) break;
    await run(start);
    for (const c of cmds) expect(e.dispatch(c).accepted, JSON.stringify(c)).toBe(true);
    if (Number.isNaN(to)) {
      let t = start;
      while (st(e).eeg.cortex.lor >= 1 && t < start + 3600) await run(++t);
      [from, to] = [t, t + 30];
      if (ageY === 40) console.log(`emergence: the cortex's lor below 1 at ${t} s (TCI 0 at ${start} s)`);
    }
    await run(to);
    if (ageY !== 40) continue;
    R[name] = { ...(Object.fromEntries(IDS.map((id) => [id, avgOf(got, from, to, id)])) as Record<Id, number | null>), ...why(e) };
  }
  // the readings within 5 s of the cortex's own loss of responsiveness (SE's window reaches back 60 s; the same for both ages)
  const near = got.filter((g) => Math.abs(g.t - lorT) <= 5 && g.v.se !== null);
  AT_LOR[ageY] = mean(near.map((g) => g.v.se as number));
  if (ageY !== 40) return;
  console.log(Object.entries(R).map(([n, r]) => `${n}: ${IDS.map((id) => `${id} ${r[id]?.toFixed(1)}`).join(', ')} | SE ${r.seOrig.toFixed(3)} RE ${r.reOrig.toFixed(3)} (original scale), 32–47 Hz share of RE's power ${(100 * r.highShare).toFixed(2)} %, < 4 Hz share of SE's ${(100 * r.deltaShare).toFixed(1)} %`).join('\n'));
}

/** C31: sevoflurane + remifentanil at steady state; SE before and after a standard stimulus; and at a dial 0.3 % lower. */
async function sevoArm(dialPct: number, stimulate: boolean): Promise<void> {
  const { e, got } = engine(40);
  let et = 0;
  e.on((x) => {
    if (x.type === 'measurement' && x.values.etAa?.value != null) et = x.values.etAa.value;
  });
  for (const c of [ETT, VENT, SEVO(dialPct), REMI]) expect(e.dispatch(c).accepted, JSON.stringify(c)).toBe(true);
  const run = async (toS: number) => {
    for (let t = Math.floor(e.now().simT) + 1; t <= toS; t++) {
      e.advanceTo(t);
      if (t % 60 === 0) await new Promise((r) => setImmediate(r));
    }
  };
  await run(900);
  C31[`dial ${dialPct}`] = { se: avgOf(got, 870, 900, 'se') as number, re: avgOf(got, 870, 900, 're') as number, et, arousal: st(e).eeg.cortex.arousal };
  if (!stimulate) return;
  expect(e.dispatch(STIM).accepted).toBe(true);
  // SE's windows reach back 15.36–60.16 s: read once the 60-s window holds only stimulated signal
  await run(990);
  C31[`dial ${dialPct} + stimulus`] = { se: avgOf(got, 960, 990, 'se') as number, re: avgOf(got, 960, 990, 're') as number, et, arousal: st(e).eeg.cortex.arousal };
}

describe('the Entropy reader on the engine\'s course (C26–C28)', { timeout: 900_000 }, () => {
  beforeAll(async () => {
    await course();
    await course(80, 540);
    console.log(`SE at the cortex's loss of responsiveness: 40 y ${AT_LOR[40]?.toFixed(2)}, 80 y ${AT_LOR[80]?.toFixed(2)}`);
    console.log(JSON.stringify(LOR_WHY));
  }, 900_000);
  const v = (p: string, id: Id) => R[p]?.[id] as number;

  it('C26: SE and RE fall as the hypnotic rises (awake > sedation > loss of responsiveness > surgical depth) and rise at emergence', () => {
    for (const id of ['se', 're'] as const) {
      expect(v('awake', id), id).toBeGreaterThan(v('sedation', id));
      expect(v('sedation', id), id).toBeGreaterThan(v('loss of responsiveness', id));
      expect(v('loss of responsiveness', id), id).toBeGreaterThan(v('surgical depth', id));
      expect(v('emergence', id), id).toBeGreaterThan(v('surgical depth', id));
    }
  });
  it('C26: burst suppression reads below surgical depth (toward 0 with no detectable activity, full book p. 2169)', () => {
    expect(v('surgical depth', 'se')).toBeGreaterThan(v('burst suppression', 'se'));
  });
  // The cause, measured: 54 % of SE's R_low power lies below 4 Hz awake (the engine's awake trace carries eye blinks, a
  // large frontal low-frequency deflection, artefacts.ts, P-10), and entropy is low when power gathers in few components
  // (Eqs 3–5). The module rejects blink and eye-movement epochs (VO04 p. 160) by a stationarity test and five
  // characteristics whose rules the paper does not give: not built, so the blinks stay in the spectrum.
  it.fails('awake reads high (toward 100: full book p. 2169): SE above 80 — measured 69 (original 0.757): 54 % of R_low\'s power below 4 Hz; VO04 p. 160\'s blink rejection is not published', () => {
    expect(v('awake', 'se')).toBeGreaterThan(80);
  });
  it('RE − SE, the EMG indicator (p. 158), is larger awake than at surgical depth (EMG falls with hypnosis, pp. 157–158)', () => {
    expect(v('awake', 'reSe')).toBeGreaterThan(v('surgical depth', 'reSe'));
    expect(R.awake!.highShare).toBeGreaterThan(R['surgical depth']!.highShare);
  });
  // The cause, measured: 78 % of SE's R_low power below 4 Hz at the engine's surgical depth (the alpha–delta pattern of
  // E2/E3, C4); the original SE 0.482 sits just under p. 159's 0.5. VO04 names no target range in SE units.
  it.fails('C27 for Entropy: surgical depth (propofol + fentanyl, no stimulus) lies in "adequate hypnosis" — original SE ≥ 0.5 (p. 159) — and below awake — measured 0.482 (SE 29): 78 % of R_low\'s power below 4 Hz', () => {
    // VO04 gives no 40–60-type target; its p. 159 places adequate hypnosis and emergence between 0.5 and 1.0 (F(0.5) = 31)
    expect(R['surgical depth']!.seOrig).toBeGreaterThanOrEqual(0.5);
    expect(v('surgical depth', 'se')).toBeLessThan(v('awake', 'se'));
    expect(v('surgical depth', 'se')).toBeCloseTo(presented(R['surgical depth']!.seOrig), -1); // the test's own computation agrees with the device's
  });
  // The cause, measured at the moment each cortex reaches lor ≥ 1 (80 y at 208 s, on the 1.5 µg/mL step; 40 y at 365 s):
  // R_low's share below 4 Hz is 73 % at 80 y against 61 % at 40 y, although the generator's age slope is flatter (0.83
  // vs 0.94) and its amplitude smaller (0.48 vs 0.82). Not verified here which part of the trace carries the extra slow
  // power (the blinks keep their size at any age, artefacts.ts; the 60-s window reaches back into the awake minutes).
  it.fails('C28: at the cortex\'s own loss of responsiveness SE is higher at 80 y than at 40 y ("paradox of age", Ch36 p. 1145: "entropy measures … tend to be higher in the elderly") — measured 50.5 vs 63.9: R_low\'s share below 4 Hz 73 % vs 61 %', () => {
    expect((AT_LOR[80] as number) - (AT_LOR[40] as number)).toBeGreaterThanOrEqual(1);
  });
});

describe('C31: sevoflurane + remifentanil before and after a standard stimulus (full book Ch23 p. 637: C50 of sevoflurane for SE and RE up ≈ 0.3 vol %)', { timeout: 900_000 }, () => {
  beforeAll(async () => {
    await sevoArm(2.5, true);
    await sevoArm(2.2, false);
    console.log(Object.entries(C31).map(([n, r]) => `${n}: SE ${r.se.toFixed(1)}, RE ${r.re.toFixed(1)}, Et sevoflurane ${r.et.toFixed(2)} %, the cortex's arousal ${r.arousal.toFixed(3)}`).join('\n'));
  }, 900_000);
  // The cause, measured: with remifentanil 0.1 µg/kg/min the engine's cortex takes the stimulus as arousal = stimulus ×
  // (1 − antinociception) (l2/eeg/state.ts) = 0.015, so the EEG does not move (SE 35.7 → 34.2); Heyse (Ch23 p. 637)
  // found the shift with remifentanil present. Lowering the dial so Et falls 1.90 → 1.70 % raises SE 35.7 → 50.0: a
  // 0.3-vol % shift would show as some 20 points. A coupling for the generator's owners (E1), not for the reader.
  it.fails('C31: the stimulus raises SE and RE at the same sevoflurane (the direction of a C50 shifted up) — measured SE 35.7 → 34.2, RE 39.3 → 39.0: the cortex\'s arousal is 0.015 under remifentanil 0.1 µg/kg/min (stimulus × (1 − antinociception))', () => {
    expect(C31['dial 2.5 + stimulus']!.se).toBeGreaterThan(C31['dial 2.5']!.se);
    expect(C31['dial 2.5 + stimulus']!.re).toBeGreaterThan(C31['dial 2.5']!.re);
  });
});
