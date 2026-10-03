// ONE engine session per app document (research/13 brief §5). It owns the monitor (mountMonitor, the renderer's worker
// path, the skin's device UI — FU-5's, untouched), the Stage 6a HostSession (the in-process hub for this page's panel,
// BroadcastChannel for a paired Remote, relay/WebRTC with ?relay=) and the Stage 6b ScenarioDriver. Switching views
// never touches it; only "Restart patient" (a new body = a new engine) remounts the monitor, behind a stable
// HostTarget so the HostSession, the driver and every listener survive the restart.
import type { Command, EngineEvent, PatientSnapshot } from '@pme/engine-core';
import {
  ControllerSession, createBroadcastChannelTransport, createInProcessHub, HostSession, newSessionCode, normalizeSessionCode,
  type HostTarget, type ScenarioEvent,
} from '@pme/controller';
import { engineOptionsOf, ScenarioDriver, validateScenario, type ScenarioDoc } from '@pme/controller/scenario';
import type { ManagedTransport } from '@pme/controller';
import { mountMonitor, type MonitorHandle } from '@pme/renderer';
import { ageBandOf, profileOf, type PatientSpec } from './patients.ts';
import { applySkinAlarmColours } from './shell.ts';

export type Mode = 'modeled' | 'manual';
export interface SessionStart {
  spec: PatientSpec;
  mode: Mode;
  seed?: number;
}

const TICK_S = 0.02;

/**
 * The Stage 8a performance load (`validation-perf.html`, review F6): 8 lanes — ECG II, V5, aVR, ABP, pleth, CVP, CO2,
 * resp — on the renderer's own layout, a ventilated patient with NIBP every 3 min. Selected with `?load=perf8`, so the
 * frame gate measures the brief's load with the whole shell mounted and the panel open. The engine options and the two
 * commands are the performance page's own, plus the app's 1 Hz truth for Explore.
 */
export const PERF8 = {
  engine: { seed: 11, truthHz: 1, patient: { baseline: { hr: 78, sbp: 124, dbp: 72 }, sensors: { ecg: 'on', spo2: 'on', abp: 'connected', cvp: 'connected', co2: 'on', nibp: 'on' } } },
  view: { lanes: ['ecgII', 'V5', 'aVR'], waves: ['abp', 'pleth', 'cvp', 'co2', 'resp'], nibp: true, temp: true },
  commands: [
    { type: 'applyEvent', event: { kind: 'ventilation', source: 'ventilator', rr: 12, vtMl: 500, fio2: 0.5, peep: 5 } },
    { type: 'device', action: { device: 'nibp', action: 'auto', intervalMin: 3 } },
  ],
} as const;
/** How far the sim clock estimate may run past the last engine event before it waits for the next one [ENG]. */
const EST_CAP_S = 1.5;

export class AppSession {
  readonly code: string;
  readonly host: HostSession;
  readonly driver: ScenarioDriver;
  /** The same-screen instructor panel's controller (in-process hub, R7). */
  readonly panel: ControllerSession;
  /** The panel's end of the in-process hub (the panel taps it for raw events: alarmStatus, deviceStatus). */
  readonly panelTransport: ManagedTransport;
  /** True once the session has been used beyond the Start screen (a patient restart then asks first). */
  live = false;
  monitor: MonitorHandle | null = null;
  spec: PatientSpec;
  mode: Mode;
  skin: string;
  theme: string;
  timeScale = 1;
  paused = false;
  /** Learner controls under the learner monitor (orchestrator ruling 4): off by default, on per scenario. */
  learner = false;
  private readonly learnerFns = new Set<(on: boolean) => void>();
  /** Latest engine events the shell reads (alarm mirror, defib, drugs). */
  last: Partial<Record<EngineEvent['type'], EngineEvent>> = {};
  soundOn = false;
  private readonly el: HTMLElement;
  private readonly listeners = new Set<(e: EngineEvent) => void>();
  private readonly appFns = new Set<(e: EngineEvent) => void>();
  private readonly mountFns = new Set<(m: MonitorHandle) => void>();
  private offMon: (() => void) | null = null;
  private lastT = 0;
  private lastWall = performance.now();
  private readonly pollTimer: ReturnType<typeof setInterval>;
  private readonly bc: ReturnType<typeof createBroadcastChannelTransport>;

  /** `?load=perf8`: mount the Stage 8a performance layout instead of the site's skin (the frame gate, review F6). */
  private readonly perf8: boolean;

  constructor(el: HTMLElement, start: SessionStart, o: { skin: string; theme: string; code?: string | null; load?: 'perf8' | null }) {
    this.el = el;
    this.perf8 = o.load === 'perf8';
    this.spec = start.spec;
    this.mode = start.mode;
    this.skin = o.skin;
    this.theme = o.theme;
    this.code = normalizeSessionCode(o.code ?? '') ?? newSessionCode();
    const target: HostTarget = {
      dispatch: (c) => this.need().dispatch(c),
      snapshot: () => this.need().snapshot(),
      restore: async (s: PatientSnapshot) => {
        await this.need().restore(s);
        this.lastT = s.tick * TICK_S;
        this.lastWall = performance.now();
      },
      on: (fn) => {
        this.listeners.add(fn);
        return () => void this.listeners.delete(fn);
      },
      now: () => {
        const simT = this.simNow();
        return { tick: Math.floor(simT / TICK_S + 1e-6), simT };
      },
      time: (action, value) => {
        if (action === 'pause') this.setPaused(true);
        if (action === 'resume') this.setPaused(false);
        if (action === 'scale' && value !== undefined) this.setTimeScale(value);
      },
    };
    let hs: HostSession | null = null;
    this.driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (e: ScenarioEvent) => hs?.publish(e) });
    hs = new HostSession({ session: this.code, target: this.driver.host, scenario: this.driver.hook, welcomeEvents: () => this.driver.welcomeEvents() });
    this.host = hs;
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    this.bc = createBroadcastChannelTransport(this.code);
    hs.addTransport(this.bc);
    this.panelTransport = hub.connect();
    this.panel = new ControllerSession({ session: this.code, transport: this.panelTransport, issuedBy: 'instructor' });
    this.mount(start.seed ?? 7);
    // the runner advances at the engine's sim time; 10 Hz is enough for triggers stated in seconds [ENG]
    this.pollTimer = setInterval(() => this.driver.poll(), 100);
  }

  /** Every engine event (the worker's batches), for the shell: alarm mirror, session bar, Explore. */
  onEvent(fn: (e: EngineEvent) => void): () => void {
    this.appFns.add(fn);
    return () => void this.appFns.delete(fn);
  }

  /** Show or hide the learner controls; every Monitor view and Scenario tab follows. */
  setLearner(on: boolean): void {
    this.learner = on;
    for (const fn of this.learnerFns) fn(on);
  }

  onLearner(fn: (on: boolean) => void): () => void {
    this.learnerFns.add(fn);
    fn(this.learner);
    return () => void this.learnerFns.delete(fn);
  }

  /** Called after every (re)mount with the new monitor (the ventilator link re-attaches to it). */
  onMount(fn: (m: MonitorHandle) => void): () => void {
    this.mountFns.add(fn);
    if (this.monitor) fn(this.monitor);
    return () => void this.mountFns.delete(fn);
  }

  /** Sim time: the last engine event's time run forward on the wall clock at the current speed, capped [ENG]. */
  simNow(): number {
    if (this.paused) return this.lastT;
    const dt = ((performance.now() - this.lastWall) / 1000) * this.timeScale;
    return this.lastT + Math.min(Math.max(0, dt), EST_CAP_S * this.timeScale);
  }

  send(c: Omit<Command, 'id' | 'issuedBy'> & Record<string, unknown>): Promise<{ accepted: boolean; reason?: string }> {
    return this.panel.send(c as never);
  }

  setTimeScale(k: number): void {
    this.lastT = this.simNow();
    this.lastWall = performance.now();
    this.timeScale = k;
    this.monitor?.setTimeScale(k);
  }

  setPaused(p: boolean): void {
    this.lastT = this.simNow();
    this.lastWall = performance.now();
    this.paused = p;
    if (p) this.monitor?.pause();
    else this.monitor?.resume();
  }

  /** Change the monitor's skin or theme. The shell's alarm mirror follows at once, wherever the change came from
   *  (Start, Settings, an imported site profile): the mirror always shows the monitor's colours (review F5, D5). */
  async setSkin(skin: string, theme: string): Promise<void> {
    this.skin = skin;
    this.theme = theme;
    applySkinAlarmColours(skin, theme);
    await this.monitor?.setSkin(skin, theme ? { theme } : {});
  }

  enableSound(): Promise<void> {
    return (this.monitor?.enableSound() ?? Promise.resolve()).then(() => void (this.soundOn = true));
  }

  /** A new body (profile, mode) = a new engine; the session code, remote pairing, log and listeners carry on. */
  restart(start: SessionStart): void {
    this.spec = start.spec;
    this.mode = start.mode;
    this.driver.runner = null;
    this.setLearner(false); // a new patient starts without learner controls (ruling 4)
    this.mount(start.seed ?? 7);
    this.panel.note(`Patient restarted: ${start.mode.toUpperCase()}`);
  }

  /** Load a scenario: its patient body restarts the engine, then the runner starts (never silently over a live run —
   *  the caller confirms first). */
  loadScenario(raw: unknown): { ok: true; doc: ScenarioDoc } | { ok: false; reason: string } {
    const v = validateScenario(raw);
    if (!v.ok) return { ok: false, reason: v.errors.join('; ') };
    const eo = engineOptionsOf(v.doc, 7);
    const p = v.doc.patient ?? {};
    this.spec = { ageY: p.ageY ?? 40, sex: p.sex ?? 'M', weightKg: p.weightKg ?? 70, heightCm: p.heightCm ?? 175, comorbid: [], attached: true };
    this.mode = v.doc.mode ?? 'modeled';
    this.driver.runner = null;
    this.mountWith({ ...eo, mode: this.mode, truthHz: 1, patient: { ...eo.patient, ...(p.sensors ? { sensors: p.sensors } : {}) } });
    void this.panel.send({ type: 'scenario', action: 'load', doc: v.doc });
    this.live = true;
    return { ok: true, doc: v.doc };
  }

  destroy(): void {
    clearInterval(this.pollTimer);
    this.offMon?.();
    this.monitor?.destroy();
    this.panel.close();
    this.bc.close();
  }

  // --- internals ---------------------------------------------------------------------------------------------
  private need(): MonitorHandle {
    if (!this.monitor) throw new Error('no monitor');
    return this.monitor;
  }

  private mount(seed: number): void {
    if (this.perf8) {
      this.mountWith({ ...PERF8.engine, patient: { ...PERF8.engine.patient, baseline: { ...PERF8.engine.patient.baseline }, sensors: { ...PERF8.engine.patient.sensors } } } as never);
      PERF8.commands.forEach((c, i) => void this.monitor?.dispatch({ id: `perf8-${i}`, issuedBy: 'perf', ...c } as never));
      return;
    }
    const patient = profileOf(this.spec);
    this.mountWith({ seed, mode: this.mode, patient, truthHz: 1, device: { ageBand: ageBandOf(this.spec) } });
  }

  private mountWith(engine: NonNullable<Parameters<typeof mountMonitor>[1]>['engine']): void {
    this.offMon?.();
    this.monitor?.destroy();
    this.el.replaceChildren();
    this.lastT = 0;
    this.lastWall = performance.now();
    this.last = {};
    const look = this.perf8 ? { ...PERF8.view, lanes: [...PERF8.view.lanes], waves: [...PERF8.view.waves] } : { skin: this.skin, ...(this.theme ? { theme: this.theme } : {}) };
    const m = mountMonitor(this.el, { ...look, engine } as Parameters<typeof mountMonitor>[1]);
    this.monitor = m;
    this.offMon = m.on((e) => {
      const t = (e as { t?: unknown }).t;
      if (typeof t === 'number' && e.type !== 'tone' && t >= this.lastT) {
        this.lastT = t;
        this.lastWall = performance.now();
      }
      this.last[e.type] = e;
      if (e.type !== 'truth') for (const fn of this.listeners) fn(e); // truth (≈ 25 KB at 1 Hz) stays on this page
      for (const fn of this.appFns) fn(e);
    });
    m.setTimeScale(this.timeScale);
    if (this.paused) m.pause();
    if (this.soundOn) void m.enableSound();
    for (const fn of this.mountFns) fn(m);
  }
}
