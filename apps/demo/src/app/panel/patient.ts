// Patient (research/13 §4.9): the one patient card — who the patient is, MODELED or MANUAL, and "Restart patient",
// which asks first and says what resets (drugs, fluids, ventilation, the scenario) and what carries on (the session
// code, the paired remote, the log). The body is fixed when the engine is created, so profile edits need a restart;
// the mode switches live.
import { COMORBIDITIES, oneLiner } from '../patients.ts';
import { button, confirmDialog, h, seg, setText, toast } from '../ui.ts';
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
  c.onRefresh(() => {
    if (host) {
      setText(who, oneLiner(host.spec));
      conds.replaceChildren(...COMORBIDITIES.filter((x) => host.spec.comorbid.includes(x.id)).map((x) => h('li', {}, x.label)));
      if (!host.spec.comorbid.length) conds.replaceChildren(h('li', { class: 'muted' }, 'No conditions'));
    } else setText(who, `${Math.round(c.weightKg())} kg`);
    const m = link.ctl.state?.mode;
    if (m) modeSeg.set(m);
  });
  return h('div', {}, h('h3', {}, 'Patient'), who, conds, h('h3', {}, 'Physiology'), modeSeg,
    h('p', { class: 'hint' }, 'MODELED: the body responds by itself and you can hold any value. MANUAL: you set every value.'),
    h('div', { class: 'row' }, edit, restart));
}
