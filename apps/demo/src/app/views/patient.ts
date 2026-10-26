// Patient (E125): the free-run patient, the E123 start page's controls on their own page, unchanged in function —
// the presets, age, sex, weight, height and conditions, MODELED or MANUAL, and "start with the sensors off". The
// session's engine runs behind the page: a change restarts it only while nobody uses the session yet (a preview); once
// a case runs, the page shows the running patient and opening the monitor or the Instructor view with a changed patient
// asks first.
import { COMORBIDITIES, PATIENT_PRESETS, oneLiner, type PatientSpec } from '../patients.ts';
import type { AppSession, Mode } from '../session.ts';
import { saveSite, type SiteProfile } from '../site.ts';
import { hrefOf } from '../router.ts';
import type { View } from '../shell.ts';
import { button, confirmDialog, h, seg, stepper, toast } from '../ui.ts';

export function patientView(d: { session: AppSession; site: SiteProfile }): View {
  const s = d.session;
  let spec: PatientSpec = { ...s.spec, comorbid: [...s.spec.comorbid], attached: !d.site.sensorsOff };
  let mode: Mode = s.mode;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const preview = () => {
    if (timer) clearTimeout(timer);
    summary.textContent = oneLiner(spec);
    // The preview restarts the engine only while nobody is using the session yet (checked again when it fires: a
    // scenario loaded meanwhile is never replaced)
    if (!s.live) timer = setTimeout(() => ((timer = null), !s.live && s.restart({ spec, mode })), 350);
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
    details.replaceChildren(field('Age', age.el, 'years'), field('Sex', sex), field('Weight', wt.el, 'kg'), field('Height', ht.el, 'cm'));
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
  const sensors = h('input', { type: 'checkbox', id: 'pt-sensors', onchange: () => {
    spec = { ...spec, attached: !sensors.checked };
    d.site.sensorsOff = sensors.checked;
    saveSite(d.site);
    preview();
  } });
  sensors.checked = !spec.attached;

  const go = async (route: 'teach' | 'monitor') => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
      if (!s.live) s.restart({ spec, mode });
    } else if (s.live && patientChanged()) {
      if (!(await confirmDialog('Restart the patient?', 'Drugs, fluids, ventilation and the scenario reset to the new patient. The session code, the remote and the log carry on.', 'Restart patient', true, 'Keep this patient'))) return;
      s.restart({ spec, mode });
      toast('Patient restarted');
    }
    s.live = true;
    location.hash = hrefOf(route);
  };
  const patientChanged = () => JSON.stringify(spec) !== JSON.stringify(s.spec) || mode !== s.mode;

  const banner = h('div', { class: 'land-live', role: 'status' },
    h('span', {}, h('b', {}, 'A case is running'), ' — the patient carries on while you look around.'),
    h('a', { class: 'btn primary', href: hrefOf('teach') }, 'Back to the Instructor'));
  banner.hidden = !s.live;

  const el = h('section', { class: 'console patient', 'aria-labelledby': 'pt-h' },
    h('div', { class: 'console-page' },
      h('h1', { id: 'pt-h' }, 'Patient'),
      h('p', { class: 'console-sub' }, 'The patient for a free run: a scenario brings its own.'),
      banner,
      h('div', { class: 'land-panel' },
        summary, presetSeg,
        h('details', { class: 'more' }, h('summary', {}, 'Edit age, weight and conditions'), details, comorb),
        h('h2', {}, 'Physiology'), modeSeg, modeHint,
        h('label', { class: 'check', for: 'pt-sensors' }, sensors, 'Start with the sensors off (traces appear when they are attached)')),
      h('div', { class: 'land-actions' },
        button('Open the monitor', () => void go('monitor'), 'big'),
        button('Open the instructor view', () => void go('teach'), 'primary big'))));
  drawPresets();
  drawDetails();
  summary.textContent = oneLiner(spec);
  return {
    id: 'patient',
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
    },
  };
}

function field(label: string, control: HTMLElement, unit = ''): HTMLElement {
  return h('div', { class: 'field' }, h('span', {}, unit ? `${label} (${unit})` : label), control);
}
