// Start (owner ruling 2026-10-25: "the simulator should launch into a starting page"): a full page, no monitor beside it.
// Top to bottom: the title and the release label, the scenario library (the two demonstration cards first), the patient
// and the session side by side, then the site and the other tools. The session's engine already runs behind the page
// (a patient change restarts it while nobody uses the session yet), so the monitor that opens shows what was chosen;
// the shell hides the monitor stage on this route only.
import { COMORBIDITIES, PATIENT_PRESETS, oneLiner, type PatientSpec } from '../patients.ts';
import { scenarioCard } from '../cards.ts';
import { LIBRARY, type ScenarioCard } from '../scenarios.ts';
import type { AppSession, Mode } from '../session.ts';
import { MONITORS, THEMES, saveSite, type SiteProfile } from '../site.ts';
import { button, confirmDialog, h, seg, select, setText, stepper, toast } from '../ui.ts';
import { EDUCATION_LINE, RELEASE_LABEL } from '../about.ts';
import { hrefOf } from '../router.ts';
import type { View } from '../shell.ts';

/** The 3 November demonstration's two cases, first and visually primary on the page (owner, 24 October). */
export const DEMO_CARDS: readonly string[] = ['showcase-mh', 'showcase-haemorrhage'];

export interface StartDeps {
  session: AppSession;
  site: SiteProfile;
  /** Called with the chosen scenario when the instructor view opens with one. */
  loadScenario(card: ScenarioCard): boolean;
  /** The address of a second-screen learner monitor that follows this session. */
  learnerUrl: string;
  /** The QR sheet for learners' phones (a classroom relay), or null where phones cannot join. */
  phones?: { open(): Promise<void> } | null;
  /** This window's sound, the top bar's toggle. */
  sound?: { on(): boolean; toggle(): Promise<void> };
  /** The top bar's alarm summary and its way to the alarm settings. */
  alarms?: { text(): string; onChange(fn: () => void): () => void; open(): void };
}

export function startView(d: StartDeps): View {
  const s = d.session;
  let spec: PatientSpec = { ...s.spec, comorbid: [...s.spec.comorbid], attached: !d.site.sensorsOff };
  let mode: Mode = s.mode;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const preview = () => {
    if (timer) clearTimeout(timer);
    summary.textContent = oneLiner(spec);
    // The preview restarts the engine only while nobody is using the session yet.
    if (!s.live) timer = setTimeout(() => s.restart({ spec, mode }), 350);
  };

  // ---------------------------------------------------------------------------------------------------------- patient
  const presetSeg = h('div', { class: 'chips', role: 'radiogroup', 'aria-label': 'Patient' });
  const drawPresets = () => {
    presetSeg.replaceChildren(
      ...PATIENT_PRESETS.map((p) =>
        h('button', {
          type: 'button', role: 'radio', class: 'chip-btn', 'aria-checked': String(JSON.stringify(p.spec.comorbid) === JSON.stringify(spec.comorbid) && p.spec.ageY === spec.ageY && p.spec.weightKg === spec.weightKg),
          onclick: () => {
            spec = { ...p.spec, comorbid: [...p.spec.comorbid], attached: spec.attached };
            drawPresets();
            drawDetails();
            preview();
          },
        }, p.label),
      ),
    );
  };

  const details = h('div', { class: 'grid2' });
  const comorb = h('fieldset', { class: 'checks' }, h('legend', {}, 'Conditions'));
  const drawDetails = () => {
    const age = stepper({ label: 'Age', unit: 'years', min: 1, max: 95, step: 1, value: spec.ageY, onchange: (v) => ((spec = { ...spec, ageY: v }), preview()) });
    const wt = stepper({ label: 'Weight', unit: 'kg', min: 3, max: 200, step: 1, value: spec.weightKg, onchange: (v) => ((spec = { ...spec, weightKg: v }), preview()) });
    const ht = stepper({ label: 'Height', unit: 'cm', min: 50, max: 210, step: 1, value: spec.heightCm, onchange: (v) => ((spec = { ...spec, heightCm: v }), preview()) });
    const sex = seg<'M' | 'F'>('Sex', [['F', 'Female'], ['M', 'Male']], spec.sex, (v) => ((spec = { ...spec, sex: v }), preview()));
    details.replaceChildren(
      field('Age', age.el, 'years'), field('Sex', sex), field('Weight', wt.el, 'kg'), field('Height', ht.el, 'cm'),
    );
    comorb.replaceChildren(
      h('legend', {}, 'Conditions'),
      ...COMORBIDITIES.map((c) => {
        const id = `cm-${c.id}`;
        const box = h('input', { type: 'checkbox', id, disabled: !!c.later, onchange: () => {
          spec = { ...spec, comorbid: box.checked ? [...spec.comorbid, c.id] : spec.comorbid.filter((x) => x !== c.id) };
          drawPresets();
          preview();
        } });
        box.checked = spec.comorbid.includes(c.id);
        return h('label', { class: 'check', for: id }, box, c.label, c.later ? h('span', { class: 'tag' }, 'not in this release') : null);
      }),
    );
  };

  const summary = h('p', { class: 'summary num' });
  const hintOf = (m: Mode) => (m === 'modeled'
    ? 'The body responds by itself: drugs, bleeding and ventilation change the numbers. You can still hold any value.'
    : 'You set every number. The monitor shows exactly what you choose, with the onset you choose.');
  const modeHint = h('p', { class: 'hint' }, hintOf(mode));
  const modeSeg = seg<Mode>('Physiology', [['modeled', 'MODELED'], ['manual', 'MANUAL']], mode, (v) => {
    mode = v;
    modeHint.textContent = hintOf(v);
    preview();
  });

  const sensors = h('input', { type: 'checkbox', id: 'st-sensors', onchange: () => {
    spec = { ...spec, attached: !sensors.checked };
    d.site.sensorsOff = sensors.checked;
    saveSite(d.site);
    preview();
  } });
  sensors.checked = !spec.attached;

  const patient = h('section', { class: 'land-panel', 'aria-labelledby': 'st-patient-h' },
    h('h2', { id: 'st-patient-h' }, 'Patient'),
    summary, presetSeg,
    h('details', { class: 'more' }, h('summary', {}, 'Edit age, weight and conditions'), details, comorb),
    h('h3', {}, 'Physiology'), modeSeg, modeHint,
    h('label', { class: 'check', for: 'st-sensors' }, sensors, 'Start with the sensors off (traces appear when they are attached)'),
  );

  // ---------------------------------------------------------------------------------------------------------- session
  const followers = h('span', { class: 'land-count', role: 'status' });
  const drawFollowers = (n: number) => setText(followers, n === 1 ? '1 phone following' : `${n} phones following`);
  s.onFollowers(drawFollowers);
  drawFollowers(s.followers);
  const soundBtn = d.sound ? button('Sound off', () => void d.sound?.toggle().then(drawSound), 'land-sound') : null;
  const drawSound = () => {
    if (!soundBtn || !d.sound) return;
    soundBtn.textContent = d.sound.on() ? 'Sound on' : 'Sound off';
    soundBtn.setAttribute('aria-pressed', String(d.sound.on()));
  };
  drawSound();
  const alarmBtn = d.alarms ? button('No alarms', () => d.alarms?.open(), 'land-alarms') : null;
  const drawAlarms = () => alarmBtn && d.alarms && setText(alarmBtn, d.alarms.text());
  if (alarmBtn) alarmBtn.setAttribute('aria-label', 'Alarm settings (Instructor view, Devices and alarms)');
  d.alarms?.onChange(drawAlarms);
  drawAlarms();

  const code = s.code;
  const sessionPanel = h('section', { class: 'land-panel', 'aria-labelledby': 'st-session-h' },
    h('h2', { id: 'st-session-h' }, 'Session'),
    h('div', { class: 'land-code' },
      h('span', { class: 'land-k' }, 'Session code'),
      h('span', { class: 'land-codev', 'aria-label': `Session code ${code.split('').join(' ')}` }, code)),
    h('h3', {}, "Learners' phones"),
    d.phones
      ? h('div', { class: 'land-row' }, button('Show the QR code', () => void d.phones?.open(), 'primary'), followers)
      : h('p', { class: 'hint' }, 'Phones join over the classroom relay: open the simulator with Start Classroom to show a QR code here.'),
    h('h3', {}, 'This room'),
    h('div', { class: 'land-row' }, ...(soundBtn ? [soundBtn] : []), ...(alarmBtn ? [alarmBtn] : [])),
    h('h3', {}, 'Second screens'),
    h('div', { class: 'land-row' },
      // The old "Open the learner monitor" changed THIS window's view; a second window used to start its own patient.
      // This one follows the session (same browser; drag it to the projector).
      button('Open the learner monitor in a new window', () => void window.open(d.learnerUrl, '_blank', 'noopener,width=1280,height=800')), // Its own process
      h('a', { class: 'btn ghost', href: hrefOf('remote') }, 'Open a remote')),
  );

  // -------------------------------------------------------------------------------------------------------- scenarios
  const go = async (route: 'teach' | 'monitor', card: ScenarioCard | null = null) => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      if (!s.live) s.restart({ spec, mode });
    }
    if (card) {
      if (s.live && !(await confirmDialog('Load this scenario?', `The current patient is replaced by the scenario's patient. The log keeps running.`, 'Load scenario', false, 'Keep the current case'))) return;
      if (!d.loadScenario(card)) return;
      toast(`Scenario loaded: ${card.title}`); // As the Instructor's library says it
    } else if (s.live && patientChanged()) {
      if (!(await confirmDialog('Restart the patient?', 'Drugs, fluids, ventilation and the scenario reset to the new patient. The session code, the remote and the log carry on.', 'Restart patient', true, 'Keep this patient'))) return;
      s.restart({ spec, mode });
      toast('Patient restarted');
    }
    s.live = true;
    location.hash = hrefOf(route);
  };
  const patientChanged = () => JSON.stringify(spec) !== JSON.stringify(s.spec) || mode !== s.mode;

  // The card's own facts (category, patient, duration) sit beside its Load button; the full story and the objectives are
  // the Instructor view's (the page shows the story's opening lines)
  const load = (c: ScenarioCard, cls: string) => {
    const b = button('Load', () => void go('teach', c), cls);
    b.setAttribute('aria-label', `Load ${c.title}`);
    return h('div', { class: 'scard-foot' }, b);
  };
  const metaBesideLoad = (el: HTMLElement, c: ScenarioCard) => {
    // Its own class, not the Instructor library's `.scard`: a script that finds a card by its title there finds one
    el.classList.replace('scard', 'lcard');
    const meta = el.querySelector(':scope > .meta');
    if (meta) {
      meta.textContent = [c.patient, c.minutes ? `about ${c.minutes} min` : ''].filter(Boolean).join(' · '); // the eyebrow names the category
      el.querySelector(':scope > .scard-foot')?.prepend(meta);
    }
    return el;
  };
  const demo = DEMO_CARDS.map((id) => LIBRARY.find((c) => c.id === id)).filter((c): c is ScenarioCard => !!c);
  const rest = LIBRARY.filter((c) => !demo.includes(c));
  const demoCard = (c: ScenarioCard, i: number) => {
    const el = scenarioCard(c, load(c, 'primary big'));
    el.classList.add('land-demo');
    el.prepend(h('span', { class: 'land-eyebrow' }, `Demonstration ${i + 1}`));
    return metaBesideLoad(el, c);
  };
  const moreCard = (c: ScenarioCard) => {
    const el = scenarioCard(c, load(c, ''));
    el.classList.add('land-more');
    el.prepend(h('span', { class: 'land-eyebrow' }, c.category));
    return metaBesideLoad(el, c);
  };
  const scenarios = h('section', { class: 'land-sec', 'aria-labelledby': 'st-scen-h' },
    h('div', { class: 'land-sec-head' },
      h('h2', { id: 'st-scen-h' }, 'Choose a scenario'),
      h('p', { class: 'hint' }, 'Load opens the Instructor view with the case loaded; the monitor shows its patient.')),
    h('div', { class: 'land-demos' }, ...demo.map(demoCard)),
    h('h3', { class: 'land-subhead' }, 'More scenarios'),
    h('div', { class: 'land-grid' }, ...rest.map(moreCard)),
  );

  // ------------------------------------------------------------------------------------------------------------ site
  const mon = select('Monitor', MONITORS.map((m) => [m.id, m.label]), d.site.skin, (v) => {
    d.site.skin = v;
    saveSite(d.site);
    void s.setSkin(v, d.site.theme);
    monHint.textContent = MONITORS.find((m) => m.id === v)?.hint ?? '';
  });
  const monHint = h('p', { class: 'hint' }, MONITORS.find((m) => m.id === d.site.skin)?.hint ?? '');
  const theme = select('Screen', THEMES.map(([id, label]) => [id, label]), d.site.theme, (v) => {
    d.site.theme = v as SiteProfile['theme'];
    saveSite(d.site);
    void s.setSkin(d.site.skin, d.site.theme);
    document.documentElement.dataset.theme = d.site.theme === 'projector-light' ? 'bench' : ''; // As Settings does
  });
  const tools = h('div', { class: 'tiles' },
    tile('explore', 'Explore physiology', 'Pressure–volume loops, lung mechanics, oxygen delivery, organs and drugs, with normal ranges.'),
    tile('vent', 'Ventilator', 'The ventilator beside this patient: modes, loops and the lung it ventilates.'),
    tile('validate', 'Validate', 'Bedside checklist, blind realism review and the performance check.'),
    tile('dev', 'Developer', 'Every model value, raw commands and the build-stage pages.'),
    tile('settings', 'Settings', 'This room: monitor, screen, units, frame rate and shortcuts.'),
  );
  const site = h('section', { class: 'land-sec land-site', 'aria-labelledby': 'st-site-h' },
    h('h2', { id: 'st-site-h' }, 'Site'),
    h('div', { class: 'land-site-row' }, mon.el, theme.el, monHint),
    h('h2', {}, 'Other tools'), tools,
  );

  // ------------------------------------------------------------------------------------------------------------ page
  const banner = h('div', { class: 'land-live', role: 'status' },
    h('span', {}, h('b', {}, 'A case is running'), ' — the patient carries on while you look around.'),
    h('a', { class: 'btn primary', href: hrefOf('teach') }, 'Back to the Instructor'));
  banner.hidden = !s.live;

  const hero = h('header', { class: 'land-hero' },
    h('div', { class: 'land-title' },
      h('h1', { id: 'start-h' }, 'Patient monitor simulator'),
      // The release label and the education-only line: the strings Settings → About shows (`ABOUT_LINE`)
      h('p', { class: 'about-line', 'data-about': '' }, h('span', { class: 'land-release' }, `${RELEASE_LABEL}.`), ' ', h('span', { class: 'land-edu' }, EDUCATION_LINE))),
    h('div', { class: 'land-actions' },
      button('Open the monitor', () => void go('monitor'), 'big'),
      button('Open the instructor view', () => void go('teach'), 'ghost big')),
  );

  const el = h('section', { 'aria-labelledby': 'start-h' },
    h('div', { class: 'landing' },
      hero, banner, scenarios,
      h('div', { class: 'land-pair' }, patient, sessionPanel),
      site,
    ),
  );
  drawPresets();
  drawDetails();
  summary.textContent = oneLiner(spec);
  return {
    id: 'start',
    el,
    enter() {
      // Back on the page while a case runs: the banner leads back, and the page shows the running patient (nothing
      // restarts; leaving to the monitor again asks nothing unless the patient was changed here)
      banner.hidden = !s.live;
      if (s.live && !timer) {
        spec = { ...s.spec, comorbid: [...s.spec.comorbid] };
        mode = s.mode;
        modeSeg.set(mode);
        modeHint.textContent = hintOf(mode);
        sensors.checked = !spec.attached;
        drawPresets();
        drawDetails();
        summary.textContent = oneLiner(spec);
      }
      drawSound();
      drawAlarms();
    },
  };
}

function field(label: string, control: HTMLElement, unit = ''): HTMLElement {
  return h('div', { class: 'field' }, h('span', {}, unit ? `${label} (${unit})` : label), control);
}

function tile(route: 'explore' | 'vent' | 'validate' | 'dev' | 'settings', title: string, text: string): HTMLElement {
  return h('a', { class: 'tile', href: hrefOf(route) }, h('b', {}, title), h('span', {}, text));
}
