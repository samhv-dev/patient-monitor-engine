// The app (research/13 brief §4–§5): one document, one engine session for every view. A document opened at
// #/remote is a Remote instead: it pairs to a monitor on another device and never starts an engine.
import './app.css';
import { attachReveal, normalizeSessionCode, RevealGesture } from '@pme/controller';
import { DRUG_IDS, LUNG_CONDITIONS, RHYTHM_IDS } from '@pme/engine-core';
import { alarmLine, limitsOffTitle, LIMITS_OFF_LABEL } from './alarms.ts';
import { joinCode, relayOf } from './classroom.ts';
import { mountClassroomPanel } from './classroom-panel.ts';
import { setDrugNames } from './glossary.ts';
import { Link } from './link.ts';
import { PATIENT_PRESETS } from './patients.ts';
import { keepPositions, readPosition, restorePosition } from './position.ts';
import { hrefOf, parseRoute } from './router.ts';
import { SCENARIO_META } from './scenario-meta.ts';
import { scenarioById, type ScenarioCard } from './scenarios.ts';
import { AppSession } from './session.ts';
import { mountSessionBar } from './sessionbar.ts';
import { applySkinAlarmColours, LEVEL_MARK, LEVEL_NAME, Shell, skinAlarmBar, skinAlwaysOn } from './shell.ts';
import { loadSite } from './site.ts';
import { button, clock, h, setText, throttle, toast } from './ui.ts';
import { debriefView } from './views/debrief.ts';
import { devView } from './views/dev.ts';
import { exploreView } from './views/explore.ts';
import { mountFastForward } from './fast-forward.ts';
import { watchHiddenTab } from './hidden-tab.ts';
import { followUrl, mountFollower, publishStyle } from './views/follower.ts';
import { monitorView } from './views/monitor.ts';
import { remoteView } from './views/remote.ts';
import { settingsView } from './views/settings.ts';
import { startView } from './views/start.ts';
import { teachView } from './views/teach.ts';
import { validateView } from './views/validate.ts';
import { ventView } from './views/vent.ts';

const site = loadSite();
setDrugNames(site.drugNames); // One set of drug names on every screen
const q = new URLSearchParams(location.search);
// `?follow=<code>` = the learner monitor on a second screen: it follows that session and runs none of its own
// `?join=<code>` = a learner's PHONE: it follows that session over the relay (the QR code's address)
const join = joinCode(location);
const follow = join ?? normalizeSessionCode(q.get('follow') ?? '');
const relay = relayOf(location);
if (join) document.documentElement.dataset.learner = 'phone'; // the portrait learner layout (app.css)
const hostless = !follow && parseRoute(location.hash).id === 'remote';
const shell = new Shell(document.getElementById('app') as HTMLElement, { hostless, follower: !!follow });
if (site.theme === 'projector-light') document.documentElement.dataset.theme = 'bench';

// Frame intervals with the whole shell mounted, for the performance gate (validation-perf.html measures the same).
const frames: number[] = [];
let lastFrame = performance.now();
const onFrame = (t: number) => {
  frames.push(t - lastFrame);
  lastFrame = t;
  if (frames.length > 100_000) frames.splice(0, 50_000);
  requestAnimationFrame(onFrame);
};
requestAnimationFrame(onFrame);

if (follow) {
  if (parseRoute(location.hash).id !== 'monitor') history.replaceState(null, '', `${location.pathname}${location.search}${hrefOf('monitor')}`);
  // Its status and its own Sound / Silence sit under the monitor: the monitor route hides the top bar
  const bar = h('div', { class: 'follower-bar', role: 'toolbar', 'aria-label': 'Learner monitor' });
  shell.add({ id: 'monitor', el: h('section', { 'aria-labelledby': 'fol-h' }, h('h1', { id: 'fol-h', class: 'sr-only' }, 'Learner monitor'), bar) });
  const follower = mountFollower(shell, site, follow, bar, join && relay ? { relay } : undefined);
  // The second screen shows the same fast-forward panel and latches the alarms that came and went
  mountFastForward(shell.root, { get fastForward() { return follower.sync?.fastForward ?? null; }, get lastFastForward() { return follower.sync?.lastFastForward ?? null; } }, { simT: () => follower.sync?.fastForwardAt ?? null, font: () => follower.monitor.skin?.render.fontStack, latch: (a) => follower.monitor.latchAlarms(a) });
  shell.start();
  Object.assign(window, { __pmeFollower: follower, __pmeApp: { shell, frames, site } });
} else if (hostless) {
  shell.add(remoteView({ site, hostless: true, bar: shell.bar }));
  shell.add(settingsView(site, null));
  shell.start();
  Object.assign(window, { __pmeApp: { shell, frames, site } });
} else {
  const base = PATIENT_PRESETS[0]?.spec;
  if (!base) throw new Error('no patient presets');
  const session = new AppSession(shell.monitorHost, { spec: { ...base, attached: !site.sensorsOff }, mode: 'modeled' }, { skin: site.skin, theme: site.theme, code: q.get('session'), load: q.get('load') === 'perf8' ? 'perf8' : null, relay });
  // The session code survives a reload of this window, so a learner monitor and a Remote that follow it find it again
  // (a reload made a new code and left them on a frozen screen)
  publishStyle(session.code, () => ({ skin: session.skin, theme: session.theme }), (f) => session.onSkin(f));
  if (q.get('session') !== session.code) {
    const u = new URL(location.href);
    u.searchParams.set('session', session.code);
    history.replaceState(null, '', u);
  }
  if (site.fps === 30) session.monitor?.setFps(30);
  applySkinAlarmColours(site.skin, site.theme);
  const link = new Link(session.panel, session.panelTransport, session);
  // A monitor whose worker stopped is final (no fallback) — say so and name the way out; the reason goes to the console
  // for the gate note's diagnostics
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
    session.setLearner(SCENARIO_META[c.id]?.learnerControls ?? false); // Off unless the case asks
    return true;
  };
  const weightKg = () => session.spec.weightKg;

  const phones = relay ? mountClassroomPanel(shell.right, session, relay) : null; // The QR moment (a classroom relay)
  // The starting page carries the top bar's session controls (the bar is hidden there): the same QR sheet, sound and alarms
  const toggleSound = async (): Promise<void> => {
    if (session.soundOn) session.disableSound();
    else await session.enableSound();
    drawSound();
  };
  const openAlarms = (): void => ((location.hash = hrefOf('teach')), teach.panel.select('devices'));
  shell.add(startView({ session, site, loadScenario, learnerUrl: followUrl(session.code), phones, sound: { on: () => session.soundOn, toggle: toggleSound }, alarms: { text: () => alarmText(), onChange: (f) => link.onChange(throttle(f, 500)), open: openAlarms } }));
  shell.add(monitorView(shell.stage, { session, link, learnerUrl: followUrl(session.code), phones }));
  const teach = teachView(link, { site, main: shell.main, stage: shell.stage, weightKg, loadScenario });
  shell.add(teach);
  shell.add(remoteView({ site, hostless: false, bar: shell.bar, code: session.code }));
  shell.add(exploreView(session, site));
  shell.add(ventView(session));
  shell.add(validateView());
  shell.add(devView());
  shell.add(settingsView(site, session));
  shell.add(debriefView(session, link));
  mountSessionBar(shell.bar, link);
  // FX-14/15: a hidden instructor tab pauses the session through the Pause button's own command, so the phones show
  // "(paused)" instead of "not answering", and resumes it on return (HIDDEN_TAB_POLICY, the owner's E82 switch). A
  // fast-forward refuses every command, the pause included: a hide then sends nothing and claims nothing.
  watchHiddenTab(document, { role: 'host', paused: () => session.paused || session.host.fastForwarding, send: (action) => void link.send({ type: 'time', action }), notify: toast });
  mountFastForward(shell.root, link.ctl, { simT: () => link.simT, font: () => session.monitor?.skin?.render.fontStack, latch: (a) => session.monitor?.latchAlarms(a) }); // Above every view

  // top-right: alarm count in the skin's colours (steady), sound, remote code
  const alarm = h('button', { type: 'button', class: 'alarm-count', 'data-vendor-title': '', onclick: openAlarms });
  // A toggle — it turns sound off again (it only ever turned it on); this window's sound only
  const drawSound = () => ((sound.textContent = session.soundOn ? 'Sound on' : 'Sound off'), sound.setAttribute('aria-pressed', String(session.soundOn)));
  const sound = button('Sound off', () => void toggleSound(), 'small sound');
  sound.setAttribute('aria-pressed', 'false');
  const code = h('a', { class: 'code-pill', href: hrefOf('remote'), 'aria-label': `Remote pairing code ${session.code.split('').join(' ')}` }, h('span', { class: 'muted' }, 'Remote '), session.code);
  shell.right.append(alarm, sound, code);
  function alarmText(): string {
    const s = link.alarmSummary;
    return s.level && s.top ? `${LEVEL_MARK[s.level]} ${alarmLine(s.top).text}${s.n > 1 ? ` +${s.n - 1}` : ''}` : link.alarms?.allOff ? LIMITS_OFF_LABEL : 'No alarms';
  }
  const drawAlarm = throttle(() => {
    const s = link.alarmSummary;
    alarm.dataset.level = s.level ? LEVEL_NAME[s.level] : 'none';
    // With the factory "all alarm groups off" (saadat-like) asystole, VF, VT and apnoea still alarm — "Alarms off" read
    // as if nothing would; the label says which alarms are off
    setText(alarm, alarmText());
    if (s.top) alarm.title = `On the monitor: ${s.top.text}`; // The vendor's words, outside the glossary scan
    else if (link.alarms?.allOff) {
      // What still alarms comes from the skin's data, worded by the alarm table
      const k = skinAlwaysOn(link.alarms.skin);
      alarm.title = limitsOffTitle(k.alwaysOn, k.apnoeaOff);
    }
    else alarm.removeAttribute('title');
    alarm.setAttribute('aria-label', s.level ? `${s.n} active alarm${s.n > 1 ? 's' : ''}, highest ${LEVEL_NAME[s.level]} priority: show alarms` : 'No active alarms: show alarms');
  }, 500);
  link.onChange(drawAlarm);
  drawAlarm();

  // Learner monitor ↔ instructor view: the hidden panel's reveal gestures
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
  // A reload in the middle of a card comes back to it (position.ts): same session code, same build, a card of the
  // library; a deep link to ANOTHER card wins
  const kept = q.get('load') === 'perf8' ? null : readPosition({ code: session.code });
  if (kept && (!deep || deep === kept.cardId)) {
    session.live = true;
    void restorePosition(kept, session, loadScenario).then((ok) => {
      const text = ok ? `Restored after reload: ${kept.title}, ${clock(kept.simT)}` : `The case could not be restored after the reload: ${kept.title} starts again`;
      toast(text);
      link.note(text, 'system');
    });
  } else if (card && loadScenario(card)) {
    session.live = true;
    if (!location.hash) location.hash = hrefOf('teach');
  }
  keepPositions(session);
  shell.start();
  // e2e hook: the engine ids the glossary test must never find in a clinical view
  const engineIds = [...RHYTHM_IDS, ...DRUG_IDS, ...LUNG_CONDITIONS.map((c) => c.id)];
  Object.assign(window, { __pmeApp: { shell, session, link, frames, site, teach, engineIds, skinAlarmBar, phones } });
}
