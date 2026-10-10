// The app (research/13 brief §4–§5): one document, one engine session for every view. A document opened at
// #/remote is a Remote instead: it pairs to a monitor on another device and never starts an engine.
import './app.css';
import { attachReveal, RevealGesture } from '@pme/controller';
import { DRUG_IDS, LUNG_CONDITIONS, RHYTHM_IDS } from '@pme/engine-core';
import { alarmLine, limitsOffTitle, LIMITS_OFF_LABEL } from './alarms.ts';
import { setDrugNames } from './glossary.ts';
import { Link } from './link.ts';
import { PATIENT_PRESETS } from './patients.ts';
import { hrefOf, parseRoute } from './router.ts';
import { SCENARIO_META } from './scenario-meta.ts';
import { scenarioById, type ScenarioCard } from './scenarios.ts';
import { AppSession } from './session.ts';
import { mountSessionBar } from './sessionbar.ts';
import { applySkinAlarmColours, LEVEL_MARK, LEVEL_NAME, Shell, skinAlarmBar, skinAlwaysOn } from './shell.ts';
import { loadSite } from './site.ts';
import { button, h, setText, throttle, toast } from './ui.ts';
import { devView } from './views/dev.ts';
import { exploreView } from './views/explore.ts';
import { monitorView } from './views/monitor.ts';
import { remoteView } from './views/remote.ts';
import { settingsView } from './views/settings.ts';
import { startView } from './views/start.ts';
import { teachView } from './views/teach.ts';
import { validateView } from './views/validate.ts';
import { ventView } from './views/vent.ts';

const site = loadSite();
setDrugNames(site.drugNames); // one set of drug names on every screen (orchestrator ruling 5)
const q = new URLSearchParams(location.search);
const hostless = parseRoute(location.hash).id === 'remote';
const shell = new Shell(document.getElementById('app') as HTMLElement, { hostless });
if (site.theme === 'projector-light') document.documentElement.dataset.theme = 'bench';

// Frame intervals for the Stage 8a gate with the whole shell mounted (docs/gates/stage-8a.md measures the same thing).
const frames: number[] = [];
let lastFrame = performance.now();
const onFrame = (t: number) => {
  frames.push(t - lastFrame);
  lastFrame = t;
  if (frames.length > 100_000) frames.splice(0, 50_000);
  requestAnimationFrame(onFrame);
};
requestAnimationFrame(onFrame);

if (hostless) {
  shell.add(remoteView({ site, hostless: true, bar: shell.bar }));
  shell.add(settingsView(site, null));
  shell.start();
  Object.assign(window, { __pmeApp: { shell, frames, site } });
} else {
  const base = PATIENT_PRESETS[0]?.spec;
  if (!base) throw new Error('no patient presets');
  const session = new AppSession(shell.monitorHost, { spec: { ...base, attached: !site.sensorsOff }, mode: 'modeled' }, { skin: site.skin, theme: site.theme, code: q.get('session'), load: q.get('load') === 'perf8' ? 'perf8' : null });
  if (site.fps === 30) session.monitor?.setFps(30);
  applySkinAlarmColours(site.skin, site.theme);
  const link = new Link(session.panel, session.panelTransport, session);
  // R50 M15: a monitor whose worker stopped is final (no fallback) — say so and name the way out; the reason goes to the
  // console for the gate note's diagnostics
  shell.monitorHost.addEventListener('pme-monitor-failed', (e) => {
    console.error('monitor failed:', (e as CustomEvent<{ reason: string }>).detail.reason);
    toast('The monitor stopped — Restart the patient');
  });

  const loadScenario = (c: ScenarioCard): boolean => {
    const r = session.loadScenario(c.doc);
    if (!r.ok) {
      toast(`The scenario could not load: ${c.title}`);
      return false;
    }
    link.note(`Scenario loaded: ${c.title}`, 'scenario');
    session.setLearner(SCENARIO_META[c.id]?.learnerControls ?? false); // off unless the case asks (ruling 4)
    return true;
  };
  const weightKg = () => session.spec.weightKg;

  shell.add(startView({ session, site, loadScenario }));
  shell.add(monitorView(shell.stage, { session, link }));
  const teach = teachView(link, { site, main: shell.main, stage: shell.stage, weightKg, loadScenario });
  shell.add(teach);
  shell.add(remoteView({ site, hostless: false, bar: shell.bar, code: session.code }));
  shell.add(exploreView(session, site));
  shell.add(ventView(session));
  shell.add(validateView());
  shell.add(devView());
  shell.add(settingsView(site, session));
  mountSessionBar(shell.bar, link);

  // top-right: alarm count in the skin's colours (steady), sound, remote code
  const alarm = h('button', { type: 'button', class: 'alarm-count', 'data-vendor-title': '', onclick: () => ((location.hash = hrefOf('teach')), teach.panel.select('devices')) });
  // FU-11 (H4): a toggle — it turns sound off again (it only ever turned it on); this window's sound only (ruling Q3)
  const drawSound = () => ((sound.textContent = session.soundOn ? 'Sound on' : 'Sound off'), sound.setAttribute('aria-pressed', String(session.soundOn)));
  const sound = button('Sound off', () => (session.soundOn ? (session.disableSound(), drawSound()) : void session.enableSound().then(drawSound)), 'small sound');
  sound.setAttribute('aria-pressed', 'false');
  const code = h('a', { class: 'code-pill', href: hrefOf('remote'), 'aria-label': `Remote pairing code ${session.code.split('').join(' ')}` }, h('span', { class: 'muted' }, 'Remote '), session.code);
  shell.right.append(alarm, sound, code);
  const drawAlarm = throttle(() => {
    const s = link.alarmSummary;
    alarm.dataset.level = s.level ? LEVEL_NAME[s.level] : 'none';
    // FU-11 (showcase kit K3, presenter note D4): with the factory "all alarm groups off" (saadat-like) asystole, VF, VT and
    // apnoea still alarm — "Alarms off" read as if nothing would; the label says which alarms are off
    setText(alarm, s.level && s.top ? `${LEVEL_MARK[s.level]} ${alarmLine(s.top).text}${s.n > 1 ? ` +${s.n - 1}` : ''}` : link.alarms?.allOff ? LIMITS_OFF_LABEL : 'No alarms');
    if (s.top) alarm.title = `On the monitor: ${s.top.text}`; // the vendor's words, outside the glossary scan (review F4)
    else if (link.alarms?.allOff) {
      // owner ruling Q4 (R50 M5, R56): what still alarms comes from the skin's data, worded by the alarm table
      const k = skinAlwaysOn(link.alarms.skin);
      alarm.title = limitsOffTitle(k.alwaysOn, k.apnoeaOff);
    }
    else alarm.removeAttribute('title');
    alarm.setAttribute('aria-label', s.level ? `${s.n} active alarm${s.n > 1 ? 's' : ''}, highest ${LEVEL_NAME[s.level]} priority: show alarms` : 'No active alarms: show alarms');
  }, 500);
  link.onChange(drawAlarm);
  drawAlarm();

  // learner monitor ↔ instructor view: the Stage 6a reveal gestures
  attachReveal(window, new RevealGesture(() => {
    const r = shell.route.id;
    if (r === 'monitor') location.hash = hrefOf('teach');
    else if (r === 'teach') location.hash = hrefOf('monitor');
  }));
  shell.onRoute((r) => {
    if (r.id === 'teach' || r.id === 'monitor') session.live = true;
  });

  const deep = q.get('scenario');
  const card = deep ? scenarioById(deep) : undefined;
  if (card && loadScenario(card)) {
    session.live = true;
    if (!location.hash) location.hash = hrefOf('teach');
  }
  shell.start();
  // e2e hook: the engine ids the glossary test must never find in a clinical view
  const engineIds = [...RHYTHM_IDS, ...DRUG_IDS, ...LUNG_CONDITIONS.map((c) => c.id)];
  Object.assign(window, { __pmeApp: { shell, session, link, frames, site, teach, engineIds, skinAlarmBar } });
}
