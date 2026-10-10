// FU-11 Task C2 (external review F06, browser audit BA06): a target that rejects (a failed or destroyed worker) is a
// refusal the controller is told about, not a stall of the host's command chain.
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine } from '@pme/engine-core';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession, type HostTarget } from '../../src/session/host-session.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { waitFor } from '../helpers.ts';

const S = 'HBD234';
const target = (e = createEngine({ seed: 3 })): HostTarget => ({
  dispatch: (c) => e.dispatch(c), snapshot: () => e.snapshot(), restore: (s) => e.restore(s), on: (f) => e.on(f), now: () => e.now(), time: () => undefined,
});
let hs: HostSession | null = null;
afterEach(() => hs?.close());

describe('FU-11 C2: a failed target is a refusal, not a stall (F06)', () => {
  it('a dispatch that rejects is acked as refused with the reason, and the next command is applied', { timeout: 10_000 }, async () => {
    const e = createEngine({ seed: 3 });
    let broken = true;
    const t: HostTarget = { ...target(e), dispatch: (c) => (broken ? Promise.reject(new Error("the monitor's worker stopped responding")) : e.dispatch(c)) };
    const hub = createInProcessHub();
    hs = new HostSession({ session: S, target: t, stateIntervalMs: 0 });
    hs.addTransport(hub.connect());
    const ctl = new ControllerSession({ session: S, transport: hub.connect() });
    await waitFor(() => ctl.hostOnline);
    const r1 = await ctl.send({ type: 'setTarget', variable: 'hr', value: 90 });
    expect(r1.accepted).toBe(false);
    expect(r1.reason).toMatch(/stopped responding/);
    broken = false;
    const r2 = await ctl.send({ type: 'setTarget', variable: 'hr', value: 95 });
    expect(r2.accepted).toBe(true);
    ctl.close();
  });
});
