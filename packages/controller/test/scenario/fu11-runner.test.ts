// FU-11 Task I3 (external review F16, F17): alternatives are tried without consuming what the next one needs; an
// explicit MANUAL document sets MANUAL on a host that runs MODELED.
import { afterEach, describe, expect, it } from 'vitest';
import { ScenarioRunner } from '../../src/scenario/runner.ts';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { waitFor } from '../helpers.ts';
import { doc, shock, vals } from './fixtures.ts';

const cleanup: Array<() => void> = [];
afterEach(() => {
  for (const f of cleanup.splice(0)) f();
});
/** The engine's physiology mode, read from its snapshot (the L1 block). */
const engineMode = (h: ReturnType<typeof manualHost>) => /"l1":\{"mode":"(\w+)"/.exec(JSON.stringify(h.engine.snapshot()))?.[1];

describe('FU-11 I3: scenario runner', () => {
  it('any([all([shock, HR > 200]), shock]) fires on one shock at HR 70; the reversed order too', () => {
    for (const when of [
      { any: [{ all: [{ event: { kind: 'defib', action: 'shock' } }, { vital: { var: 'hr', op: '>', value: 200 } }] }, { event: { kind: 'defib', action: 'shock' } }] },
      { any: [{ event: { kind: 'defib', action: 'shock' } }, { all: [{ event: { kind: 'defib', action: 'shock' } }, { vital: { var: 'hr', op: '>', value: 200 } }] }] },
    ]) {
      const r = new ScenarioRunner(doc([{ when: when as never }]));
      r.start(0);
      r.advance(1, [vals({ hr: 70 }), shock()]);
      expect(r.stateId).toBe('b');
    }
  });
  it('a successful all still needs two distinct shocks', () => {
    const r = new ScenarioRunner(doc([{ when: { all: [{ event: { kind: 'defib', action: 'shock' } }, { event: { kind: 'defib', action: 'shock' } }] } as never }]));
    r.start(0);
    r.advance(1, [shock()]);
    expect(r.stateId).toBe('a');
    r.advance(2, [shock()]);
    expect(r.stateId).toBe('b');
  });
  it('an explicit MANUAL document starts with setMode manual; a document without a mode sends none', () => {
    const manual = { ...doc([{ when: { afterS: 5 } }]), mode: 'manual' as const };
    const fx = new ScenarioRunner(manual).start(0);
    expect(fx.flatMap((f) => (f.kind === 'commands' ? f.commands : []))).toContainEqual({ type: 'setMode', mode: 'manual' });
    const none = new ScenarioRunner(doc([{ when: { afterS: 5 } }])).start(0);
    expect(none.flatMap((f) => (f.kind === 'commands' ? f.commands : [])).some((c) => c.type === 'setMode')).toBe(false);
  });
  it('…and on a real MODELED host, loading it through the session makes the engine MANUAL (R50 M11)', async () => {
    const host = manualHost({ seed: 42, mode: 'modeled' } as never);
    expect(engineMode(host)).toBe('modeled');
    let hs: HostSession | null = null;
    const driver = new ScenarioDriver({ target: host, submit: (c) => (hs as HostSession).submit(c), publish: (e) => hs?.publish(e) });
    hs = new HostSession({ session: 'MAN234', target: driver.host, stateIntervalMs: 0, scenario: driver.hook, welcomeEvents: () => driver.welcomeEvents() });
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    const ctl = new ControllerSession({ session: 'MAN234', transport: hub.connect(), issuedBy: 'panel' });
    cleanup.push(() => ctl.close(), () => (hs as HostSession).close(), () => driver.close());
    await waitFor(() => ctl.hostOnline);
    const manual = { ...doc([{ when: { afterS: 5 } }]), mode: 'manual' as const };
    expect((await ctl.send({ type: 'scenario', action: 'load', doc: manual })).accepted).toBe(true);
    for (let tick = 1; tick <= 50; tick++) {
      host.engine.advanceTo(tick * 0.02);
      driver.poll();
    }
    await new Promise((r) => setTimeout(r, 20)); // the runner's setup commands are stamped a few ticks ahead
    for (let tick = 51; tick <= 150; tick++) host.engine.advanceTo(tick * 0.02);
    expect(engineMode(host)).toBe('manual');
  });
});
