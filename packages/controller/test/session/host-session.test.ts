// HostSession against a raw peer on the in-process hub (the peer plays controller/viewer by hand).
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { HostSession, STAGE_LEAD_TICKS } from '../../src/session/host-session.ts';
import { createStamper, type AppliedResolution, type ManagedTransport, type WireMessage } from '../../src/protocol.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { collect, sleep, waitFor } from '../helpers.ts';

const S = 'HST234';
let hs: HostSession | null = null;
afterEach(() => hs?.close());

function setup(opts: Partial<ConstructorParameters<typeof HostSession>[0]> = {}) {
  const host = manualHost();
  const hub = createInProcessHub();
  hs = new HostSession({ session: S, target: host, stateIntervalMs: 0, ...opts });
  hs.addTransport(hub.connect());
  const peer = hub.connect();
  const got = collect(peer);
  const stamp = createStamper(S, 'peer-1');
  let n = 0;
  const command = (body: Record<string, unknown>) => peer.send(stamp({ kind: 'command', body: { id: `k${++n}`, issuedBy: 'test', ...body } as never }));
  const of = <K extends WireMessage['kind']>(k: K) => got.filter((m) => m.kind === k) as Array<Extract<WireMessage, { kind: K }>>;
  const events = () => of('event').flatMap((m) => m.body);
  return { host, peer, got, stamp, command, of, events, hs: hs as HostSession };
}
const hello = (peer: ManagedTransport, stamp: ReturnType<typeof createStamper>, role: 'viewer' | 'controller' = 'viewer') => peer.send(stamp({ kind: 'hello', role }));

describe('HostSession', () => {
  it('says hello as host on every transport it is given', async () => {
    setup();
    const hub = createInProcessHub();
    const watcher = hub.connect();
    const got = collect(watcher);
    hs!.addTransport(hub.connect());
    await waitFor(() => got.some((m) => m.kind === 'hello' && m.role === 'host'));
  });

  it('answers a hello with sticky replays, then a fresh snapshot', async () => {
    const { host, peer, stamp, command, of } = setup();
    command({ type: 'device', action: { device: 'ecg', action: 'lead', value: 'V2', lane: 1 } });
    await waitFor(() => of('ack').length === 1);
    host.advance(1000);
    hello(peer, stamp);
    await waitFor(() => of('snapshot').length === 1);
    const snap = of('snapshot')[0]!;
    expect(snap.body.tick).toBe(host.engine.now().tick);
    const isReplay = (e: unknown) => (e as { type: string }).type === 'commandApplied' && !!((e as { resolved: AppliedResolution }).resolved.replay);
    const replayMsg = of('event').find((m) => m.body.some(isReplay))!;
    expect(replayMsg.body.filter(isReplay)).toHaveLength(1);
    expect(replayMsg.seq).toBeLessThan(snap.seq); // replays first: the viewer applies them before restoring
  });

  it('dispatches commands, acks the issuer, and announces commandApplied with the applied tick', async () => {
    const { command, of, events, host } = setup();
    command({ type: 'setTarget', variable: 'hr', value: 100, ramp: { durationS: 4 } });
    await waitFor(() => of('ack').length === 1 && events().some((e) => e.type === 'commandApplied'));
    const ack = of('ack')[0]!;
    expect(ack).toMatchObject({ commandId: 'k1', accepted: true, tick: host.engine.now().tick + 1 });
    const applied = events().find((e) => e.type === 'commandApplied')!;
    expect((applied as { resolved: AppliedResolution }).resolved.command).toMatchObject({ id: 'k1', atTick: ack.tick });
  });

  it('acks rejections with the engine reason, and rejects MODELED-only and 6b-only commands', async () => {
    const { command, of } = setup();
    command({ type: 'setTarget', variable: 'spo2', value: 90 }); // Stage 2 accepts sbp; spo2 is Stage 3
    command({ type: 'pin', variable: 'hr', value: 60 });
    command({ type: 'scenario', action: 'goto', target: 'vf' });
    command({ type: 'time', action: 'jump', value: 60 });
    await waitFor(() => of('ack').length === 4);
    expect(of('ack').map((a) => a.accepted)).toEqual([false, false, false, false]);
    expect(of('ack')[0]!.reason).toMatch(/Stage 3/);
    expect(of('ack')[1]!.reason).toMatch(/MODELED/);
    expect(of('ack')[2]!.reason).toMatch(/Stage 6b/);
  });

  it('hands scenario load/goto/trigger to the Stage 6b hook when one is given', async () => {
    const seen: string[] = [];
    const { command, of } = setup({ scenario: (c) => (seen.push(c.action), { accepted: true, tick: 0 }) });
    command({ type: 'scenario', action: 'trigger', target: 'shock' });
    await waitFor(() => of('ack').length === 1);
    expect(seen).toEqual(['trigger']);
    expect(of('ack')[0]!.accepted).toBe(true);
  });

  it('never forwards local-only audio events (tone, toneCancel)', async () => {
    const { host, events } = setup();
    host.advance(5000);
    await sleep(10);
    const types = new Set(events().map((e) => e.type));
    expect(types.has('beat')).toBe(true);
    expect(types.has('measurement')).toBe(true);
    expect(types.has('tone')).toBe(false);
    expect(types.has('toneCancel')).toBe(false);
  });

  it('batches the events of one frame into one message', async () => {
    const { host, of } = setup();
    host.advance(3000); // one synchronous burst = one "frame"
    await sleep(5);
    expect(of('event')).toHaveLength(1);
    expect(of('event')[0]!.body.length).toBeGreaterThan(3);
  });

  it('time commands pause/scale the target, emit state at once, and replay to late joiners', async () => {
    const { host, command, of, events, peer, stamp } = setup();
    command({ type: 'time', action: 'pause' });
    command({ type: 'time', action: 'scale', value: 2 });
    command({ type: 'time', action: 'scale', value: 9 });
    await waitFor(() => of('ack').length === 3);
    expect(host.paused).toBe(true);
    expect(host.scale).toBe(2);
    expect(of('ack')[2]!.accepted).toBe(false);
    expect(events().filter((e) => e.type === 'state').length).toBeGreaterThanOrEqual(2);
    hello(peer, stamp);
    await waitFor(() => of('snapshot').length === 1);
    const replayed = events().filter((e) => e.type === 'commandApplied' && (e.resolved as AppliedResolution).replay).map((e) => ((e as { resolved: AppliedResolution }).resolved.command as { action: string }).action);
    expect(replayed.sort()).toEqual(['pause', 'scale']);
  });

  it("forwards the engine's own state (engine request E1, delivered by Stage 2) with a ramping flag", async () => {
    const { command, of, events, hs: h, host } = setup();
    command({ type: 'setTarget', variable: 'hr', value: 120, ramp: { durationS: 10 } });
    await waitFor(() => of('ack').length === 1);
    host.advance(1000);
    h.emitState(); // a no-op now: the engine emits its own 1 Hz state, with the ramp's truth, not the target
    await sleep(5);
    const st = events().filter((e) => e.type === 'state').at(-1) as Extract<ReturnType<typeof events>[number], { type: 'state' }>;
    expect(st.values.hr).toBeGreaterThan(75);
    expect(st.values.hr).toBeLessThan(120);
    expect(st.control.hr).toBe('ramping');
    host.advance(10_000);
    h.emitState();
    await sleep(5);
    const st2 = events().filter((e) => e.type === 'state').at(-1) as typeof st;
    expect(st2.values.hr).toBe(120);
    expect(st2.control.hr).toBeUndefined();
  });

  it('aligns a stageGroup on one tick STAGE_LEAD_TICKS ahead', async () => {
    const { command, of, host } = setup();
    const t0 = host.engine.now().tick;
    command({ type: 'setTarget', variable: 'hr', value: 90, stageGroup: 'g' });
    await waitFor(() => of('ack').length === 1);
    host.advance(40);
    command({ type: 'setRhythm', rhythm: 'sinus', stageGroup: 'g' });
    await waitFor(() => of('ack').length === 2);
    expect(of('ack').map((a) => a.tick)).toEqual([t0 + STAGE_LEAD_TICKS, t0 + STAGE_LEAD_TICKS]);
  });

  it('bookmarks and restores, then re-announces itself so viewers resync', async () => {
    const { host, command, of, hs: h } = setup();
    host.advance(2000);
    command({ type: 'scenario', action: 'bookmark' });
    await waitFor(() => of('ack').length === 1);
    expect(h.bookmarks()).toEqual(['Bookmark 1']);
    host.advance(5000);
    const hellos = of('hello').length;
    command({ type: 'scenario', action: 'restoreBookmark', target: 'Bookmark 1' });
    await waitFor(() => of('ack').length === 2 && of('hello').length === hellos + 1);
    expect(host.engine.now().tick).toBe(100);
    command({ type: 'scenario', action: 'restoreBookmark', target: 'nope' });
    await waitFor(() => of('ack').length === 3);
    expect(of('ack')[2]!.accepted).toBe(false);
  });
});
