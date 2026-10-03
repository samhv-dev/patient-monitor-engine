// Start (research/13 §4.1, brief Q1): set up the session beside the patient it describes. The monitor on the right is
// the session's own engine, already running, so what you choose is what you see; nothing reloads when you leave.
import { COMORBIDITIES, PATIENT_PRESETS, oneLiner, type PatientSpec } from '../patients.ts';
import { scenarioCard } from '../cards.ts';
import { LIBRARY, type ScenarioCard } from '../scenarios.ts';
import type { AppSession, Mode } from '../session.ts';
import { MONITORS, THEMES, saveSite, type SiteProfile } from '../site.ts';
import { button, confirmDialog, h, seg, select, stepper, toast } from '../ui.ts';
import { hrefOf } from '../router.ts';
import type { View } from '../shell.ts';

export interface StartDeps {
  session: AppSession;
  site: SiteProfile;
  /** Called with the chosen scenario when the instructor view opens with one. */
  loadScenario(card: ScenarioCard): boolean;
}

export function startView(d: StartDeps): View {
  const s = d.session;
  let spec: PatientSpec = { ...s.spec, comorbid: [...s.spec.comorbid], attached: !d.site.sensorsOff };
  let mode: Mode = s.mode;
  let chosen: ScenarioCard | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const preview = () => {
    if (timer) clearTimeout(timer);
    summary.textContent = oneLiner(spec);
    // The preview restarts the engine only while nobody is using the session yet.
    if (!s.live) timer = setTimeout(() => s.restart({ spec, mode }), 350);
  };

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
        return h('label', { class: 'check', for: id }, box, c.label, c.later ? h('span', { class: 'tag' }, 'coming in v1.1') : null);
      }),
    );
  };

  const summary = h('p', { class: 'summary num' });
  const modeSeg = seg<Mode>('Physiology', [['modeled', 'MODELED'], ['manual', 'MANUAL']], mode, (v) => {
    mode = v;
    modeHint.textContent = hintOf(v);
    preview();
  });
  const hintOf = (m: Mode) => (m === 'modeled'
    ? 'The body responds by itself: drugs, bleeding and ventilation change the numbers. You can still hold any value.'
    : 'You set every number. The monitor shows exactly what you choose, with the onset you choose.');
  const modeHint = h('p', { class: 'hint' }, hintOf(mode));

  const sensors = h('input', { type: 'checkbox', id: 'st-sensors', onchange: () => {
    spec = { ...spec, attached: !sensors.checked };
    d.site.sensorsOff = sensors.checked;
    saveSite(d.site);
    preview();
  } });
  sensors.checked = !spec.attached;

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
  });

  const scen = select('Scenario', [['', 'None: run the patient freely'], ...LIBRARY.map((c): [string, string] => [c.id, `${c.title}${c.draft ? ' (draft)' : ''}`])], '', (v) => {
    chosen = LIBRARY.find((c) => c.id === v) ?? null;
    scenCard.replaceChildren(...(chosen ? [scenarioCard(chosen)] : []));
  });
  const scenCard = h('div', {});

  const go = async (route: 'teach' | 'monitor') => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      if (!s.live) s.restart({ spec, mode });
    }
    if (chosen) {
      if (s.live && !(await confirmDialog('Load this scenario?', `The current patient is replaced by the scenario's patient. The log keeps running.`, 'Load scenario', false, 'Keep the current case'))) return;
      if (!d.loadScenario(chosen)) return;
    } else if (s.live && patientChanged()) {
      if (!(await confirmDialog('Restart the patient?', 'Drugs, fluids, ventilation and the scenario reset to the new patient. The session code, the remote and the log carry on.', 'Restart patient', true, 'Keep this patient'))) return;
      s.restart({ spec, mode });
      toast('Patient restarted');
    }
    s.live = true;
    location.hash = hrefOf(route);
  };
  const patientChanged = () => JSON.stringify(spec) !== JSON.stringify(s.spec) || mode !== s.mode;

  const setup = h('form', { class: 'setup', onsubmit: (e: Event) => e.preventDefault(), 'aria-labelledby': 'start-h' },
    h('h2', {}, 'Patient'), presetSeg, summary,
    h('details', { class: 'more' }, h('summary', {}, 'Edit age, weight and conditions'), details, comorb),
    h('h2', {}, 'Physiology'), modeSeg, modeHint,
    h('label', { class: 'check', for: 'st-sensors' }, sensors, 'Start with the sensors off (traces appear when they are attached)'),
    h('h2', {}, 'Scenario'), scen.el, scenCard,
    h('h2', {}, 'Monitor'), h('div', { class: 'grid2' }, mon.el, theme.el), monHint,
    h('div', { class: 'actions' },
      button('Open the instructor view', () => void go('teach'), 'primary'),
      button('Open the learner monitor', () => void go('monitor')),
      h('a', { class: 'btn ghost', href: hrefOf('remote') }, 'Open a remote'),
    ),
  );

  const tools = h('div', { class: 'tiles' },
    tile('explore', 'Explore physiology', 'Pressure–volume loops, lung mechanics, oxygen delivery, organs and drugs, with normal ranges.'),
    tile('vent', 'Ventilator', 'The ventilator beside this patient: modes, loops and the lung it ventilates.'),
    tile('validate', 'Validate', 'Bedside checklist, blind realism review and the performance check.'),
    tile('dev', 'Developer', 'Every model value, raw commands and the build-stage pages.'),
    tile('settings', 'Settings', 'This room: monitor, screen, units, frame rate and shortcuts.'),
  );

  const el = h('section', { 'aria-labelledby': 'start-h' },
    h('div', { class: 'page start' },
      h('h1', { id: 'start-h' }, 'Set up the session'),
      h('p', { class: 'lede' }, 'Choose the patient, the monitor and who is watching. The monitor already shows this patient, and the patient keeps running in every view.'),
      setup,
      h('h2', {}, 'Other tools'), tools,
    ),
  );
  drawPresets();
  drawDetails();
  summary.textContent = oneLiner(spec);
  return { id: 'start', el };
}

function field(label: string, control: HTMLElement, unit = ''): HTMLElement {
  return h('div', { class: 'field' }, h('span', {}, unit ? `${label} (${unit})` : label), control);
}

function tile(route: 'explore' | 'vent' | 'validate' | 'dev' | 'settings', title: string, text: string): HTMLElement {
  return h('a', { class: 'tile', href: hrefOf(route) }, h('b', {}, title), h('span', {}, text));
}
