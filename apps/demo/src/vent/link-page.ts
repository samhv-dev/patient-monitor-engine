// vent-link.html: the Hamilton ventilator (iframe, its own window context) and the patient monitor side by side,
// linked over BroadcastChannel `pme-vent/<session>` (R27 both ways). The profile picker remounts the monitor
// with the profile's patient and tells the ventilator to load the profile's lung; the demo buttons run DEMOS.
import type { EngineEvent } from '@pme/engine-core';
import { mountMonitor, type MonitorHandle } from '@pme/renderer';
import { attachMonitorToLink, createBroadcastPort, PROFILES, type LinkMsg, type ProfileId, type VentConfig } from '@pme/ventilator';
import { DEMOS, type LinkDemo } from './demos.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const session = `v${Math.floor(Math.random() * 1e9).toString(36)}`;
const port = createBroadcastPort(session);
const post = (m: Omit<Extract<LinkMsg, { kind: 'control' }>, 'v' | 'kind'>) => port.post({ v: 1, kind: 'control', ...m });

let profile: ProfileId = 'normal';
let pm: MonitorHandle | null = null;
let detach: () => void = () => {};
const last: Record<string, number> = {};
let simT = 0;
let pending: { demo: LinkDemo; at: number } | null = null;

function mount(id: ProfileId) {
  detach();
  pm?.destroy();
  profile = id;
  const m = mountMonitor($('monitor'), {
    skin: 'philips-like', engine: { seed: 7, patient: (PROFILES[id] ?? PROFILES.normal)!.patient },
    lanes: ['ecgII'], waves: ['abp', 'cvp', 'pleth', 'co2'], temp: false,
  });
  pm = m;
  void m.dispatch({ id: 'link-ga', issuedBy: 'vent-link', type: 'applyEvent', event: { kind: 'thermal', anaesthesia: 'general' } });
  detach = attachMonitorToLink(m, port, (c, r) => console.warn('link command rejected', c.type, r));
  m.on(onEvent);
  m.setTimeScale(Number($<HTMLSelectElement>('speed').value));
}

function onEvent(e: EngineEvent) {
  if (e.type === 'state') simT = e.t;
  if (e.type === 'measurement') for (const [k, v] of Object.entries(e.values)) if (v && v.value !== null) last[k] = v.value;
  if (pending && simT >= pending.at) {
    post({ patch: pending.demo.step });
    for (const t of pending.demo.engineStep ?? []) void pm?.dispatch({ id: `demo-${t.variable}-${simT}`, issuedBy: 'vent-link', type: 'setTarget', variable: t.variable, value: t.value, ...(t.rampS ? { ramp: { durationS: t.rampS } } : {}) });
    pending = null;
  }
  const f = (k: string, d = 0) => (last[k] === undefined ? '--' : (last[k] as number).toFixed(d));
  $('status').textContent =
    `profile ${PROFILES[profile]?.label}   t ${simT.toFixed(0)} s${pending ? `   step in ${(pending.at - simT).toFixed(0)} s` : ''}\n` +
    `SpO2 ${f('spo2')}  EtCO2 ${f('etco2')}  ABP ${f('abpSys')}/${f('abpDia')} (${f('abpMean')})  CVP ${f('cvpMean')}  HR ${f('hr')}`;
}

function loadVent(id: ProfileId, patch: Partial<VentConfig> = {}) {
  $<HTMLIFrameElement>('vent').src = `vent-hamilton.html?link=${session}&profile=${id}`;
  $<HTMLIFrameElement>('vent').onload = () => {
    post({ patch });
    port.post({ v: 1, kind: 'time', action: 'scale', value: Number($<HTMLSelectElement>('speed').value) });
  };
}

const sel = $<HTMLSelectElement>('profile');
const groups = new Map<string, HTMLOptGroupElement>();
for (const [id, p] of Object.entries(PROFILES)) {
  let g = groups.get(p.group);
  if (!g) {
    g = document.createElement('optgroup');
    g.label = p.group;
    groups.set(p.group, g);
    sel.append(g);
  }
  const o = new Option(p.label, id);
  if (p.stage7) o.title = `not yet acting: ${p.stage7}`;
  g.append(o);
}
sel.addEventListener('change', () => {
  pending = null;
  mount(sel.value as ProfileId);
  loadVent(profile);
});
$('speed').addEventListener('change', () => {
  const k = Number($<HTMLSelectElement>('speed').value);
  pm?.setTimeScale(k);
  port.post({ v: 1, kind: 'time', action: 'scale', value: k });
});
for (const demo of DEMOS) {
  const b = document.createElement('button');
  b.textContent = demo.label;
  b.title = demo.watch;
  b.dataset.demo = demo.id;
  b.addEventListener('click', () => {
    sel.value = demo.profile;
    mount(demo.profile);
    loadVent(demo.profile, demo.start);
    pending = { demo, at: demo.settleS };
  });
  $('demos').append(b);
}
$('disc').addEventListener('click', () => {
  const on = $('disc').getAttribute('aria-pressed') !== 'true';
  $('disc').setAttribute('aria-pressed', String(on));
  $('disc').textContent = on ? 'Reconnect' : 'Disconnect';
  post({ circuit: on ? 'disconnected' : 'connected' });
});

mount('normal');
loadVent('normal');
(window as unknown as { __link: unknown }).__link = { session, last, get simT() { return simT; }, get pm() { return pm; }, post, DEMOS };
