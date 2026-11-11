// The app (research/13 brief §4–§5): one document, one engine session for every view. A document opened at
// #/remote is a Remote instead: it pairs to a monitor on another device and never starts an engine.
import './app.css';
import { attachReveal, normalizeSessionCode, RevealGesture } from '@pme/controller';
import { DRUG_IDS, LUNG_CONDITIONS, RHYTHM_IDS } from '@pme/engine-core';
import { alarmLine, limitsOffTitle, LIMITS_OFF_LABEL } from './alarms.ts';
import { mountHostBriefing } from './briefing.ts';
import { instrumentOf, joinCode, relayInfo, relayOf } from './classroom.ts';
import { instructorPin, learnerPin, type InstructorPin } from './instructor-pin.ts';
import { setDrugNames } from './glossary.ts';
import { Link } from './link.ts';
import { feedOf } from './teach2/feed.ts';
import { restartSameCard } from './teach2/finish.ts';
import { draftRun } from './builder/run-panel.ts';
import { drafts } from './builder/drafts.ts';
import { PATIENT_PRESETS } from './patients.ts';
import { announceHost, askJoin, chooseHostSession } from './host-guard.ts';
import { keepPositions, keptItems, putKeptItems, readPosition, restorePosition } from './position.ts';
import { RAIL_VERSION } from './about.ts';
import { simLine } from './sim-line.ts';
import { Rail, trackPageLines } from './rail.ts';
import { keepRoomCode, keepsRoomCode, startCode, storedRoomCode } from './room-code.ts';
import { noteRecent } from './recent.ts';
import { hrefOf, parseRoute, revealTarget } from './router.ts';
import { SCENARIO_META } from './scenario-meta.ts';
import { archive } from './archive.ts';
import { LIBRARY, scenarioById, type ScenarioCard } from './scenarios.ts';
import { AppSession, type RoomKeep } from './session.ts';
import { applySkinAlarmColours, LEVEL_MARK, LEVEL_NAME, Shell, skinAlarmBar, skinAlwaysOn } from './shell.ts';
import { loadSite, saveSite, setLightScreen } from './site.ts';
import { button, clock, h, pausedMark, setText, throttle, toast, trackChromeBottom } from './ui.ts';
import { debriefView } from './views/debrief.ts';
import { devView } from './views/dev.ts';
import { exploreView } from './views/explore.ts';
import { mountFastForward } from './fast-forward.ts';
import { watchHiddenTab } from './hidden-tab.ts';
import { followUrl, mountFollower, publishStyle } from './views/follower.ts';
import { deviceKey, pickerView } from './views/join.ts';
import { learnerRemoteView } from './views/learner-remote.ts';
import { drugsMenu } from './remote/drugs.ts';
import { loadShippedFormulary } from './formulary.ts';
import { monitorView } from './views/monitor.ts';
import { remoteView } from './views/remote.ts';
import { settingsView } from './views/settings.ts';
import { homeView } from './views/home.ts';
import { patientView } from './views/patient.ts';
import { roomView } from './views/room.ts';
import { instructorRoomCard } from './views/room-instructor.ts';
import { scenariosView } from './views/scenarios.ts';
import { teach2View } from './views/teach2.ts';
import { validateView } from './views/validate.ts';
import { serveRemoteCockpit, serveWindowCockpit, ventScreens, ventView } from './views/vent.ts';

const site = loadSite();
setDrugNames(site.drugNames); // One set of drug names on every screen
const q = new URLSearchParams(location.search);
// `?follow=<code>` = the learner monitor on a second screen: it follows that session and runs none of its own
// `?join=<code>` = a learner's PHONE: it follows that session over the relay (the QR code's address)
const join = joinCode(location);
const follow = join ?? normalizeSessionCode(q.get('follow') ?? '');
const relay = relayOf(location);
// `?moved=<code>`: this tab handed its session to another tab of this browser (host-guard.ts)
const moved = normalizeSessionCode(q.get('moved') ?? '');
// R4 (plan room-and-instruments.md §4 D7): what a follower page shows, from its hash — `#/pick` the instrument picker
// (the QR's address), `#/monitor/wide` the patient monitor, `#/defib` the defibrillator window (Room plan R5:
// landscape, the room model's look), anything else today's learner monitor
const shows = follow ? instrumentOf(location.hash) : null;
const defibWindow = shows === 'defib';
if (join && shows === 'learner') document.documentElement.dataset.learner = 'phone'; // the portrait learner layout (app.css)
if (follow && shows === 'remote') document.documentElement.dataset.learner = 'remote'; // L6: the monitor strip over the tabs (app.css)
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

// A follower page is one instrument: choosing another (the picker's tap, "Change", Back) opens the page again on its hash
if (follow) addEventListener('hashchange', () => instrumentOf(location.hash) !== shows && location.reload());

if (follow && shows === 'pick') {
  document.body.replaceChildren(); // a page of its own, as `?moved=` below: no shell, no monitor, no session
  pickerView({ code: follow, parent: document.body });
  document.title = 'Choose an instrument: patient monitor simulator';
} else if (follow && shows === 'remote') {
  // L6 (plan learner-action-remote.md §4 D1): the learner action remote. Its learner-PIN form first; at sign-in the
  // follower, whose every hello says `{role: 'learner', show: 'learner', device, pin}` (the PIN from the page's memory);
  // granted, the monitor strip, the three tabs and the connection line. The hash stays `#/remote/learner`, so a reload
  // opens the form again (the PIN is typed again: it is kept nowhere)
  let current: ReturnType<typeof mountFollower> | null = null;
  const line = simLine(shell.stage, !!join);
  // L7: the Drugs tab, the bench over the tray; its countdowns run on this phone's own engine clock (the case clock)
  let caseClock: { renderT(): number } | null = null;
  const drugs = drugsMenu({ now: () => caseClock?.renderT() ?? null });
  void loadShippedFormulary().then((f) => drugs.ready(f));
  const remote = learnerRemoteView({
    code: follow,
    stage: shell.stage,
    drugs: drugs.el,
    follow: (code, bar, pin) => {
      const f = mountFollower(shell, site, code, bar, join && relay ? { relay } : undefined, { show: 'learner', device: deviceKey(), pin });
      line.set(f.monitor, f.style, true);
      f.onStyle = (st) => line.set(f.monitor, st, true);
      return (current = f);
    },
  });
  remote.onSignedIn((f) => {
    void f.monitor.viewerClock().then((c) => void (current === f && (caseClock = c)));
    return drugs.attach(f);
  });
  shell.add(remote);
  mountFastForward(shell.root, { get fastForward() { return current?.sync?.fastForward ?? null; }, get lastFastForward() { return current?.sync?.lastFastForward ?? null; } }, { simT: () => current?.sync?.fastForwardAt ?? null, font: () => current?.monitor.skin?.render.fontStack, latch: (a) => current?.monitor.latchAlarms(a) });
  shell.start();
  document.title = 'Learner remote: patient monitor simulator';
  Object.assign(window, { __pmeLearnerRemote: remote, __pmeLearnerDrugs: drugs, __pmeApp: { shell, frames, site } });
} else if (follow && shows && shows !== 'pick' && shows !== 'remote') {
  if (parseRoute(location.hash).id !== 'monitor') history.replaceState(null, '', `${location.pathname}${location.search}${hrefOf('monitor')}`);
  // Its status and its own Sound / Silence sit under the monitor: the monitor route hides the top bar
  const what = defibWindow ? 'Defibrillator' : 'Learner monitor';
  const bar = h('div', { class: 'follower-bar', role: 'toolbar', 'aria-label': what });
  shell.add({ id: 'monitor', el: h('section', { 'aria-labelledby': 'fol-h' }, h('h1', { id: 'fol-h', class: 'sr-only' }, what), bar) });
  const follower = mountFollower(shell, site, follow, bar, join && relay ? { relay } : undefined, { show: shows, device: deviceKey() });
  // "SIMULATION · not a clinical monitor" at the top of this monitor (in a two-row header, else a strip above it)
  const line = simLine(shell.stage, !!join && shows === 'learner');
  line.set(follower.monitor, follower.style, true);
  follower.onStyle = (s) => line.set(follower.monitor, s, true);
  // The second screen shows the same fast-forward panel and latches the alarms that came and went
  mountFastForward(shell.root, { get fastForward() { return follower.sync?.fastForward ?? null; }, get lastFastForward() { return follower.sync?.lastFastForward ?? null; } }, { simT: () => follower.sync?.fastForwardAt ?? null, font: () => follower.monitor.skin?.render.fontStack, latch: (a) => follower.monitor.latchAlarms(a) });
  shell.start();
  Object.assign(window, { __pmeFollower: follower, __pmeApp: { shell, frames, site } });
} else if (moved) {
  document.body.replaceChildren(h('main', { class: 'host-moved' },
    h('h1', {}, 'This session moved to another tab'),
    h('p', {}, `The classroom session ${moved} now runs in another tab of this browser; its phones follow that tab. This tab no longer runs it: you can close it.`),
    h('a', { class: 'btn', href: location.pathname }, 'Start a new session in this tab')));
} else if (hostless) {
  shell.add(remoteView({ site, hostless: true, bar: shell.bar }));
  shell.add(settingsView(site, null));
  shell.start();
  Object.assign(window, { __pmeApp: { shell, frames, site } });
} else void (async () => {
  // Room plan R1: the code is the page's own ?session=, else the room code this browser kept, else (R1b: a new origin,
  // the kit on another port) the relay's last room (room-code.ts)
  const param = normalizeSessionCode(q.get('session') ?? '');
  const stored = storedRoomCode();
  const lastRoom = !param && !stored && relay ? (await relayInfo(relay))?.lastRoom : undefined;
  let answer: 'join' | 'new' | null = null;
  const chosen = await chooseHostSession(startCode({ param, stored, lastRoom }), async (c) => (answer = await askJoin(c)));
  return { ...chosen, keep: keepsRoomCode({ param, answer }) };
})().then(({ code: start, kept: handed, keep }) => {
  // One instructor tab per session (host-guard.ts): a live session in another tab is offered before one starts here
  if (handed) putKeptItems(handed);
  const base = PATIENT_PRESETS[0]?.spec;
  if (!base) throw new Error('no patient presets');
  // The instructor phone's PIN (plan instructor-peer-role.md P7): this computer's store only; the host reads it at every
  // instructor hello. Never in an address, a QR code or the tab's state (instructor-pin.ts)
  // L4 (learner-action-remote.md §4 D9): the learner PIN beside it, the same keeping, never equal to it; a new learner PIN
  // revokes every learner remote (Room setup's "New learner PIN", views/room.ts learnerPinCard)
  let lpin: InstructorPin | null = null;
  const pin = instructorPin(undefined, undefined, () => lpin?.get() ?? null);
  const learner = (lpin = learnerPin(() => pin.get()));
  const session = new AppSession(shell.monitorHost, { spec: { ...base, attached: !site.sensorsOff }, mode: 'modeled' }, { skin: site.skin, theme: site.theme, code: start, load: q.get('load') === 'perf8' ? 'perf8' : null, relay, defibModel: site.defibModel, instructorPin: () => pin.get(), learnerPin: () => learner.get() });
  learner.onChange(() => session.host.learnerPinChanged());
  // The session code survives a reload of this window, so a learner monitor and a Remote that follow it find it again
  // (a reload made a new code and left them on a frozen screen)
  publishStyle(session.code, () => ({ skin: session.skin, theme: session.theme, ibp: session.ibpScales, defib: session.defibModel }), (f) => {
    const offSkin = session.onSkin(f);
    const offIbp = session.onIbpScales(f); // E130: the IBP lane scales travel with the style
    return () => (offSkin(), offIbp());
  });
  if (keep) keepRoomCode(session.code); // the room's code from now on, until "New room code" (§4 D3: never a new session's)
  if (q.get('session') !== session.code) {
    const u = new URL(location.href);
    u.searchParams.set('session', session.code);
    history.replaceState(null, '', u);
  }
  if (site.fps === 30) session.monitor?.setFps(30);
  applySkinAlarmColours(site.skin, site.theme);
  const link = new Link(session.panel, session.panelTransport, session);
  // B6 (scenario-builder.md §6): the builder's run in place, a draft on this computer's session beside Instructor v2
  const draft = draftRun({ link, root: shell.root, drafts });
  // the instructor phone (plan instructor-peer-role.md §6): its notes are filed as the laptop's own, and its view feed
  // is read from this Link by Instructor v2's functions
  session.serveInstructors({ note: (text, kind, t, ev) => link.note(text, kind, t, ev), feed: () => feedOf(link) });
  // A monitor whose worker stopped is final (no fallback) — say so and name the way out; the reason goes to the console
  // for the gate note's diagnostics
  shell.monitorHost.addEventListener('pme-monitor-failed', (e) => {
    console.error('monitor failed:', (e as CustomEvent<{ reason: string }>).detail.reason);
    toast('The monitor stopped — Restart the patient', 'alert');
  });
  // FX-11a: the watchdog warns first — a busy or starved worker is slow, not dead, and catches up by itself
  shell.monitorHost.addEventListener('pme-monitor-slow', () => toast('The monitor is slow to answer: the computer is busy. It catches up by itself.'));
  shell.monitorHost.addEventListener('pme-monitor-recovered', () => toast('The monitor has caught up'));
  // Brief 105: the clock keeps real time by catching up; when the computer is too busy for that the monitor says so,
  // and the session log keeps when and by how much (the Instructor view's clock pill shows BEHIND meanwhile)
  shell.monitorHost.addEventListener('pme-monitor-behind', (e) => {
    const s = (e as CustomEvent<{ behindS: number }>).detail.behindS;
    toast(`The simulation is ${s.toFixed(1)} s behind real time: the computer is busy. It catches up by itself.`);
    link.note(`The engine fell behind real time by ${s.toFixed(1)} s: the computer is busy`, 'system');
  });
  // Brief 126 (N48): a worker slow to load is waited for, and said; a worker that failed leaves the engine on the page's
  // main thread, and that is said too — the monitor never changes how it runs in silence
  shell.monitorHost.addEventListener('pme-monitor-worker-late', (e) => {
    const ms = (e as CustomEvent<{ waitedMs: number }>).detail.waitedMs;
    toast('The monitor is still starting: the computer is busy.');
    link.note(`The monitor was slow to start: its engine worker was not ready after ${(ms / 1000).toFixed(1)} s`, 'system');
  });
  shell.monitorHost.addEventListener('pme-monitor-worker-ready', (e) => {
    const ms = (e as CustomEvent<{ readyMs: number }>).detail.readyMs;
    toast('The monitor has started');
    link.note(`The monitor started: its engine worker was ready after ${(ms / 1000).toFixed(1)} s`, 'system');
  });
  shell.monitorHost.addEventListener('pme-monitor-main-thread', (e) => {
    const reason = (e as CustomEvent<{ reason: string }>).detail.reason;
    console.error('monitor on the main thread:', reason);
    toast('The monitor runs without its worker: on a busy computer it is slower');
    link.note(`The monitor runs on the page's main thread: its engine worker failed (${reason})`, 'system');
  });
  shell.monitorHost.addEventListener('pme-monitor-caught-up', (e) => {
    link.note(`The engine caught up with real time (it was up to ${(e as CustomEvent<{ worstS: number }>).detail.worstS.toFixed(1)} s behind)`, 'system');
  });

  const loadScenario = (c: ScenarioCard, room?: RoomKeep): boolean => {
    const r = session.loadScenario(c.doc, room);
    if (!r.ok) {
      toast(`The scenario could not load: ${c.title}`, 'alert');
      return false;
    }
    draft.end(); // a library or imported card runs now, not a draft
    link.note(`Scenario loaded: ${c.title}`, 'scenario');
    session.setLearner(SCENARIO_META[c.id]?.learnerControls ?? false); // Off unless the case asks
    noteRecent(c.id); // The Scenarios page's Recent
    return true;
  };
  const weightKg = () => session.spec.weightKg;

  const toggleSound = async (): Promise<void> => {
    if (session.soundOn) session.disableSound();
    else await session.enableSound();
    drawSound();
  };
  // The alarm count opens the Instructor view's Devices sheet
  const openAlarms = (): void => {
    location.hash = hrefOf('teach2');
    teach2.openSheet('devices');
  };
  // E125: the pages before a session — Home, Room (the QR code, who follows), Scenarios, Patient — and the rail
  shell.add(homeView());
  const room = roomView({
    code: session.code, relay, relayLink: session.relay, local: session.bc, hostPeerId: session.host.peerId, learnerUrl: followUrl(session.code),
    followers: () => session.followers, onFollowers: (f) => session.onFollowers(f), devices: () => session.devices,
    instructor: instructorRoomCard({ code: session.code, relay, pin, host: session.host, instructors: () => session.instructors, onInstructors: (f) => session.onInstructors(f) }),
    // R5b: the room's defibrillator model, kept with the site profile (the monitor style's place) and sent to the patient
    defib: { model: () => site.defibModel, choose: (m) => ((site.defibModel = m), saveSite(site), session.setDefibModel(m)) },
    vent: () => ventScreens(session), // R8d: the ventilator's window and tablet, driving or handed over
    learner: { pin: learner, host: session.host, relay }, // L6: the learner PIN beside the instructor's (§4 D9)
  });
  shell.add(room);
  shell.add(scenariosView({ session, loadScenario, runDraft: (id, doc) => draft.run(id, doc) }));
  shell.add(patientView({ session, site }));
  shell.add(monitorView({ session, link, learnerUrl: followUrl(session.code), phones: !!relay }));
  // option G: the app's top bar is not shown on #/teach2; its header carries the top bar's Sound switch and Room code
  // "Finish the case" (board "Finish 2"): the same card again with the room kept (the probes, the cuff, the session code
  // and so the phones), or the case ended on the page's default patient, the deep link it was opened from spent so that
  // a reload shows no case either
  const finish = {
    // B6: a draft running in place restarts as the draft (never through the library's load, its Recent or its card)
    restart: (): boolean => (draft.current() ? draft.restart(session.roomKeep()) : restartSameCard(session.driver, loadScenario, () => session.roomKeep())),
    close: (): void => {
      session.endCase();
      const u = new URL(location.href);
      if (u.searchParams.has('scenario')) (u.searchParams.delete('scenario'), history.replaceState(null, '', u));
    },
  };
  const teach2 = teach2View(link, { site, weightKg, loadScenario, finish, top: { soundOn: () => session.soundOn, toggleSound, code: session.code, phones: () => session.followers } });
  shell.add(teach2);
  shell.add(remoteView({ site, hostless: false, bar: shell.bar, code: session.code }));
  shell.add(exploreView(session, site));
  shell.add(ventView(session));
  serveRemoteCockpit(session); // R8c: the host drives from a granted remote cockpit too, one cockpit at a time
  serveWindowCockpit(session); // R8d: and from the cockpit in a window of this computer (Room setup's "New window")
  shell.add(validateView());
  shell.add(devView());
  shell.add(settingsView(site, session));
  shell.add(debriefView(session, link));
  // The rail's switch is the site profile's Screen theme (Settings' "Screen"): dark ↔ projector-light, saved as Settings
  // saves it, the monitor's look included
  const setTheme = (light: boolean): void => {
    setLightScreen(site, light);
    void session.setSkin(site.skin, site.theme);
  };
  const rail = new Rail({
    version: RAIL_VERSION,
    badges: {
      room: () => (room.devices() === 1 ? '1 device' : `${room.devices()} devices`),
      scenarios: () => String(LIBRARY.length),
      patient: () => (link.ctl.scenario.doc ? 'case running' : 'free run'),
    },
    theme: { light: () => site.theme === 'projector-light', set: setTheme },
  });
  shell.setRail(rail);
  session.onFollowers(() => rail.refresh());
  link.onChange(throttle(() => rail.refresh(), 1000));
  shell.onRoute(() => rail.refresh());
  trackChromeBottom(shell.root); // UI-A #8/#9: the toasts and the fast-forward banner sit under the bars
  trackPageLines(rail.el, shell.root.querySelector('.ip2-strip'), shell.root.querySelector('.ip2-dock')); // Instructor v2: the rail's lines on the page's
  // FX-14/15: a hidden instructor tab pauses the session through the Pause button's own command, so the phones show
  // "(paused)" instead of "not answering", and resumes it on return (HIDDEN_TAB_POLICY, the owner's E82 switch). A
  // fast-forward refuses every command, the pause included: a hide then sends nothing and claims nothing.
  watchHiddenTab(document, {
    role: 'host', paused: () => session.paused || session.host.fastForwarding, send: (action) => void link.send({ type: 'time', action }), notify: (text) => toast(text, 'alert'),
    onPaused: (fn) => {
      let was = link.ctl.hostPaused;
      return link.onChange(() => link.ctl.hostPaused !== was && fn((was = link.ctl.hostPaused))); // The host's pause, as applied
    },
  });
  mountFastForward(shell.root, link.ctl, { simT: () => link.simT, font: () => session.monitor?.skin?.render.fontStack, latch: (a) => session.monitor?.latchAlarms(a) }); // Above every view

  // top-right: alarm count in the skin's colours (steady), sound, remote code
  const alarm = h('button', { type: 'button', class: 'alarm-count', 'data-vendor-title': '', onclick: openAlarms });
  // A toggle — it turns sound off again (it only ever turned it on); this window's sound only
  const drawSound = () => ((sound.textContent = session.soundOn ? 'Sound on' : 'Sound off'), sound.setAttribute('aria-pressed', String(session.soundOn)));
  const sound = button('Sound off', () => void toggleSound(), 'small sound');
  sound.setAttribute('aria-pressed', 'false');
  // R7: the code pill opens Room setup (the one QR code: a remote pairs through its picker)
  const code = h('a', { class: 'code-pill', href: hrefOf('room'), 'aria-label': `Room code ${session.code.split('').join(' ')}: Room setup` }, h('span', { class: 'muted' }, 'Room '), session.code);
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
  // UI review #32: PAUSED over the monitor while the session is paused (the Pause button, a hidden tab's pause)
  const paused = pausedMark(shell.stage);
  link.onChange(() => paused.set(link.ctl.hostPaused));
  // A card's Case briefing over the Monitor view, as on every learner screen that follows (briefing.ts)
  mountHostBriefing(shell.stage, session);

  // Learner monitor ↔ instructor view: the hidden panel's reveal gestures
  attachReveal(window, new RevealGesture(() => {
    const to = revealTarget(shell.route.id);
    if (to) location.hash = hrefOf(to);
  }));
  shell.onRoute((r) => {
    if (r.id === 'teach2' || r.id === 'monitor') session.live = true;
  });
  // "SIMULATION · not a clinical monitor" on the Monitor view only (the instructor's pages show the same monitor
  // without it): in a two-row header, else a strip above the monitor; again after a new monitor or a skin change
  const line = simLine(shell.stage);
  const drawLine = (m = session.monitor) => line.set(m, session, shell.route.id === 'monitor');
  shell.onRoute(() => drawLine());
  session.onMount((m) => drawLine(m));
  session.onSkin(() => queueMicrotask(() => drawLine()));

  const deep = q.get('scenario');
  const card = deep ? scenarioById(deep) : undefined;
  // A reload in the middle of a card comes back to it (position.ts): same session code, same build, a card of the
  // library; a deep link to ANOTHER card wins
  const kept = q.get('load') === 'perf8' ? null : readPosition({ code: session.code });
  if (kept && (!deep || deep === kept.cardId)) {
    session.live = true;
    void restorePosition(kept, session, loadScenario).then((ok) => {
      const text = ok ? `Restored after ${handed ? 'the move from the other tab' : 'reload'}: ${kept.title}, ${clock(kept.simT)}` : `The case could not be restored after ${handed ? 'the move from the other tab' : 'the reload'}: ${kept.title} starts again`;
      toast(text, 'alert'); // after a reload, on whichever view it landed
      link.note(text, 'system');
    });
  } else if (card && loadScenario(card)) {
    session.live = true;
    if (!location.hash) location.hash = hrefOf('teach2'); // a deep link to a card opens the Instructor view
  }
  keepPositions(session);
  // Another tab took this session (or started it anew): stop hosting it here, and say where it went
  announceHost(session.code, { kept: () => keptItems(), gone: () => (session.destroy(), location.replace(`${location.pathname}?moved=${session.code}`)) });
  shell.start();
  // the archive's database opened, and an earlier build's debriefs moved out of localStorage (N39); then the debriefs the
  // kit's user-data folder holds that this browser lacks read back (brief 139 PR 2)
  void archive.ready().then(() => archive.syncFromKit());
  // e2e hook: the engine ids the glossary test must never find in a clinical view
  const engineIds = [...RHYTHM_IDS, ...DRUG_IDS, ...LUNG_CONDITIONS.map((c) => c.id)];
  Object.assign(window, { __pmeApp: { shell, session, link, frames, site, teach2, engineIds, skinAlarmBar, room, rail, archive } });
});
