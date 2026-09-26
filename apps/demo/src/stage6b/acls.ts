// Stage 6b demo: the host monitor runs a scenario. Hidden instructor panel (Scenario tab: load, state, next
// transitions, triggers, goto, timeline), a learner action bar (applyEvent), and the Stage 6a remote page, which
// now shows the scenario's manual-trigger buttons. URL: ?session=CODE&scenario=<built-in id>&seed=<engine seed>.
import {
  ControllerSession,
  createBroadcastChannelTransport,
  createInProcessHub,
  HostSession,
  mountInstructorPanel,
  newSessionCode,
  normalizeSessionCode,
  vocabularyOf,
  type ClinicalEvent,
  type ScenarioEvent,
} from '@pme/controller';
import { BUILTIN_CATALOGUE, ScenarioDriver } from '@pme/controller/scenario';
import { mountSimMonitor } from '../stage6a/sim-monitor.ts';
import { LEARNER_ACTIONS } from './actions.ts';

const $ = (id: string) => document.getElementById(id) as HTMLElement;
const params = new URLSearchParams(location.search);
const session = normalizeSessionCode(params.get('session') ?? '') ?? newSessionCode();
if (params.get('session') !== session) history.replaceState(null, '', `?${new URLSearchParams({ ...Object.fromEntries(params), session })}`);
$('code').textContent = session;

const mon = mountSimMonitor($('monitor'), { engine: { seed: Number(params.get('seed') ?? 42) }, lanes: ['ecgII', 'V5'] });
let hs: HostSession | null = null;
const scenarioLog: string[] = [];
const driver = new ScenarioDriver({
  target: mon.host,
  submit: (c) => (hs as HostSession).submit(c),
  publish: (e: ScenarioEvent) => {
    scenarioLog.push(`${e.t.toFixed(2)} s → ${e.stateId}${e.transitionId ? ` (${e.transitionId})` : ''}`);
    hs?.publish(e);
  },
});
hs = new HostSession({ session, target: driver.host, scenario: driver.hook, welcomeEvents: () => driver.welcomeEvents() });
const hub = createInProcessHub();
hs.addTransport(hub.connect());
hs.addTransport(createBroadcastChannelTransport(session));
mon.onFrame(() => driver.poll()); // the runner advances once per frame, at the engine's sim time

const panelSession = new ControllerSession({ session, transport: hub.connect(), issuedBy: 'panel' });
const panel = mountInstructorPanel(document.body, {
  session: panelSession,
  vocabulary: vocabularyOf(mon.core.engine),
  scenarios: BUILTIN_CATALOGUE,
  sound: { enable: () => mon.enableSound() },
});

// FU-1 item 5: the host page plugs its own Device tab into the panel through the tab-registration API.
panel.registerTab({
  id: 'device',
  title: 'Device',
  render(el, ctx) {
    el.innerHTML = `<section class="pme-section"><h3>Defibrillator / pacer</h3>
      <div class="pme-row pme-dev-status">defib idle · pacer off</div>
      <div class="pme-row">
        <button type="button" data-dev="charge">Charge 200 J</button><button type="button" data-dev="shock">Shock</button>
        <button type="button" data-dev="disarm">Disarm</button>
      </div>
      <div class="pme-row"><button type="button" data-dev="pace">Pace 70 ppm 80 mA</button><button type="button" data-dev="paceOff">Pacer off</button></div>
    </section>`;
    const events: Record<string, ClinicalEvent> = {
      charge: { kind: 'defib', action: 'charge', energyJ: 200 },
      shock: { kind: 'defib', action: 'shock' },
      disarm: { kind: 'defib', action: 'disarm' },
      pace: { kind: 'pacer', mode: 'fixed', ratePpm: 70, mA: 80 },
      paceOff: { kind: 'pacer', mode: 'off' },
    };
    for (const b of el.querySelectorAll<HTMLButtonElement>('[data-dev]')) b.addEventListener('click', () => ctx.send({ type: 'applyEvent', event: events[b.dataset.dev as string] as ClinicalEvent }));
    const status = el.querySelector('.pme-dev-status') as HTMLElement;
    const off = mon.core.engine.on((e) => {
      if (e.type !== 'deviceStatus') return;
      const d = e.defib;
      const p = e.pacer;
      status.textContent = `defib ${d ? `${d.state}${d.state === 'idle' ? '' : ` ${d.energyJ} J`}${d.sync ? ' SYNC' : ''} · shocks ${d.shocks}` : 'n/a'} · pacer ${p && p.mode !== 'off' ? `${p.mode} ${p.ratePpm} ppm ${p.mA} mA` : 'off'}`;
    }, ['deviceStatus']);
    return { destroy: off };
  },
});

// Learner actions go through their own controller session, so they are logged and acked like any other command.
const learner = new ControllerSession({ session, transport: hub.connect(), issuedBy: 'learner' });
for (const a of LEARNER_ACTIONS) {
  const b = document.createElement('button');
  b.type = 'button';
  b.dataset.kind = a.id;
  b.textContent = a.label;
  let on = false;
  b.addEventListener('click', () => {
    const event = a.off && on ? a.off : a.event;
    if (a.off) {
      on = !on;
      b.textContent = on ? 'Stop CPR' : a.label;
      b.setAttribute('aria-pressed', String(on));
    }
    void learner.send({ type: 'applyEvent', event }).catch(() => undefined);
  });
  $('actions').append(b);
}

$('openRemote').addEventListener('click', () => window.open(`./stage6a-remote.html?session=${session}&via=bc`, 'pme-remote', 'width=480,height=900'));
$('sound').addEventListener('click', () => void mon.enableSound().then(() => ($('sound').textContent = 'Sound on')));

const initial = params.get('scenario');
if (initial) void panelSession.send({ type: 'scenario', action: 'load', target: initial });

const fmt = (t: number) => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
setInterval(() => {
  const r = driver.runner;
  $('scenario').textContent = r
    ? `${r.doc.title} — ${r.state().label ?? r.stateId} · ${fmt(r.stateT)} in state · scenario ${fmt(r.scenarioT)}${r.paused ? ' · PAUSED' : ''}`
    : 'No scenario loaded (press i → Scenario)';
  $('notes').textContent = driver.notes.join('\n');
  const s = hs?.stats;
  $('diag').textContent = `t ${mon.core.clock.renderT.toFixed(1)} s · applied ${s?.applied} · rejected ${s?.rejected} · panel ${panel.isOpen ? 'open' : 'hidden'}\n${scenarioLog.slice(-6).join('\n')}`;
}, 250);

Object.assign(window, { __pme6b: { session, hs, driver, mon, panel, panelSession, learner, scenarioLog } });
