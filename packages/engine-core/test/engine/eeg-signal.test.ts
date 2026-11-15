// EEG E3/E4 on the running engine (plan §7 E3, E4; D2–D5): the `eeg` channel at 125 Hz exists only while an EEG device
// is on; its samples follow from the seed and the commands alone (a follower computes the host's samples, nothing
// crosses the wire); the physiology is the same with it on or off (it only reads); the artefacts read the ECG model's
// artefact state (diathermy) and the engine's own heart (ECG pickup), the EMG the neuromuscular block (C18).
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent, type MonitorEngine } from '../../src/index.ts';
import { projectLead } from '../../src/l2/ecg/vcg.ts';
import { ECG_PICKUP_UV_PER_MV } from '../../src/l2/eeg/artefacts.ts';
import { band, db, rms, welch } from '../helpers/eeg-welch.ts';

const ADULT = { weightKg: 70, heightCm: 170, ageY: 40, sex: 'M' as const };
let k = 0;
const cmd = (c: Record<string, unknown>) => ({ id: `eeg3-${++k}`, issuedBy: 'test', ...c }) as unknown as Command;
const eeg = (action: string, value?: unknown) => cmd({ type: 'device', action: { device: 'eeg', action, ...(value !== undefined ? { value } : {}) } });
const ev = (event: Record<string, unknown>) => cmd({ type: 'applyEvent', event });
const mk = (seed = 31) => createEngine({ seed, mode: 'modeled', patient: ADULT });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const st = (e: MonitorEngine): any => (e as unknown as { st: unknown }).st;
const ok = (e: MonitorEngine, c: Command) => expect(e.dispatch(c).accepted, JSON.stringify(c)).toBe(true);
/** Samples of `ch` with absolute indices [from, to]. */
function read(e: MonitorEngine, ch: 'eeg' | 'vcgX' | 'vcgY' | 'vcgZ', from: number, to: number): number[] {
  const out = new Float32Array(to - from + 1);
  const n = e.readSamples(ch, from, out);
  return Array.from(out.subarray(0, n));
}
async function run(e: MonitorEngine, toS: number): Promise<void> {
  for (let t = Math.floor(e.now().simT) + 1; t <= toS; t++) {
    e.advanceTo(t);
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
}

describe('EEG channel on the engine', () => {
  it('off by default: no channel, nothing in the state; on: 125 Hz samples; off: the channel is gone (D4)', async () => {
    const e = mk();
    await run(e, 5);
    expect(e.latestSampleIndex('eeg')).toBe(-1);
    expect('eeg' in st(e)).toBe(false);
    expect(e.sampleRate('eeg')).toBe(125);
    ok(e, eeg('on'));
    await run(e, 25);
    expect(e.latestSampleIndex('eeg')).toBe(25 * 125);
    const x = read(e, 'eeg', 6 * 125, 25 * 125);
    expect(x.every(Number.isFinite)).toBe(true);
    expect(rms(x)).toBeGreaterThan(4); // awake EEG + EMG + blinks, µV
    expect(rms(x)).toBeLessThan(30);
    ok(e, eeg('off'));
    await run(e, 26);
    expect(e.latestSampleIndex('eeg')).toBe(-1);
    expect('eeg' in st(e)).toBe(false);
  });

  it('commands: on/off, impedance (kΩ, one value or one per electrode), ecgPickup; refused when malformed or while off', () => {
    const e = mk();
    expect(e.dispatch(eeg('impedance', 8)).accepted).toBe(false); // off
    expect(e.dispatch(eeg('model', 'bis')).accepted).toBe(false);
    ok(e, eeg('on'));
    e.step(1);
    for (const bad of [eeg('impedance', -1), eeg('impedance', 'x'), eeg('impedance', [1, 2]), eeg('impedance', Number.NaN), eeg('ecgPickup', 1), eeg('on', 3)]) {
      expect(e.dispatch(bad).accepted, JSON.stringify(bad)).toBe(false);
    }
    ok(e, eeg('impedance', 8));
    ok(e, eeg('impedance', [8, 2, 2]));
    ok(e, eeg('ecgPickup', true));
    e.step(1);
    expect(st(e).eeg.impedanceKOhm).toEqual([8, 2, 2]);
    expect(st(e).eeg.ecgPickup).toBe(true);
  });

  it('deterministic (D3): two engines, same seed, same commands, different stepping → identical samples; a snapshot continues them', async () => {
    const script = async (e: MonitorEngine, stepwise: boolean, toS: number) => {
      ok(e, eeg('on'));
      e.advanceTo(5);
      ok(e, ev({ kind: 'tci', drugId: 'propofol', mode: 'effect', target: 4 }));
      if (stepwise) for (let i = 0; i < (toS - 5) * 50; i++) e.step(1);
      else await run(e, toS);
    };
    const host = mk(7);
    const follower = mk(7);
    await script(host, true, 60);
    await script(follower, false, 60);
    expect(follower.latestSampleIndex('eeg')).toBe(host.latestSampleIndex('eeg'));
    const a = read(host, 'eeg', 0, 60 * 125);
    expect(a.length).toBeGreaterThan(59 * 125);
    expect(read(follower, 'eeg', 0, 60 * 125)).toEqual(a);
    const other = mk(8);
    await script(other, false, 60);
    expect(read(other, 'eeg', 0, 60 * 125)).not.toEqual(a);
    // a bookmark at 30 s restored into a fresh engine continues with the host's samples
    const b = mk(7);
    await script(b, false, 30);
    const snap = b.snapshot();
    const c = mk(7);
    c.restore(JSON.parse(JSON.stringify(snap)));
    await run(c, 60);
    expect(read(c, 'eeg', 30 * 125 + 1, 60 * 125)).toEqual(a.slice(a.length - 30 * 125));
  }, 120_000);

  it('the physiology is the same with the EEG on or off: every event and the whole state but the EEG (D4, D7)', async () => {
    const go = async (withEeg: boolean) => {
      const e = mk(19);
      const evs: EngineEvent[] = [];
      // the EEG device's own output (E6: its readings and its numerics, on their own measurement events) is the EEG's;
      // everything else must be byte-identical
      e.on((x) => {
        if (x.type === 'eegReading') return;
        if (x.type === 'measurement' && Object.keys(x.values).every((id) => ['sef', 'mf', 'eegSr', 'eegImp'].includes(id))) return;
        // E12 (Q9): the state event's `eeg` is the EEG's own (its artefacts' state, for the instructor's sheet)
        if (x.type === 'state' && 'eeg' in x) {
          const { eeg: _eeg, ...rest } = x;
          return void evs.push(rest as EngineEvent);
        }
        evs.push(x);
      });
      if (withEeg) ok(e, eeg('on'));
      e.advanceTo(10);
      ok(e, ev({ kind: 'tci', drugId: 'propofol', mode: 'effect', target: 5 }));
      ok(e, cmd({ type: 'setModifiers', modifiers: { artefact: { electrosurgery: { atS: 40, durationS: 3 } } } }));
      await run(e, 120);
      const s = { ...st(e) };
      delete s.eeg;
      return { evs: JSON.stringify(evs), s: JSON.stringify(s) };
    };
    const off = await go(false);
    const on = await go(true);
    expect(on.evs).toBe(off.evs);
    expect(on.s).toBe(off.s);
  }, 120_000);

  it('C18 on the engine: rocuronium in an awake patient silences the EMG; the EEG stays awake (no alpha) (Ch36 p. 1148)', async () => {
    const e = mk(23);
    ok(e, eeg('on'));
    await run(e, 60);
    const before = welch(read(e, 'eeg', 10 * 125, 60 * 125), 125); // read now: the ring buffer keeps 120 s
    ok(e, ev({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' }));
    await run(e, 200);
    expect(st(e).neuro.last.tof.t1).toBeLessThan(0.05);
    const after = welch(read(e, 'eeg', 150 * 125, 200 * 125), 125);
    expect(db(band(after, 30, 62), band(before, 30, 62))).toBeLessThan(-2); // the EMG's share of 30–62 Hz gone (EMG_AWAKE)
    expect(st(e).eeg.cortex.lor).toBeLessThan(0.5); // awake: no loss of responsiveness, so no frontal alpha
  }, 60_000);

  it('C20 on the engine: one diathermy press appears on the EEG too, power up at all frequencies (D5)', async () => {
    const e = mk(29);
    ok(e, eeg('on'));
    ok(e, ev({ kind: 'drug', drugId: 'rocuronium', dose: 0.6, unit: 'mg/kg', route: 'iv' })); // no EMG, no blinks
    await run(e, 120);
    ok(e, cmd({ type: 'setModifiers', modifiers: { artefact: { electrosurgery: { atS: 125, durationS: 5 } } } }));
    await run(e, 132);
    const before = welch(read(e, 'eeg', 115 * 125, 120 * 125), 125);
    const during = welch(read(e, 'eeg', 125 * 125, 130 * 125), 125);
    during.psd.forEach((p, i) => {
      if ((during.f[i] as number) >= 1) expect(db(p, before.psd[i] as number), `${during.f[i]} Hz`).toBeGreaterThan(6);
    });
  }, 60_000);

  it('C21 on the engine: the ECG pickup is the engine\'s own heart (aVF) × the pickup gain, added to the same brain signal', async () => {
    const go = async (pickup: boolean) => {
      const e = mk(37);
      ok(e, eeg('on'));
      e.step(1); // a setting needs the EEG on (the 'on' applies at the next tick)
      if (pickup) ok(e, eeg('ecgPickup', true));
      await run(e, 30);
      return e;
    };
    const a = await go(false);
    const b = await go(true);
    const from = 10 * 125;
    const to = 30 * 125;
    const d = read(b, 'eeg', from, to).map((v, i) => v - (read(a, 'eeg', from, to)[i] as number));
    const [x, y, z] = (['vcgX', 'vcgY', 'vcgZ'] as const).map((ch) => read(b, ch, 4 * from, 4 * to));
    const avf = d.map((_, i) => projectLead('aVF', x![4 * i] as number, y![4 * i] as number, z![4 * i] as number));
    d.forEach((v, i) => expect(v).toBeCloseTo(ECG_PICKUP_UV_PER_MV * (avf[i] as number), 3));
    expect(Math.max(...d)).toBeGreaterThan(3); // visible spikes
  }, 60_000);

  it('C22 on the engine: a raised electrode impedance adds noise to the trace', async () => {
    const go = async (z?: number) => {
      const e = mk(41);
      ok(e, eeg('on'));
      e.step(1);
      if (z !== undefined) ok(e, eeg('impedance', [z, 2, 2]));
      await run(e, 20);
      return read(e, 'eeg', 5 * 125, 20 * 125);
    };
    const good = await go();
    const bad = await go(15);
    expect(rms(bad.map((v, i) => v - (good[i] as number)))).toBeGreaterThan(1);
  }, 60_000);
});
