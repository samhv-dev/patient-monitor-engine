// @vitest-environment happy-dom
// EEG plan E12, Q9, on the engine: each of the instructor's EEG artefact switches (panel/eeg.ts) sends a command that
// changes the engine's EEG the way the plan specifies (§7 E4, cells C21, C22), and the reader's quality output responds
// where the plan says it does (E5: `questionable` while an electrode is over the limit or they are unequal; the plan
// gives the ECG pickup no flag). Each case runs the SAME seed twice, with and without the switch, so the difference of
// the two traces is the artefact alone (the artefacts draw fixed numbers per sample, artefacts.ts: the brain is the same).
// Measured values are printed (console.log) for the PR and the hand-over; the assertions are the plan's directions.
import { createEngine, type Command, type EngineEvent, type MonitorEngine } from '@pme/engine-core';
import { describe, expect, it } from 'vitest';
import { eegArtefactCmd, LOOSE_ELECTRODE_KOHM } from './eeg.ts';

const FS = 125;
const ADULT = { weightKg: 70, heightCm: 170, ageY: 40, sex: 'M' as const };
let k = 0;
const send = (e: MonitorEngine, c: Record<string, unknown>) => {
  const r = e.dispatch({ id: `q9-${++k}`, issuedBy: 'test', ...c } as unknown as Command);
  expect(r.accepted, `${JSON.stringify(c)}: ${r.reason}`).toBe(true);
};
type Meas = Extract<EngineEvent, { type: 'measurement' }>;
type Reading = Extract<EngineEvent, { type: 'eegReading' }>;

function rig(seed: number) {
  const e = createEngine({ seed, mode: 'modeled', patient: ADULT });
  const meas: Meas[] = [];
  const reads: Reading[] = [];
  e.on((x) => {
    if (x.type === 'measurement' && 'sef' in x.values) meas.push(x);
    if (x.type === 'eegReading') reads.push(x);
  });
  send(e, { type: 'device', action: { device: 'eeg', action: 'on' } });
  e.step(1); // a setting needs the EEG on ('on' applies at the next tick)
  return { e, meas, reads };
}
async function run(e: MonitorEngine, toS: number): Promise<void> {
  for (let t = Math.floor(e.now().simT) + 1; t <= toS; t++) {
    e.advanceTo(t);
    if (t % 30 === 0) await new Promise((r) => setImmediate(r));
  }
}
function read(e: MonitorEngine, fromS: number, toS: number): number[] {
  const out = new Float32Array(Math.round((toS - fromS) * FS));
  const n = e.readSamples('eeg', Math.round(fromS * FS), out);
  return Array.from(out.subarray(0, n));
}
const rms = (x: number[]) => Math.sqrt(x.reduce((a, v) => a + v * v, 0) / x.length);
const minus = (a: number[], b: number[]) => a.map((v, i) => v - (b[i] as number));
const flagsAt = (meas: Meas[], t: number) => meas.find((m) => Math.abs(m.t - t) < 0.5)?.values;

describe("Q9 on the engine: each instructor EEG artefact switch, the signal and the reader's quality", () => {
  it(`Loose electrode (${LOOSE_ELECTRODE_KOHM} kΩ, the others 2): a noisier trace (C22, Ch36 p. 1145), the reader's numbers questionable and the impedance shown; off restores both`, async () => {
    const on = rig(73);
    const off = rig(73);
    await run(on.e, 20);
    await run(off.e, 20);
    send(on.e, eegArtefactCmd.electrode(true));
    await run(on.e, 40);
    await run(off.e, 40);
    const noise = rms(minus(read(on.e, 22, 40), read(off.e, 22, 40)));
    console.log(`[Q9] loose electrode: added noise ${noise.toFixed(1)} µV RMS over a trace of ${rms(read(off.e, 22, 40)).toFixed(1)} µV RMS`);
    expect(noise).toBeGreaterThan(5);
    const q = flagsAt(on.meas, 38);
    for (const id of ['sef', 'mf', 'eegSr', 'eegImp'] as const) expect(q?.[id]?.flag, id).toBe('questionable');
    expect(q?.eegImp?.value).toBe(LOOSE_ELECTRODE_KOHM);
    expect(on.reads.at(-1)?.flags).toEqual({ questionable: true, invalid: false });
    send(on.e, eegArtefactCmd.electrode(false));
    await run(on.e, 50);
    await run(off.e, 50);
    expect(rms(minus(read(on.e, 42, 50), read(off.e, 42, 50)))).toBe(0);
    expect(flagsAt(on.meas, 48)?.eegImp).toMatchObject({ value: 2, flag: 'valid' });
    expect(on.reads.at(-1)?.flags).toEqual({ questionable: false, invalid: false });
  }, 120_000);

  it("ECG pickup: spikes at the engine's own R waves (C21, Ch36 p. 1146), in time with the heart; the reader's numbers stay valid (no pickup flag in the plan)", async () => {
    const on = rig(83);
    const off = rig(83);
    send(on.e, eegArtefactCmd.ecgPickup(true));
    await run(on.e, 20);
    await run(off.e, 20);
    const d = minus(read(on.e, 5, 20), read(off.e, 5, 20));
    // the spikes: the peaks of the difference, one per beat at the engine's heart rate
    const peaks = d.filter((v, i) => v > 3 && v >= (d[i - 1] ?? -Infinity) && v > (d[i + 1] ?? -Infinity)).length;
    console.log(`[Q9] ECG pickup: largest spike ${Math.max(...d).toFixed(1)} µV, ${peaks} spikes over 15 s (${(peaks * 4).toFixed(0)} /min)`);
    expect(Math.max(...d)).toBeGreaterThan(3);
    expect(peaks * 4).toBeGreaterThan(40); // one per heartbeat (the awake adult's sinus rate), not noise
    expect(peaks * 4).toBeLessThan(140);
    expect(on.reads.at(-1)?.flags).toEqual({ questionable: false, invalid: false });
    send(on.e, eegArtefactCmd.ecgPickup(false));
    await run(on.e, 30);
    await run(off.e, 30);
    expect(rms(minus(read(on.e, 22, 30), read(off.e, 22, 30)))).toBe(0);
  }, 120_000);
});
