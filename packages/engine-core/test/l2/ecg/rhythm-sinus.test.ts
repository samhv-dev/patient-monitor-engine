import { describe, expect, it } from 'vitest';
import { tangentTEnd } from '../../helpers/qt.ts';
import { diffs, mean, runRhythm, sd } from '../../helpers/rhythm.ts';

describe('rhythm engine: sinus family', () => {
  it('acceptance 1: sinus 60 with HRV off has mean RR 1.000 ± 0.002 s over 60 beats', () => {
    const { beats } = runRhythm('sinus', 70, { hr: 60, mods: { hrvScale: 0 } });
    const rr = diffs(beats.map((b) => b.t)).slice(0, 60);
    expect(rr).toHaveLength(60);
    expect(Math.abs(mean(rr) - 1)).toBeLessThanOrEqual(0.002);
  });

  it('acceptance 2: QT at 60/120/150 bpm is 400/317/295 ms ±10 ms, measured on the lead-II waveform (tangent method)', () => {
    for (const [hr, qt] of [[60, 400], [120, 317], [150, 295]] as const) {
      const { st, beats } = runRhythm('sinus', 10, { hr, mods: { hrvScale: 0 } });
      const b = beats[beats.length - 4]!;
      const onset = b.t - 0.04; // QRS onset = R fiducial − 40 ms (seed table R τ)
      const { end } = tangentTEnd(st.events, onset, Math.min(0.6, (0.8 * 60) / hr));
      expect(Math.abs((end - onset) * 1000 - qt)).toBeLessThanOrEqual(10);
    }
  });

  it('acceptance 3 (ruling R16): at 160 bpm the P-wave onset falls inside the preceding T wave (after its peak, before its tangent end)', () => {
    const { st, beats, atrial } = runRhythm('sinus', 10, { hr: 160, mods: { hrvScale: 0 } });
    let checked = 0;
    for (const b of beats.slice(3, -3)) {
      const onset = b.t - 0.04;
      const { peak, end } = tangentTEnd(st.events, onset, 0.32);
      const pOnset = atrial.find((a) => a.kind === 'p' && a.t > onset + 0.1)!.t; // the P kernel starts at the atrial event
      expect(pOnset).toBeGreaterThan(peak);
      expect(pOnset).toBeLessThan(end);
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
    expect(b.prMs).toBe(154); // PR60 160 − 0.4·15 (ruling R16)
    expect(b.qrsMs).toBeGreaterThanOrEqual(70);
    expect(b.qrsMs).toBeLessThanOrEqual(100);
    expect(b.qtMs).toBe(371); // 400 · 0.8^(1/3)
    expect(b.mech).toEqual({ perfused: true, kSV: 1, svMl: 70, lvetMs: 286 });
  });
});
