// HostSession ↔ scenario hook (Stage 6b): every scenario action goes to the hook when there is one; `applied`
// replaces the command in commandApplied; load and pause/resume become sticky; submit()/publish() for the runner.
import { afterEach, describe, expect, it } from 'vitest';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { HostSession, type ScenarioHook } from '../../src/session/host-session.ts';
import { createStamper, type AppliedResolution, type WireEvent, type WireMessage } from '../../src/protocol.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { collect, waitFor } from '../helpers.ts';

const S = 'HOK234';
let hs: HostSession | null = null;
afterEach(() => hs?.close());

function setup(hook: ScenarioHook, welcome: WireEvent[] = []) {
  const host = manualHost();
  const hub = createInProcessHub();
  hs = new HostSession({ session: S, target: host, stateIntervalMs: 0, scenario: hook, welcomeEvents: () => welcome });
  hs.addTransport(hub.connect());
  const peer = hub.connect();
  const got = collect(peer);
  const stamp = createStamper(S, 'peer-1');
  let n = 0;
  const command = (body: Record<string, unknown>) => peer.send(stamp({ kind: 'command', body: { id: `k${++n}`, issuedBy: 'test', ...body } as never }));
  const events = () => got.flatMap((m) => (m.kind === 'event' ? m.body : []));
  const of = <K extends WireMessage['kind']>(k: K) => got.filter((m) => m.kind === k) as Array<Extract<WireMessage, { kind: K }>>;
  return { host, hub, peer, stamp, command, events, of, hs: hs as HostSession };
}

describe('HostSession scenario hook', () => {
  it('routes bookmarks to the hook too, and announces the hook’s applied command', async () => {
    const seen: string[] = [];
    const { command, events, hs } = setup((c) => {
      seen.push(c.action);
      return { accepted: true, tick: 7, applied: { ...c, target: 'labelled' } };
    });
    command({ type: 'scenario', action: 'bookmark' });
    await waitFor(() => events().some((e) => e.type === 'commandApplied'));
    expect(seen).toEqual(['bookmark']);
    expect(hs.bookmarks()).toEqual([]); // the hook owns bookmarks now
    const a = events().find((e) => e.type === 'commandApplied') as Extract<WireEvent, { type: 'commandApplied' }>;
    expect((a.resolved as AppliedResolution).command).toMatchObject({ action: 'bookmark', target: 'labelled' });
  });

  it('a refused action is acked with the hook’s reason', async () => {
    const { command, of } = setup(() => ({ accepted: false, tick: 0, reason: 'no scenario loaded' }));
    command({ type: 'scenario', action: 'goto', target: 'x' });
    await waitFor(() => of('ack').length === 1);
    expect(of('ack')[0]).toMatchObject({ accepted: false, reason: 'no scenario loaded' });
  });

  it('late joiners get the sticky load (with its doc), the scenario run state, then the welcome events', async () => {
    const welcome: WireEvent[] = [{ type: 'scenario', t: 12, stateId: 'vf' }];
    const { command, peer, stamp, of } = setup((c) => ({ accepted: true, tick: 1, applied: c.action === 'load' ? { ...c, doc: { id: 'd' } } : c }), welcome);
    command({ type: 'scenario', action: 'load', target: 'd' });
    command({ type: 'scenario', action: 'pause' });
    await waitFor(() => of('ack').length === 2);
    peer.send(stamp({ kind: 'hello', role: 'controller' }));
    await waitFor(() => of('snapshot').length === 1);
    const msg = of('event').at(-1)!;
    const body = msg.body.map((e) => (e.type === 'commandApplied' ? `${((e.resolved as AppliedResolution).command as { action: string }).action}${(e.resolved as AppliedResolution).replay ? '*' : ''}` : e.type));
    expect(body).toEqual(['load*', 'pause*', 'scenario']);
  });

  it('submit() applies a host-side command like a remote one (stats + commandApplied); publish() broadcasts', async () => {
    const { events, hs } = setup(() => ({ accepted: true, tick: 0 }));
    const r = await hs.submit({ id: 's1', issuedBy: 'scenario', type: 'setTarget', variable: 'hr', value: 99 });
    expect(r.accepted).toBe(true);
    hs.publish({ type: 'scenario', t: 1, stateId: 'x' });
    await waitFor(() => events().some((e) => e.type === 'scenario'));
    expect(hs.stats.applied).toBe(1);
    expect(events().some((e) => e.type === 'commandApplied' && e.commandId === 's1')).toBe(true);
    const bad = await hs.submit({ id: 's2', issuedBy: 'scenario', type: 'setTarget', variable: 'hr', value: 999 });
    expect(bad.accepted).toBe(false);
    expect(hs.stats.rejected).toBe(1);
  });
});
