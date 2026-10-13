#!/usr/bin/env node
// Kit smoke test for the classroom relay (KR-A1): the BUILT kit's server/relay.mjs must survive real WebSocket frames.
// An HTTP request alone does not exercise the frame path: the KR-A1 kits answered /pme-relay.json and /?join= and then
// exited at the first client frame of 32 bytes or more ("bufferUtil$1.unmask is not a function").
// Two runs, each with no WS_NO_* variable inherited and no native module installed beside the kit:
//   1. relay.mjs alone (node server/relay.mjs --port 0 --static app): the bundle itself must take ws's pure-JS path;
//   2. through "Start Classroom.command" (PME_NO_OPEN=1, PME_PORT=<port>, stripped environment), as the presenter starts it.
// Per run: a 64-byte binary frame (the relay drops it), a host hello of >= 64 bytes (answer: the relay's `peers` frame),
// a controller hello, a 1 KB host event that the relay forwards to the controller byte for byte, /pme-relay.json still
// answers, the relay is still running; then the relay is stopped and the port is free again.
//   node scripts/showcase/check-relay.mjs [KIT_DIR] [--port 8690] [--json OUT.json]
// Needs Node.js >= 22 (its built-in WebSocket client). Port 8690 (and the next 9) keeps clear of a classroom on 8650.
import { spawn } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { connect } from 'node:net';
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
for (const f of [RELAY, LAUNCHER, join(kit, 'app/index.html')]) if (!existsSync(f)) throw new Error(`not a classroom kit: no ${f}`);
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
  return { ws, opened: withTimeout(opened, 'socket open'), next: nextReal };
}

const SESSION = 'KRATST'; // a valid session code (SESSION_CODE_RE: no I, L, O, 0, 1)
const wire = (kind, from, seq, extra) => JSON.stringify({ v: 1, session: SESSION, from, seq, sentAt: Date.now(), kind, ...extra });

/** The frames. Returns the step list; throws at the first step that fails. */
async function frames(port, proc, steps) {
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
  host.ws.close();
  ctl.ws.close();
  await new Promise((r) => setTimeout(r, 300));
  if (proc.exitInfo) throw new Error(`the relay exited (${JSON.stringify(proc.exitInfo)})`);
  step('the relay is still running after the frames');
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
    go: () => start(process.execPath, [RELAY, '--port', '0', '--host', '127.0.0.1', '--static', join(kit, 'app')], cleanEnv, /ready on ws:\/\/[^:]+:(\d+)\//),
  },
  {
    name: `Start Classroom.command (PME_PORT=${launcherPort}, stripped environment)`,
    go: () => start('/usr/bin/env', ['-i', 'PATH=/usr/bin:/bin', 'PME_NO_OPEN=1', `PME_PORT=${launcherPort}`, `PME_NODE=${process.execPath}`, '/bin/bash', LAUNCHER], undefined, /ADDRESS: http:\/\/127\.0\.0\.1:(\d+)\//),
  },
];
const results = [];
for (const run of runs) {
  console.log(`\n== ${run.name}`);
  const steps = [];
  let r = null;
  try {
    r = await run.go();
    console.log(`  ok  ready on port ${r.port}`);
    await frames(r.port, r.proc, steps);
    await stop(r.proc, r.port, steps);
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
}
const pass = results.every((r) => r.pass);
console.log(`\nclassroom relay smoke test: ${pass ? 'PASS' : 'FAIL'} (${results.filter((r) => r.pass).length} of ${results.length} runs; node ${process.version}; kit ${kit})`);
if (jsonOut) writeFileSync(jsonOut, JSON.stringify({ kit, node: process.version, at: new Date().toISOString(), pass, results }, null, 2) + '\n');
process.exit(pass ? 0 : 1);
