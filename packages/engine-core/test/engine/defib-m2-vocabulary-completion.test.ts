// Defibrillator plan E0b (docs/plans/defibrillator-zoll-m2.md §6 E0b): the vocabulary E0 froze, completed. The new
// `device defib` commands are cased with E0's in defib-m2-vocabulary.test.ts (valid, invalid, no-op, refused off the
// M2); here: the connection state E0 lacked (the therapy cable's kind, where the paddles are while off the patient) in
// the status, the snapshot and on a follower; the bedside monitor's two declared actions; the package's exports. Pages
// are the guide's printed pages, [G n-m] (ZOLL M2 Operator's Guide, REF 9650-000873-01 Rev. C).
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import * as entry from '../../src/index.ts';
import { MSG, messagePriority } from '../../src/l3/defib-pacer/connections.ts';
import { M2_IDLE_STATUS } from '../../src/l3/defib-pacer/m2-vocabulary.ts';
import type { Command, EngineEvent, MonitorEngine } from '../../src/types.ts';
import { cmd, devRig, setDefibModel } from '../helpers/device.ts';

type Status = Extract<EngineEvent, { type: 'deviceStatus' }>;
const lastStatus = (ev: EngineEvent[]) => ev.filter((x): x is Status => x.type === 'deviceStatus').pop()!;
const m2 = (action: string, value?: unknown): Command => cmd({ type: 'device', action: { device: 'defib', action, ...(value === undefined ? {} : { value }) } as never });
const monitor = (action: string, value?: unknown): Command => cmd({ type: 'device', action: { device: 'monitor', action, ...(value === undefined ? {} : { value }) } as never });

function room(model: string | null, skin = 'saadat-like'): { e: MonitorEngine; ev: EngineEvent[] } {
  const r = devRig(skin);
  if (model) setDefibModel(r.e, model);
  r.e.advanceTo(1);
  return r;
}

describe('E0b: the connection state E0 lacked [G 2-8], [G 2-9], [G 12-11], [G 18-6]', () => {
  it('idle: the plain MFC, the paddles in their wells', () => {
    expect(M2_IDLE_STATUS.connections).toMatchObject({ mfcType: 'plain', paddlesOffAt: 'wells' });
  });

  it('a connect patch sets them; the status carries them at once, the snapshot round trip keeps them, a follower holds the same', () => {
    const script: Command[] = [m2('connect', { mfcType: 'cprd' }), m2('connect', { therapy: 'externalPaddles', paddlesOffAt: 'faceToFace' })];
    const run = () => {
      const r = room('zoll-m2');
      for (const c of script) expect(r.e.dispatch(c).accepted).toBe(true);
      r.e.advanceTo(1.2); // within the 1 Hz status: only a change sends it now
      return r;
    };
    const host = run();
    const follower = run();
    expect(lastStatus(host.ev).m2!.connections).toMatchObject({ mfcType: 'cprd', therapy: 'externalPaddles', paddlesOffAt: 'faceToFace' });
    expect(follower.e.snapshot().state).toEqual(host.e.snapshot().state);
    expect(lastStatus(follower.ev)).toEqual(lastStatus(host.ev));
    const restored = createEngine({ seed: 11, device: { skin: 'saadat-like' } });
    const rev: EngineEvent[] = [];
    restored.on((x) => rev.push(x));
    restored.restore(host.e.snapshot());
    restored.advanceTo(4);
    host.e.advanceTo(4);
    expect(lastStatus(rev).m2!.connections).toMatchObject({ mfcType: 'cprd', paddlesOffAt: 'faceToFace' });
    expect(lastStatus(rev)).toEqual(lastStatus(host.ev));
  });
});

describe("E0b: the bedside monitor's declared actions (plan §3.4.4; DQ27 = A, DQ28 = B)", () => {
  const OK: Array<[string, unknown]> = [['relearn', undefined], ['analysisLeads', 'single'], ['analysisLeads', 'multi']];
  const BAD: Array<[string, unknown]> = [['relearn', 'now'], ['relearn', 1], ['analysisLeads', undefined], ['analysisLeads', 'II'], ['analysisLeads', true]];

  it('each is accepted on every skin and every defibrillator model, and changes nothing yet', () => {
    for (const skin of ['saadat-like', 'philips-like', 'lifepak-like'])
      for (const model of [null, 'generic', 'zoll-m2'])
        for (const [action, value] of OK) {
          const a = room(model, skin);
          const b = room(model, skin);
          const r = a.e.dispatch(monitor(action, value));
          expect(r.accepted, `${skin} ${model} ${action}: ${r.reason}`).toBe(true);
          a.e.advanceTo(2.5);
          b.e.advanceTo(2.5);
          expect(a.e.snapshot().state, `${skin} ${model} ${action}`).toEqual(b.e.snapshot().state);
          expect(lastStatus(a.ev)).toEqual(lastStatus(b.ev));
        }
  });

  it('each is refused in its invalid forms, with a reason; other monitor names stay unknown', () => {
    const r = room(null);
    for (const [action, value] of BAD) expect(r.e.dispatch(monitor(action, value)).reason, `${action} ${JSON.stringify(value)}`).toEqual(expect.any(String));
    expect(r.e.dispatch(monitor('learn')).reason).toBe('unknown monitor action learn');
  });
});

describe('E0b: the package entry', () => {
  it("exports the connection words and their priority, the M2's vocabulary with them", () => {
    expect(entry.MSG).toBe(MSG);
    expect(entry.messagePriority).toBe(messagePriority);
    expect(entry.MSG.padsShorted).toBe('Check Pads - Pads Shorted'); // [G 12-11]
    expect(Object.keys(entry.M2_COMMANDS)).toEqual(expect.arrayContaining(['clear', 'test30J', 'diag', 'twelveLead', 'brightness', 'trend', 'export', 'faults', 'impedance', 'compressions']));
  });
});
