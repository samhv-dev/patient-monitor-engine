// Plan pump-rack-tci.md C2, end to end through the classroom relay as a process of its own (`node relay/bin.ts`, the kit
// runs the bundled bin), on port 10021 (this piece's range): a host session on a REAL engine joins it over a WebSocket,
// a pump tablet's socket signs in on the learner PIN, loads a stock propofol syringe on channel 1, programs it, runs it
// at 20 mL/h and gives a 2 mL bolus. What is pinned is the host ENGINE's own state afterwards, not only the acks: the
// `drugs` event's pump channel runs at 20 mL/h with its volume falling, and the patient's propofol total is the bolus's
// 20 mg plus what the infusion delivered (10 mg/mL × 20 mL/h × the seconds run).
import { spawn } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createEngine, type EngineEvent } from '@pme/engine-core';
import { HostSession, type HostTarget } from '../../src/session/host-session.ts';
import { createStamper, PUMP_ISSUED_BY } from '../../src/protocol.ts';
import { createWebSocketTransport } from '../../src/transport/websocket.ts';
import { loadFormulary } from '../../src/formulary/load.ts';
import type { FormularyFiles } from '../../src/formulary/types.ts';
import { loadPumpDevices } from '../../src/pump-devices.ts';
import { waitFor } from '../helpers.ts';

const S = 'PMR234';
const LEARNER_PIN = '582913';
const PORT = 10021;
const here = (p: string) => resolve(import.meta.dirname, p);
const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const readFolder = (dir: string, skip: string[] = []) =>
  Object.fromEntries(walk(dir).filter((f) => f.endsWith('.json') && !skip.includes(relative(dir, f))).map((f) => [relative(dir, f).split('\\').join('/'), JSON.parse(readFileSync(f, 'utf8')) as unknown]));
const f = loadFormulary(readFolder(here('../../formulary')) as FormularyFiles);
const d = loadPumpDevices(readFolder(here('../../pump-devices'), ['schema.json']));
if (!f.ok || !d.ok) throw new Error('the shipped formulary or pump profiles break their source rules');
const FORMULARY = f.formulary;
const DEVICES = d.devices;

const closers: Array<() => void | Promise<void>> = [];
afterEach(async () => {
  for (const c of closers.splice(0).reverse()) await c();
});

/** `node relay/bin.ts` on PORT as a process of its own; resolves once it says it is ready. */
function relayProcess(): Promise<void> {
  const bin = here('../../relay/bin.ts');
  const p = spawn(process.execPath, ['--experimental-strip-types', '--no-warnings', bin, '--port', String(PORT), '--host', '127.0.0.1', '--quiet'], { stdio: ['ignore', 'pipe', 'pipe'] });
  closers.push(() => new Promise<void>((r) => (p.exitCode !== null ? r() : (p.once('exit', () => r()), p.kill('SIGTERM')))));
  let out = '';
  return new Promise((ok, no) => {
    const onData = (b: Buffer) => {
      out += b;
      if (/ready on ws:\/\//.test(out)) ok();
    };
    p.stdout.on('data', onData);
    p.stderr.on('data', onData);
    p.once('exit', (c) => no(new Error(`relay exited (${c}): ${out}`)));
  });
}

describe('C2 end to end: a pump tablet through the relay process changes the host engine', () => {
  it('load, program, 20 mL/h, start, a 2 mL bolus: the engine runs channel 1 at 20 mL/h and the patient has the bolus and the infusion', async () => {
    await relayProcess();
    const engine = createEngine({ seed: 7 });
    let drugs: Extract<EngineEvent, { type: 'drugs' }> | null = null;
    const offDrugs = engine.on((e) => void (e.type === 'drugs' && (drugs = e as Extract<EngineEvent, { type: 'drugs' }>)));
    closers.push(offDrugs);
    const target: HostTarget = { dispatch: (c) => engine.dispatch(c), snapshot: () => engine.snapshot(), restore: (s) => engine.restore(s), on: (fn) => engine.on(fn), now: () => engine.now(), time: () => undefined };
    const host = new HostSession({ session: S, target, stateIntervalMs: 0, learnerPin: () => LEARNER_PIN, formulary: () => FORMULARY, pumpRack: () => ['syringe', 'syringe', 'drip', 'syringe'], pumpDevices: () => DEVICES });
    closers.push(() => host.close());
    const hostWs = createWebSocketTransport({ url: `ws://127.0.0.1:${PORT}/` });
    host.addTransport(hostWs);
    closers.push(() => hostWs.close());

    // the pump tablet's own socket (what the pump page's link sends: hello with its device key and the learner PIN)
    await new Promise((r) => setTimeout(r, 300)); // the host's hello reaches the relay first (the room is the host's)
    const ws = new WebSocket(`ws://127.0.0.1:${PORT}/`);
    const got: Array<Record<string, unknown>> = [];
    ws.onmessage = (e) => got.push(JSON.parse(String(e.data)) as Record<string, unknown>);
    await new Promise((ok) => (ws.onopen = ok));
    closers.push(() => ws.close());
    const st = createStamper(S, 'pump.1');
    ws.send(JSON.stringify(st({ kind: 'hello', role: 'pump', device: 'pumptab0001', pin: LEARNER_PIN } as never)));
    await waitFor(() => got.some((m) => m.kind === 'grant' && m.to === 'pump.1' && m.granted === true), 5000, 'the pump granted');
    let n = 0;
    const press = async (body: Record<string, unknown>) => {
      const id = `pump.1-${++n}`;
      ws.send(JSON.stringify(st({ kind: 'command', body: { id, issuedBy: 'pump-page', type: 'pump', ...body } } as never)));
      await waitFor(() => got.some((m) => m.kind === 'ack' && m.commandId === id), 5000, `ack ${id}`);
      const ack = got.find((m) => m.kind === 'ack' && m.commandId === id) as { accepted: boolean; reason?: string };
      engine.advanceTo(engine.now().simT + 0.2); // the engine applies a command on its next tick
      return ack;
    };
    expect(await press({ action: 'load', ch: 1, syringe: { stock: 'propofol-10mg-ml-50ml' } })).toMatchObject({ accepted: true });
    expect(await press({ action: 'program', ch: 1, drugId: 'propofol', concentration: { amount: 10, unit: 'mg', perMl: 1 } })).toMatchObject({ accepted: true });
    expect(await press({ action: 'rate', ch: 1, rate: 20, unit: 'mL/h' })).toMatchObject({ accepted: true });
    expect(await press({ action: 'start', ch: 1 })).toMatchObject({ accepted: true });
    const startT = engine.now().simT;
    expect(await press({ action: 'bolus', ch: 1, volumeMl: 2 })).toMatchObject({ accepted: true });
    // the bolus runs at the SP-500's rapid rate for a 50 mL syringe (≈ 800 mL/h: 2 mL in 9 s); run 60 s of sim time
    engine.advanceTo(engine.now().simT + 60);
    const ranS = engine.now().simT - startT;

    // the host engine's own state: the channel, and the patient's propofol
    const ev = drugs as Extract<EngineEvent, { type: 'drugs' }> | null;
    expect(ev).not.toBeNull();
    const ch = ev!.pumps?.find((c) => c.ch === 1);
    expect(ch).toMatchObject({ state: 'running', rate: { rate: 20, unit: 'mL/h' }, rateMlH: 20, contents: { drugId: 'propofol' }, programmed: { drugId: 'propofol' } });
    // infused: the bolus's 2 mL plus 20 mL/h for the time run, less the 9 s the bolus ran instead of the rate (D7, E1)
    expect(ch!.infusedMl).toBeGreaterThan(2 + (20 * (ranS - 12)) / 3600);
    expect(ch!.infusedMl).toBeLessThan(2 + (20 * ranS) / 3600 + 0.05);
    expect(ch!.volumeMl).toBeCloseTo(50 - ch!.infusedMl, 6);
    const propofol = ev!.drugs.find((r) => r.id === 'propofol');
    expect(propofol?.totalAmount).toBeCloseTo(ch!.infusedMl * 10, 1); // mg: every mL the channel moved, at 10 mg/mL
    expect(propofol!.totalAmount).toBeGreaterThan(20);
    expect(propofol!.cp).toBeGreaterThan(0);
    // and every press was filed as the pump's (what the host's Log and the record read)
    const applied = got.filter((m) => m.kind === 'event').flatMap((m) => m.body as Array<{ type: string; resolved?: { command: { issuedBy: string; by?: string } } }>).filter((e) => e.type === 'commandApplied');
    expect(applied.length).toBeGreaterThanOrEqual(5);
    expect(applied.every((e) => e.resolved?.command.issuedBy === PUMP_ISSUED_BY && e.resolved.command.by === 'pumptab0001')).toBe(true);
  }, 60_000);
});
