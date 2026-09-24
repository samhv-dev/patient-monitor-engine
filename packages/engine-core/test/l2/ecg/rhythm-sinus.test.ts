import { describe, expect, it } from 'vitest';
import { K_STRIDE, WAVE, type EcgEvent } from '../../../src/l2/ecg/kernels.ts';
import { diffs, mean, runRhythm, sd } from '../../helpers/rhythm.ts';

const hasWave = (e: EcgEvent, w: number) => e.k.some((v, i) => i % K_STRIDE === 6 && v === w);
function waveOf(e: EcgEvent, w: number): { tau: number; sigRise: number } {
  for (let i = 0; i < e.k.length; i += K_STRIDE) if (e.k[i + 6] === w) return { tau: e.k[i]!, sigRise: e.k[i + 1]! };
  throw new Error('wave not found');
}

describe('rhythm engine: sinus family', () => {
  it('acceptance 1: sinus 60 with HRV off has mean RR 1.000 ± 0.002 s over 60 beats', () => {
    const { beats } = runRhythm('sinus', 70, { hr: 60, mods: { hrvScale: 0 } });
    const rr = diffs(beats.map((b) => b.t)).slice(0, 60);
    expect(rr).toHaveLength(60);
    expect(Math.abs(mean(rr) - 1)).toBeLessThanOrEqual(0.002);
  });

  it('acceptance 2: QT at 60/120/150 bpm is 400/317/295 ms ±5 ms, measured from kernel timing', () => {
    for (const [hr, qt] of [[60, 400], [120, 317], [150, 295]] as const) {
      const { st } = runRhythm('sinus', 10, { hr, mods: { hrvScale: 0 } });
      const qrs = st.events.filter((e) => hasWave(e, WAVE.R));
      const steady = qrs[qrs.length - 2]!;
      const qtMeasured = (waveOf(steady, WAVE.T).tau + 0.11) * 1000; // T end = T peak + 110 ms (seed table)
      expect(Math.abs(qtMeasured - qt)).toBeLessThanOrEqual(5);
    }
  });

  it('acceptance 3: at 150 bpm the P-wave peak falls inside the preceding T wave span', () => {
    const { st } = runRhythm('sinus', 10, { hr: 150, mods: { hrvScale: 0 } });
    const pPeaks = st.events.filter((e) => hasWave(e, WAVE.P)).map((e) => e.t + waveOf(e, WAVE.P).tau);
    const qrs = st.events.filter((e) => hasWave(e, WAVE.R));
    let checked = 0;
    for (const ev of qrs.slice(2, -2)) {
      const T = waveOf(ev, WAVE.T);
      const tStart = ev.t + T.tau - 2.5 * T.sigRise; // T onset
      const tEnd = ev.t + T.tau + 0.11; // T end (= QT)
      const p = pPeaks.find((x) => x > ev.t + 0.1 && x < ev.t + 0.4);
      expect(p).toBeDefined();
      expect(p!).toBeGreaterThan(tStart);
      expect(p!).toBeLessThan(tEnd);
      checked++;
    }
    expect(checked).toBeGreaterThan(10);
  });

  it('sinusBrady and sinusTachy default to 45 and 120 bpm; default HRV gives RR SD 10–60 ms', () => {
    const brady = runRhythm('sinusBrady', 120, { mods: { hrvScale: 0 } });
    expect(60 / mean(diffs(brady.beats.map((b) => b.t)))).toBeCloseTo(45, 6);
    const tachy = runRhythm('sinusTachy', 60, { mods: { hrvScale: 0 } });
    expect(60 / mean(diffs(tachy.beats.map((b) => b.t)))).toBeCloseTo(120, 6);
    const withHrv = runRhythm('sinus', 300, { hr: 60 });
    const s = sd(diffs(withHrv.beats.map((b) => b.t)));
    expect(s).toBeGreaterThan(0.01);
    expect(s).toBeLessThan(0.06);
  });

  it('asystole has no beats and no P waves', () => {
    const { beats, atrial } = runRhythm('asystole', 30);
    expect(beats).toHaveLength(0);
    expect(atrial).toHaveLength(0);
  });

  it('sinus beats carry PR, QRS, QT and k_rhythm 1.0 (brief §4.8)', () => {
    const { beats } = runRhythm('sinus', 10, { hr: 75, mods: { hrvScale: 0 } });
    const b = beats[3]!;
    expect(b.origin).toBe('sinus');
    expect(b.prMs).toBe(184);
    expect(b.qrsMs).toBeGreaterThanOrEqual(70);
    expect(b.qrsMs).toBeLessThanOrEqual(100);
    expect(b.qtMs).toBe(371); // 400 · 0.8^(1/3)
    expect(b.mech).toEqual({ perfused: true, kSV: 1, svMl: 70, lvetMs: 286 });
  });
});
