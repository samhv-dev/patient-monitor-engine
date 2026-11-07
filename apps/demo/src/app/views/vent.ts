// Ventilator (research/13 §4.6): the Stage V cockpit beside THIS session's monitor, linked both ways over the Stage V
// link (a direct same-origin frame port since FX-1). The cockpit keeps its own device look inside its frame (research/13 P13). It loads on first
// visit; the link re-attaches when the patient restarts (a new engine).
// E128 (owner, 26 October): the cockpit drives the patient only while the view is ON SCREEN. Its frames never reach the
// phones (samples: the relay drops them), so a cockpit left driving off screen made every phone resync every ≈ 4 s for
// the rest of the case. When the view closes it hands the patient over to the engine's own ventilator — ONE
// `ventilation` command with the cockpit's settings, after its last frame — and stops (paused, unlinked: it sends
// nothing); the patient stays ventilated (FU-11 H6) and the phones follow it exactly. Back on the view the cockpit takes
// over again from the engine's current ventilator settings.
// R8c (plan room-and-instruments.md §7): ONE cockpit drives at a time — this view's, or a remote cockpit on another
// device (a `ventilator` granted with the instructor's PIN, over the relay) — through one desk sharing link, unlink and
// handOver: opening one hands the other over first. The remote drives exactly as the view does, and is handed over
// with its last settings the moment its page is hidden, its socket closes, its grant is revoked, or it is silent 1 s.
import type { Command } from '@pme/engine-core';
import type { VentLinkBody } from '@pme/controller';
import {
  attachMonitorToLink, createFramePort, createRelayPort, LEAD_TICKS, type CockpitSettings, type LinkPort, type RelayPort, type VentConfig, type VentDriver, type VentWireBody,
} from '@pme/ventilator';
import { parseRoute } from '../router.ts';
import type { AppSession, VentSettings } from '../session.ts';
import { h } from '../ui.ts';
import type { View } from '../shell.ts';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

/**
 * The cockpit's settings as the engine's `ventilation` event takes them (its own ventilator is volume control). VC and
 * PRVC hand over their set (target) volume; a pressure or spontaneous mode the volume and, for PSV/PAV, the rate it last
 * measured. I:E from the cockpit's inspiratory time (VC: VT / flow + pause; at the monitor-matched flow, 1:2).
 */
export function engineVentilation(cfg: VentConfig, measured?: { RR: number; VTE: number }): VentSettings {
  const spont = cfg.mode === 'PSV' || cfg.mode === 'PAV';
  const rr = spont && measured && measured.RR > 0 ? measured.RR : cfg.rate;
  const vt = cfg.mode === 'VC' ? cfg.vt : cfg.mode === 'PRVC' ? cfg.prvcTarget : measured && measured.VTE > 0 ? measured.VTE : cfg.vt;
  const ti = cfg.mode === 'VC' ? cfg.vt / 1000 / Math.max(0.05, cfg.vcFlow / 60) + cfg.pause : cfg.itime;
  const period = 60 / clamp(rr, 4, 80);
  return {
    rr: Math.round(clamp(rr, 1, 80)), vtMl: Math.round(clamp(vt, 10, 1500)), peep: r1(clamp(cfg.peep, 0, 30)), fio2: Math.round(clamp(cfg.fio2, 21, 100)) / 100,
    ie: r1(clamp((period - ti) / Math.max(0.05, ti), 0.5, 4)), pmax: Math.round(clamp(cfg.pmax, 10, 80)),
  };
}

/** The engine's ventilator settings as a cockpit settings patch (volume control; only what is known). */
export function cockpitPatch(s: VentSettings, cfg?: Pick<VentConfig, 'mode'>): Partial<VentConfig> {
  const p: Partial<VentConfig> = {};
  if (cfg && cfg.mode !== 'VC') Object.assign(p, { mode: 'VC', modeLabel: null });
  if (s.rr !== undefined) p.rate = s.rr;
  if (s.vtMl !== undefined) p.vt = s.vtMl;
  if (s.peep !== undefined) p.peep = s.peep;
  if (s.fio2 !== undefined) p.fio2 = Math.round(s.fio2 * 100);
  if (s.pmax !== undefined) p.pmax = s.pmax;
  return p;
}

/** R8c: one cockpit that can drive the patient — this view's, or a remote cockpit over the relay. */
export interface Cockpit {
  /** The host's end of its link. */
  readonly port: LinkPort;
  /** A remote cockpit holds the phones wherever the laptop is; the view's only while it is on screen (UI-A #2). */
  readonly remote: boolean;
  /** Its settings now, for a hand-over (null: they cannot be read). */
  settings(): CockpitSettings | null;
  /** Called when the desk handed it over because another cockpit opened. */
  displaced?(): void;
}

/** R8c: ONE cockpit drives at a time (plan §7 R8c: the view, the laptop window, the device), through link, unlink and handOver. */
export interface CockpitDesk {
  /** The cockpit driving the patient now (linked to the monitor), or null. */
  readonly driving: Cockpit | null;
  /** `c` drives: the one driving now is handed over first (to the engine's ventilator), and `c` starts from those settings. */
  take(c: Cockpit, still: () => boolean): Promise<void>;
  /** Stop the driving cockpit: paused (it computes and sends nothing) and unlinked (anything on its way is dropped). */
  unlink(): void;
  /**
   * E128: the engine's own ventilator takes the patient from `c` with its settings, on the tick after its last frame; then
   * (`release`) the phones are released (`cockpitOff`, UI-A #2) unless another cockpit drives. Resolves with that last
   * frame's tick (−1: it never drove; undefined: overtaken, `still()` false). A fast-forward running now keeps the cockpit
   * stepping with it and the hand-over waits for its end. Refused, the cockpit drives on, as before E128, rather than
   * leave the patient without a ventilator (FU-11 H6).
   */
  handOver(c: Cockpit, still: () => boolean, release: boolean): Promise<number | undefined>;
}

const desks = new WeakMap<AppSession, CockpitDesk>();
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

/** The session's one desk. */
export function cockpitDesk(session: AppSession): CockpitDesk {
  const had = desks.get(session);
  if (had) return had;
  let driving: Cockpit | null = null;
  let detach: () => void = () => {};
  let offAttach: () => void = () => {};
  /** Link `c` to the monitor (and to every new monitor while it stays linked). */
  const link = (c: Cockpit) => {
    if (driving === c) return;
    if (driving) desk.unlink();
    driving = c;
    session.ventRemote = c.remote;
    const p = c.port;
    session.ventTick = -1;
    offAttach = session.onMount((m) => {
      detach();
      const l = attachMonitorToLink(session.linked(m), p, (cmd, r) => console.warn('vent link rejected', cmd.type, r));
      detach = l;
      session.ventLink = l; // A fast-forward steps this cockpit with the engine
      // O4 (research/34 §8 O4): the patient starts without the CO2 line; the cockpit ventilating it attaches the line,
      // through the link so a learner monitor mirrors it
      const co2 = (session.last.state as { sensors?: Record<string, string> } | undefined)?.sensors?.co2;
      if (co2 === undefined || co2 === 'off') void session.linked(m).dispatch({ id: `vent-co2-${Date.now()}`, issuedBy: 'device', type: 'attachSensor', sensor: 'co2', state: 'on' } as Command);
    });
    p.post({ v: 1, kind: 'time', action: 'resume' });
  };
  const desk: CockpitDesk = {
    get driving() {
      return driving;
    },
    async take(c, still) {
      const other = driving !== null && driving !== c ? driving : null;
      if (!other) return link(c);
      const handed = other.settings();
      const last = await desk.handOver(other, still, false);
      other.displaced?.();
      if (!still() || driving !== null) return; // overtaken, or the other drives on (its hand-over was refused)
      // its frames run ahead of the engine: `c` starts after the last of them, so two cockpits never drive one tick
      if (last !== undefined && last >= 0) while (Math.floor(session.simNow() / 0.02 + 1e-6) <= last) {
        await sleep(20);
        if (!still() || driving !== null) return;
      }
      const s = handed ? engineVentilation(handed.cfg, handed.measured) : session.ventSettings; // what the other handed over
      if (s) c.port.post({ v: 1, kind: 'control', patch: cockpitPatch(s, c.settings()?.cfg) });
      link(c);
    },
    unlink() {
      const c = driving;
      if (!c) return;
      driving = null;
      session.ventRemote = false;
      c.port.post({ v: 1, kind: 'time', action: 'pause' });
      offAttach();
      detach();
      detach = () => {};
      session.ventLink = null;
    },
    async handOver(c, still, release) {
      while (session.host.fastForwarding) {
        await sleep(250);
        if (!still()) return undefined;
      }
      if (driving !== c) return undefined;
      const s = c.settings();
      desk.unlink();
      const last = await session.ventSettled();
      if (!still()) return undefined;
      const off = () => void (release && !driving?.remote && session.host.cockpitOff());
      if (last < 0) return (off(), last); // It never drove the patient: nothing to hand over
      if (!s) {
        link(c); // Its settings cannot be read: it drives on (FU-11 H6), as before E128
        return (off(), last);
      }
      const event = { kind: 'ventilation', source: 'ventilator', ...engineVentilation(s.cfg, s.measured) };
      const r = await session.host.submit({ id: `vent-handover-${Date.now()}`, issuedBy: 'ventilator', type: 'applyEvent', event, atTick: last + 1 } as never);
      if (!still()) return undefined;
      if (!r.accepted) {
        console.warn('ventilator hand-over refused:', r.reason);
        link(c); // FU-11 H6: the patient stays ventilated
      }
      off();
      return last;
    },
  };
  desks.set(session, desk);
  return desk;
}

/** R8c: a remote cockpit silent this long is handed over [ENG: it sends 50 link messages a second and its settings once a
 *  second, so 1 s is 50 missed; the relay's heartbeat would take up to 20 s, too long for an unventilated patient]. */
export const COCKPIT_SILENCE_MS = 1000;

/**
 * R8c: the host drives from the granted remote cockpit (HostSession onVent / onVentilator) exactly as the view does: its
 * frames go through `attachMonitorToLink(session.linked(m), relayPort)` on the desk, so the engine stays the master
 * clock, the frames are stamped on the host, mirrored to a same-browser viewer, and every network follower holds. It
 * starts on its first message (from the engine's own settings); it is handed over with its last settings when its page
 * says hidden, its grant ends (revoked, taken over, its socket closed) or it is silent COCKPIT_SILENCE_MS; it takes over
 * again on its next message after a silence, or when its page is shown again (not while another cockpit displaced it).
 */
export function serveRemoteCockpit(session: AppSession): () => void {
  const desk = cockpitDesk(session);
  type Remote = {
    from: string; port: RelayPort; cockpit: Cockpit; deliver: ((b: VentWireBody) => void) | null;
    last: CockpitSettings | null; heardAt: number; hidden: boolean; displaced: boolean; starting: boolean;
    /** The furthest ventilator tick it may have run to: its last frame heard, or the last clock limit it was sent. */
    topTick: number;
  };
  let cur: Remote | null = null;
  let gen = 0; // bumped on every change of grant: a hand-over or a start for an old one does nothing more
  let timer: ReturnType<typeof setTimeout> | null = null;
  const now = () => performance.now();
  const lose = (r: Remote) => {
    if (desk.driving !== r.cockpit) return;
    const g = gen;
    // refused, it drives on (FU-11 H6): the watchdog runs again for it
    void desk.handOver(r.cockpit, () => g === gen, true).then(() => arm());
  };
  /** The silence watchdog: one timer, re-armed for what is left of the second since the last message. */
  const arm = () => {
    if (timer !== null || !cur || desk.driving !== cur.cockpit) return;
    timer = setTimeout(() => {
      timer = null;
      if (!cur || desk.driving !== cur.cockpit) return;
      if (now() - cur.heardAt >= COCKPIT_SILENCE_MS) return lose(cur);
      arm();
    }, Math.max(0, cur.heardAt + COCKPIT_SILENCE_MS - now()));
  };
  const start = (r: Remote) => {
    r.starting = true;
    const g = gen;
    const s = session.ventSettings; // it takes over from the engine's own ventilator (what was handed over, or set since)
    if (s) r.cockpit.port.post({ v: 1, kind: 'control', patch: cockpitPatch(s, r.last?.cfg) });
    r.cockpit.port.post({ v: 1, kind: 'time', action: 'scale', value: session.timeScale });
    const go = desk.take(r.cockpit, () => g === gen && !r.hidden);
    void go.then(() => {
      r.starting = false;
      if (g !== gen || desk.driving !== r.cockpit) return;
      // a cockpit at its clock limit sends no frame the new link could learn its offset from (cut off, it ran to the last
      // limit it had; its frames on the way were lost): let it run past it, as the link does after a restore (FX-1)
      if (r.topTick >= 0) r.cockpit.port.post({ v: 1, kind: 'clock', ventTick: r.topTick + 2 * LEAD_TICKS });
      arm();
    });
  };
  const offRemote = session.onRemoteVent({
    ventilator(from) {
      if (cur && cur.from === from) return;
      gen++;
      const old = cur;
      cur = null;
      if (old) {
        if (desk.driving === old.cockpit) void desk.handOver(old.cockpit, () => true, true); // revoked, taken over, gone
        old.port.close();
      }
      if (from === null) return;
      const r: Remote = {
        from, deliver: null, last: null, heardAt: now(), hidden: false, displaced: false, starting: false, topTick: -1,
        port: null as unknown as RelayPort, cockpit: null as unknown as Cockpit,
      };
      r.port = createRelayPort({
        send: (b) => void session.host.ventPost(b as VentLinkBody),
        onBody: (fn) => ((r.deliver = fn), () => void (r.deliver = null)),
      });
      const port: LinkPort = {
        post: (m) => {
          if (m.kind === 'clock' || m.kind === 'run') r.topTick = Math.max(r.topTick, m.ventTick);
          r.port.post(m);
        },
        onMessage: (fn) => r.port.onMessage(fn),
        close: () => r.port.close(),
      };
      r.cockpit = { port, remote: true, settings: () => r.last, displaced: () => void (r.displaced = true) };
      cur = r;
    },
    vent(from, body) {
      const r = cur;
      if (!r || r.from !== from) return;
      const b = body as VentWireBody;
      r.heardAt = now();
      for (const m of b.kind === 'batch' ? b.msgs : b.kind === 'cmds' ? [b] : []) r.topTick = Math.max(r.topTick, m.tick);
      if (b.kind === 'settings') {
        r.last = { cfg: b.cfg, ...(b.measured ? { measured: b.measured } : {}) };
        if (b.hidden && !r.hidden) {
          r.hidden = true;
          r.displaced = false; // shown again, it takes over
          lose(r);
        } else if (!b.hidden) r.hidden = false;
      }
      if (desk.driving !== r.cockpit && !r.starting && !r.hidden && !r.displaced) start(r);
      r.deliver?.(b);
      arm();
    },
  });
  const offScale = session.onTimeScale((k) => cur?.port.post({ v: 1, kind: 'time', action: 'scale', value: k }));
  return () => {
    offRemote();
    offScale();
    if (timer !== null) clearTimeout(timer);
    cur?.port.close();
  };
}

export function ventView(session: AppSession): View {
  const frame = h('iframe', { class: 'iframe vent', title: 'Ventilator' });
  const el = h('section', { 'aria-label': 'Ventilator' }, frame);
  const desk = cockpitDesk(session);
  let started = false;
  let gen = 0; // Bumped on every enter and leave: a hand-over overtaken by a re-entry does nothing
  let handing = false; // A hand-over has not reached the engine yet (the engine's settings are not the cockpit's)
  let port: ReturnType<typeof createFramePort> | null = null;
  let mine: Cockpit | null = null; // this view's cockpit on the desk (one per loaded cockpit)
  const cockpit = (): VentDriver | null => {
    try {
      return (frame.contentWindow as unknown as { __vent?: VentDriver } | null)?.__vent ?? null;
    } catch {
      return null;
    }
  };
  /** The view's cockpit drives the patient (it is linked to the monitor). */
  const linked = () => mine !== null && desk.driving === mine;
  /** Link the cockpit to the monitor; a remote cockpit driving now is handed over first. */
  const link = () => {
    if (!mine || linked()) return;
    const g = gen;
    void desk.take(mine, () => g === gen);
  };
  const unlink = () => {
    if (linked()) desk.unlink();
  };

  /**
   * The view closed: the engine's own ventilator takes the patient over with the cockpit's settings, on the tick after
   * the cockpit's last frame, then the phones are released (CockpitDesk.handOver).
   */
  const handOver = async (g: number): Promise<void> => {
    handing = true;
    try {
      if (mine) await desk.handOver(mine, () => g === gen, true);
    } finally {
      if (g === gen) handing = false;
    }
  };

  const view: View = {
    id: 'vent', el,
    enter: () => {
      gen++;
      session.ventShown = true;
      if (started) {
        // Back on the view after a hand-over: the cockpit starts again from the engine's own ventilator settings (what it
        // handed over, or what the instructor or the case has set since). Back before it (a fast-forward was running),
        // the cockpit never stopped and keeps its own.
        if (linked() || !port) return;
        const s = handing ? null : session.ventSettings; // Back before the hand-over landed: it keeps its own
        handing = false;
        if (s) port.post({ v: 1, kind: 'control', patch: cockpitPatch(s, cockpit()?.vs.cfg) });
        port.post({ v: 1, kind: 'time', action: 'scale', value: session.timeScale });
        link();
        return;
      }
      started = true;
      const name = `v${session.code.toLowerCase()}`;
      // FX-1: the link to this view's own iframe is a direct same-origin frame port, not BroadcastChannel (on CI's Linux
      // WebKit, messages to the iframe — BroadcastChannel or postMessage — came seconds late or never once the view was
      // hidden: a speed change was lost, and without `clock` messages the cockpit stopped). `&via=parent` tells the cockpit.
      const p = createFramePort(name, () => frame.contentWindow);
      port = p;
      mine = {
        port: p, remote: false,
        settings: () => {
          const v = cockpit();
          return v ? { cfg: { ...v.vs.cfg }, measured: { RR: v.vs.p.measured.RR, VTE: v.vs.p.measured.VTE } } : null;
        },
      };
      // A NEW patient (patient restart, scenario load) unloads the cockpit. It kept running with the last case's
      // settings and re-attached to every new monitor, so a case run after the Ventilator view had been opened was
      // ventilated by the old cockpit (haemorrhage: pulse lost 10:08 instead of 10:03). The next visit loads a fresh
      // cockpit, as on a fresh page; if the view is on screen it reloads at once.
      let mounts = 0;
      const offReset = session.onMount(() => {
        if (++mounts === 1) return; // the patient the cockpit was opened for
        offReset();
        offScale();
        unlink();
        gen++; // a hand-over in progress is for the old patient
        port = null;
        mine = null;
        p.close();
        frame.onload = null;
        frame.src = 'about:blank';
        started = false;
        // On screen = the route the URL names NOW, not the last hashchange handled: a restart in the same task as a route
        // change (or ahead of its queued hashchange, as Linux WebKit runs a Playwright call) saw a stale flag and reloaded
        // the cockpit off screen.
        if (parseRoute(location.hash).id === 'vent') queueMicrotask(() => view.enter?.('')); // after the mount loop (a new subscription would be visited by it)
      });
      link();
      // as the Stage V link page does: once the cockpit has loaded, send it an empty patch (its first control message)
      // and this session's speed; loaded after the view closed, it waits paused
      frame.onload = () => {
        p.post({ v: 1, kind: 'control', patch: {} });
        p.post({ v: 1, kind: 'time', action: 'scale', value: session.timeScale });
        if (!linked()) p.post({ v: 1, kind: 'time', action: 'pause' });
      };
      // The cockpit follows every later speed change too — opened at ×1 and then run at ×4 it ventilated at a quarter
      // of the patient's pace (RR 3–7, SpO2 85–89) while its own screen looked normal (presenter rehearsal)
      const offScale = session.onTimeScale((k) => p.post({ v: 1, kind: 'time', action: 'scale', value: k }));
      frame.src = `./vent-hamilton.html?link=${name}&profile=normal&via=parent`;
    },
    // UI-A #2 (demo review 24 Oct #2): the phones hold for the cockpit only while the view is on screen. E128: leaving it
    // hands the patient to the engine's ventilator and releases the phones.
    leave: () => {
      gen++;
      session.ventShown = false;
      if (!linked()) return void (desk.driving === null && session.host.cockpitOff()); // a remote cockpit holds them
      void handOver(gen);
    },
  };
  return view;
}
