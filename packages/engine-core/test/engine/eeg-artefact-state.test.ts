// EEG plan E12, the owner's Q9 (docs/plans/stage-eeg-depth-of-anaesthesia.md §10): the instructor switches the EEG's
// artefacts on and off during a case, and the instructor's sheet shows each one's state. The state is the ENGINE's: the
// 1 Hz `state` event carries, while an EEG device is on, the EEG's own settings the instructor switches (`eeg`: the
// device model, the electrode impedances, the ECG pickup flag), assembled at commit as the event's `sensors` are, so a
// Remote and the host read the same. With the EEG off the event has no `eeg` (D4: an engine that never switches it on
// computes and publishes exactly what it did before).
import { describe, expect, it } from 'vitest';
import { createEngine, type Command, type EngineEvent, type MonitorEngine } from '../../src/index.ts';

const ADULT = { weightKg: 70, heightCm: 170, ageY: 40, sex: 'M' as const };
let k = 0;
const cmd = (c: Record<string, unknown>) => ({ id: `eeg12b-${++k}`, issuedBy: 'test', ...c }) as unknown as Command;
const eeg = (action: string, value?: unknown) => cmd({ type: 'device', action: { device: 'eeg', action, ...(value !== undefined ? { value } : {}) } });
const mk = () => createEngine({ seed: 61, mode: 'modeled', patient: ADULT });
const ok = (e: MonitorEngine, c: Command) => expect(e.dispatch(c).accepted, JSON.stringify(c)).toBe(true);
type State = Extract<EngineEvent, { type: 'state' }>;

function states(e: MonitorEngine): State[] {
  const out: State[] = [];
  e.on((x) => {
    if (x.type === 'state') out.push(x);
  });
  return out;
}

describe("the state event carries the EEG's artefact state (Q9)", () => {
  it('absent while the EEG is off; once on, the model, the default impedances, no pickup', () => {
    const e = mk();
    const s = states(e);
    e.advanceTo(3);
    expect(s.length).toBeGreaterThan(0);
    expect(s.every((x) => !('eeg' in x))).toBe(true);
    ok(e, eeg('on'));
    e.advanceTo(6);
    expect(s.at(-1)?.eeg).toEqual({ model: 'generic', impedanceKOhm: [2, 2, 2], ecgPickup: false });
    ok(e, eeg('off'));
    e.advanceTo(9);
    expect('eeg' in (s.at(-1) as State)).toBe(false);
  });

  it('each setting shows in the next state: a loose electrode, the ECG pickup, and each off again', () => {
    const e = mk();
    const s = states(e);
    ok(e, eeg('on'));
    e.advanceTo(2);
    ok(e, eeg('impedance', [2, 2, 20]));
    ok(e, eeg('ecgPickup', true));
    e.advanceTo(5);
    expect(s.at(-1)?.eeg).toEqual({ model: 'generic', impedanceKOhm: [2, 2, 20], ecgPickup: true });
    ok(e, eeg('impedance', 2));
    ok(e, eeg('ecgPickup', false));
    e.advanceTo(8);
    expect(s.at(-1)?.eeg).toEqual({ model: 'generic', impedanceKOhm: [2, 2, 2], ecgPickup: false });
  });

  it('a copy: a later command does not change a state event already published', () => {
    const e = mk();
    const s = states(e);
    ok(e, eeg('on'));
    e.advanceTo(2);
    ok(e, eeg('impedance', [2, 2, 20]));
    e.advanceTo(4);
    const was = s.at(-1) as State;
    ok(e, eeg('impedance', 2));
    e.advanceTo(6);
    expect(was.eeg?.impedanceKOhm).toEqual([2, 2, 20]);
  });
});
