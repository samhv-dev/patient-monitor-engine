// A case can begin on a paused host: a new engine (a case loaded after "Debrief now", or loaded while paused by hand) or
// a return to a position (a bookmark restore, a reload's restore) while paused. Every controller learns it from the
// host's own wire: the timeline began paused, and it holds until the host resumes.
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine, type MonitorEngine } from '@pme/engine-core';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { HostSession, type HostTarget } from '../../src/session/host-session.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import type { TimelineCause, WireMessage } from '../../src/protocol.ts';
import { collect } from '../helpers.ts';

const S = 'PAS234';

function setup() {
  let engine: MonitorEngine = createEngine({ seed: 7 });
  const fns = new Set<Parameters<HostTarget['on']>[0]>();
  let off = engine.on((e) => fns.forEach((f) => f(e)));
  const target: HostTarget = {
    dispatch: (c) => engine.dispatch(c),
    snapshot: () => engine.snapshot(),
    restore: (x) => engine.restore(x),
    on: (fn) => (fns.add(fn), () => void fns.delete(fn)),
    now: () => engine.now(),
    time: () => undefined,
  };
  const hub = createInProcessHub();
  const host = new HostSession({ session: S, target, stateIntervalMs: 0 });
  host.addTransport(hub.connect());
  const wire = hub.connect();
  const seen = collect(wire); // registered before the controller's own listener: the controller has it when this does
  const ctl = new ControllerSession({ session: S, transport: wire });
  /** Resolves on the controller's change (each message it takes) that makes `pred` true. */
  const until = (pred: () => boolean) => new Promise<void>((done) => {
    if (pred()) return done();
    const off = ctl.onChange(() => pred() && (off(), done()));
  });
  const timelines = () => seen.filter((m) => m.kind === 'event').flatMap((m) => (m as Extract<WireMessage, { kind: 'event' }>).body).filter((e) => e.type === 'timeline').length;
  return {
    host,
    ctl,
    online: () => until(() => ctl.hostOnline),
    async time(action: 'pause' | 'resume') {
      expect((await ctl.send({ type: 'time', action })).accepted).toBe(true);
      await until(() => ctl.hostPaused === (action === 'pause'));
    },
    async newTimeline(cause: TimelineCause) {
      const n = timelines();
      if (cause === 'restart') {
        off();
        engine = createEngine({ seed: 8 });
        off = engine.on((e) => fns.forEach((f) => f(e)));
      }
      host.newTimeline(cause);
      await until(() => timelines() > n);
    },
    run: (s: number) => engine.advanceTo(engine.now().simT + s),
  };
}

describe('a case that begins on a paused host', () => {
  let x: ReturnType<typeof setup> | null = null;
  afterEach(() => {
    x?.ctl.close();
    x?.host.close();
    x = null;
  });

  it('a new engine while paused (a case loaded after Debrief now, or while paused by hand) begins paused, until the host resumes', async () => {
    x = setup();
    await x.online();
    await x.time('pause');
    expect(x.ctl.pausedAtStart).toBe(false); // a pause in a running case is not a case that has not started
    await x.newTimeline('restart');
    expect(x.ctl.pausedAtStart).toBe(true);
    await x.time('resume');
    expect(x.ctl.pausedAtStart).toBe(false);
    await x.time('pause');
    expect(x.ctl.pausedAtStart).toBe(false); // paused again later: a running case's pause
  });

  it('a return to a position while paused (a bookmark restore, a reload restoring a paused position) begins paused', async () => {
    x = setup();
    await x.online();
    x.run(30);
    await x.time('pause');
    await x.newTimeline('restore');
    expect(x.ctl.pausedAtStart).toBe(true);
    await x.time('resume');
    expect(x.ctl.pausedAtStart).toBe(false);
  });

  it('a new engine on a running host does not', async () => {
    x = setup();
    await x.online();
    await x.newTimeline('restart');
    expect(x.ctl.pausedAtStart).toBe(false);
  });
});
