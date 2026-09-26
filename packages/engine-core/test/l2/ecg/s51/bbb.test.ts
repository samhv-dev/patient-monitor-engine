import { describe, expect, it } from 'vitest';
import { fiducialOf } from '../../../../src/l2/ecg/beat-templates.ts';
import { kernelLead, morphBeat, tPeakOf } from '../../../helpers/s5.ts';
import { beatQrs, peaks } from '../../../helpers/s51.ts';

describe('Stage 5.1 bundle-branch block morphology (measured on the waveform)', () => {
  it('RBBB: V1 rSR′ (two positive deflections, tall terminal R′ ≥ 0.6 mV and ≥ 2 r, R′ peak ≥ 80 ms after onset), V6 broad S ≥ 40 ms, QRS ≥ 130 ms', () => {
    const k = morphBeat({ bbb: 'rbbb' });
    const q = beatQrs(k, fiducialOf(k));
    expect(q.ms).toBeGreaterThanOrEqual(130);
    const pos = peaks(k, 'V1', q.on, q.off, 0.05);
    expect(pos.length).toBeGreaterThanOrEqual(2);
    expect(pos.at(-1)!.v).toBeGreaterThanOrEqual(0.6);
    expect(pos.at(-1)!.v).toBeGreaterThanOrEqual(2 * pos[0]!.v);
    expect((pos.at(-1)!.t - q.on) * 1000).toBeGreaterThanOrEqual(80);
    let sMs = 0;
    for (let t = fiducialOf(k); t < q.off + 0.02; t += 0.0005) if (kernelLead(k, 'V6', t) < -0.05) sMs += 0.5;
    expect(sMs).toBeGreaterThanOrEqual(40);
  });

  it('LBBB: V1 broad QS/rS (r < 0.1 mV, one trough ≤ −0.5 mV), V6 notched monophasic R (no q, no S, two peaks), discordant T, QRS ≥ 120 ms', () => {
    const k = morphBeat({ bbb: 'lbbb' });
    const q = beatQrs(k, fiducialOf(k));
    expect(q.ms).toBeGreaterThanOrEqual(120);
    const troughs = peaks(k, 'V1', q.on, q.off, 0.3, -1);
    expect(troughs.length).toBe(1);
    expect(troughs[0]!.v).toBeLessThanOrEqual(-0.5);
    const v1Max = Math.max(...Array.from({ length: 400 }, (_, i) => kernelLead(k, 'V1', q.on + ((q.off - q.on) * i) / 400)));
    expect(v1Max).toBeLessThan(0.1);
    const v6 = Array.from({ length: 400 }, (_, i) => kernelLead(k, 'V6', q.on + ((q.off - q.on) * i) / 400));
    expect(Math.min(...v6)).toBeGreaterThan(-0.1);
    const top = Math.max(...v6);
    expect(peaks(k, 'V6', q.on, q.off, 0.5 * top).length).toBe(2);
    const tp = tPeakOf(k);
    expect(kernelLead(k, 'V1', tp)).toBeGreaterThan(0);
    expect(kernelLead(k, 'V6', tp)).toBeLessThan(0);
  });

  it('normal conduction measures 80–100 ms with the same method', () => {
    const k = morphBeat({});
    const ms = beatQrs(k, fiducialOf(k)).ms;
    expect(ms).toBeGreaterThanOrEqual(80);
    expect(ms).toBeLessThanOrEqual(100);
  });
});
