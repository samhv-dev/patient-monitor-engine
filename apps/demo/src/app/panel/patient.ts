// Patient (research/13 §4.9): the one patient card — who the patient is, MODELED or MANUAL, and "Restart patient",
// which asks first and says what resets (drugs, fluids, ventilation, the scenario) and what carries on (the session
// code, the paired remote, the log). The body is fixed when the engine is created, so profile edits need a restart;
// the mode switches live.
import { COMORBIDITIES, oneLiner } from '../patients.ts';
import { ACUTE_EVENTS, activeText, conditionCommand, eventLabel, NOT_AN_EVENT, SEVERITIES, severityWord } from '../events.ts';
import { button, confirmDialog, h, seg, setText, toast } from '../ui.ts';
import { describeCommand } from '../describe.ts';
import type { PanelCtx } from './ctx.ts';

export function patientTab(c: PanelCtx): HTMLElement {
  const { link } = c;
  const who = h('p', { class: 'summary num' });
  const conds = h('ul', { class: 'plain' });
  const modeSeg = seg<'modeled' | 'manual'>('Physiology', [['modeled', 'MODELED'], ['manual', 'MANUAL']], link.ctl.state?.mode ?? 'manual', async (v) => {
    const r = await link.send({ type: 'setMode', mode: v });
    toast(r.accepted ? `Mode: ${v.toUpperCase()}` : 'Mode not changed');
  });
  const host = link.host;
  const restart = host
    ? button('Restart patient', async () => {
        if (!(await confirmDialog('Restart the patient?', 'Drugs, fluids, ventilation and the scenario reset. The session code, the paired remote and the log carry on.', 'Restart patient', true, 'Keep this patient'))) return;
        host.restart({ spec: host.spec, mode: host.mode });
        link.note('Patient restarted', 'system');
        toast('Patient restarted');
      }) // a secondary button: red is for alarms; the confirm dialog carries the danger styling (R50 review F11)
    : null;
  const edit = host ? h('a', { class: 'btn ghost', href: '#/' }, 'Change the patient on the Start screen') : h('p', { class: 'hint' }, 'The patient is chosen on the monitor screen.');
  // Task 26 — acute events: start or stop one of the engine's systemic conditions; staged with the other changes and
  // committed with the footer (so a batch can start together), logged like every command
  const rows = ACUTE_EVENTS.map((ev) => {
    let sev = 1;
    const severity = seg<string>(`${ev.label} severity`, SEVERITIES.map(([id, label]) => [id, label] as [string, string]), 'severe', (v) => (sev = SEVERITIES.find(([id]) => id === v)?.[2] ?? 1));
    const stage = (s: number) => {
      const cmd = conditionCommand(ev.id, s);
      c.staging.submit(cmd, `event-${ev.id}`, describeCommand(cmd as Record<string, unknown>));
    };
    const state = h('span', { class: 'chip flag-pinned' });
    const stop = button('Stop', () => stage(0), 'ghost small');
    const row = h('div', { class: 'param event', 'data-event': ev.id },
      h('div', { class: 'lbl' }, h('b', { title: ev.detail }, eventLabel(ev.id)), state),
      h('p', { class: 'hint' }, ev.detail),
      h('div', { class: 'edit' }, severity, button('Start', () => stage(sev)), stop));
    return { id: ev.id, row, state, stop };
  });
  const manualNote = h('p', { class: 'hint' }, 'Events act through the model: in MANUAL mode the vital signs stay what you set.');
  const events = h('div', { class: 'events' }, h('h3', {}, 'Acute events'), manualNote, ...rows.map((r) => r.row),
    h('h4', {}, 'Not yet a single event'), h('ul', { class: 'plain' }, ...NOT_AN_EVENT.map((x) => h('li', {}, h('b', {}, x.label), ': ', x.how))));
  c.onRefresh(() => void (manualNote.hidden = (link.ctl.state?.mode ?? 'manual') !== 'manual'));
  c.onRefresh(() => {
    if (host) {
      setText(who, oneLiner(host.spec));
      conds.replaceChildren(...COMORBIDITIES.filter((x) => host.spec.comorbid.includes(x.id)).map((x) => h('li', {}, x.label)));
    } else {
      setText(who, `${Math.round(c.weightKg())} kg`);
      conds.replaceChildren();
    }
    conds.append(...activeText(link.conditions).map((t) => h('li', { class: 'active-event' }, t)));
    if (!conds.children.length) conds.append(h('li', { class: 'muted' }, 'No conditions'));
    for (const r of rows) {
      const s = link.conditions.get(r.id);
      setText(r.state, s ? `Running: ${severityWord(s)}` : '');
      r.stop.disabled = s === undefined;
      r.row.dataset.active = String(s !== undefined);
    }
    const m = link.ctl.state?.mode;
    if (m) modeSeg.set(m);
  });
  return h('div', {}, h('h3', {}, 'Patient'), who, conds, events, h('h3', {}, 'Physiology'), modeSeg,
    h('p', { class: 'hint' }, 'MODELED: the body responds by itself and you can hold any value. MANUAL: you set every value.'),
    h('div', { class: 'row' }, edit, restart));
}
