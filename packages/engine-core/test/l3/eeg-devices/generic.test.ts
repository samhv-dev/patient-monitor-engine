// EEG E5 (plan §7 E5, D8): the generic processed-EEG reader — everything Miller publishes a monitor shows — read from the
// samples, the sample rate and the electrode impedance only. The shared spectral module (spectral.ts) is checked
// against known signals; the reader against generated EEG (l2/eeg: the test may use the generator, the reader may
// not) and against constructed signals. Acceptance cells C23–C25 (plan §7.2) and the device halves of C20 and C22.
import { describe, expect, it } from 'vitest';
import { artefactSample, createArtefacts, emgLevel, type ArtefactInputs } from '../../../src/l2/eeg/artefacts.ts';
import { agentMixOf, cortexStep } from '../../../src/l2/eeg/state.ts';
import { spectrumOf } from '../../../src/l2/eeg/spectra.ts';
import { createSynth, synthNext } from '../../../src/l2/eeg/synth.ts';
import { createGeneric, genericRead, GENERIC_SPEC } from '../../../src/l3/eeg-devices/generic.ts';
import { bandPower, edgeFrequency, psdOf } from '../../../src/l3/eeg-devices/spectral.ts';
import { seedStream } from '../../../src/rng/sfc32.ts';
import type { CortexInputs, EegReading, EegSpectrum } from '../../../src/types-eeg.ts';

const FS = 125;
const C = GENERIC_SPEC.constants;
const GOOD = [2, 2, 2];
const H0 = { gabaIv: 0, barbiturate: 0, etomidate: 0, benzo: 0, dissociative: 0 };
const M0 = { sevoflurane: 0, isoflurane: 0, desflurane: 0, n2o: 0 };
const inp = (p: Partial<CortexInputs> = {}): CortexInputs => ({ ageY: 40, alpha2Eq: 0, opioidFentEq: 0, stimulus: 0, antinoc: 0, do2Rel: 1, tempC: 37, hyp: H0, mac: M0, ...p });
const sp = (p: Partial<CortexInputs> = {}): EegSpectrum => { const x = inp(p); return spectrumOf(cortexStep(undefined, x, 1), agentMixOf(x)); };
const AWAKE = sp();
const GA = sp({ hyp: { ...H0, gabaIv: 3500 } }); // propofol 3.5 µg/mL
/** `seconds` of the generator's brain signal for a constant spectrum. */
function brain(spec: EegSpectrum, seconds: number, seed = 11): number[] {
  const s = createSynth(seedStream(seed, 'eeg'), FS, spec);
  return Array.from({ length: seconds * FS }, () => synthNext(s, () => spec));
}
/** The artefacts the engine adds, for constant inputs (l2/eeg/artefacts.ts). */
function arte(seconds: number, x: Partial<ArtefactInputs>, seed = 5): number[] {
  const a = createArtefacts(seedStream(seed, 'eeg-artefact'), FS);
  const base: ArtefactInputs = { tS: 0, t1: 1, lor: 0, arousal: 0, tube: false, electrosurgery: null, mains: 0, mainsHz: 50, impedanceKOhm: GOOD, ecgPickup: false, ecgMv: 0, ...x };
  return Array.from({ length: seconds * FS }, (_, n) => artefactSample(a, { ...base, tS: n / FS }));
}
const add = (a: number[], b: number[]) => a.map((v, i) => v + (b[i] as number));
/** Every reading of `x`, read in blocks of `block` samples (the engine hands the reader each pass's new samples). */
function readAll(x: number[], z: readonly number[] = GOOD, block = 7): EegReading[] {
  const s = createGeneric(FS);
  const out: EegReading[] = [];
  for (let i = 0; i < x.length; i += block) out.push(...genericRead(s, x.slice(i, i + block), z));
  return out;
}
const sine = (seconds: number, hz: number, uv: number) => Array.from({ length: seconds * FS }, (_, n) => uv * Math.sin((2 * Math.PI * hz * n) / FS));
const median = (v: number[]) => { const a = [...v].sort((p, q) => p - q); return a[Math.floor(a.length / 2)] as number; };
const num = (r: EegReading, k: 'sef' | 'mf' | 'eegSr' | 'eegImp') => r.numerics[k] as number;

describe('spectral.ts: the shared periodogram', () => {
  it('a 10 Hz sine of 20 µV: the peak at 10 Hz and the power 200 µV² (Parseval, Hann window) within 5 %', () => {
    const x = sine(2, 10, 20);
    const psd = psdOf(x, FS);
    const df = FS / x.length;
    expect(df).toBe(0.5); // a 2-s epoch resolves 0.5 Hz
    expect(psd.length).toBe(x.length / 2 + 1);
    expect(psd.indexOf(Math.max(...psd)) * df).toBe(10);
    expect(Math.abs(bandPower(psd, df, 0, 62.6) / 200 - 1)).toBeLessThan(0.05);
  });
  it('the edge frequency: 95 % of a flat spectrum over 0.5–30 Hz lies below ≈ 28.5 Hz; the median of it ≈ 15.25 Hz', () => {
    const psd = new Array<number>(126).fill(1);
    expect(edgeFrequency(psd, 0.5, 0.5, 30, 0.95)).toBeCloseTo(0.5 + 0.95 * 29.5, 0);
    expect(edgeFrequency(psd, 0.5, 0.5, 30, 0.5)).toBeCloseTo(0.5 + 0.5 * 29.5, 0);
  });
});

describe('the generic reader: the spec row (D8)', () => {
  it('every constant carries its tag ([TXT …], [ENG: device], [P-n …] or [INF …]) and a unit; the label says what it is', () => {
    expect(GENERIC_SPEC.id).toBe('generic');
    expect(GENERIC_SPEC.label).toBe('Processed EEG (generic)');
    expect(Object.keys(C).length).toBeGreaterThanOrEqual(15);
    for (const [k, c] of Object.entries(C)) {
      expect(c.tag, k).toMatch(/^\[(TXT|ENG|INF|P-\d+)[^\]]*\]/);
      expect(Number.isFinite(c.value), k).toBe(true);
      expect(c.unit.length, k).toBeGreaterThan(0);
    }
    expect(C.sefFraction.tag).toMatch(/P-14/); // the owner's placeholder, default 95 %
    expect(C.sefFraction.value).toBe(0.95);
    expect(C.suppressionUv.value).toBe(5); // Ch36 p. 1139
    expect(C.suppressionMinS.value).toBe(0.5); // P-8, research/43
    expect(C.impedanceLimitKOhm.value).toBe(5); // P-13 plan default
    expect(GENERIC_SPEC.updateS).toBe(1); // plan E6: the generic reader 1 s [ENG: device]
  });
});

describe('C24 displays: raw 5–10 s, spectrogram ≈ 1 h of 0–50 Hz in 2-s epochs (Ch36 pp. 1137–1139; Ch35 p. 1106)', () => {
  it('one reading a second after the first full epoch; each carries that second\'s raw samples; a spectrogram column every 2 s, 0–50 Hz', () => {
    const x = brain(AWAKE, 20);
    const rs = readAll(x);
    expect(rs.length).toBe(20 - 2 + 1); // the first full 2-s epoch at 2 s, then every second
    expect(rs.map((r) => r.n)).toEqual(rs.map((_, i) => (i + 2) * FS));
    expect(rs.slice(1).every((r) => r.display.raw.length === FS)).toBe(true);
    expect(rs.slice(1).flatMap((r) => r.display.raw)).toEqual(x.slice(2 * FS)); // the raw trace is the samples, unaltered
    const cols = rs.filter((r) => r.display.dsa !== null);
    expect(cols.map((r) => r.n / FS)).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20]);
    const col = cols[0]?.display.dsa;
    expect(col?.dfHz).toBe(0.5);
    expect(col?.db.length).toBe(50 / 0.5 + 1); // 0, 0.5 … 50 Hz
    expect(C.rawWindowS.value).toBeGreaterThanOrEqual(5);
    expect(C.rawWindowS.value).toBeLessThanOrEqual(10);
    expect(C.dsaHistoryS.value).toBe(3600);
    expect(C.epochS.value).toBe(2);
    expect(C.dsaMaxHz.value).toBe(50);
  });
});

describe('numerics: SEF, median frequency, band powers (Table 36.1)', () => {
  it('awake → propofol 3.5 µg/mL: SEF and median frequency fall; delta and alpha power rise, beta–gamma falls (direction)', () => {
    const last = (spec: EegSpectrum) => readAll(brain(spec, 60)).slice(-20);
    const a = last(AWAKE);
    const g = last(GA);
    const m = (rs: EegReading[], f: (r: EegReading) => number) => median(rs.map(f));
    expect(m(g, (r) => num(r, 'sef'))).toBeLessThan(m(a, (r) => num(r, 'sef')) - 5);
    expect(m(g, (r) => num(r, 'mf'))).toBeLessThan(m(a, (r) => num(r, 'mf')));
    expect(m(g, (r) => r.bands.delta)).toBeGreaterThan(3 * m(a, (r) => r.bands.delta));
    expect(m(g, (r) => r.bands.alpha)).toBeGreaterThan(m(a, (r) => r.bands.alpha));
    expect(m(g, (r) => r.bands.gamma)).toBeLessThan(m(a, (r) => r.bands.gamma));
    for (const r of [...a, ...g]) expect(Object.keys(r.bands).sort()).toEqual(['alpha', 'beta', 'delta', 'gamma', 'slow', 'theta']);
  });
});

describe('C23: awake with blinks, the SEF is disturbed by eye movement (Ch36 p. 1146)', () => {
  it('the same brain and EMG, with and without the blinks: the SEF falls and scatters with them (direction)', () => {
    const b = brain(AWAKE, 120, 13);
    // Both arms draw the artefact stream identically (fixed draws per sample), so the EMG noise is the same sample for
    // sample; arm 1 is awake (lor 0: blinks, EMG 0.2 of full); arm 2 holds the same EMG drive through arousal (0.5·0.4)
    // at lor 1, where no blink starts. Only the blinks differ.
    const withBlinks = arte(120, { lor: 0, arousal: 0 });
    const without = arte(120, { lor: 1, arousal: 0.4 });
    expect(emgLevel({ t1: 1, lor: 0, arousal: 0, tube: false })).toBeCloseTo(emgLevel({ t1: 1, lor: 1, arousal: 0.4, tube: false }), 12);
    const blinks = withBlinks.map((v, i) => v - (without[i] as number));
    expect(Math.max(...blinks)).toBeGreaterThan(40); // the blinks are there
    const sefOf = (x: number[]) => readAll(x).slice(10).map((r) => num(r, 'sef'));
    const s1 = sefOf(add(b, withBlinks));
    const s0 = sefOf(add(b, without));
    const sd = (v: number[]) => { const mu = v.reduce((p, q) => p + q, 0) / v.length; return Math.sqrt(v.reduce((p, q) => p + (q - mu) ** 2, 0) / v.length); };
    console.log(`[C23] SEF median ${median(s0).toFixed(1)} → ${median(s1).toFixed(1)} Hz with blinks; SD ${sd(s0).toFixed(2)} → ${sd(s1).toFixed(2)} Hz`);
    expect(median(s1)).toBeLessThan(median(s0) - 1);
    expect(sd(s1)).toBeGreaterThan(sd(s0));
  });
});

describe('C25: the suppression ratio over 30–60 s, < 5 µV for ≥ 0.5 s (Ch36 pp. 1139–1140; Ch35 p. 1106; P-8)', () => {
  it('SR is the time truly suppressed in its window (the generator\'s own gate) within 3 points; targeted (p 0.65) it reads 50–80 %', () => {
    // The generator's bursts (mean 3.58 s) leave only a few cycles in 60 s, so the SIGNAL's suppressed fraction itself
    // wanders from window to window; the reader is judged against that, reading by reading.
    for (const p of [0.5, 0.65, 0.8]) {
      const spec: EegSpectrum = { ...GA, suppression: { ...GA.suppression, p } };
      const s = createSynth(seedStream(17, 'eeg'), FS, spec);
      const g = createGeneric(FS);
      const gate: number[] = [];
      const sr: number[] = [];
      const diff: number[] = [];
      for (let n = 0; n < 300 * FS; n++) {
        const v = synthNext(s, () => spec);
        gate.push(s.bs.on ? 0 : 1);
        for (const r of genericRead(g, [v], GOOD)) {
          if (r.n < 60 * FS) continue;
          const truth = (100 * gate.slice(-60 * FS).reduce((a, b) => a + b, 0)) / (60 * FS);
          sr.push(num(r, 'eegSr'));
          diff.push(num(r, 'eegSr') - truth);
        }
      }
      console.log(`[C25] p ${p}: SR median ${median(sr)} % (${Math.min(...sr)}–${Math.max(...sr)}); SR − true suppressed % ${Math.min(...diff).toFixed(1)} to ${Math.max(...diff).toFixed(1)}`);
      expect(Math.max(...diff.map(Math.abs)), `p ${p}`).toBeLessThanOrEqual(3);
      if (p === 0.65) {
        expect(median(sr)).toBeGreaterThanOrEqual(50);
        expect(median(sr)).toBeLessThanOrEqual(80);
      }
    }
  });
  it('the window: 60 s of silence then activity — SR is 100, falls steadily, still > 0 at 30 s and 0 by 61 s', () => {
    const x = [...new Array<number>(90 * FS).fill(0), ...sine(90, 10, 20)];
    const rs = readAll(x);
    const at = (s: number) => num(rs.find((r) => r.n === s * FS) as EegReading, 'eegSr');
    expect(at(90)).toBe(100);
    expect(at(120)).toBeGreaterThan(30);
    expect(at(120)).toBeLessThan(70);
    expect(at(151)).toBe(0);
  });
  it('the criterion: < 5 µV counts, ≥ 5 µV does not; a quiet stretch counts only from 0.5 s', () => {
    const sr = (x: number[]) => num(readAll(x).at(-1) as EegReading, 'eegSr');
    expect(sr(sine(70, 10, 4.9))).toBe(100); // |x| < 5 µV throughout
    expect(sr(sine(70, 10, 6))).toBe(0); // the quiet parts of each cycle are 0.03 s
    const gaps = (quietS: number) => Array.from({ length: 70 * FS }, (_, n) => ((n % Math.round((quietS + 0.1) * FS)) < quietS * FS ? 0 : 30));
    expect(sr(gaps(0.4))).toBe(0);
    const s6 = sr(gaps(0.6));
    expect(s6).toBeGreaterThan(75); // 0.6 of every 0.7 s
    expect(s6).toBeLessThan(90);
  });
});

describe('flags: questionable (impedance), invalid (electrocautery, detected from the signal)', () => {
  it('C22: over the limit (P-13, 5 kΩ) or unequal → questionable; the impedance is published', () => {
    const x = brain(AWAKE, 5);
    const flag = (z: number[]) => (readAll(x, z).at(-1) as EegReading).flags;
    expect(flag([2, 2, 2])).toEqual({ questionable: false, invalid: false });
    expect(flag([4.9, 4.9, 4.9]).questionable).toBe(false);
    expect(flag([9, 9, 9]).questionable).toBe(true);
    expect(flag([4.5, 1, 1]).questionable).toBe(true); // unequal
    expect(num(readAll(x, [9, 2, 2]).at(-1) as EegReading, 'eegImp')).toBe(9);
  });
  it('C20: a diathermy burst marks its epochs invalid and blanks the numbers; the most EMG the generator makes does not', () => {
    const b = brain(AWAKE, 40);
    const dia = arte(40, { t1: 0, electrosurgery: { atS: 20, durationS: 3 } as ArtefactInputs['electrosurgery'] });
    const rs = readAll(add(b, dia));
    const bad = rs.filter((r) => r.flags.invalid).map((r) => r.n / FS);
    expect(bad).toEqual([21, 22, 23, 24]); // every epoch touching 20–23 s
    for (const r of rs.filter((q) => q.flags.invalid)) {
      expect(r.numerics.sef).toBeNull();
      expect(r.numerics.mf).toBeNull();
      expect(r.numerics.eegSr).toBeNull();
    }
    expect(num(rs.at(-1) as EegReading, 'sef')).toBeGreaterThan(10); // after the burst the reading returns
    const emg = arte(60, { t1: 1, lor: 0, arousal: 1, tube: true }); // full drive: emergence, tube, arousal
    expect(readAll(add(brain(AWAKE, 60), emg)).some((r) => r.flags.invalid)).toBe(false);
  });
});
