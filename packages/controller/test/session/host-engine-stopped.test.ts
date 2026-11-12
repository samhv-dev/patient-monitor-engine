// Brief 195: a host whose engine has stopped says so, every second, so a follower can tell "the host is here and its
// simulation has stopped" from "the host has gone". Before it, once the engine emitted its own `state` the host's 1 Hz
// timer sent nothing (emitState returned at once), and a stopped engine sent nothing either: on the wire the two were the
// same silence, and three seconds later every phone froze and said "The instructor's monitor is not answering".
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { HostSession } from '../../src/session/host-session.ts';
import { VIEWER_EVENTS, type WireEvent, type WireMessage } from '../../src/protocol.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'STP234';
const REASON = 'an error in the simulation: the frame step threw';
let hs: HostSession | null = null;
afterEach(() => {
  hs?.close();
  hs = null;
  vi.useRealTimers();
});

/** A host on a real engine (manual clock) and one peer; only the host's 1 Hz timer runs on a fake clock. */
function setup(stateIntervalMs = 1000) {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
  const host = manualHost();
  const hub = createInProcessHub();
  hs = new HostSession({ session: S, target: host, stateIntervalMs });
  hs.addTransport(hub.connect());
  const got = collect(hub.connect());
  const events = (): WireEvent[] => got.filter((m): m is Extract<WireMessage, { kind: 'event' }> => m.kind === 'event').flatMap((m) => m.body);
  const stops = () => events().filter((e) => e.type === 'engineStopped');
  /** `s` wall seconds of a running engine: it steps, the host flushes its frame's events, the host's timer ticks. */
  const run = async (s: number) => {
    for (let i = 0; i < s * 10; i++) {
      host.advance(100);
      hs!.flush();
      vi.advanceTimersByTime(100);
      await Promise.resolve();
    }
    hs!.flush();
    await new Promise((r) => setTimeout(r, 0)); // the in-process hub's deliveries
  };
  return { host, got, events, stops, run, hs: hs as HostSession };
}

describe('the host says its engine has stopped, every second, until a new engine runs', () => {
  it('engine running: the timer adds nothing to the traffic (the same messages with it as without it)', async () => {
    const withTimer = setup(1000);
    await withTimer.run(10);
    const n = withTimer.got.length;
    expect(withTimer.stops()).toHaveLength(0);
    hs!.close();
    const without = setup(0);
    await without.run(10);
    expect(n).toBe(without.got.length); // measured: the engine's own state and events only, no host message added
    expect(n).toBeGreaterThan(0);
  });

  it('engine stopped: every peer is told at once with the reason, then once a second, in one small message', async () => {
    const { stops, run, got, hs: h } = setup(1000);
    await run(2);
    h.engineStopped(REASON);
    await waitFor(() => stops().length === 1, 500, 'the first notice, at once');
    expect(stops()[0]).toMatchObject({ type: 'engineStopped', reason: REASON });
    const before = got.length;
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(1000);
      h.flush();
    }
    await waitFor(() => stops().length === 6, 500, 'one notice a second');
    expect(got.length - before).toBe(5); // one message a second, nothing else
    const bytes = JSON.stringify(got.at(-1)).length;
    expect(bytes).toBeLessThan(300); // measured in the report: the whole stamped message
    console.log(`[brief 195] the stopped notice: ${bytes} bytes a second`);
  });

  it('a new engine (a restart: a new timeline) ends the notices; the followers are told by the timeline itself', async () => {
    const { stops, events, hs: h } = setup(1000);
    h.engineStopped(REASON);
    h.flush();
    await waitFor(() => stops().length === 1, 500);
    h.newTimeline('restart');
    for (let i = 0; i < 3; i++) vi.advanceTimersByTime(1000), h.flush();
    await new Promise((r) => setTimeout(r, 0));
    expect(stops()).toHaveLength(1);
    const ev = events();
    expect(ev.findIndex((e) => e.type === 'timeline')).toBeGreaterThan(ev.findIndex((e) => e.type === 'engineStopped'));
  });

  it('the relay sends the notice to followers (a viewer event)', () => {
    expect(VIEWER_EVENTS.has('engineStopped')).toBe(true);
  });
});
