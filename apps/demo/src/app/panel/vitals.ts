// Vitals & rhythm (research/13 §4.3 item 2): one row per target — glossary label with its tooltip, the live value, a
// stepper in clinical units, and the model state as a chip (CAE Maestro's flags): MODELED (wave), held by the
// instructor (pin, accent), changing (progress bar under the row: REALITi's trend arc), forced by the model (override).
// In MODELED mode "Set" holds the value (a pin) and "Return to model" releases it; in MANUAL "Set" moves the target.
import type { ControlFlag } from '@pme/controller';
import { rhythmGroups, rhythmLabel } from '../rhythms.ts';
import { button, glossLabel, h, PIN_SVG, setText, stepper, WAVE_SVG, type Stepper } from '../ui.ts';
import { showVital, vitalLabel, VITALS, type VitalSpec } from '../vitals.ts';
import { describeCommand } from '../describe.ts';
import type { PanelCtx } from './ctx.ts';

const FLAG_TEXT: Readonly<Record<ControlFlag, string>> = { modeled: 'Model', pinned: 'Held', ramping: 'Changing', override: 'Model override' };

export function vitalsTab(c: PanelCtx): HTMLElement {
  const { link, staging } = c;
  const mode = () => link.ctl.state?.mode ?? 'manual';

  // ---- rhythm picker ----
  const rsel = h('select', { class: 'input', id: 'vt-rhythm' });
  for (const [g, ids] of rhythmGroups()) rsel.append(h('optgroup', { label: g }, ...ids.map((id) => h('option', { value: id }, rhythmLabel(id)))));
  const rnow = h('span', { class: 'now' });
  const rhythm = h('div', { class: 'param' },
    h('div', { class: 'lbl' }, glossLabel(296)), rnow,
    h('div', { class: 'edit' }, h('label', { class: 'sr-only', for: 'vt-rhythm' }, 'New rhythm'), rsel,
      button('Stage', () => {
        const cmd = { type: 'setRhythm', rhythm: rsel.value } as const;
        staging.submit(cmd as never, 'rhythm', describeCommand(cmd));
      })),
  );

  // ---- target rows ----
  const rows: Array<{ s: VitalSpec; row: HTMLElement; now: HTMLElement; chip: HTMLElement; st: Stepper; set: HTMLButtonElement; release: HTMLButtonElement; bar: HTMLElement; seeded: boolean }> = [];
  const groups = new Map<string, HTMLElement>();
  for (const s of VITALS) {
    let g = groups.get(s.group);
    if (!g) groups.set(s.group, (g = h('div', { class: 'vgroup' }, h('h3', {}, s.group))));
    const now = h('span', { class: 'now num' });
    const chip = h('span', { class: 'chip' });
    const st = stepper({ label: `${shortOf(s)} target`, unit: s.unit, min: s.min, max: s.max, step: s.step, value: s.min, digits: s.digits });
    const set = button('Set', () => {
      const value = st.value / s.scale;
      const cmd = (mode() === 'modeled' ? { type: 'pin', variable: s.v, value } : { type: 'setTarget', variable: s.v, value }) as never;
      staging.submit(cmd, `v-${s.v}`, describeCommand(cmd));
    });
    const release = button('Return to model', () => {
      const cmd = { type: 'release', variable: s.v } as never;
      staging.submit(cmd, `v-${s.v}`, describeCommand(cmd));
    }, 'ghost small');
    const bar = h('div', { class: 'progress', role: 'progressbar', 'aria-label': `${shortOf(s)} change in progress`, 'aria-valuemin': 0, 'aria-valuemax': 100 }, h('i'));
    const row = h('div', { class: 'param', 'data-var': s.v },
      h('div', { class: 'lbl' }, glossLabel(s.n), chip), h('span', { class: 'nowwrap' }, now, h('span', { class: 'unit' }, s.unit)),
      h('div', { class: 'edit' }, st.el, set, release), bar);
    g.append(row);
    const entry = { s, row, now, chip, st, set, release, bar, seeded: false };
    // the first state seeds the stepper with the live value, unless the instructor has already typed or stepped one:
    // a late first state must never overwrite what they chose (R50 review F7: the remote pinned the old value)
    const touched = () => void (entry.seeded = true);
    st.input.addEventListener('input', touched);
    st.input.addEventListener('change', touched);
    for (const b of st.el.querySelectorAll('button')) b.addEventListener('pointerdown', touched);
    rows.push(entry);
  }

  const releaseAll = button('Return all to the model', () => {
    const cmd = { type: 'release', variable: 'all' } as never;
    staging.submit(cmd, 'release-all', describeCommand(cmd));
  }, 'small');
  const modeNote = h('p', { class: 'hint' });

  c.onRefresh(() => {
    const st = link.ctl.state;
    const m = mode();
    // "Set" stages a pin in MODELED and a target in MANUAL, so it waits for the monitor's first state: a remote that has
    // just connected does not know the mode yet, and staging a target where a pin was meant held nothing (R50 review F7)
    const known = st !== null && st !== undefined;
    for (const r of rows) {
      r.set.disabled = !known;
      r.release.disabled = !known;
    }
    setText(modeNote, !known ? 'Waiting for the monitor\'s state before a value can be set.' : m === 'modeled' ? 'MODELED: the body sets these values. Setting one holds it until you return it to the model.' : 'MANUAL: every value is what you set, with the onset chosen below.');
    releaseAll.hidden = m !== 'modeled';
    setText(rnow, link.ctl.rhythm ? rhythmLabel(link.ctl.rhythm) : '--');
    for (const r of rows) {
      const v = st?.values[r.s.v];
      setText(r.now, showVital(r.s, v));
      r.row.hidden = !!r.s.manualOnly && m === 'modeled';
      if (!r.seeded && v !== undefined) {
        r.st.set(v * r.s.scale);
        r.seeded = true;
      }
      const flag: ControlFlag = st?.control[r.s.v] ?? (m === 'modeled' ? 'modeled' : 'pinned');
      const shown: ControlFlag = m === 'manual' && flag === 'pinned' ? 'pinned' : flag;
      // dark cockpit (ISA-101): a value the model is simply running shows no chip; the session badge already says MODELED
      r.chip.hidden = shown === 'modeled' || (m === 'manual' && shown === 'pinned');
      r.chip.className = `chip flag-${shown}`;
      r.chip.innerHTML = shown === 'pinned' ? PIN_SVG : shown === 'modeled' ? WAVE_SVG : '';
      r.chip.append(FLAG_TEXT[shown]);
      r.release.hidden = !(m === 'modeled' && (flag === 'pinned' || flag === 'ramping'));
      r.row.dataset.staged = String(staging.has(`v-${r.s.v}`));
      const ramp = link.ramps.get(r.s.v);
      const p = ramp ? Math.min(1, (link.simT - ramp.t0) / ramp.dur) : 1;
      r.bar.hidden = !ramp || p >= 1;
      if (ramp && p >= 1) link.ramps.delete(r.s.v);
      (r.bar.firstElementChild as HTMLElement).style.width = `${Math.round(p * 100)}%`;
      r.bar.setAttribute('aria-valuenow', String(Math.round(p * 100)));
    }
  });

  return h('div', {}, rhythm, h('div', { class: 'row' }, modeNote, releaseAll), ...groups.values());
}

const shortOf = (s: VitalSpec): string => vitalLabel(s.v);
