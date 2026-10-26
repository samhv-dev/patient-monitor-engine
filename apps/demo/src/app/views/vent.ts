// Ventilator (research/13 §4.6): the Stage V cockpit beside THIS session's monitor, linked both ways over the Stage V
// link (a direct same-origin frame port since FX-1). The cockpit keeps its own device look inside its frame (research/13 P13). It loads on first
// visit; the link re-attaches when the patient restarts (a new engine).
// E128 (owner, 26 October): the cockpit drives the patient only while the view is ON SCREEN. Its frames never reach the
// phones (samples: the relay drops them), so a cockpit left driving off screen made every phone resync every ≈ 4 s for
// the rest of the case. When the view closes it hands the patient over to the engine's own ventilator — ONE
// `ventilation` command with the cockpit's settings, after its last frame — and stops (paused, unlinked: it sends
// nothing); the patient stays ventilated (FU-11 H6) and the phones follow it exactly. Back on the view the cockpit takes
// over again from the engine's current ventilator settings.
import type { Command } from '@pme/engine-core';
import { attachMonitorToLink, createFramePort, type VentConfig, type VentDriver } from '@pme/ventilator';
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

export function ventView(session: AppSession): View {
  const frame = h('iframe', { class: 'iframe vent', title: 'Ventilator' });
  const el = h('section', { 'aria-label': 'Ventilator' }, frame);
  let started = false;
  /** The view is on screen and its cockpit is linked to the monitor (it drives the patient). */
  let linked = false;
  let gen = 0; // Bumped on every enter and leave: a hand-over overtaken by a re-entry does nothing
  let handing = false; // A hand-over has not reached the engine yet (the engine's settings are not the cockpit's)
  let port: ReturnType<typeof createFramePort> | null = null;
  let detach: () => void = () => {};
  let offAttach: () => void = () => {};
  const cockpit = (): VentDriver | null => {
    try {
      return (frame.contentWindow as unknown as { __vent?: VentDriver } | null)?.__vent ?? null;
    } catch {
      return null;
    }
  };

  /** Link the cockpit to the monitor (and to every new monitor while it stays linked). */
  const link = () => {
    if (linked || !port) return;
    linked = true;
    const p = port;
    session.ventTick = -1;
    offAttach = session.onMount((m) => {
      detach();
      const l = attachMonitorToLink(session.linked(m), p, (c, r) => console.warn('vent link rejected', c.type, r));
      detach = l;
      session.ventLink = l; // A fast-forward steps this cockpit with the engine
      // O4 (research/34 §8 O4): the patient starts without the CO2 line; the cockpit ventilating it attaches the line,
      // through the link so a learner monitor mirrors it
      const co2 = (session.last.state as { sensors?: Record<string, string> } | undefined)?.sensors?.co2;
      if (co2 === undefined || co2 === 'off') void session.linked(m).dispatch({ id: `vent-co2-${Date.now()}`, issuedBy: 'device', type: 'attachSensor', sensor: 'co2', state: 'on' } as Command);
    });
    p.post({ v: 1, kind: 'time', action: 'resume' });
  };
  /** Stop the cockpit: paused (it computes and sends nothing) and unlinked (anything still on its way is dropped). */
  const unlink = () => {
    if (!linked) return;
    linked = false;
    port?.post({ v: 1, kind: 'time', action: 'pause' });
    offAttach();
    detach();
    detach = () => {};
    session.ventLink = null;
  };

  /**
   * The view closed: the engine's own ventilator takes the patient over with the cockpit's settings, on the tick after
   * the cockpit's last frame, then the phones are released (`cockpitOff`, UI-A #2). A fast-forward running now keeps the
   * cockpit stepping with it (it supports the span) and the hand-over waits for its end. Refused, the cockpit drives on
   * off screen, as before E128, rather than leave the patient without a ventilator.
   */
  const handOver = async (g: number): Promise<void> => {
    handing = true;
    try {
      await handOverNow(g);
    } finally {
      if (g === gen) handing = false;
    }
  };
  const handOverNow = async (g: number): Promise<void> => {
    while (session.host.fastForwarding) {
      await new Promise((res) => setTimeout(res, 250));
      if (g !== gen) return;
    }
    const v = cockpit();
    const cfg = v ? { ...v.vs.cfg } : null;
    const measured = v ? { RR: v.vs.p.measured.RR, VTE: v.vs.p.measured.VTE } : undefined;
    unlink();
    const last = await session.ventSettled();
    if (g !== gen) return;
    if (last < 0) return session.host.cockpitOff(); // It never drove the patient: nothing to hand over
    if (!cfg) {
      link(); // Its settings cannot be read: it drives on off screen (FU-11 H6), as before E128
      return session.host.cockpitOff();
    }
    const event = { kind: 'ventilation', source: 'ventilator', ...engineVentilation(cfg, measured) };
    const r = await session.host.submit({ id: `vent-handover-${Date.now()}`, issuedBy: 'ventilator', type: 'applyEvent', event, atTick: last + 1 } as never);
    if (g !== gen) return;
    if (!r.accepted) {
      console.warn('ventilator hand-over refused:', r.reason);
      link(); // FU-11 H6: the patient stays ventilated
    }
    session.host.cockpitOff();
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
        if (linked || !port) return;
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
        if (!linked) p.post({ v: 1, kind: 'time', action: 'pause' });
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
      if (!linked) return session.host.cockpitOff();
      void handOver(gen);
    },
  };
  return view;
}
