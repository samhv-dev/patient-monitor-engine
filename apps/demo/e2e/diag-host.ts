// DIAGNOSTIC ONLY (brief 203, branch diag-webkit-host-hang, never merged): what the instructor's (host) page does when it
// stops answering on CI WebKit. With PME_DIAG_HOST=1, openApp (app-support.ts) installs `instrument` in the host page
// before its scripts run. The page's main thread tells a side worker (a plain Worker of its own, which keeps running when
// the main thread is stuck) when each task starts and ends (requestAnimationFrame, timers, event listeners and on*
// handlers of Worker, WebSocket, MessagePort, Window, Document), what the engine worker posts (type, batch size, the
// clock anchor), every WebSocket send and close, and a 100 ms heartbeat. The side worker posts these, and its own
// verdict when the main thread has been silent for more than 300 ms (with the task still open), to a collector in the
// test process over HTTP, every 200 ms. One JSON line per record in <test output>/diag/host-<n>.jsonl.
import { createServer, type Server } from 'node:http';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { test, type Page } from './evidence.ts';

export const diagOn = (): boolean => process.env.PME_DIAG_HOST === '1';

let server: Server | null = null;
let port = 0;
const files = new Map<string, string>();
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
  return port;
}

/** Called by openApp for the page it opens (the host), before goto. */
export async function instrumentHost(page: Page): Promise<void> {
  const p = await collector();
  const info = test.info();
  const token = `${info.testId}-${info.retry}-${info.repeatEachIndex}-${files.size}`;
  const file = info.outputPath('diag', `host-${files.size + 1}.jsonl`);
  mkdirSync(dirname(file), { recursive: true });
  files.set(token, file);
  appendFileSync(file, JSON.stringify({ rx: Date.now(), k: 'start', test: info.titlePath.join(' › '), retry: info.retry, repeat: info.repeatEachIndex }) + '\n');
  await page.addInitScript(instrument, { url: `http://127.0.0.1:${p}/diag?t=${encodeURIComponent(token)}` });
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
    return wsSend.call(this, data);
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
