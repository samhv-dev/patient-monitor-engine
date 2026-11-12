// DIAGNOSTIC ONLY (brief 203, branch diag-webkit-host-hang, never merged): what the instructor's (host) page does when it
// stops answering on CI WebKit. With PME_DIAG_HOST=1, openApp (app-support.ts) installs `instrument` in the host page
// before its scripts run. The page's main thread tells a side worker (a plain Worker of its own, which keeps running when
// the main thread is stuck) when each task starts and ends (requestAnimationFrame, timers, event listeners and on*
// handlers of Worker, WebSocket, MessagePort, Window, Document), what the engine worker posts (type, batch size, the
// clock anchor), every WebSocket send and close, and a 100 ms heartbeat. The side worker posts these, and its own
// verdict when the main thread has been silent for more than 300 ms (with the task still open), to a collector in the
// test process over HTTP, every 200 ms. One JSON line per record in <test output>/diag/host-<n>.jsonl.
import { createServer, type Server } from 'node:http';
import { execFile, spawn } from 'node:child_process';
import { existsSync, openSync, readdirSync, readFileSync, readlinkSync } from 'node:fs';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { test, type Page } from './evidence.ts';

export const diagOn = (): boolean => process.env.PME_DIAG_HOST === '1';

let server: Server | null = null;
let port = 0;
const files = new Map<string, string>();
const heardAt = new Map<string, number>(); // token → when its page's records last arrived
const dumped = new Set<string>();

const sh = (cmd: string, args: string[], ms: number): Promise<string> =>
  new Promise((ok) => execFile(cmd, args, { timeout: ms, maxBuffer: 64 << 20 }, (err, out, errOut) => ok(`${out}${errOut}${err ? `\n(exit: ${String(err.message).slice(0, 200)})` : ''}`)));

/** Every WebKit process of this machine: ps, each thread's name, state, wchan and CPU ticks (twice, 1 s apart), and a gdb
 *  backtrace of every thread (CI's diag job installs gdb and gives the container ptrace). */
async function dumpWebKit(file: string, why: string): Promise<void> {
  const pids = readdirSync('/proc').filter((d) => /^\d+$/.test(d)).filter((d) => {
    try {
      return /WebKit|webkit|MiniBrowser|pw_run/.test(readFileSync(`/proc/${d}/comm`, 'utf8') + readFileSync(`/proc/${d}/cmdline`, 'utf8').slice(0, 200));
    } catch {
      return false;
    }
  });
  const threads = (pid: string) => {
    try {
      return readdirSync(`/proc/${pid}/task`).map((t) => {
        const r = (f: string) => { try { return readFileSync(`/proc/${pid}/task/${t}/${f}`, 'utf8').trim(); } catch { return '?'; } };
        const st = r('stat').replace(/^.*\) /, '').split(' ');
        return { t, comm: r('comm'), state: st[0], utime: Number(st[11]), stime: Number(st[12]), wchan: r('wchan'), syscall: r('syscall').split(' ')[0] };
      });
    } catch {
      return [];
    }
  };
  const a = Object.fromEntries(pids.map((p) => [p, threads(p)]));
  await new Promise((r) => setTimeout(r, 1000));
  const b = Object.fromEntries(pids.map((p) => [p, threads(p)]));
  let out = `# ${new Date().toISOString()} ${why}\n` + (await sh('ps', ['-eo', 'pid,ppid,pcpu,rss,stat,etimes,comm,args', '--sort=pid'], 5000)) + '\n';
  for (const p of pids) {
    let cmd = '';
    try { cmd = readFileSync(`/proc/${p}/cmdline`, 'utf8').replace(/\0/g, ' ').slice(0, 300); } catch { /* gone */ }
    out += `\n## pid ${p}: ${cmd}\n`;
    try {
      out += '  fds: ' + readdirSync(`/proc/${p}/fd`).map((fd) => { try { return `${fd}→${readlinkSync(`/proc/${p}/fd/${fd}`)}`; } catch { return fd; } }).join(' ') + '\n';
    } catch { /* gone */ }
    for (const t of b[p] ?? []) {
      const t0 = (a[p] ?? []).find((x) => x.t === t.t);
      const cpu = t0 ? t.utime + t.stime - t0.utime - t0.stime : NaN;
      out += `  tid ${t.t} ${t.comm.padEnd(16)} ${t.state} cpu/1s=${cpu} ticks wchan=${t.wchan} syscall=${t.syscall}\n`;
    }
  }
  appendFileSync(file, out);
  for (const p of pids) appendFileSync(file, `\n## gdb pid ${p}\n` + (await sh('gdb', ['-p', p, '-batch', '-nx', '-ex', 'set pagination off', '-ex', 'thread apply all bt 40'], 90_000)));
}
let lagTimer: ReturnType<typeof setInterval> | null = null;

async function collector(): Promise<number> {
  if (server) return port;
  server = createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    if (req.method !== 'POST') return void res.end();
    const token = new URL(req.url ?? '/', 'http://x').searchParams.get('t') ?? '';
    let body = '';
    req.on('data', (d: Buffer) => (body += d.toString()));
    req.on('end', () => {
      const file = files.get(token);
      if (file) heardAt.set(token, Date.now());
      if (file) {
        const at = Date.now();
        const lines = body.split('\n').filter(Boolean).map((l) => l.replace(/^\{/, `{"rx":${at},`));
        appendFileSync(file, lines.join('\n') + '\n');
      }
      res.end('ok');
    });
  });
  await new Promise<void>((ok) => (server as Server).listen(Number(process.env.PME_DIAG_PORT) || 0, '127.0.0.1', ok));
  port = (server.address() as { port: number }).port;
  server.unref();
  // The test process's own event loop (it holds the in-process relay): a gap over 200 ms is written to every open file
  let last = Date.now();
  lagTimer = setInterval(() => {
    const now = Date.now();
    if (now - last > 300) for (const f of files.values()) appendFileSync(f, JSON.stringify({ rx: now, k: 'nodeLag', ms: now - last - 100 }) + '\n');
    last = now;
  }, 100);
  lagTimer.unref();
  // A host page whose records stop for 3 s while its test runs: every WebKit process is dumped, once per page
  const watch = setInterval(() => {
    for (const [token, at] of heardAt) {
      if (dumped.has(token) || Date.now() - at < 3000) continue;
      dumped.add(token);
      const file = (files.get(token) as string).replace(/\.jsonl$/, '-procs.txt');
      void dumpWebKit(file, `no record from ${token} for ${Date.now() - at} ms`).catch((e) => appendFileSync(file, `dump failed: ${String(e)}\n`));
    }
  }, 500);
  watch.unref();
  return port;
}

const webPids = (): string[] => {
  try {
    return readdirSync('/proc').filter((d) => /^\d+$/.test(d)).filter((d) => { try { return readFileSync(`/proc/${d}/comm`, 'utf8').startsWith('WPEWebProcess') && !readFileSync(`/proc/${d}/stat`, 'utf8').includes(') Z'); } catch { return false; } });
  } catch {
    return [];
  }
};
const watched = new Set<string>();
/**
 * Called by openApp once the host page runs (Linux with gdb only: CI's diag job). Every WebKit web process not watched
 * yet gets a gdb that lets every signal pass silently except a crash's (SIGILL, the trap WebKit's CRASH() and
 * RELEASE_ASSERT raise; SIGSEGV, SIGBUS, SIGABRT, SIGFPE): on one it prints the faulting thread's backtrace and every
 * thread's, then detaches and the signal goes on as without gdb. Run 43177130997 found the stuck host's process exiting
 * on SIGILL with one worker thread blocked in a pipe write: this records where the SIGILL came from.
 */
export function watchCrashes(): void {
  if (process.platform !== 'linux' || !existsSync('/usr/bin/gdb')) return;
  const dir = test.info().outputPath('diag');
  mkdirSync(dir, { recursive: true });
  for (const pid of webPids()) {
    if (watched.has(pid)) continue;
    watched.add(pid);
    const out = openSync(`${dir}/gdb-${pid}.txt`, 'a');
    const args = ['-p', pid, '-batch', '-nx', '-ex', 'set pagination off', '-ex', 'set print thread-events off', '-ex', 'handle all nostop noprint pass'];
    for (const sig of ['SIGILL', 'SIGSEGV', 'SIGBUS', 'SIGABRT', 'SIGFPE']) args.push('-ex', `handle ${sig} stop print pass`);
    args.push('-ex', 'continue', '-ex', 'echo \\n=== STOPPED ===\\n', '-ex', 'info threads', '-ex', 'bt 80', '-ex', 'thread apply all bt 40', '-ex', 'info registers rip', '-ex', 'x/4i $pc', '-ex', 'info symbol $pc', '-ex', 'info sharedlibrary');
    spawn('gdb', args, { stdio: ['ignore', out, out], detached: true }).unref();
  }
}

/** Called by openApp for the page it opens (the host), before goto. */
export async function instrumentHost(page: Page): Promise<void> {
  const p = await collector();
  const info = test.info();
  const token = `${info.testId}-${info.retry}-${info.repeatEachIndex}-${files.size}`;
  const file = info.outputPath('diag', `host-${files.size + 1}.jsonl`);
  mkdirSync(dirname(file), { recursive: true });
  files.set(token, file);
  // a page that closed is silent for that reason: no dump. A passing test's page closes at its end; a failed attempt's
  // page stays open until the evidence fixture has read it, so the dump (3 s of silence) comes first
  page.on('close', () => (heardAt.delete(token), dumped.add(token)));
  appendFileSync(file, JSON.stringify({ rx: Date.now(), k: 'start', test: info.titlePath.join(' › '), retry: info.retry, repeat: info.repeatEachIndex }) + '\n');
  await page.addInitScript(instrument, { url: `http://127.0.0.1:${p}/diag?t=${encodeURIComponent(token)}` });
  // PME_DIAG_NO_OFFSCREEN=1: the variant without the OffscreenCanvas engine worker. Without transferControlToOffscreen
  // the renderer's own test (worker-host.ts canUseWorker) puts the host's monitor on the main thread, as a follower's is
  if (process.env.PME_DIAG_NO_OFFSCREEN === '1') await page.addInitScript(() => void delete (HTMLCanvasElement.prototype as unknown as Record<string, unknown>).transferControlToOffscreen);
}

/**
 * PME_DIAG_SLOW_WORKER=<fraction>: a controlled slow machine for the engine only. Every 100 ms each of the page's
 * workers is held by a busy loop for <fraction> × 100 ms (Playwright runs it as a task of that worker), so the engine
 * keeps (1 − fraction) of its thread. Local experiments only.
 */
export function slowWorkers(page: Page): void {
  const f = Number(process.env.PME_DIAG_SLOW_WORKER) || 0;
  if (!(f > 0)) return;
  const ms = Math.round(f * 100);
  const tick = async () => {
    if (page.isClosed()) return;
    await Promise.all(page.workers().map((w) => w.evaluate((n) => { const end = performance.now() + n; while (performance.now() < end); }, ms).catch(() => undefined)));
    setTimeout(() => void tick(), Math.max(0, 100 - ms));
  };
  void tick();
}

/** In the page, before its own scripts (an init script: self-contained). */
function instrument(cfg: { url: string }): void {
  if (window.top !== window) return;
  const W = window as unknown as Record<string, unknown>;
  if (W.__diagOn) return;
  W.__diagOn = true;
  const epoch = () => performance.timeOrigin + performance.now();
  // ---- the side worker: it outlives a stuck main thread ----
  const side = `
    let buf = [], open = null, lastMain = 0, silentSince = 0, reported = 0, seq = 0;
    const out = (o) => buf.push(JSON.stringify(o));
    onmessage = (e) => {
      const m = e.data; const now = performance.timeOrigin + performance.now();
      lastMain = now;
      if (silentSince) { out({ k: 'mainBack', e: now, silentMs: Math.round(now - silentSince), open }); silentSince = 0; reported = 0; }
      if (m.k === 'in') { open = { id: m.id, l: m.l, e: m.e }; return; }
      if (m.k === 'out') { if (open && open.id === m.id) open = null; if (m.ms > 50) out({ k: 'long', e: m.e, ms: m.ms, l: m.l }); return; }
      if (m.k === 'beat') return;
      out(m);
    };
    setInterval(() => {
      const now = performance.timeOrigin + performance.now();
      if (lastMain && now - lastMain > 300) {
        if (!silentSince) silentSince = lastMain;
        if (now - reported > 1000) { out({ k: 'mainSilent', e: now, silentMs: Math.round(now - lastMain), open, openMs: open ? Math.round(now - open.e) : null }); reported = now; }
      }
    }, 100);
    setInterval(() => {
      out({ k: 'sideBeat', e: performance.timeOrigin + performance.now(), seq: seq++ });
      if (!buf.length) return;
      const body = buf.join('\\n'); buf = [];
      fetch(${JSON.stringify(cfg.url)}, { method: 'POST', body, headers: { 'content-type': 'text/plain' } }).catch(() => {});
    }, 200);
  `;
  const OrigWorker = window.Worker;
  const sw = new OrigWorker(URL.createObjectURL(new Blob([side], { type: 'text/javascript' })));
  const tell = (o: Record<string, unknown>) => {
    try {
      sw.postMessage(o);
    } catch {
      /* a record that cannot be cloned */
    }
  };
  // ---- labels: where a callback was registered ----
  const labels = new WeakMap<object, string>();
  const where = (fn: unknown, kind: string): string => {
    const f = fn as object;
    const known = labels.get(f);
    if (known) return known;
    const name = (fn as { name?: string }).name || '';
    const st = (new Error().stack ?? '').split('\n').filter((s) => s && !s.includes('__diag') && !s.includes('instrument')).slice(0, 3).map((s) => s.replace(/https?:\/\/[^/]+/, '').replace(/\?[^:]*/, '').slice(0, 120));
    const l = `${kind}:${name}@${st.join(' < ')}`;
    labels.set(f, l);
    return l;
  };
  let ids = 0;
  const run = <T>(l: string, f: () => T): T => {
    const id = ++ids;
    const t0 = performance.now();
    tell({ k: 'in', id, l, e: performance.timeOrigin + t0 });
    try {
      return f();
    } finally {
      const ms = performance.now() - t0;
      tell({ k: 'out', id, l, ms: Math.round(ms), e: epoch() });
    }
  };
  // rAF and timers
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function __diagRaf(cb: FrameRequestCallback) {
    const l = where(cb, 'raf');
    return raf((t) => run(l, () => cb(t)));
  };
  for (const name of ['setTimeout', 'setInterval'] as const) {
    const orig = window[name].bind(window) as (h: unknown, ms?: number, ...a: unknown[]) => number;
    (window as unknown as Record<string, unknown>)[name] = function __diagTimer(h: unknown, ms?: number, ...a: unknown[]) {
      if (typeof h !== 'function') return orig(h, ms, ...a);
      const l = where(h, `${name}(${ms ?? 0})`);
      return orig(function __diagTimerCb(this: unknown) {
        return run(l, () => (h as (...x: unknown[]) => unknown).apply(this, a));
      }, ms);
    };
  }
  // event listeners
  const wrapped = new WeakMap<object, Map<string, EventListener>>();
  const wrapListener = (target: EventTarget, type: string, listener: EventListenerOrEventListenerObject): EventListener => {
    const fn = listener as object;
    let byType = wrapped.get(fn);
    if (!byType) wrapped.set(fn, (byType = new Map()));
    const key = type;
    const have = byType.get(key);
    if (have) return have;
    const tname = (target as { constructor?: { name?: string } }).constructor?.name ?? '?';
    const l = where(listener, `${tname}.${type}`);
    const w = function __diagListener(this: unknown, ev: Event) {
      return run(l, () => (typeof listener === 'function' ? listener.call(this, ev) : listener.handleEvent(ev)));
    };
    byType.set(key, w);
    return w;
  };
  const add = EventTarget.prototype.addEventListener;
  const remove = EventTarget.prototype.removeEventListener;
  EventTarget.prototype.addEventListener = function __diagAdd(this: EventTarget, type: string, listener: EventListenerOrEventListenerObject | null, o?: boolean | AddEventListenerOptions) {
    if (!listener || this === (sw as unknown)) return add.call(this, type, listener, o);
    return add.call(this, type, wrapListener(this, type, listener), o);
  };
  EventTarget.prototype.removeEventListener = function __diagRemove(this: EventTarget, type: string, listener: EventListenerOrEventListenerObject | null, o?: boolean | EventListenerOptions) {
    const w = listener ? wrapped.get(listener as object)?.get(type) : undefined;
    return remove.call(this, type, w ?? listener, o);
  };
  // on* handlers (worker-host sets worker.onmessage; taskYield sets port1.onmessage; the relay link its socket's)
  const inspectWorker = (ev: MessageEvent) => {
    const m = ev.data as { type?: string; events?: unknown[]; anchor?: { simT: number; epochMs: number; behindS: number; timeScale: number } };
    if (!m || typeof m !== 'object' || !m.type) return;
    const now = epoch();
    if (m.type === 'events') tell({ k: 'wEv', e: now, n: m.events?.length ?? 0, simT: m.anchor?.simT, aE: m.anchor?.epochMs, behind: m.anchor?.behindS, ts: m.anchor?.timeScale });
    else tell({ k: 'w', e: now, type: m.type });
  };
  for (const [ctor, props] of [[Worker, ['onmessage', 'onerror']], [WebSocket, ['onmessage', 'onclose', 'onopen', 'onerror']], [MessagePort, ['onmessage']], [Window, ['onmessage', 'onerror', 'onunhandledrejection']]] as const) {
    for (const prop of props) {
      let proto: object | null = (ctor as { prototype: object }).prototype;
      let desc: PropertyDescriptor | undefined;
      while (proto && !(desc = Object.getOwnPropertyDescriptor(proto, prop))) proto = Object.getPrototypeOf(proto);
      if (!desc?.set || !desc.get) continue;
      const d = desc;
      const store = new WeakMap<object, unknown>();
      Object.defineProperty((ctor as { prototype: object }).prototype, prop, {
        configurable: true,
        enumerable: d.enumerable ?? false,
        get(this: object) {
          return store.has(this) ? store.get(this) : d.get?.call(this);
        },
        set(this: object, h: unknown) {
          store.set(this, h);
          if (typeof h !== 'function') return void d.set?.call(this, h);
          const tname = (ctor as { name: string }).name;
          const l = where(h, `${tname}.${prop}`);
          const self = this;
          d.set?.call(this, function __diagOn(this: unknown, ev: Event) {
            if (self instanceof Worker && prop === 'onmessage' && self !== (sw as unknown)) inspectWorker(ev as MessageEvent);
            if (self instanceof WebSocket && prop === 'onclose') tell({ k: 'wsClose', e: epoch(), code: (ev as CloseEvent).code, reason: (ev as CloseEvent).reason, url: (self as WebSocket).url });
            if (self instanceof WebSocket && prop === 'onopen') tell({ k: 'wsOpen', e: epoch(), url: (self as WebSocket).url });
            return run(l, () => (h as (e: Event) => unknown).call(this, ev));
          });
        },
      });
    }
  }
  // sends and requests
  const wsSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function __diagSend(this: WebSocket, data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    const s = typeof data === 'string' ? data : '';
    const ty = /"type":"([^"]+)"/.exec(s.slice(0, 200))?.[1] ?? '';
    tell({ k: 'wsSend', e: epoch(), len: typeof data === 'string' ? data.length : -1, ty, rs: this.readyState, buffered: this.bufferedAmount });
    const r = wsSend.call(this, data);
    tell({ k: 'wsSent', e: epoch() });
    return r;
  };
  const wPost = Worker.prototype.postMessage as (this: Worker, m: unknown, t?: unknown) => void;
  let acks = 0;
  Worker.prototype.postMessage = function __diagPost(this: Worker, m: unknown, t?: unknown) {
    if (this !== sw) {
      const ty = (m as { type?: string })?.type;
      if (ty === 'eventsAck') acks++;
      else if (ty !== 'frame') tell({ k: 'wReq', e: epoch(), type: ty, ...(ty === 'timeScale' ? { k2: (m as { k?: number }).k } : {}) });
    }
    return t === undefined ? wPost.call(this, m) : wPost.call(this, m, t);
  };
  // the heartbeat: its lateness is the event loop's lag (a 100 ms timer more than 250 ms apart)
  let lastBeat = performance.now();
  setInterval(function beat() {
    const now = performance.now();
    if (now - lastBeat > 250) tell({ k: 'lag', e: epoch(), ms: Math.round(now - lastBeat - 100) });
    lastBeat = now;
    tell({ k: 'beat', e: epoch(), acks });
  }, 100);
  document.addEventListener('visibilitychange', () => tell({ k: 'vis', e: epoch(), v: document.visibilityState }));
  window.addEventListener('error', (ev) => tell({ k: 'error', e: epoch(), msg: String((ev as ErrorEvent).message), src: `${(ev as ErrorEvent).filename}:${(ev as ErrorEvent).lineno}` }));
  window.addEventListener('unhandledrejection', (ev) => tell({ k: 'rejection', e: epoch(), msg: String((ev as PromiseRejectionEvent).reason).slice(0, 300) }));
  tell({ k: 'installed', e: epoch(), ua: navigator.userAgent, cores: navigator.hardwareConcurrency });
}
