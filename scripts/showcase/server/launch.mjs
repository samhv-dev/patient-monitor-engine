// Offline showcase kit: what the Windows launchers run ("Start Classroom.cmd", "Start Simulator.cmd" check for Node.js
// >= 22, then start this). It does what the macOS .command launchers do in bash, in Node.js, so the .cmd files stay a
// few plain lines and these steps also run (and are tested) on macOS and Linux.
//   node launch.mjs classroom   server/relay.mjs --static app on every network address, port PME_PORT (8650) or the
//                               next free of 9 more: this computer's browser and learners' phones on the same network
//   node launch.mjs simulator   server/serve.mjs on 127.0.0.1 only, port PME_PORT (8642) or the next free of 49
// It prints the .command launchers' lines (the kit tests read "ADDRESS:" and "SERVER:"), opens the default browser once
// the server answers (not with PME_NO_OPEN=1), and lives as long as the server: Ctrl+C or closing the window stops
// both. ASCII output only: the Windows console's code page cannot garble it.
// The kit store (docs/plans/scenario-builder.md §8 layer 2; the owner's ruling of 10 November 2026): both servers get the
// kit's own `user-data` folder, `stateDir()` below, created at the first save: the clinicians' scenario cards are kept
// there as plain files, and the classroom relay keeps the last room code there in the hidden `.room.json` (the code
// only), so it survives a restart and the move to the next port. Nothing else is written into the kit (the simulator's
// port file goes to the temp folder), and nothing into this computer's application-data folder: a room code an older kit
// kept there (`oldStateDir()`) is read once, and that file is left as it is.
// The relay and serve.mjs are started with process.execPath: the node.exe the .cmd chose (the kit's runtime\node.exe
// when it has one), never a second lookup; the "SERVER:" line names it.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, posix, resolve, win32 } from 'node:path';
import { fileURLToPath } from 'node:url';

/** How to open `url` in the default browser on `platform`. Windows: `start` is a cmd.exe built-in whose first quoted
 *  argument is the window title, hence the empty "" before the address; verbatim, so Node passes both quoted pairs
 *  as written (`cmd.exe /d /c start "" "http://..."`). The address may hold none of cmd.exe's special characters. */
export function openCommand(url, platform = process.platform) {
  if (!/^http:\/\/[\w.:/?#=-]+$/.test(url)) throw new Error(`not a plain http address: ${url}`);
  if (platform === 'win32') return { cmd: process.env.ComSpec || 'cmd.exe', args: ['/d', '/c', 'start', '""', `"${url}"`], opts: { windowsVerbatimArguments: true } };
  if (platform === 'darwin') return { cmd: '/usr/bin/open', args: [url], opts: {} };
  return { cmd: 'xdg-open', args: [url], opts: {} };
}

/** The kit's own data folder: PME_STATE_DIR (the kit's own tests), else `<kit folder>/user-data` on every system. */
export function stateDir(kitDir, env = process.env) {
  return env.PME_STATE_DIR || join(kitDir, 'user-data');
}

/** Where kits before 10 November kept the room code (read once, never written): %LOCALAPPDATA%\PME Classroom on
 *  Windows, ~/Library/Application Support/PME Classroom on macOS; null on another system, when that folder is not
 *  known, or under PME_STATE_DIR (a test reads no folder of this computer's). */
export function oldStateDir(platform = process.platform, env = process.env) {
  if (env.PME_STATE_DIR) return null;
  if (platform === 'win32') return env.LOCALAPPDATA ? win32.join(env.LOCALAPPDATA, 'PME Classroom') : null;
  if (platform === 'darwin') return env.HOME ? posix.join(env.HOME, 'Library', 'Application Support', 'PME Classroom') : null;
  return null;
}

/** The classroom relay's arguments. */
export function relayArgs(relay, port, app, state, old = null) {
  return [relay, '--port', String(port), '--static', app, ...(state ? ['--state-dir', state] : []), ...(old ? ['--old-state-dir', old] : [])];
}

const here = dirname(fileURLToPath(import.meta.url));
const kitDir = resolve(here, '..');
const app = join(kitDir, 'app');
const say = (...lines) => console.log(lines.join('\n'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const big = (...lines) => say('', `  ${'='.repeat(70)}`, ...lines.map((l) => (l ? `  ${l}` : '')), `  ${'='.repeat(70)}`, '');
const tail = (text) => text.trim().split(/\r?\n/).slice(-3).join(' ');

let child = null; // the server, while it runs
let stopping = false;
/** Ctrl+C reaches the server too (same console); closing the window, or a kill of this process, must not leave it behind. */
const trapSignals = () => {
  for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    process.on(s, () => {
      stopping = true;
      if (child) child.kill();
      else process.exit(0);
    });
  }
};

/** Start `node args...`; `up` resolves true once `ready(output)` holds, false if it exits or `ms` pass (then it is killed). */
function startNode(args, ready, ms) {
  const proc = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  const keep = (d) => (out = (out + d).slice(-65536));
  proc.stdout.on('data', keep);
  proc.stderr.on('data', keep);
  const exited = new Promise((r) => proc.once('exit', (code, sig) => r(code ?? sig)));
  child = proc;
  const up = (async () => {
    for (const end = Date.now() + ms; Date.now() < end && !stopping;) {
      if (proc.exitCode !== null || proc.signalCode !== null) return false;
      if (await ready(out)) return true;
      await sleep(200);
    }
    proc.kill();
    await exited;
    return false;
  })();
  return { proc, exited, up, out: () => out };
}

function openBrowser(url) {
  if (process.env.PME_NO_OPEN) return;
  const missed = () => say('  (The browser did not open by itself: type the address below into Edge or Chrome.)');
  try {
    const { cmd, args, opts } = openCommand(url);
    const p = spawn(cmd, args, { ...opts, stdio: 'ignore' });
    p.once('error', missed);
    p.once('exit', (code) => code && missed());
  } catch {
    missed();
  }
}

/** The server runs: wait for it to stop. Stopped on purpose (Ctrl+C, the window, a kill): exit 0; else `fail`. */
async function serveUntilStopped(s, fail, stoppedText) {
  const code = await s.exited;
  child = null;
  if (stopping || code === 0) {
    say('', `  ${stoppedText}`, '');
    process.exit(0);
  }
  fail(`exited (${code}): ${tail(s.out())}`);
}

async function classroom() {
  const fail = (what, detail, extra) => {
    big('THE CLASSROOM COULD NOT START', what);
    if (extra) say(`  ${extra}`, '');
    say('  Nothing on this computer has been changed.', '  You can still run the case without phones: close this window and double-click "Start Simulator".', '', `  (technical detail for the helper: ${detail})`, '');
    process.exit(1);
  };
  big('PATIENT MONITOR SIMULATOR - CLASSROOM', 'Starting... please wait a few seconds.');
  const relay = join(here, 'relay.mjs');
  if (!existsSync(join(app, 'index.html')) || !existsSync(relay)) {
    fail('The kit is incomplete: the app or the relay is missing.', `no ${join(app, 'index.html')} or ${relay}`, 'If you opened it inside the .zip file: right-click the .zip, choose "Extract All", and start it from the extracted folder.');
  }
  const first = Number(process.env.PME_PORT || 8650);
  const state = stateDir(kitDir);
  const old = oldStateDir();
  let s = null;
  let last = '';
  for (let port = first; port < first + 10 && !stopping; port++) {
    const t = startNode(relayArgs(relay, port, app, state, old), (o) => /ready on ws:\/\//.test(o), 10_000);
    if (await t.up) {
      s = { ...t, port };
      break;
    }
    last = tail(t.out());
  }
  if (stopping) process.exit(0);
  if (!s) fail('The classroom relay did not start.', last || `no free port from ${first}`);
  await sleep(300); // the relay prints its network addresses right after "ready"
  const url = `http://127.0.0.1:${s.port}/?relay#/`;
  openBrowser(url);
  big('THE CLASSROOM IS RUNNING', '', 'The simulator has opened in your web browser.', '', 'LEAVE THIS WINDOW OPEN while you teach.', 'To stop: close this window (or press Ctrl+C, then Y).');
  say('  If Windows Defender Firewall asks about "Node.js JavaScript Runtime": tick BOTH "Private networks" and', '  "Public networks", then click "Allow access" (phones need it; Windows may ask for an administrator).', '');
  say(`  On this computer:  127.0.0.1:${s.port}/?relay`, '  Phones join with the QR code: Monitor view, "Phones" (or the "Phones" button at the top right).');
  const phones = s.out().split(/\r?\n/).filter((l) => l.includes('phones reach it at')).map((l) => `  ${l.trim()}`);
  say(...(phones.length ? phones : ['  (No network address found: phones cannot join. Connect this computer to the Wi-Fi, or turn on its', '  Mobile hotspot, then start again.)']));
  say('', `ADDRESS: ${url}`, `SERVER: node ${process.version} (${process.execPath})`);
  await serveUntilStopped(s, (d) => fail('The classroom relay stopped unexpectedly.', d), 'The classroom has stopped.');
}

async function simulator() {
  const fail = (what, detail) => {
    big('THE SIMULATOR COULD NOT START', what);
    say('  Nothing on this computer has been changed.', '  Please turn to the RESCUE CARD (the printed sheet that came with the kit).', '  The recorded cases are in the "videos" folder next to this file.', '', `  (technical detail for the helper: ${detail})`, '');
    process.exit(1);
  };
  big('PATIENT MONITOR SIMULATOR', 'Starting... please wait a few seconds.');
  const serve = join(here, 'serve.mjs');
  if (!existsSync(join(app, 'index.html')) || !existsSync(serve)) {
    fail('The kit is incomplete: the app folder is missing. If you opened it inside the .zip file: right-click the .zip, choose "Extract All", and start it from the extracted folder.', `no ${join(app, 'index.html')} or ${serve}`);
  }
  const tmp = mkdtempSync(join(tmpdir(), 'pme-showcase-'));
  process.on('exit', () => rmSync(tmp, { recursive: true, force: true }));
  const portFile = join(tmp, 'port');
  let port = 0;
  const answers = async () => {
    if (!existsSync(portFile)) return false;
    port = Number.parseInt(readFileSync(portFile, 'utf8'), 10);
    try {
      return (await fetch(`http://127.0.0.1:${port}/index.html`, { signal: AbortSignal.timeout(2000) })).ok;
    } catch {
      return false;
    }
  };
  const s = startNode([serve, app, String(Number(process.env.PME_PORT || 8642)), portFile, stateDir(kitDir)], answers, 12_000);
  if (!(await s.up)) {
    if (stopping) process.exit(0);
    fail('The small web server did not start.', tail(s.out()) || 'no answer in 12 s');
  }
  const url = `http://127.0.0.1:${port}/`;
  openBrowser(`${url}#/`);
  big('THE SIMULATOR IS RUNNING', '', 'It has opened in your web browser.', '', 'LEAVE THIS WINDOW OPEN while you use the simulator.', 'To stop: close this window (or press Ctrl+C, then Y).');
  say('  If the browser did not open, open Edge or Chrome and type this address:', '', `        127.0.0.1:${port}`, '');
  say(`ADDRESS: ${url}`, `SERVER: node ${process.version} (${process.execPath}) serve.mjs`);
  await serveUntilStopped(s, (d) => fail('The small web server stopped unexpectedly.', d), 'The simulator has stopped.');
}

// Only as a program (`node launch.mjs classroom`); a test imports openCommand and runs nothing.
const mode = process.argv[2];
if (mode === 'classroom' || mode === 'simulator') {
  trapSignals();
  await (mode === 'classroom' ? classroom() : simulator());
}
