// How the host's record says a stage was entered (a press, its rule, a jump), on the host as AppSession wires it: the
// scenario driver, the host session, the in-process hub and the record, with AppSession's clock (session.ts `simNow`:
// the last engine time run forward on the page's wall clock at ×8). The owner's run of 30 October showed the manual
// step "Cool" amber ("fired by its own rule") once. Stalled frames, throttled timers and the press and its state in
// different batches do not do it (the first case). What does: the wall clock moving between the hook's two reads of
// the host's clock — the press is acknowledged at the tick of the first read, its state carries the time of the second,
// and the record matched the two within one tick. The record now reads how the driver took the transition.
import { createInProcessHub, HostSession, type HostTarget, type WireEvent } from '@pme/controller';
import { ScenarioDriver, validateScenario } from '@pme/controller/scenario';
import { describe, expect, it } from 'vitest';
import { steps } from './debrief.ts';
import { RunRecord } from './record.ts';
import mh from './showcase/showcase-mh.json';

const TICK_S = 0.02;
const SCALE = 8;

/** A host as AppSession builds it, on a wall clock the test moves. `perRead` ms pass on every read of the host's clock
 *  (the main thread's work between two reads); the page's performance.now() is coarsened to `grainMs` (WebKit: 1 ms). */
async function host(o: { perRead?: () => number; grainMs?: number } = {}) {
  const v = validateScenario(mh);
  if (!v.ok) throw new Error(v.errors.join('; '));
  let real = 0; // ms
  let lastT = 0;
  let lastWall = 0;
  const engine: Array<(e: never) => void> = [];
  const wall = () => Math.floor(real / (o.grainMs ?? 1e-9)) * (o.grainMs ?? 1e-9);
  const simNow = () => lastT + (Math.max(0, wall() - lastWall) / 1000) * SCALE;
  const tickNow = () => Math.floor(simNow() / TICK_S + 1e-6);
  const target: HostTarget = {
    dispatch: (c) => ({ accepted: true, tick: Math.max(c.atTick ?? 0, tickNow()) }),
    snapshot: () => Promise.reject(new Error('no snapshot here')),
    restore: () => Promise.resolve(),
    on: (fn) => (engine.push(fn), () => {}),
    now: () => {
      real += o.perRead?.() ?? 0;
      const simT = simNow();
      return { tick: Math.floor(simT / TICK_S + 1e-6), simT };
    },
    time: () => {},
  };
  let hs: HostSession | null = null;
  const driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (e) => hs?.publish(e) });
  hs = new HostSession({ session: 'ATT234', target: driver.host, scenario: driver.hook, stateIntervalMs: 0 });
  const hub = createInProcessHub();
  hs.addTransport(hub.connect());
  const rec = new RunRecord(() => ({ patient: 'test', weightKg: 70 }));
  const batches: WireEvent[][] = [];
  hub.connect().onMessage((m) => m.kind === 'event' && (batches.push(m.body), m.body.forEach((e) => rec.wire(e))));
  const settle = () => new Promise((r) => setTimeout(r, 0));
  const send = async (c: Record<string, unknown>) => {
    const a = await (hs as HostSession).submit({ id: `c${Math.random()}`, issuedBy: 'instructor', ...c } as never);
    await settle();
    if (!a.accepted) throw new Error(a.reason);
  };
  /** One frame of `ms` of wall: the engine's events bring the estimate up to date (lastT follows), then the driver's
   *  poll, unless its timer is throttled. */
  const frame = (ms: number, poll = true) => {
    real += ms;
    lastT = simNow();
    lastWall = wall();
    if (poll) driver.poll();
  };
  /** The page's wall clock runs `ms`, in frames of `everyMs` (10 Hz: the driver's poll timer), or with no poll at all. */
  const run = async (ms: number, everyMs: number | null = 100) => {
    for (let done = 0; done < ms; ) {
      const step = Math.min(everyMs ?? ms, ms - done);
      frame(step, everyMs !== null);
      done += step;
      await settle();
    }
  };
  /** Set the clock: the estimate stands at sim `t`, the real wall clock `phaseMs` past its last reading. */
  const at = (t: number, phaseMs = 0) => {
    lastT = t;
    lastWall = wall();
    real = lastWall + phaseMs;
  };
  /** The engine's state reports a core temperature, and the driver reads it (Cool is offered only above 38.5 °C, #216). */
  const core = async (tempCore: number) => {
    for (const fn of engine) fn({ type: 'state', values: { tempCore } } as never);
    driver.poll();
    await settle();
  };
  await send({ type: 'scenario', action: 'load', doc: v.doc });
  return { rec, driver, send, frame, run, at, core, batches, close: () => (hs as HostSession).close() };
}

/** The state rows of the kept course: [state, transition, by]. */
const states = (rec: RunRecord) => rec.data.rows.filter((r) => r.ev?.startsWith('state:') && r.undone === undefined).map((r) => [r.ev?.slice(6), r.tr ?? '', r.by ?? '']);

describe('a stage entry is attributed by the transition the driver took', () => {
  it('a stalled frame, a throttled timer, and the press and its state in different batches leave a press a press', async () => {
    const h = await host();
    await h.send({ type: 'scenario', action: 'goto', target: 'treating' });
    await h.core(39); // hyperthermic: Cool is offered
    h.at(1000.011);
    await h.send({ type: 'scenario', action: 'trigger', target: 'cool-treating' });
    // the state and the acknowledgement came in different batches (the host publishes the state first)
    const ack = h.batches.findIndex((b) => b.some((e) => e.type === 'commandApplied' && (e.resolved as { command?: { action?: string } }).command?.action === 'trigger'));
    const cool = h.batches.findIndex((b) => b.some((e) => e.type === 'scenario' && e.stateId === 'cooling'));
    expect(cool).toBeGreaterThanOrEqual(0);
    expect(ack).toBeGreaterThan(cool);
    // one stalled frame at ×8: 400 ms of wall, 160 ticks, one poll — the spoke's 2-s hop back lands in it
    await h.run(400, 400);
    // a throttled timer (a background or busy tab): 1 s of wall without a poll, then a press
    await h.run(1000, null);
    await h.send({ type: 'scenario', action: 'trigger', target: 'kTreat-treating' });
    await h.run(400, 400);
    expect(states(h.rec)).toEqual([
      ['awake', '', ''], ['treating', '', 'goto'],
      ['cooling', 'cool-treating', 'press'], ['treating', 'back-cooling', 'rule'],
      ['potassium', 'kTreat-treating', 'press'], ['treating', 'back-potassium', 'rule'],
    ]);
    h.close();
  });

  it('the wall clock moving between the hook\'s two reads of the host\'s clock (WebKit\'s 1-ms grain, ×8) leaves the Cool press a press, and the Debrief has it taken', async () => {
    // 0.25 ms of work per read: the hook's first read (the acknowledgement's tick) is the third of the press, the
    // runner's (the state's time) the fourth; started 0.10 ms into a millisecond, the fourth crosses into the next one
    // (8 ms of sim at ×8)
    let perRead = 0;
    const h = await host({ perRead: () => perRead, grainMs: 1 });
    await h.send({ type: 'scenario', action: 'goto', target: 'treating' });
    await h.core(39); // hyperthermic: Cool is offered
    h.at(1000.015, 0.1); // 15 ms into the tick of 1000.00 s
    perRead = 0.25;
    await h.send({ type: 'scenario', action: 'trigger', target: 'cool-treating' });
    perRead = 0;
    await h.run(2500);
    expect(states(h.rec)).toEqual([['awake', '', ''], ['treating', '', 'goto'], ['cooling', 'cool-treating', 'press'], ['treating', 'back-cooling', 'rule']]);
    const step = steps(h.rec.data).find((s) => s.id === 'cool-treating');
    expect(step?.status).toBe('taken');
    expect(step?.takenT).not.toBeNull();
    h.close();
  });

  it('over a grid of press moments (20 wall phases × 20 tick phases), every manual press on a spoke is a press', async () => {
    let perRead = 0;
    const h = await host({ perRead: () => perRead, grainMs: 1 });
    let n = 0;
    const wrong: string[] = [];
    for (let w = 0; w < 20; w++) {
      for (let k = 0; k < 20; k++) {
        await h.send({ type: 'scenario', action: 'goto', target: 'treating' });
        if (n === 0) await h.core(39); // hyperthermic: Cool is offered (the core stays where it was)
        const t0 = 1000 + 10 * n++;
        h.at(t0 + k * 0.001, w * 0.05);
        perRead = 0.25;
        await h.send({ type: 'scenario', action: 'trigger', target: 'cool-treating' });
        perRead = 0;
        await h.run(300, 300); // 2.4 s: the hop back
        const row = h.rec.data.rows.filter((r) => r.ev === 'state:cooling').at(-1);
        if (row?.by !== 'press') wrong.push(`wall +${(w * 0.05).toFixed(2)} ms, tick +${k} ms: ${row?.by ?? 'no row'}`);
      }
    }
    expect(wrong, `${wrong.length} of 400 presses recorded as not a press`).toEqual([]);
    h.close();
  }, 60_000);

  it('the spoke\'s hop back published before the press is acknowledged (forced: the host cannot interleave a poll there today) leaves the press a press', async () => {
    const h = await host();
    await h.send({ type: 'scenario', action: 'goto', target: 'treating' });
    await h.core(39); // hyperthermic: Cool is offered
    h.at(1000.011);
    // a frame of 300 ms (2.4 s of sim) and its poll run after the hook's own poll and before the host queues the
    // press's acknowledgement (a microtask the hook's answer resolves first)
    const r = h.driver.runner;
    if (!r) throw new Error('no runner');
    const trigger = r.trigger.bind(r);
    r.trigger = (t, id) => {
      const res = trigger(t, id);
      queueMicrotask(() => h.frame(300));
      return res;
    };
    await h.send({ type: 'scenario', action: 'trigger', target: 'cool-treating' });
    r.trigger = trigger;
    await h.run(500);
    expect(states(h.rec)).toEqual([['awake', '', ''], ['treating', '', 'goto'], ['cooling', 'cool-treating', 'press'], ['treating', 'back-cooling', 'rule']]);
    h.close();
  });
});
