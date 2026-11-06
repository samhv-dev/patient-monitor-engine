// EEG E1 + E2 on the running engine (plan §7 E1 "for every drug arm", §7.2 cells read off the REAL drug bus): each arm
// runs through the drug audit's runner (helpers/drug-arm-runner.ts: 40 y / 70 kg, seed 7, MODELED, sampled every 5 s),
// and at every sample the bus's hypByClass must sum to hypPropEq (1e-12) and the cortex/spectrum computed from the
// committed state must move the way the sources say. The EEG is not wired into the pipeline in this PR (D4: it runs only
// while an EEG device is on, E6), so the test computes it read-only from the state, as a device will.
// O2 delivery is read as the brain's cbfRel: every arm here is ventilated at FiO2 0.5 with a normal Hb (normoxic).
// Yields once per sim-minute (the runner's rule).
import { describe, expect, it } from 'vitest';
import { agentMixOf, cortexInputsOf, cortexStep } from '../../src/l2/eeg/state.ts';
import { bandPower, peakOf, spectrumOf } from '../../src/l2/eeg/spectra.ts';
import type { CortexState, EegSpectrum } from '../../src/types-eeg.ts';
import { d, inf, runArm, V, vap, type Arm } from '../helpers/drug-arm-runner.ts';

interface Sample { t: number; sumErr: number; hypPropEq: number; c: CortexState; s: EegSpectrum }

async function eegArm(arm: Arm): Promise<Sample[]> {
  const out: Sample[] = [];
  let prev: CortexState | undefined;
  let lastT = 0;
  await runArm({
    ...arm,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    each: (st: any, t: number) => {
      const bus = st.pk.bus;
      const h = bus.cns.hypByClass as Record<string, number>;
      const sumErr = Math.abs(Object.values(h).reduce((a, b) => a + b, 0) - bus.cns.hypPropEq);
      const x = cortexInputsOf(bus, { ageY: 40, stimulus: st.neuro.stim.level, antinoc: st.neuro.antinoc, do2Rel: st.organs.brain.cbfRel, tempC: st.resp.temp.tc, macF: st.endo?.cascade?.macF ?? 1 });
      prev = cortexStep(prev, x, t - lastT);
      lastT = t;
      out.push({ t, sumErr, hypPropEq: bus.cns.hypPropEq, c: prev, s: spectrumOf(prev, agentMixOf(x)) });
    },
  });
  return out;
}
const at = (r: Sample[], t: number) => r.find((x) => x.t >= t)!;

describe('EEG cortex on the engine', () => {
  it('every hypnotic arm: hypByClass sums to hypPropEq at every sample; ketamine, midazolam and dexmedetomidine never suppress', async () => {
    const arms: Record<string, Arm> = {
      thiopental: V([d(60, 'thiopental', 4, 'mg/kg')], 600),
      etomidate: V([d(60, 'etomidate', 0.3, 'mg/kg')], 600),
      midazolam: V([d(60, 'midazolam', 0.1, 'mg/kg')], 600),
      ketamine: V([d(60, 'ketamine', 2, 'mg/kg')], 600),
      dexmed: V([d(60, 'dexmedetomidine', 1, 'mcg/kg', { overS: 600 }), inf(660, 'dexmedetomidine', 0.7, 'mcg/kg/h')], 1500),
      mix: V([d(60, 'propofol', 1.5, 'mg/kg'), d(60, 'midazolam', 0.03, 'mg/kg'), d(120, 'ketamine', 0.5, 'mg/kg')], 600),
    };
    for (const [k, arm] of Object.entries(arms)) {
      const r = await eegArm(arm);
      expect(Math.max(...r.map((x) => x.sumErr)), k).toBeLessThan(1e-12);
      if (k !== 'dexmed') expect(Math.max(...r.map((x) => x.hypPropEq)), k).toBeGreaterThan(0.2);
      if (k === 'ketamine' || k === 'midazolam' || k === 'dexmed') expect(Math.max(...r.map((x) => x.c.suppress)), k).toBe(0);
      if (k === 'dexmed') {
        // C17 on the real bus: spindles at the load's peak, no hypnotic equivalent (NN-19c's index half unchanged)
        const peak = r.reduce((a, b) => (b.c.lor > a.c.lor ? b : a));
        expect(peak.c.lor).toBeGreaterThan(0.3);
        expect(peakOf(peak.s, 'spindle').burstiness).toBeGreaterThanOrEqual(0.6);
        expect(Math.max(...r.map((x) => x.hypPropEq))).toBe(0);
      }
    }
  }, 240_000);

  it('C8 on the engine: propofol effect-site TCI 3 µg/mL does not suppress; 6 µg/mL does', async () => {
    const r = await eegArm(V([[60, { type: 'applyEvent', event: { kind: 'tci', drugId: 'propofol', target: 3, mode: 'effect', model: 'eleveld' } }],
      [600, { type: 'applyEvent', event: { kind: 'tci', drugId: 'propofol', target: 6, mode: 'effect', model: 'eleveld' } }]], 1200));
    expect(at(r, 590).c.suppress).toBe(0);
    expect(at(r, 1190).c.suppress).toBeGreaterThan(0);
    expect(peakOf(at(r, 590).s, 'alpha').fHz).toBeGreaterThanOrEqual(10); // C7
  }, 240_000);

  it('C14 on the engine: ketamine 50 mg over 10 min on ≈ 0.7 MAC sevoflurane lowers alpha power, no suppression', async () => {
    const r = await eegArm(V([vap(1, 'sevoflurane', 1.6, 6), d(900, 'ketamine', 50, 'mg', { overS: 600 })], 1500));
    const before = at(r, 895);
    const during = at(r, 1495);
    expect(before.c.hyper).toBeGreaterThan(0.5);
    expect(before.c.hyper).toBeLessThan(0.9);
    expect(during.c.ketDepol).toBeGreaterThan(0);
    expect(bandPower(during.s, 8, 12)).toBeLessThan(bandPower(before.s, 8, 12));
    expect(Math.max(...r.map((x) => x.c.suppress))).toBe(0);
  }, 240_000);
});
