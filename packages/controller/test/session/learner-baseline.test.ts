// Plan learner-action-remote.md L0: the baseline the learner remote's pieces are measured against. Every test here PINS
// TODAY (main at 8344539d): no learner device may give a drug or draw a sample, a sample is an engine event a follower
// reproduces at the same tick, a /2 sample action counts only by its taking, and the drug library the formulary must
// cover has 61 injectable ids. A later piece that changes one of these on purpose changes the pin in its own PR and says
// so (L3/L4: the learner role; L5: a real draw satisfying a sample action; L10a: the 120 s turnaround).
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine, DRUGS, DRUG_IDS, turnaroundFor, type Command, type EngineEvent } from '@pme/engine-core';
import { HostSession, type HostTarget } from '../../src/session/host-session.ts';
import { ControllerSession } from '../../src/session/controller-session.ts';
import { ViewerSync } from '../../src/session/viewer-sync.ts';
import { ScenarioDriver } from '../../src/scenario/driver.ts';
import { createInProcessHub } from '../../src/transport/in-process.ts';
import { createStamper, type ManagedTransport, type Role, type WireMessage } from '../../src/protocol.ts';
import { startRelay, type RelayHandle } from '../../relay/server.ts';
import { manualHost } from '../fakes/manual-host.ts';
import { manualViewer } from '../fakes/manual-viewer.ts';
import { minimalV2 } from '../scenario/fixtures-v2.ts';
import { collect, sleep, waitFor } from '../helpers.ts';

const S = 'RMT234'; // SESSION_ALPHABET: no L, I, O, 0 or 1
const DRUG = { type: 'applyEvent', event: { kind: 'drug', drugId: 'epinephrine', dose: 1, unit: 'mg', route: 'iv' } };
const LAB = { type: 'applyEvent', event: { kind: 'lab', panel: 'abg' } };

// ---- at the HOST, with no relay in between (an in-process transport stands for the relay: nothing filters) ----
type Engine = ReturnType<typeof createEngine>;
type Ack = Extract<WireMessage, { kind: 'ack' }>;
const target = (e: Engine): HostTarget => ({
  dispatch: (c) => e.dispatch(c), snapshot: () => e.snapshot(), restore: (s) => e.restore(s), on: (f) => e.on(f), now: () => e.now(), time: () => undefined,
});
const hosts: HostSession[] = [];
afterEach(() => {
  for (const h of hosts.splice(0)) h.close();
});
function hostRig() {
  const engine = createEngine({ seed: 7 });
  const host = new HostSession({ session: S, target: target(engine), stateIntervalMs: 0 });
  hosts.push(host);
  const hub = createInProcessHub();
  host.addTransport(hub.connect());
  const wire = hub.connect();
  return { engine, wire, got: collect(wire) };
}
const peer = (t: ManagedTransport, from: string, role: 'defib' | 'viewer', device?: string) => {
  const st = createStamper(S, from);
  let n = 0;
  return {
    hello: () => t.send(st({ kind: 'hello', role, ...(device ? { show: 'defib' as const, device } : {}) })),
    command: (body: Record<string, unknown>) => {
      const id = `${from}-${++n}`;
      t.send(st({ kind: 'command', body: { id, issuedBy: from, ...body } as never }));
      return id;
    },
  };
};
const ackOf = (got: WireMessage[], id: string) => got.find((m): m is Ack => m.kind === 'ack' && m.commandId === id);
const appliedIds = (got: WireMessage[]) =>
  got.flatMap((m) => (m.kind === 'event' ? m.body : [])).filter((e) => e.type === 'commandApplied').map((e) => (e as { commandId: string }).commandId);

describe('L0 at the host: no learner device gives a drug or draws a sample today', () => {
  it.each([['drug', DRUG], ['lab sample', LAB]])("a viewer's %s is refused 'a viewer cannot command', and nothing is applied", async (_w, body) => {
    const x = hostRig();
    const phone = peer(x.wire, 'phone-1', 'viewer');
    phone.hello();
    await waitFor(() => x.got.some((m) => m.kind === 'snapshot'));
    const before = JSON.stringify(x.engine.snapshot());
    const id = phone.command(body);
    await waitFor(() => ackOf(x.got, id) !== undefined);
    expect(ackOf(x.got, id)).toMatchObject({ accepted: false, reason: 'a viewer cannot command' });
    await Promise.resolve();
    expect(appliedIds(x.got)).not.toContain(id);
    expect(JSON.stringify(x.engine.snapshot())).toBe(before);
  });

  it.each([['drug', DRUG], ['lab sample', LAB]])("a defib peer's %s is refused with the defibrillator window's reason, and nothing is applied", async (_w, body) => {
    const x = hostRig();
    const win = peer(x.wire, 'defib-win', 'defib', 'bed2defib01');
    win.hello();
    await waitFor(() => x.got.some((m) => m.kind === 'snapshot'));
    const before = JSON.stringify(x.engine.snapshot());
    const id = win.command(body);
    await waitFor(() => ackOf(x.got, id) !== undefined);
    expect(ackOf(x.got, id)?.accepted).toBe(false);
    expect(ackOf(x.got, id)?.reason).toMatch(/^The defibrillator window sends Charge and Shock only/);
    await Promise.resolve();
    expect(appliedIds(x.got)).not.toContain(id);
    expect(JSON.stringify(x.engine.snapshot())).toBe(before);
  });
});

// ---- at the RELAY (a real relay on a fake clock; the host is a raw socket that only listens) ----
let relay: RelayHandle | null = null;
const closers: Array<() => void> = [];
afterEach(async () => {
  for (const c of closers.splice(0)) c();
  await relay?.close();
  relay = null;
});
interface Sock { got: Array<Record<string, unknown>>; send: (body: Record<string, unknown>) => void }
async function join(from: string, role: Role, extra: Record<string, unknown> = {}): Promise<Sock> {
  const ws = new WebSocket(`ws://127.0.0.1:${relay!.port}/${role === 'host' ? '' : '?e2e-remote'}`);
  const stamp = createStamper(S, from);
  const s: Sock = { got: [], send: (body) => ws.send(JSON.stringify(stamp(body as never))) };
  ws.onmessage = (e) => {
    const d = String(e.data);
    if (!d.startsWith('{"relay":"hb"')) s.got.push(JSON.parse(d) as Record<string, unknown>);
  };
  await new Promise((ok) => (ws.onopen = ok));
  closers.push(() => ws.close());
  s.send({ kind: 'hello', role, ...extra });
  await waitFor(() => s.got.some((f) => f.relay === 'peers'), 2000, `${from} admitted`);
  return s;
}
const errors = (s: Sock) => s.got.filter((f) => f.relay === 'error') as Array<{ code: string; message: string }>;

describe('L0 at the relay: a learner socket from another device gives no drug and draws no sample', () => {
  it("a viewer's drug and a viewer's sample, a defib window's drug and its sample: each `forbidden`, none reaches the host", async () => {
    let clock = 1_000_000;
    relay = await startRelay({ port: 0, host: '127.0.0.1', heartbeatMs: 60_000, takenCheckMs: 300, remoteRoles: 'viewer', isLocal: (_a, req) => !req?.url?.includes('e2e-remote'), now: () => clock });
    const host = await join('host-h1', 'host');
    const viewer = await join('view-v1', 'viewer', { show: 'learner', device: 'phone0001' });
    const defib = await join('defib-d1', 'defib', { show: 'defib', device: 'window0001' });
    const cases: Array<[Sock, string, Record<string, unknown>, RegExp]> = [
      [viewer, 'v-drug', DRUG, /^viewer may not send commands$/],
      [viewer, 'v-lab', LAB, /^viewer may not send commands$/],
      [defib, 'd-drug', DRUG, /Charge and Shock/],
      [defib, 'd-lab', LAB, /Charge and Shock/],
    ];
    for (const [s, id, body, why] of cases) {
      clock += 1000; // one a second: the defib rate limit is not what refuses them
      const before = errors(s).length;
      s.send({ kind: 'command', body: { id, issuedBy: 'learner', ...body } });
      await waitFor(() => errors(s).length === before + 1, 2000, `refused: ${id}`);
      expect(errors(s).at(-1), id).toMatchObject({ code: 'forbidden' });
      expect(errors(s).at(-1)?.message, id).toMatch(why);
    }
    await sleep(150);
    expect(host.got.filter((m) => m.kind === 'command')).toEqual([]);
  });
});

// ---- a sample is an engine event the follower reproduces (§4 D6), after today's 120 s ----
describe('L0: a lab sample drawn on the host comes back on a follower at the same tick, 120 s later', () => {
  it("applyEvent lab abg from the instructor's controller: the host's and the follower's labResult agree in time, draw and values", async () => {
    const clock = { wall: 1_000_000 };
    const wallNow = () => clock.wall;
    const host = manualHost();
    const hub = createInProcessHub();
    const hs = new HostSession({ session: S, target: host, wallNow, stateIntervalMs: 0 });
    hosts.push(hs);
    hs.addTransport(hub.connect());
    const ctl = new ControllerSession({ session: S, transport: hub.connect(), wallNow });
    await waitFor(() => ctl.hostOnline);
    const v = manualViewer();
    const sync = new ViewerSync({ session: S, transport: hub.connect(), target: v, engineVersion: host.engine.version, wallNow });
    type LabResult = Extract<EngineEvent, { type: 'labResult' }>;
    const atHost: LabResult[] = [];
    const atFollower: LabResult[] = [];
    host.engine.on((e) => void (e.type === 'labResult' && atHost.push(e)));
    v.engine.on((e) => void (e.type === 'labResult' && atFollower.push(e)));
    const run = async (seconds: number) => {
      for (let i = 0; i < seconds * 50; i++) {
        clock.wall += 20;
        host.advance(20);
        if (i % 10 === 0) hs.emitState();
        await new Promise((r) => setTimeout(r, 0));
        sync.follow();
        v.advance(20);
      }
    };
    await waitFor(() => sync.status === 'synced');
    await run(2);
    const ack = await ctl.send(LAB as never);
    expect(ack.accepted).toBe(true);
    const drawnAt = ack.tick * 0.02;
    await run(1); // the follower has mirrored the draw and passed its tick: the sample is in its own engine now
    expect(sync.status).toBe('synced');
    // the rest of the turnaround on both engines in 1 s strides (the wire is idle; each engine runs its own sample)
    const until = (simT: number) => {
      while (host.engine.now().simT < simT) {
        const to = Math.min(simT, host.engine.now().simT + 1);
        host.engine.advanceTo(to);
        v.engine.advanceTo(to);
      }
    };
    const tat = turnaroundFor('abg'); // the room's analyser row (L10a: the ABL800 FLEX's measuring time, Radiometer 928-544)
    until(drawnAt + tat - 1);
    expect(atHost).toEqual([]); // not before the turnaround
    until(drawnAt + tat + 2);
    expect(sync.resyncs).toBe(0);
    expect(atHost).toHaveLength(1);
    expect(atHost[0]?.drawnAt).toBeCloseTo(drawnAt, 9);
    expect(atHost[0]?.t).toBeCloseTo(drawnAt + tat, 9);
    expect(atHost[0]?.panel).toBe('abg');
    expect(atFollower).toEqual(atHost); // the same event at the same tick, the same frozen values
    ctl.close();
    sync.close();
  }, 300_000);
});

// ---- the /2 format: a sample action counts by its taking, never by a real draw (L5 changes this) ----
// L5 changed this pin on purpose (plan §6): an applyEvent lab is now a `sample` record with its panel, which a sample
// action with `sample: { panel }` takes in its window; an action WITHOUT `sample` (this card's) still counts only by its
// taking, so its grade is today's.
describe('L0: a /2 sample action is recorded only by its taking', () => {
  it('`scenario record` of a sample action records it; an applyEvent lab with no actionId is a sample record the action without `sample` does not take', async () => {
    const host = manualHost({ seed: 42 });
    const driver = new ScenarioDriver({ target: host });
    const card = minimalV2();
    card.id = 'lrn0';
    card.actions.push({ id: 'gas', label: 'Arterial gas', kind: 'sample', phases: ['baseline', 'early'] });
    expect(driver.load(card).ok).toBe(true);
    host.engine.advanceTo(1);
    driver.poll();
    const t = host.engine.now().simT;
    const draw = { id: 'l1', issuedBy: 'remote', ...LAB } as unknown as Command;
    expect((driver.host.dispatch(draw) as { accepted: boolean }).accepted).toBe(true); // the engine takes the sample
    // ...recorded as a sample since L5, not as a taking of the action
    expect(driver.phaseRunner!.admin).toEqual([{ seq: 1, t, source: 'remote', kind: 'sample', settings: { panel: 'abg' }, result: { accepted: true } }]);
    expect(driver.phaseRunner!.takings.gas ?? 0).toBe(0);
    const rec = await driver.hook({ id: 'h1', issuedBy: 'instructor', type: 'scenario', action: 'record', target: 'gas' });
    expect(rec.accepted).toBe(true);
    expect(driver.phaseRunner!.admin.at(-1)).toEqual({ seq: 2, t, source: 'action', actionId: 'gas', kind: 'sample', result: { accepted: true } });
    expect(driver.phaseRunner!.takings).toEqual({ gas: 1 });
  });
});

// ---- the formulary's coverage target (§5 rule 5) ----
describe("L0: the drug library's injectable ids are the formulary's coverage target", () => {
  it('65 rows, 4 of them volatiles, 61 injectable', () => {
    expect(DRUG_IDS).toHaveLength(65);
    expect(DRUG_IDS.filter((id) => DRUGS[id]?.cls === 'volatile').sort()).toEqual(['desflurane', 'isoflurane', 'n2o', 'sevoflurane']);
    expect(DRUG_IDS.filter((id) => DRUGS[id]?.cls !== 'volatile')).toHaveLength(61);
  });
});
