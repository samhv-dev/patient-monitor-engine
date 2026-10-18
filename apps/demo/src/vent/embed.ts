// The ventilator-simulator embed: the Hamilton ventilator and the patient monitor in ONE page that opens from
// file:// with no server. The monitor is the release IIFE (window.PatientMonitor, its own <script>); this file
// becomes dist/embed/pme-ventilator-embed.iife.js (vite.embed.config.ts, global PmeVentilatorEmbed). Ventilator and
// monitor talk over an in-page LinkPort pair: the same link messages vent-link.html sends over BroadcastChannel
// (frames in, lungState out, the engine as master clock).
import type { MonitorHandle, MountOptions } from '@pme/renderer';
import { attachMonitorToLink, createLocalPortPair, createVentDriver, monitorMatchedFlow, PROFILES, type ProfileId, type VentConfig, type VentDriver } from '@pme/ventilator';
import { mountHamiltonUi } from './hamilton-ui.ts';

/** The part of window.PatientMonitor the embed needs (structural, so the IIFE is not bundled twice). */
export interface PatientMonitorGlobal {
  version: string;
  mountMonitor(el: HTMLElement, o: MountOptions): MonitorHandle;
}

export interface EmbedOptions {
  /** Element that receives the monitor. */
  monitor: HTMLElement;
  /** Link profile (lung-pathology row id); default 'normal'. */
  profile?: ProfileId;
  /** Monitor skin; default 'philips-like'. */
  skin?: string;
  /** Defaults to window.PatientMonitor. */
  pm?: PatientMonitorGlobal;
}

export interface Embed {
  vent: VentDriver;
  monitor: MonitorHandle;
  /** Latest measured numerics by key (spo2, etco2, hr, abpMean, …), for pages and tests. */
  last: Record<string, number>;
  /** Engine sim time of the newest state event (s). */
  simT(): number;
  /** Change ventilator settings, as a user turning its knobs would (a link `control` message). */
  setVent(patch: Partial<VentConfig>): void;
  /** Time scale for both sides, clamped to 0.25–4: the speeds the embed is tested at (the engine itself allows up to MAX_TIME_SCALE). */
  setSpeed(k: number): void;
  destroy(): void;
}

export function mountEmbed(o: EmbedOptions): Embed {
  const pm = o.pm ?? (globalThis as unknown as { PatientMonitor?: PatientMonitorGlobal }).PatientMonitor;
  if (!pm) throw new Error('window.PatientMonitor is missing: load patient-monitor.iife.js before pme-ventilator-embed.iife.js');
  const id: ProfileId = o.profile && o.profile in PROFILES ? o.profile : 'normal';
  const [ventSide, monitorSide] = createLocalPortPair();
  const monitor = pm.mountMonitor(o.monitor, {
    skin: o.skin ?? 'philips-like',
    engine: { seed: 7, patient: (PROFILES[id] ?? PROFILES.normal)!.patient },
    lanes: ['ecgII'], waves: ['abp', 'cvp', 'pleth', 'co2'], temp: false,
  });
  // a sedated, ventilated patient (as vent-link.html): general-anaesthesia thermal/metabolic state
  void monitor.dispatch({ id: 'embed-ga', issuedBy: 'vent-embed', type: 'applyEvent', event: { kind: 'thermal', anaesthesia: 'general' } });
  const detach = attachMonitorToLink(monitor, monitorSide, (c, r) => console.warn('link command rejected', c.type, r));
  const vent = createVentDriver(ventSide, id);
  // As vent-hamilton.html does when linked: VC runs at the monitor ventilator's flow for the set VT and rate until the
  // user sets Flow or Pause here, so the same settings deliver the same volume.
  let matched = true;
  const onInput = (e: Event) => {
    const k = (e.target as HTMLElement | null)?.dataset?.key;
    if (k === 'vcFlow' || k === 'pause') matched = false;
  };
  addEventListener('input', onInput, true);
  const frame = vent.frame;
  vent.frame = (ms) => {
    if (matched && vent.vs.cfg.mode === 'VC') Object.assign(vent.vs.cfg, monitorMatchedFlow(vent.vs.cfg));
    frame(ms);
  };
  const ui = mountHamiltonUi(vent);
  const last: Record<string, number> = {};
  let t = 0;
  const off = monitor.on((e) => {
    if (e.type === 'state') t = e.t;
    if (e.type === 'measurement') for (const [k, v] of Object.entries(e.values)) if (v && v.value !== null) last[k] = v.value;
  });
  return {
    vent, monitor, last,
    simT: () => t,
    setVent: (patch) => monitorSide.post({ v: 1, kind: 'control', patch }),
    setSpeed(k) {
      const s = Math.min(4, Math.max(0.25, k));
      monitor.setTimeScale(s);
      vent.scale = s;
    },
    destroy() {
      off();
      removeEventListener('input', onInput, true);
      ui.stop();
      detach();
      vent.dispose();
      monitor.destroy();
    },
  };
}
