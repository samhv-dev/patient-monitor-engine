#!/usr/bin/env node
// Kit smoke test for the classroom relay (KR-A1): the BUILT kit's server/relay.mjs must survive real WebSocket frames.
// An HTTP request alone does not exercise the frame path: the KR-A1 kits answered /pme-relay.json and /?join= and then
// exited at the first client frame of 32 bytes or more ("bufferUtil$1.unmask is not a function").
// Three runs, each with no WS_NO_* variable inherited and no native module installed beside the kit:
//   1. relay.mjs alone (node server/relay.mjs --port 0 --static app): the bundle itself must take ws's pure-JS path;
//   2. through "Start Classroom.command" (PME_NO_OPEN=1, PME_PORT=<port>, stripped environment), as the presenter starts it;
//   3. through server/launch.mjs classroom, what "Start Classroom.cmd" runs on Windows (here on this OS's Node.js).
// Before the runs: the kit's Windows launchers (.cmd) exist, end every line with CRLF and hold only ASCII.
// Per run: a 64-byte binary frame (the relay drops it), a host hello of >= 64 bytes (answer: the relay's `peers` frame),
// a controller hello, a 1 KB host event that the relay forwards to the controller byte for byte, /pme-relay.json still
// answers; after the relay's first heartbeat sweep (10 s), a viewer that joins makes the host's `peers` frame list the
// controller with its measured round trip (`devices`, plan room-and-instruments.md R2); a ventilator says hello with a
// PIN, the host grants it, its `vent` `cmds` reach the host and the host's `vent` `clock` reaches it, byte for byte
// (R8b); a defibrillator window says hello as `defib`, its charge reaches the host byte for byte and its
// `selectEnergy` does not (`forbidden` to the window; its next shock is the host's next command) (R5c); a learner
// remote says hello as `learner` with the learner PIN, its `prep stage` is `forbidden` while pending and, once the host
// grants it, reaches the host byte for byte, while its `applyEvent drug` with a forged `by` and an instructor's
// `time pause` are `forbidden` and never reach the host (its next `prep deliver` is the host's next command) (learner
// remote L3); the relay is still running; then the relay is stopped and the port is free again.
// Room plan R1b and the kit store (docs/plans/scenario-builder.md §8 layer 2; the owner's ruling of 10 November 2026):
// each run gets a state directory of its own (relay.mjs --state-dir; the launchers' PME_STATE_DIR, which stands in for
// the kit's user-data folder): after the host hello /pme-relay.json answers lastRoom and the hidden .room.json in that
// directory holds the room code only; a card POSTed to /pme-store/scenarios/<id> is kept as version 1, the same bytes
// again write nothing, a changed card is version 2 (version 1 unchanged), the list and both versions read back, a card
// id that would leave the folder is refused, and the folder holds those files only; a debrief is written as
// debriefs/<id>.json, replaced by a re-save, listed and read back, and deleted for good. After every run the kit's own
// folder is as it was. Before the runs: the fresh build has no user-data folder, and server/store.mjs and
// app/pme-kit.json are there. A fourth run starts "Start Classroom.command" with NO PME_STATE_DIR and a HOME whose
// application-data folder holds a room code an older kit kept: the relay answers that code, the host's hello writes
// <kit>/user-data/.room.json, the old file is as it was and nothing else appears in HOME; the run's user-data folder is
// then removed, so the kit is as it was.
//   node scripts/showcase/check-relay.mjs [KIT_DIR] [--port 8690] [--json OUT.json]
// Needs Node.js >= 22 (its built-in WebSocket client). Port 8690 (and the next 9) keeps clear of a classroom on 8650.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const kit = resolve(args.find((a, i) => !a.startsWith('--') && !['--port', '--json'].includes(args[i - 1])) ?? 'pme-showcase');
const launcherPort = Number(opt('--port') ?? 8690);
const jsonOut = opt('--json') ? resolve(opt('--json')) : null;
const RELAY = join(kit, 'server/relay.mjs');
const LAUNCHER = join(kit, 'Start Classroom.command');
const WIN_LAUNCH = join(kit, 'server/launch.mjs');
for (const f of [RELAY, LAUNCHER, WIN_LAUNCH, join(kit, 'app/index.html')]) if (!existsSync(f)) throw new Error(`not a classroom kit: no ${f}`);
const USER_DATA = join(kit, 'user-data');
if (typeof WebSocket !== 'function') throw new Error(`Node.js ${process.version} has no built-in WebSocket (needs >= 22)`);

const T = 8000;
const withTimeout = (p, what) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error(`timed out (${T / 1000} s): ${what}`)), T))]);
const portFree = (port) => new Promise((ok) => {
  const s = connect(port, '127.0.0.1');
  s.once('connect', () => (s.destroy(), ok(false)));
  s.once('error', () => ok(true));
});

/** Start a process; resolve {proc, port, log()} when `ready` matches its output (group 1 = the port). */
function start(cmd, argv, env, ready) {
  return withTimeout(new Promise((ok, no) => {
    const proc = spawn(cmd, argv, { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    proc.exitInfo = null;
    const onData = (d) => {
      out += d;
      const m = ready.exec(out);
      if (m) ok({ proc, port: Number(m[1]), log: () => out });
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.once('exit', (code, sig) => {
      proc.exitInfo = { code, sig };
      no(new Error(`exited before ready (${code ?? sig}):\n${out.trim().split('\n').slice(-12).join('\n')}`));
    });
  }), `${cmd} ready`);
}

/** Open a socket; next() resolves with the next text message (or rejects if the socket closes or the relay exits). */
function socket(port, proc) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/`);
  ws.binaryType = 'arraybuffer';
  const queue = [];
  const waiting = [];
  let ended = null;
  const settle = () => {
    while (waiting.length && (queue.length || ended)) {
      const w = waiting.shift();
      if (queue.length) w.ok(queue.shift());
      else w.no(ended);
    }
  };
  ws.addEventListener('message', (e) => (queue.push(typeof e.data === 'string' ? e.data : `<binary ${e.data.byteLength}>`), settle()));
  ws.addEventListener('close', (e) => ((ended ??= new Error(`socket closed (${e.code} ${e.reason})`)), settle()));
  proc.once('exit', (code, sig) => ((ended ??= new Error(`the relay EXITED (${code ?? sig})`)), settle()));
  const opened = new Promise((ok, no) => {
    ws.addEventListener('open', ok, { once: true });
    ws.addEventListener('error', () => no(new Error('socket did not open')), { once: true });
  });
  const next = (what) => withTimeout(new Promise((ok, no) => (waiting.push({ ok, no }), settle())), what);
  /** The next message that is not the relay's heartbeat. */
  const nextReal = async (what) => {
    for (;;) {
      const m = await next(what);
      if (!m.startsWith('{"relay":"hb"')) return m;
    }
  };
  /** Resolves at the relay's next heartbeat frame (its sweep), within `ms`. */
  const heartbeat = (ms) => new Promise((ok, no) => {
    const t = setTimeout(() => no(new Error(`no heartbeat within ${ms / 1000} s`)), ms);
    ws.addEventListener('message', function on(e) {
      if (typeof e.data !== 'string' || !e.data.startsWith('{"relay":"hb"')) return;
      clearTimeout(t);
      ws.removeEventListener('message', on);
      ok();
    });
  });
  return { ws, opened: withTimeout(opened, 'socket open'), next: nextReal, heartbeat };
}

const SESSION = 'KRATST'; // a valid session code (SESSION_CODE_RE: no I, L, O, 0, 1)
const wire = (kind, from, seq, extra) => JSON.stringify({ v: 1, session: SESSION, from, seq, sentAt: Date.now(), kind, ...extra });

/** The frames. Returns the step list; throws at the first step that fails. */
async function frames(port, proc, steps, state) {
  const step = (s) => (steps.push(s), console.log(`  ok  ${s}`));
  const host = socket(port, proc);
  await host.opened;
  const bin = new Uint8Array(64).map((_, i) => i);
  host.ws.send(bin);
  step('64-byte binary frame sent (the relay drops binary frames)');
  const hello = wire('hello', 'kit-check-host-0123456789abcdef', 1, { role: 'host' });
  if (Buffer.byteLength(hello) < 64) throw new Error('hello shorter than 64 bytes');
  host.ws.send(hello);
  const peers = JSON.parse(await host.next('the peers frame after the host hello'));
  if (peers.relay !== 'peers' || peers.hostOnline !== true || peers.peers !== 0) throw new Error(`unexpected answer to hello: ${JSON.stringify(peers)}`);
  step(`host hello (${Buffer.byteLength(hello)} bytes) answered: ${JSON.stringify(peers)}`);

  const ctl = socket(port, proc);
  await ctl.opened;
  ctl.ws.send(wire('hello', 'kit-check-controller-0123456789', 1, { role: 'controller' }));
  const ctlPeers = JSON.parse(await ctl.next('the peers frame after the controller hello'));
  if (ctlPeers.relay !== 'peers' || ctlPeers.peers !== 1) throw new Error(`unexpected answer to the controller hello: ${JSON.stringify(ctlPeers)}`);
  const hostSees = JSON.parse(await host.next('the host told of the controller'));
  if (hostSees.relay !== 'peers' || hostSees.peers !== 1) throw new Error(`host not told of the controller: ${JSON.stringify(hostSees)}`);
  // the controller's hello is forwarded to the host as is
  const fwdHello = JSON.parse(await host.next('the controller hello forwarded to the host'));
  if (fwdHello.kind !== 'hello' || fwdHello.role !== 'controller') throw new Error(`host did not get the controller hello: ${JSON.stringify(fwdHello)}`);
  step('controller hello answered (peers 1); the host was told and got the hello');

  const event = wire('event', 'kit-check-host-0123456789abcdef', 2, { body: [{ type: 'kitCheck', note: 'x'.repeat(1024) }] });
  host.ws.send(event);
  const got = await ctl.next('the host event forwarded to the controller');
  if (got !== event) throw new Error(`forwarded event differs (${got.length} vs ${event.length} bytes)`);
  step(`host event (${Buffer.byteLength(event)} bytes) forwarded to the controller byte for byte`);

  const info = await withTimeout(fetch(`http://127.0.0.1:${port}/pme-relay.json`).then((r) => r.json()), '/pme-relay.json');
  if (info.relay !== 'pme' || info.port !== port) throw new Error(`/pme-relay.json: ${JSON.stringify(info)}`);
  step(`/pme-relay.json still answers: ${JSON.stringify(info)}`);
  // R1b: the host's hello is the last room; kept in the state directory, the room code only
  if (info.lastRoom !== SESSION) throw new Error(`/pme-relay.json lastRoom ${JSON.stringify(info.lastRoom)}, not ${SESSION}`);
  const kept = readFileSync(join(state, '.room.json'), 'utf8');
  if (JSON.stringify(JSON.parse(kept)) !== JSON.stringify({ lastRoom: SESSION }) || readdirSync(state).join() !== '.room.json') throw new Error(`state directory: ${readdirSync(state).join()} ${kept}`);
  step(`the last room kept in the state directory: the hidden .room.json ${kept.trim()} (the room code only)`);
  await storeSteps(port, state, step);

  // R2: the sweep pings every socket (the kit's heartbeat is 10 s); the controller's socket answers, and the host's next
  // peers frame (here: a viewer joining) lists it with that round trip
  await host.heartbeat(12_000);
  await new Promise((r) => setTimeout(r, 300)); // the pong of a loopback socket: well under a millisecond
  const view = socket(port, proc);
  await view.opened;
  view.ws.send(wire('hello', 'kit-check-viewer', 1, { role: 'viewer', show: 'learner', device: 'kitcheck0123' }));
  let table = null;
  for (let i = 0; i < 4 && !table; i++) {
    const f = JSON.parse(await host.next('the host told of the viewer, with its devices'));
    // (the sweep's own frame comes first: sent before its ping, it cannot hold that ping's answer)
    if (f.relay === 'peers' && Array.isArray(f.devices) && f.devices.some((d) => d.id === 'kit-check-viewer')) table = f.devices;
  }
  const ctlRow = table?.find((d) => d.id === 'kit-check-controller-0123456789');
  const viewRow = table?.find((d) => d.id === 'kit-check-viewer');
  if (!ctlRow || typeof ctlRow.rttMs !== 'number' || !viewRow || viewRow.show !== 'learner' || viewRow.device !== 'kitcheck0123')
    throw new Error(`the host's device table after a sweep: ${JSON.stringify(table)}`);
  step(`after one sweep the host's devices list the controller with rttMs ${ctlRow.rttMs} and the viewer showing ${viewRow.show}`);

  // R8b: the ventilator's wire. A cockpit says hello with the PIN, the host grants it, and `vent` runs between them only
  const hostNext = async (what, pred) => {
    for (let i = 0; i < 6; i++) {
      const raw = await host.next(what);
      if (pred(JSON.parse(raw))) return raw;
    }
    throw new Error(`the host never got ${what}`);
  };
  const VENT_ID = 'kit-check-ventilator';
  const vent = socket(port, proc);
  await vent.opened;
  vent.ws.send(wire('hello', VENT_ID, 1, { role: 'ventilator', pin: '4729' }));
  await hostNext('the ventilator hello', (f) => f.kind === 'hello' && f.from === VENT_ID && f.role === 'ventilator');
  host.ws.send(wire('grant', 'kit-check-host-0123456789abcdef', 3, { to: VENT_ID, granted: true }));
  for (let f = null; f?.kind !== 'grant'; ) f = JSON.parse(await vent.next('the grant at the ventilator'));
  const frame = { pawCmH2O: 5, flowLps: 0, volumeMl: 0, fio2: 0.4, peepCmH2O: 5 };
  const cmds = wire('vent', VENT_ID, 2, { body: { v: 1, kind: 'cmds', tick: 1, cmds: [{ id: 'vent-1', issuedBy: 'ventilator', type: 'externalDrive', source: 'ventilator', frame }] } });
  vent.ws.send(cmds);
  const upGot = await hostNext('the ventilator cmds', (f) => f.kind === 'vent');
  if (upGot !== cmds) throw new Error(`the ventilator's cmds differ at the host (${upGot.length} vs ${cmds.length} bytes)`);
  const clock = wire('vent', 'kit-check-host-0123456789abcdef', 4, { to: VENT_ID, body: { v: 1, kind: 'clock', ventTick: 80 } });
  host.ws.send(clock);
  let downGot = null;
  for (let i = 0; i < 4 && !downGot; i++) {
    const r = await vent.next("the host's clock at the ventilator");
    if (JSON.parse(r).kind === 'vent') downGot = r;
  }
  if (downGot !== clock) throw new Error(`the host's clock differs at the ventilator: ${downGot}`);
  step(`ventilator granted; its vent cmds (${Buffer.byteLength(cmds)} bytes) reached the host and the host's vent clock reached it, byte for byte`);
  // R5c: the learner defibrillator window. Its bare charge reaches the host as sent; its selectEnergy is refused
  // `forbidden` and never reaches the host (the shock after it is the host's next command)
  const DEFIB_ID = 'kit-check-defib';
  const defib = socket(port, proc);
  await defib.opened;
  defib.ws.send(wire('hello', DEFIB_ID, 1, { role: 'defib', show: 'defib', device: 'kitdefib0123' }));
  await hostNext('the defib hello', (f) => f.kind === 'hello' && f.from === DEFIB_ID && f.role === 'defib');
  const defibCmd = (seq, id, event) => wire('command', DEFIB_ID, seq, { body: { id, issuedBy: 'defib', type: 'applyEvent', event: { kind: 'defib', ...event } } });
  const charge = defibCmd(2, 'kit-defib-charge', { action: 'charge' });
  defib.ws.send(charge);
  const chargeGot = await hostNext('the defib charge', (f) => f.kind === 'command');
  if (chargeGot !== charge) throw new Error(`the defib charge differs at the host: ${chargeGot}`);
  defib.ws.send(defibCmd(3, 'kit-defib-select', { action: 'selectEnergy', energyJ: 360 }));
  let refusal = null;
  for (let i = 0; i < 4 && !refusal; i++) {
    const f = JSON.parse(await defib.next('the refusal of the defib selectEnergy'));
    if (f.relay === 'error') refusal = f;
  }
  if (refusal?.code !== 'forbidden') throw new Error(`the defib selectEnergy was not refused: ${JSON.stringify(refusal)}`);
  defib.ws.send(defibCmd(4, 'kit-defib-shock', { action: 'shock' }));
  const nextCmd = JSON.parse(await hostNext('the defib shock', (f) => f.kind === 'command'));
  if (nextCmd.body?.id !== 'kit-defib-shock') throw new Error(`the host's next command after the refused selectEnergy: ${JSON.stringify(nextCmd)}`);
  step(`defib window: its charge (${Buffer.byteLength(charge)} bytes) reached the host byte for byte; its selectEnergy was refused (${refusal.code}) and never reached the host`);
  // Learner remote L3: the learner PIN signs it in; granted, its own shapes reach the host, nothing else does
  const LRN_ID = 'kit-check-learner';
  const learner = socket(port, proc);
  await learner.opened;
  learner.ws.send(wire('hello', LRN_ID, 1, { role: 'learner', show: 'learner', device: 'kitlearner01', pin: '582913' }));
  await hostNext('the learner hello', (f) => f.kind === 'hello' && f.from === LRN_ID && f.role === 'learner');
  const learnerRefusal = async (what) => {
    for (let i = 0; i < 6; i++) {
      const f = JSON.parse(await learner.next(what));
      if (f.relay === 'error') return f;
    }
    return null;
  };
  const lrnCmd = (seq, body) => wire('command', LRN_ID, seq, { body: { issuedBy: 'learner', ...body } });
  const prep = { id: 'kitprep1', components: [{ productId: 'propofol', amount: 20, unit: 'mL' }] };
  learner.ws.send(lrnCmd(2, { id: 'kit-lrn-early', type: 'prep', action: 'stage', prep }));
  const early = await learnerRefusal('the refusal of a pending learner prep');
  if (early?.code !== 'forbidden') throw new Error(`a pending learner's prep was not refused: ${JSON.stringify(early)}`);
  host.ws.send(wire('grant', 'kit-check-host-0123456789abcdef', 5, { to: LRN_ID, granted: true }));
  for (let f = null; f?.kind !== 'grant'; ) f = JSON.parse(await learner.next('the grant at the learner'));
  const stageCmd = lrnCmd(3, { id: 'kit-lrn-stage', type: 'prep', action: 'stage', prep });
  learner.ws.send(stageCmd);
  const stageGot = await hostNext('the learner prep stage', (f) => f.kind === 'command');
  if (stageGot !== stageCmd) throw new Error(`the learner prep stage differs at the host: ${stageGot}`);
  learner.ws.send(lrnCmd(4, { id: 'kit-lrn-drug', type: 'applyEvent', event: { kind: 'drug', drugId: 'propofol', dose: 200, unit: 'mg', route: 'iv' }, by: 'kitlearner02' }));
  const drugNo = await learnerRefusal('the refusal of the learner drug');
  if (drugNo?.code !== 'forbidden') throw new Error(`the learner's applyEvent drug was not refused: ${JSON.stringify(drugNo)}`);
  learner.ws.send(lrnCmd(5, { id: 'kit-lrn-pause', type: 'time', action: 'pause' }));
  const pauseNo = await learnerRefusal('the refusal of the learner time pause');
  if (pauseNo?.code !== 'forbidden') throw new Error(`the instructor's time pause on a learner socket was not refused: ${JSON.stringify(pauseNo)}`);
  learner.ws.send(lrnCmd(6, { id: 'kit-lrn-deliver', type: 'prep', action: 'deliver', prepId: 'kitprep1', volumeMl: 5, route: 'iv' }));
  const afterNo = JSON.parse(await hostNext('the learner prep deliver', (f) => f.kind === 'command'));
  if (afterNo.body?.id !== 'kit-lrn-deliver') throw new Error(`the host's next command after the refused ones: ${JSON.stringify(afterNo)}`);
  step(`learner remote: pending, its prep was refused (${early.code}); granted, its prep stage (${Buffer.byteLength(stageCmd)} bytes) reached the host byte for byte; its applyEvent drug with a forged by and a time pause were refused (${drugNo.code}, ${pauseNo.code}) and never reached the host`);
  learner.ws.close();
  defib.ws.close();
  vent.ws.close();
  view.ws.close();
  host.ws.close();
  ctl.ws.close();
  await new Promise((r) => setTimeout(r, 300));
  if (proc.exitInfo) throw new Error(`the relay exited (${JSON.stringify(proc.exitInfo)})`);
  step('the relay is still running after the frames');
}

/** The kit store's paths on this server (relay.mjs, or serve.mjs with store.mjs): cards kept as versions, from here. */
async function storeSteps(port, state, step) {
  const at = `http://127.0.0.1:${port}/pme-store/`;
  const status = await withTimeout(fetch(at).then((r) => r.json()), '/pme-store/');
  if (status.store !== 'pme' || status.writable !== true) throw new Error(`/pme-store/: ${JSON.stringify(status)}`);
  const cardText = (title) => `${JSON.stringify({ schema: 'pme-scenario/2', id: 'kit-check-card', title }, null, 2)}\n`;
  const post = (id, body) => withTimeout(fetch(`${at}scenarios/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body }), 'a store POST');
  const one = await post('kit-check-card', cardText('first'));
  const again = await post('kit-check-card', cardText('first'));
  const two = await post('kit-check-card', cardText('second'));
  if (one.status !== 201 || again.status !== 200 || two.status !== 201 || (await two.json()).v !== 2) throw new Error(`store writes answered ${one.status} ${again.status} ${two.status}`);
  const list = await (await fetch(`${at}scenarios/`)).json();
  const v1 = await (await fetch(`${at}scenarios/kit-check-card/1`)).text();
  const v2 = await (await fetch(`${at}scenarios/kit-check-card/2`)).text();
  if (list.cards?.length !== 1 || list.cards[0].versions.length !== 2 || list.cards[0].title !== 'second' || v1 !== cardText('first') || v2 !== cardText('second')) throw new Error(`store reads: ${JSON.stringify(list)}`);
  const out = await post('..%2F..%2Fescape', JSON.stringify({ id: '../../escape' }));
  if (out.status !== 400) throw new Error(`a card id that leaves the folder answered ${out.status}`);
  const files = readdirSync(join(state, 'scenarios', 'kit-check-card')).sort();
  if (readdirSync(join(state, 'scenarios')).join() !== 'kit-check-card' || files.length !== 2 || !files.every((f) => /^v000[12]-\d{4}-\d\d-\d\dT\d\d-\d\d-\d\dZ\.json$/.test(f))) throw new Error(`store folder: ${files.join()}`);
  step(`kit store: a card kept as version 1, the same bytes wrote nothing, a change is version 2 (${files.join(', ')}); the list and both versions read back; an id that leaves the folder refused (400)`);
  // brief 139 PR 2: a debrief, one file, replaced by a re-save of its run, listed and read from here, deleted for good
  const entry = (resident) => JSON.stringify({ schema: 'pme-archive-entry/1', id: 'kitcheck1', resident, debrief: {} });
  const put = (body) => withTimeout(fetch(`${at}debriefs/kitcheck1`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body }), 'a debrief PUT');
  if ((await put(entry('Dr One'))).status !== 200 || (await put(entry('Dr Two'))).status !== 200) throw new Error('debrief writes refused');
  const dl = await (await fetch(`${at}debriefs/`)).json();
  const read = await (await fetch(`${at}debriefs/kitcheck1`)).text();
  if (dl.debriefs?.length !== 1 || read !== entry('Dr Two') || readdirSync(join(state, 'debriefs')).join() !== 'kitcheck1.json') throw new Error(`debriefs: ${JSON.stringify(dl)} ${readdirSync(join(state, 'debriefs')).join()}`);
  const del = await fetch(`${at}debriefs/kitcheck1`, { method: 'DELETE' });
  if (del.status !== 200 || readdirSync(join(state, 'debriefs')).length !== 0) throw new Error(`a debrief delete: ${del.status} ${readdirSync(join(state, 'debriefs')).join()}`);
  step('kit store, debriefs: kitcheck1.json written, replaced by a re-save, listed and read back from this computer, deleted for good (the folder empty)');
}

async function stop(proc, port, steps) {
  if (!proc.exitInfo) {
    const gone = new Promise((r) => proc.once('exit', r));
    proc.kill('SIGTERM');
    await withTimeout(gone, 'stop');
  }
  for (let i = 0; i < 20 && !(await portFree(port)); i++) await new Promise((r) => setTimeout(r, 100));
  if (!(await portFree(port))) throw new Error(`port ${port} still listening after the stop`);
  steps.push(`stopped; port ${port} free`);
  console.log(`  ok  stopped; port ${port} free`);
}

// No WS_NO_* from the caller: the kit must work without them.
const cleanEnv = Object.fromEntries(Object.entries(process.env).filter(([k]) => !k.startsWith('WS_NO_')));
const runs = [
  {
    name: 'relay.mjs alone (the bundle)',
    go: (state) => start(process.execPath, [RELAY, '--port', '0', '--host', '127.0.0.1', '--static', join(kit, 'app'), '--state-dir', state], cleanEnv, /ready on ws:\/\/[^:]+:(\d+)\//),
  },
  {
    name: `Start Classroom.command (PME_PORT=${launcherPort}, stripped environment)`,
    go: (state) => start('/usr/bin/env', ['-i', 'PATH=/usr/bin:/bin', 'PME_NO_OPEN=1', `PME_PORT=${launcherPort}`, `PME_NODE=${process.execPath}`, `PME_STATE_DIR=${state}`, '/bin/bash', LAUNCHER], undefined, /ADDRESS: http:\/\/127\.0\.0\.1:(\d+)\//),
  },
  {
    name: `server/launch.mjs classroom, as Start Classroom.cmd runs it (PME_PORT=${launcherPort}, stripped environment)`,
    go: (state) => start(process.execPath, [WIN_LAUNCH, 'classroom'], { PATH: '/usr/bin:/bin', PME_NO_OPEN: '1', PME_PORT: String(launcherPort), PME_STATE_DIR: state }, /ADDRESS: http:\/\/127\.0\.0\.1:(\d+)\//),
  },
];
/** Every file of the kit (path and size): a run must leave its own folder as it was. */
const listing = (dir, at = '') => readdirSync(join(dir, at), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listing(dir, join(at, e.name)) : [join(at, e.name)])).sort().join('\n');
const results = [];
{
  console.log('\n== the kit as built: no user-data folder; the store and the kit marker are there');
  const why = existsSync(USER_DATA) ? `${USER_DATA} exists: a kit must ship without the clinicians' data folder` : !existsSync(join(kit, 'server/store.mjs')) ? 'no server/store.mjs' : !existsSync(join(kit, 'app/pme-kit.json')) ? 'no app/pme-kit.json' : null;
  console.log(`  ${why ? 'FAIL' : 'ok '}  ${why ?? 'no user-data/; server/store.mjs and app/pme-kit.json present'}`);
  results.push({ run: 'the kit as built', pass: !why, steps: why ? [] : ['no user-data/', 'server/store.mjs', 'app/pme-kit.json'], ...(why ? { error: why } : {}) });
}
const kitBefore = listing(kit);
{
  // the Windows launchers: cmd.exe needs CRLF (an LF-only batch file loses its goto labels) and reads them in the OEM code page
  console.log('\n== Windows launchers (.cmd): CRLF line endings, ASCII only');
  const steps = [];
  let error = null;
  for (const name of ['Start Classroom.cmd', 'Start Simulator.cmd']) {
    const f = join(kit, name);
    const b = existsSync(f) ? readFileSync(f) : null;
    const lf = b ? b.filter((c, i) => c === 0x0a && b[i - 1] !== 0x0d).length : 0;
    const high = b ? b.filter((c) => c > 0x7e || (c < 0x20 && c !== 0x09 && c !== 0x0a && c !== 0x0d)).length : 0;
    const why = !b ? 'missing' : lf ? `${lf} line(s) end in LF alone` : high ? `${high} non-ASCII byte(s)` : !b.includes('server\\launch.mjs') ? 'does not run server\\launch.mjs' : null;
    if (why) error ??= `${name}: ${why}`;
    else steps.push(`${name}: ${b.length} bytes, CRLF, ASCII`);
    console.log(`  ${why ? 'FAIL' : 'ok '}  ${name}: ${why ?? 'CRLF, ASCII, runs server\\launch.mjs'}`);
  }
  results.push({ run: 'Windows launchers (.cmd files)', pass: !error, steps, ...(error ? { error } : {}) });
}
for (const run of runs) {
  console.log(`\n== ${run.name}`);
  const steps = [];
  let r = null;
  const state = join(mkdtempSync(join(tmpdir(), 'pme-check-state-')), 'PME Classroom'); // made by the relay, at its write
  try {
    r = await run.go(state);
    console.log(`  ok  ready on port ${r.port}`);
    await frames(r.port, r.proc, steps, state);
    await stop(r.proc, r.port, steps);
    if (listing(kit) !== kitBefore) throw new Error('the run changed the kit\'s own folder');
    steps.push('the kit\'s own folder is as it was');
    console.log('  ok  the kit\'s own folder is as it was');
    results.push({ run: run.name, pass: true, steps });
  } catch (err) {
    console.log(`  FAIL ${err.message}`);
    if (r) {
      await new Promise((w) => setTimeout(w, 500)); // the launcher's own "stopped unexpectedly" text
      console.log(`  --- relay output (last lines) ---\n${r.log().trim().split('\n').slice(-16).map((l) => `  | ${l}`).join('\n')}`);
      try {
        await stop(r.proc, r.port, steps);
      } catch (e) {
        console.log(`  (stop: ${e.message})`);
      }
    }
    results.push({ run: run.name, pass: false, steps, error: err.message, output: r?.log().split('\n').slice(-16) });
  }
  rmSync(join(state, '..'), { recursive: true, force: true });
}
{
  // the launcher as a presenter starts it: no PME_STATE_DIR. The kit's own user-data folder is used; the old
  // application-data folder (in a HOME made here) is read once and left as it is
  const name = `Start Classroom.command, no PME_STATE_DIR: <kit>/user-data, the old application-data code read once`;
  console.log(`\n== ${name}`);
  const steps = [];
  const home = mkdtempSync(join(tmpdir(), 'pme-check-home-'));
  const oldDir = join(home, 'Library', 'Application Support', 'PME Classroom');
  const OLD_CODE = 'QQBAWA';
  const oldText = `${JSON.stringify({ lastRoom: OLD_CODE })}\n`;
  let r = null;
  const theirs = existsSync(USER_DATA); // a used kit's own data: never touched, and this run is not made
  try {
    if (theirs) throw new Error(`${USER_DATA} exists before the run (a used kit: check a fresh build)`);
    mkdirSync(oldDir, { recursive: true });
    writeFileSync(join(oldDir, 'room.json'), oldText);
    r = await start('/usr/bin/env', ['-i', 'PATH=/usr/bin:/bin', `HOME=${home}`, 'PME_NO_OPEN=1', `PME_PORT=${launcherPort}`, `PME_NODE=${process.execPath}`, '/bin/bash', LAUNCHER], undefined, /ADDRESS: http:\/\/127\.0\.0\.1:(\d+)\//);
    const step = (x) => (steps.push(x), console.log(`  ok  ${x}`));
    const info = await withTimeout(fetch(`http://127.0.0.1:${r.port}/pme-relay.json`).then((x) => x.json()), '/pme-relay.json');
    if (info.lastRoom !== OLD_CODE) throw new Error(`lastRoom ${info.lastRoom}, not the old folder's ${OLD_CODE}`);
    if (existsSync(USER_DATA)) throw new Error('user-data was made before anything was kept');
    step(`the room code an older kit kept (${OLD_CODE}) is answered; no user-data folder yet`);
    const host = socket(r.port, r.proc);
    await host.opened;
    host.ws.send(JSON.stringify({ v: 1, session: OLD_CODE, from: 'kit-check-host-0123456789abcdef', seq: 1, sentAt: Date.now(), kind: 'hello', role: 'host' }));
    await host.next('the peers frame after the host hello');
    for (let i = 0; i < 40 && !existsSync(join(USER_DATA, '.room.json')); i++) await new Promise((w) => setTimeout(w, 50));
    const kept = readFileSync(join(USER_DATA, '.room.json'), 'utf8');
    if (kept !== oldText || readdirSync(USER_DATA).join() !== '.room.json') throw new Error(`user-data: ${readdirSync(USER_DATA).join()} ${kept}`);
    step(`the host's hello wrote <kit>/user-data/.room.json ${kept.trim()} (hidden, the code only)`);
    host.ws.close();
    await stop(r.proc, r.port, steps);
    const homeFiles = listing(home);
    if (readFileSync(join(oldDir, 'room.json'), 'utf8') !== oldText || homeFiles !== join('Library', 'Application Support', 'PME Classroom', 'room.json')) throw new Error(`HOME after the run: ${homeFiles}`);
    step('the old application-data file is as it was, and nothing else was written in HOME');
    results.push({ run: name, pass: true, steps });
  } catch (err) {
    console.log(`  FAIL ${err.message}`);
    if (r) {
      console.log(`  --- launcher output (last lines) ---\n${r.log().trim().split('\n').slice(-16).map((l) => `  | ${l}`).join('\n')}`);
      try {
        await stop(r.proc, r.port, steps);
      } catch (e) {
        console.log(`  (stop: ${e.message})`);
      }
    }
    results.push({ run: name, pass: false, steps, error: err.message });
  }
  if (!theirs) rmSync(USER_DATA, { recursive: true, force: true }); // this run's own folder: the kit is then as it was
  rmSync(home, { recursive: true, force: true });
  if (listing(kit) !== kitBefore) results.push({ run: `${name}: the kit's own folder afterwards`, pass: false, steps: [], error: 'the kit is not as it was' });
}
const pass = results.every((r) => r.pass);
console.log(`\nclassroom relay smoke test: ${pass ? 'PASS' : 'FAIL'} (${results.filter((r) => r.pass).length} of ${results.length} runs; node ${process.version}; kit ${kit})`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ kit, node: process.version, at: new Date().toISOString(), pass, results }, null, 2) + '\n');
process.exit(pass ? 0 : 1);
