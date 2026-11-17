// The QRS tone in ventricular fibrillation: the beat detector's tone on coarse fibrillation until the monitor's VF call
// (the VFIB alarm), none after it, none on fine fibrillation. The rhythm is held with `autoAsystole: false` and the seed
// is fixed, so an untreated VF never becomes asystole by the engine's hazard during a test.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { VF_CONFIRM_S } from '../../src/l3/alarms/conditions.ts';
import { qrsToneSounds } from '../../src/l3/qrs-tone.ts';
import type { EngineEvent, MonitorEngine } from '../../src/types.ts';
import { ADULT, cmd } from '../helpers/resp.ts';

type Tone = Extract<EngineEvent, { type: 'tone' }>;
const ONSET = 20;
const END = 50;

const tick = (e: MonitorEngine, to: number) => {
  for (let k = 0; k < 10_000 && e.now().simT < to - 1e-9; k++) e.advanceTo(e.now().simT + 0.02);
};

/** Sinus to ONSET, then `rhythm` held to END: the QRS tones and the time the VFIB alarm was raised. */
function run(rhythm: 'vfCoarse' | 'vfFine', skin = 'saadat-like', analysis?: boolean) {
  const e = createEngine({ seed: 7, patient: ADULT, device: { skin } });
  const ev: EngineEvent[] = [];
  e.on((x) => ev.push(x));
  if (analysis !== undefined) e.dispatch(cmd({ type: 'device', action: { device: 'alarm', action: 'arrhythmiaAnalysis', value: analysis } }));
  tick(e, ONSET);
  e.dispatch(cmd({ type: 'setRhythm', rhythm, opts: { autoAsystole: false } }));
  tick(e, END);
  const tones = ev.filter((x): x is Tone => x.type === 'tone' && x.kind === 'qrs');
  const call = ev.find((x): x is Extract<EngineEvent, { type: 'alarm' }> => x.type === 'alarm' && x.id === 'VFIB' && x.t >= ONSET)?.t;
  return { tones, call };
}

describe('qrsToneSounds', () => {
  it('sounds outside VF, on coarse VF before the call, never at or after it, never on fine VF', () => {
    expect(qrsToneSounds(null, false, 100)).toBe(true);
    expect(qrsToneSounds(10, false, 10 + VF_CONFIRM_S - 0.01)).toBe(true);
    expect(qrsToneSounds(10, false, 10 + VF_CONFIRM_S)).toBe(false);
    expect(qrsToneSounds(10, false, 60)).toBe(false);
    expect(qrsToneSounds(10, true, 10.5)).toBe(false);
  });
});

describe('the QRS tone in ventricular fibrillation', { timeout: 120_000 }, () => {
  it('coarse VF: the detector beeps until the VFIB call, then the tone is silent', () => {
    const { tones, call } = run('vfCoarse');
    expect(call).toBeDefined();
    expect(tones.filter((x) => x.t < ONSET).length).toBeGreaterThan(10); // the sinus before: the tone is on
    expect(tones.filter((x) => (x.refT as number) >= ONSET && (x.refT as number) < (call as number)).length).toBeGreaterThan(0);
    expect(tones.filter((x) => (x.refT as number) >= (call as number))).toEqual([]);
  });

  it('fine VF: no tone from its onset, before the call and after it', () => {
    const { tones, call } = run('vfFine');
    expect(call).toBeDefined();
    expect(tones.filter((x) => (x.refT as number) >= ONSET)).toEqual([]);
  });

  it('arrhythmia analysis off (philips-like, off by default): the VF call still stands, so the tone stops at it', () => {
    const { tones, call } = run('vfCoarse', 'philips-like', false);
    expect(call).toBeDefined();
    expect(tones.filter((x) => (x.refT as number) >= ONSET && (x.refT as number) < (call as number)).length).toBeGreaterThan(0);
    expect(tones.filter((x) => (x.refT as number) >= (call as number))).toEqual([]);
  });
});
