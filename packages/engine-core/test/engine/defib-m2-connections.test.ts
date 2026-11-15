// Defibrillator plan E2a (docs/plans/defibrillator-zoll-m2.md §3.1 C2, §6 E2a; brief 198): the ZOLL M2's patient
// connections (MFC, pads, external paddles, internal handles, the test plug, the ECG cable) and every device message and
// refusal that follows from them, each from its page of the Operator's Guide, [G n-m] (REF 9650-000873-01 Rev. C).
// A room on the generic model is unchanged: there the patient is always connected, as before.
import { describe, expect, it } from 'vitest';
import { createEngine } from '../../src/engine.ts';
import { connectionMessages, INTERNAL_MAX_J, INTERNAL_START_J, MSG, messagePriority } from '../../src/l3/defib-pacer/connections.ts';
import { createM2State, M2_IDLE_STATUS } from '../../src/l3/defib-pacer/m2-vocabulary.ts';
import type { Command, EngineEvent, MonitorEngine } from '../../src/types.ts';
import { cmd, devRig, markers } from '../helpers/device.ts';

type Status = Extract<EngineEvent, { type: 'deviceStatus' }>;
const statuses = (ev: EngineEvent[]) => ev.filter((x): x is Status => x.type === 'deviceStatus');
const lastStatus = (ev: EngineEvent[]) => statuses(ev).pop()!;
const model = (value: string): Command => cmd({ type: 'device', action: { device: 'defib', action: 'model', value } });
const m2 = (action: string, value?: unknown): Command => cmd({ type: 'device', action: { device: 'defib', action, ...(value === undefined ? {} : { value }) } as never });
const defib = (action: string, extra: Record<string, unknown> = {}) => cmd({ type: 'applyEvent', event: { kind: 'defib', action, ...extra } as never });
const pacer = (mode: string, extra: Record<string, unknown> = {}) => cmd({ type: 'applyEvent', event: { kind: 'pacer', action: 'set', mode, ...extra } as never });
const connect = (v: Record<string, unknown>) => m2('connect', v);
const button = (b: string, phase: 'down' | 'up') => m2('shockButton', { phase, button: b });

const PADS_OFF = { pads: { type: 'adult', placement: 'apexSternum', contact: 'off' } };
const PADS_POOR = { pads: { type: 'adult', placement: 'apexSternum', contact: 'poor' } };
const PADDLES = (contact = 'good', shockButtons = true) => ({ therapy: 'externalPaddles', paddles: { pediPlates: false, shockButtons, contact } });
const INTERNAL = (dischargeButton = true, contact = 'good') => ({ therapy: 'internalHandles', internal: { dischargeButton, contact } });

/** An M2 (or generic) room, advanced to 1 s. */
function room(m: string | null = 'zoll-m2', opts: Parameters<typeof devRig>[1] = {}): { e: MonitorEngine; ev: EngineEvent[] } {
  const r = devRig('saadat-like', opts);
  if (m) expect(r.e.dispatch(model(m)).accepted).toBe(true);
  r.e.advanceTo(1);
  return r;
}
const ok = (e: MonitorEngine, c: Command) => {
  const r = e.dispatch(c);
  expect(r.accepted, r.reason).toBe(true);
};
/** Charge at the selected energy and wait until ready (120 J at 7 s / 200 J, defib.ts). */
function chargeReady(e: MonitorEngine, ev: EngineEvent[]): void {
  ok(e, defib('charge'));
  e.advanceTo(e.now().simT + 8);
  expect(lastStatus(ev).defib!.state).toBe('ready');
}
const shocks = (ev: EngineEvent[]) => markers(ev, 'shock').length;

describe('E2a: the idle M2 is connected (pads on, good contact): nothing is refused and no message shows', () => {
  it('a charged shock with pads is delivered, and the status carries no message', () => {
    const { e, ev } = room();
    chargeReady(e, ev);
    ok(e, defib('shock'));
    e.advanceTo(e.now().simT + 0.5);
    expect(shocks(ev)).toBe(1);
    expect(lastStatus(ev).m2!.messages).toEqual([]);
  });
});

describe('E2a: pads [G 14-9], [G 12-3], [G 14-16], [G 6-13]', () => {
  it('pads off the patient: "Attach Pads", at once, and a charged shock is refused with it (no energy delivered) [G 14-9]', () => {
    const { e, ev } = room();
    e.advanceTo(1.3);
    ok(e, connect(PADS_OFF));
    e.advanceTo(1.36);
    const first = statuses(ev).find((s) => s.t > 1.3 && s.m2!.messages.includes(MSG.attachPads));
    expect(first, 'the status updates at once, not at the next 1 Hz status').toBeDefined();
    expect(first!.t).toBeLessThan(1.36);
    chargeReady(e, ev); // charging is not gated: the guide gates delivery
    const r = e.dispatch(defib('shock'));
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('Attach Pads');
    e.advanceTo(e.now().simT + 1);
    expect(shocks(ev)).toBe(0);
    expect(lastStatus(ev).defib!.shocks).toBe(0);
    expect(lastStatus(ev).m2!.connections.pads.contact).toBe('off');
  });

  it('pads not making good contact (poor) read as "Attach Pads" and refuse delivery [G 14-9], [G 12-3]', () => {
    const { e, ev } = room();
    ok(e, connect(PADS_POOR));
    chargeReady(e, ev);
    expect(lastStatus(ev).m2!.messages).toEqual([MSG.attachPads]);
    expect(e.dispatch(defib('shock')).reason).toBe('Attach Pads');
  });

  it('the MFC with nothing on its patient end gives "Attach Pads" [G 18-6, step 3]', () => {
    const { e, ev } = room();
    ok(e, connect({ therapy: 'none' }));
    e.advanceTo(1.5);
    expect(lastStatus(ev).m2!.messages).toEqual([MSG.attachPads]);
  });

  it('the therapy cable unplugged: "Connect Therapy Cable" (high), and the shock is refused with it [G 12-10], [G C-3]', () => {
    const { e, ev } = room();
    ok(e, connect({ mfc: false }));
    chargeReady(e, ev);
    expect(lastStatus(ev).m2!.messages).toEqual([MSG.connectTherapyCable]);
    expect(e.dispatch(defib('shock')).reason).toBe('Connect Therapy Cable');
    // plugged back in: pads on, good contact again, the message clears and the shock goes
    ok(e, connect({ mfc: true }));
    e.advanceTo(e.now().simT + 0.1);
    expect(lastStatus(ev).m2!.messages).toEqual([]);
    ok(e, defib('shock'));
    e.advanceTo(e.now().simT + 0.5);
    expect(shocks(ev)).toBe(1);
  });

  it('the test plug: "Check Pads - Pads Shorted", and treatment is refused until it is corrected [G 12-11], [G 18-4, step 7]', () => {
    const { e, ev } = room();
    ok(e, connect({ therapy: 'testPlug' }));
    chargeReady(e, ev);
    expect(lastStatus(ev).m2!.messages).toEqual([MSG.padsShorted]);
    expect(MSG.padsShorted).toBe('Check Pads - Pads Shorted'); // the guide prints a hyphen [G 12-11], [G C-2], [G 6-13]
    expect(e.dispatch(defib('shock')).reason).toBe('Check Pads - Pads Shorted');
  });

  it('a shock accepted at dispatch is not delivered if the pads came off in between (checked again at apply)', () => {
    const { e, ev } = room();
    chargeReady(e, ev);
    ok(e, connect(PADS_OFF)); // applied first
    ok(e, defib('shock')); // validated against the pads still on
    e.advanceTo(e.now().simT + 1);
    expect(shocks(ev)).toBe(0);
  });

  it('a synchronised shock waiting for its R is not delivered while the pads are off', () => {
    const { e, ev } = room('zoll-m2', { patient: { rhythm: { id: 'sinus', opts: { rateBpm: 80 } } } });
    ok(e, defib('syncOn'));
    chargeReady(e, ev);
    ok(e, defib('shock')); // armed with the pads on (validated and applied first)
    ok(e, connect(PADS_OFF)); // then off before the next R
    e.advanceTo(e.now().simT + 3);
    expect(shocks(ev)).toBe(0);
  });
});

describe('E2a: external paddles [G 2-4], [G 14-5], [G 14-7], [G 18-6], [G 18-7]', () => {
  it('one paddle SHOCK button alone does not discharge; both together do [G 18-7, steps 14–16]', () => {
    const { e, ev } = room();
    ok(e, connect(PADDLES()));
    chargeReady(e, ev);
    ok(e, button('apex', 'down'));
    e.advanceTo(e.now().simT + 1);
    expect(shocks(ev)).toBe(0);
    ok(e, button('apex', 'up'));
    ok(e, button('sternum', 'down'));
    e.advanceTo(e.now().simT + 1);
    expect(shocks(ev)).toBe(0);
    expect(lastStatus(ev).m2!.held).toMatchObject({ apex: false, sternum: true });
    ok(e, button('apex', 'down'));
    e.advanceTo(e.now().simT + 0.5);
    expect(shocks(ev)).toBe(1);
    expect(lastStatus(ev).defib!.shocks).toBe(1);
  });

  it('the front panel SHOCK is inactive with paddles that have SHOCK buttons [G 2-4], [G 14-7]; active with paddles without them', () => {
    const a = room();
    ok(a.e, connect(PADDLES()));
    chargeReady(a.e, a.ev);
    const r = a.e.dispatch(defib('shock'));
    expect(r.accepted).toBe(false);
    expect(r.reason).toMatch(/front panel SHOCK button is inactive/);
    const b = room();
    ok(b.e, connect(PADDLES('good', false)));
    chargeReady(b.e, b.ev);
    ok(b.e, defib('shock'));
    b.e.advanceTo(b.e.now().simT + 0.5);
    expect(shocks(b.ev)).toBe(1);
  });

  it('paddles off the chest: "Apply Paddles to Patient" [G 18-6, step 4], [G 6-13]; both buttons do not discharge into the open circuit [G A-2]', () => {
    const { e, ev } = room();
    ok(e, connect(PADDLES('off')));
    chargeReady(e, ev);
    expect(lastStatus(ev).m2!.messages).toEqual([MSG.applyPaddles]);
    ok(e, button('apex', 'down'));
    ok(e, button('sternum', 'down'));
    e.advanceTo(e.now().simT + 1);
    expect(shocks(ev)).toBe(0);
  });

  it('SHOCK buttons held while charging: "Release Shock Button", and the held press does not discharge at ready; a new press does [G 14-5]', () => {
    const { e, ev } = room();
    ok(e, connect(PADDLES()));
    ok(e, defib('charge'));
    e.advanceTo(e.now().simT + 1);
    ok(e, button('apex', 'down'));
    ok(e, button('sternum', 'down'));
    e.advanceTo(e.now().simT + 0.1);
    expect(lastStatus(ev).m2!.messages).toEqual([MSG.releaseShock]);
    e.advanceTo(e.now().simT + 6); // ready while both are still held
    expect(lastStatus(ev).defib!.state).toBe('ready');
    expect(shocks(ev)).toBe(0);
    ok(e, button('apex', 'up'));
    ok(e, button('sternum', 'up'));
    e.advanceTo(e.now().simT + 0.2);
    expect(lastStatus(ev).m2!.messages).toEqual([]);
    ok(e, button('apex', 'down'));
    ok(e, button('sternum', 'down'));
    e.advanceTo(e.now().simT + 0.5);
    expect(shocks(ev)).toBe(1);
  });

  it('in Sync, both buttons held arm the shock for the next R; releasing before it cancels [G 14-14], [G 14-18]', () => {
    const { e, ev } = room('zoll-m2', { patient: { rhythm: { id: 'sinus', opts: { rateBpm: 40 } } } });
    ok(e, connect(PADDLES()));
    ok(e, defib('syncOn'));
    chargeReady(e, ev);
    ok(e, button('apex', 'down'));
    ok(e, button('sternum', 'down'));
    ok(e, button('sternum', 'up')); // released in the same tick, before any R
    e.advanceTo(e.now().simT + 4);
    expect(shocks(ev)).toBe(0);
    ok(e, button('sternum', 'down'));
    e.advanceTo(e.now().simT + 4);
    expect(markers(ev, 'shock').map((m) => m.data?.sync)).toEqual([true]);
  });

  it('paddle buttons that are not connected do nothing (pads on: the room is unchanged)', () => {
    const a = room();
    const b = room();
    chargeReady(a.e, a.ev);
    chargeReady(b.e, b.ev);
    ok(a.e, button('apex', 'down'));
    ok(a.e, button('sternum', 'down'));
    ok(a.e, button('internal', 'down'));
    a.e.advanceTo(12);
    b.e.advanceTo(12);
    expect(a.e.snapshot().state).toEqual(b.e.snapshot().state);
  });
});

describe('E2a: paddles cannot pace [G 2-10], [G 16-10]', () => {
  it('starting the pacer with external paddles or internal handles is refused with "Use Pads to Pace"; with pads it starts', () => {
    for (const c of [PADDLES(), INTERNAL()]) {
      const { e } = room();
      ok(e, connect(c));
      e.advanceTo(1.5);
      const r = e.dispatch(pacer('fixed', { ratePpm: 70, mA: 90 }));
      expect(r.accepted).toBe(false);
      expect(r.reason).toBe('Use Pads to Pace');
      expect(e.dispatch(pacer('off')).accepted).toBe(true);
    }
    const { e } = room();
    ok(e, pacer('fixed', { ratePpm: 70, mA: 90 }));
  });

  it('paddles connected while pacing: "Use Pads to Pace" and no pulse reaches the patient; pads off: "Attach Pads" and no pulse [G 16-2], [G 16-10]', () => {
    const { e, ev } = room('zoll-m2', { patient: { rhythm: { id: 'avb3Wide' } } });
    ok(e, pacer('fixed', { ratePpm: 70, mA: 90 }));
    e.advanceTo(6);
    expect(markers(ev, 'paceSpike').length).toBeGreaterThan(4);
    ok(e, connect(PADDLES()));
    e.advanceTo(6.1);
    expect(lastStatus(ev).m2!.messages).toEqual([MSG.usePadsToPace]);
    e.advanceTo(12);
    expect(markers(ev, 'paceSpike').filter((m) => m.t > 6.5)).toEqual([]);
    ok(e, connect({ therapy: 'pads', ...PADS_OFF }));
    e.advanceTo(12.1);
    expect(lastStatus(ev).m2!.messages).toEqual([MSG.attachPads]);
    e.advanceTo(18);
    expect(markers(ev, 'paceSpike').filter((m) => m.t > 6.5)).toEqual([]);
    ok(e, connect({ pads: { type: 'adult', placement: 'anteriorPosterior', contact: 'good' } }));
    e.advanceTo(24);
    expect(markers(ev, 'paceSpike').filter((m) => m.t > 18.5).length).toBeGreaterThan(4);
    expect(lastStatus(ev).m2!.messages).toEqual([]);
  });
});

describe('E2a: internal handles [G 14-18], [G 14-19], [G 2-4]', () => {
  it(`connecting them sets ${INTERNAL_START_J} J; ${INTERNAL_MAX_J} J is the most that can be selected [G 14-18]`, () => {
    expect([INTERNAL_START_J, INTERNAL_MAX_J]).toEqual([10, 50]);
    const { e, ev } = room();
    ok(e, connect(INTERNAL()));
    e.advanceTo(1.5);
    expect(lastStatus(ev).defib!.energyJ).toBe(10);
    for (const j of [70, 85, 100, 120, 150, 200]) {
      for (const a of ['selectEnergy', 'charge']) {
        const r = e.dispatch(defib(a, { energyJ: j }));
        expect(r.accepted, `${a} ${j}`).toBe(false);
        expect(r.reason).toBe('50 J is the maximum energy with internal paddles');
      }
    }
    for (const j of [1, 5, 10, 20, 30, 50]) ok(e, defib('selectEnergy', { energyJ: j }));
  });

  it('connecting them while charged at 120 J selects 10 J and disarms (an energy change disarms [G 14-6])', () => {
    const { e, ev } = room();
    chargeReady(e, ev);
    ok(e, connect(INTERNAL()));
    e.advanceTo(e.now().simT + 0.1);
    expect(lastStatus(ev).defib).toMatchObject({ energyJ: 10, state: 'idle' });
  });

  it('with a Discharge button: it discharges when charged, the panel SHOCK is inactive, and pressed before charging it shows "Defib Not Ready - Press Charge" [G 14-19], [G 2-4]', () => {
    const { e, ev } = room();
    ok(e, connect(INTERNAL()));
    ok(e, button('internal', 'down'));
    e.advanceTo(1.5);
    expect(lastStatus(ev).m2!.messages).toEqual([MSG.notReady]);
    expect(shocks(ev)).toBe(0);
    ok(e, button('internal', 'up'));
    ok(e, defib('selectEnergy', { energyJ: 20 }));
    chargeReady(e, ev);
    expect(lastStatus(ev).m2!.messages).toEqual([]);
    expect(e.dispatch(defib('shock')).reason).toMatch(/front panel SHOCK button is inactive/);
    ok(e, button('internal', 'down'));
    e.advanceTo(e.now().simT + 0.5);
    expect(markers(ev, 'shock').map((m) => m.data?.energyJ)).toEqual([20]);
  });

  it('without a Discharge button the panel SHOCK delivers [G 14-19, step 6], [G 2-4]', () => {
    const { e, ev } = room();
    ok(e, connect(INTERNAL(false)));
    chargeReady(e, ev);
    ok(e, defib('shock'));
    e.advanceTo(e.now().simT + 0.5);
    expect(shocks(ev)).toBe(1);
  });

  it('handles off the heart do not discharge (an open circuit is outside 7–300 Ω [G A-2])', () => {
    const { e, ev } = room();
    ok(e, connect(INTERNAL(false, 'off')));
    chargeReady(e, ev);
    expect(e.dispatch(defib('shock')).accepted).toBe(false);
  });
});

describe('E2a: which messages show, and their priority (appendix C)', () => {
  const state = (patch: (s: ReturnType<typeof createM2State>) => void) => {
    const s = createM2State();
    patch(s);
    return s;
  };
  // pads off; an ECG cable on and its leads on, so a cable lead as top trace raises no ECG Lead Off of its own
  const off = (s: ReturnType<typeof createM2State>) => ((s.connections.pads.contact = 'off'), (s.connections.ecgCable = '3'));

  it('Monitor and Manual Defib show the pads messages only while Pads is the top trace [G C-2], [G C-3], [G 6-8]; AED and Pacer always [G 12-10], [G 16-2]', () => {
    const idle = { defibState: 'idle' as const, pacer: { mode: 'off' as const, mA: 0 } };
    expect(connectionMessages(state(off), idle.defibState, idle.pacer)).toEqual([MSG.attachPads]);
    expect(connectionMessages(state((s) => (off(s), (s.topLead = 'II'))), idle.defibState, idle.pacer)).toEqual([]);
    expect(connectionMessages(state((s) => (off(s), (s.topLead = 'II'), (s.power.selector = 'monitor'))), idle.defibState, idle.pacer)).toEqual([]);
    expect(connectionMessages(state((s) => (off(s), (s.topLead = 'II'), (s.defibMode = 'aed'))), idle.defibState, idle.pacer)).toEqual([MSG.attachPads]);
    expect(connectionMessages(state((s) => (off(s), (s.topLead = 'II'), (s.power.selector = 'pacer'))), idle.defibState, idle.pacer)).toEqual([MSG.attachPads]);
    expect(connectionMessages(state((s) => (off(s), (s.power.selector = 'off'))), idle.defibState, idle.pacer)).toEqual([]);
  });

  it('ECG Lead Off when a cable lead is the top trace and the cable or its leads are off [G 6-8], [G 6-13]; high only while demand pacing puts out pulses [G C-4]', () => {
    const lead = (cable: 'none' | '3', leadsOff: boolean) => state((s) => ((s.topLead = 'II'), (s.connections.ecgCable = cable), (s.connections.ecgLeadsOff = leadsOff)));
    expect(connectionMessages(lead('none', false), 'idle', { mode: 'off', mA: 0 })).toEqual([MSG.ecgLeadOff]);
    expect(connectionMessages(lead('3', true), 'idle', { mode: 'off', mA: 0 })).toEqual([MSG.ecgLeadOff]);
    expect(connectionMessages(lead('3', false), 'idle', { mode: 'off', mA: 0 })).toEqual([]);
    expect(messagePriority(MSG.ecgLeadOff, 'pacer', { mode: 'demand', mA: 60 })).toBe('high');
    expect(messagePriority(MSG.ecgLeadOff, 'pacer', { mode: 'fixed', mA: 60 })).toBe('medium');
    expect(messagePriority(MSG.ecgLeadOff, 'manual', { mode: 'off', mA: 0 })).toBe('medium');
  });

  it('priorities: Connect Therapy Cable high [G C-3]; Attach Pads medium [G C-2]; Pads Shorted medium in Defib, low in Monitor [G C-2]; the rest are not alarms', () => {
    const p = { mode: 'off' as const, mA: 0 };
    expect(messagePriority(MSG.connectTherapyCable, 'manual', p)).toBe('high');
    expect(messagePriority(MSG.attachPads, 'manual', p)).toBe('medium');
    expect(messagePriority(MSG.padsShorted, 'manual', p)).toBe('medium');
    expect(messagePriority(MSG.padsShorted, 'aed', p)).toBe('medium');
    expect(messagePriority(MSG.padsShorted, 'monitor', p)).toBe('low');
    for (const m of [MSG.applyPaddles, MSG.usePadsToPace, MSG.releaseShock, MSG.notReady]) expect(messagePriority(m, 'manual', p)).toBe('info');
  });

  it('more than one at a time: the most important first', () => {
    const s = state((x) => {
      x.connections.therapy = 'externalPaddles';
      x.connections.paddles = { pediPlates: false, shockButtons: true, contact: 'good' };
      x.held.apex = true;
      x.topLead = 'II';
      x.connections.ecgCable = 'none';
    });
    expect(connectionMessages(s, 'charging', { mode: 'off', mA: 0 })).toEqual([MSG.ecgLeadOff, MSG.releaseShock]);
  });
});

describe('E2a: the generic model, the snapshot and the follower', () => {
  it('generic: the patient is always connected; shocks and pacing as before, and no M2 state', () => {
    const { e, ev } = room('generic', { patient: { rhythm: { id: 'avb3Wide' } } });
    chargeReady(e, ev);
    ok(e, defib('shock'));
    ok(e, pacer('fixed', { ratePpm: 70, mA: 90 }));
    e.advanceTo(e.now().simT + 6);
    expect(shocks(ev)).toBe(1);
    expect(markers(ev, 'paceSpike').length).toBeGreaterThan(4);
    expect('m2' in lastStatus(ev)).toBe(false);
    expect(e.dispatch(connect(PADS_OFF)).accepted).toBe(false);
  });

  it('the snapshot round trip keeps the connections, the held buttons and the messages; a follower replaying the commands holds the same state and outcome', () => {
    const script: Command[] = [connect(PADDLES()), defib('charge'), button('apex', 'down')];
    const run = () => {
      const r = devRig('saadat-like');
      ok(r.e, model('zoll-m2'));
      r.e.advanceTo(0.5);
      for (const c of script) ok(r.e, c);
      r.e.advanceTo(3);
      return r;
    };
    const host = run();
    const follower = run();
    expect(follower.e.snapshot().state).toEqual(host.e.snapshot().state);
    expect(lastStatus(host.ev).m2).toMatchObject({ connections: { therapy: 'externalPaddles' }, held: { apex: true }, messages: [MSG.releaseShock] });
    const restored = createEngine({ seed: 11, device: { skin: 'saadat-like' } });
    const rev: EngineEvent[] = [];
    restored.on((x) => rev.push(x));
    restored.restore(host.e.snapshot());
    for (const x of [restored, host.e, follower.e]) {
      x.advanceTo(9);
      ok(x, button('apex', 'up'));
      x.advanceTo(9.5);
      ok(x, button('apex', 'down'));
      ok(x, button('sternum', 'down'));
      x.advanceTo(11);
    }
    expect(lastStatus(rev)).toEqual(lastStatus(host.ev));
    expect(lastStatus(follower.ev)).toEqual(lastStatus(host.ev));
    expect(shocks(rev)).toBe(1);
    expect(lastStatus(rev).m2).not.toEqual(M2_IDLE_STATUS);
  });
});
