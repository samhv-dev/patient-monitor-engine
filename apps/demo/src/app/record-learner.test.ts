// Plan room-and-instruments.md R5d: every press of the learner defibrillator window is a record row of kind `learner`,
// with the device key the host carried as `by` and the name the instructor gave that device (R7's remembered layout);
// the Debrief's who line names it ("Shock 200 J at 04:12, by Defibrillator (bed 2)", else "Defibrillator window n").
// The instructor's own presses keep their rows. The last case runs a real engine and host session as AppSession wires
// them: the window's presses arrive on a transport of their own, the record reads the host's in-process hub.
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { createInProcessHub, createStamper, HostSession, LEARNER_ISSUED_BY, type HostTarget, type WireEvent, type WireMessage } from '@pme/controller';
import { describe, expect, it } from 'vitest';
import { learnerWho } from './debrief.ts';
import { RunRecord, type Row } from './record.ts';

const KEY = 'bed2defib01';
const applied = (tick: number, command: Record<string, unknown>): WireEvent =>
  ({ type: 'commandApplied', commandId: `c${tick}`, tick, resolved: { command: { id: `c${tick}`, issuedBy: 'instructor', ...command } } }) as WireEvent;
const status = (t: number, energyJ: number, state = 'idle'): EngineEvent =>
  ({ type: 'deviceStatus', t, defib: { energyJ, state, sync: false, readyAt: null, shocks: 0, lastShock: null } }) as unknown as EngineEvent;
const learner = (tick: number, action: 'charge' | 'shock', by: string | undefined = KEY) =>
  applied(tick, { issuedBy: LEARNER_ISSUED_BY, type: 'applyEvent', event: { kind: 'defib', action }, ...(by ? { by } : {}) });
const names = (m: Record<string, string>) => (k: string) => m[k] ?? null;

describe('R5d: the learner rows of the record', () => {
  it("a learner's charge and shock are `learner` rows with the device's key and name, at the room's energy; the instructor's own keep theirs", () => {
    const r = new RunRecord(() => ({ patient: 'P', weightKg: 70 }), () => 0, () => null, names({ [KEY]: 'bed 2' }));
    r.engine(status(240, 200));
    r.wire(learner(12_000, 'charge'));
    r.wire(learner(12_600, 'shock'));
    r.wire(applied(13_000, { type: 'applyEvent', event: { kind: 'defib', action: 'charge', energyJ: 150 } }));
    r.wire(applied(13_500, { type: 'applyEvent', event: { kind: 'defib', action: 'shock', energyJ: 150 } }));
    expect(r.data.rows.map((x) => [x.t, x.kind, x.text, x.ev ?? '', x.by ?? '', x.name ?? ''])).toEqual([
      [240, 'learner', 'Charge 200 J', '', KEY, 'bed 2'],
      [252, 'learner', 'Shock 200 J', 'shock', KEY, 'bed 2'],
      [260, 'action', 'Defibrillator charging to 150 J', '', '', ''],
      [270, 'action', 'Shock delivered', 'shock', '', ''],
    ]);
  });

  it('the energy is the device\'s as its last status said; none heard yet: the press without a number', () => {
    const r = new RunRecord(() => ({ patient: 'P', weightKg: 70 }), () => 0);
    r.wire(learner(50, 'charge'));
    r.engine(status(2, 120, 'charging'));
    r.wire(learner(500, 'shock'));
    expect(r.data.rows.map((x) => x.text)).toEqual(['Charge', 'Shock 120 J']);
    expect(r.data.rows[0]?.name).toBeUndefined(); // no name given: the Debrief numbers the window
  });

  it('the rows survive JSON (an exported record keeps who pressed)', () => {
    const r = new RunRecord(() => ({ patient: 'P', weightKg: 70 }), () => 0, () => null, names({ [KEY]: 'bed 2' }));
    r.engine(status(0, 200));
    r.wire(learner(100, 'shock'));
    expect((JSON.parse(JSON.stringify(r.data)) as { rows: Row[] }).rows[0]).toMatchObject({ kind: 'learner', by: KEY, name: 'bed 2' });
  });
});

describe("R5d: the Debrief's who line", () => {
  const row = (t: number, by: string | undefined, text = 'Shock 200 J', name?: string): Row => ({ t, kind: 'learner', text, ev: 'shock', ...(by ? { by } : {}), ...(name ? { name } : {}) });
  it('reads "Shock 200 J at 04:12, by Defibrillator (bed 2)" from the remembered layout', () => {
    const r = row(252, KEY);
    expect(learnerWho([r], r, names({ [KEY]: 'bed 2' }))).toBe('Shock 200 J at 04:12, by Defibrillator (bed 2)');
  });
  it("the layout's name first (named after the run), else the name the row kept, else \"Defibrillator window n\" in order of first press", () => {
    const a = row(10, 'aaaaaaaa1', 'Charge 120 J');
    const b = row(20, 'bbbbbbbb2', 'Charge 120 J');
    const a2 = row(30, 'aaaaaaaa1', 'Shock 120 J');
    const c = row(40, 'cccccccc3', 'Shock 120 J', 'trolley');
    const rows = [a, b, a2, c];
    const none = names({});
    expect(learnerWho(rows, a, none)).toBe('Charge 120 J at 00:10, by Defibrillator window 1');
    expect(learnerWho(rows, b, none)).toBe('Charge 120 J at 00:20, by Defibrillator window 2');
    expect(learnerWho(rows, a2, none)).toBe('Shock 120 J at 00:30, by Defibrillator window 1');
    expect(learnerWho(rows, c, none)).toBe('Shock 120 J at 00:40, by Defibrillator (trolley)');
    expect(learnerWho(rows, c, names({ cccccccc3: 'bed 4' }))).toBe('Shock 120 J at 00:40, by Defibrillator (bed 4)');
  });
});

describe('R5d: through a real host, as AppSession wires the record', () => {
  it("the window's presses become learner rows, the instructor panel's stay action rows", async () => {
    const engine = createEngine({ seed: 5 });
    const target: HostTarget = { dispatch: (c) => engine.dispatch(c), snapshot: () => engine.snapshot(), restore: (s) => engine.restore(s), on: (f) => engine.on(f), now: () => engine.now(), time: () => undefined };
    const host = new HostSession({ session: 'REC234', target, stateIntervalMs: 0 });
    const rec = new RunRecord(() => ({ patient: 'P', weightKg: 70 }), () => 0, () => null, names({ [KEY]: 'bed 2' }));
    engine.on((e) => rec.engine(e));
    const hub = createInProcessHub(); // the host's own panel end: the record reads every source's commands here
    host.addTransport(hub.connect());
    hub.connect().onMessage((m) => void (m.kind === 'event' && m.body.forEach((e) => rec.wire(e))));
    const win = createInProcessHub(); // the defibrillator window's own transport (the relay or the BroadcastChannel)
    host.addTransport(win.connect());
    const w = win.connect();
    const acks: WireMessage[] = [];
    w.onMessage((m) => void (m.kind === 'ack' && acks.push(m)));
    const st = createStamper('REC234', 'defib-win');
    w.send(st({ kind: 'hello', role: 'defib', show: 'defib', device: KEY }));
    const settle = () => new Promise((r) => setTimeout(r, 0));
    await settle();
    engine.step(50);
    w.send(st({ kind: 'command', body: { id: 'w1', issuedBy: 'whatever', type: 'applyEvent', event: { kind: 'defib', action: 'charge' } } as never }));
    await settle();
    engine.step(500); // 10 s: past the charge time
    w.send(st({ kind: 'command', body: { id: 'w2', issuedBy: 'whatever', type: 'applyEvent', event: { kind: 'defib', action: 'shock' } } as never }));
    await settle();
    await host.submit({ id: 'p1', issuedBy: 'instructor', type: 'applyEvent', event: { kind: 'defib', action: 'disarm' } } as never);
    await settle();
    expect(acks.map((a) => (a as { accepted: boolean }).accepted)).toEqual([true, true]);
    const rows = rec.data.rows.map((x) => [x.kind, x.text, x.by ?? '', x.name ?? '']);
    expect(rows).toEqual([
      ['learner', 'Charge 120 J', KEY, 'bed 2'], // the generic model's adult energy (defib.ts FALLBACK_DEFIB, 120 J)
      ['learner', 'Shock 120 J', KEY, 'bed 2'],
      ['action', 'Defibrillator disarmed', '', ''],
    ]);
    host.close();
  });
});
