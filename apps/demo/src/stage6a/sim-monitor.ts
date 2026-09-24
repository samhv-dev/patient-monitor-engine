// Stage 6a demo glue: a monitor that runs MonitorCore on the MAIN thread (the renderer's fallback path), so the
// page has the engine in hand for snapshot/restore/clock control. MountOptions/MonitorHandle do not expose
// those yet (renderer request R-1 in the plan); the drawing code is the renderer's own.
import { playBeep, ToneScheduler, unlockAudio } from '@pme/audio';
import type { EngineEvent, EngineOptions, LeadId } from '@pme/engine-core';
import { MonitorCore, NumericTile } from '@pme/renderer';
import type { HostTarget, ViewerTarget } from '@pme/controller';

export interface SimMonitor {
  readonly core: MonitorCore;
  readonly host: HostTarget;
  readonly viewer: ViewerTarget;
  /** Called every animation frame after drawing, with the frame's epoch ms and the drawn sim time. */
  onFrame(fn: (epochMs: number, renderT: number) => void): () => void;
  enableSound(): Promise<void>;
  destroy(): void;
}

const epochNow = (t = performance.now()) => performance.timeOrigin + t;

export function mountSimMonitor(el: HTMLElement, opts: { engine?: EngineOptions; lanes?: LeadId[] } = {}): SimMonitor {
  const doc = el.ownerDocument;
  const root = doc.createElement('div');
  root.style.cssText = 'display:flex;width:100%;height:100%;background:#000;overflow:hidden;';
  const wrap = doc.createElement('div');
  wrap.style.cssText = 'flex:1;position:relative;min-width:0;';
  const canvas = doc.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;';
  wrap.append(canvas);
  const tiles = doc.createElement('div');
  tiles.style.cssText = 'width:190px;flex:none;border-left:1px solid #222;';
  root.append(wrap, tiles);
  el.append(root);
  const hrTile = new NumericTile(tiles, { label: 'HR', unit: 'bpm', color: '#00ff66' });

  let scheduler: ToneScheduler | null = null;
  const size = () => ({ cssW: Math.max(200, wrap.clientWidth), cssH: Math.max(100, wrap.clientHeight), dpr: globalThis.devicePixelRatio || 1 });
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true }) as unknown as ConstructorParameters<typeof MonitorCore>[1];
  const core = new MonitorCore(canvas, ctx, size(), { ...(opts.engine ? { engine: opts.engine } : {}), ...(opts.lanes ? { lanes: opts.lanes } : {}) }, (anchor, events: EngineEvent[]) => {
    scheduler?.clock.setAnchor({ simT: anchor.simT, perfMs: anchor.epochMs - performance.timeOrigin, timeScale: anchor.timeScale });
    for (const e of events) {
      if (e.type === 'measurement' && e.values.hr) hrTile.update(e.values.hr);
      if (e.type === 'tone') scheduler?.enqueue({ t: e.t, id: e.id, kind: e.kind, ...(e.freqHz !== undefined ? { freqHz: e.freqHz } : {}) });
      if (e.type === 'toneCancel') scheduler?.cancelAfter(e.after);
    }
  });
  const frameFns = new Set<(epochMs: number, renderT: number) => void>();
  let raf = 0;
  let hiddenTimer: ReturnType<typeof setInterval> | null = null;
  const loop = (t: number) => {
    const epoch = epochNow(t);
    core.frame(epoch);
    for (const fn of frameFns) fn(epoch, core.clock.renderT);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  const onVis = () => {
    const hidden = doc.visibilityState === 'hidden';
    core.setVisible(!hidden);
    if (hidden && hiddenTimer === null) hiddenTimer = setInterval(() => core.catchUp(epochNow()), 1000);
    if (!hidden && hiddenTimer !== null) {
      clearInterval(hiddenTimer);
      hiddenTimer = null;
      core.catchUp(epochNow());
    }
  };
  doc.addEventListener('visibilitychange', onVis);
  const ro = new ResizeObserver(() => core.resize(size()));
  ro.observe(wrap);

  const host: HostTarget = {
    dispatch: (c) => core.command(c),
    snapshot: () => core.engine.snapshot(),
    restore: (s) => {
      core.engine.restore(s);
      core.clock.setTick(s.tick);
    },
    on: (fn) => core.engine.on(fn),
    now: () => core.engine.now(),
    time: (action, value) => {
      if (action === 'pause') core.clock.pause();
      if (action === 'resume') core.clock.resume();
      if (action === 'scale' && value !== undefined) core.clock.timeScale = value;
    },
  };
  const viewer: ViewerTarget = {
    restore: host.restore as ViewerTarget['restore'],
    dispatch: (c) => core.command(c),
    on: (fn, types) => core.engine.on(fn, types),
    renderT: () => core.clock.renderT,
    tick: () => core.engine.now().tick,
    setRate: (k) => (core.clock.timeScale = Math.min(4, Math.max(0.25, k))),
    setPaused: (p) => (p ? core.clock.pause() : core.clock.resume()),
    jumpTo: (simT) => {
      core.clock.setTick(Math.floor(simT * 50 + 1e-6));
      core.engine.advanceTo(core.clock.simT);
    },
  };
  return {
    core,
    host,
    viewer,
    onFrame(fn) {
      frameFns.add(fn);
      return () => {
        frameFns.delete(fn);
      };
    },
    async enableSound() {
      if (scheduler) return;
      const out = await unlockAudio();
      scheduler = new ToneScheduler({ audioNow: () => out.ctx.currentTime, perfToAudio: out.perfToAudio, play: (tone, when) => playBeep(out.ctx, out.master, when, tone.freqHz ?? 880) });
      scheduler.start();
    },
    destroy() {
      cancelAnimationFrame(raf);
      if (hiddenTimer !== null) clearInterval(hiddenTimer);
      doc.removeEventListener('visibilitychange', onVis);
      ro.disconnect();
      scheduler?.stop();
      root.remove();
    },
  };
}
