// N109 (brief 186): a follower restores the host's snapshot and replays the host's commands; what it shows must be the
// host's patient, sample for sample. Every random stream that is already running is in the snapshot's state (st.rng,
// the respiration's and the TOF's own streams, a running EEG's synth and artefacts), but a stream that STARTS after the
// restore is seeded from hash(seed, name) (rng/sfc32.ts), so the restored engine must continue under the snapshot's seed,
// not the one it was created with. The EEG switched on after the restore is that case: its `eeg` and `eeg-artefact`
// streams are created at `device eeg on`. The comparison is exact: same samples, same events.
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent, type MonitorEngine, type PatientSnapshot } from '../../src/index.ts';

const ADULT = { weightKg: 70, heightCm: 170, ageY: 40, sex: 'M' as const };
let k = 0;
const cmd = (c: Record<string, unknown>) => ({ id: `n109-${++k}`, issuedBy: 'test', ...c }) as unknown as Command;
const eegOn = () => cmd({ type: 'device', action: { device: 'eeg', action: 'on' } });
const T = 4; // the follower joins at 4 s
const END = 14;

/** Samples of `ch` with absolute indices [from, to]; a restored engine holds only samples after the snapshot's tick
 * (sample T·rate is the host's history, cleared on restore), so every read here starts after T. */
function read(e: MonitorEngine, ch: 'eeg' | 'ecgII' | 'pleth' | 'co2', from: number, to: number): number[] {
  const out = new Float32Array(to - from + 1);
  const n = e.readSamples(ch, from, out);
  return Array.from(out.subarray(0, n));
}

/** The host runs to T; a follower made with `followerSeed` restores its snapshot (through JSON, as over the wire); both
 * then get the same commands, one of which starts a random process after T (the EEG); both run to END. */
function hostAndFollower(followerSeed: number, edit: (s: PatientSnapshot) => PatientSnapshot = (s) => s) {
  const host = createEngine({ seed: 7, mode: 'modeled', patient: ADULT });
  host.advanceTo(T);
  const snap = edit(JSON.parse(JSON.stringify(host.snapshot())) as PatientSnapshot);
  const follower = createEngine({ seed: followerSeed });
  follower.restore(snap);
  const eh: EngineEvent[] = [];
  const ef: EngineEvent[] = [];
  host.on((e) => void eh.push(e));
  follower.on((e) => void ef.push(e));
  for (const e of [host, follower]) e.advanceTo(T + 1);
  const on = eegOn();
  expect(host.dispatch(on).accepted).toBe(true);
  expect(follower.dispatch(on).accepted).toBe(true);
  for (const e of [host, follower]) e.advanceTo(END);
  return { host, follower, eh, ef };
}

describe('N109: a restored engine continues with the snapshot’s seed', () => {
  it('a follower made under the host’s own seed: identical EEG and ECG samples and events after the restore', () => {
    const { host, follower, eh, ef } = hostAndFollower(7);
    const eegTo = END * 125;
    expect(host.latestSampleIndex('eeg')).toBe(eegTo);
    expect(read(follower, 'eeg', (T + 1) * 125, eegTo)).toEqual(read(host, 'eeg', (T + 1) * 125, eegTo));
    expect(read(follower, 'ecgII', T * 500 + 1, END * 500)).toEqual(read(host, 'ecgII', T * 500 + 1, END * 500));
    expect(ef).toEqual(eh);
  });

  it('a follower made under a DIFFERENT seed: the same, value for value (failed before: the EEG drew from the follower’s seed)', () => {
    const { host, follower, eh, ef } = hostAndFollower(99);
    const eegTo = END * 125;
    expect(follower.latestSampleIndex('eeg')).toBe(eegTo);
    expect(read(follower, 'eeg', (T + 1) * 125, eegTo)).toEqual(read(host, 'eeg', (T + 1) * 125, eegTo));
    expect(read(follower, 'ecgII', T * 500 + 1, END * 500)).toEqual(read(host, 'ecgII', T * 500 + 1, END * 500));
    expect(read(follower, 'pleth', T * 125 + 1, END * 125)).toEqual(read(host, 'pleth', T * 125 + 1, END * 125));
    expect(ef).toEqual(eh);
  });

  it('the follower’s own snapshot carries the host’s seed, so a follower of the follower is the host’s patient too', () => {
    const { host, follower } = hostAndFollower(99);
    expect(follower.snapshot().seed).toBe(7);
    const second = createEngine({ seed: 3 });
    second.restore(JSON.parse(JSON.stringify(follower.snapshot())) as PatientSnapshot);
    const on2 = cmd({ type: 'device', action: { device: 'eeg', action: 'off' } });
    expect(host.dispatch(on2).accepted).toBe(true);
    expect(second.dispatch(on2).accepted).toBe(true);
    const again = eegOn();
    expect(host.dispatch(again).accepted).toBe(true);
    expect(second.dispatch(again).accepted).toBe(true);
    host.advanceTo(END + 6);
    second.advanceTo(END + 6);
    expect(read(second, 'eeg', (END + 1) * 125, (END + 6) * 125)).toEqual(read(host, 'eeg', (END + 1) * 125, (END + 6) * 125));
  });

  it('a snapshot without a usable seed still restores and keeps the restoring engine’s seed (it cannot know the host’s)', () => {
    const drop = (s: PatientSnapshot) => {
      const { seed: _seed, ...rest } = s;
      return rest as unknown as PatientSnapshot;
    };
    const keep = hostAndFollower(99, drop); // no seed: the follower's own 99
    const same = hostAndFollower(99, (s) => ({ ...s, seed: 99 })); // the snapshot names 99: the same continuation
    expect(keep.follower.snapshot().seed).toBe(99);
    expect(read(keep.follower, 'eeg', (T + 1) * 125, END * 125)).toEqual(read(same.follower, 'eeg', (T + 1) * 125, END * 125));
    for (const bad of [-1, 1.5, Number.NaN, 2 ** 32, '7']) {
      const e = createEngine({ seed: 5 });
      const s = { ...createEngine({ seed: 7 }).snapshot(), seed: bad as unknown as number };
      expect(() => e.restore(s)).not.toThrow();
      expect(e.snapshot().seed).toBe(5);
    }
  });
});
