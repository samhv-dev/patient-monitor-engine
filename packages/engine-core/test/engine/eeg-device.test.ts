// EEG E6 on the engine (plan §7 E6; D6, D8): `device eeg model <id>` (registry ids only, others refused with a
// reason), the chosen device's numerics at its own update interval as `measurement` values with their own ids
// (EegNumericId: sef, mf, eegSr, eegImp — never `di`/`sr`, which stay the present index's), its display on an
// `eegReading` event, and determinism: a follower computes the host's readings from the same commands.
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent, type MonitorEngine } from '../../src/index.ts';
import { EEG_DEVICES } from '../../src/l3/eeg-devices/registry.ts';

const ADULT = { weightKg: 70, heightCm: 170, ageY: 40, sex: 'M' as const };
let k = 0;
const cmd = (c: Record<string, unknown>) => ({ id: `eeg6-${++k}`, issuedBy: 'test', ...c }) as unknown as Command;
const eeg = (action: string, value?: unknown) => cmd({ type: 'device', action: { device: 'eeg', action, ...(value !== undefined ? { value } : {}) } });
const ev = (event: Record<string, unknown>) => cmd({ type: 'applyEvent', event });
const mk = (seed = 31) => createEngine({ seed, mode: 'modeled', patient: ADULT });
const ok = (e: MonitorEngine, c: Command) => expect(e.dispatch(c).accepted, JSON.stringify(c)).toBe(true);
type Meas = Extract<EngineEvent, { type: 'measurement' }>;
type Reading = Extract<EngineEvent, { type: 'eegReading' }>;
function record(e: MonitorEngine) {
  const meas: Meas[] = [];
  const reads: Reading[] = [];
  e.on((x) => {
    if (x.type === 'measurement') meas.push(x);
    if (x.type === 'eegReading') reads.push(x);
  });
  return { meas, reads };
}
async function run(e: MonitorEngine, toS: number): Promise<void> {
  for (let t = Math.floor(e.now().simT) + 1; t <= toS; t++) {
    e.advanceTo(t);
    if (t % 60 === 0) await new Promise((r) => setImmediate(r));
  }
}
const EEG_IDS = ['sef', 'mf', 'eegSr', 'eegImp'];

describe('device eeg model', () => {
  it('the registry has the generic reader; `model` takes a registry id only, while the EEG is on, and says why not', () => {
    expect(Object.keys(EEG_DEVICES)).toEqual(['generic']);
    const e = mk();
    const off = e.dispatch(eeg('model', 'generic'));
    expect(off.accepted).toBe(false);
    expect(off.reason).toMatch(/off/);
    ok(e, eeg('on'));
    e.step(1);
    ok(e, eeg('model', 'generic'));
    for (const [bad, why] of [['bis', /generic/], [3, /generic/], [undefined, /generic/], ['', /generic/]] as const) {
      const r = e.dispatch(eeg('model', bad));
      expect(r.accepted, String(bad)).toBe(false);
      expect(r.reason, String(bad)).toMatch(why);
    }
    expect(e.dispatch(eeg('model', 'bis')).reason).toMatch(/bis/); // names what it refused
  });
});

describe('the generic device on the engine', () => {
  it('publishes sef, mf, eegSr and eegImp once a second from the first full epoch, and an eegReading with its display', async () => {
    const e = mk(43);
    const { meas, reads } = record(e);
    ok(e, eeg('on'));
    await run(e, 30);
    const m = meas.filter((x) => EEG_IDS.some((id) => id in x.values));
    expect(m.length).toBeGreaterThanOrEqual(27);
    for (const x of m) expect(Object.keys(x.values).sort()).toEqual([...EEG_IDS].sort()); // its own event, its own ids
    const dt = m.slice(1).map((x, i) => x.t - (m[i] as Meas).t);
    expect(dt.every((d) => Math.abs(d - 1) < 1e-9)).toBe(true);
    const last = m.at(-1) as Meas;
    expect(last.values.sef?.flag).toBe('valid');
    expect(last.values.sef?.value).toBeGreaterThan(10); // awake
    expect(last.values.sef?.value).toBeLessThan(31);
    expect(last.values.eegSr?.value).toBe(0);
    expect(last.values.eegImp?.value).toBe(2);
    expect(meas.some((x) => 'di' in x.values || 'sr' in x.values)).toBe(false); // the depth monitor is off: no di/sr
    expect(reads.length).toBe(m.length);
    const r = reads.at(-1) as Reading;
    expect(r.model).toBe('generic');
    expect(r.label).toBe('Processed EEG (generic)');
    // the raw display is the channel's samples
    const n = r.display.raw.length;
    const out = new Float32Array(n);
    e.readSamples('eeg', Math.round(r.t * 125) - n, out);
    expect(r.display.raw.map((v) => Math.fround(v))).toEqual(Array.from(out));
    expect(reads.filter((x) => x.display.dsa !== null).length).toBeGreaterThanOrEqual(13);
  }, 60_000);

  it('`device depth` is unchanged beside it: di and sr still published by the present index (D6, D7, Q3)', async () => {
    const go = async (withEeg: boolean) => {
      const e = mk(47);
      const { meas } = record(e);
      ok(e, cmd({ type: 'device', action: { device: 'depth', action: 'on' } }));
      if (withEeg) ok(e, eeg('on'));
      e.advanceTo(5);
      ok(e, ev({ kind: 'tci', drugId: 'propofol', mode: 'effect', target: 4 }));
      await run(e, 90);
      return meas.filter((x) => 'di' in x.values).map((x) => JSON.stringify(x));
    };
    const a = await go(false);
    expect(a.length).toBeGreaterThan(80);
    expect(await go(true)).toEqual(a);
  }, 60_000);

  it('C22 device half: a raised impedance makes every number questionable; C20 device half: diathermy blanks them as invalid', async () => {
    const e = mk(53);
    const { meas } = record(e);
    ok(e, eeg('on'));
    e.step(1);
    await run(e, 10);
    ok(e, eeg('impedance', [9, 2, 2]));
    await run(e, 20);
    const q = meas.filter((x) => 'sef' in x.values).at(-1) as Meas;
    for (const id of EEG_IDS) expect(q.values[id as 'sef']?.flag, id).toBe('questionable');
    expect(q.values.eegImp?.value).toBe(9);
    ok(e, eeg('impedance', 2));
    ok(e, cmd({ type: 'setModifiers', modifiers: { artefact: { electrosurgery: { atS: 30, durationS: 3 } } } }));
    await run(e, 40);
    const at = (t: number) => meas.find((x) => 'sef' in x.values && Math.abs(x.t - t) < 0.5) as Meas;
    expect(at(28).values.sef?.flag).toBe('valid');
    expect(at(32).values.sef).toEqual({ value: null, flag: 'invalid', at: at(32).t });
    expect(at(32).values.eegImp?.flag).toBe('valid'); // the impedance is measured, not read from the EEG
    expect(at(38).values.sef?.flag).toBe('valid');
  }, 60_000);

  it('deterministic (D3): a follower stepping differently publishes the same readings; a snapshot continues them; off removes the device', async () => {
    const script = async (e: MonitorEngine, stepwise: boolean, toS: number) => {
      ok(e, eeg('on'));
      e.advanceTo(3);
      ok(e, ev({ kind: 'tci', drugId: 'propofol', mode: 'effect', target: 5 }));
      if (stepwise) for (let i = 0; i < (toS - 3) * 50; i++) e.step(1);
      else await run(e, toS);
    };
    const host = mk(7);
    const h = record(host);
    await script(host, true, 70);
    const follower = mk(7);
    const f = record(follower);
    await script(follower, false, 70);
    const sig = (r: { meas: Meas[]; reads: Reading[] }) => JSON.stringify([r.meas.filter((x) => 'sef' in x.values), r.reads]);
    expect(sig(f)).toBe(sig(h));
    const b = mk(7);
    await script(b, false, 35);
    const c = mk(7);
    c.restore(JSON.parse(JSON.stringify(b.snapshot())));
    const cr = record(c);
    await run(c, 70);
    const after = (r: { meas: Meas[]; reads: Reading[] }) => JSON.stringify([r.meas.filter((x) => 'sef' in x.values && x.t > 35.5), r.reads.filter((x) => x.t > 35.5)]);
    expect(after(cr)).toBe(after(h));
    ok(c, eeg('off'));
    await run(c, 75);
    expect(cr.meas.filter((x) => 'sef' in x.values && x.t > 71).length).toBe(0);
  }, 120_000);
});
