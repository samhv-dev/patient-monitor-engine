// ONE engine session per app document (research/13 brief §5). It owns the monitor (mountMonitor, the renderer's worker
// path, the skin's device UI, untouched), the controller's HostSession (the in-process hub for this page's panel,
// BroadcastChannel for a paired Remote, relay/WebRTC with ?relay=) and the scenario runner's ScenarioDriver. Switching
// views never touches it; only "Restart patient" (a new body = a new engine) remounts the monitor, behind a stable
// HostTarget so the HostSession, the driver and every listener survive the restart.
import type { Command, EngineEvent, PatientSnapshot } from '@pme/engine-core';
import {
  ControllerSession, createBroadcastChannelTransport, createInProcessHub, createWebSocketTransport, HostSession, newSessionCode, normalizeSessionCode,
  type AppliedResolution, type HostTarget, type ScenarioEvent, type WireEvent,
} from '@pme/controller';
import { engineOptionsOf, ScenarioDriver, validateScenario, type ScenarioDoc } from '@pme/controller/scenario';
import type { ManagedTransport } from '@pme/controller';
import { mountMonitor, type MonitorHandle } from '@pme/renderer';
import { FF_WALL_MS } from './fast-forward.ts';
import { ageBandOf, nibpStartCommand, oneLiner, profileOf, type PatientSpec } from './patients.ts';
import { clearPosition } from './position.ts';
import { RunRecord } from './record.ts';
import { applySkinAlarmColours } from './shell.ts';

export type Mode = 'modeled' | 'manual';
/** The engine's own ventilator settings, in its `ventilation` event's units (FiO₂ 0.21–1), as far as they are known. */
export interface VentSettings { rr?: number; vtMl?: number; peep?: number; fio2?: number; ie?: number; pmax?: number }
export interface SessionStart {
  spec: PatientSpec;
  mode: Mode;
  seed?: number;
}

const TICK_S = 0.02;

/**
 * The validation harness's performance load (`validation-perf.html`): 8 lanes — ECG II, V5, aVR, ABP, pleth, CVP, CO2,
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
/** The Ventilator view ventilates the patient while its last frame is this recent (it sends 50 a second) [ENG]. */
const VENT_DRIVING_MS = 2000;

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
  /** A reload's position is being restored (position.ts): none is taken meanwhile. */
  restoring = false;
  /** The answer to the last scenario load (a restore after a reload waits for it before it returns to the position). */
  lastLoad: Promise<{ accepted: boolean; reason?: string }> = Promise.resolve({ accepted: false });
  monitor: MonitorHandle | null = null;
  spec: PatientSpec;
  mode: Mode;
  skin: string;
  theme: string;
  timeScale = 1;
  paused = false;
  /** A fast-forward holds the monitor's clock (the sim clock estimate stands still between its steps). */
  fastForwarding = false;
  /** The Ventilator view's link (it sets it): a fast-forward steps the cockpit with the engine through it. */
  ventLink: { runTo(engTick: number): Promise<void> } | null = null;
  /** The Ventilator view is on screen (it sets it): only then does its cockpit hold the phones (UI-A #2). */
  ventShown = false;
  /**
   * The engine tick of the cockpit's last applied frame (−1: none since the view reset it). E128: when the Ventilator view
   * closes, its hand-over to the engine's own ventilator lands after it — frames run up to 1.5 s ahead of the engine, and
   * one applied after the hand-over would take the patient back for the cockpit, then the drive watchdog (5 s without a
   * frame) would stop the breathing.
   */
  ventTick = -1;
  /** The engine's own ventilator settings as this timeline's applied `ventilation` events left them (null: the patient is
   *  not on it, or not known since a new timeline). E128: the Ventilator view restarts its cockpit from them. */
  ventSettings: VentSettings | null = null;
  private ventInflight: Promise<unknown> = Promise.resolve(); // The cockpit's last frame dispatch
  private ventFrameAt = -Infinity; // Wall ms of the Ventilator view's last frame
  private nibpStarts = 0; // O2 start commands sent: each gets a fresh id (a follower skips an id it has applied)
  private ffWaiters: Array<() => void> = []; // A cockpit opened during a fast-forward waits for its end
  private ffTick: number | null = null; // The monitor's tick during a fast-forward (from its own steps)
  private ffCockpit = false; // The cockpit was ventilating when the fast-forward began: it steps with it
  /** Learner controls under the learner monitor: off by default, on per scenario. */
  learner = false;
  private readonly learnerFns = new Set<(on: boolean) => void>();
  /** The debrief's record of the run — beside the engine, not in its snapshot, so a restore keeps it. */
  readonly record: RunRecord;
  /** Latest engine events the shell reads (alarm mirror, defib, drugs). */
  last: Partial<Record<EngineEvent['type'], EngineEvent>> = {};
  soundOn = false;
  private readonly el: HTMLElement;
  private readonly listeners = new Set<(e: EngineEvent) => void>();
  private readonly appFns = new Set<(e: EngineEvent) => void>();
  private readonly mountFns = new Set<(m: MonitorHandle) => void>();
  private readonly scaleFns = new Set<(k: number) => void>();
  private offMon: (() => void) | null = null;
  private lastT = 0;
  private lastWall = performance.now();
  private readonly pollTimer: ReturnType<typeof setInterval>;
  /** The same-browser channel (a learner monitor window, a Remote window); the Room page lists who said hello on it. */
  readonly bc: ReturnType<typeof createBroadcastChannelTransport>;
  /** What the paired-remote channel has received, by message kind (the e2e prints it when a remote cannot join). */
  readonly diag = { received: {} as Record<string, number> };
  /** The session on the relay (learners' phones follow it there), or null without one. */
  readonly relay: ReturnType<typeof createWebSocketTransport> | null = null;
  /** Peers on the relay besides this host (the phones following), from the relay's `peers` frames. */
  followers = 0;
  private readonly followerFns = new Set<(n: number) => void>();

  /** `?load=perf8`: mount the validation harness's performance layout instead of the site's skin (the frame gate). */
  private readonly perf8: boolean;

  constructor(el: HTMLElement, start: SessionStart, o: { skin: string; theme: string; code?: string | null; load?: 'perf8' | null; relay?: string | null }) {
    this.el = el;
    this.perf8 = o.load === 'perf8';
    this.spec = start.spec;
    this.mode = start.mode;
    this.skin = o.skin;
    this.theme = o.theme;
    this.code = normalizeSessionCode(o.code ?? '') ?? newSessionCode();
    this.record = new RunRecord(() => ({ patient: oneLiner(this.spec), weightKg: this.spec.weightKg }));
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
      // One fast-forward step on the monitor; the clock estimate is exact at every step (the runner reads it).
      // A cockpit ventilating the patient produces the step's frames first (the Ventilator view supports the
      // fast-forward), so the engine never runs a tick without its frame.
      fastForwardStep: async (ticks, last) => {
        this.fastForwarding = !last;
        try {
          if (this.ffTick === null) this.ffCockpit = this.ventLink !== null && performance.now() - this.ventFrameAt < VENT_DRIVING_MS;
          if (ticks > 0 && this.ffCockpit && this.ffTick !== null) await this.ventLink?.runTo(this.ffTick + ticks);
          const r = await this.need().advance(ticks, last);
          this.ffTick = last ? null : r.tick;
          this.lastT = r.simT;
          this.lastWall = performance.now();
          return r;
        } catch (err) {
          this.fastForwarding = false;
          this.ffTick = null;
          throw err;
        } finally {
          if (!this.fastForwarding) this.releaseFrames();
        }
      },
    };
    let hs: HostSession | null = null;
    this.driver = new ScenarioDriver({ target, submit: (c) => (hs as HostSession).submit(c), publish: (e: ScenarioEvent) => hs?.publish(e) });
    hs = new HostSession({
      session: this.code, target: this.driver.host, scenario: this.driver.hook,
      // With a relay, every answer to a hello also carries the monitor style (a phone wears it)
      welcomeEvents: () => [...this.driver.welcomeEvents(), ...(this.relay ? [{ type: 'style' as const, skin: this.skin, theme: this.theme, replay: true as const }] : [])],
      fastForwardWallMs: FF_WALL_MS, // Paced so the room sees the clock run
    });
    this.host = hs;
    const hub = createInProcessHub();
    hs.addTransport(hub.connect());
    this.bc = createBroadcastChannelTransport(this.code);
    hs.addTransport(this.bc);
    this.bc.onMessage((m) => void (this.diag.received[m.kind] = (this.diag.received[m.kind] ?? 0) + 1)); // e2e diagnostics
    // With a relay the session is also offered there, for learners' phones (they may only follow: the relay refuses
    // another device's commands in a classroom, and the host refuses a viewer's)
    if (o.relay) {
      this.relay = createWebSocketTransport({
        url: o.relay,
        onRelayFrame: (f) => {
          if (f.relay !== 'peers') return;
          this.followers = f.peers;
          for (const fn of this.followerFns) fn(f.peers);
        },
      });
      hs.addTransport(this.relay);
      this.onSkin((skin, theme) => hs?.publish({ type: 'style', skin, theme })); // Phones follow a change
    }
    this.panelTransport = hub.connect();
    this.panelTransport.onMessage((m) => void (m.kind === 'event' && m.body.forEach((e) => (this.record.wire(e), this.trackVent(e))))); // every source's commands, in order
    this.panel = new ControllerSession({ session: this.code, transport: this.panelTransport, issuedBy: 'instructor' });
    this.mount(start.seed ?? 7);
    // the runner advances at the engine's sim time; 10 Hz is enough for triggers stated in seconds [ENG]
    this.pollTimer = setInterval(() => !this.fastForwarding && this.driver.poll(), 100); // A fast-forward polls per step
  }

  /** Every change in the number of phones following on the relay. */
  onFollowers(fn: (n: number) => void): () => void {
    this.followerFns.add(fn);
    return () => void this.followerFns.delete(fn);
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

  /**
   * The monitor as the Ventilator view's link sees it — every command the link applies is also sent to a second-screen
   * learner monitor (HostSession.mirror), which otherwise ran an unventilated copy and resynced once a second.
   */
  linked(m: MonitorHandle): Pick<MonitorHandle, 'dispatch' | 'on' | 'pause' | 'resume' | 'setTimeScale'> {
    return {
      dispatch: (c) => {
        // A frame from the cockpit means it ventilates the patient (a fast-forward then steps it along); one from a
        // cockpit opened during a fast-forward waits for its end — refused, the cockpit's first frames would never
        // teach the link its clock and the cockpit would stall for good
        this.ventFrameAt = performance.now();
        const go = () => m.dispatch(c).then((r) => {
          this.host.mirror(c, r, this.ventShown);
          if (r.accepted) this.ventTick = Math.max(this.ventTick, r.tick);
          return r;
        });
        const sent = this.fastForwarding && !this.ffCockpit ? new Promise<void>((res) => this.ffWaiters.push(res)).then(go) : go();
        this.ventInflight = sent.catch(() => undefined);
        return sent;
      },
      on: (fn) => m.on(fn),
      // the cockpit's own time controls are SESSION commands (they acted on the monitor alone: the session bar, a Remote
      // and the next speed change disagreed with them)
      pause: () => void this.panel.send({ type: 'time', action: 'pause' }),
      resume: () => void this.panel.send({ type: 'time', action: 'resume' }),
      setTimeScale: (k) => void this.panel.send({ type: 'time', action: 'scale', value: k }),
    };
  }

  /** The cockpit's frames dispatched so far are applied (or refused): resolves with the last one's engine tick (E128). */
  async ventSettled(): Promise<number> {
    let p: Promise<unknown>;
    do await (p = this.ventInflight);
    while (p !== this.ventInflight);
    return this.ventTick;
  }

  /** E128: follow the engine's own ventilator settings through the commands applied on this session, whoever sent them. */
  private trackVent(e: WireEvent): void {
    if (e.type === 'timeline') return void (this.ventSettings = null); // A new patient or a restore: not known
    if (e.type !== 'commandApplied') return;
    const r = e.resolved as AppliedResolution | undefined;
    const c = r?.command as { type?: string; event?: { kind?: string; source?: string } & VentSettings } | undefined;
    if (r?.mirror || c?.type !== 'applyEvent' || c.event?.kind !== 'ventilation') return;
    const v = c.event;
    if (v.source !== 'ventilator') return void (this.ventSettings = null);
    // As the engine applies it: a field the event leaves out keeps its last value
    const next: VentSettings = { ...this.ventSettings };
    for (const k of ['rr', 'vtMl', 'peep', 'fio2', 'ie', 'pmax'] as const) if (typeof v[k] === 'number') next[k] = v[k];
    this.ventSettings = next;
  }

  /** Called after every (re)mount with the new monitor (the ventilator link re-attaches to it). */
  onMount(fn: (m: MonitorHandle) => void): () => void {
    this.mountFns.add(fn);
    if (this.monitor) fn(this.monitor);
    return () => void this.mountFns.delete(fn);
  }

  /** The cockpit frames held during a fast-forward go to the monitor now (the link learns its clock from them). */
  private releaseFrames(): void {
    for (const res of this.ffWaiters.splice(0)) res();
  }

  /** Sim time: the last engine event's time run forward on the wall clock at the current speed, capped [ENG]. */
  simNow(): number {
    if (this.paused || this.fastForwarding) return this.lastT; // Exact between fast-forward steps
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
    for (const fn of this.scaleFns) fn(k);
  }

  /** Every speed change (the Ventilator view's cockpit runs at the session's speed, not its first one). */
  onTimeScale(fn: (k: number) => void): () => void {
    this.scaleFns.add(fn);
    return () => void this.scaleFns.delete(fn);
  }

  setPaused(p: boolean): void {
    this.lastT = this.simNow();
    this.lastWall = performance.now();
    this.paused = p;
    if (p) this.monitor?.pause();
    else this.monitor?.resume();
  }

  private readonly skinFns = new Set<(skin: string, theme: string) => void>();
  /** Every skin or theme change, wherever it came from. */
  onSkin(fn: (skin: string, theme: string) => void): () => void {
    this.skinFns.add(fn);
    return () => this.skinFns.delete(fn);
  }

  /** Change the monitor's skin or theme. The shell's alarm mirror follows at once, wherever the change came from
   *  (Start, Settings, an imported site profile): the mirror always shows the monitor's colours. */
  async setSkin(skin: string, theme: string): Promise<void> {
    this.skin = skin;
    this.theme = theme;
    for (const f of this.skinFns) f(skin, theme); // The learner monitor follows the style
    applySkinAlarmColours(skin, theme);
    await this.monitor?.setSkin(skin, theme ? { theme } : {});
  }

  enableSound(): Promise<void> {
    return (this.monitor?.enableSound() ?? Promise.resolve()).then(() => void (this.soundOn = true));
  }

  /** Sound off again, for this window (a new patient's monitor stays off too). */
  disableSound(): void {
    this.soundOn = false;
    this.monitor?.disableSound();
  }

  /** A new body (profile, mode) = a new engine; the session code, remote pairing, log and listeners carry on. */
  restart(start: SessionStart): void {
    this.spec = start.spec;
    this.mode = start.mode;
    this.driver.runner = null;
    clearPosition(); // a reload now brings back the new patient, not the case
    this.setLearner(false); // a new patient starts without learner controls
    this.mount(start.seed ?? 7);
    this.panel.note(`Patient restarted: ${start.mode.toUpperCase()}`);
  }

  /** Load a scenario: its patient body restarts the engine, then the runner starts (never silently over a live run —
   *  the caller confirms first). */
  loadScenario(raw: unknown): { ok: true; doc: ScenarioDoc } | { ok: false; reason: string } {
    // The host refuses the scenario command during a fast-forward — the new body would run without its scenario
    if (this.fastForwarding) return { ok: false, reason: 'the simulation is fast-forwarding; try again when it ends' };
    const v = validateScenario(raw);
    if (!v.ok) return { ok: false, reason: v.errors.join('; ') };
    const eo = engineOptionsOf(v.doc, 7);
    const p = v.doc.patient ?? {};
    this.spec = { ageY: p.ageY ?? 40, sex: p.sex ?? 'M', weightKg: p.weightKg ?? 70, heightCm: p.heightCm ?? 175, comorbid: [], attached: true };
    this.mode = v.doc.mode ?? 'modeled';
    this.driver.runner = null;
    clearPosition(); // the old case's position is not this one's
    this.mountWith({ ...eo, mode: this.mode, truthHz: 1, patient: { ...eo.patient, ...(p.sensors ? { sensors: p.sensors } : {}) } });
    this.lastLoad = this.panel.send({ type: 'scenario', action: 'load', doc: v.doc });
    this.live = true;
    return { ok: true, doc: v.doc };
  }

  destroy(): void {
    clearInterval(this.pollTimer);
    this.offMon?.();
    this.monitor?.destroy();
    this.panel.close();
    this.bc.close();
    this.relay?.close();
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
    // O2 (research/34 §8 O2): a skin with nibp.applyAtStart starts the cuff on AUTO at the free-play patient's start —
    // once per start (not per skin switch, not for scenarios or ?load=perf8), mirrored to a learner monitor
    const m = this.monitor;
    const action = this.spec.attached && m?.skin ? nibpStartCommand(m.skin.skin) : null;
    if (m && action) {
      const c = { id: `nibp-default-${seed}-${Date.now()}-${++this.nibpStarts}`, // unique across host reloads too (R-T m4)
        issuedBy: 'device', type: 'device', action } as Command;
      void m.dispatch(c).then((r) => this.host.mirror(c, r));
    }
  }

  private mountWith(engine: NonNullable<Parameters<typeof mountMonitor>[1]>['engine']): void {
    this.offMon?.();
    this.monitor?.destroy();
    this.el.replaceChildren();
    this.lastT = 0;
    this.lastWall = performance.now();
    this.last = {};
    this.fastForwarding = false; // A new monitor (the host stops a fast-forward on the old timeline)
    this.ffTick = null;
    this.releaseFrames();
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
      this.record.engine(e);
      if (e.type !== 'truth') for (const fn of this.listeners) fn(e); // truth (≈ 25 KB at 1 Hz) stays on this page
      for (const fn of this.appFns) fn(e);
    });
    // a new engine = a new timeline: every controller (this page's panel, a paired Remote) restarts its clock and
    // scenario timer here instead of holding the old body's high-water time (showcase rehearsal 2026-10-04)
    this.host.newTimeline();
    m.setTimeScale(this.timeScale);
    if (this.paused) m.pause();
    if (this.soundOn) void m.enableSound();
    for (const fn of this.mountFns) fn(m);
  }
}
